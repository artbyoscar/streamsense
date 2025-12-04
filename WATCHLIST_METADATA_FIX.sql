-- ============================================================================
-- Fix: Add metadata columns to watchlist_items table
-- ============================================================================
-- This allows us to store title, poster, and media_type directly in watchlist_items
-- instead of always needing to JOIN with content table or fetch from TMDb

-- Add columns if they don't exist
ALTER TABLE watchlist_items
ADD COLUMN IF NOT EXISTS media_type TEXT,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS poster_path TEXT,
ADD COLUMN IF NOT EXISTS overview TEXT,
ADD COLUMN IF NOT EXISTS vote_average REAL,
ADD COLUMN IF NOT EXISTS release_date TEXT;

-- ============================================================================
-- Backfill media_type from content_id for items that have parseable content_id
-- ============================================================================
-- Format: "movie-12345" → media_type = 'movie'
--         "tv-67890"    → media_type = 'tv'

UPDATE watchlist_items
SET media_type = CASE
  WHEN content_id ~ '^movie-\d+$' THEN 'movie'
  WHEN content_id ~ '^tv-\d+$' THEN 'tv'
  ELSE NULL
END
WHERE media_type IS NULL
  AND content_id IS NOT NULL
  AND content_id ~ '^(movie|tv)-\d+$';

-- ============================================================================
-- Check results
-- ============================================================================
SELECT
  COUNT(*) as total_items,
  COUNT(tmdb_id) as have_tmdb_id,
  COUNT(media_type) as have_media_type,
  COUNT(title) as have_title,
  COUNT(CASE WHEN tmdb_id IS NOT NULL AND media_type IS NOT NULL AND title IS NULL THEN 1 END) as need_hydration
FROM watchlist_items;

-- Sample items that need hydration
SELECT id, content_id, tmdb_id, media_type, title
FROM watchlist_items
WHERE tmdb_id IS NOT NULL
  AND media_type IS NOT NULL
  AND title IS NULL
LIMIT 5;
