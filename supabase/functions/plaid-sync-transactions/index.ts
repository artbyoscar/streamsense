/**
 * Plaid Sync Transactions Edge Function
 * Uses Plaid's /transactions/sync endpoint for efficient incremental updates
 * Implements cursor-based pagination for large transaction histories
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
const PLAID_SECRET = Deno.env.get('PLAID_SECRET');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncTransactionsRequest {
  plaidItemId: string;
  cursor?: string;
  count?: number;
}

interface PlaidTransaction {
  transaction_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name?: string;
  category?: string[];
  pending: boolean;
  account_id: string;
}

interface PlaidSyncResponse {
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: Array<{ transaction_id: string }>;
  next_cursor: string;
  has_more: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Parse request body
    const { plaidItemId, cursor, count = 500 }: SyncTransactionsRequest = await req.json();

    if (!plaidItemId) {
      throw new Error('Missing Plaid item ID');
    }

    // Get Plaid item from database
    const { data: plaidItem, error: itemError } = await supabaseClient
      .from('plaid_items')
      .select('*')
      .eq('id', plaidItemId)
      .eq('user_id', user.id)
      .single();

    if (itemError || !plaidItem) {
      throw new Error('Plaid item not found');
    }

    // Use stored cursor or start fresh
    const syncCursor = cursor || plaidItem.sync_cursor || '';

    let hasMore = true;
    let currentCursor = syncCursor;
    let totalAdded = 0;
    let totalModified = 0;
    let totalRemoved = 0;
    let subscriptionsDetected = 0;

    // Sync transactions using cursor-based pagination
    while (hasMore) {
      const response = await fetch('https://sandbox.plaid.com/transactions/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          access_token: plaidItem.access_token,
          cursor: currentCursor,
          count,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Plaid API error:', error);

        // Handle specific error cases
        if (error.error_code === 'ITEM_LOGIN_REQUIRED') {
          await supabaseClient
            .from('plaid_items')
            .update({
              is_active: false,
              error_code: 'ITEM_LOGIN_REQUIRED'
            })
            .eq('id', plaidItem.id);
        }

        throw new Error(error.error_message || 'Failed to sync transactions');
      }

      const data: PlaidSyncResponse = await response.json();

      // Process added transactions
      if (data.added && data.added.length > 0) {
        const addedCount = await processAddedTransactions(
          supabaseClient,
          user.id,
          plaidItem.id,
          data.added
        );
        totalAdded += addedCount.transactions;
        subscriptionsDetected += addedCount.subscriptions;
      }

      // Process modified transactions
      if (data.modified && data.modified.length > 0) {
        const modifiedCount = await processModifiedTransactions(
          supabaseClient,
          user.id,
          plaidItem.id,
          data.modified
        );
        totalModified += modifiedCount;
      }

      // Process removed transactions
      if (data.removed && data.removed.length > 0) {
        const removedCount = await processRemovedTransactions(
          supabaseClient,
          data.removed
        );
        totalRemoved += removedCount;
      }

      // Update cursor and check if more pages exist
      currentCursor = data.next_cursor;
      hasMore = data.has_more;

      // Break if we've processed enough (prevent infinite loops)
      if (totalAdded + totalModified > 5000) {
        console.warn('Processed 5000+ transactions, stopping to prevent timeout');
        break;
      }
    }

    // Update Plaid item with new cursor and last synced timestamp
    await supabaseClient
      .from('plaid_items')
      .update({
        sync_cursor: currentCursor,
        last_synced: new Date().toISOString(),
        is_active: true,
        error_code: null,
      })
      .eq('id', plaidItem.id);

    return new Response(
      JSON.stringify({
        transactionsSynced: totalAdded + totalModified,
        transactionsAdded: totalAdded,
        transactionsModified: totalModified,
        transactionsRemoved: totalRemoved,
        subscriptionsDetected,
        nextCursor: currentCursor,
        hasMore,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in plaid-sync-transactions:', error);
    return new Response(
      JSON.stringify({
        error: {
          message: error.message || 'Internal server error',
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

// ============================================================================
// TRANSACTION PROCESSING FUNCTIONS
// ============================================================================

/**
 * Process added transactions from Plaid sync
 */
async function processAddedTransactions(
  supabaseClient: any,
  userId: string,
  plaidItemId: string,
  transactions: PlaidTransaction[]
): Promise<{ transactions: number; subscriptions: number }> {
  let transactionsAdded = 0;
  let subscriptionsDetected = 0;

  // Get all streaming services once for efficiency
  const { data: services } = await supabaseClient
    .from('streaming_services')
    .select('id, name, merchant_patterns');

  for (const txn of transactions) {
    // Skip pending transactions
    if (txn.pending) continue;

    // Only process debit transactions (subscriptions are expenses)
    if (txn.amount <= 0) continue;

    // Try to match transaction to streaming service
    const matchedService = matchTransactionToService(
      services || [],
      txn.merchant_name || txn.name
    );

    const isSubscription = !!matchedService;

    // Insert transaction
    const { error: insertError } = await supabaseClient.from('transactions').insert({
      user_id: userId,
      plaid_item_id: plaidItemId,
      plaid_transaction_id: txn.transaction_id,
      amount: txn.amount,
      merchant_name: txn.merchant_name || txn.name,
      date: txn.date,
      category: txn.category,
      is_subscription: isSubscription,
      matched_service_id: matchedService?.id || null,
    });

    if (!insertError) {
      transactionsAdded++;

      // If matched to a service, create/update subscription
      if (isSubscription && matchedService) {
        const created = await createOrUpdateSubscription(
          supabaseClient,
          userId,
          matchedService.id,
          txn.amount,
          matchedService.name
        );
        if (created) subscriptionsDetected++;
      }
    }
  }

  return { transactions: transactionsAdded, subscriptions: subscriptionsDetected };
}

/**
 * Process modified transactions from Plaid sync
 */
async function processModifiedTransactions(
  supabaseClient: any,
  userId: string,
  plaidItemId: string,
  transactions: PlaidTransaction[]
): Promise<number> {
  let transactionsModified = 0;

  for (const txn of transactions) {
    const { error: updateError } = await supabaseClient
      .from('transactions')
      .update({
        amount: txn.amount,
        merchant_name: txn.merchant_name || txn.name,
        date: txn.date,
        category: txn.category,
      })
      .eq('plaid_transaction_id', txn.transaction_id)
      .eq('user_id', userId);

    if (!updateError) {
      transactionsModified++;
    }
  }

  return transactionsModified;
}

/**
 * Process removed transactions from Plaid sync
 */
async function processRemovedTransactions(
  supabaseClient: any,
  removed: Array<{ transaction_id: string }>
): Promise<number> {
  let transactionsRemoved = 0;

  for (const { transaction_id } of removed) {
    const { error: deleteError } = await supabaseClient
      .from('transactions')
      .delete()
      .eq('plaid_transaction_id', transaction_id);

    if (!deleteError) {
      transactionsRemoved++;
    }
  }

  return transactionsRemoved;
}

// ============================================================================
// SUBSCRIPTION DETECTION HELPERS
// ============================================================================

/**
 * Match transaction to streaming service based on merchant patterns
 */
function matchTransactionToService(
  services: Array<{ id: string; name: string; merchant_patterns: string[] }>,
  merchantName: string
): { id: string; name: string } | null {
  if (!merchantName) return null;

  const lowerMerchant = merchantName.toLowerCase();

  for (const service of services) {
    if (service.merchant_patterns && service.merchant_patterns.length > 0) {
      for (const pattern of service.merchant_patterns) {
        if (lowerMerchant.includes(pattern.toLowerCase())) {
          return { id: service.id, name: service.name };
        }
      }
    }
  }

  return null;
}

/**
 * Create or update subscription based on detected transaction
 */
async function createOrUpdateSubscription(
  supabaseClient: any,
  userId: string,
  serviceId: string,
  amount: number,
  serviceName: string
): Promise<boolean> {
  // Check if active subscription already exists
  const { data: existing } = await supabaseClient
    .from('user_subscriptions')
    .select('id, price')
    .eq('user_id', userId)
    .eq('service_id', serviceId)
    .eq('status', 'active')
    .single();

  if (existing) {
    // Update price if it changed
    if (existing.price !== amount) {
      await supabaseClient
        .from('user_subscriptions')
        .update({ price: amount })
        .eq('id', existing.id);
    }
    return false; // Not a new subscription
  } else {
    // Create new subscription
    const { error } = await supabaseClient.from('user_subscriptions').insert({
      user_id: userId,
      service_id: serviceId,
      service_name: serviceName,
      price: amount,
      billing_cycle: 'monthly',
      status: 'active',
      detected_from: 'plaid',
    });

    return !error; // Return true if created successfully
  }
}
