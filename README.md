# StreamSense 🎬💸

**Rocket Money for streaming, with Netflix-level recommendations.**

StreamSense helps users optimize their streaming spending while discovering personalized content. The app bridges the gap between subscription management tools (which treat streaming like any other bill) and content discovery platforms (which ignore costs entirely).

---

## 📊 Project Status

### Overall Completion: **82%**

| Category | Status | Completion | Notes |
|----------|--------|------------|-------|
| Core Infrastructure | ✅ Complete | 100% | Expo SDK 54, Custom Navigation |
| Authentication | ✅ Complete | 100% | Supabase Auth (Email/Pass) |
| Subscription Management | ✅ Complete | 98% | **Fixed:** 0-hour logging now works |
| Watchlist System | ✅ Complete | 95% | **Fixed:** Decoupled from DB joins |
| Genre Affinity Learning | ✅ Complete | 100% | Real-time preference tracking |
| Smart Recommendations | 🔧 Refining | 85% | Blindspots & Content DNA active |
| Value Score Analytics | ✅ Complete | 100% | **New:** Human-readable logic active |
| Discover (Swipe) Page | 🔧 In Progress | 75% | Layout fixed, tuning performance |
| Tips & Insights | 🔧 Refining | 85% | Churn predictions active |
| Worth Discovering (Blindspots) | ✅ Complete | 90% | Deduplication logic improved |
| Rewatch Suggestions | ⏳ Pending | 40% | Schema updates required |
| UI Polish | 🔧 In Progress | 65% | Dark mode & spacing updates |
| Bug Fixes | 🔧 In Progress | 80% | Critical crashers resolved |

---

## ✅ What Works

### Authentication & User Management
- Email/password authentication via Supabase
- Secure session management
- User profile persistence

### Subscription Tracking
- Manual subscription entry with service name, price, billing cycle
- **NEW:** 0-hour logging support for unused services
- Total monthly cost calculation
- **NEW:** Human-Readable Value Score ("Low Usage", "Good Value" vs raw $)
- Service recommendations based on genre preferences

### Watchlist Management
- **NEW:** Decoupled architecture (Fetch IDs -> Hydrate via API) for stability
- Add content with status: Want to Watch, Watching, Watched
- 5-star rating system
- Filter by media type (All, Movies, TV Shows)
- Filter by genre
- Content persists across sessions

### Genre Affinity Learning
- Tracks user interactions: add, rate, watch, skip
- Temporal decay (recent preferences weighted higher)
- 22 genre affinities tracked
- Influences all recommendation algorithms

### Smart Recommendations ("For You")
- Personalized picks based on genre affinity
- Deep cuts from favorite genre combinations
- "Because You Liked" categories
- Discovery mode for users exploring widely
- Content DNA matching (pace, tone, complexity, era)
- Session-based exclusion to prevent repeats
- Watchlist exclusion (never recommend what you have)

### Worth Discovering (Blindspots)
- Unexplored genres (highly-rated content in genres you have not tried)
- Hidden gems (high rating, low vote count)
- Adjacent interests (fans of X also love Y)
- Service exclusives (content on your subscriptions)
- Deduplication across categories (Fix applied for duplicates)

### Tips & Insights Page
- Monthly spending overview
- Value score per service (Excellent/Good/Poor/Unknown)
- Service recommendations (what to add/keep/consider)
- Churn predictions (usage-based keep/cancel suggestions)
- Achievement system (7 achievements unlocked in testing)
- Worth Discovering carousel

### Technical Infrastructure
- Expo SDK 54 with React Native
- TypeScript throughout
- Supabase backend with Row Level Security
- TMDb API integration for content metadata
- Custom state-based tab navigation (Android compatible)
- Dark mode implementation

---

## 🔧 Known Issues (In Progress)

### High Priority
| Bug | Impact | Status |
|-----|--------|--------|
| Rewatch feature blocked | Column `updated_at` missing | Needs DB migration |
| Swipe Latency | 2-5s delay between swipes | **Next Sprint:** Batch fetching |
| Ratings | No half-star support (3.5 stars) | Planned Feature |
| Fragment/key React errors | Console spam | Fix instructions pending |

### Recently Resolved (Verified)
| Bug | Resolution |
|-----|------------|
| **App Crash on Load** | Fixed by removing `useFocusEffect` and decoupling DB joins |
| **Empty Watchlist** | Fixed by hydrating data via API instead of SQL join |
| **Discover Buttons Overlap** | Fixed by adding `contentContainerStyle` padding |
| **Value Score Confusion** | Fixed by replacing "$60/hr" with "Low Usage" label |
| **Discover Swipe UUID Error** | Fixed by dropping DB Foreign Key constraint |

---

## 🚀 Development Pipeline

### Phase 1: Performance & Polish (Next Sprint)
**Priority: High**

1.  **Discover Speed**
    - [ ] Implement batch-fetching (fetch 5 items at once)
    - [ ] Add image pre-fetching for next 3 cards
    - [ ] Reduce re-renders on swipe

2.  **Rating System Upgrade**
    - [ ] Implement 0.5 increment support
    - [ ] Update database schema for decimal ratings
    - [ ] Update UI star component

3.  **Code Hygiene**
    - [ ] Apply `key={}` fixes to all `React.Fragment` loops
    - [ ] Remove unused imports/legacy navigation code

### Phase 2: Feature Completion (Week 3)
**Priority: Medium**

1.  **Rewatch Suggestions**
    - [ ] Complete database schema updates (`updated_at` column)
    - [ ] Logic: Show 4-5 star content not watched in >6 months
    - [ ] Add to Tips page as new section

2.  **Service Insights**
    - [ ] Calculate "favorites on this service" count
    - [ ] Show badge on subscription cards ("Best for Drama")

3.  **Onboarding**
    - [ ] First-run tutorial
    - [ ] Subscription setup wizard
    - [ ] Genre preference quick-pick

---

## 📈 Metrics from Testing

User Interactions: 238 watchlist items Genre Affinities: 22 genres tracked Top Genres: Drama (413), Adventure (400), Action (318) Behavior Mode: Discovery (exploring widely) Session Average: 12.1 items per session Achievements: 7 unlocked Subscriptions: 3 active (Hulu, Disney+, Prime Video) Monthly Spend: $28.97


---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native + Expo SDK 54 |
| Language | TypeScript |
| Backend | Supabase (Auth, Database, Storage) |
| Content API | TMDb (The Movie Database) |
| Banking | Plaid (subscription detection) |
| Navigation | Custom state-based tabs |
| Styling | StyleSheet + Dark mode |

---

## 📁 Project Structure

src/ ├── components/ # Reusable UI components ├── contexts/ # React contexts (Auth, Theme) ├── hooks/ # Custom hooks ├── screens/ # Screen components │ ├── DashboardScreen │ ├── DiscoverScreen │ ├── WatchlistScreen │ ├── TipsScreen │ └── SettingsScreen ├── services/ # API and business logic │ ├── smartRecommendations.ts │ ├── blindspotRecommendations.ts │ ├── watchlistDataService.ts # [NEW] Decoupled Data Fetcher │ ├── genreAffinity.ts │ ├── valueScore.ts │ └── collaborativeFiltering.ts ├── types/ # TypeScript interfaces └── utils/ # Helper functions


---

## 🎯 Target Market

- **Primary:** Streaming subscribers with 3+ services
- **Pain Point:** Subscription fatigue, paying for unused services
- **Behavior:** Want recommendations but also want to save money
- **Market Size:** $97B streaming market, households average 5-7 services

---

## 💰 Business Model

- **Freemium:** Basic subscription tracking free
- **Premium:** $2.99-4.99/month for advanced features
  - Smart recommendations
  - Value analytics
  - Rotation suggestions
  - Churn predictions
- **Strategy:** One-month free trial to demonstrate value

---

## 📅 Timeline to Launch

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Bug fixes complete | Week 1 | 🔧 In Progress |
| UX improvements | Week 2 | ⏳ Pending |
| Feature completion | Week 3 | ⏳ Pending |
| Polish & testing | Week 4 | ⏳ Pending |
| Waitlist launch | Week 5 | ⏳ Pending |
| Alpha release | Week 6-7 | ⏳ Pending |
| Public beta | Week 8-10 | ⏳ Pending |

---

## 📝 Recent Updates

**Session 2 (Current Fixes)**
- **Database Architecture:** Dropped Foreign Key constraints to allow composite IDs (e.g., `movie-12345`).
- **Crash Resolution:** Decoupled `getWatchlist` from database joins, fixing "Missing Relationship" crashes.
- **Value Score:** Updated logic to use "Low Usage" and "Great Value" labels instead of confusing raw cost-per-hour math.
- **UI Polish:** Fixed overlapping buttons on Discover screen by implementing proper `contentContainerStyle` padding.
- **Data Integrity:** Fixed 0-hour logging for subscriptions.

**Session 1**
- Implemented Blindspot algorithm (5 discovery types)
- Fixed type/media_type inconsistencies
- Added genre affinity tracking on all interactions
- Core app structure and Authentication complete

---

## 🔗 Related Documents

- `journal.txt` - Development transcript catalog

---

*Last updated: December 1, 2025*