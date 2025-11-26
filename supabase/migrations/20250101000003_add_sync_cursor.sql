-- ========================================
-- Add Sync Cursor to Plaid Items
-- ========================================
-- Version: 1.0.1
-- Description: Adds cursor tracking for Plaid's incremental transaction sync

-- Add sync_cursor column to plaid_items table
ALTER TABLE public.plaid_items
ADD COLUMN IF NOT EXISTS sync_cursor TEXT;

-- Add index for faster cursor lookups
CREATE INDEX IF NOT EXISTS plaid_items_sync_cursor_idx
ON public.plaid_items(sync_cursor)
WHERE sync_cursor IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.plaid_items.sync_cursor IS 'Cursor for Plaid transactions/sync API - tracks position in transaction history for incremental updates';
