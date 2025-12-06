# StreamSense 🎬💸

**Rocket Money for streaming, with Netflix-level recommendations.**

StreamSense helps users optimize their streaming spending while discovering personalized content. The app bridges the gap between subscription management tools (which treat streaming like any other bill) and content discovery platforms (which ignore costs entirely).

---

## 📊 Project Status

### Overall Completion: **75%**

> ⚠️ **Critical Note:** Plaid bank integration has NOT been tested in production. We are running in Expo development mode, which cannot fully test native Plaid SDK functionality. A production build is required for real-world validation of the core value proposition.
>
> 🔴 **Personalization Gap:** Current taste profiling uses only 12 static signatures. Netflix uses 76,897 micro-genres. We have designed a multi-dimensional system (10 dimensions, 50,000+ combinations) but it is not yet implemented.

| Category | Status | Completion | Notes |
|----------|--------|------------|-------|
| **Core Infrastructure** | ✅ Complete | 100% | Expo SDK 54, EAS Build configured |
| **Authentication** | ✅ Complete | 100% | Supabase Auth working |
| **Manual Subscription Entry** | ✅ Complete | 100% | Add/edit/delete services manually |
| **Plaid Integration** | ⚠️ **UNTESTED** | 40% | Credentials configured, SDK integrated, **needs production build** |
| **Automatic Bill Detection** | ⚠️ **UNTESTED** | 0% | Depends on Plaid working in production |
| **Watchlist System** | ✅ Complete | 100% | 423 items tracked |
| **Content Discovery** | ✅ Complete | 100% | TMDb API integration |
| **Genre Affinity Learning** | ✅ Complete | 100% | Real-time tracking |
| **Provider Filtering** | ✅ Complete | 100% | Filters by subscribed services |
| **Content DNA System** | ✅ Populated | 100% | 406 rows with full schema |
| **Taste Profile System** | 🔴 Needs Rebuild | 20% | 12 static signatures inadequate; multi-dimensional system designed but not built |
| **Recommendation Quality** | ⚠️ Needs Work | 60% | Exclusions too aggressive |
| **For You Tab** | ✅ Complete | 95% | Working but quality issues |
| **Discover Screen** | ✅ Complete | 100% | Swipe gestures, ratings |
| **Home Dashboard** | ⚠️ Partial | 80% | Stats work, spending relies on manual entry |
| **Error Handling** | ✅ Complete | 100% | 404s handled gracefully |

---

## 🏦 Plaid Integration Status

### What Is Done
- ✅ Plaid developer account created
- ✅ API credentials obtained and configured
- ✅ Plaid Link SDK integrated into codebase
- ✅ Server-side token exchange endpoint ready
- ✅ Passed Plaid compliance questionnaire
- ✅ Database schema ready for transaction storage

### What Is NOT Tested
- ❌ Actual bank account connection flow
- ❌ Transaction fetching from real banks
- ❌ Subscription detection from bank data
- ❌ Recurring transaction categorization
- ❌ Real-world error handling (bank errors, auth failures)

### Why It Remains Untested
```
Expo Development Build Limitation:
├── Plaid Link requires native SDK
├── Expo Go cannot run native modules properly
├── Need EAS production build to test
└── Current state: UI exists but functionality unverified
```

### To Properly Test Plaid
1. Create EAS production build: `eas build --platform android --profile production`
2. Install on physical device
3. Connect real bank account (sandbox mode first)
4. Verify transaction fetching works
5. Test subscription detection algorithm
6. Handle edge cases (auth failures, missing data)

---

## 📱 Feature Status by Screen

### Home Screen
| Feature | Status | Notes |
|---------|--------|-------|
| Monthly spending display | ✅ Working | From manual subscription entry only |
| Annual projection | ✅ Working | Calculated from manual entry |
| Watch stats (hours, count) | ✅ Working | From watchlist data |
| Cost per hour | ⚠️ Partial | Only works with manual entry |
| Service list | ✅ Working | Manual add/edit/delete |
| **Auto-detected bills** | ❌ **Untested** | Requires Plaid in production |
| Picked For You | ✅ Working | DNA-based recommendations |

### Discover Screen
| Feature | Status | Notes |
|---------|--------|-------|
| Swipe gestures | ✅ Working | Left/right/up actions |
| Half-star ratings | ✅ Working | Fixed in Session 18 |
| Optimistic UI | ✅ Working | Instant feedback |
| Provider badges | ✅ Working | Shows streaming service |

### Watchlist / For You Screen
| Feature | Status | Notes |
|---------|--------|-------|
| Multi-lane browsing | ✅ Working | Genre-based lanes |
| Genre filters | ✅ Working | Fixed in Session 18 |
| Fade animations | ✅ Working | Smooth transitions |
| Load performance | ✅ Working | ~600ms (down from 30s) |
| Recommendation quality | ⚠️ Poor | Exclusions too aggressive |

### Tips Screen
| Feature | Status | Notes |
|---------|--------|-------|
| Blindspot recommendations | ✅ Working | Hidden gems, classics |
| Savings tips | ⚠️ Limited | Needs Plaid data for real insights |

---

## 🧠 Recommendation System

### Working Components
| Component | Status | Data |
|-----------|--------|------|
| Content DNA | ✅ 406 rows | TMDb metadata extraction |
| Taste Profile | 🔴 Inadequate | 12 static signatures vs 50,000+ needed |
| Genre Affinity | ✅ 22 genres | User interaction tracking |
| Interest Graph | ✅ 707 nodes, 356 edges | Content relationships |
| Provider Filtering | ✅ Working | Manual subscription list |

### Taste Signature System

#### Current State: Basic (12 Static Signatures)
The current implementation uses only 12 predefined signatures like "Quirky Comedies Fan" or "Thriller Buff." This is insufficient for Netflix-level personalization.

| Current System | Netflix |
|----------------|---------|
| 12 static signatures | 76,897 micro-genres |

#### Planned: Multi-Dimensional Taste Profiling (50,000+ Combinations)

We have designed a comprehensive system that generates personalized micro-signatures from 10 taste dimensions:

**THE 10 TASTE DIMENSIONS:**

| Dimension | Examples | Count |
|-----------|----------|-------|
| **1. Primary Genre** | Action, Drama, Horror, Anime, True Crime, Documentary | 24+ |
| **2. Tone Preference** | Dark/Gritty, Light/Fun, Cerebral, Emotional, Quirky, Satirical | 12 |
| **3. Pacing Style** | Slow-burn, Fast-paced, Episodic, Serialized | 6 |
| **4. Narrative Complexity** | Straightforward, Layered, Puzzle-box, Experimental | 5 |
| **5. Production Origin** | Hollywood, Korean, British, Scandinavian, Bollywood, French | 15+ |
| **6. Era Preference** | Golden Age, 80s Nostalgia, 90s Indies, Contemporary | 8 |
| **7. Thematic Interests** | Identity, Family, Power, Redemption, Mortality, Coming of Age | 25+ |
| **8. Viewing Context** | Solo Deep Dive, Couples Night, Family, Background/Comfort | 6 |
| **9. Content Tolerance** | Violence, Sexual Content, Language, Disturbing Imagery (0-5 each) | 5 |
| **10. Quality Axis** | Blockbuster, Critically Acclaimed, Cult, Hidden Gem, Guilty Pleasure | 5 |

**COMPOUND SIGNATURE EXAMPLES:**

| Basic (Current) | Multi-Dimensional (Planned) |
|-----------------|----------------------------|
| "Thriller Buff" | "Dark Scandinavian Crime Thrillers with Slow-burn Pacing and Social Commentary" |
| "Comedy Fan" | "Quirky American Indie Comedies, Character-driven with Coming-of-Age Themes" |
| "Drama Devotee" | "Emotional Korean Family Dramas with Layered Narratives and Redemption Arcs" |
| "Sci-Fi Explorer" | "Cerebral Hard Sci-Fi, Puzzle-box Complexity, Exploring Technology and Humanity" |
| "Horror Fan" | "Atmospheric Japanese Horror, Slow-burn with Psychological Focus" |

**CROSS-GENRE AFFINITY CLUSTERS:**

These patterns transcend single genres and identify viewing personalities:

| Cluster | Pattern |
|---------|---------|
| Prestige Seeker | Award-winners across Drama, Documentary, Foreign |
| Comfort Rewatcher | Familiar favorites, episodic sitcoms, cozy mysteries |
| Edge Pusher | Boundary-testing across Horror, Thriller, Art films |
| World Explorer | International content across all genres |
| Nostalgia Chaser | Reboots, revivals, period pieces, classic era |
| Binge Architect | Serialized epics with complex mythology |
| Cult Collector | Underground, weird, "so bad it is good" |
| True Story Seeker | Documentaries, biopics, "based on" narratives |
| Adrenaline Junkie | Action, Thriller, Horror for intensity |
| Mystery Solver | Whodunits, procedurals, puzzle narratives |

**PROPOSED PROFILE STRUCTURE:**
```
USER TASTE PROFILE
├── Primary Archetype (1-2)
│   └── "Cerebral Thriller Seeker"
│
├── Tone Preferences (ranked 0-1)
│   ├── Dark/Gritty: 0.85
│   ├── Intense: 0.72
│   └── Cerebral: 0.68
│
├── Genre Affinities (all genres, 0-1)
│   ├── Thriller: 0.91
│   ├── Crime: 0.84
│   └── Mystery: 0.76
│
├── Origin Preferences (ranked)
│   ├── Scandinavian: 0.82
│   ├── British: 0.71
│   └── Korean: 0.65
│
├── Thematic Interests (top 5-10)
│   ├── Justice & Revenge
│   ├── Moral Ambiguity
│   └── Power & Corruption
│
├── Cross-Genre Clusters
│   ├── Prestige Seeker: 0.78
│   └── World Explorer: 0.72
│
├── Anti-Preferences (avoid)
│   ├── Musical
│   └── Slapstick Comedy
│
└── Generated Micro-Signature
    └── "Dark Scandinavian Crime Thrillers with 
         Slow-burn Pacing and Moral Complexity"
```

**IMPLEMENTATION STATUS:** ❌ Not Yet Built

The current system uses only Dimension 1 (Primary Genre) to assign one of 12 static labels. The multi-dimensional system requires:
1. Extracting tone, pacing, themes from Content DNA (partially available)
2. Detecting production origin from TMDb metadata
3. Building thematic interest mapping
4. Implementing compound signature generation algorithm
5. Creating cross-genre cluster detection

**EXISTING DNA FOUNDATION:**

The Content DNA table already captures much of what we need:

| Dimension | DNA Columns Available | Status |
|-----------|----------------------|--------|
| Tone | `tone_dark`, `tone_humorous`, `tone_tense`, `tone_emotional`, `tone_cerebral`, `tone_escapist` | ✅ Ready |
| Pacing | `pacing_slow`, `pacing_medium`, `pacing_fast` | ✅ Ready |
| Themes | `theme_family`, `theme_friendship`, `theme_good_vs_evil`, `theme_loss`, etc. | ✅ Ready |
| Narrative | `narrative_nonlinear`, `narrative_twist` | ✅ Ready |
| Aesthetics | `aesthetic_gritty`, `aesthetic_stylized`, `aesthetic_dark`, etc. | ✅ Ready |
| Production | `production_era`, `origin_countries`, `production_budget` | ✅ Ready |
| Content Rating | `content_violence`, `content_mature` | ✅ Ready |

**The foundation exists. We just need to aggregate user preferences across these dimensions.**

### Current Issues
| Issue | Impact | Root Cause |
|-------|--------|------------|
| Only 6 recommendations shown | High | 900+ items excluded |
| Feels generic/untargeted | High | Exclusion system too aggressive |
| SVD generates 0 predictions | Medium | Single user, no collaborative data |
| Recently shown bloat | Medium | 525 items in 7-day window |

### Exclusion System Analysis
```
Current State (Problematic):
├── Watchlist:          411 items excluded
├── Session:             62 items excluded  
├── Recently Shown:     525 items excluded ⚠️
└── Total:             ~900+ exclusions

Result: API returns 20 items, 14+ get excluded, 
        leaving only 6 generic recommendations
```

---

## 🔴 Blockers for Launch

### 1. Plaid Production Testing (CRITICAL)
- **Risk:** Core "Rocket Money" value proposition is untested
- **Impact:** Cannot detect subscriptions automatically from bank data
- **Current State:** Manual entry works, but that is not the differentiator
- **Action Required:** Build production APK and test with real bank

### 2. Recommendation Quality (HIGH)
- **Risk:** Users see generic/repetitive content
- **Impact:** Poor user experience, low engagement
- **Action Required:** Tune exclusion windows, clear bloated tables

### 3. Taste Profile System (HIGH)
- **Risk:** 12 static signatures cannot compete with Netflix-level personalization
- **Impact:** Recommendations feel generic; users get broad labels instead of nuanced profiles
- **Current State:** Basic genre matching assigns labels like "Quirky Comedies Fan"
- **Target State:** Multi-dimensional profiling with 50,000+ compound signatures
- **Action Required:** Build 10-dimension taste profiling system (designed, not implemented)

### 4. Single-User Limitation (MEDIUM)
- **Risk:** Collaborative filtering generates nothing
- **Impact:** Missing "users like you also watched" recommendations
- **Mitigation:** DNA-based recommendations compensate somewhat

---

## 📈 Current Metrics

```
Database:
  - watchlist_items:       423 rows
  - content_dna:           406 rows
  - user_taste_profiles:   1 row
  - subscriptions:         2 (manual entry only)

Recommendations:
  - Recently Shown:        525 items (7-day) ⚠️ TOO HIGH
  - Session Exclusions:    62 items
  - Effective Pool:        Very limited

Taste Profile:
  - Current System:        12 static signatures 🔴 INADEQUATE
  - Target System:         50,000+ compound signatures
  - Dimensions Tracked:    1 of 10 (genre only)
  - Current Label:         "Quirky Comedies Fan" (generic)

Performance:
  - Watchlist Load:        ~600ms ✅
  - Dashboard Stats:       ~350ms ✅
  - DNA Computation:       ~170ms/item ✅
```

---

## 🛠️ Tech Stack

| Layer | Technology | Status |
|-------|------------|--------|
| Framework | React Native + Expo SDK 54 | ✅ Working |
| Language | TypeScript | ✅ Working |
| Backend | Supabase | ✅ Working |
| Content API | TMDb | ✅ Working |
| Banking | Plaid | ⚠️ **Untested in Production** |
| Animations | Reanimated v4 | ✅ Working |
| Build | EAS Build | ✅ Configured, not yet used for Plaid test |

---

## 🚀 Path to Launch

### Phase 1: Validate Core Value Prop (BLOCKING)
1. **Build production APK** via EAS Build
2. **Test Plaid integration** with sandbox bank
3. **Verify subscription detection** actually works
4. **Decide:** Fix issues or pivot to manual-entry-only model

### Phase 2: Build Netflix-Level Personalization
1. **Implement multi-dimensional taste profiling**
   - Extract tone, pacing, themes from existing Content DNA
   - Add production origin detection from TMDb
   - Build thematic interest mapping
   - Create compound signature generation
   - Implement cross-genre cluster detection
2. Identify and clear "recently shown" bloat
3. Tune exclusion windows (7 days → 3 days)
4. Implement "Because You Watched X" lanes with DNA similarity

### Phase 3: Polish and Launch
1. Empty state designs
2. Onboarding flow
3. App store assets
4. Beta testing with real users

---

## 📅 Realistic Timeline

| Milestone | Target | Status | Blocker |
|-----------|--------|--------|---------|
| Plaid Production Test | Week 5 | 🔴 **NOT STARTED** | Need EAS production build |
| Multi-Dimensional Taste System | Week 5-6 | 🔴 **DESIGNED** | Need implementation |
| Recommendation Quality Fix | Week 6 | ⏳ Blocked | Taste system + exclusion tuning |
| Core Value Validation | Week 6-7 | 🔴 Blocked | Plaid + personalization |
| Beta Testing | Week 7-8 | ⏳ Blocked | Core validation |
| App Store Submission | Week 9+ | ⏳ Blocked | Beta results |

---

## 📚 Session History

| Session | Date | Focus | Key Achievements |
|---------|------|-------|------------------|
| 1-10 | Nov 2025 | Foundation | Core app, auth, watchlist |
| 11 | Dec 3 | Database Errors | Fixed PGRST200, relationships |
| 12 | Dec 4 | Dashboard | Stats widget, rating modal |
| 13 | Dec 4 | For You Tab | Genre diversity, lanes |
| 14 | Dec 4 | TypeScript | Import/type errors resolved |
| 15 | Dec 4 | Exclusions | Session tracking |
| 16 | Dec 5 | Performance | Caching, batch optimization |
| 17 | Dec 5-6 | For You Overhaul | ID normalization, fallbacks |
| 18 | Dec 6 | Bug Sweep | 10 bugs fixed |
| **19** | **Dec 6** | **DNA Schema** | 406 DNA rows, 404 handling, TS fixes |

---

## 🎯 Session 19 Summary

**Completed:**
- ✅ Content DNA schema aligned (26 columns added)
- ✅ 406 DNA rows populated
- ✅ 404 error handling implemented
- ✅ TypeScript errors fixed
- ✅ Interest graph built (707 nodes)
- ✅ Multi-dimensional taste system designed (10 dimensions, 50,000+ signatures)

**Issues Discovered:**
- 🔴 Taste profiling inadequate (12 static signatures vs 50,000+ needed)
- ⚠️ Recommendations feel generic (exclusion bloat + weak profiling)
- ⚠️ Plaid integration has never been tested in production
- ⚠️ Manual subscription entry is the only working path for spending data

**Next Session Priority:**
1. **Build production APK to test Plaid** (critical path)
2. **Implement multi-dimensional taste profiling** (leverage existing DNA data)
3. Fix recommendation quality (clear exclusion bloat)
4. Validate core value proposition end-to-end

---

## ⚠️ Honest Assessment

StreamSense has strong UI/UX and a working content discovery system. However:

### The Good
- Content DNA system is populated and functional (406 items)
- DNA already captures tone, pacing, themes (foundation for multi-dimensional profiles)
- UI is polished with smooth animations
- Performance is good (~600ms load times)
- Error handling is robust
- Multi-dimensional taste system is fully designed (10 dimensions, 50,000+ combinations)

### The Uncertain
- **Plaid integration is completely untested in production**
- The "Rocket Money for streaming" pitch depends on automatic subscription detection
- Manual entry works but is not a differentiator
- We do not know if the Plaid flow will work until we build and test

### The Broken
- **Taste profiling is inadequate** (12 static signatures vs Netflix's 76,897 micro-genres)
- Recommendation quality has regressed (only 6 items, feels generic)
- Exclusion system is too aggressive (900+ items blocked)
- SVD/collaborative filtering generates nothing (single user)
- Current labels like "Quirky Comedies Fan" are too broad to drive personalization

### Before Claiming Launch Ready
1. ☐ Test Plaid in production build
2. ☐ Implement multi-dimensional taste profiling (50,000+ signatures)
3. ☐ Fix recommendation quality (clear exclusions, use DNA similarity)
4. ☐ Validate automatic subscription detection works
5. ☐ Get real user feedback on personalization quality

---

*Last Updated: December 6, 2025 - Session 19*