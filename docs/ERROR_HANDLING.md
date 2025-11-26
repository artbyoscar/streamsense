# Error Handling and Loading States

Comprehensive error handling and loading state system for StreamSense.

## Overview

StreamSense implements a robust error handling system with:
- ✅ ErrorView component for displaying errors with retry
- ✅ SkeletonLoader components for loading states
- ✅ Error parsing and logging utilities
- ✅ Toast notifications for success/error messages
- ✅ Network connectivity detection with offline banner
- ✅ ErrorBoundary to catch crashes gracefully

## Components

### ErrorView

Displays error states with optional retry functionality.

**Location**: [src/components/ErrorView.tsx](../src/components/ErrorView.tsx)

**Props**:
```typescript
{
  error?: Error | string | null;
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  fullScreen?: boolean;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}
```

**Usage**:
```typescript
// Simple error with retry
<ErrorView
  error={error}
  onRetry={refetch}
/>

// Custom messaging
<ErrorView
  title="Connection Failed"
  message="Unable to load subscriptions. Please check your connection."
  onRetry={handleRetry}
  retryLabel="Try Again"
/>

// Full screen error
<ErrorView
  error={error}
  onRetry={refetch}
  fullScreen
/>

// Custom icon
<ErrorView
  error={error}
  icon="wifi-off"
  onRetry={refetch}
/>
```

**Features**:
- Error icon in colored circle
- Customizable title and message
- Retry button (optional)
- Full screen mode
- Automatic error message extraction

### SkeletonLoader

Animated loading placeholders with multiple variants.

**Location**: [src/components/SkeletonLoader.tsx](../src/components/SkeletonLoader.tsx)

**Components**:

#### SkeletonListItem
```typescript
<SkeletonListItem
  showAvatar
  showSubtitle
  avatarSize={48}
/>
```

#### SkeletonCard
```typescript
<SkeletonCard
  showImage
  imageHeight={200}
  lines={3}
/>
```

#### SkeletonSubscriptionCard
```typescript
<SkeletonSubscriptionCard />
```

#### SkeletonDashboard
```typescript
<SkeletonDashboard />
```

#### SkeletonList
```typescript
<SkeletonList
  count={5}
  showAvatar
  showSubtitle
/>
```

#### SkeletonFullScreen
```typescript
<SkeletonFullScreen />
```

**Features**:
- Shimmer animation (pulsing opacity)
- Multiple pre-built variants
- Customizable sizes and layouts
- Consistent with app design system

**Usage in Screens**:
```typescript
const DashboardScreen = () => {
  const { data, isLoading, error, refetch } = useSubscriptions();

  if (isLoading) {
    return <SkeletonDashboard />;
  }

  if (error) {
    return <ErrorView error={error} onRetry={refetch} fullScreen />;
  }

  return <View>{/* Actual content */}</View>;
};
```

### ErrorBoundary

Catches JavaScript errors anywhere in the component tree.

**Location**: [src/components/ErrorBoundary.tsx](../src/components/ErrorBoundary.tsx)

**Props**:
```typescript
{
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: any[];
}
```

**Usage**:
```typescript
// Basic usage (wraps entire app)
<ErrorBoundary>
  <App />
</ErrorBoundary>

// With custom fallback
<ErrorBoundary fallback={<CustomErrorScreen />}>
  <App />
</ErrorBoundary>

// With error callback
<ErrorBoundary
  onError={(error, errorInfo) => {
    logErrorToService(error, errorInfo);
  }}
>
  <App />
</ErrorBoundary>

// Reset on props change
<ErrorBoundary resetOnPropsChange={[userId]}>
  <UserProfile userId={userId} />
</ErrorBoundary>
```

**Features**:
- Catches all JavaScript errors in child tree
- Shows friendly error UI with retry button
- Logs errors automatically
- Shows stack trace in dev mode
- Contact Support button
- Auto-reset on prop changes

### Toast Notifications

Global toast system using React Native Paper Snackbar.

**Location**: [src/components/Toast.tsx](../src/components/Toast.tsx)

**Setup**:
```typescript
// Wrap app with ToastProvider
<ToastProvider>
  <App />
</ToastProvider>
```

**Usage**:
```typescript
const Component = () => {
  const toast = useToast();

  const handleSuccess = () => {
    toast.showSuccess('Subscription added successfully!');
  };

  const handleError = () => {
    toast.showError('Failed to save changes');
  };

  const handleWarning = () => {
    toast.showWarning('This action cannot be undone');
  };

  const handleInfo = () => {
    toast.showInfo('New update available');
  };

  // Custom toast with action
  const handleDelete = () => {
    toast.showToast({
      message: 'Subscription deleted',
      type: 'success',
      duration: 5000,
      action: {
        label: 'Undo',
        onPress: () => restoreSubscription(),
      },
    });
  };
};
```

**Toast Types**:
- `success` - Green background, check-circle icon (3s)
- `error` - Red background, alert-circle icon (5s)
- `warning` - Orange background, alert icon (4s)
- `info` - Blue background, information icon (3s)

**Features**:
- Multiple toast types
- Customizable duration
- Optional action button
- Auto-dismiss
- Positioned above bottom tabs

### OfflineBanner

Shows a banner when device is offline.

**Location**: [src/components/OfflineBanner.tsx](../src/components/OfflineBanner.tsx)

**Setup**:
```typescript
// Add to App.tsx
<App>
  <OfflineBanner />
  {/* Rest of app */}
</App>
```

**Features**:
- Automatically detects network status
- Slides in/out with animation
- Shows "No internet connection" message
- Wi-Fi off icon
- Red background (error color)
- Fixed to top of screen

### Network Status Hook

Monitor network connectivity status.

**Location**: [src/hooks/useNetworkStatus.ts](../src/hooks/useNetworkStatus.ts)

**Usage**:
```typescript
const Component = () => {
  const { isConnected, isOffline, type } = useNetworkStatus();

  if (isOffline) {
    return <OfflineMessage />;
  }

  return <View>{/* Content */}</View>;
};

// Use with queries
const { isOffline } = useNetworkStatus();
const { data } = useQuery({
  queryKey: ['subscriptions'],
  queryFn: fetchSubscriptions,
  enabled: !isOffline, // Only fetch when online
});
```

**Return Value**:
```typescript
{
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null; // 'wifi', 'cellular', etc.
  isOffline: boolean;
}
```

## Utilities

### Error Handling Utilities

Parse, format, and log errors consistently.

**Location**: [src/utils/errorHandling.ts](../src/utils/errorHandling.ts)

#### parseApiError

Parse errors into consistent format.

```typescript
try {
  const { data, error } = await supabase.from('table').select();
  if (error) throw error;
} catch (error) {
  const parsed = parseApiError(error);
  console.log(parsed.userMessage); // User-friendly message
  console.log(parsed.code); // Error code
}
```

**Returns**:
```typescript
{
  code: string;
  message: string;
  userMessage: string;
  originalError: unknown;
  context?: Record<string, unknown>;
}
```

#### getUserFriendlyMessage

Get user-friendly message from any error.

```typescript
const message = getUserFriendlyMessage(error);
Alert.alert('Error', message);
```

#### logError

Log error with context for debugging.

```typescript
try {
  await fetchData();
} catch (error) {
  logError(error, {
    component: 'Dashboard',
    action: 'fetchSubscriptions',
    userId: user.id,
  });
}
```

#### categorizeError

Categorize error type for different handling strategies.

```typescript
const category = categorizeError(error);
// Returns: 'network' | 'auth' | 'validation' | 'not_found' | 'permission' | 'server' | 'unknown'

if (category === 'network') {
  showOfflineBanner();
} else if (category === 'auth') {
  redirectToLogin();
}
```

#### isRetryableError

Determine if error is retryable.

```typescript
if (isRetryableError(error)) {
  showRetryButton();
} else {
  showContactSupport();
}
```

#### handleApiCall

Wrapper for API calls with automatic error parsing.

```typescript
const subscriptions = await handleApiCall(
  () => supabase.from('subscriptions').select(),
  { component: 'Dashboard', action: 'fetchSubscriptions' }
);
```

#### getErrorSuggestions

Get suggested recovery actions.

```typescript
const suggestions = getErrorSuggestions(error);
// Returns: ['Check your internet connection', 'Try again in a few moments']

suggestions.forEach(suggestion => {
  console.log(`• ${suggestion}`);
});
```

## Error Code Mappings

The system includes built-in error messages for common scenarios:

### Network Errors
- `FETCH_ERROR` - "Unable to connect to the server..."
- `NETWORK_ERROR` - "Network connection lost..."
- `TIMEOUT_ERROR` - "The request took too long..."

### Auth Errors
- `INVALID_CREDENTIALS` - "Invalid email or password..."
- `USER_NOT_FOUND` - "No account found..."
- `EMAIL_EXISTS` - "An account with this email already exists..."
- `SESSION_EXPIRED` - "Your session has expired..."
- `UNAUTHORIZED` - "You are not authorized..."

### Database Errors
- `PGRST116` - "The requested data could not be found..."
- `PGRST301` - "You do not have permission..."
- `23505` - "This record already exists..."
- `23503` - "Cannot delete this record..."

### Generic Errors
- `UNKNOWN_ERROR` - "Something went wrong..."
- `SERVER_ERROR` - "Server error. Please try again later..."

## Implementation Guide

### 1. Wrap App with Error Handling

```typescript
// App.tsx
import { ErrorBoundary, ToastProvider, OfflineBanner } from './src/components';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <OfflineBanner />
        <YourApp />
      </ToastProvider>
    </ErrorBoundary>
  );
}
```

### 2. Add Error Handling to Screens

```typescript
import { ErrorView, SkeletonDashboard } from '@/components';
import { logError, getUserFriendlyMessage } from '@/utils';
import { useToast } from '@/components';

const DashboardScreen = () => {
  const toast = useToast();
  const { data, isLoading, error, refetch } = useSubscriptions();

  // Loading state
  if (isLoading) {
    return <SkeletonDashboard />;
  }

  // Error state
  if (error) {
    return (
      <ErrorView
        error={error}
        onRetry={refetch}
        fullScreen
      />
    );
  }

  // Success with data
  return <View>{/* Content */}</View>;
};
```

### 3. Add Error Handling to Mutations

```typescript
const Component = () => {
  const toast = useToast();

  const handleSave = async () => {
    try {
      const result = await handleApiCall(
        () => supabase.from('table').insert(data),
        { component: 'Component', action: 'handleSave' }
      );

      toast.showSuccess('Saved successfully!');
    } catch (error) {
      const message = getUserFriendlyMessage(error);
      toast.showError(message);
    }
  };
};
```

### 4. Add Network Detection

```typescript
const Component = () => {
  const { isOffline } = useNetworkStatus();
  const toast = useToast();

  const handleAction = () => {
    if (isOffline) {
      toast.showWarning('You are offline. Please check your connection.');
      return;
    }

    // Proceed with action
  };
};
```

## Best Practices

### 1. Always Show Loading States

```typescript
// ✅ Good
if (isLoading) return <SkeletonDashboard />;
if (error) return <ErrorView error={error} onRetry={refetch} />;
return <Dashboard data={data} />;

// ❌ Bad
if (!data) return null; // User sees blank screen
return <Dashboard data={data} />;
```

### 2. Provide Retry Functionality

```typescript
// ✅ Good
<ErrorView error={error} onRetry={refetch} />

// ❌ Bad
<Text>Error: {error.message}</Text> // No way to recover
```

### 3. Use Appropriate Toast Types

```typescript
// ✅ Good
toast.showSuccess('Subscription added!');
toast.showError('Failed to save');
toast.showWarning('This will delete your data');
toast.showInfo('New feature available');

// ❌ Bad
toast.showSuccess('Error occurred'); // Wrong type
toast.showInfo('Data deleted'); // Should be warning
```

### 4. Log Errors with Context

```typescript
// ✅ Good
logError(error, {
  component: 'SubscriptionForm',
  action: 'handleSubmit',
  subscriptionId: id,
  userId: user.id,
});

// ❌ Bad
console.error(error); // No context
```

### 5. Handle Network Errors Gracefully

```typescript
// ✅ Good
const { isOffline } = useNetworkStatus();

useEffect(() => {
  if (isOffline) {
    toast.showWarning('You are offline. Some features may be limited.');
  }
}, [isOffline]);

// ❌ Bad
// Ignore network status, let queries fail
```

### 6. Use Correct Skeleton for Context

```typescript
// ✅ Good
// Dashboard
if (isLoading) return <SkeletonDashboard />;

// List screen
if (isLoading) return <SkeletonList count={10} />;

// Card-based screen
if (isLoading) return <SkeletonCard showImage lines={3} />;

// ❌ Bad
if (isLoading) return <ActivityIndicator />; // Generic, not contextual
```

## Testing Error Handling

### Simulate Network Errors

```typescript
// In development
if (__DEV__) {
  throw new Error('Network Error: Failed to fetch');
}
```

### Simulate Offline Mode

```typescript
// Toggle airplane mode on device
// Or use React Native Debugger network throttling
```

### Test ErrorBoundary

```typescript
// Create a component that throws
const BrokenComponent = () => {
  throw new Error('Test error boundary');
  return null;
};

// Wrap in ErrorBoundary to test
<ErrorBoundary>
  <BrokenComponent />
</ErrorBoundary>
```

### Test Toast Notifications

```typescript
// Test all types
toast.showSuccess('Success message');
toast.showError('Error message');
toast.showWarning('Warning message');
toast.showInfo('Info message');

// Test with action
toast.showToast({
  message: 'Item deleted',
  type: 'success',
  action: {
    label: 'Undo',
    onPress: () => console.log('Undo clicked'),
  },
});
```

## Troubleshooting

### Toast Not Showing

**Problem**: Toast doesn't appear when called.

**Solution**:
1. Ensure ToastProvider wraps your app
2. Check you're using `useToast()` hook inside ToastProvider
3. Verify z-index isn't being overridden

### ErrorBoundary Not Catching Errors

**Problem**: Errors crash the app instead of showing ErrorBoundary.

**Solution**:
1. ErrorBoundary only catches render errors, not async errors
2. For async errors, use try/catch and show ErrorView
3. Ensure ErrorBoundary wraps the component that's throwing

### Skeleton Not Animating

**Problem**: Skeleton shows but doesn't animate.

**Solution**:
1. Check `useNativeDriver: true` is set
2. Verify animation is starting in useEffect
3. Test on actual device (some emulators have issues)

### Offline Banner Not Showing

**Problem**: Banner doesn't appear when offline.

**Solution**:
1. Check OfflineBanner is rendered in App.tsx
2. Verify NetInfo package is installed correctly
3. Test on actual device (emulator network detection varies)

## Related Files

- [ErrorView.tsx](../src/components/ErrorView.tsx)
- [SkeletonLoader.tsx](../src/components/SkeletonLoader.tsx)
- [ErrorBoundary.tsx](../src/components/ErrorBoundary.tsx)
- [Toast.tsx](../src/components/Toast.tsx)
- [OfflineBanner.tsx](../src/components/OfflineBanner.tsx)
- [errorHandling.ts](../src/utils/errorHandling.ts)
- [useNetworkStatus.ts](../src/hooks/useNetworkStatus.ts)
