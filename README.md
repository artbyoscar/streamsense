# StreamSense

**Rocket Money for Streaming, with Watching Recommendations**

StreamSense helps households optimize their streaming subscription spending while providing personalized content recommendations. It combines financial intelligence with entertainment discovery in a single mobile app.

![React Native](https://img.shields.io/badge/React_Native-0.76-blue)
![Expo](https://img.shields.io/badge/Expo-SDK_54-000020)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E)

---

## The Problem

- **69%** of consumers experience subscription fatigue
- **41%** believe streaming content is not worth the price
- Average US household spends **$61/month** on 4+ streaming services
- No existing app combines subscription management with content recommendations

## The Solution

StreamSense provides:
- **Automatic subscription detection** via bank transaction analysis (Plaid)
- **Value scoring** based on watchlist activity and engagement
- **Personalized recommendations** powered by genre affinity learning
- **Smart tips** with actionable savings recommendations
- **Content discovery** unified search across all platforms

---

## Current Development Status

**Progress: ~80% Feature Complete**

| Category | Status |
|----------|--------|
| Core Infrastructure | ✅ Complete |
| Authentication | ✅ Complete |
| Subscription Management | ✅ Complete |
| Content Discovery | ✅ Complete |
| Personalization Engine | ✅ Complete |
| Financial Intelligence | 🔄 Backend Ready |
| Monetization | 📋 Planned |

---

## Features

### ✅ Completed

| Feature | Description |
|---------|-------------|
| **Authentication** | Secure login/register with Supabase Auth |
| **Dashboard** | Spending overview, renewal dates, quick actions, recent watchlist |
| **Subscription Tracking** | Manual entry with 13+ streaming services, delete functionality |
| **Content Search** | TMDb integration with 14+ personalized browse categories |
| **Watchlist Management** | Track want to watch, currently watching, watched status |
| **Half-Star Ratings** | Rate content 0.5-5 stars with visual star display |
| **Genre Affinity Tracking** | Algorithm learns preferences from all user interactions |
| **For You Recommendations** | Personalized suggestions excluding watchlist items |
| **Session-Based Variety** | Recommendations refresh with new content each session |
| **Media Type Filtering** | Filter recommendations by Movies, TV Shows, or All |
| **Genre Filtering** | Filter by 14 genres (Drama, Action, Sci-Fi, Comedy, etc.) |
| **Tips & Insights** | Service recommendations based on viewing preferences |
| **Money-Saving Tips** | Actionable advice (rotate services, bundles, family plans) |
| **Dark Mode** | Full theme support throughout the app |
| **Plaid Backend** | Edge functions for link token generation and webhooks |
| **EAS Build** | Development builds configured for Android |

### 🔄 In Progress

| Feature | Status | Notes |
|---------|--------|-------|
| **Plaid SDK Integration** | Blocked | SDK incompatible with Expo SDK 54 |
| **Value Score Calculator** | Database Ready | Needs engagement-based UI |
| **Service Recommendations UI** | Partial | Match scoring implemented |

### 📋 Planned

| Feature | Priority |
|---------|----------|
| Push notification reminders | High |
| Content expiration alerts | Medium |
| Monthly savings report | Medium |
| Bundle optimizer | Medium |
| Household profiles | Low |
| RevenueCat paywall | Low |

---

## Tech Stack

### Frontend
- **React Native** 0.76 with New Architecture
- **Expo** SDK 54 (Managed workflow)
- **TypeScript** for type safety
- **React Native Paper** for UI components
- **React Native Safe Area Context** for device-safe layouts

### Backend
- **Supabase** PostgreSQL database, Auth, Edge Functions
- **Row Level Security** for data isolation per user

### Integrations
- **TMDb API** for movie/TV metadata, search, and recommendations
- **Plaid** for bank connection and transaction sync (backend ready)
- **RevenueCat** for subscription management (planned)

### Build & Deployment
- **EAS Build** for development and production builds
- **Expo Go** for rapid development testing
- **GitHub** for version control

---

## Database Schema

```
users (Supabase Auth)
├── user_subscriptions
│   ├── service_name, monthly_cost, billing_cycle
│   ├── next_billing_date, status
│   └── value_score (generated column)
├── watchlist_items
│   ├── tmdb_id, media_type, title
│   ├── status (want_to_watch, watching, watched)
│   ├── rating (DECIMAL 0.5-5.0)
│   └── genres, poster_path
├── user_genre_affinity
│   ├── genre_id, genre_name
│   └── affinity_score (weighted by interactions)
├── plaid_items (bank connections)
├── plaid_accounts (linked accounts)
└── subscription_transactions (detected charges)
```

---

## Project Structure

```
src/
├── components/           # Shared UI components
│   ├── ContentCard.tsx
│   ├── ContentDetailModal.tsx
│   ├── ErrorBoundary.tsx
│   ├── ModalHeader.tsx
│   └── Toast.tsx
├── constants/            # App constants
│   ├── colors.ts
│   └── genres.ts
├── features/
│   ├── auth/            # Authentication screens
│   ├── dashboard/       # Home screen & widgets
│   ├── subscriptions/   # Subscription management
│   ├── watchlist/       # Content tracking & For You
│   ├── recommendations/ # Tips & Insights
│   ├── settings/        # User preferences
│   ├── onboarding/      # Plaid connection flow
│   └── premium/         # Paywall (planned)
├── hooks/               # Custom React hooks
├── navigation/          # Navigation configuration
│   ├── MainNavigator.tsx
│   └── NavigationContext.tsx
├── providers/           # Context providers
│   └── ThemeProvider.tsx
├── services/            # API services
│   ├── auth/
│   ├── supabase.ts
│   ├── tmdb.ts
│   ├── plaid.ts
│   ├── smartRecommendations.ts
│   └── contentBrowse.ts
├── types/               # TypeScript definitions
└── utils/               # Helper functions
    ├── logger.ts
    └── errorHandling.ts

supabase/
└── functions/           # Edge Functions
    ├── plaid-create-link-token/
    ├── plaid-exchange-token/
    ├── plaid-sync-transactions/
    ├── plaid-webhook/
    └── detect-subscriptions/
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app (iOS/Android) for development
- EAS CLI for builds (`npm install -g eas-cli`)

### Environment Variables

Create a `.env` file in the project root:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# TMDb
EXPO_PUBLIC_TMDB_API_KEY=your_tmdb_api_key
EXPO_PUBLIC_TMDB_ACCESS_TOKEN=your_tmdb_access_token

# Plaid (server-side via Supabase secrets)
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox

# Feature Flags
EXPO_PUBLIC_PLAID_ENABLED=true
EXPO_PUBLIC_PLAID_ENV=sandbox
```

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/streamsense.git
cd streamsense

# Install dependencies
npm install

# Start the development server
npx expo start -c

# Scan QR code with Expo Go app
```

### Building for Device

```bash
# Configure EAS (first time only)
eas build:configure

# Development build (Android)
eas build --platform android --profile development

# Download and install APK from Expo dashboard
```

### EAS Configuration

The project uses EAS Build with the following configuration:

- **Project ID:** `fdd17ec3-8028-4ff0-a6e0-3df9bd1934a3`
- **Android Package:** `com.artbyoscar.streamsense`
- **Keystore:** Managed by Expo (Build Credentials CSglJ4HIIW)

---

## Recommendation Algorithm

StreamSense uses a sophisticated recommendation system:

### Genre Affinity Learning

User interactions are weighted and tracked:

| Action | Weight |
|--------|--------|
| Add to watchlist | +1.0 |
| Mark as watching | +1.5 |
| Complete watching | +2.0 |
| Rate 4+ stars | +3.0 |
| Rate below 3 stars | -1.0 |

### For You Generation

1. Fetch user's top 5 genres by affinity score
2. Query TMDb discover API with genre filters
3. Exclude all items already in watchlist
4. Exclude items shown in current session
5. Randomize page selection (1-10) for variety
6. Mix movies and TV shows based on user preference
7. Cache shown items for 24 hours

### Personalized Categories

The Search screen generates 14+ categories:
- 🔥 Trending Today
- Personalized genre categories (Drama For You, Action For You, etc.)
- 💎 Hidden Gems (high rating, low vote count)
- 🏆 Critically Acclaimed
- 📽️ Classic Cinema (pre-2000)
- Mood-based categories based on preferences

---

## Known Issues & Workarounds

### Plaid SDK Incompatibility

The `@burstware/expo-plaid-link` package requires Expo SDK 43 and is not compatible with Expo SDK 54. The Plaid backend is fully functional (link token generation works), but the native UI cannot be displayed.

**Workarounds:**
1. Use manual subscription entry (current solution)
2. Wait for updated Plaid SDK
3. Eject to bare workflow (not recommended)

### SafeArea on Modal Screens

Some modal screens (Add Subscription, Connect Bank) display headers under the status bar on certain devices. Fix by using `useSafeAreaInsets()` and applying `paddingTop: insets.top + 8`.

### React Fragment Key Warnings

The DashboardScreen shows "Each child in a list should have a unique key prop" warnings. This is a cosmetic issue that does not affect functionality.

---

## Business Model

### Freemium Tiers

| Feature | Free | Premium ($4.99/mo) |
|---------|------|-------------------|
| Manual subscription tracking | 3 max | Unlimited |
| Watchlist | 20 items | Unlimited |
| Content search | ✓ | ✓ |
| Basic recommendations | ✓ | ✓ |
| Bank connection (Plaid) | ✗ | ✓ |
| Value scoring | ✗ | ✓ |
| Smart tips | ✗ | ✓ |
| Renewal alerts | ✗ | ✓ |

### Launch Strategy

1. **Phase 1:** Waitlist building with landing page
2. **Phase 2:** Alpha/beta testing targeting 40%+ PMF score
3. **Phase 3:** Public launch with zero-budget marketing

### Revenue Streams

1. **Premium subscriptions** (primary)
2. **Affiliate commissions** from streaming service signups
3. **Anonymized data licensing** (aggregate insights)

---

## Development Timeline

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Core Infrastructure (Auth, Navigation, Database) |
| Phase 2 | ✅ Complete | Subscription Management (Manual entry, tracking) |
| Phase 3 | ✅ Complete | Content Discovery (TMDb, search, browse) |
| Phase 4 | ✅ Complete | Personalization (Genre affinity, recommendations) |
| Phase 5 | 🔄 In Progress | Financial Intelligence (Plaid, value scoring) |
| Phase 6 | 📋 Planned | Monetization (RevenueCat, paywall) |
| Phase 7 | 📋 Planned | Polish & Launch (Onboarding, app store) |

---

## Testing Checklist

Before release, verify:

- [ ] Authentication flow (login, register, logout)
- [ ] Dashboard displays correct spending totals
- [ ] Subscription CRUD operations work
- [ ] Watchlist add/remove/update status
- [ ] Half-star ratings save correctly
- [ ] Genre affinity updates on interactions
- [ ] For You excludes watchlist items
- [ ] Genre filters show correct content
- [ ] Media type filters work (Movies/TV)
- [ ] Tips page shows service recommendations
- [ ] Modal headers are below status bar
- [ ] Dark mode displays correctly

---

## Contributing

This is currently a solo project by Oscar Nunez. Contributions may be accepted in the future.

---

## License

Proprietary - All rights reserved.

---

## Acknowledgments

- [TMDb](https://www.themoviedb.org/) for movie/TV data API
- [Supabase](https://supabase.com/) for backend infrastructure
- [Expo](https://expo.dev/) for React Native tooling
- [Plaid](https://plaid.com/) for financial data access
- [React Native Paper](https://callstack.github.io/react-native-paper/) for UI components

---

## Contact

**Developer:** Oscar Nunez  
**Email:** art.by.oscar.n@gmail.com  
**Project:** StreamSense

---

*Built with ☕ and determination in King County, WA*