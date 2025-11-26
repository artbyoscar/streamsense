# StreamSense

A subscription tracking app built with Expo and React Native.

## Features

- Track your streaming and subscription services
- Monitor monthly expenses
- Get notifications for upcoming renewals

## Tech Stack

- **Expo SDK**: Latest managed workflow
- **TypeScript**: For type safety
- **React Native**: Cross-platform mobile development
- **ESLint & Prettier**: Code quality and formatting

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
│   ├── config/        # App configuration
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
npm install
```

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
