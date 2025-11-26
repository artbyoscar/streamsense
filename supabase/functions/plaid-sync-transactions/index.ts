/**
 * Plaid Sync Transactions Edge Function
 * Syncs transactions from Plaid and detects subscriptions
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
  startDate?: string;
  endDate?: string;
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
    const { plaidItemId, startDate, endDate }: SyncTransactionsRequest = await req.json();

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

    // Calculate date range
    const today = new Date();
    const end = endDate || today.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const start = startDate || thirtyDaysAgo.toISOString().split('T')[0];

    // Fetch transactions from Plaid
    const response = await fetch('https://sandbox.plaid.com/transactions/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        access_token: plaidItem.access_token,
        start_date: start,
        end_date: end,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Plaid API error:', error);
      throw new Error(error.error_message || 'Failed to fetch transactions');
    }

    const data = await response.json();
    let transactionsSynced = 0;
    let subscriptionsDetected = 0;

    // Store transactions in database
    if (data.transactions && data.transactions.length > 0) {
      for (const txn of data.transactions) {
        // Check if transaction already exists
        const { data: existing } = await supabaseClient
          .from('transactions')
          .select('id')
          .eq('plaid_transaction_id', txn.transaction_id)
          .single();

        if (!existing) {
          // Try to match transaction to a streaming service
          const matchedServiceId = await matchTransactionToService(
            supabaseClient,
            txn.merchant_name || txn.name,
            Math.abs(txn.amount)
          );

          const isSubscription = !!matchedServiceId;

          // Insert transaction
          const { error: insertError } = await supabaseClient.from('transactions').insert({
            user_id: user.id,
            plaid_item_id: plaidItem.id,
            plaid_transaction_id: txn.transaction_id,
            amount: Math.abs(txn.amount),
            merchant_name: txn.merchant_name || txn.name,
            date: txn.date,
            category: txn.category,
            is_subscription: isSubscription,
            matched_service_id: matchedServiceId,
          });

          if (!insertError) {
            transactionsSynced++;

            // If it's a subscription, create/update subscription record
            if (isSubscription && matchedServiceId) {
              await createOrUpdateSubscription(
                supabaseClient,
                user.id,
                matchedServiceId,
                Math.abs(txn.amount),
                txn.merchant_name || txn.name
              );
              subscriptionsDetected++;
            }
          }
        }
      }

      // Update last synced timestamp
      await supabaseClient
        .from('plaid_items')
        .update({ last_synced: new Date().toISOString() })
        .eq('id', plaidItem.id);
    }

    return new Response(
      JSON.stringify({
        transactionsSynced,
        subscriptionsDetected,
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

// Helper function to match transaction to streaming service
async function matchTransactionToService(
  supabaseClient: any,
  merchantName: string,
  amount: number
): Promise<string | null> {
  const { data: services } = await supabaseClient
    .from('streaming_services')
    .select('id, merchant_patterns');

  if (!services) return null;

  for (const service of services) {
    if (service.merchant_patterns) {
      for (const pattern of service.merchant_patterns) {
        if (merchantName.toLowerCase().includes(pattern.toLowerCase())) {
          return service.id;
        }
      }
    }
  }

  return null;
}

// Helper function to create or update subscription
async function createOrUpdateSubscription(
  supabaseClient: any,
  userId: string,
  serviceId: string,
  amount: number,
  serviceName: string
): Promise<void> {
  // Check if subscription already exists
  const { data: existing } = await supabaseClient
    .from('user_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('service_id', serviceId)
    .eq('status', 'active')
    .single();

  if (!existing) {
    // Create new subscription
    await supabaseClient.from('user_subscriptions').insert({
      user_id: userId,
      service_id: serviceId,
      service_name: serviceName,
      price: amount,
      billing_cycle: 'monthly',
      status: 'active',
      detected_from: 'plaid',
    });
  }
}
