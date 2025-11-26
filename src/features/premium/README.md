# Premium Feature - RevenueCat Integration

This feature handles premium subscription management using RevenueCat for in-app purchases.

## Overview

The premium feature provides:
- **Subscription Management**: Purchase and manage premium subscriptions
- **Automatic Syncing**: Subscription status syncs with Supabase user profiles
- **Cross-Platform**: Works on both iOS and Android
- **Restore Purchases**: Users can restore previous purchases

## Architecture

```
src/features/premium/
├── store/
│   └── premiumStore.ts       # Zustand store for premium state
├── index.ts                   # Feature exports
└── README.md                  # This file

src/services/
└── purchases.ts               # RevenueCat service wrapper

src/hooks/
└── useRevenueCat.ts          # Hook for initializing RevenueCat
```

## Setup

### 1. Environment Variables

Add to your `.env` file:

```bash
# RevenueCat API Keys
REVENUECAT_IOS_API_KEY=your_ios_api_key
REVENUECAT_ANDROID_API_KEY=your_android_api_key
```

### 2. Database Migration

Run the migration to add premium fields to profiles table:

```bash
# Apply migration
supabase db push
```

This adds:
- `is_premium` - Boolean flag for premium status
- `premium_expires_at` - Expiration date for premium subscription

### 3. RevenueCat Dashboard Setup

1. Create a RevenueCat account at https://app.revenuecat.com
2. Create a new app project
3. Configure entitlements:
   - Create an entitlement called `premium`
4. Configure products in App Store Connect / Google Play Console
5. Link products to the `premium` entitlement in RevenueCat

## Usage

### Initialize RevenueCat

RevenueCat is automatically initialized when a user authenticates via the `useRevenueCat` hook in `RootNavigator.tsx`.

```typescript
// Already implemented in RootNavigator
import { useRevenueCat } from '@/hooks/useRevenueCat';

export const RootNavigator = () => {
  useRevenueCat(); // Initializes when user is authenticated
  // ...
};
```

### Check Premium Status

```typescript
import { usePremiumStore } from '@/features/premium';

function MyComponent() {
  const isPremium = usePremiumStore(state => state.isPremium);

  if (isPremium) {
    // Show premium features
  }

  return <View>...</View>;
}
```

### Load Offerings

```typescript
import { usePremiumStore } from '@/features/premium';

function SubscriptionScreen() {
  const { loadOfferings, offerings, offeringsLoading } = usePremiumStore();

  useEffect(() => {
    loadOfferings();
  }, []);

  if (offeringsLoading) return <LoadingSpinner />;

  const packages = offerings?.current?.availablePackages || [];

  return (
    <View>
      {packages.map(pkg => (
        <PackageCard key={pkg.identifier} package={pkg} />
      ))}
    </View>
  );
}
```

### Purchase a Subscription

```typescript
import { usePremiumStore } from '@/features/premium';
import type { PurchasesPackage } from 'react-native-purchases';

function PackageCard({ package: pkg }: { package: PurchasesPackage }) {
  const { purchaseSubscription, purchaseInProgress } = usePremiumStore();

  const handlePurchase = async () => {
    try {
      await purchaseSubscription(pkg);
      Alert.alert('Success', 'Premium subscription activated!');
    } catch (error) {
      Alert.alert('Error', 'Purchase failed. Please try again.');
    }
  };

  return (
    <Button
      onPress={handlePurchase}
      loading={purchaseInProgress}
      disabled={purchaseInProgress}
    >
      Subscribe for {pkg.product.priceString}
    </Button>
  );
}
```

### Restore Purchases

```typescript
import { usePremiumStore } from '@/features/premium';

function SettingsScreen() {
  const { restoreSubscriptions, restoreInProgress } = usePremiumStore();

  const handleRestore = async () => {
    try {
      await restoreSubscriptions();
      Alert.alert('Success', 'Purchases restored!');
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases.');
    }
  };

  return (
    <Button
      onPress={handleRestore}
      loading={restoreInProgress}
      disabled={restoreInProgress}
    >
      Restore Purchases
    </Button>
  );
}
```

### Check Subscription Details

```typescript
import { usePremiumStore, selectSubscriptionDetails } from '@/features/premium';

function ProfileScreen() {
  const { isPremium, expirationDate, productIdentifier } = usePremiumStore(
    selectSubscriptionDetails
  );

  if (!isPremium) return <UpgradePrompt />;

  return (
    <View>
      <Text>Premium Member</Text>
      {expirationDate && (
        <Text>Expires: {new Date(expirationDate).toLocaleDateString()}</Text>
      )}
      {productIdentifier && <Text>Plan: {productIdentifier}</Text>}
    </View>
  );
}
```

## Services API

### purchases.ts

```typescript
import * as purchases from '@/services/purchases';

// Initialize RevenueCat (called automatically)
await purchases.initializePurchases(userId);

// Get available offerings
const offerings = await purchases.getOfferings();

// Purchase a package
const customerInfo = await purchases.purchasePackage(package);

// Restore purchases
const customerInfo = await purchases.restorePurchases();

// Check subscription status
const status = await purchases.checkSubscriptionStatus();
// Returns: { isPremium, expirationDate, productIdentifier }

// Check specific entitlement
const hasEntitlement = await purchases.hasEntitlement('premium');

// Login/Logout (for user switching)
await purchases.loginUser(userId);
await purchases.logoutUser();

// Sync status with Supabase
await purchases.syncSubscriptionStatus(customerInfo);
```

## Store API

### premiumStore.ts

```typescript
import { usePremiumStore } from '@/features/premium';

// State
const {
  isPremium,              // Boolean - current premium status
  isLoading,             // Boolean - loading state
  error,                 // String | null - error message
  offerings,             // PurchasesOfferings | null
  offeringsLoading,      // Boolean - offerings loading state
  purchaseInProgress,    // Boolean - purchase in progress
  restoreInProgress,     // Boolean - restore in progress
  expirationDate,        // String | null - expiration date
  productIdentifier,     // String | null - product ID
  customerInfo,          // CustomerInfo | null - RevenueCat customer info
} = usePremiumStore();

// Actions
const {
  loadOfferings,         // Load available offerings
  purchaseSubscription,  // Purchase a subscription
  restoreSubscriptions,  // Restore previous purchases
  checkStatus,          // Check current subscription status
  refreshCustomerInfo,  // Refresh customer info from RevenueCat
  reset,                // Reset store (on logout)
} = usePremiumStore();

// Selectors
import {
  selectIsPremium,
  selectCurrentOffering,
  selectAvailablePackages,
  selectIsLoading,
  selectSubscriptionDetails,
} from '@/features/premium';
```

## Subscription Flow

1. **User Authenticates** → RevenueCat initializes with user ID
2. **Check Status** → Automatically checks if user has premium
3. **Load Offerings** → User views available subscription packages
4. **Purchase** → User selects and purchases a package
5. **Sync to Supabase** → Premium status updates in database
6. **Access Premium Features** → User can access premium content

## Testing

### Sandbox Testing

RevenueCat provides sandbox testing for both iOS and Android:

1. **iOS**: Use sandbox App Store account
2. **Android**: Use test tracks in Google Play Console
3. **Test API Key**: The provided test key works for development

### Testing Checklist

- [ ] Purchase a subscription
- [ ] Verify premium status updates
- [ ] Check Supabase profile is updated
- [ ] Restore purchases
- [ ] Test subscription expiration
- [ ] Test with different product offerings
- [ ] Test error handling (cancelled purchase, network failure)

## Premium Features Gate

Use the premium status to gate features:

```typescript
import { usePremiumStore } from '@/features/premium';

function PremiumFeature() {
  const isPremium = usePremiumStore(state => state.isPremium);

  if (!isPremium) {
    return <UpgradePrompt />;
  }

  return <PremiumContent />;
}
```

## Troubleshooting

### Issue: RevenueCat not initializing

**Solution**: Ensure user is authenticated and user ID is available before initialization.

### Issue: Purchases not syncing to Supabase

**Solution**: Check that the profiles table has `is_premium` and `premium_expires_at` columns. Run the migration if needed.

### Issue: Offerings not loading

**Solution**: Verify products are configured in RevenueCat dashboard and linked to the `premium` entitlement.

### Issue: Sandbox purchases not working

**Solution**:
- iOS: Sign out of production App Store, use sandbox account
- Android: Ensure app is in testing track with test user added

## Resources

- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [RevenueCat React Native SDK](https://docs.revenuecat.com/docs/reactnative)
- [RevenueCat Dashboard](https://app.revenuecat.com/)
- [Testing In-App Purchases](https://docs.revenuecat.com/docs/test-and-launch)
