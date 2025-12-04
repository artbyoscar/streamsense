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
│ │ 248      │ │ 366h     │ │ $0.08    │    │
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
| **Content DNA** | Deep content attributes beyond genres | ⚠️ Schema ready, graceful fallback added |
| **User Taste Profile** | Aggregated preferences from behavior | ✅ Working - "Emotional Family Drama Fan" |
| **Multi-Lane Recommendations** | Parallel recommendation strategies | ✅ Implemented with provider filtering |
| **Interest Graph** | Maps connections between interests | ⚠️ Schema ready, graceful fallback added |
| **LLM Personalization** | Claude Haiku integration | ⏳ Planned |
| **Contextual Intelligence** | Time-of-day, mood awareness | ⏳ Planned |

### Current Recommendation Features

| Feature | Status | Notes |
|---------|--------|-------|
| Genre Affinity Learning | ✅ Working | 22 genres tracked, temporal decay |
| Smart Recommendations | ✅ Working | Personalized picks, exclusion logic |
| Provider Filtering | ✅ Working | Only shows content from subscribed services |
| Blindspot Discovery | ✅ Working | Hidden gems, classic gaps, unexplored genres |
| Session Exclusion | ✅ Working | Prevents repeat recommendations |
| Negative Filtering | ✅ Working | Skipped content excluded |
| Real Service Badges | ✅ Working | Fetches actual provider data per item |
| Taste Profile | ✅ Working | Builds signature from 100 watchlist items |
| Always-Include Genres | ✅ **NEW** | Romance, Horror, Anime, Documentary always fetched |
| Half-Star Ratings | ✅ **NEW** | 0.5 increment rating modal after "Watched" |
| SVD Matrix Factorization | ⚠️ Limited | Single-user generates 0 predictions |
| Collaborative Filtering | ⚠️ Blocked | Needs multiple users |

---

## 📊 Project Status

### Overall Completion: **91%**

| Category | Status | Completion | Notes |
|----------|--------|------------|-------|
| Core Infrastructure | ✅ Complete | 100% | Expo SDK 54, EAS Build |
| Authentication | ✅ Complete | 100% | Supabase Auth |
| Subscription Management | ✅ Complete | 100% | Manage All modal, add/edit/delete |
| Watchlist System | ✅ Complete | 98% | 336+ items tracked, metadata schema added |
| Genre Affinity Learning | ✅ Complete | 100% | Real-time tracking |
| Provider Filtering | ✅ Complete | 100% | Filters by subscribed services |
| Service Badges | ✅ Complete | 100% | Real provider data displayed |
| Basic Recommendations | ✅ Complete | 95% | Genre-based + always-include genres |
| Home Screen UI | ✅ Complete | 95% | Dashboard stats instant, Manage All working |
| Discover Screen UI | ✅ Complete | 90% | Swipe working, rating modal, optimistic UI |
| Watchlist Screen UI | ✅ **Fixed** | 90% | **Load time: 30s → 600ms** |
| Tips and Insights | ✅ Complete | 85% | Content variety needed |
| Error Handling | ✅ Complete | 100% | Graceful fallbacks for missing tables |
| Metadata Backfill | 🔧 In Progress | 70% | 135 items fixed, 130 need media_type fix |
| Content DNA System | ⚠️ Blocked | 20% | Table not created, graceful fallback active |
| Interest Graph | ⚠️ Blocked | 20% | Table not created, graceful fallback active |
| LLM Integration | ⏳ Planned | 0% | Claude Haiku |

---

## 🐛 Current Bug List (Post Session 13)

### Priority 0: Critical Data

| # | Issue | Root Cause | Status |
|---|-------|------------|--------|
| 1 | ~~Watchlist loads 30-40 seconds~~ | ~~Sequential API calls~~ | ✅ **FIXED** (600ms) |
| 2 | ~~Exclusions only loading 38 of 254~~ | ~~App code not reading tmdb_id~~ | ✅ **FIXED** (259 now) |
| 3 | ~~Dashboard stats take 10 seconds~~ | ~~Zustand subscription issue~~ | ✅ **FIXED** (350ms) |
| 4 | Unknown titles in Watching tab | Missing `media_type` column | 🔧 SQL Fix Ready |
| 5 | 130 items failed backfill | Missing `media_type` in watchlist_items | 🔧 SQL Fix Ready |

### Priority 1: Filter & UI Issues

| # | Issue | Root Cause | Status |
|---|-------|------------|--------|
| 6 | ~~Filter bar not accessible when scrolled~~ | ~~Filters inside ScrollView~~ | ✅ **FIXED** |
| 7 | ~~Filter not resetting on tab change~~ | ~~No state reset~~ | ✅ **FIXED** |
| 8 | ~~Empty genres (Horror, Documentary)~~ | ~~Only fetching top 5 user genres~~ | ✅ **FIXED** |
| 9 | Genre filters on Watchlist recs | Filter not triggering re-render | 🔧 Fix Ready |
| 10 | No fade animation on Watchlist add | Missing removedIds state | 🔧 Fix Ready |
| 11 | React Fragment warning | `index` prop instead of `key` | ⚠️ Non-blocking |

### Priority 2: Discover Issues

| # | Issue | Root Cause | Status |
|---|-------|------------|--------|
| 12 | ~~"Want to Watch" button slow~~ | ~~Awaits TMDb + DB save~~ | ✅ **FIXED** (optimistic UI) |
| 13 | ~~"Watched" button slow~~ | ~~Awaits TMDb + DB save~~ | ✅ **FIXED** (optimistic UI) |
| 14 | ~~No rating prompt after Watched~~ | ~~Feature not implemented~~ | ✅ **FIXED** (half-star modal) |

### Priority 3: Data Quality

| # | Issue | Root Cause | Status |
|---|-------|------------|--------|
| 15 | Wrong streaming services (FuboTV) | TMDb returns all providers, not user subs | 🔧 Needs Fix |
| 16 | Picked For You needs "Load More" | No pagination/refresh | 🔧 Needs Fix |

---

## ✅ Session 12-13 Achievements (December 4, 2025)

### Performance Fixes 🚀

**Dashboard Stats: 10+ seconds → 350ms**
- Bypassed Zustand store subscription (was not triggering re-renders)
- Direct Supabase auth listener for immediate userId
- Parallel data fetching instead of sequential

**Discover Buttons: 2-3 seconds → Instant**
- Implemented optimistic UI pattern
- Card disappears immediately, save happens in background
- No perceived delay for user

### New Features ✨

**Half-Star Rating Modal**
- Appears after marking content as "Watched" in Discover
- Supports 0.5 increments (tap left half of star = half star)
- Submit or Skip options
- Rating saved to database

**Always-Include Genres**
- Romance, Horror, Anime, Documentary, Thriller, Crime, Mystery, Fantasy
- No longer dependent on user's top 5 genres
- Genre filters now show content even for unexplored genres

### Database Schema Updates

**New columns in `watchlist_items`:**
```sql
title TEXT,
poster_path TEXT,
overview TEXT,
vote_average REAL,
release_date TEXT,
backdrop_path TEXT,
genre_ids INTEGER[]
```

**Metadata Backfill Results:**
- 135 items successfully updated with titles
- 130 items failed (missing `media_type` - SQL fix ready)
- New items now save metadata automatically

### Files Modified (Sessions 12-13)

| File | Changes |
|------|---------|
| `src/features/home/hooks/useDashboardStats.ts` | Direct Supabase auth, parallel fetching |
| `src/features/discover/components/RatingModal.tsx` | New half-star rating component |
| `src/features/discover/screens/SwipeScreen.tsx` | Optimistic UI, rating modal integration |
| `src/services/smartRecommendations.ts` | ALWAYS_INCLUDE_GENRES array |
| `src/services/watchlistService.ts` | Metadata columns in save function |
| `src/utils/backfillWatchlistMetadata.ts` | Backfill utility for legacy items |
| Database: `watchlist_items` | 7 new metadata columns |

---

## 📈 Metrics from Testing (December 4, 2025)

```
User Interactions:     336 watchlist items
Genre Affinities:      22 genres tracked
Top Genres:            Drama (501), Adventure (435), Action (349)
Unexplored Genres:     Thriller, Horror, Romance
Behavior Mode:         Discovery (exploring widely)
Session Average:       10.8 items per session
Confidence Score:      0.74
Taste Signature:       Emotional Family Drama Fan
Subscriptions:         2 active
  - Netflix:           $15.49/mo (Provider ID: 8)
  - Crunchyroll:       $7.99/mo (Provider ID: 283)
Monthly Total:         $27.98
Annual Projection:     $336/year
Provider Filtering:    ✅ Active - logs show filtering by [283, 8]
Service Badges:        ✅ Working - real provider data displayed
Blindspots Generated:  5 unique recommendations
Session Cache:         324 items
Watchlist Exclusions:  259 items with tmdb_id (77% coverage)

Status Distribution:
  - Want to Watch:     80 items
  - Watching:          8 items
  - Watched:           248 items

Performance (Post Session 13):
  - Watchlist Load:    600-700ms ✅ (was 30-40s)
  - Dashboard Stats:   ~350ms ✅ (was 10+ seconds)
  - Discover Actions:  <100ms ✅ (was 2-3 seconds)
  - RecCache Build:    3.5 seconds
  - Genre Index:       2ms (background)
  - Exclusions:        259 items loaded ✅

Genre Cache Distribution:
  - Drama:             17 items
  - Adventure:         14 items
  - Action:            13 items
  - Fantasy:           10 items
  - Anime:             11 items
  - Sci-Fi:            8 items
  - Comedy:            6 items
  - Animation:         3 items
  - Thriller:          3 items
  - Horror:            3 items ✅ (was 0)
  - Mystery:           2 items
  - Crime:             2 items
  - Romance:           2 items ✅ (was 0)
  - Documentary:       0 items (needs content in TMDb for user's services)
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

### Immediate (Session 14)

**SQL Fix for media_type:**
```sql
-- Fix items that have tmdb_id but no media_type
UPDATE watchlist_items
SET media_type = SPLIT_PART(content_id::text, '-', 1)
WHERE media_type IS NULL
  AND content_id IS NOT NULL
  AND content_id::text ~ '^(tv|movie)-';
```

**Then re-run backfill** to populate titles for the 130 failed items.

**UI Fixes:**
- [ ] Genre filter on Watchlist recommendations
- [ ] Fade animation when adding from Watchlist page
- [ ] Verify React Fragment warning source

### Phase 2: Feature Enhancements

**User Experience**
- [ ] Service filter for watchlist tabs (All, Netflix, Crunchyroll, etc.)
- [ ] Force refresh logic for Tips "Worth Discovering"
- [ ] "Load More" for Picked For You section

**Database Tables**
- [ ] Create `content_dna` table in Supabase
- [ ] Create `interest_graph_edges` table
- [ ] Create `user_taste_profiles` table

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
| Performance Optimization | Week 3 | ✅ **Complete** |
| Dashboard Stats Fix | Week 3 | ✅ **Complete** |
| Discover Optimistic UI | Week 3 | ✅ **Complete** |
| Rating Modal | Week 3 | ✅ **Complete** |
| Genre Diversity Fix | Week 3 | ✅ **Complete** |
| Metadata Schema + Backfill | Week 3-4 | 🔧 **70% Complete** |
| Database Tables Creation | Week 4 | ⏳ Pending |
| Content DNA + Taste Profiles | Week 4-5 | ⏳ Pending |
| Multi-Lane UI Integration | Week 5-6 | ⏳ Pending |
| LLM Integration | Week 6-7 | ⏳ Pending |
| Polish and Testing | Week 7-8 | ⏳ Pending |
| Waitlist Launch | Week 8-9 | ⏳ Pending |
| Alpha Release | Week 10-11 | ⏳ Pending |

---

## 📝 Session History

### Session 13 (December 4, 2025) - Data Quality Fixes

**Focus:** Fixing "Unknown" titles and backfill failures

**Discoveries:**
- Backfill failed 130 items because `media_type` column is NULL
- "Watching" items have `tmdb_id` but no `media_type`
- SQL fix ready to populate media_type from content_id

**Files Created:**
- `backfillWatchlistMetadataV2.ts` - Enhanced backfill with TMDb title search
- `ForYouSection-fixed.tsx` - Working genre filters + fade animation
- `watchlist-diagnostic-queries.sql` - SQL queries for debugging
- `settings-backfill-v2.tsx` - Updated Settings handlers

### Session 12 (December 4, 2025) - Performance Breakthrough Part 2

**Major Achievements:**
- Dashboard stats: 10+ seconds → 350ms
- Discover buttons: 2-3 seconds → instant
- Rating modal with half-star support
- Always-include genres (Horror, Romance, Documentary, etc.)
- Metadata schema added to watchlist_items
- Backfill utility created (135 items fixed)

**Root Causes Fixed:**
1. Zustand store subscription not triggering re-renders for nested properties
2. Discover buttons awaiting full save before UI response
3. Genre filters only fetching user's top 5 genres

### Session 11 (December 3-4, 2025) - Performance Breakthrough Part 1

**Major Achievement: Watchlist load time reduced from 30-40s to 600ms**

**Root Causes Fixed:**
1. RecCache making 6+ sequential API calls for genre fetches
2. 735+ synchronous console.log operations during genre indexing
3. UI blocked until all operations completed

**Database Work:**
- SQL backfill to extract tmdb_id from content_id
- Fixed 216 additional items (38 → 254 with tmdb_id)

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
- **Load time: 600ms** (was 30-40 seconds)
- 336+ items tracked across all statuses
- Status management: Want to Watch (80), Watching (8), Watched (248)
- 5-star rating system with half-star support
- Background genre indexing (non-blocking)
- Metadata stored for new items

### Genre Affinity Learning
- 22 genre affinities tracked
- Top genres: Drama (501), Adventure (435), Action (349)
- Temporal decay (recent preferences weighted higher)
- Discovery mode detection (0.74 confidence)
- Average 10.8 items per session

### Taste Profile System
- Analyzes 100 watchlist items
- Computes weighted DNA profiles
- Generates taste signature: "Emotional Family Drama Fan"
- Discovery opportunities identified
- Profile updates in ~11 seconds (non-blocking)

### Smart Recommendations
- Personalized picks based on genre affinity
- Provider-aware filtering (only subscribed services)
- Session-based exclusion (324+ items in session cache)
- Watchlist exclusion (259 items with tmdb_id)
- Negative filtering for skipped content
- Fatigue scoring active
- Always-include genres for diversity
- Session cache pruning (limits to 200 items)

### Worth Discovering (Blindspots)
- Hidden gems (high rating, low vote count)
- Classic gaps (acclaimed films not seen)
- Unexplored genres (Thriller, Horror, Romance identified)
- Service exclusives
- Adjacent interests
- 5 blindspots generated per load

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
| Half-Star Ratings | ❌ | ❌ | ❌ | ✅ |

**No competitor effectively bridges financial tracking with entertainment intelligence.**

---

*Last updated: December 4, 2025 - Session 13*