# StreamSense 🎬💸

**Rocket Money for streaming, with Netflix-level recommendations.**

StreamSense helps users optimize their streaming spending while discovering personalized content. The app bridges the gap between subscription management tools (which treat streaming like any other bill) and content discovery platforms (which ignore costs entirely).

---

## 🎨 Design Philosophy

StreamSense's UI draws inspiration from three industry leaders, combining the best patterns from each:

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

**Status:** ✅ Core UI implemented, service badges in progress

### Tips & Insights Screen ✅ Implemented

**Status:** ✅ Working, needs content variety improvements

---

## 🧠 Recommendation Intelligence Architecture

StreamSense implements a **6-layer recommendation intelligence system** inspired by Netflix, Spotify, and Amazon's approaches.

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
| **Provider Filtering** | ✅ Working | Only shows content from subscribed services |
| Blindspot Discovery | ✅ Working | Hidden gems, classic gaps, unexplored genres |
| Session Exclusion | ✅ Working | Prevents repeat recommendations |
| Negative Filtering | ✅ Working | Skipped content excluded |
| **Real Service Badges** | 🔧 In Progress | Fetches actual provider data per item |
| SVD Matrix Factorization | ⚠️ Limited | Single-user generates 0 predictions |
| Collaborative Filtering | ⚠️ Blocked | Needs multiple users |

---

## 📊 Project Status

### Overall Completion: **82%**

| Category | Status | Completion | Notes |
|----------|--------|------------|-------|
| Core Infrastructure | ✅ Complete | 100% | Expo SDK 54, EAS Build |
| Authentication | ✅ Complete | 100% | Supabase Auth |
| Subscription Management | ✅ Complete | 100% | Manage All modal, add/edit/delete |
| Watchlist System | ✅ Complete | 95% | 275 items tracked |
| Genre Affinity Learning | ✅ Complete | 100% | Real-time tracking |
| **Provider Filtering** | ✅ Complete | 100% | Filters by subscribed services |
| Basic Recommendations | ✅ Complete | 90% | Genre-based active |
| **Home Screen UI** | ✅ Implemented | 90% | Navigation fixed, Manage All working |
| **Discover Screen UI** | ✅ Implemented | 80% | Swipe working, provider filtering active |
| **Watchlist Screen UI** | ✅ Implemented | 70% | Core working, service badges in progress |
| **Service Badges** | 🔧 In Progress | 60% | Architecture complete, integration testing |
| Tips & Insights | ✅ Complete | 85% | Content variety needed |
| Error Handling | ✅ Complete | 100% | Graceful fallbacks for missing tables |
| Content DNA System | ⚠️ Blocked | 20% | Table not created, graceful fallback active |
| Interest Graph | ⚠️ Blocked | 20% | Table not created, graceful fallback active |
| SVD Factorization | ⚠️ Limited | 80% | Works but 0 predictions (single user) |
| LLM Integration | ⏳ Planned | 0% | Claude Haiku |

---

## 🔧 Known Issues

### Critical

| Issue | Impact | Status |
|-------|--------|--------|
| ~~Netflix "N" badge on all content~~ | ~~Incorrect service attribution~~ | ✅ Being Fixed (Session 8) |
| Genre filtering does nothing | Users cannot filter by genre | 🔧 Fix needed |
| Unknown titles in watchlist | Missing TMDb metadata display | 🔧 Fix needed |

### High Priority

| Issue | Impact | Status |
|-------|--------|--------|
| Genre filtering slow (5-10s) | Poor UX on For You tab | 🔧 Optimization needed |
| No subscription limit for free tier | 4th subscription allowed | 🔧 Paywall logic needed |
| Worth Discovering shows same content | Lack of variety | 🔧 Algorithm improvement needed |

### Medium Priority

| Issue | Impact | Status |
|-------|--------|--------|
| Added items do not fade in Trending | No visual feedback | 🔧 Fix needed |
| No rating when marking Watched | Missing feature in Discover | 🔧 Enhancement needed |
| Half-star ratings | Feature request | ⏳ Future enhancement |

### Recently Resolved ✅ (Sessions 7-8)

| Issue | Resolution | Date |
|-------|------------|------|
| "Manage All" opens modal | Created SubscriptionsManageModal component | Dec 2 |
| Can add/edit/delete subscriptions | Full CRUD in modal | Dec 2 |
| Missing Crunchyroll option | Added to STREAMING_SERVICES array | Dec 2 |
| Provider filtering not working | Verified working via logs | Dec 2 |
| Hardcoded Netflix badge | Implementing real badge system | Dec 2 |

### Previously Resolved ✅ (Session 6)

| Issue | Resolution | Date |
|-------|------------|------|
| `content_dna` table error (PGRST205) | Added graceful error handling | Dec 2 |
| `interest_graph_edges` table error (PGRST205) | Added graceful error handling | Dec 2 |
| Rewatch FK relationship error (PGRST200) | Feature temporarily disabled | Dec 2 |
| "Manage All" button not navigating | Now opens modal | Dec 2 |
| "Add Subscription" button not working | Wired to SubscriptionForm modal | Dec 2 |
| UpcomingSection crash (null date) | Added null checks for parseISO | Dec 2 |
| Red error banners on startup | All three database errors handled | Dec 2 |

---

## ✅ What Works

### Authentication & User Management
- Email/password authentication via Supabase
- Secure session management with Row Level Security
- User profile persistence

### Subscription Tracking
- Manual subscription entry with service name, price, billing cycle
- **Full CRUD via Manage All modal** (add, edit, delete)
- Total monthly cost calculation
- Human-readable value scores ("Great Value", "Low Usage")
- Annual projection
- Service-level value indicators
- **Crunchyroll support added**

### Provider Filtering ✅ NEW
- Recommendations filtered by subscribed services
- Verified via logs: `[SmartRecs] Filtering by user providers: [8, 283]`
- Netflix (8), Crunchyroll (283), and all major services supported
- Content only appears if available on user's subscriptions

### Service Badges System 🔧 IN PROGRESS
- SERVICE_BADGES configuration for 11 streaming services
- PROVIDER_ID_TO_SERVICE mapping for TMDb provider IDs
- getUserSubscriptionNames() fetches user's active services
- batchGetServiceBadges() processes items in batches with rate limiting
- ContentCard accepts serviceBadge prop
- RecommendationLane passes badges to cards
- ForYouContent fetches badges for Trending lane

### Watchlist Management
- 275 items tracked across all statuses
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
- **Provider-aware filtering** (only subscribed services)
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
- **Manage All modal with subscription management**
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

## 📈 Metrics from Testing (December 2, 2025 - Session 8)
```
User Interactions:     275 watchlist items
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
Service Badges:        🔧 In progress - architecture complete
Blindspots Generated:  7 unique recommendations
Session Cache:         300+ items shown (pruned to 200)
Global Exclusions:     246 watchlist items excluded
```

---

## 🚀 Development Pipeline

### Immediate Priorities (Session 9)

1. **Complete Service Badges Implementation**
   - [ ] Test ForYouContent badge fetching
   - [ ] Verify correct badges appear (N for Netflix, CR for Crunchyroll)
   - [ ] Add badges to other lanes if needed
   - [ ] Performance optimization (caching)

2. **Fix Remaining Critical Issues**
   - [ ] Fix genre filtering on Watchlist screen
   - [ ] Fix unknown titles display (fetch missing TMDb data)

3. **Fix High Priority Issues**
   - [ ] Optimize genre filtering speed (5-10s → instant)
   - [ ] Add subscription limit for free tier (3 max)
   - [ ] Improve Worth Discovering variety

### Phase 2: Database Tables (Next Week)

1. **Create Missing Tables in Supabase**
   - [ ] `content_dna` - Content attribute storage
   - [ ] `interest_graph_edges` - Interest relationships
   - [ ] `user_taste_profiles` - Aggregated preferences

2. **Implement Services**
   - [ ] Content DNA computation
   - [ ] User taste profile aggregation
   - [ ] Interest graph population

### Phase 3: Enhanced Recommendations

1. **Multi-Lane System**
   - [ ] "Because You Watched" lane
   - [ ] Talent Spotlight lanes
   - [ ] Interest Cluster lanes

2. **Worth Discovering Improvements**
   - [ ] Filter by subscribed services
   - [ ] More variety in recommendations
   - [ ] Fresh content on each load

### Phase 4: Polish & Launch

1. **UI Refinements**
   - [ ] Animation polish
   - [ ] Empty state designs
   - [ ] Error state handling

2. **Launch Preparation**
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
| Service Badges System | Week 2-3 | 🔧 In Progress |
| Database Tables Creation | Week 3 | ⏳ Pending |
| Content DNA + Taste Profiles | Week 3-4 | ⏳ Pending |
| Performance Optimization | Week 4 | ⏳ Pending |
| Multi-Lane UI Integration | Week 4-5 | ⏳ Pending |
| LLM Integration | Week 5-6 | ⏳ Pending |
| Polish & Testing | Week 6-7 | ⏳ Pending |
| Waitlist Launch | Week 7-8 | ⏳ Pending |
| Alpha Release | Week 9-10 | ⏳ Pending |

---

## 📝 Recent Updates

### Session 8 (December 2, 2025) - Service Badges Implementation

**Achievements:**
- Verified provider filtering working via console logs
  - Netflix only: `[SmartRecs] Filtering by user providers: [8]`
  - Netflix + Crunchyroll: `[SmartRecs] Filtering by user providers: [8, 283]`
  - Crunchyroll only: `[SmartRecs] Filtering by user providers: [283]`
- Identified hardcoded Netflix badge issue in ContentCard
- Temporarily removed misleading badges from Trending lane
- Implemented real service badge system:
  - Created SERVICE_BADGES config for 11 streaming services
  - Created PROVIDER_ID_TO_SERVICE mapping for TMDb IDs
  - Added getUserSubscriptionNames() function
  - Added getContentServiceBadge() for single items
  - Added batchGetServiceBadges() with rate limiting (5 items/batch, 100ms delay)
  - Updated ContentCard to accept serviceBadge prop
  - Updated RecommendationLane to pass serviceBadges map
  - Updated ForYouContent to fetch badges for Trending lane

**Files Modified:**
- `src/services/watchProviders.ts` - Added SERVICE_BADGES, PROVIDER_ID_TO_SERVICE, badge fetching functions
- `src/features/subscriptions/components/SubscriptionForm.tsx` - Added Crunchyroll
- `src/features/watchlist/components/ContentCard.tsx` - Added serviceBadge prop
- `src/features/watchlist/components/RecommendationLane.tsx` - Added serviceBadges prop
- `src/features/watchlist/components/ForYouContent.tsx` - Added badge fetching logic

### Session 7 (December 2, 2025) - Manage All & Provider Verification

**Achievements:**
- Created SubscriptionsManageModal component with full CRUD
- Fixed NavigationContext corruption issues
- Added Crunchyroll to subscription options
- Verified provider filtering works correctly
- Modal shows total monthly spend, subscription list, edit/delete buttons

**Files Modified:**
- `src/features/subscriptions/components/SubscriptionsManageModal.tsx` - New component
- `src/features/dashboard/components/ServicesSection.tsx` - Added modal trigger

### Session 6 (December 2, 2025) - Database Error Fixes & Navigation

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
| **Provider Filtering** | ❌ | ✅ | ❌ | ✅ |
| **Real Service Badges** | ❌ | ✅ | ❌ | 🔧 |
| Swipe Discovery | ❌ | ❌ | ❌ | ✅ |

**No competitor effectively bridges financial tracking with entertainment intelligence.**

---

*Last updated: December 2, 2025 - Session 8*


Excellent news on the service badges! Here is the consolidated bug list:

---

## 🐛 StreamSense Bug List - Session 9

### Phase 1: Genre Filtering Performance (Critical)
**Issue:** Genre filters are broken or extremely slow
- Action/Adventure filters do nothing
- Animation takes ~10 seconds
- Comedy requires switching away and back
- Crime shows nothing
- Documentary takes 10 seconds then UI freezes for 20 seconds

**Root Cause Hypothesis:** Cache miss triggers fresh API calls; filtering logic may be inefficient
**Estimated Time:** 20-30 minutes

---

### Phase 2: Want to Watch Shows Nothing
**Issue:** Want to Watch tab displays empty even with items in watchlist
**Scope:** Check query filtering, status mapping, or rendering logic
**Estimated Time:** 10-15 minutes

---

### Phase 3: Unknown Titles in Watching
**Issue:** "Unknown Title" appearing for items in Watching section
**Root Cause:** TMDb metadata missing or not hydrated
**Scope:** 
- Query database for items with null/empty titles
- Check if TMDb IDs are valid
- Add fallback handling or re-fetch metadata
**Estimated Time:** 15-20 minutes

---

### Phase 4: Subscription Service Filter for Watchlist
**Issue:** No way to filter watchlist by streaming service
**Feature Request:**
- Add filter chips: All | Netflix | Crunchyroll | etc.
- "All" shows diversified mix from all subscribed services
- Individual service shows only that service's content
**Estimated Time:** 25-30 minutes

---

### Phase 5: Discover Watched Rating Prompt
**Issue:** Swiping "Watched" does not prompt for rating
**Scope:** Add rating modal trigger after watch action
**Estimated Time:** 10-15 minutes

---

### Phase 6: Tips "Worth Discovering" Staleness
**Issue:** Same recommendations appearing repeatedly across sessions
**Root Cause:** Cache not invalidating properly
**Scope:** Force refresh logic or session-based exclusion persistence
**Estimated Time:** 15-20 minutes

---

### ✅ Resolved This Session
| Issue | Status |
|-------|--------|
| Service badges show wrong service | ✅ Fixed - Real badges now working |
| Provider filtering not active | ✅ Verified working |
| Manage All modal | ✅ Working with full CRUD |

---

**Which phase would you like to tackle first?** I recommend starting with **Phase 1 (Genre Filtering)** since it is causing the worst user experience issues, or **Phase 2 (Want to Watch)** since that is core functionality that is completely broken.