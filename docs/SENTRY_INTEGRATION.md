# Sentry Error Tracking Integration

Comprehensive guide for Sentry error tracking and performance monitoring in StreamSense.

## Overview

Sentry provides:
- ✅ Real-time error tracking
- ✅ Performance monitoring
- ✅ User context tracking
- ✅ Breadcrumb trails
- ✅ Release tracking
- ✅ Source map support

## Setup

### 1. Create Sentry Project

1. Go to [sentry.io](https://sentry.io)
2. Create a new project
3. Select "React Native" as platform
4. Copy your DSN

### 2. Configure Environment

Add to `.env`:

```bash
SENTRY_DSN=https://your-key@sentry.io/your-project-id
```

### 3. Update app.json

Already configured in `app.json`:

```json
{
  "extra": {
    "sentryDsn": process.env.SENTRY_DSN
  },
  "hooks": {
    "postPublish": [
      {
        "file": "sentry-expo/upload-sourcemaps",
        "config": {
          "organization": "your-org",
          "project": "streamsense"
        }
      }
    ]
  }
}
```

### 4. Installation Complete

Sentry is already integrated and initialized in:
- App.tsx - Early initialization
- authStore.ts - User context tracking
- ErrorBoundary.tsx - Crash reporting

## Features

### Error Tracking

**Location**: [src/services/sentry.ts](../src/services/sentry.ts)

#### Capture Exceptions

```typescript
import { captureException } from '@/services/sentry';

try {
  await fetchData();
} catch (error) {
  captureException(error, {
    component: 'Dashboard',
    action: 'fetchData',
    userId: user.id,
  });
}
```

#### Capture Messages

```typescript
import { captureMessage } from '@/services/sentry';

captureMessage('User completed onboarding', 'info', {
  userId: user.id,
  duration: 120,
});
```

### User Context

Automatically tracked on auth changes:

```typescript
// Automatically set on login
setUserContext({
  id: user.id,
  email: user.email,
  isPremium: user.is_premium,
});

// Automatically cleared on logout
clearUserContext();
```

**Manual usage**:
```typescript
import { setUserContext } from '@/services/sentry';

setUserContext({
  id: user.id,
  email: user.email,
  isPremium: true,
  subscriptionCount: 5,
});
```

### Breadcrumbs

Track user actions leading up to errors:

```typescript
import {
  addBreadcrumb,
  addNavigationBreadcrumb,
  addAPIBreadcrumb,
  addUserActionBreadcrumb,
} from '@/services/sentry';

// Generic breadcrumb
addBreadcrumb({
  category: 'auth',
  message: 'User logged in',
  level: 'info',
  data: { method: 'email' },
});

// Navigation
addNavigationBreadcrumb('Dashboard', 'Settings');

// API calls
addAPIBreadcrumb('GET', '/subscriptions', 200);

// User actions
addUserActionBreadcrumb('click', 'Add Subscription Button');
```

### Performance Monitoring

#### Start Transaction

```typescript
import { startTransaction } from '@/services/sentry';

const transaction = startTransaction('load_subscriptions', 'task');

// ... do work

transaction?.finish();
```

#### Measure Operations

```typescript
import { measureOperation } from '@/services/sentry';

const data = await measureOperation('fetchSubscriptions', async () => {
  return await supabase.from('subscriptions').select();
});
```

### Tags and Context

```typescript
import { setTag, setContext } from '@/services/sentry';

// Tags for filtering
setTag('feature', 'premium');
setTag('screen', 'Dashboard');

// Custom context
setContext('subscription', {
  count: 5,
  totalCost: 49.99,
  activeServices: ['Netflix', 'Spotify'],
});
```

## Integration Points

### 1. App Initialization

**File**: [App.tsx](../App.tsx)

```typescript
import { initializeSentry } from './src/services/sentry';

// Initialize as early as possible
initializeSentry();
```

### 2. Authentication

**File**: [authStore.ts](../src/features/auth/store/authStore.ts)

```typescript
// On login/session restore
if (session?.user) {
  setUserContext({
    id: session.user.id,
    email: session.user.email,
  });
}

// On logout
clearUserContext();
```

### 3. Error Boundary

**File**: [ErrorBoundary.tsx](../src/components/ErrorBoundary.tsx)

```typescript
componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
  // Send to Sentry
  captureException(error, {
    component: 'ErrorBoundary',
    componentStack: errorInfo.componentStack,
  });
}
```

### 4. Navigation Tracking

Add to your navigation container:

```typescript
import { addNavigationBreadcrumb } from '@/services/sentry';

<NavigationContainer
  onStateChange={(state) => {
    const currentRoute = getCurrentRoute(state);
    const previousRoute = getPreviousRoute(state);

    if (currentRoute && previousRoute) {
      addNavigationBreadcrumb(previousRoute, currentRoute);
    }
  }}
>
```

### 5. API Calls

Add to your API client:

```typescript
import { addAPIBreadcrumb, captureException } from '@/services/sentry';

const apiClient = {
  async get(url: string) {
    try {
      const response = await fetch(url);
      addAPIBreadcrumb('GET', url, response.status);
      return response;
    } catch (error) {
      addAPIBreadcrumb('GET', url);
      captureException(error, { url });
      throw error;
    }
  },
};
```

## Best Practices

### 1. Add Context to Errors

```typescript
// ✅ Good - Rich context
captureException(error, {
  component: 'SubscriptionForm',
  action: 'handleSubmit',
  userId: user.id,
  formData: sanitizedData,
});

// ❌ Bad - No context
captureException(error);
```

### 2. Use Breadcrumbs

```typescript
// ✅ Good - Breadcrumb trail
addUserActionBreadcrumb('click', 'Add Subscription');
addAPIBreadcrumb('POST', '/subscriptions', 201);
captureMessage('Subscription created', 'info');

// ❌ Bad - No breadcrumbs, harder to debug
```

### 3. Set User Context Early

```typescript
// ✅ Good - Context set immediately on auth
setUserContext({ id: user.id, email: user.email });

// ❌ Bad - No user context, can't identify affected users
```

### 4. Use Appropriate Levels

```typescript
// info - General info
captureMessage('User viewed dashboard', 'info');

// warning - Recoverable issues
captureMessage('API rate limit approaching', 'warning');

// error - Errors
captureMessage('Payment failed', 'error');

// fatal - Critical errors
captureException(criticalError);
```

### 5. Sanitize Sensitive Data

```typescript
// ✅ Good - Sanitized
const sanitizedData = {
  email: user.email,
  // Don't include password, tokens, etc.
};
captureException(error, { user: sanitizedData });

// ❌ Bad - Includes sensitive data
captureException(error, { password: '...' });
```

## Configuration

### Environment-Based Initialization

```typescript
// Sentry only enabled in production
const isProduction = process.env.NODE_ENV === 'production';
const isEnabled = isProduction && SENTRY_DSN !== '';
```

### Sample Rate

Adjust in `sentry.ts`:

```typescript
Sentry.init({
  // Capture 100% of transactions in staging
  tracesSampleRate: __DEV__ ? 1.0 : 0.1, // 10% in production

  // Capture 100% of sessions
  enableAutoSessionTracking: true,
});
```

### Before Send Hook

Already configured to sanitize data:

```typescript
beforeSend(event, hint) {
  // Remove sensitive headers
  if (event.request?.headers) {
    delete event.request.headers['Authorization'];
    delete event.request.headers['Cookie'];
  }

  return event;
}
```

## Source Maps

### Upload Source Maps

```bash
# On build
npx expo build:android --no-publish
npx expo build:ios --no-publish

# Source maps automatically uploaded via hook
```

### Verify Source Maps

1. Trigger an error in production build
2. Check Sentry dashboard
3. Verify stack trace is readable with file names and line numbers

## Monitoring

### Sentry Dashboard

**Issues**:
- View all errors
- See error frequency
- Identify affected users
- Track releases

**Performance**:
- Transaction duration
- Slow operations
- API response times
- Screen load times

**Releases**:
- Track deployments
- Compare error rates
- Identify regressions

### Alerts

Set up alerts in Sentry:
- New issue created
- Issue frequency spike
- Performance degradation
- Release health

## Testing

### Test Error Tracking

```typescript
// Add test button in dev mode
if (__DEV__) {
  <Button
    onPress={() => {
      throw new Error('Sentry test error');
    }}
  >
    Test Sentry
  </Button>
}
```

### Test User Context

```typescript
// Verify user appears in Sentry
setUserContext({ id: 'test-user', email: 'test@example.com' });
captureMessage('Test with user context');
```

### Test Breadcrumbs

```typescript
// Verify breadcrumbs appear in error
addBreadcrumb({ category: 'test', message: 'Test breadcrumb 1' });
addBreadcrumb({ category: 'test', message: 'Test breadcrumb 2' });
throw new Error('Test error with breadcrumbs');
```

## Common Patterns

### Form Submission Error

```typescript
const handleSubmit = async (data) => {
  addUserActionBreadcrumb('submit', 'Subscription Form');

  try {
    await createSubscription(data);
    captureMessage('Subscription created', 'info');
  } catch (error) {
    captureException(error, {
      component: 'SubscriptionForm',
      action: 'handleSubmit',
      formData: sanitizeData(data),
    });
    toast.showError('Failed to create subscription');
  }
};
```

### Network Request Error

```typescript
const fetchData = async () => {
  const transaction = startTransaction('fetch_subscriptions', 'http');

  try {
    const response = await api.get('/subscriptions');
    addAPIBreadcrumb('GET', '/subscriptions', response.status);
    transaction?.setStatus('ok');
    return response.data;
  } catch (error) {
    addAPIBreadcrumb('GET', '/subscriptions');
    transaction?.setStatus('internal_error');

    captureException(error, {
      url: '/subscriptions',
      method: 'GET',
    });

    throw error;
  } finally {
    transaction?.finish();
  }
};
```

### Navigation Error

```typescript
const handleNavigate = (screen: string) => {
  try {
    addNavigationBreadcrumb(currentScreen, screen);
    navigation.navigate(screen);
  } catch (error) {
    captureException(error, {
      from: currentScreen,
      to: screen,
    });
  }
};
```

## Troubleshooting

### Issue: No Events in Sentry

**Check**:
1. Is `SENTRY_DSN` set correctly?
2. Is app in production mode?
3. Check network connectivity
4. Verify Sentry is initialized

**Solution**:
```typescript
import { isSentryEnabled } from '@/services/sentry';

if (!isSentryEnabled()) {
  console.log('Sentry is disabled');
}
```

### Issue: Stack Traces Not Readable

**Problem**: Shows minified code

**Solution**:
1. Ensure source maps are uploaded
2. Check Sentry release matches
3. Verify organization/project in app.json

### Issue: Too Many Events

**Problem**: Hitting event quota

**Solution**:
```typescript
// Reduce sample rate
tracesSampleRate: 0.1, // 10% of transactions

// Filter events
beforeSend(event) {
  // Ignore certain errors
  if (event.message?.includes('Network request failed')) {
    return null;
  }
  return event;
}
```

## Security

### Sensitive Data

Never send:
- Passwords
- API keys
- Authentication tokens
- Credit card numbers
- Personal identifiable information (beyond user ID/email)

### Sanitization

```typescript
const sanitizeData = (data: any) => {
  const { password, apiKey, token, ...safe } = data;
  return safe;
};

captureException(error, {
  formData: sanitizeData(formData),
});
```

## Performance Impact

Sentry has minimal performance impact:
- Events sent asynchronously
- Batched uploads
- Network-aware (won't block offline)
- Local caching

## Cost Optimization

### Reduce Event Volume

1. Use sample rates
2. Filter noisy errors
3. Group similar issues
4. Set proper alert thresholds

### Monitor Usage

Check Sentry dashboard:
- Events per month
- Quota usage
- Most frequent errors

## Related Files

- [sentry.ts](../src/services/sentry.ts) - Sentry service
- [App.tsx](../App.tsx) - Initialization
- [authStore.ts](../src/features/auth/store/authStore.ts) - User context
- [ErrorBoundary.tsx](../src/components/ErrorBoundary.tsx) - Error boundary integration
- [app.json](../app.json) - Source map configuration
- [.env.example](../.env.example) - Environment variables
