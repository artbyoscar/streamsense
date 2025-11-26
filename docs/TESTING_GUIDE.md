# Testing Guide for StreamSense

Guide for testing error handling, performance optimizations, and Sentry integration.

## Prerequisites

### 1. Environment Setup

Make sure your `.env` file is configured:

```bash
# Copy from example
cp .env.example .env

# Edit .env and add your credentials
EXPO_PUBLIC_SUPABASE_URL=your-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key
SENTRY_DSN=your-sentry-dsn  # Optional for now
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npx expo start
```

Then press:
- `a` for Android emulator
- `i` for iOS simulator
- Scan QR code for physical device

---

## Testing Error Handling

### 1. Test ErrorView Component

Create a test screen to trigger errors:

**Create**: `src/screens/TestScreen.tsx`

```typescript
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Button, ErrorView } from '@/components';

export const TestScreen = () => {
  const [showError, setShowError] = useState(false);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        {/* Test ErrorView */}
        <Button onPress={() => setShowError(!showError)}>
          Toggle Error View
        </Button>

        {showError && (
          <ErrorView
            title="Test Error"
            message="This is a test error message"
            onRetry={() => setShowError(false)}
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  section: { marginBottom: 24 },
});
```

**Expected**: Error icon, message, and retry button appear.

### 2. Test Skeleton Loaders

```typescript
import {
  SkeletonListItem,
  SkeletonCard,
  SkeletonSubscriptionCard,
  SkeletonDashboard,
} from '@/components';

// Add to TestScreen
<View style={styles.section}>
  <SkeletonListItem />
  <SkeletonCard />
  <SkeletonSubscriptionCard />
  <SkeletonDashboard />
</View>
```

**Expected**: Animated shimmer loading placeholders.

### 3. Test Toast Notifications

```typescript
import { useToast } from '@/components';

const TestToasts = () => {
  const toast = useToast();

  return (
    <View>
      <Button onPress={() => toast.showSuccess('Success!')}>
        Show Success
      </Button>
      <Button onPress={() => toast.showError('Error occurred!')}>
        Show Error
      </Button>
      <Button onPress={() => toast.showWarning('Warning message')}>
        Show Warning
      </Button>
      <Button onPress={() => toast.showInfo('Info message')}>
        Show Info
      </Button>
    </View>
  );
};
```

**Expected**: Toast appears at bottom with appropriate color/icon.

### 4. Test Offline Banner

```bash
# In your device/simulator:
# 1. Turn on Airplane Mode
# 2. Check if red "No Internet Connection" banner appears at top
# 3. Turn off Airplane Mode
# 4. Check if banner slides away
```

**Expected**: Banner animates in/out based on connectivity.

### 5. Test Network Status Hook

```typescript
import { useNetworkStatus } from '@/hooks';

const NetworkTest = () => {
  const network = useNetworkStatus();

  return (
    <View>
      <Text>Connected: {network.isConnected ? 'Yes' : 'No'}</Text>
      <Text>Type: {network.type}</Text>
      <Text>Offline: {network.isOffline ? 'Yes' : 'No'}</Text>
    </View>
  );
};
```

**Expected**: Network status updates when connectivity changes.

### 6. Test Error Boundary

```typescript
const CrashButton = () => {
  const [crash, setCrash] = useState(false);

  if (crash) {
    throw new Error('Test crash!');
  }

  return (
    <Button onPress={() => setCrash(true)}>
      Trigger Crash
    </Button>
  );
};
```

**Expected**: Error boundary catches crash and shows fallback UI.

### 7. Test Error Handling Utilities

Open React Native Debugger console:

```typescript
import { parseApiError, getUserFriendlyMessage, categorizeError } from '@/utils';

// Simulate API error
const testError = {
  code: 'PGRST301',
  message: 'JWT expired',
};

console.log('Parsed:', parseApiError(testError));
console.log('User Message:', getUserFriendlyMessage(testError));
console.log('Category:', categorizeError(testError));
```

**Expected**: Console shows parsed error details.

---

## Testing Performance Optimizations

### 1. Test React.memo Components

Install React DevTools:
```bash
npm install -g react-devtools
react-devtools
```

**Steps**:
1. Open React DevTools Profiler
2. Start recording
3. Navigate through app
4. Check Card/Button components don't re-render unnecessarily

**Expected**: Memoized components skip renders when props unchanged.

### 2. Test Debounce Hook

```typescript
import { useDebounce } from '@/utils';

const SearchTest = () => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    console.log('Search triggered:', debouncedQuery);
  }, [debouncedQuery]);

  return (
    <TextInput
      value={query}
      onChangeText={setQuery}
      placeholder="Type to search..."
    />
  );
};
```

**Expected**: Console logs only after 500ms of stopped typing.

### 3. Test Throttle Hook

```typescript
import { useThrottle } from '@/utils';

const ScrollTest = () => {
  const [scrollY, setScrollY] = useState(0);
  const throttledScrollY = useThrottle(scrollY, 100);

  return (
    <ScrollView onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}>
      <Text>Scroll Position: {throttledScrollY}</Text>
    </ScrollView>
  );
};
```

**Expected**: Value updates max once per 100ms.

### 4. Test OptimizedImage

```typescript
import { OptimizedImage, Avatar, Logo } from '@/components';

<View>
  {/* Basic image */}
  <OptimizedImage
    source={{ uri: 'https://picsum.photos/200' }}
    width={200}
    height={200}
  />

  {/* Avatar */}
  <Avatar
    source={{ uri: 'https://i.pravatar.cc/150?img=1' }}
    name="John Doe"
    size={48}
  />

  {/* Logo */}
  <Logo
    source={{ uri: 'https://logo.clearbit.com/netflix.com' }}
    name="Netflix"
    size={40}
  />
</View>
```

**Expected**: Images load with placeholder, cached for subsequent views.

### 5. Test Performance Measurement

```typescript
import { measurePerformance } from '@/utils';

const slowFunction = async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return 'Done';
};

// Wrap with measurement
const result = await measurePerformance('slowFunction', slowFunction);
// Check console: [Performance] slowFunction: 1000.xx ms
```

**Expected**: Console logs execution time.

### 6. Test Render Performance Tracking

```typescript
import { useRenderPerformance, useWhyDidYouUpdate } from '@/utils';

const HeavyComponent = ({ data, count }) => {
  useRenderPerformance('HeavyComponent');
  useWhyDidYouUpdate('HeavyComponent', { data, count });

  return <View>{/* ... */}</View>;
};
```

**Expected**: Console shows render count/time and why re-renders happen.

### 7. Test Startup Time

Check console on app launch:
```
[Performance] App started in X ms
[Performance] Time to interactive (ScreenName): Y ms
```

**Expected**: Startup metrics logged.

---

## Testing Sentry Integration

### 1. Setup Sentry (Optional)

If you want to see errors in Sentry dashboard:

1. Go to [sentry.io](https://sentry.io)
2. Create free account
3. Create new React Native project
4. Copy DSN to `.env`:
   ```bash
   SENTRY_DSN=https://your-key@sentry.io/your-project-id
   ```

**Note**: Sentry only works in production builds. For testing, we'll verify the integration works locally.

### 2. Test Error Capture

```typescript
import { captureException, captureMessage } from '@/services/sentry';

const SentryTest = () => {
  return (
    <View>
      <Button onPress={() => {
        captureException(new Error('Test error'), {
          component: 'TestScreen',
          action: 'testButton',
        });
      }}>
        Capture Exception
      </Button>

      <Button onPress={() => {
        captureMessage('Test message', 'info', {
          customData: 'test',
        });
      }}>
        Capture Message
      </Button>
    </View>
  );
};
```

**Expected**: Console shows Sentry is disabled (dev mode) or events sent (production).

### 3. Test User Context

```typescript
import { setUserContext, clearUserContext } from '@/services/sentry';

// After login (already integrated in authStore)
setUserContext({
  id: 'test-user-123',
  email: 'test@example.com',
  isPremium: false,
});

// After logout
clearUserContext();
```

**Expected**: User context set/cleared (check in login/logout flow).

### 4. Test Breadcrumbs

```typescript
import {
  addBreadcrumb,
  addNavigationBreadcrumb,
  addAPIBreadcrumb,
  addUserActionBreadcrumb,
} from '@/services/sentry';

// Navigation breadcrumb
addNavigationBreadcrumb('Home', 'Settings');

// API breadcrumb
addAPIBreadcrumb('GET', '/subscriptions', 200);

// User action
addUserActionBreadcrumb('click', 'Add Subscription Button');

// Generic breadcrumb
addBreadcrumb({
  category: 'user',
  message: 'User completed onboarding',
  level: 'info',
});
```

**Expected**: Breadcrumbs attached to next error (visible in Sentry dashboard).

### 5. Test Performance Monitoring

```typescript
import { startTransaction, measureOperation } from '@/services/sentry';

// Manual transaction
const TestTransaction = async () => {
  const transaction = startTransaction('test_operation', 'task');

  // Do work
  await new Promise(resolve => setTimeout(resolve, 1000));

  transaction?.finish();
};

// Measured operation
const data = await measureOperation('fetchData', async () => {
  const response = await fetch('https://api.example.com/data');
  return response.json();
});
```

**Expected**: Performance data sent to Sentry (production builds).

### 6. Test Production Build

To fully test Sentry, create a production build:

```bash
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

Then:
1. Install the production build
2. Trigger an error
3. Check Sentry dashboard for the error event

---

## Quick Testing Checklist

### Error Handling ✓
- [ ] ErrorView displays with retry button
- [ ] Skeleton loaders animate correctly
- [ ] Toast notifications show for all types
- [ ] Offline banner appears when disconnected
- [ ] Network status hook updates
- [ ] Error boundary catches crashes
- [ ] Error utilities parse API errors

### Performance ✓
- [ ] Memoized components don't re-render unnecessarily
- [ ] Debounce delays function calls
- [ ] Throttle limits function calls
- [ ] OptimizedImage caches images
- [ ] Avatar shows fallback initials
- [ ] Performance measurement logs times
- [ ] Startup time tracked

### Sentry ✓
- [ ] Error capture works (check console in dev)
- [ ] User context set on login
- [ ] User context cleared on logout
- [ ] Breadcrumbs added for actions
- [ ] Performance transactions tracked
- [ ] Error boundary sends to Sentry
- [ ] Auth events create breadcrumbs

---

## Testing in Real Scenarios

### 1. Login Flow Test

1. Go to Login screen
2. Check skeleton loader while loading
3. Enter wrong credentials
4. See error toast
5. Enter correct credentials
6. Check user context set (console log)
7. Check success toast

### 2. Subscription List Test

1. Navigate to subscriptions
2. Check skeleton cards while loading
3. Scroll quickly (test throttle/virtualization)
4. Toggle offline mode
5. Check offline banner appears
6. Try to refresh
7. See error toast

### 3. Network Error Test

1. Turn on Airplane Mode
2. Try to fetch data
3. Check offline banner
4. Check error view with retry
5. Turn off Airplane Mode
6. Tap retry
7. Check data loads

### 4. Image Loading Test

1. Navigate to screen with images
2. Check placeholder/blurhash
3. Watch images load
4. Navigate away and back
5. Check images load instantly (cached)

### 5. Error Boundary Test

1. Create intentional crash (throw error)
2. Check error boundary catches it
3. Check error sent to Sentry (console)
4. Check fallback UI shows
5. Tap "Try Again" button
6. App recovers

---

## Debugging Tips

### Enable Verbose Logging

```typescript
// In App.tsx
if (__DEV__) {
  global.LOG_LEVEL = 'debug';
}
```

### Check Sentry Events Locally

```typescript
import { getSentryClient } from '@/services/sentry';

const client = getSentryClient();
console.log('Sentry enabled:', client !== null);
```

### Monitor Network Requests

```bash
# Enable network inspector
npx react-native log-android  # Android
npx react-native log-ios      # iOS
```

### Check Performance

```typescript
// Use React DevTools Profiler
// Look for:
// - Unnecessary renders
// - Long render times
// - Cascade renders
```

---

## Next Steps

After testing locally:

1. **Production Build**: Create production build to test Sentry fully
2. **Performance Profiling**: Use React DevTools to find bottlenecks
3. **Error Monitoring**: Monitor Sentry dashboard for real errors
4. **User Testing**: Get feedback on error messages/loading states
5. **Optimization**: Based on profiling, add more memoization where needed

---

## Common Issues

### Issue: Sentry Not Working

**Solution**: Sentry only works in production. In development, check console for "Sentry is disabled" message.

### Issue: Images Not Caching

**Solution**: Clear expo cache: `npx expo start -c`

### Issue: Toast Not Showing

**Solution**: Ensure app wrapped with `<ToastProvider>` in App.tsx

### Issue: Network Status Not Updating

**Solution**: Check device permissions for network access

### Issue: Performance Hooks Not Logging

**Solution**: Check `LOG_LEVEL` and ensure `__DEV__` is true

---

## Related Documentation

- [Error Handling Guide](./ERROR_HANDLING.md)
- [Error Handling Examples](./ERROR_HANDLING_EXAMPLES.md)
- [Performance Guide](./PERFORMANCE.md)
- [Sentry Integration](./SENTRY_INTEGRATION.md)
