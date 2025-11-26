# Environment Configuration Guide

This guide explains how to configure environment variables for StreamSense.

## Quick Start

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:

   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
   ```

3. Start the app:
   ```bash
   npm start
   ```

## Environment Variables

### Required Variables

#### Supabase Configuration

| Variable                        | Description                 | Where to find                                                                                                                   |
| ------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`      | Your Supabase project URL   | [Supabase Dashboard](https://app.supabase.com/project/_/settings/api) → Project Settings → API → Project URL                    |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | [Supabase Dashboard](https://app.supabase.com/project/_/settings/api) → Project Settings → API → Project API keys → anon public |

### Optional Variables

#### Plaid Configuration (Bank Integration)

Enable automatic subscription detection from bank transactions.

| Variable                      | Description                                                | Where to find                                                               |
| ----------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| `EXPO_PUBLIC_PLAID_CLIENT_ID` | Plaid client ID                                            | [Plaid Dashboard](https://dashboard.plaid.com/team/keys) → Keys → Client ID |
| `EXPO_PUBLIC_PLAID_SECRET`    | Plaid secret key                                           | [Plaid Dashboard](https://dashboard.plaid.com/team/keys) → Keys → Secrets   |
| `EXPO_PUBLIC_PLAID_ENV`       | Plaid environment (`sandbox`, `development`, `production`) | Use `sandbox` for testing                                                   |

**Note:** All three Plaid variables must be set together to enable this feature.

#### TMDB Configuration (Streaming Service Metadata)

Fetch logos and metadata for streaming services.

| Variable                   | Description                | Where to find                                                                      |
| -------------------------- | -------------------------- | ---------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_TMDB_API_KEY` | The Movie Database API key | [TMDB Settings](https://www.themoviedb.org/settings/api) → API → API Key (v3 auth) |

#### App Configuration

| Variable              | Default       | Description                                                |
| --------------------- | ------------- | ---------------------------------------------------------- |
| `EXPO_PUBLIC_APP_ENV` | `development` | App environment: `development`, `staging`, or `production` |
| `EXPO_PUBLIC_DEBUG`   | `true`        | Enable debug logging                                       |

## Configuration Management

### Type-Safe Environment Access

The app uses a type-safe configuration system. All environment variables are validated on app startup.

```typescript
import { env, isFeatureEnabled } from '@/config';

// Access configuration
console.log(env.supabase.url);
console.log(env.app.env);

// Check if optional features are enabled
if (isFeatureEnabled('plaid')) {
  console.log('Plaid is configured');
}

if (isFeatureEnabled('tmdb')) {
  console.log('TMDB is configured');
}
```

### Safe Logging

Use `getSafeEnvInfo()` to log environment info without exposing sensitive data:

```typescript
import { getSafeEnvInfo } from '@/config';

console.log('Environment:', getSafeEnvInfo());
// Output: {
//   app: { env: 'development', debug: true },
//   features: { plaid: false, tmdb: true },
//   supabase: { url: 'https://...', hasAnonKey: true }
// }
```

### Validation

The configuration is validated on app startup. If required variables are missing or invalid, you'll see a helpful error message:

```
❌ Environment Configuration Error:

  - EXPO_PUBLIC_SUPABASE_URL: Supabase URL is required
  - EXPO_PUBLIC_SUPABASE_ANON_KEY: Supabase anon key is required

Please check your .env file and ensure all required variables are set.
See .env.example for reference.
```

## Common Issues

### Environment variables not loading

**Problem:** Environment variables are not being read by the app.

**Solution:**

1. Make sure your `.env` file is in the root directory
2. Restart the Metro bundler: `npx expo start --clear`
3. If using EAS Build, environment variables need to be set differently (see below)

### Invalid environment values

**Problem:** Getting validation errors for environment variables.

**Solution:** Check that:

- Supabase URL starts with `https://`
- Plaid environment is one of: `sandbox`, `development`, `production`
- App environment is one of: `development`, `staging`, `production`

### Changes not taking effect

**Problem:** Updated `.env` but changes aren't reflected in the app.

**Solution:**

1. Clear Metro cache: `npx expo start --clear`
2. Rebuild the app if using a development build

## EAS Build Configuration

When building with EAS, environment variables need to be set in `eas.json`:

```json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key",
        "EXPO_PUBLIC_APP_ENV": "development"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key",
        "EXPO_PUBLIC_APP_ENV": "production"
      }
    }
  }
}
```

Or use EAS Secrets for sensitive values:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your-key
```

## Security Best Practices

1. **Never commit `.env` to version control**
   - `.env` is already in `.gitignore`
   - Always use `.env.example` as a template

2. **Use different credentials for different environments**
   - Development: Use test/sandbox credentials
   - Production: Use production credentials

3. **Rotate keys regularly**
   - Change API keys periodically
   - Update keys immediately if compromised

4. **Limit key permissions**
   - Use Supabase Row Level Security (RLS)
   - Use Plaid sandbox environment for testing
   - Restrict API key permissions where possible

## Environment-Specific Configuration

### Development

```env
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_DEBUG=true
EXPO_PUBLIC_PLAID_ENV=sandbox
```

### Staging

```env
EXPO_PUBLIC_APP_ENV=staging
EXPO_PUBLIC_DEBUG=true
EXPO_PUBLIC_PLAID_ENV=development
```

### Production

```env
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_DEBUG=false
EXPO_PUBLIC_PLAID_ENV=production
```

## Type Definitions

All environment configuration types are defined in [src/types/env.ts](src/types/env.ts):

- `EnvironmentConfig` - Complete configuration object
- `AppEnvironment` - Valid app environments
- `PlaidEnvironment` - Valid Plaid environments
- `EnvValidationError` - Validation error structure

## Related Files

- [.env.example](.env.example) - Environment variable template
- [src/config/env.ts](src/config/env.ts) - Environment loader and validator
- [src/types/env.ts](src/types/env.ts) - Environment type definitions
- [src/config/supabase.ts](src/config/supabase.ts) - Supabase client using env config

## Support

For issues related to:

- Supabase: https://supabase.com/docs
- Plaid: https://plaid.com/docs/
- TMDB: https://developers.themoviedb.org/3
- Expo environment variables: https://docs.expo.dev/guides/environment-variables/
