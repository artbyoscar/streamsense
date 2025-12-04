# Watchlist Metadata Backfill Utility

## Problem
323 existing watchlist items show "Unknown" because they have `tmdb_id` but no `title`, `poster_path`, or other metadata stored in the `watchlist_items` table.

## Solution
Run the one-time backfill utility to fetch and populate metadata for all affected items.

---

## How to Run the Backfill

### Option 1: From React Native Debugger Console

1. **Enable Remote Debugging** in your React Native app
2. **Open Chrome DevTools** (automatically opens when debugging is enabled)
3. **Paste this code** into the console:

```javascript
// Import the backfill function
import { backfillWatchlistMetadata } from './src/utils/backfillWatchlistMetadata';
import { supabase } from './src/config/supabase';

// Get current user ID
const { data: { user } } = await supabase.auth.getUser();

// Run backfill for current user
if (user) {
  const result = await backfillWatchlistMetadata(user.id);
  console.log('Backfill complete:', result);
} else {
  console.error('No user logged in');
}
```

### Option 2: Add Temporary Button to UI

Add this to `WatchlistScreen.tsx` (temporary, remove after running):

```typescript
// At the top, import the backfill function
import { backfillWatchlistMetadata } from '@/utils/backfillWatchlistMetadata';

// Add state for backfill progress
const [isBackfilling, setIsBackfilling] = useState(false);

// Add handler
const handleBackfill = async () => {
  if (!user?.id) return;

  setIsBackfilling(true);
  console.log('[Watchlist] Starting backfill...');

  try {
    const result = await backfillWatchlistMetadata(user.id);
    console.log('[Watchlist] Backfill complete:', result);
    alert(`Backfill complete! Updated: ${result.updated}, Failed: ${result.failed}`);

    // Refresh watchlist after backfill
    fetchWatchlist();
  } catch (error) {
    console.error('[Watchlist] Backfill error:', error);
    alert('Backfill failed. Check console for details.');
  } finally {
    setIsBackfilling(false);
  }
};

// Add button to render (inside the ScrollView, after Tab Bar):
{__DEV__ && (
  <TouchableOpacity
    onPress={handleBackfill}
    disabled={isBackfilling}
    style={{
      margin: 16,
      padding: 12,
      backgroundColor: isBackfilling ? '#666' : '#a78bfa',
      borderRadius: 8,
      alignItems: 'center',
    }}
  >
    <Text style={{ color: 'white', fontWeight: '600' }}>
      {isBackfilling ? 'Backfilling Metadata...' : 'Run Metadata Backfill (Dev Only)'}
    </Text>
  </TouchableOpacity>
)}
```

### Option 3: From Node.js Script

Create `scripts/backfill.js`:

```javascript
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key for admin access
);

async function backfill() {
  // Get all users with missing metadata
  const { data: users } = await supabase
    .from('watchlist_items')
    .select('user_id')
    .is('title', null);

  const uniqueUserIds = [...new Set(users.map(u => u.user_id))];

  console.log(`Found ${uniqueUserIds.length} users to backfill`);

  // Run backfill for each user
  for (const userId of uniqueUserIds) {
    console.log(`Processing user: ${userId}`);
    // Call your backfill function here
  }
}

backfill().then(() => console.log('Done'));
```

---

## What the Backfill Does

1. **Finds items with missing metadata:**
   ```sql
   SELECT * FROM watchlist_items
   WHERE user_id = ? AND title IS NULL
   ```

2. **For each item:**
   - Determines `media_type` from `content_id` (e.g., "movie-1234" → "movie")
   - Fetches metadata from TMDb API using `tmdb_id` and `media_type`
   - Updates `watchlist_items` with:
     - `title`
     - `poster_path`
     - `backdrop_path`
     - `overview`
     - `vote_average`
     - `release_date`
     - `media_type`

3. **Processes in batches of 10** to avoid TMDb rate limits (500ms delay between batches)

4. **Returns results:**
   ```javascript
   {
     success: true,
     updated: 320,  // Number of items successfully updated
     failed: 3,     // Number of items that failed
     total: 323     // Total items processed
   }
   ```

---

## Expected Results

**Before backfill:**
- 323 items show "Unknown" title
- No posters visible
- Filtering by genre shows 0 items (because no genre data)

**After backfill:**
- All items show actual titles (e.g., "The Shawshank Redemption")
- Posters display correctly
- Genre filtering works properly
- Overview text is populated

---

## Troubleshooting

### "Error fetching items: permission denied"
- Make sure you're logged in
- Check that the user has access to their watchlist items

### "TMDb API rate limit exceeded"
- Increase the delay between batches (change `500` to `1000` ms)
- Reduce batch size (change `10` to `5`)

### "Failed to fetch metadata for item X"
- Item may have invalid `tmdb_id`
- Item may have been deleted from TMDb
- Check console for specific error

### Some items still show "Unknown"
- Run the backfill again (it's safe to re-run)
- Check if those items have valid `tmdb_id` in the database
- Manually inspect those items in the database

---

## After Running Backfill

1. **Refresh the watchlist** (pull to refresh)
2. **Clear the recommendation cache** if items still don't appear:
   ```typescript
   import { clearRecommendationCaches } from '@/services/smartRecommendations';
   await clearRecommendationCaches();
   ```

3. **Remove the temporary button** from the UI (if you added one)

4. **Optional:** Run the backfill for all users using `backfillAllUsers()` if this is a production issue

---

## Performance

- **Time:** ~32 seconds for 323 items (10 items/batch, 500ms delay)
- **API calls:** 323 TMDb API requests
- **Database writes:** 323 UPDATE queries
- **Memory:** Minimal (processes in batches of 10)

---

## Notes

- This is a **one-time utility** - once metadata is backfilled, new items will automatically have metadata (via recent code changes)
- Safe to re-run - will only update items where `title IS NULL`
- Does not affect items that already have metadata
- Uses the same `getContentDetails` service that the app uses, so data will be consistent
