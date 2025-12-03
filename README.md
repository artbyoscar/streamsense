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
│ Good afternoon, there                 ⚙️  │
│ Tuesday, December 2                        │
├────────────────────────────────────────────┤
│ ┌────────────────────────────────────────┐ │
│ │ MONTHLY STREAMING      ✓ Great Value  │ │
│ │         $22.98                         │ │
│ │ $1.84 more than last month            │ │
│ │ 📅 $276/year across 2 services        │ │
│ └────────────────────────────────────────┘ │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│ │ 216      │ │ 324h     │ │ $0.07    │    │
│ │ WATCHED  │ │WATCH TIME│ │COST/HOUR │    │
│ └──────────┘ └──────────┘ └──────────┘    │
│ Your Services                    Manage All│
│ ┌────────────────────────────────────────┐ │
│ │ A  Amazon Prime Video    $10.99/mo  > │ │
│ │    ✓ Great Value                      │ │
│ ├────────────────────────────────────────┤ │
│ │ H  Hulu                  $11.99/mo  > │ │
│ │    ⚠ Low Usage                        │ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

**Status:** ✅ Core UI implemented, some buttons need navigation wiring

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

**Status:** ✅ Swipe gestures working, genre tracking needs fix

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

**Status:** ✅ Core UI implemented, genre filtering needs fix

### Tips & Insights Screen ✅ Implemented

```
┌────────────────────────────────────────────┐
│ Tips & Insights                            │
│ Personalized recommendations based on      │
│ your viewing preferences                   │
├────────────────────────────────────────────┤
│ ┌────────────────────────────────────────┐ │
│ │ Your Spending                          │ │
│ │ $22.98    $275.76    2                 │ │
│ │ per month  per year   services         │ │
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

**Status:** ✅ Working, loads in 15-20 seconds (optimization needed)

---

## 🧠 Recommendation Intelligence Architecture

StreamSense implements a **6-layer recommendation intelligence system** inspired by Netflix, Spotify, and Amazon's approaches.

### Layer Overview

| Layer | Purpose | Status |
|-------|---------|--------|
| **Content DNA** | Deep content attributes beyond genres | ⚠️ Schema ready, table not created |
| **User Taste Profile** | Aggregated preferences from behavior | ⚠️ Schema ready, table not created |
| **Multi-Lane Recommendations** | Parallel recommendation strategies | 🔧 Partially implemented |
| **Interest Graph** | Maps connections between interests | ⚠️ Schema ready, table not created |
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

### Overall Completion: **78%**

| Category | Status | Completion | Notes |
|----------|--------|------------|-------|
| Core Infrastructure | ✅ Complete | 100% | Expo SDK 54, EAS Build |
| Authentication | ✅ Complete | 100% | Supabase Auth |
| Subscription Management | ✅ Complete | 98% | Value scores working |
| Watchlist System | ✅ Complete | 95% | 269 items tracked |
| Genre Affinity Learning | ✅ Complete | 100% | Real-time tracking |
| Basic Recommendations | ✅ Complete | 90% | Genre-based active |
| **Home Screen UI** | ✅ Implemented | 75% | Core working, buttons need wiring |
| **Discover Screen UI** | ✅ Implemented | 70% | Swipe working, genre tracking fix needed |
| **Watchlist Screen UI** | ✅ Implemented | 60% | Core working, filtering broken |
| Tips & Insights | ✅ Complete | 85% | Load time optimization needed |
| Content DNA System | ⚠️ Blocked | 20% | Table not created in Supabase |
| Interest Graph | ⚠️ Blocked | 20% | Table not created in Supabase |
| SVD Factorization | ⚠️ Limited | 80% | Works but 0 predictions (single user) |
| LLM Integration | ⏳ Planned | 0% | Claude Haiku |

---

## 🔧 Known Issues

### Critical (Red Error Banners)

| Issue | Error Code | Impact | Fix Status |
|-------|------------|--------|------------|
| `content_dna` table missing | PGRST205 | DNA features blocked | Needs table creation OR graceful handling |
| `interest_graph_edges` missing | PGRST205 | Graph features blocked | Needs table creation OR graceful handling |
| Rewatch FK relationship | PGRST200 | Rewatch suggestions fail | Query needs refactor |

### High Priority

| Issue | Impact | Status |
|-------|--------|--------|
| Genre filtering not working | Users cannot filter by genre | Fix identified |
| Genre tracking `undefined` | Affinity scores not updating correctly | Fix identified |
| Buttons not navigating | Explore All, Manage All, etc. | Handlers need wiring |
| Unknown titles in watchlist | Some items show "U" placeholder | Missing TMDb metadata |

### Medium Priority

| Issue | Impact | Status |
|-------|--------|--------|
| 15-20 second load times | Poor UX on Home/Tips | Optimization needed |
| SVD 0 predictions | Matrix factorization ineffective | Single-user limitation |
| Worth Discovering not subscription-filtered | Shows content from unsubscribed services | Enhancement needed |

### Recently Resolved ✅

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
- Total monthly cost calculation ($22.98 tracked)
- Human-readable value scores ("Great Value", "Low Usage")
- Annual projection ($276/year across 2 services)
- Service-level value indicators

### Watchlist Management
- 269 items tracked across all statuses
- Status management: Want to Watch, Watching, Watched
- 5-star rating system
- Decoupled architecture (API hydration)
- Content persists across sessions

### Genre Affinity Learning
- 22 genre affinities tracked
- Top genres: Drama (458), Adventure (434), Action (343)
- Temporal decay (recent preferences weighted higher)
- Discovery mode detection (0.81 exploration score)
- Average 12.8 items per session

### Smart Recommendations
- Personalized picks based on genre affinity
- Session-based exclusion (280+ items in session cache)
- Watchlist exclusion (246 items)
- Negative filtering for skipped content
- Fatigue scoring active

### Worth Discovering (Blindspots)
- Hidden gems (high rating, low vote count)
- Classic gaps (acclaimed films not seen)
- Unexplored genres (Thriller, Horror, Romance identified)
- Service exclusives
- 8 blindspots generated per load

### UI Implementation
- Home screen with hero spending card
- Quick insights row (watched, watch time, cost/hour)
- Services list with value indicators
- Discover screen with swipe gestures
- Watchlist screen with tabs and hero spotlight
- Tips screen with Worth Discovering carousel

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

## 📈 Metrics from Testing (December 2, 2025)

```
User Interactions:     269 watchlist items
Genre Affinities:      22 genres tracked
Top Genres:            Drama (458), Adventure (434), Action (343)
Unexplored Genres:     Thriller, Horror, Romance
Behavior Mode:         Discovery (exploring widely)
Session Average:       12.8 items per session
Exploration Score:     0.81 (adventurous)
Subscriptions:         2 active (Amazon Prime $10.99, Hulu $11.99)
Monthly Spend:         $22.98
Annual Projection:     $275.76
Value Status:          Great Value (overall)
Blindspots Generated:  8 unique recommendations
Session Cache:         280+ items shown
Global Exclusions:     246 watchlist items excluded
```

---

## 🚀 Development Pipeline

### Immediate Priorities (This Week)

1. **Fix Critical Errors**
   - [ ] Add graceful handling for missing `content_dna` table
   - [ ] Add graceful handling for missing `interest_graph_edges` table
   - [ ] Fix rewatch suggestions FK query

2. **Fix Functional Issues**
   - [ ] Fix genre affinity tracking (extract IDs from genre objects)
   - [ ] Fix genre filtering on Watchlist screen
   - [ ] Wire up button navigation handlers
   - [ ] Fix unknown titles display

3. **Performance Optimization**
   - [ ] Reduce Home/Tips load time from 15-20s to <5s
   - [ ] Implement skeleton loading states
   - [ ] Add more aggressive caching

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
| UI Redesign Implementation | Week 1-2 | ✅ Complete (with bugs) |
| Critical Bug Fixes | Week 2 | 🔧 In Progress |
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

**Issues Discovered:**
- `content_dna` and `interest_graph_edges` tables not created in Supabase
- Rewatch feature blocked by FK relationship error
- Genre filtering not working on Watchlist
- Genre tracking passing `undefined` instead of IDs
- Several navigation buttons not wired up
- 15-20 second load times on Home and Tips screens
- Some watchlist items showing as "Unknown Title"

**Technical Notes:**
- EAS Build: `85f5a245-23db-4288-bd30-39135d8861a3`
- Build includes: react-native-svg, expo-linear-gradient, lucide-react-native
- Metro bundler successfully bundles 4458 modules

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

*Last updated: December 2, 2025 - Session 5*