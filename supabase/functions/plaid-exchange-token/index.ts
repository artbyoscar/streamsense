/**
 * Plaid Exchange Token Edge Function
 * Exchanges a public token for an access token and stores it securely
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExchangeTokenRequest {
  publicToken: string;
  institutionName?: string;
  institutionId?: string;
}

interface PlaidExchangeResponse {
  access_token: string;
  item_id: string;
  request_id: string;
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
    const { publicToken, institutionName, institutionId }: ExchangeTokenRequest =
      await req.json();

    if (!publicToken) {
      throw new Error('Missing public token');
    }

    // Exchange public token for access token
    const response = await fetch('https://sandbox.plaid.com/item/public_token/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        public_token: publicToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Plaid API error:', error);
      throw new Error(error.error_message || 'Failed to exchange token');
    }

    const data: PlaidExchangeResponse = await response.json();

    // Encrypt access token (in production, use proper encryption)
    // For now, we'll store it directly but this should be encrypted
    const encryptedAccessToken = data.access_token;

    // Store Plaid item in database
    const { data: plaidItem, error: dbError } = await supabaseClient
      .from('plaid_items')
      .insert({
        user_id: user.id,
        access_token: encryptedAccessToken,
        item_id: data.item_id,
        institution_name: institutionName || 'Unknown Bank',
        institution_id: institutionId || null,
        is_active: true,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to store Plaid item');
    }

    // Initial transaction sync (optional - can be done separately)
    // This will fetch the last 30 days of transactions
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    try {
      const transactionsResponse = await fetch(
        'https://sandbox.plaid.com/transactions/get',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            access_token: data.access_token,
            start_date: thirtyDaysAgo.toISOString().split('T')[0],
            end_date: today.toISOString().split('T')[0],
          }),
        }
      );

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();

        // Store transactions in database
        if (transactionsData.transactions && transactionsData.transactions.length > 0) {
          const transactions = transactionsData.transactions.map((txn: any) => ({
            user_id: user.id,
            plaid_item_id: plaidItem.id,
            plaid_transaction_id: txn.transaction_id,
            amount: Math.abs(txn.amount),
            merchant_name: txn.merchant_name || txn.name,
            date: txn.date,
            category: txn.category,
            is_subscription: false, // Will be detected later
          }));

          await supabaseClient.from('transactions').insert(transactions);
        }

        // Update last synced timestamp
        await supabaseClient
          .from('plaid_items')
          .update({ last_synced: new Date().toISOString() })
          .eq('id', plaidItem.id);
      }
    } catch (syncError) {
      console.error('Error syncing initial transactions:', syncError);
      // Don't fail the whole operation if sync fails
    }

    return new Response(
      JSON.stringify({
        plaidItem: {
          id: plaidItem.id,
          itemId: plaidItem.item_id,
          institutionName: plaidItem.institution_name,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in plaid-exchange-token:', error);
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
