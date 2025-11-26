# Dark Mode Fix Guide

## Summary of Changes

This document describes the changes needed to fix dark mode support across StreamSense app. The core issue is that 34+ files import `COLORS` directly from `@/components/theme.ts`, which always returns `LIGHT_COLORS` (line 97 of theme.ts).

## Solution Pattern

For each affected file:

### 1. Add the theme hook import
```typescript
import { useTheme } from '@/providers/ThemeProvider';
```

### 2. Get colors from the hook inside the component
```typescript
export const YourComponent = () => {
  const { colors } = useTheme();
  // ... rest of component
};
```

### 3. Replace COLORS with colors in JSX/runtime code
- **In JSX/TSX**: Replace `COLORS.primary` with `colors.primary`
- **In StyleSheet.create()**: Keep `COLORS` as-is (stylesheets are static)
- **In dynamic styles**: Use `colors` (e.g., `style={[styles.text, { color: colors.gray }]}`)

### 4. Keep COLORS import if used in StyleSheet
```typescript
// Keep this if StyleSheet uses COLORS
import { COLORS } from '@/components/theme';
```

## Files Completed ✅

1. **src/screens/TestScreen.tsx** - Updated all text colors, background colors
2. **src/navigation/MainNavigator.tsx** - Updated header and tab bar colors
3. **src/components/ErrorView.tsx** - Updated error colors and backgrounds
4. **src/components/OfflineBanner.tsx** - Updated banner and text colors
5. **src/components/Card.tsx** - Updated card background and borders
6. **src/components/Input.tsx** - Updated input colors and theme
7. **src/components/EmptyState.tsx** - Updated text and icon colors
8. **src/components/Button.tsx** - Updated button variants
9. **src/components/LoadingScreen.tsx** - Updated spinner and text colors
10. **src/components/ErrorBoundary.tsx** - Skipped (class component - needs wrapper)

## Files Remaining ⏳

### Component Files
- **src/components/PaywallModal.tsx** - Large file with many color references
- **src/components/Toast.tsx** - Toast background colors (lines 100-122)
- **src/components/OptimizedImage.tsx** - Avatar and logo backgrounds (lines 224-237)
- **src/components/SkeletonLoader.tsx** - Skeleton backgrounds (line 293, 302, 321, 338, 363, 384)

### Feature Screen Files
- **src/features/recommendations/screens/RecommendationsScreen.tsx**
- **src/features/watchlist/screens/WatchlistScreen.tsx**
- **src/features/dashboard/screens/DashboardScreen.tsx**
- **src/features/watchlist/screens/ContentSearchScreen.tsx**
- **src/features/dashboard/components/SuggestionsAlert.tsx**
- **src/features/settings/screens/SettingsScreen.tsx**
- **src/features/dashboard/components/QuickActionsCard.tsx**
- **src/features/onboarding/screens/WelcomeScreen.tsx**
- **src/features/dashboard/components/SubscriptionListItem.tsx**
- **src/features/onboarding/screens/OnboardingNavigator.tsx**
- **src/features/subscriptions/screens/SubscriptionFormScreen.tsx**
- **src/features/subscriptions/screens/SubscriptionDetailScreen.tsx**
- **src/features/premium/screens/UpgradeScreen.tsx**
- **src/features/onboarding/screens/SubscriptionReviewScreen.tsx**
- **src/features/onboarding/screens/PlaidConnectionScreen.tsx**
- **src/features/onboarding/screens/PlaidConnectionOnboardingScreen.tsx**
- **src/features/onboarding/screens/FirstInsightsScreen.tsx**
- **src/features/premium/screens/PremiumScreen.tsx**

## Detailed Examples

### Example 1: Simple Text Component
**Before:**
```typescript
import { COLORS } from '@/components/theme';

export const MyComponent = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
  },
  title: {
    color: COLORS.text,
  },
});
```

**After:**
```typescript
import { useTheme } from '@/providers/ThemeProvider';
import { COLORS } from '@/components/theme';

export const MyComponent = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Hello</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background, // Keep for fallback
  },
  title: {
    color: COLORS.text, // Keep for fallback
  },
});
```

### Example 2: Dynamic Color Props
**Before:**
```typescript
<ActivityIndicator color={COLORS.primary} />
<MaterialCommunityIcons name="home" color={COLORS.gray} size={24} />
```

**After:**
```typescript
const { colors } = useTheme();
// ...
<ActivityIndicator color={colors.primary} />
<MaterialCommunityIcons name="home" color={colors.gray} size={24} />
```

### Example 3: Complex Component with Multiple Colors
**Before:**
```typescript
const getButtonColor = (): string => {
  switch (variant) {
    case 'primary': return COLORS.primary;
    case 'error': return COLORS.error;
    default: return COLORS.gray;
  }
};
```

**After:**
```typescript
const { colors } = useTheme();

const getButtonColor = (): string => {
  switch (variant) {
    case 'primary': return colors.primary;
    case 'error': return colors.error;
    default: return colors.gray;
  }
};
```

## Testing Checklist

After updating files:
1. ✅ Test in light mode - all components should look normal
2. ✅ Toggle to dark mode in Settings
3. ✅ Verify all text is readable (light text on dark background)
4. ✅ Verify all backgrounds changed to dark colors
5. ✅ Verify borders and dividers are visible
6. ✅ Test navigation (tab bar, headers should change colors)
7. ✅ Test modals and overlays
8. ✅ Test loading states (spinners, skeletons)

## Color Mappings (Light → Dark)

| Property | Light | Dark |
|----------|-------|------|
| background | #F9FAFB | #111827 |
| surface | #FFFFFF | #1F2937 |
| card | #FFFFFF | #1F2937 |
| text | #1F2937 | #F9FAFB |
| textSecondary | #6B7280 | #D1D5DB |
| border | #E5E7EB | #374151 |
| lightGray | #E5E7EB | #374151 |
| darkGray | #4B5563 | #D1D5DB |

## Special Cases

### Class Components (ErrorBoundary)
Class components can't use hooks directly. Options:
1. **Wrap with HOC**: Create a wrapper that provides colors as props
2. **Convert to function component**: Rewrite using hooks
3. **Use ThemeContext directly**: Use `static contextType` or consumer pattern

### Toast Component
Toast uses a provider pattern. Update the `getToastStyle()` function to use colors from context.

### StyleSheet.create() Usage
- **Keep COLORS in StyleSheet**: Static styles defined at module level
- **Override with dynamic styles**: Use inline style arrays like `[styles.text, { color: colors.text }]`

## Quick Find & Replace Patterns

These are common patterns you'll find and need to update:

### Find: `color={COLORS.`
Replace with: `color={colors.`

### Find: `backgroundColor: COLORS.`
Replace in JSX with: `backgroundColor: colors.`

### Find: `style={styles.text}`
Replace with: `style={[styles.text, { color: colors.text }]}`

## Notes
- The `useTheme` hook is available from `@/providers/ThemeProvider`
- Theme provider is already set up at the app root level
- Dark mode toggle is in Settings screen
- Theme preference is persisted in AsyncStorage
