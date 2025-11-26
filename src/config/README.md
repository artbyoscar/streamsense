# Configuration Module

This directory contains all configuration files for StreamSense.

## Files

### [env.ts](env.ts)
Environment variable loader with validation.

**Usage:**
```typescript
import { env, isFeatureEnabled, getSafeEnvInfo } from '@/config';

// Access configuration
const supabaseUrl = env.supabase.url;
const isProduction = env.app.env === 'production';

// Check feature availability
if (isFeatureEnabled('plaid')) {
  // Initialize Plaid integration
}

// Safe logging (no sensitive data)
console.log('Environment:', getSafeEnvInfo());
```

**Features:**
- ✅ Type-safe configuration access
- ✅ Automatic validation on app startup
- ✅ Helpful error messages for missing variables
- ✅ Optional feature detection
- ✅ Safe logging without sensitive data

### [supabase.ts](supabase.ts)
Supabase client with secure storage.

**Usage:**
```typescript
import { supabase } from '@/config';

// Use Supabase client
const { data, error } = await supabase
  .from('subscriptions')
  .select('*');
```

**Features:**
- ✅ Expo SecureStore integration for auth tokens
- ✅ Automatic token refresh
- ✅ Session persistence
- ✅ Uses validated environment config

## Environment Variables

See [../../ENV_CONFIG.md](../../ENV_CONFIG.md) for complete environment variable documentation.

### Required Variables
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Optional Variables
- `EXPO_PUBLIC_PLAID_CLIENT_ID` - Plaid client ID (for bank integration)
- `EXPO_PUBLIC_PLAID_SECRET` - Plaid secret key
- `EXPO_PUBLIC_PLAID_ENV` - Plaid environment (sandbox/development/production)
- `EXPO_PUBLIC_TMDB_API_KEY` - TMDB API key (for streaming service metadata)
- `EXPO_PUBLIC_APP_ENV` - App environment (development/staging/production)
- `EXPO_PUBLIC_DEBUG` - Enable debug logging (true/false)

## Examples

### Check if running in production
```typescript
import { env } from '@/config';

if (env.app.env === 'production') {
  // Production-only code
}
```

### Conditional feature initialization
```typescript
import { env, isFeatureEnabled } from '@/config';

// Only initialize Plaid if configured
if (isFeatureEnabled('plaid')) {
  const plaidConfig = env.plaid!; // Safe to use ! since feature is enabled
  // Initialize Plaid with plaidConfig
}
```

### Debug logging
```typescript
import { env } from '@/config';

if (env.app.debug) {
  console.log('Debug info:', data);
}
```

### Safe environment logging
```typescript
import { getSafeEnvInfo } from '@/config';

// Safe for production logs - no sensitive data
console.log('App started with config:', getSafeEnvInfo());
// Output: {
//   app: { env: 'production', debug: false },
//   features: { plaid: true, tmdb: true },
//   supabase: { url: 'https://...', hasAnonKey: true }
// }
```

## Error Handling

The configuration system validates all required variables on app startup. If validation fails, you'll see a clear error message:

```
❌ Environment Configuration Error:

  - EXPO_PUBLIC_SUPABASE_URL: Supabase URL is required
  - EXPO_PUBLIC_SUPABASE_URL: Supabase URL must start with https://

Please check your .env file and ensure all required variables are set.
See .env.example for reference.
```

This happens before the app starts, preventing runtime errors from missing configuration.

## Type Safety

All configuration types are defined in [../types/env.ts](../types/env.ts):

```typescript
interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  plaid?: {
    clientId: string;
    secret: string;
    env: PlaidEnvironment;
  };
  tmdb?: {
    apiKey: string;
  };
  app: {
    env: AppEnvironment;
    debug: boolean;
  };
}
```

This ensures TypeScript catches configuration errors at compile time.
