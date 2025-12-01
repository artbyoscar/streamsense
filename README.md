# StreamSense

**Rocket Money for Streaming, with Watching Recommendations**

StreamSense is a React Native mobile application that bridges the gap between subscription financial management and entertainment content intelligence. It helps users optimize their streaming spending while discovering personalized content recommendations.

---

## Overview

The average US household spends $61-70 monthly on streaming subscriptions, with 69% reporting subscription fatigue and 110 hours wasted annually deciding what to watch. StreamSense addresses both problems in a single application by combining financial tracking with Netflix-level content recommendations.

### Value Proposition

- **Track Spending**: Monitor all streaming subscriptions in one place
- **Measure Value**: Calculate cost-per-hour to see which services deliver real value
- **Discover Content**: Personalized recommendations based on viewing preferences
- **Optimize Subscriptions**: Smart suggestions for when to cancel, pause, or rotate services

---

## Current Status

**Development Progress: ~80% Complete**

### Working Features

| Feature | Status | Description |
|---------|--------|-------------|
| Authentication | ✅ Complete | Email/password auth via Supabase |
| Dashboard | ✅ Complete | Spending overview, quick actions, upcoming renewals |
| Manual Subscription Entry | ✅ Complete | Add/edit streaming services manually |
| Watchlist Management | ✅ Complete | Track content across Currently Watching, Want to Watch, Watched |
| TMDb Integration | ✅ Complete | Movie/TV metadata, posters, ratings, streaming availability |
| Genre Affinity Tracking | ✅ Complete | Learns preferences from user interactions |
| Smart Recommendations | ✅ Complete | Personalized "For You" recommendations |
| Content Search | ✅ Complete | Search movies and TV shows |
| Tips & Insights | ✅ Complete | Value analysis, cancellation suggestions, service recommendations |
| Discover (Swipe) | ✅ Complete | Tinder-style content discovery |
| Dark Mode | ✅ Complete | System-wide dark theme |

### In Progress

| Feature | Status | Description |
|---------|--------|-------------|
| Plaid Integration | 🔄 Pending | Automatic subscription detection via bank connections |
| Watch Time Logging | 🔄 In Progress | Manual watch time entry for value calculations |
| Netflix-Style Filtering | 🔄 In Progress | Load fresh content per genre filter |

### Planned Features

| Feature | Priority | Description |
|---------|----------|-------------|
| Push Notifications | High | Renewal reminders, new content alerts |
| Subscription Rotation | Medium | Smart rotation scheduling |
| Household Sharing | Medium | Multi-user support |
| AI Chat Assistant | Low | Natural language queries about subscriptions |

---

## Tech Stack

### Frontend
- **React Native** (Expo SDK 54)
- **TypeScript**
- **React Navigation** (Custom tab implementation)
- **React Native Paper** (UI components)
- **Expo Vector Icons**

### Backend & Services
- **Supabase**
  - Authentication (email/password, OAuth ready)
  - PostgreSQL database with Row Level Security
  - Real-time subscriptions
- **TMDb API** (The Movie Database)
  - Content metadata
  - Streaming availability
  - Trending/popular content
- **Plaid** (Pending production approval)
  - Bank account connections
  - Transaction categorization

### Key Dependencies
```json
{
  "expo": "~54.0.0",
  "react-native": "0.76.x",
  "@supabase/supabase-js": "^2.x",
  "react-native-paper": "^5.x",
  "@react-navigation/native": "^7.x",
  "axios": "^1.x"
}
```

---

## Project Structure

```
streamsense/
├── src/
│   ├── components/           # Shared UI components
│   │   ├── Card.tsx
│   │   ├── ContentDetailModal.tsx
│   │   ├── ContentSearchModal.tsx
│   │   └── ...
│   ├── config/               # Configuration files
│   │   ├── supabase.ts
│   │   └── env.ts
│   ├── features/             # Feature-based modules
│   │   ├── auth/
│   │   │   ├── screens/
│   │   │   └── hooks/
│   │   ├── dashboard/
│   │   │   ├── screens/
│   │   │   │   └── DashboardScreen.tsx
│   │   │   └── components/
│   │   ├── watchlist/
│   │   │   ├── screens/
│   │   │   │   └── WatchlistScreen.tsx
│   │   │   └── components/
│   │   ├── discover/
│   │   │   └── screens/
│   │   │       └── DiscoverScreen.tsx
│   │   ├── tips/
│   │   │   └── screens/
│   │   │       └── TipsScreen.tsx
│   │   ├── settings/
│   │   │   └── screens/
│   │   │       └── SettingsScreen.tsx
│   │   └── subscriptions/
│   │       ├── screens/
│   │       └── components/
│   ├── navigation/           # Navigation configuration
│   │   └── MainNavigator.tsx
│   ├── services/             # Business logic & API calls
│   │   ├── tmdb.ts
│   │   ├── smartRecommendations.ts
│   │   ├── genreAffinity.ts
│   │   ├── valueScore.ts
│   │   ├── churnPrediction.ts
│   │   └── pileOfShame.ts
│   ├── hooks/                # Custom React hooks
│   │   ├── useAuth.ts
│   │   └── useTheme.ts
│   ├── context/              # React Context providers
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   └── types/                # TypeScript type definitions
│       └── index.ts
├── assets/                   # Static assets
├── app.config.js             # Expo configuration
├── package.json
└── tsconfig.json
```

---

## Database Schema

### Core Tables

```sql
-- User subscriptions (streaming services)
user_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  service_name TEXT,
  price DECIMAL,
  billing_cycle TEXT,
  next_billing_date DATE,
  status TEXT,
  total_watch_hours DECIMAL,
  detected_from TEXT,
  created_at TIMESTAMPTZ
)

-- Watchlist items
watchlist_items (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  tmdb_id INTEGER,
  media_type TEXT,
  title TEXT,
  poster_path TEXT,
  status TEXT,
  rating INTEGER,
  genres JSONB,
  streaming_services JSONB,
  created_at TIMESTAMPTZ
)

-- Genre affinity tracking
genre_affinity (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  genre_id INTEGER,
  genre_name TEXT,
  affinity_score DECIMAL,
  interaction_count INTEGER,
  updated_at TIMESTAMPTZ
)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device
- Supabase account
- TMDb API key

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/streamsense.git
   cd streamsense
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_TMDB_API_KEY=your_tmdb_api_key
   EXPO_PUBLIC_TMDB_ACCESS_TOKEN=your_tmdb_access_token
   ```

4. **Set up Supabase**
   
   Run the migration scripts in the Supabase SQL Editor (see `/docs/migrations/`)

5. **Start the development server**
   ```bash
   npx expo start -c
   ```

6. **Run on device**
   
   Scan the QR code with Expo Go (Android) or Camera app (iOS)

---

## Recommendation Algorithm

StreamSense uses a multi-factor recommendation system inspired by Netflix and TikTok:

### Genre Affinity Tracking

User interactions are weighted and tracked:

| Action | Weight |
|--------|--------|
| Add to Watchlist | +1.0 |
| Start Watching | +1.5 |
| Complete Watching | +2.0 |
| Rate High (4-5 stars) | +2.5 |
| Rate Low (1-2 stars) | -1.0 |
| Skip/Dismiss | -0.5 |

### Recommendation Sources

1. **For You** - Weighted by top genre affinities
2. **Because You Liked [Genre]** - Genre-specific recommendations
3. **Discovery** - Exploration of less-watched genres
4. **Trending** - Popular content across all users

### Content Exclusion

- Items in user's watchlist (any status) are excluded
- Session-shown items are tracked to prevent repetition
- Previously dismissed items are deprioritized

---

## Value Score Calculation

The value score helps users understand their subscription ROI:

```typescript
// Break-even calculation
const BREAK_EVEN_RATE = 1.50; // dollars per hour (industry average)
const breakEvenHours = monthlyCost / BREAK_EVEN_RATE;
const costPerHour = watchHours > 0 ? monthlyCost / watchHours : 0;

// Value ratings
if (costPerHour === 0) rating = 'unknown';
else if (costPerHour < 0.50) rating = 'excellent';
else if (costPerHour < 1.00) rating = 'good';
else if (costPerHour < 2.00) rating = 'fair';
else rating = 'poor';
```

---

## Security & Compliance

StreamSense implements enterprise-level security:

- **Multi-Factor Authentication** on all administrative accounts
- **Row Level Security (RLS)** on all database tables
- **GitHub Dependabot** for vulnerability scanning
- **HTTPS/TLS** for all API communications
- **Plaid Compliance** (13 attestations completed)

Privacy Policy: [https://artbyoscar.github.io/streamsense/privacy.html](https://artbyoscar.github.io/streamsense/privacy.html)

---

## Business Model

### Freemium Subscription

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 1 bank connection, basic tracking, 5 watchlist items |
| Premium | $4.99/mo | Unlimited connections, full recommendations, household sharing |
| Early Adopter | $2.99/mo | Premium features at reduced rate (limited time) |

### Launch Strategy

1. **Waitlist Phase** - Build interest, gather feedback
2. **Alpha/Beta** - Target 40%+ product-market fit score
3. **Public Launch** - Zero-budget marketing tactics

---

## Contributing

This is currently a solo development project. Contributions may be accepted in the future.

---

## License

Proprietary - All rights reserved

---

## Acknowledgments

- [TMDb](https://www.themoviedb.org/) for content metadata
- [Supabase](https://supabase.com/) for backend infrastructure
- [Expo](https://expo.dev/) for React Native tooling
- [Plaid](https://plaid.com/) for financial data integration

---

## Contact

**Developer**: Oscar Nunez

**Project**: StreamSense

**Status**: Active Development

---

*Last Updated: November 30, 2025*