# StreamSense 🎬💸

**Rocket Money for streaming, with Netflix-level recommendations.**

StreamSense helps users optimize their streaming spending while discovering personalized content. The app bridges the gap between subscription management tools (which treat streaming like any other bill) and content discovery platforms (which ignore costs entirely).

---

## 🧠 Recommendation Intelligence Architecture

StreamSense implements a **6-layer recommendation intelligence system** inspired by Netflix, Spotify, and Amazon's approaches. This is not a single algorithm but an ensemble of specialized systems, each capturing different aspects of user taste.

### Layer Overview

| Layer | Purpose | Status |
|-------|---------|--------|
| **Content DNA** | Deep content attributes beyond genres (tone, themes, pacing, aesthetics) | 🔧 Implementing |
| **User Taste Profile** | Aggregated preferences learned from viewing behavior | 🔧 Implementing |
| **Multi-Lane Recommendations** | Parallel recommendation strategies (10+ distinct lanes) | 🔧 Implementing |
| **Interest Graph** | Maps connections between interests for bridge recommendations | 🔧 Implementing |
| **LLM Personalization** | Claude Haiku integration for natural language recommendations | ⏳ Planned |
| **Contextual Intelligence** | Time-of-day, mood, and session-aware adjustments | ⏳ Planned |

### Content DNA System

Goes beyond crude genre classifications to capture 40+ content dimensions:

```
TONE: dark, humorous, tense, emotional, cerebral, escapist
THEMES: redemption, revenge, family, identity, survival, technology, betrayal...
PACING: slow, medium, fast, episodic, serialized
AESTHETICS: visually stunning, gritty, stylized
NARRATIVE: nonlinear, twist ending, unreliable narrator
TALENT: directors, writers, composers, lead actors
```

### Recommendation Lanes

Each lane represents a distinct recommendation strategy:

| Lane | Strategy | Example |
|------|----------|---------|
| Because You Watched | DNA-based similarity to recent content | "Because You Watched Inception" |
| Interest Clusters | Content matching identified taste clusters | "Mind-Bending Sci-Fi" |
| Talent Spotlight | Works by favorite directors/actors | "More from Christopher Nolan" |
| Theme Deep Dive | Content strong in preferred themes | "Stories of Identity" |
| Hidden Gems | Under-discovered high-quality matches | "Hidden Gems For You" |
| Trending For You | Popular content filtered to taste | "Trending That Matches Your Taste" |
| Exploration | Deliberate variety introduction | "Expand Your Horizons" |
| Classic Essentials | Timeless films matching profile | "Classics You Have Not Seen" |
| New Releases | Recent content matching preferences | "New Releases For You" |
| Adjacent Interests | Bridge to unexplored territories | "You Might Also Like" |

### User Taste Profile

Comprehensive taste understanding including:

- Aggregated tone/theme/pacing preferences from watched content
- Favorite directors, actors, decades, origin countries
- Exploration appetite score (comfort zone vs adventurous)
- Violence tolerance and complexity preference
- Interest clusters with seed content
- Computed taste signature (e.g., "Dark Thriller Enthusiast • Mind-Bending Sci-Fi Fan")
- Discovery opportunities (adjacent genres not yet explored)

### Interest Graph

Maps relationships between user interests for intelligent discovery:

- Genre-to-genre connections (Sci-Fi ↔ Fantasy, Crime ↔ Thriller)
- Theme-to-theme relationships (Technology ↔ Identity, Power ↔ Betrayal)
- Genre-to-theme bridges (Sci-Fi → Technology themes)
- Enables "bridge" recommendations connecting disparate interests

---

## 📊 Project Status

### Overall Completion: **85%**

| Category | Status | Completion | Notes |
|----------|--------|------------|-------|
| Core Infrastructure | ✅ Complete | 100% | Expo SDK 54, Custom Navigation |
| Authentication | ✅ Complete | 100% | Supabase Auth (Email/Password) |
| Subscription Management | ✅ Complete | 98% | 0-hour logging, value scores |
| Watchlist System | ✅ Complete | 95% | Decoupled architecture |
| Genre Affinity Learning | ✅ Complete | 100% | Real-time preference tracking |
| Basic Recommendations | ✅ Complete | 90% | Genre-based, blindspots active |
| **Content DNA System** | 🔧 Implementing | 40% | Schema ready, services building |
| **User Taste Profiles** | 🔧 Implementing | 30% | Schema ready, aggregation pending |
| **Multi-Lane System** | 🔧 Implementing | 25% | Architecture defined |
| **Interest Graph** | 🔧 Implementing | 20% | Global edges defined |
| SVD Matrix Factorization | ⚠️ Blocked | 80% | FK error needs refactor |
| Value Score Analytics | ✅ Complete | 100% | Human-readable labels |
| Discover (Swipe) Page | 🔧 In Progress | 75% | UI improvements pending |
| Tips & Insights | ✅ Complete | 90% | Churn predictions active |
| Worth Discovering | ✅ Complete | 90% | Variety improvements pending |
| LLM Integration | ⏳ Planned | 0% | Claude Haiku integration |
| Contextual Intelligence | ⏳ Planned | 0% | Temporal patterns |

---

## ✅ What Works

### Authentication & User Management
- Email/password authentication via Supabase
- Secure session management with Row Level Security
- User profile persistence

### Subscription Tracking
- Manual subscription entry with service name, price, billing cycle
- 0-hour logging support for unused services
- Total monthly cost calculation
- Human-readable value scores ("Low Usage", "Good Value")
- Service recommendations based on genre preferences

### Watchlist Management
- Decoupled architecture (Fetch IDs → Hydrate via API)
- Add content with status: Want to Watch, Watching, Watched
- 5-star rating system
- Filter by media type (All, Movies, TV Shows)
- Filter by genre with smart fetching for empty filters
- Content persists across sessions
- 246+ items tracked in testing

### Genre Affinity Learning
- Tracks user interactions: add, rate, watch, skip
- Temporal decay (recent preferences weighted 1.5x)
- 22 genre affinities tracked
- Influences all recommendation algorithms
- Real-time updates on every interaction

### Smart Recommendations ("For You")
- Personalized picks based on genre affinity
- Deep cuts from favorite genre combinations
- Discovery mode for users exploring widely
- Session-based exclusion to prevent repeats
- Watchlist exclusion (never recommend what user has)
- Negative filtering for previously skipped content
- Fatigue scoring to prevent over-recommendation

### Worth Discovering (Blindspots)
- Unexplored genres (highly-rated in untried genres)
- Hidden gems (high rating, low vote count)
- Adjacent interests (fans of X also love Y)
- Service exclusives (content on user subscriptions)
- Classic gaps (acclaimed films user has not seen)
- Deduplication across categories

### Tips & Insights Page
- Monthly spending overview
- Value score per service (Excellent/Good/Poor/Unknown)
- Service recommendations (what to add/keep/consider)
- Churn predictions (usage-based suggestions)
- Achievement system (7+ achievements)
- Worth Discovering carousel with preloading

### Technical Infrastructure
- Expo SDK 54 with React Native
- TypeScript throughout
- Supabase backend with Row Level Security
- TMDb API integration for content metadata
- Custom state-based tab navigation (Android compatible)
- Dark mode implementation
- Comprehensive logging system

---

## 🔧 Known Issues

### High Priority

| Issue | Impact | Status |
|-------|--------|--------|
| SVD FK Relationship Error | Blocks matrix factorization | Refactor needed |
| React.Fragment Warnings | Console spam (12-20 per load) | Source unknown |
| Discover Page Layout | UI needs polish | Prompts ready |
| Genre Filter (Anime vs Animation) | Incorrect classification | Fix designed |

### Medium Priority

| Issue | Impact | Status |
|-------|--------|--------|
| Rewatch Feature | Missing updated_at column | Migration needed |
| Half-Star Ratings | No 3.5 star support | Planned |
| Worth Discovering Variety | Same content appearing | Randomization needed |

### Recently Resolved

| Issue | Resolution |
|-------|------------|
| App Crash on Load | Decoupled DB joins |
| Empty Watchlist | API hydration instead of SQL join |
| Discover Buttons Overlap | ContentContainerStyle padding |
| Value Score Confusion | Human-readable labels |
| 0-Hour Logging | Fixed validation logic |

---

## 🚀 Development Pipeline

### Phase 1: Recommendation Intelligence Foundation (Current)

1. **Content DNA Service**
   - [x] Database schema for content_dna table
   - [ ] DNA computation from TMDb metadata
   - [ ] Caching layer for computed DNA
   - [ ] Background computation queue

2. **User Taste Profile**
   - [x] Database schema for taste profiles
   - [ ] Profile aggregation from watched content
   - [ ] Incremental updates on interactions
   - [ ] Taste signature generation

3. **Interest Clustering**
   - [x] Database schema for clusters
   - [ ] Cluster detection algorithm
   - [ ] Seed content identification

### Phase 2: Multi-Lane System (Week 2-3)

1. **Recommendation Lanes Service**
   - [ ] Lane generation orchestrator
   - [ ] Parallel strategy execution
   - [ ] Priority-based ordering

2. **Individual Lanes**
   - [ ] "Because You Watched" (DNA similarity)
   - [ ] Hidden Gems (under-discovered matches)
   - [ ] Interest Cluster lanes
   - [ ] Talent Spotlight lanes
   - [ ] Exploration lanes

3. **UI Components**
   - [ ] RecommendationLane component
   - [ ] LaneCard component
   - [ ] LanesContainer with progressive loading

### Phase 3: Intelligence Layer (Week 3-4)

1. **Interest Graph**
   - [x] Global edge definitions
   - [ ] User-specific edge learning
   - [ ] Bridge recommendation algorithm

2. **Exploration Engine**
   - [ ] Adjacent interest detection
   - [ ] Controlled variety introduction
   - [ ] Filter bubble prevention

### Phase 4: LLM Integration (Week 4-5)

1. **Claude Haiku Service**
   - [ ] Supabase Edge Function for API calls
   - [ ] Response parsing and validation
   - [ ] TMDb lookup for recommendations

2. **Natural Language Features**
   - [ ] "I want something like X but more Y"
   - [ ] Mood-based requests
   - [ ] Explanation generation

### Phase 5: Contextual Intelligence (Week 5-6)

1. **Temporal Patterns**
   - [ ] Track viewing times
   - [ ] Learn time-slot preferences
   - [ ] Weekend vs weekday patterns

2. **Context-Aware Ranking**
   - [ ] Time-of-day adjustments
   - [ ] Available time consideration
   - [ ] Session continuity

---

## 🗄️ Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `watchlist_items` | User's saved content with status/ratings |
| `subscriptions` | User's streaming service subscriptions |
| `genre_affinity` | Learned genre preferences per user |
| `implicit_signals` | Behavioral tracking (impressions, skips) |

### Recommendation Intelligence Tables

| Table | Purpose |
|-------|---------|
| `content_dna` | Cached DNA computation for content |
| `user_taste_profiles` | Aggregated user preferences |
| `user_interest_clusters` | Identified taste clusters per user |
| `interest_graph_edges` | Connections between interests |
| `recommendation_lanes_cache` | Cached lane results |
| `viewing_patterns` | Temporal viewing preferences |
| `llm_recommendations_cache` | Cached LLM responses |
| `svd_recommendations` | Matrix factorization results |

---

## 📈 Metrics from Testing

```
User Interactions:     269 watchlist items
Genre Affinities:      22 genres tracked
Top Genres:            Drama (458), Adventure (434), Action (343)
Behavior Mode:         Discovery (exploring widely)
Session Average:       12.8 items per session
Exploration Score:     0.81 (adventurous)
Achievements:          7+ unlocked
Subscriptions:         2 active (Hulu, Prime Video)
Monthly Spend:         $22.98
Blindspots Generated:  9 unique recommendations
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native + Expo SDK 54 |
| Language | TypeScript |
| Backend | Supabase (Auth, Database, Edge Functions) |
| Content API | TMDb (The Movie Database) |
| Banking | Plaid (subscription detection) |
| AI/ML | Claude Haiku (planned), SVD Matrix Factorization |
| Navigation | Custom state-based tabs |
| Styling | StyleSheet + Dark mode |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── recommendations/     # Lane UI components (NEW)
│   ├── ContentCard.tsx
│   ├── GenreChips.tsx
│   └── ...
├── contexts/
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
├── hooks/
│   ├── useRecommendationCache.ts
│   ├── useTasteProfile.ts    # (NEW)
│   └── ...
├── screens/
│   ├── DashboardScreen.tsx
│   ├── DiscoverScreen.tsx
│   ├── WatchlistScreen.tsx
│   ├── TipsScreen.tsx
│   ├── SettingsScreen.tsx
│   └── DebugRecommendationsScreen.tsx  # (NEW)
├── services/
│   ├── recommendationOrchestrator.ts   # (NEW) Coordinates all services
│   ├── contentDNA.ts                   # (NEW) DNA computation
│   ├── userTasteProfile.ts             # (NEW) Profile building
│   ├── recommendationLanes.ts          # (NEW) Multi-lane generation
│   ├── interestGraph.ts                # (NEW) Interest connections
│   ├── contextualRecommendations.ts    # (NEW) Time/mood awareness
│   ├── llmRecommendations.ts           # (NEW) Claude integration
│   ├── smartRecommendations.ts         # Core recommendation engine
│   ├── blindspotRecommendations.ts     # Hidden gems & exploration
│   ├── matrixFactorization.ts          # SVD collaborative filtering
│   ├── genreAffinity.ts                # Genre preference learning
│   ├── valueScore.ts                   # Subscription value analysis
│   └── ...
├── data/
│   └── globalInterestEdges.ts          # (NEW) Pre-defined relationships
├── types/
│   └── index.ts
└── utils/
    └── ...

supabase/
├── migrations/
│   ├── 20251202000000_create_svd_recommendations.sql
│   └── 20251202010000_recommendation_intelligence.sql  # (NEW)
└── functions/
    ├── compute-svd-recommendations/
    └── llm-recommendations/             # (NEW)
```

---

## 🎯 Target Market

- **Primary:** Streaming subscribers with 3+ services
- **Pain Point:** Subscription fatigue, paying for unused services
- **Behavior:** Want recommendations but also want to save money
- **Market Size:** $97B streaming market, households average 5-7 services, spending $61-70 monthly

---

## 💰 Business Model

### Freemium Tier (Free)
- Basic subscription tracking
- Manual content logging
- Simple genre-based recommendations

### Premium Tier ($2.99-4.99/month)
- Netflix-level personalized recommendations
- Content DNA matching
- Multi-lane recommendation system
- LLM-powered natural language requests
- Value analytics and rotation suggestions
- Churn predictions
- Interest graph exploration

### Cost Structure (1,000 users)
| Component | Monthly Cost |
|-----------|--------------|
| Supabase | ~$25 |
| TMDb API | Free |
| Claude Haiku (1 call/user/day) | ~$4-8 |
| Total | ~$30-35 |

**Projected Cash Positive:** Month 7 with ~$2,500 working capital bridge

---

## 📅 Timeline to Launch

| Milestone | Target | Status |
|-----------|--------|--------|
| Recommendation Intelligence Schema | Week 1 | 🔧 In Progress |
| Content DNA + Taste Profiles | Week 2 | ⏳ Pending |
| Multi-Lane UI | Week 3 | ⏳ Pending |
| Interest Graph + Bridge Recs | Week 4 | ⏳ Pending |
| LLM Integration | Week 5 | ⏳ Pending |
| Contextual Intelligence | Week 6 | ⏳ Pending |
| Polish & Testing | Week 7 | ⏳ Pending |
| Waitlist Launch | Week 8 | ⏳ Pending |
| Alpha Release | Week 9-10 | ⏳ Pending |
| Public Beta | Week 12 | ⏳ Pending |

---

## 📝 Recent Updates

### Session 3 (Current) - Recommendation Intelligence Architecture
- Designed 6-layer recommendation intelligence system
- Created Content DNA schema with 40+ content dimensions
- Defined User Taste Profile structure with exploration scoring
- Architected Multi-Lane recommendation system (10+ lane types)
- Built Interest Graph with global edge definitions
- Planned LLM integration with Claude Haiku
- Designed Contextual Intelligence for time/mood awareness
- Created database migrations for all new tables
- Defined implementation roadmap (6-week plan)

### Session 2 - Stability & Core Fixes
- Dropped Foreign Key constraints for composite IDs
- Decoupled `getWatchlist` from database joins
- Updated value score to human-readable labels
- Fixed overlapping buttons on Discover screen
- Fixed 0-hour logging for subscriptions
- Implemented SVD matrix factorization (blocked by FK error)

### Session 1 - Foundation
- Implemented Blindspot algorithm (5 discovery types)
- Fixed type/media_type inconsistencies
- Added genre affinity tracking on all interactions
- Core app structure and authentication complete

---

## 🔗 Related Documents

- `journal.txt` - Development transcript catalog
- `docs/SVD_RECOMMENDATIONS.md` - Matrix factorization documentation
- `docs/CONTENT_DNA.md` - Content DNA system documentation (pending)

---

## 🏆 Competitive Differentiation

StreamSense occupies a unique position in the market:

| Feature | Rocket Money | JustWatch | Netflix | StreamSense |
|---------|--------------|-----------|---------|-------------|
| Subscription Tracking | ✅ | ❌ | ❌ | ✅ |
| Value Analytics | ✅ | ❌ | ❌ | ✅ |
| Content Discovery | ❌ | ✅ | ✅ | ✅ |
| Cross-Service Search | ❌ | ✅ | ❌ | ✅ |
| Personalized Recs | ❌ | ❌ | ✅ | ✅ |
| Content DNA Matching | ❌ | ❌ | ✅ | ✅ |
| Cost Optimization | ✅ | ❌ | ❌ | ✅ |
| Churn Predictions | ❌ | ❌ | ❌ | ✅ |

**No competitor effectively bridges financial tracking with entertainment intelligence.**

---

*Last updated: December 2, 2025*