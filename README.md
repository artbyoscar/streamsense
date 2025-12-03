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
│ │ Y  YouTube Premium       $9.99/mo   > │ │
│ │    ✓ Great Value                      │ │
│ ├────────────────────────────────────────┤ │
│ │ A  Amazon Prime Video    $10.99/mo  > │ │
│ │    ✓ Great Value                      │ │
│ ├────────────────────────────────────────┤ │
│ │ H  Hulu                  $11.99/mo  > │ │
│ │    ✓ Great Value                      │ │
│ └────────────────────────────────────────┘ │
│ Picked For You                    View All │
│ [Landman] [Retribution] [August Rush]      │
└────────────────────────────────────────────┘
```

**Status:** ✅ Core UI working, navigation buttons fixed

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

**Status:** ✅ Swipe gestures working, "All Caught Up" display issue needs fix

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
└────────────────────────────────────────────┘
```

**Status:** ✅ Core UI implemented, genre filtering needs fix, unknown titles issue

### Tips & Insights Screen ✅ Implemented

```
┌────────────────────────────────────────────┐
│ Tips & Insights                            │
│ Personalized recommendations based on      │
│ your viewing preferences                   │
├────────────────────────────────────────────┤
│ ┌────────────────────────────────────────┐ │
│ │ Your Spending                          │ │
│ │ $32.97    $395.64   3                  │ │
│ │ per month  per year  services          │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ 💎 Worth Discovering                       │
│ Expand your horizons - you might be        │
│ sleeping on these highly-rated titles      │
│                                            │
│ ┌─────────────┐ ┌─────────────┐            │
│ │ HIDDEN GEM  │ │ CLASSIC GAP │            │
│ │ [poster]    │ │ [poster]    │            │
│ │ Once Upon a │ │ Lock, Stock │            │
│ │ Time in the │ │ and Two...  │            │
│ │ West        │ │             │            │
│ └─────────────┘ └─────────────┘            │
└────────────────────────────────────────────┘
```

**Status:** ✅ Working, needs content variety improvements

---

## 🧠 Recommendation Intelligence Architecture

StreamSense implements a **6-layer recommendation intelligence system** inspired by Netflix, Spotify, and Amazon's approaches.

### Layer Overview

| Layer | Purpose | Status |
|-------|---------|--------|
| **Content DNA** | Deep content attributes beyond genres | ⚠️ Schema ready, graceful fallback added |
| **User Taste Profile** | Aggregated preferences from behavior | ⚠️ Schema ready, table not created |
| **Multi-Lane Recommendations** | Parallel recommendation strategies | 🔧 Partially implemented |
| **Interest Graph** | Maps connections between interests | ⚠️ Schema ready, graceful fallback added |
| **LLM Personalization** | Claude Haiku integration | ⏳ Planned |
| **Contextual Intelligence** | Time-of-day, mood awareness | ⏳ Planned |

### Current Recommendation Features

| Feature | Status | Notes |
|---------|--------|-------|
| Genre Affinity Learning | ✅ Working | 22 genres tracked, temporal decay |
| Smart Recommendations | ✅ Working | Personalized picks, exclusion logic |
| Blindspot Discovery | ✅ Working | Hidden gems, classic gaps, unexplored genres |
| Session Exclusion | ✅ Working | Prevents repeat recommendations |
| Negative Filtering | ✅ Working | Skipped content excluded |
| SVD Matrix Factorization | ⚠️ Limited | Single-user generates 0 predictions |
| Collaborative Filtering | ⚠️ Blocked | Needs multiple users |

---

## 📊 Project Status

### Overall Completion: **80%**

| Category | Status | Completion | Notes |
|----------|--------|------------|-------|
| Core Infrastructure | ✅ Complete | 100% | Expo SDK 54, EAS Build |
| Authentication | ✅ Complete | 100% | Supabase Auth |
| Subscription Management | ✅ Complete | 98% | Value scores working |
| Watchlist System | ✅ Complete | 95% | 275 items tracked |
| Genre Affinity Learning | ✅ Complete | 100% | Real-time tracking |
| Basic Recommendations | ✅ Complete | 90% | Genre-based active |
| **Home Screen UI** | ✅ Implemented | 85% | Navigation fixed, cards need tap handling |
| **Discover Screen UI** | ✅ Implemented | 75% | Swipe working, "All Caught Up" bug |
| **Watchlist Screen UI** | ✅ Implemented | 65% | Core working, filtering broken |
| Tips & Insights | ✅ Complete | 85% | Content variety needed |
| Error Handling | ✅ Complete | 100% | Graceful fallbacks for missing tables |
| Content DNA System | ⚠️ Blocked | 20% | Table not created, graceful fallback active |
| Interest Graph | ⚠️ Blocked | 20% | Table not created, graceful fallback active |
| SVD Factorization | ⚠️ Limited | 80% | Works but 0 predictions (single user) |
| LLM Integration | ⏳ Planned | 0% | Claude Haiku |

---

## 🔧 Known Issues

### Critical (Session 6 Identified)

| Issue | Impact | Status |
|-------|--------|--------|
| Picked For You cards not tappable | Cannot view content details | 🔧 Fix needed |
| Genre filtering does nothing | Users cannot filter by genre | 🔧 Fix needed |
| Unknown titles in watchlist | Missing TMDb metadata display | 🔧 Fix needed |
| Discover shows "All Caught Up" on arrival | Wrong initial state | 🔧 Fix needed |

### High Priority

| Issue | Impact | Status |
|-------|--------|--------|
| Netflix "N" badge on all content | Incorrect service attribution | 🔧 Fix needed |
| Genre filtering slow (5-10s) | Poor UX on For You tab | 🔧 Optimization needed |
| No subscription limit for free tier | 4th subscription allowed | 🔧 Paywall logic needed |
| Worth Discovering shows same content | Lack of variety | 🔧 Algorithm improvement needed |

### Medium Priority

| Issue | Impact | Status |
|-------|--------|--------|
| Added items do not fade in Trending | No visual feedback | 🔧 Fix needed |
| No rating when marking Watched | Missing feature in Discover | 🔧 Enhancement needed |
| Half-star ratings | Feature request | ⏳ Future enhancement |

### Recently Resolved ✅ (Session 6)

| Issue | Resolution | Date |
|-------|------------|------|
| `content_dna` table error (PGRST205) | Added graceful error handling | Dec 2 |
| `interest_graph_edges` table error (PGRST205) | Added graceful error handling | Dec 2 |
| Rewatch FK relationship error (PGRST200) | Feature temporarily disabled | Dec 2 |
| "Manage All" button not navigating | Wired to Settings tab | Dec 2 |
| "Add Subscription" button not working | Wired to SubscriptionForm modal | Dec 2 |
| "View All" / "Explore all" buttons | Wired to Watchlist tab | Dec 2 |
| UpcomingSection crash (null date) | Added null checks for parseISO | Dec 2 |
| Red error banners on startup | All three database errors handled | Dec 2 |

### Previously Resolved ✅ (Session 5)

| Issue | Resolution | Date |
|-------|------------|------|
| Import path errors (`@/` aliases) | Changed to relative paths | Dec 2 |
| Missing packages | Installed expo-linear-gradient, lucide-react-native | Dec 2 |
| Reanimated v4 API changes | Updated gesture handlers | Dec 2 |
| Type mismatches (snake_case vs camelCase) | Fixed property names | Dec 2 |
| ContinueWatchingSection null error | Added null safety check | Dec 2 |
| Native module build required | Created new EAS development build | Dec 2 |

---

## ✅ What Works

### Authentication & User Management
- Email/password authentication via Supabase
- Secure session management with Row Level Security
- User profile persistence

### Subscription Tracking
- Manual subscription entry with service name, price, billing cycle
- Total monthly cost calculation ($32.97 tracked)
- Human-readable value scores ("Great Value", "Low Usage")
- Annual projection ($396/year across 3 services)
- Service-level value indicators
- Upcoming bills tracking with null-safe date handling

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
- Quick insights row (watched: 217, watch time: 325.5h, cost/hour: $0.10)
- Services list with value indicators
- Navigation buttons working (Manage All, Add Subscription, View All)
- Discover screen with swipe gestures
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

## 📈 Metrics from Testing (December 2, 2025 - Session 6)

```
User Interactions:     275 watchlist items
Genre Affinities:      22 genres tracked
Top Genres:            Drama (460), Adventure (434), Action (343)
Unexplored Genres:     Thriller, Horror, Romance
Behavior Mode:         Discovery (exploring widely)
Session Average:       12 items per session
Confidence Score:      0.74-0.77
Subscriptions:         3 active
  - YouTube Premium:   $9.99/mo
  - Amazon Prime:      $10.99/mo
  - Hulu:              $11.99/mo
Monthly Spend:         $32.97
Annual Projection:     $395.64
Cost Per Hour:         $0.10
Watch Time:            325.5 hours
Items Watched:         217
Value Status:          Great Value (overall)
Blindspots Generated:  7 unique recommendations
Session Cache:         300+ items shown (pruned to 200)
Global Exclusions:     246 watchlist items excluded
```

---

## 🚀 Development Pipeline

### Immediate Priorities (Session 7)

1. **Fix Critical UI Issues**
   - [ ] Make Picked For You cards tappable
   - [ ] Fix genre filtering on Watchlist screen
   - [ ] Fix unknown titles display (fetch missing TMDb data)
   - [ ] Fix Discover "All Caught Up" initial state

2. **Fix High Priority Issues**
   - [ ] Fix Netflix "N" badge showing on all content
   - [ ] Optimize genre filtering speed (5-10s → instant)
   - [ ] Add subscription limit for free tier (3 max)
   - [ ] Improve Worth Discovering variety

3. **Enhancements**
   - [ ] Add fade animation when adding from Trending
   - [ ] Add rating prompt when marking Watched in Discover
   - [ ] Add half-star rating capability

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
| Critical Bug Fixes (UI/UX) | Week 2-3 | 🔧 In Progress |
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

### Session 6 (December 2, 2025) - Database Error Fixes & Navigation

**Achievements:**
- Fixed all three critical database errors with graceful error handling:
  - `content_dna` table (PGRST205) - logs warning, skips DNA scan
  - `interest_graph_edges` table (PGRST205) - logs warning, skips seeding
  - Rewatch FK relationship (PGRST200) - feature temporarily disabled
- Fixed navigation button handlers:
  - "Manage All" now navigates to Settings tab
  - "Add Subscription" now opens SubscriptionForm modal
  - "View All" and "Explore all recommendations" navigate to Watchlist tab
- Fixed UpcomingSection crash when subscriptions have null billing dates
- App now loads cleanly with no red error banners
- Successfully added 3rd subscription (YouTube Premium)

**Issues Discovered:**
- Picked For You cards not tappable (no onPress handler)
- Genre filtering does nothing on Watchlist
- Unknown titles still appearing (missing TMDb metadata)
- Discover shows "All Caught Up" incorrectly on arrival
- Genre filtering takes 5-10 seconds (should be instant)
- Netflix "N" badge showing on all Trending content
- 4th subscription allowed (should be limited for free tier)
- Worth Discovering shows same content repeatedly

**Files Modified:**
- `src/services/dnaComputationQueue.ts` - Added PGRST205 error handling
- `src/services/recommendationOrchestrator.ts` - Added checkError handling
- `src/services/rewatchSuggestions.ts` - Temporarily disabled feature
- `src/features/dashboard/components/ServicesSection.tsx` - Added navigation
- `src/features/dashboard/components/PickedForYouSection.tsx` - Added navigation
- `src/features/dashboard/components/UpcomingSection.tsx` - Added null checks

### Session 5 (December 2, 2025) - UI Implementation & Bug Discovery

**Achievements:**
- Successfully implemented Rocket Money-inspired Home screen
- Successfully implemented Tinder-inspired Discover screen with swipe gestures
- Successfully implemented Netflix-inspired Watchlist screen with tabs and hero spotlight
- Fixed all import path errors (changed from `@/` aliases to relative paths)
- Installed missing packages (expo-linear-gradient, lucide-react-native, date-fns)
- Fixed Reanimated v4 API compatibility (gesture handlers)
- Fixed type mismatches between SwipeScreen and UnifiedContent types
- Created new EAS development build with native modules
- App successfully runs and displays new UI

**Technical Notes:**
- EAS Build: `85f5a245-23db-4288-bd30-39135d8861a3`
- Build includes: react-native-svg, expo-linear-gradient, lucide-react-native
- Metro bundler successfully bundles 4459 modules

### Session 4 - UI Design Specifications
- Analyzed Rocket Money, Tinder, and Netflix UI patterns
- Created comprehensive design specifications for all screens
- Defined component library and color palette

### Session 3 - Recommendation Intelligence Architecture
- Designed 6-layer recommendation system
- Created database schemas for Content DNA, Taste Profiles, Interest Graph
- Defined implementation roadmap

### Session 2 - Core Stability
- Fixed app crashes and database issues
- Implemented value scoring
- Decoupled watchlist architecture

### Session 1 - Foundation
- Implemented blindspot algorithm
- Added genre affinity tracking
- Core authentication and data flow

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
| Service Badges | ❌ | ✅ | ❌ | ✅ |
| Swipe Discovery | ❌ | ❌ | ❌ | ✅ |

**No competitor effectively bridges financial tracking with entertainment intelligence.**

---

*Last updated: December 2, 2025 - Session 6*