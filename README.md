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
│ Friday, December 6                         │
├────────────────────────────────────────────┤
│ ┌────────────────────────────────────────┐ │
│ │ MONTHLY STREAMING      ✓ Great Value  │ │
│ │         $27.98                         │ │
│ │ 📅 $336/year across 2 services        │ │
│ └────────────────────────────────────────┘ │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│ │ 303      │ │ 455h     │ │ $0.00    │    │
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
│ [Training Day] [Lord of Mysteries] [...]  │
└────────────────────────────────────────────┘
```

**Status:** ✅ Dashboard stats load instantly (~350ms), year/overview now displayed on cards

### Discover Screen (Tinder Inspired) ✅ Implemented

Swipe-based content discovery with satisfying gestures and clear actions.

**Status:** ✅ Swipe gestures working, optimistic UI for instant feedback, rating modal with half-star support

### Watchlist/For You Screen (Netflix Inspired) ✅ Implemented

Multi-lane browsing with contextual recommendation labels.

**Status:** ✅ Core UI complete, **load time reduced from 30s to 600ms**, instant cached display, genre filters working, fade animations

### Tips and Insights Screen ✅ Implemented

**Status:** ✅ Working, needs content variety improvements

---

## 🧠 Recommendation Intelligence Architecture

StreamSense implements a **6-layer recommendation intelligence system** inspired by Netflix, Spotify, and Amazon.

### Layer Overview

| Layer | Purpose | Status |
|-------|---------|--------|
| **Content DNA** | Deep content attributes beyond genres | ✅ **406 rows populated** |
| **User Taste Profile** | Aggregated preferences from behavior | ✅ Working ("Quirky Comedies Fan") |
| **Multi-Lane Recommendations** | Parallel recommendation strategies | ✅ Implemented with provider filtering |
| **Interest Graph** | Maps connections between interests | ✅ 707 nodes, 356 edges |
| **LLM Personalization** | Claude Haiku integration | ⏳ Planned |
| **Contextual Intelligence** | Time-of-day, mood awareness | ⏳ Planned |

### Content DNA Schema (Session 19)

The Content DNA table now includes comprehensive attribute tracking:

```sql
-- Tone attributes (0-1 scale)
tone_dark, tone_humorous, tone_suspenseful, tone_heartfelt, 
tone_intense, tone_lighthearted, tone_cerebral, tone_visceral

-- Aesthetic attributes (0-1 scale)
aesthetic_gritty, aesthetic_polished, aesthetic_minimalist, aesthetic_stylized,
aesthetic_naturalistic, aesthetic_surreal, aesthetic_visual, aesthetic_dark,
aesthetic_bright, aesthetic_colorful, aesthetic_muted, aesthetic_retro,
aesthetic_modern, aesthetic_cinematic, aesthetic_documentary, aesthetic_animated

-- Theme attributes (0-1 scale)
theme_family, theme_friendship, theme_romance, theme_revenge,
theme_survival, theme_identity, theme_justice, theme_power,
theme_redemption, theme_coming_of_age, theme_good_vs_evil, theme_loss

-- Narrative attributes
narrative_nonlinear, narrative_twist

-- Content ratings
content_violence, content_mature

-- Production metadata
production_budget, production_era, origin_countries
```

### Current Recommendation Features

| Feature | Status | Notes |
|---------|--------|-------|
| Genre Affinity Learning | ✅ Working | 22 genres tracked, temporal decay |
| Smart Recommendations | ✅ Working | Personalized picks, multi-layer exclusion |
| Provider Filtering | ✅ Working | Only shows content from subscribed services |
| Blindspot Discovery | ✅ Working | Hidden gems, classic gaps, unexplored genres |
| Session Exclusion | ✅ Working | 62 items persisted with 7-day retention |
| 7-Day Shown Tracking | ✅ Working | 525 items tracked across sessions |
| ID Type Normalization | ✅ Working | String/number mismatches resolved |
| Multi-Layer Fallback | ✅ Working | Diversified → Trending fallback chain |
| Instant Cached Display | ✅ Working | Shows cached recs while loading fresh |
| Negative Filtering | ✅ Working | Skipped content excluded |
| Real Service Badges | ✅ Working | Fetches actual provider data per item |
| Taste Profile | ✅ Working | Builds signature from 100 watchlist items |
| Always-Include Genres | ✅ Working | Romance, Horror, Anime, Documentary always fetched |
| Content DNA | ✅ **Populated** | 406 rows with full attribute extraction |
| 404 Error Handling | ✅ **Fixed** | Graceful skip for removed TMDb content |
| Half-Star Ratings | ✅ Fixed | Split touch targets for 0.5 increments |
| Genre Filter Re-render | ✅ Fixed | Proper prop connection to ForYouContent |
| Fade Animations | ✅ Working | Smooth transitions on add/remove |
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
| Watchlist System | ✅ Complete | 100% | 423 items tracked, all have media_type |
| Genre Affinity Learning | ✅ Complete | 100% | Real-time tracking |
| Provider Filtering | ✅ Complete | 100% | Filters by subscribed services |
| Service Badges | ✅ Complete | 100% | Real provider data displayed |
| Basic Recommendations | ✅ Complete | 100% | Genre-based + always-include genres |
| Exclusion System | ⚠️ Needs Tuning | 80% | Too aggressive, choking recommendations |
| For You Tab | ✅ Complete | 100% | Instant display + proper exclusions |
| Home Screen UI | ✅ Fixed | 100% | Year/overview now displayed |
| Discover Screen UI | ✅ Complete | 100% | Swipe working, half-star ratings fixed |
| Watchlist Screen UI | ✅ Fixed | 100% | Metadata displayed, genre filters working |
| Tips and Insights | ✅ Complete | 85% | Content variety needed |
| Error Handling | ✅ Complete | 100% | 404s handled gracefully, no red popups |
| TypeScript Fixes | ✅ Complete | 100% | All import/type errors resolved |
| Content DNA System | ✅ **Populated** | 100% | 406 rows with full schema |
| User Taste Profiles | ✅ Working | 100% | Signature: "Quirky Comedies Fan" |
| Fade Animations | ✅ Working | 100% | Smooth add/remove transitions |
| Recommendation Quality | ⚠️ **Needs Work** | 60% | Feels generic, exclusions too aggressive |
| LLM Integration | ⏳ Planned | 0% | Claude Haiku |

---

## 🐛 Current Bug List (Post Session 19)

### ✅ Fixed in Session 19

| # | Issue | Fix Applied |
|---|-------|-------------|
| 1 | Content DNA missing columns | Added 26 columns (aesthetic_*, theme_*, narrative_*, content_*, production_*) |
| 2 | DNA computation fails with PGRST204 | Schema now matches dnaToDatabase() function |
| 3 | 404 errors cause red popups | Implemented permanent failure tracking in dnaComputationQueue.ts |
| 4 | TypeScript errors in recommendationOrchestrator.ts | Fixed 5 type issues (function signature, missing fields, renamed property) |
| 5 | avoid_genres column missing | Added to user_taste_profiles table |

### 🔴 Active Issues (Priority Order)

| # | Issue | Priority | Root Cause | Proposed Fix |
|---|-------|----------|------------|--------------|
| 1 | Recommendations feel generic/untargeted | **P0** | Exclusion system too aggressive (900+ items) | Clear shown history, tune exclusion window |
| 2 | SVD generates 0 predictions | P1 | Only 1 user in system | Expected for single-user, rely on DNA-based recs |
| 3 | Recently shown bloat | P1 | 525+ items in 7-day window | Reduce window or clear periodically |
| 4 | Interest graph edges table missing | P2 | Table not created | Create interest_graph_edges table |
| 5 | Tips content variety | Low | Limited templates | Add more tip types |

### Exclusion System Analysis

The recommendation system is being choked by overlapping exclusions:

```
Current Exclusion Breakdown:
├── Watchlist Items:        411 items (expected)
├── Session Exclusions:      62 items (7-day retention)
├── Recently Shown:         525 items (7-day window) ⚠️ TOO HIGH
└── Total Effective:       ~900+ items excluded

Problem: With only ~20 items fetched per API call, nearly everything 
gets filtered out, leaving only 6 recommendations instead of 14+.
```

**Recommended Tuning:**
1. Reduce "recently shown" window from 7 days to 3 days
2. Clear recently shown on each fresh session
3. Increase API fetch size to compensate for exclusions
4. Prioritize DNA-based scoring over exclusion filtering

---

## ✅ Session 19 Achievements (December 6, 2025)

### Content DNA Schema Alignment 🧬

**Problem:** Session 18 created simplified content_dna table, but the existing 1,558-line contentDNA.ts service expected different column names. DNA computation worked (taste profile: "Quirky Comedies Fan") but failed to persist with PGRST204 errors.

**Root Cause:** The `dnaToDatabase()` function in recommendationOrchestrator.ts (lines 562-608) writes to columns that did not exist.

**Fix Applied:**
```sql
-- Added 16 aesthetic columns
ALTER TABLE content_dna ADD COLUMN IF NOT EXISTS aesthetic_gritty REAL DEFAULT 0;
ALTER TABLE content_dna ADD COLUMN IF NOT EXISTS aesthetic_polished REAL DEFAULT 0;
-- ... (14 more aesthetic columns)

-- Added missing theme columns
ALTER TABLE content_dna ADD COLUMN IF NOT EXISTS theme_good_vs_evil REAL DEFAULT 0;
ALTER TABLE content_dna ADD COLUMN IF NOT EXISTS theme_loss REAL DEFAULT 0;
ALTER TABLE content_dna ADD COLUMN IF NOT EXISTS theme_friendship REAL DEFAULT 0;

-- Added narrative columns
ALTER TABLE content_dna ADD COLUMN IF NOT EXISTS narrative_nonlinear REAL DEFAULT 0;
ALTER TABLE content_dna ADD COLUMN IF NOT EXISTS narrative_twist REAL DEFAULT 0;

-- Added content rating columns
ALTER TABLE content_dna ADD COLUMN IF NOT EXISTS content_violence REAL DEFAULT 0;
ALTER TABLE content_dna ADD COLUMN IF NOT EXISTS content_mature REAL DEFAULT 0;

-- Added production metadata
ALTER TABLE content_dna ADD COLUMN IF NOT EXISTS production_budget TEXT;
ALTER TABLE content_dna ADD COLUMN IF NOT EXISTS production_era TEXT;
ALTER TABLE content_dna ADD COLUMN IF NOT EXISTS origin_countries TEXT[];
```

**Result:** 
- ✅ DNA now persists to database successfully
- ✅ 406 items populated (up from 0)
- ✅ No more PGRST204 column errors

### 404 Error Handling 🛡️

**Problem:** DNA queue retried deleted TMDb content infinitely, causing red error popups and wasted API calls.

**Solution Implemented in dnaComputationQueue.ts:**
```typescript
// 1. Track permanently failed items
private permanentlyFailed = new Set<string>();

// 2. Skip in enqueue
if (this.permanentlyFailed.has(key)) {
  console.log(`[DNAQueue] Skipping permanently failed item: ${key}`);
  return;
}

// 3. Mark 404s as permanent failures
if (dna === null || error?.response?.status === 404) {
  console.warn(`[DNAQueue] ✗ Content not found (404) for ${key}`);
  this.permanentlyFailed.add(key);
  return false;
}
```

**Result:**
- ✅ 404 errors logged as warnings, not errors
- ✅ Failed items never retried
- ✅ Queue continues processing valid items
- ✅ No red error popups

### TypeScript Fixes 🔧

**5 Type Errors Fixed in recommendationOrchestrator.ts:**

1. **Line 417:** Function signature mismatch
   - Changed: `getSmartRecommendations(userId, 20)`
   - To: `getSmartRecommendations({ userId, limit: 20 })`

2. **Lines 544-550:** Missing talent fields
   - Added: `cinematographers: []`, `productionCompanies: []`

3. **Lines 552-558:** Missing production fields
   - Added: `isRemake: false`, `isSequel: false`, `isAdaptation: false`

4. **Lines 560-566:** Renamed property
   - Changed: `sexualContent` → `sexuality`

5. **Line 611:** Database save updated
   - Changed: `content_mature: dna.content.sexuality`

### Files Modified (Session 19)

| File | Changes |
|------|---------|
| `dnaComputationQueue.ts` | 404 handling, permanent failure tracking |
| `recommendationOrchestrator.ts` | 5 TypeScript fixes |
| Supabase `content_dna` | Added 26 columns |
| Supabase `user_taste_profiles` | Added avoid_genres column |

---

## 📈 Metrics (December 6, 2025 - Post Session 19)

```
Database Status:
  - watchlist_items:       423 rows (100% have media_type) ✅
  - content_dna:           406 rows ✅ POPULATED
  - user_taste_profiles:   1 row (Quirky Comedies Fan)

User Interactions:     423 watchlist items
Recently Shown:        525 items (7-day window) ⚠️ HIGH
Session Exclusions:    62 items (7-day retention)
Watchlist IDs:         411 valid (4 invalid UUIDs skipped)
Global Exclusions:     413 total
Genre Affinities:      22 genres tracked
Top Genres:            Drama, Comedy, Action
Behavior Mode:         Discovery (exploring widely)
Session Average:       10.4 items per session
Confidence Score:      0.69
Taste Signature:       Quirky Comedies Fan
Interest Graph:        707 nodes, 356 edges
Subscriptions:         2 active
  - Netflix:           $15.49/mo (Provider ID: 8)
  - Crunchyroll:       $7.99/mo (Provider ID: 283)
Monthly Total:         $27.98
Annual Projection:     $336/year
Provider Filtering:    ✅ Active
Service Badges:        ✅ Working

Status Distribution:
  - Want to Watch:     112 items
  - Watching:          8 items
  - Watched:           303 items

Performance:
  - For You Display:   Instant (cached) ✅
  - Watchlist Load:    ~886ms ✅
  - Dashboard Stats:   ~350ms ✅
  - Discover Actions:  <100ms ✅
  - DNA Computation:   ~170ms per item ✅
  - Taste Profile:     ~1.6s (100 items) ✅
  - No Error Popups:   ✅
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

### Phase 1: Recommendation Quality (Next Session) 🔴

**Fix the Exclusion System:**
1. Identify correct table for "recently shown" tracking
2. Clear or reduce the 525-item backlog
3. Tune exclusion windows (7 days → 3 days)
4. Increase diversity in recommendation sources

**Leverage Content DNA:**
- Use DNA attributes for similarity scoring
- Weight recommendations by taste profile match
- Implement "Because You Watched X" lanes using DNA

### Phase 2: Advanced Recommendations

**Multi-Lane System**
- [ ] "Because You Watched" lane (DNA-based)
- [ ] Talent Spotlight lanes
- [ ] Interest Cluster lanes (using 707 nodes)
- [ ] Mood-based suggestions

### Phase 3: Polish and Launch

**UI Refinements**
- [ ] Empty state designs
- [ ] Tips content variety
- [ ] Onboarding flow

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
| TypeScript Fixes | Week 3-4 | ✅ Complete |
| 404 Error Handling | Week 4 | ✅ **Complete (Session 19)** |
| Exclusion System | Week 3-4 | ⚠️ Needs Tuning |
| For You Tab Overhaul | Week 4 | ✅ Complete |
| P0 Critical Bugs | Week 4 | ✅ Complete (Session 18) |
| P1 UI Polish | Week 4 | ✅ Complete (Session 18) |
| Content DNA Population | Week 4 | ✅ **Complete (Session 19)** |
| Recommendation Quality | Week 5 | 🔴 **In Progress** |
| Advanced Recommendations | Week 5-6 | ⏳ Planned |
| Beta Testing | Week 6-7 | ⏳ Planned |
| App Store Submission | Week 8 | ⏳ Planned |

---

## 📚 Session History

| Session | Date | Focus | Key Achievements |
|---------|------|-------|------------------|
| 1-10 | Nov 2025 | Foundation | Core app structure, auth, watchlist |
| 11 | Dec 3 | Database Errors | Fixed PGRST200, 22P02, relationship errors |
| 12 | Dec 4 | Dashboard & Ratings | Stats widget, rating modal, backfill system |
| 13 | Dec 4 | For You Tab | Genre diversity, recommendation lanes |
| 14 | Dec 4 | TypeScript Fixes | All import/type errors resolved |
| 15 | Dec 4 | Exclusion Logic | Session tracking, negative filtering |
| 16 | Dec 5 | Performance | Caching, batch optimization |
| 17 | Dec 5-6 | For You Overhaul | ID normalization, multi-layer fallback, instant display |
| 18 | Dec 6 | Bug Sweep | 10 bugs fixed: P0 critical, P1 polish, P2 database |
| **19** | **Dec 6** | **DNA Schema** | **406 DNA rows, 404 handling, TypeScript fixes, schema alignment** |

---

## 🎯 Session 19 Summary

**Focus:** Content DNA schema alignment and error handling

**Achievements:**
- ✅ Fixed Content DNA schema (26 missing columns added)
- ✅ DNA now populating: 406 rows
- ✅ 404 error handling implemented
- ✅ TypeScript errors fixed (5 issues)
- ✅ Taste profile working ("Quirky Comedies Fan")
- ✅ Interest graph built (707 nodes, 356 edges)

**Issues Identified:**
- ⚠️ Recommendations feel generic/untargeted
- ⚠️ Exclusion system too aggressive (900+ items)
- ⚠️ SVD generates 0 predictions (single user)

**Next Session Priority:** 
Fix recommendation quality by tuning exclusion system and leveraging DNA for better personalization

---

*Last Updated: December 6, 2025 - Session 19*