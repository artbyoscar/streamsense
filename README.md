# StreamSense 🎬💸

**Rocket Money for streaming, with Netflix-level recommendations.**

StreamSense helps users optimize their streaming spending while discovering personalized content. The app bridges the gap between subscription management tools (which treat streaming like any other bill) and content discovery platforms (which ignore costs entirely).

---

## 🎨 Design Philosophy

StreamSense draws inspiration from three industry leaders, combining the best patterns from each:

| Inspiration | What We Borrow | Where It Appears |
|-------------|----------------|------------------|
| **Rocket Money** | Value-first dashboard, hero metrics, grouped cards, annual projections | Home Screen |
| **Tinder** | Swipe-based discovery, satisfying gestures, clear binary actions | Discover Screen |
| **Netflix** | Multi-lane browsing, contextual labels, hero spotlight, progressive disclosure | Watchlist/For You |

### Core Design Principles

1. **Value First**: Every screen communicates financial value alongside entertainment
2. **Glanceable Metrics**: Key numbers visible without scrolling or tapping
3. **Contextual Intelligence**: Explain WHY something is recommended
4. **Service Awareness**: Always show which streaming service has the content
5. **Satisfying Interactions**: Haptic feedback, smooth animations, clear state changes
6. **Progressive Disclosure**: Show summary first, details on demand

---

## 📱 Screen Designs

### Home Screen (Rocket Money Inspired) ✅ Implemented

The dashboard communicates value at a glance with a hero spending card and quick insights.

```
┌────────────────────────────────────────────┐
│ Good evening, Oscar                   ⚙️  │
│ Wednesday, December 4                      │
├────────────────────────────────────────────┤
│ ┌────────────────────────────────────────┐ │
│ │ MONTHLY STREAMING      ✓ Great Value  │ │
│ │         $27.98                         │ │
│ │ 📅 $336/year across 2 services        │ │
│ └────────────────────────────────────────┘ │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│ │ 261      │ │ 392h     │ │ $0.08    │    │
│ │ WATCHED  │ │WATCH TIME│ │COST/HOUR │    │
│ └──────────┘ └──────────┘ └──────────┘    │
│ Your Services                    Manage All│
│ ┌────────────────────────────────────────┐ │
│ │ N  Netflix               $15.49/mo  > │ │
│ │    ✓ Great Value                      │ │
│ ├────────────────────────────────────────┤ │
│ │ CR Crunchyroll           $7.99/mo   > │ │
│ │    ✓ Great Value                      │ │
│ └────────────────────────────────────────┘ │
│ Picked For You                    View All │
│ [Steins;Gate] [The OA] [Yu-Gi-Oh! 5D's]   │
└────────────────────────────────────────────┘
```

**Status:** ✅ Dashboard stats now load instantly (~350ms)

### Discover Screen (Tinder Inspired) ✅ Implemented

Swipe-based content discovery with satisfying gestures and clear actions.

**Status:** ✅ Swipe gestures working, optimistic UI for instant feedback, rating modal after "Watched"

### Watchlist/For You Screen (Netflix Inspired) ✅ Implemented

Multi-lane browsing with contextual recommendation labels.

**Status:** ✅ Core UI implemented, **load time reduced from 30s to 600ms** (Sessions 11-12)

### Tips and Insights Screen ✅ Implemented

**Status:** ✅ Working, needs content variety improvements

---

## 🧠 Recommendation Intelligence Architecture

StreamSense implements a **6-layer recommendation intelligence system** inspired by Netflix, Spotify, and Amazon.

### Layer Overview

| Layer | Purpose | Status |
|-------|---------|--------|
| **Content DNA** | Deep content attributes beyond genres | ⚠️ Table missing, graceful fallback active |
| **User Taste Profile** | Aggregated preferences from behavior | ✅ Working - "Quirky Comedies Fan" |
| **Multi-Lane Recommendations** | Parallel recommendation strategies | ✅ Implemented with provider filtering |
| **Interest Graph** | Maps connections between interests | ⚠️ Table missing, graceful fallback active |
| **LLM Personalization** | Claude Haiku integration | ⏳ Planned |
| **Contextual Intelligence** | Time-of-day, mood awareness | ⏳ Planned |

### Current Recommendation Features

| Feature | Status | Notes |
|---------|--------|-------|
| Genre Affinity Learning | ✅ Working | 22 genres tracked, temporal decay |
| Smart Recommendations | ✅ Working | Personalized picks, exclusion logic |
| Provider Filtering | ✅ Working | Only shows content from subscribed services |
| Blindspot Discovery | ✅ Working | Hidden gems, classic gaps, unexplored genres |
| Session Exclusion | ✅ Working | 354+ items excluded per session |
| Persistent Exclusion | ✅ **NEW** | Skipped items saved to AsyncStorage (7-day retention) |
| Negative Filtering | ✅ Working | Skipped content excluded |
| Real Service Badges | ✅ Working | Fetches actual provider data per item |
| Taste Profile | ✅ Working | Builds signature from 100 watchlist items |
| Always-Include Genres | ✅ Working | Romance, Horror, Anime, Documentary always fetched |
| Half-Star Ratings | ⚠️ Broken | Rating component regression |
| 404 Error Handling | ✅ **NEW** | Graceful skip for removed TMDb content |
| SVD Matrix Factorization | ⚠️ Limited | Single-user generates 0 predictions |
| Collaborative Filtering | ⚠️ Blocked | Needs multiple users |

---

## 📊 Project Status

### Overall Completion: **92%**

| Category | Status | Completion | Notes |
|----------|--------|------------|-------|
| Core Infrastructure | ✅ Complete | 100% | Expo SDK 54, EAS Build |
| Authentication | ✅ Complete | 100% | Supabase Auth |
| Subscription Management | ✅ Complete | 100% | Manage All modal, add/edit/delete |
| Watchlist System | ✅ Complete | 98% | 358+ items tracked, metadata schema added |
| Genre Affinity Learning | ✅ Complete | 100% | Real-time tracking |
| Provider Filtering | ✅ Complete | 100% | Filters by subscribed services |
| Service Badges | ✅ Complete | 100% | Real provider data displayed |
| Basic Recommendations | ✅ Complete | 95% | Genre-based + always-include genres |
| Exclusion System | ✅ **Fixed** | 100% | Persistent + session exclusions working |
| Home Screen UI | ⚠️ Issue | 90% | Missing year/bio on content cards |
| Discover Screen UI | ✅ Complete | 95% | Swipe working, rating modal, optimistic UI |
| Watchlist Screen UI | ⚠️ Issue | 88% | Missing release dates/bios on cards |
| Tips and Insights | ✅ Complete | 85% | Content variety needed |
| Error Handling | ✅ **Fixed** | 100% | 404s handled gracefully, no red popups |
| TypeScript Fixes | ✅ **Fixed** | 100% | All import/type errors resolved |
| Metadata Backfill | 🔧 In Progress | 70% | 135 items fixed, 130 need media_type fix |
| Content DNA System | ⚠️ Blocked | 20% | Table not created, graceful fallback active |
| Interest Graph | ⚠️ Blocked | 20% | Table not created, graceful fallback active |
| LLM Integration | ⏳ Planned | 0% | Claude Haiku |

---

## 🐛 Current Bug List (Post Session 14)

### Priority 0: Critical

| # | Issue | Root Cause | Status |
|---|-------|------------|--------|
| 1 | Duplicate key error on watchlist add | INSERT instead of UPSERT on content table | 🔧 Needs Fix |
| 2 | Half-star ratings broken | Rating component regression | 🔧 Needs Fix |

### Priority 1: UI/UX Issues

| # | Issue | Root Cause | Status |
|---|-------|------------|--------|
| 3 | Home "Picked For You" missing year/bio | Content card not displaying metadata | 🔧 Needs Fix |
| 4 | Watching tab missing release dates/bios | Same content card issue | 🔧 Needs Fix |
| 5 | Genre filters on Watchlist recs | Filter not triggering re-render | 🔧 Fix Ready |
| 6 | No fade animation on Watchlist add | Missing removedIds state | 🔧 Fix Ready |

### Priority 2: Database Tables

| # | Issue | Root Cause | Status |
|---|-------|------------|--------|
| 7 | content_dna table missing | Table not created in Supabase | ⏳ Needs Creation |
| 8 | user_taste_profiles table missing | Table not created in Supabase | ⏳ Needs Creation |
| 9 | 130 items failed backfill | Missing `media_type` in watchlist_items | 🔧 SQL Fix Ready |

### ✅ Fixed in Session 14

| # | Issue | Fix Applied |
|---|-------|-------------|
| ~~10~~ | ~~TMDb 404 errors on login~~ | ✅ Graceful handling in tmdbBatch.ts |
| ~~11~~ | ~~TypeScript import error (contentDNA)~~ | ✅ Fixed imports in smartRecommendations.ts |
| ~~12~~ | ~~Parameter 'g' type error~~ | ✅ Added type annotation |
| ~~13~~ | ~~trackGenreInteraction missing args~~ | ✅ Added mediaType and action params |
| ~~14~~ | ~~dnaComputationQueue.addToQueue error~~ | ✅ Changed to .enqueue() |
| ~~15~~ | ~~refreshWatchlistCache missing userId~~ | ✅ Added user.id parameter |

---

## ✅ Session 14 Achievements (December 4, 2025)

### TypeScript Fixes 🔧

**smartRecommendations.ts:**
- Fixed `contentDNA` import (was importing non-existent `rankByDNASimilarity`)
- Now properly imports `contentDNAService` singleton
- Updated taste profile building to use correct API

**watchlistService.ts:**
- Added type annotation for `g` parameter in genres map
- Fixed `trackGenreInteraction` call (added `mediaType` and correct action constant `'ADD_TO_WATCHLIST'`)
- Fixed `dnaComputationQueue` method call (`enqueue` instead of `addToQueue`)
- Verified `refreshWatchlistCache(user.id)` calls in both add and remove functions

### Error Handling Improvements 🛡️

**tmdbBatch.ts - 404 Graceful Handling:**
```typescript
// Before: Red error popups on login for stale TMDb IDs
console.error(`[TMDbBatch] Error fetching ${mediaType} ${tmdbId}:`, error);

// After: Silent skip for removed content
if (error?.response?.status === 404) {
  console.log(`[TMDbBatch] Content no longer exists: ${mediaType} ${tmdbId} (404 - skipping)`);
  return null;
}
```

**dnaComputationQueue.ts - Missing Table Handling:**
- Added `PGRST205` error code handling (table does not exist)
- Queue continues gracefully when `content_dna` table is missing

### Exclusion System Verification ✅

Logs confirm the exclusion system is working correctly:
```
[SmartRecs] Global exclusions rebuilt: 358 total (watchlist: 356, session: 7)
[SmartRecs] Added to exclusions: 858815. Total: 355 (session: 4)
[Discover] ✅ Added "Photocopier" to watchlist, excluded from future recs
```

### Files Modified (Session 14)

| File | Changes |
|------|---------|
| `src/services/smartRecommendations.ts` | Fixed contentDNA imports, taste profile API |
| `src/features/watchlist/services/watchlistService.ts` | Type fixes, correct method calls |
| `src/services/tmdbBatch.ts` | Graceful 404 handling |
| `src/services/dnaComputationQueue.ts` | PGRST205 error handling |

---

## 📈 Metrics from Testing (December 4, 2025)

```
User Interactions:     368 watchlist items
Genre Affinities:      22 genres tracked
Top Genres:            Drama, Adventure, Action
Behavior Mode:         Discovery (exploring widely)
Session Average:       11.2 items per session
Confidence Score:      0.76
Taste Signature:       Quirky Comedies Fan
Subscriptions:         2 active
  - Netflix:           $15.49/mo (Provider ID: 8)
  - Crunchyroll:       $7.99/mo (Provider ID: 283)
Monthly Total:         $27.98
Annual Projection:     $336/year
Provider Filtering:    ✅ Active
Service Badges:        ✅ Working
Exclusions:            358 total (watchlist: 356, session: 7)

Status Distribution:
  - Want to Watch:     99 items
  - Watching:          8 items
  - Watched:           261 items

Performance (Post Session 14):
  - Watchlist Load:    823ms ✅
  - Dashboard Stats:   ~350ms ✅
  - Discover Actions:  <100ms ✅
  - Taste Profile:     ~1.4 seconds ✅
  - TMDb Batch Fetch:  ~1.3 seconds (100 items, 100% cache hits)
  - DNA Computation:   0-1ms per item (cached)
  - No 404 Error Popups: ✅ Fixed
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native + Expo SDK 54 |
| Language | TypeScript |
| Backend | Supabase (Auth, Database, RLS) |
| Content API | TMDb (The Movie Database) |
| Banking | Plaid (subscription detection) |
| Animations | React Native Reanimated v4 |
| Gestures | React Native Gesture Handler |
| Gradients | Expo Linear Gradient |
| Icons | Lucide React Native |
| Build | EAS Build (development client) |
| Navigation | Custom state-based tabs |

---

## 🚀 Remaining Work

### Immediate (Session 15)

**Fix Duplicate Key Error:**
- Change content table INSERT to UPSERT
- Handle existing tmdb_id gracefully

**Fix Content Card Metadata:**
- Add year/release date display to Home "Picked For You"
- Add overview/bio display
- Apply same fix to Watchlist content cards

**Fix Half-Star Ratings:**
- Debug rating component regression
- Restore 0.5 increment functionality

**SQL Fix for media_type:**
```sql
-- Fix items that have tmdb_id but no media_type
UPDATE watchlist_items
SET media_type = SPLIT_PART(content_id::text, '-', 1)
WHERE media_type IS NULL
  AND content_id IS NOT NULL
  AND content_id::text ~ '^(tv|movie)-';
```

### Phase 2: Database Tables

**Create Missing Tables:**
```sql
-- content_dna table
CREATE TABLE content_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL,
  dna JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tmdb_id, media_type)
);

-- user_taste_profiles table
CREATE TABLE user_taste_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  profile JSONB NOT NULL,
  taste_signature TEXT,
  confidence REAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### Phase 3: Advanced Recommendations

**Multi-Lane System**
- [ ] "Because You Watched" lane
- [ ] Talent Spotlight lanes
- [ ] Interest Cluster lanes

### Phase 4: Polish and Launch

**UI Refinements**
- [ ] Animation polish
- [ ] Empty state designs
- [ ] Error state handling

**Launch Preparation**
- [ ] Waitlist integration
- [ ] Analytics setup
- [ ] App store assets

---

## 📅 Timeline to Launch

| Milestone | Target | Status |
|-----------|--------|--------|
| UI Redesign Implementation | Week 1-2 | ✅ Complete |
| Critical Bug Fixes (DB Errors) | Week 2 | ✅ Complete |
| Subscription Management Modal | Week 2 | ✅ Complete |
| Provider Filtering | Week 2 | ✅ Complete |
| Service Badges System | Week 2-3 | ✅ Complete |
| Performance Optimization | Week 3 | ✅ Complete |
| Dashboard Stats Fix | Week 3 | ✅ Complete |
| Discover Optimistic UI | Week 3 | ✅ Complete |
| Rating Modal | Week 3 | ✅ Complete |
| Genre Diversity Fix | Week 3 | ✅ Complete |
| TypeScript Fixes | Week 3-4 | ✅ **Complete** |
| 404 Error Handling | Week 3-4 | ✅ **Complete** |
| Exclusion System | Week 3-4 | ✅ **Complete** |
| Content Card Metadata | Week 4 | 🔧 In Progress |
| Database Tables Creation | Week 4 | ⏳ Pending |
| Content DNA + Taste Profiles | Week 4-5 | ⏳ Pending |
| Multi-Lane UI Integration | Week 5-6 | ⏳ Pending |
| LLM Integration | Week 6-7 | ⏳ Pending |
| Polish and Testing | Week 7-8 | ⏳ Pending |
| Waitlist Launch | Week 8-9 | ⏳ Pending |
| Alpha Release | Week 10-11 | ⏳ Pending |

---

## 📝 Session History

### Session 14 (December 4, 2025) - TypeScript & Error Handling

**Focus:** Fixing TypeScript errors and improving error handling

**Achievements:**
- Fixed all TypeScript compilation errors in watchlistService.ts
- Fixed contentDNA import errors in smartRecommendations.ts
- Implemented graceful 404 handling in tmdbBatch.ts (no more red popups)
- Added PGRST205 handling in dnaComputationQueue.ts
- Verified exclusion system working (358 items)
- Confirmed taste profile building ("Quirky Comedies Fan")

**Issues Identified for Session 15:**
- Duplicate key error (23505) when adding existing content
- Home/Watchlist content cards missing year and bio
- Half-star ratings broken
- Missing database tables (content_dna, user_taste_profiles)

### Session 13 (December 4, 2025) - Data Quality Fixes

**Focus:** Fixing "Unknown" titles and backfill failures

**Discoveries:**
- Backfill failed 130 items because `media_type` column is NULL
- "Watching" items have `tmdb_id` but no `media_type`
- SQL fix ready to populate media_type from content_id

### Session 12 (December 4, 2025) - Performance Breakthrough Part 2

**Major Achievements:**
- Dashboard stats: 10+ seconds → 350ms
- Discover buttons: 2-3 seconds → instant
- Rating modal with half-star support
- Always-include genres (Horror, Romance, Documentary, etc.)
- Metadata schema added to watchlist_items
- Backfill utility created (135 items fixed)

### Session 11 (December 3-4, 2025) - Performance Breakthrough Part 1

**Major Achievement: Watchlist load time reduced from 30-40s to 600ms**

**Root Causes Fixed:**
1. RecCache making 6+ sequential API calls for genre fetches
2. 735+ synchronous console.log operations during genre indexing
3. UI blocked until all operations completed

---

## ✅ What Works

### Authentication and User Management
- Email/password authentication via Supabase
- Secure session management with Row Level Security
- User profile persistence

### Subscription Tracking
- Manual subscription entry with service name, price, billing cycle
- Full CRUD via Manage All modal (add, edit, delete)
- Total monthly cost calculation ($27.98)
- Human-readable value scores ("Great Value", "Low Usage")
- Annual projection ($336/year)
- Service-level value indicators

### Provider Filtering
- Recommendations filtered by subscribed services
- Verified via logs: `[SmartRecs] Filtering by user providers: [8, 283]`
- Netflix (8), Crunchyroll (283), and all major services supported
- Content only appears if available on user subscriptions

### Watchlist Performance
- **Load time: 823ms** (was 30-40 seconds)
- 368+ items tracked across all statuses
- Status management: Want to Watch (99), Watching (8), Watched (261)
- 5-star rating system (half-star temporarily broken)
- Background genre indexing (non-blocking)
- Metadata stored for new items

### Genre Affinity Learning
- 22 genre affinities tracked
- Top genres: Drama, Adventure, Action
- Temporal decay (recent preferences weighted higher)
- Discovery mode detection (0.76 confidence)
- Average 11.2 items per session

### Taste Profile System
- Analyzes 100 watchlist items
- Computes weighted DNA profiles in ~1.4 seconds
- Generates taste signature: "Quirky Comedies Fan"
- Discovery opportunities: Coming-of-age, Nature docs, Classic cinema
- Profile updates non-blocking

### Smart Recommendations
- Personalized picks based on genre affinity
- Provider-aware filtering (only subscribed services)
- Session-based exclusion (358+ items in exclusion set)
- Persistent exclusion (AsyncStorage with 7-day retention)
- Watchlist exclusion (356 items)
- Negative filtering for skipped content
- Fatigue scoring active
- Always-include genres for diversity

### Error Handling
- 404 errors handled gracefully (stale TMDb content)
- Missing table errors (PGRST205) caught and logged
- No red error popups on app startup

---

## 🏆 Competitive Differentiation

| Feature | Rocket Money | JustWatch | Netflix | StreamSense |
|---------|--------------|-----------|---------|-------------|
| Subscription Tracking | ✅ | ❌ | ❌ | ✅ |
| Value Analytics | ✅ | ❌ | ❌ | ✅ |
| Content Discovery | ❌ | ✅ | ✅ | ✅ |
| Cross-Service Search | ❌ | ✅ | ❌ | ✅ |
| Personalized Recs | ❌ | ❌ | ✅ | ✅ |
| Cost Optimization | ✅ | ❌ | ❌ | ✅ |
| Provider Filtering | ❌ | ✅ | ❌ | ✅ |
| Real Service Badges | ❌ | ✅ | ❌ | ✅ |
| Swipe Discovery | ❌ | ❌ | ❌ | ✅ |
| Taste Profiles | ❌ | ❌ | ✅ | ✅ |
| Persistent Exclusions | ❌ | ❌ | ✅ | ✅ |

**No competitor effectively bridges financial tracking with entertainment intelligence.**

---

*Last updated: December 4, 2025 - Session 14*