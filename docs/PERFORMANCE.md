# Performance Optimization Guide

Comprehensive guide for optimizing StreamSense performance.

## Overview

StreamSense implements multiple performance optimizations:
- ✅ React.memo for pure components
- ✅ Debouncing and throttling utilities
- ✅ Optimized image loading with expo-image
- ✅ React Query caching and prefetching
- ✅ Performance monitoring utilities
- ✅ Startup time tracking

## Components Optimization

### React.memo

All presentational components are wrapped with `React.memo` to prevent unnecessary re-renders.

**Components with React.memo**:
- [Card](../src/components/Card.tsx)
- [Button](../src/components/Button.tsx)
- [OptimizedImage](../src/components/OptimizedImage.tsx)
- [Avatar](../src/components/OptimizedImage.tsx)
- [Logo](../src/components/OptimizedImage.tsx)

**When to use React.memo**:
```typescript
// Pure presentational component - YES
export const UserCard = React.memo(({ user }) => {
  return <Card>{user.name}</Card>;
});

// Component with hooks/state - MAYBE (test first)
export const UserProfile = React.memo(({ userId }) => {
  const { data } = useUser(userId);
  return <View>{data?.name}</View>;
});

// Component with frequently changing props - NO
export const LiveCounter = ({ count }) => {
  // Don't memo - count changes every second
  return <Text>{count}</Text>;
};
```

### Custom Comparison Functions

```typescript
import { deepEqual, shallowEqual } from '@/utils';

// Deep comparison (expensive, use sparingly)
export const ComplexComponent = React.memo(Component, deepEqual);

// Shallow comparison (default React.memo behavior)
export const SimpleComponent = React.memo(Component, shallowEqual);

// Custom comparison
export const CustomComponent = React.memo(Component, (prev, next) => {
  return prev.id === next.id && prev.status === next.status;
});
```

## List Optimization

### Use FlatList for Long Lists

```typescript
// ✅ Good - Virtualized list
<FlatList
  data={subscriptions}
  renderItem={({ item }) => <SubscriptionItem item={item} />}
  keyExtractor={(item) => item.id}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  windowSize={5}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>

// ❌ Bad - Maps entire array
{subscriptions.map(item => (
  <SubscriptionItem key={item.id} item={item} />
))}
```

### FlatList Performance Props

```typescript
<FlatList
  // Rendering optimization
  removeClippedSubviews={true} // Unmount items off-screen
  maxToRenderPerBatch={10} // Max items to render per batch
  updateCellsBatchingPeriod={50} // Batch updates every 50ms
  windowSize={5} // Items to keep in memory (viewport * windowSize)

  // Item optimization
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })} // Skip measurement if all items same height

  // Performance
  initialNumToRender={10} // Initial render count
  legacyImplementation={false} // Use new implementation

  // Memoize item component
  renderItem={renderItem} // Define outside component
  keyExtractor={keyExtractor} // Define outside component
/>
```

### Memoized renderItem

```typescript
const SubscriptionList = ({ subscriptions }) => {
  const renderItem = useCallback(({ item }) => (
    <SubscriptionItem item={item} />
  ), []);

  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <FlatList
      data={subscriptions}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
    />
  );
};

// Memo the list item
const SubscriptionItem = React.memo(({ item }) => {
  return <Card>{item.service_name}</Card>;
});
```

## Image Optimization

### OptimizedImage Component

**Location**: [src/components/OptimizedImage.tsx](../src/components/OptimizedImage.tsx)

**Features**:
- Automatic caching (memory + disk)
- Blurhash placeholders
- Priority loading
- Lazy loading
- Optimized sizes

**Usage**:
```typescript
import { OptimizedImage, Avatar, Logo } from '@/components';

// Basic usage
<OptimizedImage
  source={{ uri: posterUrl }}
  width="100%"
  aspectRatio={16/9}
  contentFit="cover"
/>

// With placeholder
<OptimizedImage
  source={{ uri: imageUrl }}
  width={300}
  height={200}
  blurhash="LGF5?xYk^6#M@-5c,1J5@[or[Q6."
/>

// High priority (above fold)
<OptimizedImage
  source={{ uri: heroImage }}
  priority="high"
  cachePolicy="memory-disk"
/>

// Avatar with fallback
<Avatar
  source={{ uri: avatarUrl }}
  name="John Doe"
  size={48}
/>

// Service logo
<Logo
  source={{ uri: logoUrl }}
  name="Netflix"
  size={40}
/>
```

### Image Size Optimization

```typescript
// ✅ Good - Specify exact sizes
<OptimizedImage source={uri} width={100} height={100} />

// ✅ Good - Use aspect ratio
<OptimizedImage source={uri} aspectRatio={16/9} width="100%" />

// ❌ Bad - No size specified
<OptimizedImage source={uri} />
```

### Image Caching Strategies

```typescript
// Critical images (above fold)
priority="high"
cachePolicy="memory-disk"

// Regular images
priority="normal"
cachePolicy="memory-disk"

// Low priority (below fold, avatars)
priority="low"
cachePolicy="disk"
```

## React Query Optimization

### Configuration

**Location**: [src/config/reactQuery.ts](../src/config/reactQuery.ts)

**Optimized Settings**:
```typescript
{
  staleTime: 5 * 60 * 1000,      // 5 min - data stays fresh
  gcTime: 10 * 60 * 1000,        // 10 min - unused data kept
  refetchOnWindowFocus: true,     // Refetch on app foreground
  refetchOnReconnect: true,       // Refetch when online
  retry: 3,                       // Retry failed requests
  networkMode: 'online',          // Only fetch when online
}
```

### Query Keys

Use centralized query keys for type safety:

```typescript
import { queryKeys } from '@/config/reactQuery';

// ✅ Good - Type-safe keys
const { data } = useQuery({
  queryKey: queryKeys.subscriptions,
  queryFn: fetchSubscriptions,
});

// ❌ Bad - String keys (typos, inconsistency)
const { data } = useQuery({
  queryKey: ['subscripitons'], // Typo!
  queryFn: fetchSubscriptions,
});
```

### Prefetching

Prefetch data before navigation:

```typescript
import { prefetchQuery, queryKeys } from '@/config/reactQuery';

const handleNavigate = async () => {
  // Prefetch before navigation
  await prefetchQuery(
    queryKeys.subscriptionDetail(id),
    () => fetchSubscription(id)
  );

  navigation.navigate('SubscriptionDetail', { id });
};
```

### Optimistic Updates

```typescript
import { optimisticUpdate, queryKeys } from '@/config/reactQuery';

const handleToggle = async (id: string, newValue: boolean) => {
  await optimisticUpdate(
    queryKeys.subscriptions,
    (old) => old.map(item =>
      item.id === id ? { ...item, active: newValue } : item
    ),
    () => updateSubscription(id, { active: newValue })
  );
};
```

### Cache Invalidation

```typescript
import { invalidateQueries, queryKeys } from '@/config/reactQuery';

// Invalidate after mutation
const handleCreate = async (data) => {
  await createSubscription(data);

  // Refetch subscriptions list
  await invalidateQueries(queryKeys.subscriptions);
};

// Clear all on logout
import { clearAllQueries } from '@/config/reactQuery';

const handleLogout = async () => {
  await logout();
  clearAllQueries();
};
```

## Performance Utilities

### Debounce

Limit function calls during rapid events (search, typing):

```typescript
import { debounce, useDebounce, useDebouncedCallback } from '@/utils';

// Function debounce
const debouncedSearch = debounce((query: string) => {
  fetchResults(query);
}, 300);

// Value debounce (hook)
const SearchComponent = () => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      fetchResults(debouncedQuery);
    }
  }, [debouncedQuery]);

  return <Input value={query} onChangeText={setQuery} />;
};

// Callback debounce (hook)
const debouncedSave = useDebouncedCallback((data) => {
  saveData(data);
}, 500);
```

### Throttle

Limit function calls during continuous events (scroll):

```typescript
import { throttle, useThrottle } from '@/utils';

// Function throttle
const throttledScroll = throttle(() => {
  updateScrollPosition();
}, 100);

// Value throttle (hook)
const ScrollComponent = () => {
  const [scrollY, setScrollY] = useState(0);
  const throttledScrollY = useThrottle(scrollY, 100);

  useEffect(() => {
    updateHeader(throttledScrollY);
  }, [throttledScrollY]);
};
```

### Performance Measurement

```typescript
import { measurePerformance } from '@/utils';

const fetchData = async () => {
  const data = await measurePerformance('fetchSubscriptions', async () => {
    return await supabase.from('subscriptions').select();
  });
  // Logs: [Performance] fetchSubscriptions: 123.45ms
  return data;
};
```

### Render Performance

```typescript
import { useRenderPerformance, useWhyDidYouUpdate } from '@/utils';

const Component = ({ prop1, prop2 }) => {
  // Track render count and time
  useRenderPerformance('MyComponent');

  // Debug why component re-rendered
  useWhyDidYouUpdate('MyComponent', { prop1, prop2 });

  return <View />;
};
```

## Startup Optimization

### Mark Startup Time

```typescript
import { markAppStart, measureTimeToInteractive } from '@/utils';

// In App.tsx
useEffect(() => {
  markAppStart();
}, []);

// In first interactive screen
const DashboardScreen = () => {
  useEffect(() => {
    measureTimeToInteractive('Dashboard');
  }, []);
};
```

### Lazy Loading

Lazy load screens not needed immediately:

```typescript
// ✅ Good - Lazy load heavy screens
const SettingsScreen = React.lazy(() =>
  import('./features/settings/screens/SettingsScreen')
);

const PremiumScreen = React.lazy(() =>
  import('./features/premium/screens/PremiumScreen')
);

// Wrap with Suspense
<Suspense fallback={<LoadingScreen />}>
  <SettingsScreen />
</Suspense>
```

### Code Splitting

Split large modules:

```typescript
// Instead of
import { heavyFunction1, heavyFunction2, heavyFunction3 } from './utils';

// Use
const utils = await import('./utils');
utils.heavyFunction1();
```

## Best Practices

### 1. Avoid Inline Functions

```typescript
// ❌ Bad - Creates new function on every render
<Button onPress={() => handlePress(id)} />

// ✅ Good - Memoized callback
const handlePressCallback = useCallback(() => {
  handlePress(id);
}, [id]);
<Button onPress={handlePressCallback} />
```

### 2. Avoid Inline Styles

```typescript
// ❌ Bad - Creates new object on every render
<View style={{ padding: 16, backgroundColor: 'white' }} />

// ✅ Good - StyleSheet (cached)
const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'white',
  },
});
<View style={styles.container} />
```

### 3. Memoize Expensive Calculations

```typescript
import { useMemo } from 'react';

const Component = ({ data }) => {
  // ❌ Bad - Recalculates on every render
  const total = data.reduce((sum, item) => sum + item.price, 0);

  // ✅ Good - Only recalculates when data changes
  const total = useMemo(() => {
    return data.reduce((sum, item) => sum + item.price, 0);
  }, [data]);
};
```

### 4. Virtualize Long Lists

```typescript
// ❌ Bad - Renders 1000 items
{items.map(item => <Item key={item.id} item={item} />)}

// ✅ Good - Only renders visible items
<FlatList
  data={items}
  renderItem={({ item }) => <Item item={item} />}
/>
```

### 5. Optimize Images

```typescript
// ❌ Bad - Large images, no caching
<Image source={{ uri: highResUrl }} style={{ width: 50, height: 50 }} />

// ✅ Good - Optimized with caching
<OptimizedImage
  source={{ uri: optimizedUrl }}
  width={50}
  height={50}
  cachePolicy="memory-disk"
/>
```

### 6. Use Proper Keys

```typescript
// ❌ Bad - Index as key (re-renders on reorder)
{items.map((item, index) => <Item key={index} item={item} />)}

// ✅ Good - Stable unique key
{items.map(item => <Item key={item.id} item={item} />)}
```

## Profiling

### React DevTools

1. Install React DevTools extension
2. Enable Profiler
3. Record interaction
4. Analyze flame graph
5. Look for:
   - Components rendering unnecessarily
   - Long render times
   - Cascade renders

### Performance Monitor

Enable on-device performance monitor:

```typescript
// In development
if (__DEV__) {
  import('react-native').then(({ PerformanceMonitor }) => {
    PerformanceMonitor.show();
  });
}
```

### Metrics to Track

- **App startup time**: < 2 seconds
- **Time to interactive**: < 3 seconds
- **FPS**: 60fps (16.67ms per frame)
- **List scroll**: Smooth 60fps
- **Image load time**: < 500ms
- **API response time**: < 1 second

## Performance Checklist

### Before Every Release

- [ ] Profile with React DevTools
- [ ] Test on low-end device
- [ ] Check app bundle size
- [ ] Verify FlatList performance
- [ ] Test offline behavior
- [ ] Check memory leaks
- [ ] Verify image caching
- [ ] Test startup time
- [ ] Check network requests
- [ ] Profile animations (60fps)

### Component Checklist

- [ ] Pure components use React.memo
- [ ] Callbacks use useCallback
- [ ] Expensive calcs use useMemo
- [ ] Styles use StyleSheet
- [ ] Images use OptimizedImage
- [ ] Lists use FlatList
- [ ] Unique keys on lists
- [ ] No inline functions/objects

### Query Checklist

- [ ] Use query keys constants
- [ ] Set appropriate staleTime
- [ ] Enable background refetch
- [ ] Use optimistic updates
- [ ] Prefetch when possible
- [ ] Invalidate after mutations
- [ ] Handle network errors
- [ ] Clear cache on logout

## Common Performance Issues

### Issue: Slow List Scrolling

**Symptoms**: Laggy, low FPS during scroll

**Solutions**:
1. Use FlatList instead of ScrollView
2. Add `getItemLayout` if items same height
3. Memo renderItem and keyExtractor
4. Reduce maxToRenderPerBatch
5. Enable removeClippedSubviews

### Issue: Slow Screen Navigation

**Symptoms**: Delay when opening screens

**Solutions**:
1. Lazy load heavy screens
2. Prefetch data before navigation
3. Use placeholder/skeleton while loading
4. Optimize component tree
5. Reduce initial render items

### Issue: High Memory Usage

**Symptoms**: App crashes, slow performance

**Solutions**:
1. Limit React Query cache time
2. Optimize images (smaller sizes)
3. Remove listeners on unmount
4. Clear intervals/timeouts
5. Fix memory leaks

### Issue: Slow App Startup

**Symptoms**: Long time to first screen

**Solutions**:
1. Lazy load screens
2. Defer non-critical initialization
3. Reduce app bundle size
4. Use React Native Hermes
5. Optimize imports

## Related Files

- [performance.ts](../src/utils/performance.ts) - Performance utilities
- [reactQuery.ts](../src/config/reactQuery.ts) - React Query config
- [OptimizedImage.tsx](../src/components/OptimizedImage.tsx) - Optimized images
- [App.tsx](../App.tsx) - Startup tracking
