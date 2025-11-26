/**
 * Plaid Webhook Handler Edge Function
 * Handles real-time webhooks from Plaid for transaction updates
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
const PLAID_WEBHOOK_VERIFICATION_KEY = Deno.env.get('PLAID_WEBHOOK_VERIFICATION_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, plaid-verification',
};

interface PlaidWebhookPayload {
  webhook_type: string;
  webhook_code: string;
  item_id: string;
  error?: {
    error_code: string;
    error_message: string;
  };
  new_transactions?: number;
  removed_transactions?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify webhook signature (in production)
    // const signature = req.headers.get('plaid-verification');
    // if (!verifyWebhookSignature(signature, body, PLAID_WEBHOOK_VERIFICATION_KEY)) {
    //   throw new Error('Invalid webhook signature');
    // }

    // Parse webhook payload
    const payload: PlaidWebhookPayload = await req.json();

    console.log('Received Plaid webhook:', {
      type: payload.webhook_type,
      code: payload.webhook_code,
      itemId: payload.item_id,
    });

    // Initialize Supabase client with service role key for admin access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get Plaid item from database
    const { data: plaidItem, error: itemError } = await supabaseClient
      .from('plaid_items')
      .select('*')
      .eq('item_id', payload.item_id)
      .single();

    if (itemError || !plaidItem) {
      console.error('Plaid item not found:', payload.item_id);
      // Return 200 to acknowledge webhook even if item not found
      return new Response(JSON.stringify({ acknowledged: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Handle different webhook types
    switch (payload.webhook_type) {
      case 'TRANSACTIONS':
        await handleTransactionsWebhook(supabaseClient, plaidItem, payload);
        break;

      case 'ITEM':
        await handleItemWebhook(supabaseClient, plaidItem, payload);
        break;

      default:
        console.log('Unhandled webhook type:', payload.webhook_type);
    }

    return new Response(
      JSON.stringify({ acknowledged: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Always return 200 to acknowledge webhook receipt
    return new Response(
      JSON.stringify({ acknowledged: true, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

/**
 * Handle TRANSACTIONS webhook events
 */
async function handleTransactionsWebhook(
  supabaseClient: any,
  plaidItem: any,
  payload: PlaidWebhookPayload
): Promise<void> {
  switch (payload.webhook_code) {
    case 'SYNC_UPDATES_AVAILABLE':
      // New transaction data is available
      console.log('Sync updates available for item:', plaidItem.item_id);

      // Trigger a sync by calling the sync function
      await triggerTransactionSync(supabaseClient, plaidItem);
      break;

    case 'INITIAL_UPDATE':
      // Initial transaction pull is complete
      console.log('Initial transaction update complete for item:', plaidItem.item_id);

      // Trigger initial sync
      await triggerTransactionSync(supabaseClient, plaidItem);
      break;

    case 'HISTORICAL_UPDATE':
      // Historical transaction pull is complete
      console.log('Historical transaction update complete for item:', plaidItem.item_id);

      // Trigger historical sync
      await triggerTransactionSync(supabaseClient, plaidItem);
      break;

    case 'DEFAULT_UPDATE':
      // Standard update
      console.log('Default transaction update for item:', plaidItem.item_id);

      // Trigger sync
      await triggerTransactionSync(supabaseClient, plaidItem);
      break;

    case 'TRANSACTIONS_REMOVED':
      // Transactions were removed
      if (payload.removed_transactions && payload.removed_transactions.length > 0) {
        await handleRemovedTransactions(
          supabaseClient,
          payload.removed_transactions
        );
      }
      break;

    default:
      console.log('Unhandled TRANSACTIONS webhook code:', payload.webhook_code);
  }
}

/**
 * Handle ITEM webhook events
 */
async function handleItemWebhook(
  supabaseClient: any,
  plaidItem: any,
  payload: PlaidWebhookPayload
): Promise<void> {
  switch (payload.webhook_code) {
    case 'ERROR':
      // Item error occurred
      console.error('Item error for:', plaidItem.item_id, payload.error);

      await supabaseClient
        .from('plaid_items')
        .update({
          is_active: false,
          error_code: payload.error?.error_code || 'UNKNOWN_ERROR',
        })
        .eq('id', plaidItem.id);
      break;

    case 'PENDING_EXPIRATION':
      // Item access will expire soon
      console.warn('Item pending expiration:', plaidItem.item_id);

      await supabaseClient
        .from('plaid_items')
        .update({
          error_code: 'PENDING_EXPIRATION',
        })
        .eq('id', plaidItem.id);
      break;

    case 'USER_PERMISSION_REVOKED':
      // User revoked access
      console.log('User revoked permission for item:', plaidItem.item_id);

      await supabaseClient
        .from('plaid_items')
        .update({
          is_active: false,
          error_code: 'USER_PERMISSION_REVOKED',
        })
        .eq('id', plaidItem.id);
      break;

    case 'WEBHOOK_UPDATE_ACKNOWLEDGED':
      // Webhook URL was updated
      console.log('Webhook update acknowledged for item:', plaidItem.item_id);
      break;

    default:
      console.log('Unhandled ITEM webhook code:', payload.webhook_code);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Trigger transaction sync for a Plaid item
 */
async function triggerTransactionSync(
  supabaseClient: any,
  plaidItem: any
): Promise<void> {
  try {
    // Call the plaid-sync-transactions function
    const { data, error } = await supabaseClient.functions.invoke(
      'plaid-sync-transactions',
      {
        body: {
          plaidItemId: plaidItem.id,
        },
      }
    );

    if (error) {
      console.error('Error triggering sync:', error);
    } else {
      console.log('Sync triggered successfully:', data);
    }
  } catch (error) {
    console.error('Error calling sync function:', error);
  }
}

/**
 * Handle removed transactions
 */
async function handleRemovedTransactions(
  supabaseClient: any,
  transactionIds: string[]
): Promise<void> {
  for (const transactionId of transactionIds) {
    await supabaseClient
      .from('transactions')
      .delete()
      .eq('plaid_transaction_id', transactionId);
  }

  console.log(`Removed ${transactionIds.length} transactions`);
}

/**
 * Verify webhook signature (for production)
 */
function verifyWebhookSignature(
  signature: string | null,
  body: string,
  verificationKey: string | undefined
): boolean {
  // TODO: Implement proper signature verification
  // See: https://plaid.com/docs/api/webhooks/webhook-verification/
  return true;
}
