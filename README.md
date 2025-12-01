# StreamSense

**Rocket Money for streaming, with Netflix-level recommendations.**

StreamSense helps users optimize their streaming spending while discovering personalized content. The app bridges the gap between subscription management tools (which treat streaming like any other bill) and content discovery platforms (which ignore costs entirely).

---

## 📊 Project Status

### Overall Completion: **78%**

| Category | Status | Completion |
|----------|--------|------------|
| Core Infrastructure | ✅ Complete | 100% |
| Authentication | ✅ Complete | 100% |
| Subscription Management | ✅ Complete | 95% |
| Watchlist System | ✅ Complete | 95% |
| Genre Affinity Learning | ✅ Complete | 100% |
| Smart Recommendations | 🔧 Refining | 85% |
| Value Score Analytics | ✅ Complete | 90% |
| Discover (Swipe) Page | 🔧 In Progress | 70% |
| Tips & Insights | 🔧 Refining | 80% |
| Worth Discovering (Blindspots) | ✅ Complete | 90% |
| Rewatch Suggestions | 🚧 Blocked | 40% |
| UI Polish | 🔧 In Progress | 60% |
| Bug Fixes | 🔧 In Progress | 70% |

---

## ✅ What Works

### Authentication & User Management
- Email/password authentication via Supabase
- Secure session management
- User profile persistence

### Subscription Tracking
- Manual subscription entry with service name, price, billing cycle
- Watch time logging per service
- Total monthly cost calculation
- Value score calculation (cost per hour watched)
- Service recommendations based on genre preferences

### Watchlist Management
- Add content with status: Want to Watch, Watching, Watched
- 5-star rating system
- Filter by media type (All, Movies, TV Shows)
- Filter by genre
- Content persists across sessions
- 190+ items tracked in testing

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
- Deduplication across categories

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

### Critical Bugs
| Bug | Impact | Status |
|-----|--------|--------|
| Cannot log 0 watch hours | Database constraint blocks valid input | Fix ready, needs DB migration |
| Discover swipe fails | UUID undefined error | Fix ready, needs implementation |
| TV "Adventure" filter returns empty | Wrong genre ID for TV API | Fix ready, needs implementation |
| Fragment/key React errors | Console spam, potential performance | Needs file search to locate |

### UX Issues
| Issue | Impact | Status |
|-------|--------|--------|
| Watchlist filtering slow | API call on each filter change | Fix designed (client-side filtering) |
| Discover buttons overflow | Do not fit on smaller screens | Fix designed (icon buttons) |
| No swipe gestures in Discover | Missing expected Tinder-like UX | Implementation ready |
| Worth Discovering no "Load More" | Cannot get fresh recommendations | Implementation ready |
| Carousel items persist after add | Content remains visible after watchlist add | Fix designed |

### Data Issues
| Issue | Impact | Status |
|-------|--------|--------|
| Rewatch feature blocked | Column `updated_at` missing | Needs DB migration |
| Service insights empty | Feature not fully implemented | In progress |

---

## 🚀 Development Pipeline

### Phase 1: Bug Fixes (Next Sprint)
**Priority: Critical**

1. **Database Migrations**
   - [ ] Allow 0 hours in `watch_logs` constraint
   - [ ] Add `updated_at` column to `watchlist_items`
   - [ ] Verify column names match code (`content_id` vs `tmdb_id`)

2. **Code Fixes**
   - [ ] Fix Discover swipe UUID error (pass user.id from useAuth)
   - [ ] Fix TV genre ID mapping (use 10759 for Action & Adventure)
   - [ ] Find and fix all Fragment `index=` to `key=` errors
   - [ ] Fix Rewatch query to use `created_at`

### Phase 2: UX Improvements (Following Sprint)
**Priority: High**

1. **Discover Page Overhaul**
   - [ ] Implement Tinder-like swipe gestures (left/right/up)
   - [ ] Add swipe overlays ("Want to Watch", "Not Interested", "Already Watched")
   - [ ] Replace text buttons with icon buttons
   - [ ] Add "Already Watched" flow with rating modal

2. **Performance Optimization**
   - [ ] Pre-fetch movies and TV on Watchlist load
   - [ ] Client-side filtering (no API calls on filter change)
   - [ ] Cache recommendations by genre

3. **Carousel Improvements**
   - [ ] Animate item removal after watchlist add
   - [ ] Add "Load More" card at end of Worth Discovering
   - [ ] Prevent full refresh on single item add

### Phase 3: Feature Completion (Week 3)
**Priority: Medium**

1. **Rewatch Suggestions**
   - [ ] Complete database schema updates
   - [ ] Show 4-5 star rated content available on user services
   - [ ] Display "time since watched" context
   - [ ] Add to Tips page as new section

2. **Service Insights**
   - [ ] Calculate "favorites on this service" count
   - [ ] Show badge on subscription cards
   - [ ] Factor into churn recommendations

3. **Have Watched Flow**
   - [ ] Third action in Discover (swipe up or button)
   - [ ] Rating modal after selection
   - [ ] Track as "watched" status with rating
   - [ ] Update genre affinity based on rating

### Phase 4: Polish & Launch Prep (Week 4)
**Priority: Medium**

1. **UI Refinement**
   - [ ] Loading states and skeletons
   - [ ] Empty state designs
   - [ ] Error state handling with retry
   - [ ] Haptic feedback on actions

2. **Onboarding**
   - [ ] First-run tutorial
   - [ ] Subscription setup wizard
   - [ ] Genre preference quick-pick

3. **Analytics & Monitoring**
   - [ ] Event tracking setup
   - [ ] Error monitoring (Sentry or similar)
   - [ ] Performance monitoring

---

## 📈 Metrics from Testing

```
User Interactions:     190+ watchlist items
Genre Affinities:      22 genres tracked
Top Genres:            Drama (395), Adventure (372), Action (287)
Behavior Mode:         Discovery (exploring widely)
Session Average:       13.1 items per session
Achievements:          7 unlocked
Subscriptions:         3 active (Hulu, Disney+, Prime Video)
Monthly Spend:         $28.97
```

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

```
src/
├── components/          # Reusable UI components
├── contexts/            # React contexts (Auth, Theme)
├── hooks/               # Custom hooks
├── screens/             # Screen components
│   ├── DashboardScreen
│   ├── DiscoverScreen
│   ├── WatchlistScreen
│   ├── TipsScreen
│   └── SettingsScreen
├── services/            # API and business logic
│   ├── smartRecommendations.ts
│   ├── blindspotRecommendations.ts
│   ├── genreAffinity.ts
│   ├── valueScore.ts
│   ├── contentDNA.ts
│   └── collaborativeFiltering.ts
├── types/               # TypeScript interfaces
└── utils/               # Helper functions
```

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

**Session 4 (Current)**
- Value Score now calculating correctly
- Blindspot deduplication working
- Identified 5 critical bugs with fixes ready
- Designed Tinder-like swipe gestures
- Planned "Load More" for Worth Discovering

**Session 3**
- Fixed aggressive recommendation filtering
- Implemented temporal decay for genre affinity
- Added user behavior detection (discovery vs. focused mode)
- Created comprehensive bug fix documentation

**Session 2**
- Implemented Blindspot algorithm (5 discovery types)
- Fixed type/media_type inconsistencies
- Added genre affinity tracking on all interactions

**Session 1**
- Core app structure complete
- Authentication working
- Basic subscription and watchlist management

---

## 🔗 Related Documents

- `journal.txt` - Development transcript catalog

---

*Last updated: December 1, 2025*