# UpgradeScreen Usage Guide

## Overview

The `UpgradeScreen` is a beautifully designed, conversion-focused screen to encourage free users to upgrade to premium. It's optimized for maximum conversion with clear benefits and simple pricing options.

## Features

### Hero Section
- Large crown icon with premium branding
- Compelling headline: "Upgrade to Premium"
- Benefit-focused subtitle

### Premium Benefits
Four key benefits with colorful icons:
1. **Unlimited Subscriptions** (Purple) - Track unlimited subscriptions
2. **Advanced Analytics** (Blue) - Deep spending insights
3. **Priority Support** (Green) - Faster customer support
4. **Ad-Free Experience** (Orange) - Clean interface

### Pricing Cards
Two options with smart defaults:

**Annual Plan** (Pre-selected)
- Price: $47.99/year
- Shows: $4.99/month equivalent
- Badge: "BEST VALUE"
- Savings badge: "Save 20% • $11.89"
- Visual: Purple border, highlighted

**Monthly Plan**
- Price: $4.99/month
- Description: "Billed monthly, cancel anytime"
- Visual: Standard card

### Call-to-Action
- Large "Start Premium" button
- Shows loading state during purchase
- Disabled when no offerings available

### Additional Elements
- "Restore Purchases" link with loading state
- Auto-renewal disclaimer
- Terms of Service link
- Privacy Policy link

## Integration Examples

### 1. As a Modal (Recommended for Paywall)

```typescript
import { UpgradeScreen } from '@/features/premium';
import { Modal } from 'react-native';

function MyComponent() {
  const [showUpgrade, setShowUpgrade] = useState(false);

  return (
    <>
      <Button onPress={() => setShowUpgrade(true)}>
        Upgrade to Premium
      </Button>

      <Modal
        visible={showUpgrade}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <UpgradeScreen />
      </Modal>
    </>
  );
}
```

### 2. As a Navigation Screen

```typescript
// In your navigation stack
import { UpgradeScreen } from '@/features/premium';

<Stack.Screen
  name="Upgrade"
  component={UpgradeScreen}
  options={{
    title: 'Upgrade to Premium',
    presentation: 'modal',
  }}
/>

// Navigate to it
navigation.navigate('Upgrade');
```

### 3. As a Feature Gate

```typescript
import { usePremiumStore } from '@/features/premium';
import { UpgradeScreen } from '@/features/premium';

function PremiumFeature() {
  const isPremium = usePremiumStore(state => state.isPremium);

  if (!isPremium) {
    return <UpgradeScreen />;
  }

  return <ActualPremiumContent />;
}
```

### 4. In Onboarding Flow

```typescript
function OnboardingFlow() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Features" component={FeaturesScreen} />
      <Stack.Screen name="Upgrade" component={UpgradeScreen} />
      <Stack.Screen name="GetStarted" component={GetStartedScreen} />
    </Stack.Navigator>
  );
}
```

## Customization

### Update Pricing

Edit the constants at the top of `UpgradeScreen.tsx`:

```typescript
const ANNUAL_MONTHLY_PRICE = 4.99;  // Shown as monthly equivalent
const MONTHLY_PRICE = 4.99;         // Monthly price
const ANNUAL_PRICE = 47.99;         // Annual price
```

Savings are calculated automatically.

### Update Benefits

Edit the `PREMIUM_BENEFITS` array:

```typescript
const PREMIUM_BENEFITS = [
  {
    icon: 'your-icon-name',
    title: 'Your Feature',
    description: 'Feature description',
    color: '#HexColor',
  },
  // Add more...
];
```

Available icons: Any MaterialCommunityIcons icon name

### Update Links

Edit the link handlers:

```typescript
const handleOpenTerms = () => {
  Linking.openURL('https://your-domain.com/terms');
};

const handleOpenPrivacy = () => {
  Linking.openURL('https://your-domain.com/privacy');
};
```

## User Flow

1. **User sees upgrade screen**
   - Annual plan is pre-selected (better value)
   - Benefits are clearly displayed
   - Pricing is transparent

2. **User selects a plan**
   - Can toggle between annual and monthly
   - Selected plan shows checkmark
   - "Best Value" badge guides to annual

3. **User taps "Start Premium"**
   - Button shows loading state
   - RevenueCat purchase flow starts
   - Native payment sheet appears

4. **Purchase completes**
   - Success alert shown
   - User automatically gets premium access
   - Status syncs to Supabase

5. **If purchase fails**
   - Error alert shown
   - User can try again
   - Can use "Restore Purchases" if already purchased

## Best Practices

### When to Show

**✅ Good times to show upgrade screen:**
- After user hits a limit (e.g., "Max 5 subscriptions on free plan")
- After user completes onboarding
- When user tries to access premium feature
- In settings menu as an option
- After 7 days of free usage

**❌ Avoid showing:**
- Immediately on first app open
- Multiple times in same session
- During critical user tasks
- More than once per day

### Conversion Tips

1. **Let them try first**: Show value before asking for payment
2. **Be clear about benefits**: What they get, not what they pay
3. **Social proof**: Consider adding testimonials or user counts
4. **Limited time offers**: For special promotions
5. **Annual plan default**: Most users will stick with default selection

### A/B Testing Ideas

Test different variations:
- Headline copy
- Benefit ordering
- Annual vs monthly default
- Pricing presentation
- CTA button text
- Color schemes

## Analytics Tracking

Track these events:

```typescript
// When screen is shown
analytics.track('upgrade_screen_viewed');

// When user selects a plan
analytics.track('pricing_plan_selected', {
  plan: selectedPlan, // 'monthly' or 'annual'
});

// When user taps subscribe
analytics.track('subscribe_button_tapped', {
  plan: selectedPlan,
});

// When purchase succeeds
analytics.track('premium_purchase_completed', {
  plan: selectedPlan,
  price: packagePrice,
});

// When purchase fails
analytics.track('premium_purchase_failed', {
  plan: selectedPlan,
  error: error.message,
});

// When restore is tapped
analytics.track('restore_purchases_tapped');
```

## Troubleshooting

### Pricing cards not showing
- Check that RevenueCat offerings are configured
- Verify products are created in App/Play Store Console
- Ensure products are linked to 'premium' entitlement
- Check network connection

### Purchase not completing
- Verify API keys are correct
- Check that user is authenticated
- Ensure RevenueCat SDK is initialized
- Test with sandbox account

### Savings calculation wrong
- Update `MONTHLY_PRICE` and `ANNUAL_PRICE` constants
- Savings auto-calculate: `(MONTHLY_PRICE * 12) - ANNUAL_PRICE`

## Performance

The screen is optimized for performance:
- Minimal re-renders
- Efficient state management
- Lazy loading of offerings
- Native animations

## Accessibility

Built-in accessibility features:
- Proper heading hierarchy
- Touch target sizes (min 44x44)
- Color contrast ratios
- Screen reader support
- Keyboard navigation

## Next Steps

After implementing the upgrade screen:

1. **Set up products** in App Store Connect and Google Play Console
2. **Configure RevenueCat** with entitlements and offerings
3. **Test thoroughly** with sandbox accounts
4. **Track conversions** to optimize messaging
5. **Iterate based on data** to improve conversion rate

## Related Files

- [PremiumScreen.tsx](./PremiumScreen.tsx) - Full subscription management screen
- [premiumStore.ts](../store/premiumStore.ts) - Premium state management
- [purchases.ts](../../../services/purchases.ts) - RevenueCat service
- [README.md](../README.md) - Full premium feature documentation
