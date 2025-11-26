# Paywall System Documentation

## Overview

StreamSense implements a comprehensive paywall system to enforce free tier limits and encourage premium upgrades. The system is integrated throughout the app with a soft paywall approach that educates users about premium benefits.

## Free Tier Limits

### Subscription Tracking
- **Limit**: Maximum 3 subscriptions
- **Premium**: Unlimited subscriptions

###  Watchlist
- **Limit**: Maximum 10 watchlist items
- **Premium**: Unlimited watchlist items

### Recommendations
- **Free**: Basic recommendations only
- **Premium**: All recommendation types including advanced insights

### Email Reports
- **Free**: Not available
- **Premium**: Monthly email reports with detailed analytics

## Architecture

```
src/
├── hooks/
│   └── usePremiumFeature.ts       # Premium feature checks and limits
├── components/
│   └── PaywallModal.tsx            # Soft paywall modal component
└── features/
    ├── premium/
    │   ├── screens/
    │   │   ├── PremiumScreen.tsx   # Full subscription management
    │   │   └── UpgradeScreen.tsx   # Focused conversion screen
    │   └── store/
    │       └── premiumStore.ts     # Premium state management
    ├── dashboard/
    │   └── screens/
    │       └── DashboardScreen.tsx # ✅ Integrated paywall
    └── watchlist/
        └── screens/
            └── WatchlistScreen.tsx # ✅ Integrated paywall
```

## Components

### usePremiumFeature Hook

Located: `src/hooks/usePremiumFeature.ts`

**Purpose**: Check premium status and enforce free tier limits before allowing actions.

**Usage**:
```typescript
import { usePremiumFeature } from '@/hooks/usePremiumFeature';

function MyComponent() {
  const {
    canAddSubscription,
    canAddWatchlistItem,
    canAccessAdvancedRecommendations,
    canAccessEmailReports,
    isPremium
  } = usePremiumFeature();

  const handleAddItem = () => {
    const check = canAddSubscription(currentCount);

    if (!check.allowed) {
      // Show paywall
      setShowPaywall(true);
      return;
    }

    // Proceed with action
    addItem();
  };
}
```

**Methods**:

#### `canAddSubscription(currentCount: number)`
Returns:
```typescript
{
  allowed: boolean;
  isPremium: boolean;
  limit?: number;          // 3 for free tier
  current?: number;        // Current count
  remaining?: number;      // How many more allowed
  feature: 'subscriptions';
}
```

#### `canAddWatchlistItem(currentCount: number)`
Returns:
```typescript
{
  allowed: boolean;
  isPremium: boolean;
  limit?: number;          // 10 for free tier
  current?: number;
  remaining?: number;
  feature: 'watchlist';
}
```

#### `canAccessAdvancedRecommendations()`
Returns:
```typescript
{
  allowed: boolean;        // true only if premium
  isPremium: boolean;
  feature: 'recommendations';
}
```

#### `canAccessEmailReports()`
Returns:
```typescript
{
  allowed: boolean;        // true only if premium
  isPremium: boolean;
  feature: 'email_reports';
}
```

#### `getFeatureLimits()`
Returns display strings for all limits:
```typescript
{
  subscriptions: '3 max' | 'Unlimited',
  watchlist: '10 max' | 'Unlimited',
  recommendations: 'Basic only' | 'All types',
  emailReports: 'Not available' | 'Enabled',
}
```

### useFeatureUsage Hook

Track current usage against limits:

```typescript
import { useFeatureUsage } from '@/hooks/usePremiumFeature';

const { subscriptions, watchlist } = useFeatureUsage(
  subscriptionCount,
  watchlistCount
);

// subscriptions = {
//   count: 2,
//   limit: 3,
//   percentage: 66,          // 66% of limit used
//   isNearLimit: true,       // 2 of 3 (at limit - 1)
//   isAtLimit: false,
// }
```

### PaywallModal Component

Located: `src/components/PaywallModal.tsx`

**Purpose**: Beautiful modal shown when users hit free tier limits.

**Features**:
- Feature-specific messaging
- Premium highlights list
- Pricing preview
- "Upgrade to Premium" CTA
- "Maybe Later" option
- Soft close (allows dismissal)

**Usage**:
```typescript
import { PaywallModal } from '@/components';

<PaywallModal
  visible={showPaywall}
  onClose={() => setShowPaywall(false)}
  onUpgrade={() => {
    setShowPaywall(false);
    navigation.navigate('Upgrade');
  }}
  feature="subscriptions"  // or 'watchlist', 'recommendations', 'email_reports'
  limit={3}
  current={currentCount}
/>
```

**Props**:
- `visible: boolean` - Show/hide modal
- `onClose: () => void` - Called when user dismisses
- `onUpgrade: () => void` - Called when user taps upgrade button
- `feature: FeatureKey` - Which feature limit was reached
- `limit?: number` - The limit value (e.g., 3 for subscriptions)
- `current?: number` - Current usage count

## Integration Examples

### Example 1: Dashboard Screen (Subscription Limit)

```typescript
import { usePremiumFeature } from '@/hooks/usePremiumFeature';
import { PaywallModal } from '@/components';

export const DashboardScreen = () => {
  const [showPaywall, setShowPaywall] = useState(false);
  const { canAddSubscription } = usePremiumFeature();
  const { totalActive } = useSubscriptionsData();

  const handleAddSubscription = () => {
    // Check limit before proceeding
    const check = canAddSubscription(totalActive);

    if (!check.allowed) {
      setShowPaywall(true);  // Show paywall
      return;
    }

    // Proceed to add subscription
    navigation.navigate('SubscriptionForm');
  };

  return (
    <View>
      <Button onPress={handleAddSubscription}>
        Add Subscription
      </Button>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={handleUpgrade}
        feature="subscriptions"
        limit={3}
        current={totalActive}
      />
    </View>
  );
};
```

### Example 2: Watchlist Screen (Watchlist Limit)

```typescript
import { usePremiumFeature } from '@/hooks/usePremiumFeature';
import { PaywallModal } from '@/components';

export const WatchlistScreen = () => {
  const [showPaywall, setShowPaywall] = useState(false);
  const { canAddWatchlistItem } = usePremiumFeature();
  const watchlist = useWatchlistStore(state => state.watchlist);

  const handleAddContent = () => {
    // Check limit
    const check = canAddWatchlistItem(watchlist.length);

    if (!check.allowed) {
      setShowPaywall(true);
      return;
    }

    navigation.navigate('ContentSearch');
  };

  return (
    <View>
      <FAB onPress={handleAddContent} />

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={handleUpgrade}
        feature="watchlist"
        limit={10}
        current={watchlist.length}
      />
    </View>
  );
};
```

### Example 3: Recommendations Screen (Feature Lock)

```typescript
import { usePremiumFeature } from '@/hooks/usePremiumFeature';
import { PaywallModal } from '@/components';

export const RecommendationsScreen = () => {
  const [showPaywall, setShowPaywall] = useState(false);
  const { canAccessAdvancedRecommendations, isPremium } = usePremiumFeature();

  const handleViewAdvanced = () => {
    const check = canAccessAdvancedRecommendations();

    if (!check.allowed) {
      setShowPaywall(true);
      return;
    }

    // Show advanced recommendations
  };

  return (
    <View>
      {/* Basic recommendations - always visible */}
      <BasicRecommendations />

      {/* Advanced recommendations - premium only */}
      {isPremium ? (
        <AdvancedRecommendations />
      ) : (
        <TouchableOpacity onPress={handleViewAdvanced}>
          <LockedFeatureCard title="Advanced Recommendations" />
        </TouchableOpacity>
      )}

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={handleUpgrade}
        feature="recommendations"
      />
    </View>
  );
};
```

### Example 4: Usage Progress Indicator

```typescript
import { useFeatureUsage } from '@/hooks/usePremiumFeature';

export const UsageIndicator = () => {
  const { subscriptions, watchlist } = useFeatureUsage(
    activeSubscriptionCount,
    watchlistItemCount
  );

  return (
    <View>
      {/* Subscription Usage */}
      <Text>
        Subscriptions: {subscriptions.count} / {subscriptions.limit}
      </Text>
      <ProgressBar value={subscriptions.percentage} />

      {subscriptions.isNearLimit && (
        <Text>You're almost at your limit! Upgrade for unlimited.</Text>
      )}

      {/* Watchlist Usage */}
      <Text>
        Watchlist: {watchlist.count} / {watchlist.limit}
      </Text>
      <ProgressBar value={watchlist.percentage} />
    </View>
  );
};
```

## Paywall Flow

### User Journey

1. **User attempts action** (e.g., "Add Subscription")
2. **System checks limit** via `usePremiumFeature`
3. **If allowed**: Action proceeds normally
4. **If blocked**: PaywallModal appears

### PaywallModal Flow

1. **Modal appears** with feature-specific messaging
2. **User sees**:
   - What limit they hit (e.g., "3 of 3 subscriptions")
   - Why premium is valuable
   - Premium benefits list
   - Pricing preview ($4.99/month)
3. **User can**:
   - Tap "Upgrade to Premium" → Navigate to upgrade screen
   - Tap "Maybe Later" → Close modal
   - Tap outside/X → Close modal

### Post-Paywall Actions

If user upgrades:
```typescript
const handleUpgrade = () => {
  setShowPaywall(false);

  // Option 1: Navigate to UpgradeScreen
  navigation.navigate('Upgrade');

  // Option 2: Navigate to settings tab with premium screen
  navigation.getParent()?.navigate('SettingsTab');

  // Option 3: Show modal with UpgradeScreen
  setShowUpgradeModal(true);
};
```

## Best Practices

### 1. Check Before Action

Always check limits BEFORE starting the action flow:

✅ **Good**:
```typescript
const handleAdd = () => {
  if (!canAddSubscription(count).allowed) {
    showPaywall();
    return;
  }
  proceedToAddSubscription();
};
```

❌ **Bad**:
```typescript
const handleAdd = () => {
  proceedToAddSubscription();  // User gets into flow
  if (!canAddSubscription(count).allowed) {  // Then blocked
    showPaywall();
  }
};
```

### 2. Provide Context

Show users WHY they can't proceed:

```typescript
<PaywallModal
  visible={showPaywall}
  feature="subscriptions"
  limit={3}
  current={activeCount}  // Shows "You have 3 of 3 subscriptions"
/>
```

### 3. Make Upgrade Easy

Direct users to upgrade screen immediately:

```typescript
const handleUpgrade = () => {
  setShowPaywall(false);
  navigation.navigate('Upgrade');  // Direct path
};
```

### 4. Don't Block Too Early

Let users explore before hitting paywalls:
- ✅ Allow viewing features
- ✅ Show what they'd get
- ❌ Don't block on app open
- ❌ Don't show paywall multiple times in one session

### 5. Track Conversions

```typescript
const handleUpgrade = () => {
  // Track which feature drove the upgrade
  analytics.track('paywall_upgrade_tapped', {
    feature: 'subscriptions',
    current_count: activeCount,
    limit: 3,
  });

  setShowPaywall(false);
  navigation.navigate('Upgrade');
};
```

## Testing

### Test Free Tier Limits

1. **Test Subscription Limit**:
   - Add 3 subscriptions
   - Try to add 4th
   - Verify paywall shows
   - Verify message shows "3 of 3"

2. **Test Watchlist Limit**:
   - Add 10 items to watchlist
   - Try to add 11th
   - Verify paywall shows
   - Verify message shows "10 of 10"

3. **Test Premium Features**:
   - Try to access advanced recommendations
   - Try to enable email reports
   - Verify paywall shows

### Test Premium Access

1. Upgrade to premium
2. Verify all limits removed
3. Add more than 3 subscriptions
4. Add more than 10 watchlist items
5. Access advanced recommendations
6. Verify no paywalls appear

### Test Paywall UI

1. Trigger each paywall type
2. Verify correct messaging
3. Test "Maybe Later" button
4. Test "Upgrade" button navigation
5. Test close button
6. Test tapping outside modal

## Customization

### Update Free Tier Limits

Edit `src/hooks/usePremiumFeature.ts`:

```typescript
export const FREE_TIER_LIMITS = {
  MAX_SUBSCRIPTIONS: 5,  // Change from 3 to 5
  MAX_WATCHLIST_ITEMS: 20,  // Change from 10 to 20
  BASIC_RECOMMENDATIONS_ONLY: true,
  EMAIL_REPORTS: false,
};
```

### Add New Feature Limits

1. Add to `FeatureKey` type:
```typescript
export type FeatureKey =
  | 'subscriptions'
  | 'watchlist'
  | 'recommendations'
  | 'email_reports'
  | 'advanced_analytics';  // New feature
```

2. Add check method:
```typescript
const canAccessAdvancedAnalytics = useCallback((): FeatureCheckResult => {
  return {
    allowed: isPremium,
    isPremium,
    feature: 'advanced_analytics',
  };
}, [isPremium]);
```

3. Add to PaywallModal messages:
```typescript
const FEATURE_MESSAGES = {
  // ... existing
  advanced_analytics: {
    icon: 'chart-box',
    title: 'Premium Feature',
    description: 'Advanced analytics with detailed insights.',
    limitMessage: () => 'Get powerful analytics with premium.',
  },
};
```

## Related Documentation

- [Premium Feature Documentation](../src/features/premium/README.md)
- [UpgradeScreen Guide](../src/features/premium/screens/UPGRADE_SCREEN_GUIDE.md)
- [RevenueCat Integration](../src/features/premium/README.md#setup)
