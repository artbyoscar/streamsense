# StreamSense

**Rocket Money for Streaming, with Watching Recommendations**

StreamSense helps households optimize their streaming subscription spending while providing personalized content recommendations. It combines financial intelligence with entertainment discovery in a single mobile app.

![React Native](https://img.shields.io/badge/React_Native-0.76-blue)
![Expo](https://img.shields.io/badge/Expo-SDK_52-000020)
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
- **Value scoring** - cost-per-hour calculations for each service
- **Personalized recommendations** based on viewing preferences
- **Smart tips** - actionable savings recommendations
- **Content discovery** - unified search across all platforms

---

## Features

### ✅ Completed

| Feature | Description |
|---------|-------------|
| **Authentication** | Secure login/register with Supabase Auth |
| **Subscription Tracking** | Manual entry with 13+ streaming services |
| **Dashboard** | Spending overview, renewal dates, quick actions |
| **Content Search** | TMDb integration with browse categories |
| **Watchlist** | Track want to watch, watching, watched status |
| **5-Star Ratings** | Rate content with genre affinity tracking |
| **Personalized Recommendations** | "For You" section based on viewing history |
| **Genre Learning** | Algorithm learns preferences from interactions |
| **Tips & Insights** | Service recommendations matching user interests |
| **Dark Mode** | Full theme support |

### 🔄 In Progress

| Feature | Status |
|---------|--------|
| **Plaid Integration** | Infrastructure complete, pending live testing |
| **Value Score Calculator** | Database ready, UI pending |
| **RevenueCat Paywall** | Partial implementation |

### 📋 Planned

| Feature | Priority |
|---------|----------|
| Renewal reminders | High |
| Content expiration alerts | Medium |
| Monthly savings report | Medium |
| Bundle optimizer | Low |
| Household profiles | Low |

---

## Tech Stack

### Frontend
- **React Native** 0.76 with New Architecture
- **Expo** SDK 52 (Managed workflow)
- **TypeScript** for type safety
- **React Native Paper** for UI components

### Backend
- **Supabase** - PostgreSQL database, Auth, Edge Functions
- **Row Level Security** - Data isolation per user

### Integrations
- **TMDb API** - Movie/TV metadata, search, recommendations
- **Plaid** - Bank connection, transaction sync
- **RevenueCat** - Subscription management (planned)

### Database Schema
```
users (Supabase Auth)
├── user_subscriptions (streaming services)
├── watchlist_items (content tracking)
├── content (movie/TV metadata)
├── user_genre_affinity (preference scores)
├── plaid_items (bank connections)
├── plaid_accounts (linked accounts)
└── subscription_transactions (detected charges)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app (iOS/Android) for development

### Environment Variables

Create a `.env` file in the project root:
```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# TMDb
EXPO_PUBLIC_TMDB_API_KEY=your_tmdb_api_key
EXPO_PUBLIC_TMDB_ACCESS_TOKEN=your_tmdb_access_token

# Plaid (server-side only)
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

### Running on Device
```bash
# iOS Simulator
npx expo run:ios

# Android Emulator
npx expo run:android

# Development build (required for Plaid)
npx expo run:android --device
```

---

## Project Structure
```
src/
├── components/          # Shared UI components
├── constants/           # App constants, colors, genres
├── features/
│   ├── auth/           # Authentication screens & hooks
│   ├── dashboard/      # Home screen & widgets
│   ├── subscriptions/  # Subscription management
│   ├── watchlist/      # Content tracking
│   ├── recommendations/# Tips & insights
│   ├── settings/       # User preferences
│   ├── onboarding/     # First-run experience
│   └── premium/        # Paywall & upgrades
├── hooks/              # Custom React hooks
├── navigation/         # Navigation configuration
├── providers/          # Context providers
├── services/           # API services (TMDb, Plaid, etc.)
├── types/              # TypeScript definitions
└── utils/              # Helper functions

supabase/
└── functions/          # Edge Functions
    ├── plaid-create-link-token/
    ├── plaid-exchange-token/
    ├── plaid-sync-transactions/
    ├── plaid-webhook/
    └── detect-subscriptions/
```

---

## Development Status

**Current Progress: ~60% Complete**

### Milestones

- [x] Phase 1: Core Infrastructure (Auth, Navigation, Database)
- [x] Phase 2: Subscription Management (Manual entry, tracking)
- [x] Phase 3: Content Discovery (TMDb, search, browse)
- [x] Phase 4: Personalization (Genre affinity, recommendations)
- [ ] Phase 5: Financial Intelligence (Plaid, value scoring)
- [ ] Phase 6: Monetization (RevenueCat, paywall)
- [ ] Phase 7: Polish & Launch (Onboarding, app store)

### Recent Updates

- ✅ Fixed TMDb API integration
- ✅ Improved personalized recommendations algorithm
- ✅ Added delete subscription functionality
- ✅ Fixed dashboard layout overlap
- ✅ Improved search modal UX (return to browse, load more)
- ✅ Added Tips page with service recommendations
- ✅ Fixed Plaid authentication headers

---

## Business Model

### Freemium Tiers

| Feature | Free | Premium ($4.99/mo) |
|---------|------|-------------------|
| Manual subscription tracking | 3 max | Unlimited |
| Watchlist | 10 items | Unlimited |
| Content search | ✓ | ✓ |
| Basic recommendations | ✓ | ✓ |
| Bank connection (Plaid) | ✗ | ✓ |
| Value scoring | ✗ | ✓ |
| Smart tips | ✗ | ✓ |
| Renewal alerts | ✗ | ✓ |

### Revenue Streams

1. **Premium subscriptions** - Primary revenue
2. **Affiliate commissions** - Streaming service signups
3. **Anonymized data** - Aggregate insights for platforms

---

## Contributing

This is currently a solo project. Contributions may be accepted in the future.

---

## License

Proprietary - All rights reserved.

---

## Acknowledgments

- [TMDb](https://www.themoviedb.org/) for movie/TV data
- [Supabase](https://supabase.com/) for backend infrastructure
- [Expo](https://expo.dev/) for React Native tooling
- [Plaid](https://plaid.com/) for financial data access

---

## Contact

**Developer:** Oscar Nunez
**Email:** art.by.oscar.n@gmail.com

---

*Built with ☕ and determination*
