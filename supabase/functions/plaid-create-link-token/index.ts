/**
 * Plaid Create Link Token Edge Function
 * Creates a Plaid Link token for initializing Plaid Link on the client
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

interface LinkTokenRequest {
  userId: string;
}

interface PlaidLinkTokenResponse {
  link_token: string;
  expiration: string;
  request_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Debug: Log environment configuration
    console.log('[Plaid] Environment check:', {
      hasClientId: !!PLAID_CLIENT_ID,
      hasSecret: !!PLAID_SECRET,
      env: PLAID_ENV,
      clientIdLength: PLAID_CLIENT_ID?.length,
      secretLength: PLAID_SECRET?.length,
    });

    // Check if Plaid credentials are configured
    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      console.error('[Plaid] Missing credentials!', {
        hasClientId: !!PLAID_CLIENT_ID,
        hasSecret: !!PLAID_SECRET,
      });
      throw new Error('Plaid credentials not configured. Please set PLAID_CLIENT_ID and PLAID_SECRET in Edge Function secrets.');
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    console.log('[Plaid] Auth header present:', !!authHeader);

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

    console.log('[Plaid] User authentication check:', {
      hasUser: !!user,
      userId: user?.id,
      hasError: !!userError,
      errorMessage: userError?.message,
    });

    if (userError || !user) {
      console.error('[Plaid] Auth error:', userError);
      throw new Error('User not authenticated');
    }

    // Parse request body
    const { userId }: LinkTokenRequest = await req.json();
    console.log('[Plaid] Request user ID:', userId);

    if (!userId || userId !== user.id) {
      console.error('[Plaid] User ID mismatch:', { requested: userId, authenticated: user.id });
      throw new Error('Invalid user ID');
    }

    // Create Plaid Link token
    console.log('[Plaid] Creating link token for user:', userId);
    console.log('[Plaid] Plaid environment:', PLAID_ENV);

    const plaidUrl = PLAID_ENV === 'production'
      ? 'https://production.plaid.com/link/token/create'
      : 'https://sandbox.plaid.com/link/token/create';

    console.log('[Plaid] Calling Plaid API:', plaidUrl);

    const response = await fetch(plaidUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        user: {
          client_user_id: userId,
        },
        client_name: 'StreamSense',
        products: ['transactions'],
        country_codes: ['US'],
        language: 'en',
        webhook: `${Deno.env.get('SUPABASE_URL')}/functions/v1/plaid-webhook`,
        account_filters: {
          depository: {
            account_subtypes: ['checking', 'savings'],
          },
        },
      }),
    });

    console.log('[Plaid] Plaid API response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('[Plaid] Plaid API error details:', {
        status: response.status,
        error: error,
        errorCode: error.error_code,
        errorMessage: error.error_message,
        errorType: error.error_type,
      });
      throw new Error(error.error_message || `Plaid API error: ${error.error_code || 'Unknown'}`);
    }

    const data: PlaidLinkTokenResponse = await response.json();
    console.log('[Plaid] Successfully created link token');

    return new Response(
      JSON.stringify({
        linkToken: data.link_token,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Plaid] ERROR in plaid-create-link-token:', {
      message: error.message,
      stack: error.stack,
      error: error,
    });

    // Determine appropriate status code
    const status = error.message?.includes('not authenticated') ? 401 :
                   error.message?.includes('not configured') ? 500 :
                   400;

    return new Response(
      JSON.stringify({
        error: {
          message: error.message || 'Internal server error',
          type: 'plaid_link_token_error',
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
      }
    );
  }
});
