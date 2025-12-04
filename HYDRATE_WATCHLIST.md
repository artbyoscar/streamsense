# Watchlist Metadata Hydration Guide

## Problem
Watchlist items show "Unknown" because they only have `tmdb_id` but no `title`, `poster_path`, or `media_type` stored.

## Solution

### Step 1: Run SQL Migration

Run the SQL in `WATCHLIST_METADATA_FIX.sql` to:
1. Add metadata columns to `watchlist_items` table
2. Backfill `media_type` from parseable `content_id` values

**Expected Output:**
```
ALTER TABLE
UPDATE 254
```

### Step 2: Verify Media Type Backfill

Check how many items now have `media_type`:

```sql
SELECT
  COUNT(*) as total,
  COUNT(media_type) as have_media_type,
  COUNT(CASE WHEN media_type IS NULL THEN 1 END) as missing_media_type
FROM watchlist_items;
```

**Expected Result:**
- Most items should now have `media_type` (parsed from "movie-123" or "tv-456" format)
- Items with UUID `content_id` will still have NULL `media_type`

### Step 3: One-Time Hydration

The app will automatically hydrate missing metadata when you open the Watchlist:

1. **Restart the app** (this reloads all code changes)
2. **Navigate to Watchlist → Want to Watch tab**
3. **Check console logs** for hydration progress:

```
[WatchlistData] Fetched 254 items (0 with stored metadata, 254 need API fetch)
[Watchlist] Items with stored metadata: 0, cache hits: 0, need fetch: 254
[Watchlist] Hydrated 254 legacy items in 15000ms
```

4. **Metadata is fetched from TMDb** and stored in memory cache (30-minute TTL)

### Step 4: Persist Hydrated Metadata (Optional Enhancement)

To avoid re-fetching on every app restart, we can save metadata back to the database.

**Add this to `watchlistService.ts` after successful hydration (line 90):**

```typescript
// Cache the result in memory
contentCache.set(cacheKey, enriched);
cacheTimestamps.set(cacheKey, Date.now());

// ✅ NEW: Persist to database so we don't fetch again
try {
  await supabase
    .from('watchlist_items')
    .update({
      title: details.title,
      poster_path: details.posterPath,
      overview: details.overview,
      vote_average: details.rating,
      release_date: details.releaseDate,
    })
    .eq('id', item.id);
} catch (e) {
  console.warn('[Watchlist] Failed to persist metadata for', item.id);
}
```

This way:
- **First load**: Fetches from TMDb (15 seconds for 254 items)
- **Second load**: Reads from database (instant, no API calls)

### Step 5: Verify Persisted Metadata

After the hydration completes, check the database:

```sql
SELECT
  COUNT(*) as total,
  COUNT(title) as have_title,
  COUNT(poster_path) as have_poster,
  COUNT(CASE WHEN tmdb_id IS NOT NULL AND title IS NULL THEN 1 END) as still_missing
FROM watchlist_items;
```

**Expected Result:**
```
total | have_title | have_poster | still_missing
------+------------+-------------+--------------
  254 |        254 |         254 |            0
```

---

## Current State vs Fixed State

### Before Fix:
```
[WatchlistData] Fetched 254 items (0 with stored metadata, 254 need API fetch)
[Watchlist] Items with stored metadata: 0, need fetch: 0  ← ❌ Not fetching!
[WatchlistData] Sample item: { id: '...', title: undefined }
```
**Result**: UI shows "Unknown" for all titles

### After Fix (Without Database Persistence):
```
[WatchlistData] Fetched 254 items (0 with stored metadata, 254 need API fetch)
[Watchlist] Items with stored metadata: 0, need fetch: 254  ← ✅ Fetching!
[Watchlist] Hydrated 254 legacy items in 15000ms
```
**Result**: UI shows correct titles (fetched from TMDb on every load)

### After Fix (With Database Persistence):
```
[WatchlistData] Fetched 254 items (254 with stored metadata, 0 need API fetch)
[Watchlist] Items with stored metadata: 254, need fetch: 0
[Watchlist] No API calls needed - all items from DB or cache in 50ms
```
**Result**: UI shows correct titles (instant, no API calls)

---

## Why Items Showed "Unknown"

### Root Cause:
1. Items had `tmdb_id` but no `media_type` column
2. `batchHydrate` requires both `tmdb_id` AND `media_type` to fetch from TMDb
3. Without `media_type`, hydration was skipped (line 38 in watchlistService.ts)
4. Items had no title → UI displayed "Unknown"

### The Fix:
1. ✅ Added `media_type` column to `watchlist_items` table
2. ✅ Backfilled `media_type` from parseable `content_id` values
3. ✅ Updated `getRawWatchlist` to read `media_type` from database
4. ✅ Now `batchHydrate` can fetch metadata from TMDb
5. ✅ (Optional) Persist metadata back to database for instant subsequent loads

---

## Files Modified

### 1. **WATCHLIST_METADATA_FIX.sql** (NEW)
- Adds metadata columns to `watchlist_items` table
- Backfills `media_type` from `content_id` format

### 2. **src/services/watchlistDataService.ts** (Lines 118-161)
- Updated parsing logic to read `media_type`, `title`, `poster_path` from database
- Falls back to parsing `content_id` if columns don't exist
- Marks items as having metadata if `title` is present

### 3. **src/services/watchlistService.ts** (Optional Enhancement)
- Can add database persistence after TMDb fetch (see Step 4)

---

## Testing

1. **Run SQL migration** in Supabase SQL Editor
2. **Restart the app**
3. **Open Watchlist → Want to Watch**
4. **Verify console logs** show hydration happening
5. **Verify UI** shows correct titles instead of "Unknown"
6. **(Optional)** Add database persistence and verify no API calls on second load
