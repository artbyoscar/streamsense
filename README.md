# StreamSense

A subscription tracking app built with Expo and React Native.

## Features

- Track your streaming and subscription services
- Monitor monthly expenses
- Get notifications for upcoming renewals

## Tech Stack

### Core

- **Expo SDK 54**: Latest managed workflow
- **TypeScript**: For type safety
- **React Native**: Cross-platform mobile development

### Backend & Data

- **Supabase**: Backend as a Service (authentication, database, storage)
- **React Query**: Data fetching and caching
- **Zustand**: Lightweight state management

### UI & Navigation

- **React Native Paper**: Material Design 3 components
- **React Navigation**: Bottom tabs and stack navigation

### Forms & Validation

- **React Hook Form**: Form state management
- **Zod**: Schema validation

### Development

- **ESLint & Prettier**: Code quality and formatting
- **Babel Module Resolver**: Path alias support

## Project Structure

```
streamsense/
├── src/
│   ├── components/    # Reusable UI components
│   ├── features/      # Feature-specific modules
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API and external services
│   ├── utils/         # Utility functions
│   ├── types/         # TypeScript type definitions
│   ├── config/        # App configuration (Supabase, etc.)
│   ├── stores/        # Zustand state stores
│   ├── providers/     # React providers (Query, Theme, etc.)
│   └── navigation/    # Navigation setup
├── assets/            # Images, fonts, etc.
└── App.tsx           # Entry point
```

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- npm or yarn
- Expo CLI

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Configuration

1. Create a Supabase project at https://supabase.com
2. Copy your project URL and anon key to the `.env` file:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-url.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

For detailed setup instructions, see [SETUP.md](SETUP.md).

### Running the App

```bash
# Start the development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on Web
npm run web
```

## Development Scripts

```bash
# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Code formatting
npm run format
npm run format:check
```

## License

MIT
