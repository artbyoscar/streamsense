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
│ Good evening, there                   ⚙️  │
│ Tuesday, December 2                        │
├────────────────────────────────────────────┤
│ ┌────────────────────────────────────────┐ │
│ │ MONTHLY STREAMING      ✓ Great Value  │ │
│ │         $32.97                         │ │
│ │ $2.64 more than last month            │ │
│ │ 📅 $396/year across 3 services        │ │
│ └────────────────────────────────────────┘ │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│ │ 217      │ │ 325.5h   │ │ $0.10    │    │
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
│ [Landman] [Retribution] [August Rush]      │
└────────────────────────────────────────────┘
```

**Status:** ✅ Core UI working, Manage All modal functional

### Discover Screen (Tinder Inspired) ✅ Implemented

Swipe-based content discovery with satisfying gestures and clear actions.

```
┌────────────────────────────────────────────┐
│ Discover                                   │
│ Quick swipe to build your watchlist        │
├────────────────────────────────────────────┤
│                                            │
│        ┌──────────────────────┐            │
│        │  [85%]               │            │
│        │                      │            │
│        │    POSTER IMAGE      │            │
│        │    (swipeable)       │            │
│        │                      │            │
│        │  ░░░ GRADIENT ░░░░░  │            │
│        │  Fargo               │            │
│        │  ★ 8.3 • TV Series   │            │
│        └──────────────────────┘            │
│                                            │
│           ( ✕ )         ( ♥ )              │
│            Skip          Like              │
│                                            │
│      [▶ Watching]    [✓ Watched]           │
└────────────────────────────────────────────┘
```

**Status:** ✅ Swipe gestures working, provider filtering active

### Watchlist/For You Screen (Netflix Inspired) ✅ Implemented

Multi-lane browsing with contextual recommendation labels.

```
┌────────────────────────────────────────────┐
│ Watchlist                            🔍    │
│ ✨ Drama, Adventure, Action lover         │
├────────────────────────────────────────────┤
│ [For You][Want to Watch][Watching][Watched]│
├────────────────────────────────────────────┤
│ [All][Action][Adventure][Animation]...     │
├────────────────────────────────────────────┤
│ ┌────────────────────────────────────────┐ │
│ │     HERO SPOTLIGHT (backdrop)          │ │
│ │     85% Match                          │ │
│ │     Troll                              │ │
│ │     ★ 6.6 • 2022 • Movie              │ │
│ │     [Netflix] Included in subscription │ │
│ │     [+ My List]  [ℹ Details]           │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ Top Picks For You                See All > │
│ Personalized based on your taste           │
│ [poster][poster][poster][poster]...        │
│                                            │
│ Trending on Your Services        See All > │
│ Popular now on your subscriptions          │
│ [N][CR][N][CR]... (real service badges)    │
└────────────────────────────────────────────┘
```

**Status:** ✅ Core UI implemented, service badges working

### Tips and Insights Screen ✅ Implemented

**Status:** ✅ Working, needs content variety improvements

---

## 🧠 Recommendation Intelligence Architecture

StreamSense implements a **6-layer recommendation intelligence system** inspired by Netflix, Spotify, and Amazon.

### Layer Overview

| Layer | Purpose | Status |
|-------|---------|--------|
| **Content DNA** | Deep content attributes beyond genres | ⚠️ Schema ready, graceful fallback added |
| **User Taste Profile** | Aggregated preferences from behavior | ⚠️ Schema ready, table not created |
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
| SVD Matrix Factorization | ⚠️ Limited | Single-user generates 0 predictions |
| Collaborative Filtering | ⚠️ Blocked | Needs multiple users |

---

## 📊 Project Status

### Overall Completion: **85%**

| Category | Status | Completion | Notes |
|----------|--------|------------|-------|
| Core Infrastructure | ✅ Complete | 100% | Expo SDK 54, EAS Build |
| Authentication | ✅ Complete | 100% | Supabase Auth |
| Subscription Management | ✅ Complete | 100% | Manage All modal, add/edit/delete |
| Watchlist System | ✅ Complete | 95% | 284 items tracked |
| Genre Affinity Learning | ✅ Complete | 100% | Real-time tracking |
| Provider Filtering | ✅ Complete | 100% | Filters by subscribed services |
| Service Badges | ✅ Complete | 100% | Real provider data displayed |
| Basic Recommendations | ✅ Complete | 90% | Genre-based active |
| Home Screen UI | ✅ Implemented | 90% | Navigation fixed, Manage All working |
| Discover Screen UI | ✅ Implemented | 80% | Swipe working, provider filtering active |
| Watchlist Screen UI | 🔧 Performance | 60% | Loading too slow (see bugs) |
| Tips and Insights | ✅ Complete | 85% | Content variety needed |
| Error Handling | ✅ Complete | 100% | Graceful fallbacks for missing tables |
| Content DNA System | ⚠️ Blocked | 20% | Table not created, graceful fallback active |
| Interest Graph | ⚠️ Blocked | 20% | Table not created, graceful fallback active |
| LLM Integration | ⏳ Planned | 0% | Claude Haiku |

---

## 🐛 Current Bug List (Session 10)

### Priority 0: Critical Performance

| # | Issue | Root Cause | Status |
|---|-------|------------|--------|
| 1 | Watchlist loads 30-40 seconds | 284 individual TMDb API calls during hydration | 🔧 Needs Fix |
| 2 | Filter chips not clickable when scrolled | Z-index or position issue with sticky header | 🔧 Needs Fix |
| 3 | Adding to list does not remove card | No exclusion/refresh after action in Discover | 🔧 Needs Fix |

### Priority 1: Broken Features

| # | Issue | Root Cause | Status |
|---|-------|------------|--------|
| 4 | Action/Adventure filters show same content | Items belong to multiple genres, showing any-match instead of primary | 🔧 Needs Fix |
| 5 | Crime filter shows The 100 | TMDb has it as Drama/Sci-Fi/Action, not Crime | 🔧 Needs Fix |
| 6 | Drama filter shows Young Sheldon | Young Sheldon is Comedy (ID 35), genre matching logic incorrect | 🔧 Needs Fix |
| 7 | Unknown Titles in watchlist | TMDb hydration failing, metadata not stored on add | 🔧 Needs Fix |

### Priority 2: Missing Features

| # | Issue | Status |
|---|-------|--------|
| 8 | Rating prompt after "Watched" swipe | ⏳ Enhancement |
| 9 | Tips "Worth Discovering" showing stale content | ⏳ Enhancement |
| 10 | Service filter for watchlist tabs | ⏳ Enhancement |

### Recommended Fix Order

1. **Fix #2** (filter chips z-index): Quick win, approximately 5 minutes
2. **Fix #1** (watchlist speed): Store metadata on add, show immediately. Biggest impact, approximately 20 minutes
3. **Fix #3** (card removal after action): Approximately 10 minutes
4. **Fix #4-6** (genre filtering accuracy): Use primary genre matching, approximately 15 minutes

---

## ✅ Recently Resolved (Sessions 7-10)

| Issue | Resolution | Session |
|-------|------------|---------|
| Service badges show wrong service | Implemented real badge system with TMDb provider data | Session 10 |
| Provider filtering not active | Verified working via logs | Session 9 |
| Manage All modal | Created SubscriptionsManageModal with full CRUD | Session 7 |
| Missing Crunchyroll option | Added to STREAMING_SERVICES array | Session 7 |
| `content_dna` table error (PGRST205) | Added graceful error handling | Session 6 |
| `interest_graph_edges` table error (PGRST205) | Added graceful error handling | Session 6 |
| Rewatch FK relationship error (PGRST200) | Feature temporarily disabled | Session 6 |
| "Add Subscription" button not working | Wired to SubscriptionForm modal | Session 6 |
| UpcomingSection crash (null date) | Added null checks for parseISO | Session 6 |
| Red error banners on startup | All three database errors handled | Session 6 |

---

## ✅ What Works

### Authentication and User Management
- Email/password authentication via Supabase
- Secure session management with Row Level Security
- User profile persistence

### Subscription Tracking
- Manual subscription entry with service name, price, billing cycle
- Full CRUD via Manage All modal (add, edit, delete)
- Total monthly cost calculation
- Human-readable value scores ("Great Value", "Low Usage")
- Annual projection
- Service-level value indicators
- Crunchyroll support

### Provider Filtering
- Recommendations filtered by subscribed services
- Verified via logs: `[SmartRecs] Filtering by user providers: [8, 283]`
- Netflix (8), Crunchyroll (283), and all major services supported
- Content only appears if available on user subscriptions

### Service Badges System
- SERVICE_BADGES configuration for 11 streaming services
- PROVIDER_ID_TO_SERVICE mapping for TMDb provider IDs
- getUserSubscriptionNames() fetches user active services
- batchGetServiceBadges() processes items in batches with rate limiting
- ContentCard accepts serviceBadge prop
- RecommendationLane passes badges to cards
- ForYouContent fetches badges for Trending lane

### Watchlist Management
- 284 items tracked across all statuses
- Status management: Want to Watch, Watching, Watched
- 5-star rating system
- Decoupled architecture (API hydration)
- Content persists across sessions

### Genre Affinity Learning
- 22 genre affinities tracked
- Top genres: Drama (460), Adventure (434), Action (343)
- Temporal decay (recent preferences weighted higher)
- Discovery mode detection (0.74-0.77 confidence)
- Average 12 items per session

### Smart Recommendations
- Personalized picks based on genre affinity
- Provider-aware filtering (only subscribed services)
- Session-based exclusion (300+ items in session cache)
- Watchlist exclusion (246 items)
- Negative filtering for skipped content
- Fatigue scoring active
- Session cache pruning (limits to 200 items)

### Worth Discovering (Blindspots)
- Hidden gems (high rating, low vote count)
- Classic gaps (acclaimed films not seen)
- Unexplored genres (Thriller, Horror, Romance identified)
- Service exclusives
- 7 blindspots generated per load
- Caching for faster subsequent loads

### UI Implementation
- Home screen with hero spending card (no red error banners)
- Manage All modal with subscription management
- Quick insights row (watched: 217, watch time: 325.5h, cost/hour: $0.10)
- Services list with value indicators
- Navigation buttons working
- Discover screen with swipe gestures and provider filtering
- Watchlist screen with tabs and hero spotlight
- Tips screen with Worth Discovering carousel

### Error Handling
- Graceful fallback for missing `content_dna` table
- Graceful fallback for missing `interest_graph_edges` table
- Rewatch feature disabled with informative logging
- Null-safe date parsing in UpcomingSection

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

## 📈 Metrics from Testing (December 2-3, 2025)

```
User Interactions:     284 watchlist items
Genre Affinities:      22 genres tracked
Top Genres:            Drama (460), Adventure (434), Action (343)
Unexplored Genres:     Thriller, Horror, Romance
Behavior Mode:         Discovery (exploring widely)
Session Average:       12 items per session
Confidence Score:      0.74-0.77
Subscriptions:         2 active (testing)
  - Netflix:           $15.49/mo (Provider ID: 8)
  - Crunchyroll:       $7.99/mo (Provider ID: 283)
Provider Filtering:    ✅ Active - logs show filtering by [8, 283]
Service Badges:        ✅ Working - real provider data displayed
Blindspots Generated:  7 unique recommendations
Session Cache:         300+ items shown (pruned to 200)
Global Exclusions:     248 watchlist items excluded
```

---

## 🚀 Development Pipeline

### Immediate Priorities (Session 11)

**Performance Fixes (P0)**
- [ ] Store TMDb metadata in database on add (eliminate 284 API calls)
- [ ] Fix filter chip z-index for sticky header interaction
- [ ] Add exclusion set update and card animation after watchlist action

**Genre Filtering Accuracy (P1)**
- [ ] Implement primary genre matching instead of any-match
- [ ] Verify genre ID accuracy against TMDb data
- [ ] Add visual distinction for multi-genre items

**Data Integrity (P1)**
- [ ] Store title on add to database to prevent Unknown Titles
- [ ] Add fallback handling for failed TMDb hydration

### Phase 2: Feature Enhancements (Next Week)

**User Experience**
- [ ] Rating prompt after "Watched" swipe in Discover
- [ ] Service filter for watchlist tabs (All, Netflix, Crunchyroll, etc.)
- [ ] Force refresh logic for Tips "Worth Discovering"

**Database Tables**
- [ ] Create `content_dna` table in Supabase
- [ ] Create `interest_graph_edges` table
- [ ] Create `user_taste_profiles` table

### Phase 3: Advanced Recommendations

**Multi-Lane System**
- [ ] "Because You Watched" lane
- [ ] Talent Spotlight lanes
- [ ] Interest Cluster lanes

**Worth Discovering Improvements**
- [ ] Filter by subscribed services
- [ ] More variety in recommendations
- [ ] Fresh content on each load

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
| Performance Optimization | Week 3 | 🔧 In Progress |
| Genre Filtering Accuracy | Week 3 | 🔧 In Progress |
| Database Tables Creation | Week 3-4 | ⏳ Pending |
| Content DNA + Taste Profiles | Week 4-5 | ⏳ Pending |
| Multi-Lane UI Integration | Week 5-6 | ⏳ Pending |
| LLM Integration | Week 6-7 | ⏳ Pending |
| Polish and Testing | Week 7-8 | ⏳ Pending |
| Waitlist Launch | Week 8-9 | ⏳ Pending |
| Alpha Release | Week 10-11 | ⏳ Pending |

---

## 📝 Session History

### Session 10 (December 3, 2025) - Performance Analysis

**Achievements:**
- Verified service badges displaying correctly with real provider data
- Identified critical performance bottleneck: 284 individual TMDb API calls
- Documented genre filtering accuracy issues
- Identified filter chip z-index issue preventing interaction when scrolled
- Created consolidated bug list with priority tiers

**Root Cause Analysis:**
- Watchlist load time (30-40s) caused by `getWatchlist` calling TMDb API for each of 284 items
- `content_id` formatted as `"movie-1724"` not matching UUID format expected by content table join
- Genre filtering showing any-match instead of primary genre

### Session 9 (December 2, 2025) - Bug Triage

**Achievements:**
- Completed service badges implementation testing
- Verified ForYouContent badge fetching
- Documented genre filtering performance issues (5-10 second delays)
- Identified Want to Watch tab showing empty despite items existing

### Session 8 (December 2, 2025) - Service Badges Implementation

**Achievements:**
- Verified provider filtering working via console logs
- Identified hardcoded Netflix badge issue in ContentCard
- Implemented real service badge system with 11 streaming services
- Created SERVICE_BADGES and PROVIDER_ID_TO_SERVICE mappings
- Updated ContentCard, RecommendationLane, and ForYouContent components

**Files Modified:**
- `src/services/watchProviders.ts` - Badge configuration and fetching functions
- `src/features/subscriptions/components/SubscriptionForm.tsx` - Added Crunchyroll
- `src/features/watchlist/components/ContentCard.tsx` - serviceBadge prop
- `src/features/watchlist/components/RecommendationLane.tsx` - serviceBadges prop
- `src/features/watchlist/components/ForYouContent.tsx` - Badge fetching logic

### Session 7 (December 2, 2025) - Manage All and Provider Verification

**Achievements:**
- Created SubscriptionsManageModal component with full CRUD
- Fixed NavigationContext corruption issues
- Added Crunchyroll to subscription options
- Verified provider filtering works correctly

### Session 6 (December 2, 2025) - Database Error Fixes and Navigation

**Achievements:**
- Fixed all three critical database errors with graceful error handling
- Fixed navigation button handlers
- Fixed UpcomingSection crash when subscriptions have null billing dates
- App loads cleanly with no red error banners

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

**No competitor effectively bridges financial tracking with entertainment intelligence.**

---

*Last updated: December 3, 2025 - Session 10*