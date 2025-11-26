/**
 * Plaid Service
 * Client-side functions for Plaid Link integration
 */

import { supabase } from '@/lib/supabase';
import type {
  CreateLinkTokenResponse,
  ExchangePublicTokenResponse,
  SyncTransactionsResponse,
} from '@/types';

// ============================================================================
// LINK TOKEN MANAGEMENT
// ============================================================================

/**
 * Creates a Plaid Link token for initializing Plaid Link
 * This calls the Supabase Edge Function which securely handles Plaid API calls
 */
export async function createLinkToken(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke<CreateLinkTokenResponse>(
      'plaid-create-link-token',
      {
        body: { userId },
      }
    );

    if (error) {
      console.error('Error creating link token:', error);
      throw new Error(error.message || 'Failed to create link token');
    }

    if (!data?.linkToken) {
      throw new Error('No link token returned from server');
    }

    return data.linkToken;
  } catch (error) {
    console.error('Error in createLinkToken:', error);
    throw error;
  }
}

// ============================================================================
// PUBLIC TOKEN EXCHANGE
// ============================================================================

/**
 * Exchanges a Plaid public token for an access token
 * This calls the Supabase Edge Function which securely stores the access token
 */
export async function exchangePublicToken(
  publicToken: string,
  metadata?: {
    institution?: {
      name: string;
      institution_id: string;
    };
    accounts?: Array<{
      id: string;
      name: string;
      type: string;
      subtype: string;
    }>;
  }
): Promise<ExchangePublicTokenResponse> {
  try {
    const { data, error } = await supabase.functions.invoke<ExchangePublicTokenResponse>(
      'plaid-exchange-token',
      {
        body: {
          publicToken,
          institutionName: metadata?.institution?.name,
          institutionId: metadata?.institution?.institution_id,
        },
      }
    );

    if (error) {
      console.error('Error exchanging public token:', error);
      throw new Error(error.message || 'Failed to exchange token');
    }

    if (!data?.plaidItem) {
      throw new Error('No Plaid item returned from server');
    }

    return data;
  } catch (error) {
    console.error('Error in exchangePublicToken:', error);
    throw error;
  }
}

// ============================================================================
// TRANSACTION SYNC
// ============================================================================

/**
 * Syncs transactions for a Plaid item using cursor-based incremental updates
 * This calls the Supabase Edge Function to fetch and store transactions
 */
export async function syncTransactions(
  plaidItemId: string,
  cursor?: string,
  count?: number
): Promise<SyncTransactionsResponse> {
  try {
    const { data, error } = await supabase.functions.invoke<SyncTransactionsResponse>(
      'plaid-sync-transactions',
      {
        body: {
          plaidItemId,
          cursor,
          count,
        },
      }
    );

    if (error) {
      console.error('Error syncing transactions:', error);
      throw new Error(error.message || 'Failed to sync transactions');
    }

    return (
      data || {
        transactionsSynced: 0,
        subscriptionsDetected: 0,
      }
    );
  } catch (error) {
    console.error('Error in syncTransactions:', error);
    throw error;
  }
}

/**
 * Performs a full sync of all Plaid items for the current user
 * Useful for background sync or manual refresh
 */
export async function syncAllPlaidItems(): Promise<{
  itemsSynced: number;
  totalTransactions: number;
  totalSubscriptions: number;
  errors: Array<{ itemId: string; error: string }>;
}> {
  try {
    const items = await getPlaidItems();
    const errors: Array<{ itemId: string; error: string }> = [];
    let totalTransactions = 0;
    let totalSubscriptions = 0;

    for (const item of items) {
      // Skip inactive items
      if (!item.is_active) continue;

      try {
        const result = await syncTransactions(item.id);
        totalTransactions += result.transactionsSynced || 0;
        totalSubscriptions += result.subscriptionsDetected || 0;
      } catch (error: any) {
        console.error(`Error syncing item ${item.id}:`, error);
        errors.push({
          itemId: item.id,
          error: error.message || 'Unknown error',
        });
      }
    }

    return {
      itemsSynced: items.length - errors.length,
      totalTransactions,
      totalSubscriptions,
      errors,
    };
  } catch (error) {
    console.error('Error in syncAllPlaidItems:', error);
    throw error;
  }
}

// ============================================================================
// PLAID ITEMS MANAGEMENT
// ============================================================================

/**
 * Gets all Plaid items for the current user
 */
export async function getPlaidItems() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('plaid_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching Plaid items:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPlaidItems:', error);
    throw error;
  }
}

/**
 * Deletes a Plaid item and removes the connection
 */
export async function deletePlaidItem(itemId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('plaid-delete-item', {
      body: { itemId },
    });

    if (error) {
      console.error('Error deleting Plaid item:', error);
      throw new Error(error.message || 'Failed to delete Plaid item');
    }
  } catch (error) {
    console.error('Error in deletePlaidItem:', error);
    throw error;
  }
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Maps Plaid error codes to user-friendly messages
 */
export function getPlaidErrorMessage(error: any): string {
  const errorCode = error?.error_code || error?.code;

  switch (errorCode) {
    case 'INVALID_CREDENTIALS':
      return 'Invalid username or password. Please try again.';
    case 'INVALID_MFA':
      return 'Invalid verification code. Please try again.';
    case 'ITEM_LOGIN_REQUIRED':
      return 'Please log in to your bank account again.';
    case 'INSTITUTION_DOWN':
      return 'Your bank is temporarily unavailable. Please try again later.';
    case 'INSTITUTION_NOT_RESPONDING':
      return 'Your bank is not responding. Please try again later.';
    case 'ITEM_LOCKED':
      return 'Your account is locked. Please contact your bank.';
    case 'INVALID_UPDATED_USERNAME':
      return 'Invalid username. Please check and try again.';
    case 'INVALID_UPDATED_PASSWORD':
      return 'Invalid password. Please check and try again.';
    case 'ITEM_NOT_SUPPORTED':
      return 'This institution is not currently supported.';
    case 'USER_SETUP_REQUIRED':
      return 'Additional setup is required with your bank.';
    case 'INSUFFICIENT_CREDENTIALS':
      return 'Please provide all required credentials.';
    case 'PLAID_ERROR':
      return 'An error occurred with Plaid. Please try again.';
    default:
      return error?.message || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Checks if a Plaid error is recoverable
 */
export function isPlaidErrorRecoverable(error: any): boolean {
  const recoverableErrors = [
    'INVALID_CREDENTIALS',
    'INVALID_MFA',
    'INVALID_UPDATED_USERNAME',
    'INVALID_UPDATED_PASSWORD',
    'INSUFFICIENT_CREDENTIALS',
  ];

  const errorCode = error?.error_code || error?.code;
  return recoverableErrors.includes(errorCode);
}
