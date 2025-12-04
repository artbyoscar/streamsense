# Watchlist Exclusion Debugging Guide

## Problem
ForYou recommendations are showing content that's already in the user's watchlist.

## How Exclusions SHOULD Work

### 1. **Initialization (App.tsx line 113)**
```typescript
initializeExclusions(user.id);
```
Called when user logs in. Loads watchlist IDs and populates `globalExcludeIds` set.

### 2. **SmartRecommendations Exclusion System**

**File: [src/services/smartRecommendations.ts](src/services/smartRecommendations.ts)**

#### Global Exclusion Sets (Lines 27-28):
```typescript
let globalExcludeIds: Set<number> = new Set();  // Watchlist items
let sessionShownIds: Set<number> = new Set();   // Already shown in session
```

#### initializeExclusions (Lines 33-74):
```typescript
export const initializeExclusions = async (userId: string) => {
  const ids = await getWatchlistIds(userId);

  globalExcludeIds = new Set();
  ids.forEach(id => {
    let num = Number(id);
    if (!isNaN(num)) {
      globalExcludeIds.add(num);  // Direct tmdb_id like "99966"
    } else {
      // Parse "tv-99966" or "movie-12345" format
      const match = id.match(/^(tv|movie)-(\d+)$/);
      if (match) {
        num = parseInt(match[2], 10);
        globalExcludeIds.add(num);
      }
    }
  });

  console.log('[SmartRecs] Initialized exclusions:', globalExcludeIds.size, 'items');
}
```

#### shouldExclude Function (Lines 180-200):
```typescript
const shouldExclude = (tmdbId: number, excludeSessionItems: boolean = true): boolean => {
  const isGloballyExcluded = globalExcludeIds.has(tmdbId);
  const inWatchlist = watchlistTmdbIds.has(tmdbId);
  const alreadyShown = excludeSessionItems ? sessionShownIds.has(tmdbId) : false;

  const excluded = isGloballyExcluded || inWatchlist || alreadyShown;

  if (excluded) {
    console.log('[SmartRecs] Excluding', tmdbId, ':', {
      inGlobalExclusions: isGloballyExcluded,
      inWatchlist,
      alreadyShown,
    });
  }

  return excluded;
};
```

#### getSmartRecommendations Refreshes Exclusions (Lines 401-421):
```typescript
// ALWAYS refresh watchlist IDs to catch new additions
const ids = await getWatchlistIds(userId);
watchlistTmdbIds = new Set();
globalExcludeIds = new Set();

ids.forEach(id => {
  let num = Number(id);
  if (!isNaN(num)) {
    watchlistTmdbIds.add(num);
    globalExcludeIds.add(num);
  } else {
    const match = id.match(/^(tv|movie)-(\d+)$/);
    if (match) {
      num = parseInt(match[2], 10);
      watchlistTmdbIds.add(num);
      globalExcludeIds.add(num);
    }
  }
});

console.log('[SmartRecs] Watchlist exclusions updated:', watchlistTmdbIds.size, 'items');
```

#### Filter Applied (Line 536):
```typescript
const filterItems = (items: any[]) => {
  return items.filter((item: any) => !shouldExclude(item.id, excludeSessionItems));
};
```

### 3. **useRecommendationCache Now Explicitly Enables Exclusions**

**File: [src/hooks/useRecommendationCache.ts](src/hooks/useRecommendationCache.ts) Lines 55-60:**

```typescript
const allRecs = await getSmartRecommendations({
  userId,
  limit: 150,
  mediaType: 'mixed',
  forceRefresh: false,
  excludeSessionItems: true, // ✅ Explicitly enable watchlist exclusions
});
```

---

## Debugging Steps

### Step 1: Verify Exclusions Are Loaded

Check console logs when app starts:
```
[SmartRecs] Initialized exclusions: 293 items
[SmartRecs] Sample exclusions: [99966, 12345, 67890, ...]
```

If you see `0 items`, the exclusions didn't load!

### Step 2: Verify Exclusions Are Refreshed

When fetching recommendations, check:
```
[SmartRecs] Watchlist exclusions updated: 293 items (global: 293)
[SmartRecs] Getting recommendations: {
  watchlistIds: 293,
  sessionShownIds: 45,
  totalExcluded: 338
}
```

### Step 3: Verify Filter Is Applied

Look for exclusion logs:
```
[SmartRecs] Excluding 99966 : {
  inGlobalExclusions: true,
  inWatchlist: true,
  alreadyShown: false
}
```

If you see these logs, exclusions ARE working!

### Step 4: Check Final Results

```
[SmartRecs] Movies page 1: 12 of 20 (8 excluded)
[SmartRecs] TV page 1: 8 of 20 (12 excluded)
[RecCache] ✅ Single fetch: 20 items in 2500ms
[RecCache] Sample recommendation IDs: [12345, 67890, 11111, 22222, 33333]
```

### Step 5: Verify Against Watchlist

**Manually check**: Take one of the sample IDs and verify it's NOT in the watchlist.

Cross-reference with:
```
[WatchlistData] ✅ Found 293 watchlist IDs for user
```

---

## Common Issues

### Issue 1: Exclusions Not Loading (0 items)

**Symptoms:**
```
[SmartRecs] Initialized exclusions: 0 items
```

**Causes:**
1. User not logged in
2. `getWatchlistIds` returning empty set
3. Invalid userId passed to `initializeExclusions`

**Fix:**
- Check App.tsx line 113 is being called
- Verify `user.id` is valid (not undefined/null)
- Check database has watchlist items

### Issue 2: ID Format Mismatch

**Symptoms:**
```
[SmartRecs] Initialized exclusions: 293 items
[SmartRecs] Sample exclusions: [NaN, NaN, NaN, ...]
```

**Causes:**
- `content_id` in database is UUID format instead of TMDB ID
- ID parsing logic failing

**Fix:**
- Verify `getWatchlistIds` returns correct format
- Check database `content_id` column (should be "movie-12345" or TMDB ID)

### Issue 3: Exclusions Not Applied

**Symptoms:**
```
[RecCache] ✅ Single fetch: 150 items
(No exclusion logs)
```

**Causes:**
- `excludeSessionItems` parameter set to `false`
- `shouldExclude` not being called
- `filterItems` not being used

**Fix:**
- Verify line 60 in useRecommendationCache.ts: `excludeSessionItems: true`
- Check smartRecommendations.ts line 536 is being called

### Issue 4: Wrong Exclusion Set Checked

**Symptoms:**
Exclusions loaded but not filtering

**Causes:**
- Checking wrong ID format (string vs number)
- Item ID is different from watchlist ID

**Fix:**
```typescript
// In shouldExclude, add debug logging:
console.log('[SmartRecs] Checking exclusion for ID:', tmdbId, 'type:', typeof tmdbId);
console.log('[SmartRecs] globalExcludeIds sample:', Array.from(globalExcludeIds).slice(0, 5));
console.log('[SmartRecs] Has in set?', globalExcludeIds.has(tmdbId));
```

---

## What I Changed

### useRecommendationCache.ts (Lines 55-69)

**BEFORE:**
```typescript
const allRecs = await getSmartRecommendations({
  userId,
  limit: 150,
  mediaType: 'mixed',
  forceRefresh: false,
  // excludeSessionItems not specified
});
```

**AFTER:**
```typescript
const allRecs = await getSmartRecommendations({
  userId,
  limit: 150,
  mediaType: 'mixed',
  forceRefresh: false,
  excludeSessionItems: true, // ✅ Explicitly enable watchlist exclusions
});

// Debug: Log sample IDs to verify exclusions are working
if (allRecs.length > 0) {
  console.log('[RecCache] Sample recommendation IDs:', allRecs.slice(0, 5).map(r => r.id));
}
```

---

## Expected Console Output (Working)

```
[App] Initializing recommendation system...
[SmartRecs] Initialized exclusions: 293 items
[SmartRecs] Sample exclusions: [99966, 12345, 67890, 11111, 22222, ...]

[RecCache] Starting diverse cache pre-fetch...
[SmartRecs] Watchlist exclusions updated: 293 items (global: 293)
[SmartRecs] Getting recommendations: {
  userId: 'abc123',
  limit: 150,
  mediaType: 'mixed',
  watchlistIds: 293,
  sessionShownIds: 0,
  totalExcluded: 293
}

[SmartRecs] Fetching movies with genre IDs: [18, 28, 35] ...
[SmartRecs] Excluding 99966 : { inGlobalExclusions: true, inWatchlist: true }
[SmartRecs] Excluding 12345 : { inGlobalExclusions: true, inWatchlist: true }
[SmartRecs] Movies page 1: 12 of 20 (8 excluded)

[SmartRecs] Fetching TV shows with genre IDs: [18, 10759, 35] ...
[SmartRecs] Excluding 67890 : { inGlobalExclusions: true, inWatchlist: true }
[SmartRecs] TV page 1: 8 of 20 (12 excluded)

[SmartRecs] Returning 20 recommendations
[SmartRecs] First 5 IDs: [11111, 22222, 33333, 44444, 55555]
[RecCache] ✅ Single fetch: 20 items in 2500ms
[RecCache] Sample recommendation IDs: [11111, 22222, 33333, 44444, 55555]
```

**None of the sample IDs should be in watchlist!**

---

## Expected Console Output (NOT Working - Debug)

```
[App] Initializing recommendation system...
[SmartRecs] Initialized exclusions: 0 items  ← ❌ PROBLEM!
[SmartRecs] Sample exclusions: []            ← ❌ EMPTY!

[RecCache] Starting diverse cache pre-fetch...
[SmartRecs] Watchlist exclusions updated: 0 items  ← ❌ NOT UPDATED!
[SmartRecs] Getting recommendations: {
  watchlistIds: 0,               ← ❌ SHOULD BE 293!
  sessionShownIds: 0,
  totalExcluded: 0               ← ❌ SHOULD BE 293!
}

(No exclusion logs)             ← ❌ NOT FILTERING!

[SmartRecs] Movies page 1: 20 of 20 (0 excluded)  ← ❌ NOTHING EXCLUDED!
[RecCache] ✅ Single fetch: 150 items
[RecCache] Sample recommendation IDs: [99966, 12345, ...]  ← ❌ WATCHLIST IDS!
```

---

## Manual Test

1. **Get a watchlist item ID:**
   ```
   [WatchlistData] Sample item: { id: '...', tmdb_id: 99966, title: 'Squid Game' }
   ```

2. **Check if in exclusions:**
   Look for:
   ```
   [SmartRecs] Sample exclusions: [..., 99966, ...]
   ```

3. **Verify it's filtered:**
   It should NOT appear in:
   ```
   [RecCache] Sample recommendation IDs: [11111, 22222, ...]
   ```

4. **If ID 99966 appears in recommendations:**
   - ❌ Exclusions are NOT working
   - Check Issue 1-4 above

---

## Files to Check

1. **App.tsx line 113** - Verify `initializeExclusions(user.id)` is called
2. **smartRecommendations.ts lines 401-421** - Verify exclusions refresh on every call
3. **smartRecommendations.ts lines 180-200** - Verify `shouldExclude` logic is correct
4. **useRecommendationCache.ts line 60** - Verify `excludeSessionItems: true`
5. **watchlistDataService.ts line 15** - Verify `getWatchlistIds` returns correct format

---

## Summary

The exclusion system is **already implemented** in the codebase. The fix I made:

1. ✅ Explicitly set `excludeSessionItems: true` in useRecommendationCache
2. ✅ Added debug logging to show sample recommendation IDs

If watchlist items are still appearing, check the console logs above to diagnose:
- Are exclusions being loaded? (Look for "Initialized exclusions: X items")
- Are exclusions being refreshed? (Look for "Watchlist exclusions updated: X items")
- Are items being filtered? (Look for "Excluding X" logs)
- Do sample IDs match watchlist IDs? (Cross-reference with watchlist data logs)

The exclusion system runs on **every recommendation fetch** so it should always be up-to-date!
