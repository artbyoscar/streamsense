-- Migration: Add status field to watchlist_items
-- Allows tracking watching/watched/want_to_watch states

-- Create watchlist status enum
CREATE TYPE watchlist_status AS ENUM ('want_to_watch', 'watching', 'watched');

-- Add status column to watchlist_items
ALTER TABLE watchlist_items
ADD COLUMN status watchlist_status NOT NULL DEFAULT 'want_to_watch';

-- Add index for filtering by status
CREATE INDEX idx_watchlist_items_status ON watchlist_items(status);

-- Add streaming_services column to store where content is available
ALTER TABLE watchlist_items
ADD COLUMN streaming_services JSONB DEFAULT '[]'::jsonb;

-- Add rating column for watched items
ALTER TABLE watchlist_items
ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 10);

-- Update RLS policies (already enabled, just ensure they work with new columns)
-- Users can only see their own watchlist items
DROP POLICY IF EXISTS select_own_watchlist_items ON watchlist_items;
CREATE POLICY select_own_watchlist_items ON watchlist_items
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS insert_own_watchlist_items ON watchlist_items;
CREATE POLICY insert_own_watchlist_items ON watchlist_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS update_own_watchlist_items ON watchlist_items;
CREATE POLICY update_own_watchlist_items ON watchlist_items
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS delete_own_watchlist_items ON watchlist_items;
CREATE POLICY delete_own_watchlist_items ON watchlist_items
  FOR DELETE USING (auth.uid() = user_id);
