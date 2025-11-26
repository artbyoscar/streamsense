# Onboarding Feature

Complete 4-step onboarding flow for new StreamSense users.

## Overview

The onboarding flow introduces users to StreamSense, guides them through bank connection, subscription detection, and provides initial insights. The flow is managed by the RootNavigator, which checks if a user has completed onboarding before showing the main app.

## Flow Structure

```
┌─────────────────────────────────────────────────┐
│ Step 1: Welcome                                 │
│ - App introduction                              │
│ - Value proposition (4 key benefits)            │
│ - "Get Started" button                          │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ Step 2: Bank Connection                         │
│ - Explain bank connection benefits              │
│ - "Connect Bank Account" button                 │
│ - "Skip for Now" option                         │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ Step 3: Subscription Review                     │
│ - Show detected subscriptions                   │
│ - Allow user to select/deselect each            │
│ - "Add Manual Subscription" option              │
│ - Display total monthly cost                    │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ Step 4: First Insights                          │
│ - Show spending summary                         │
│ - Preview smart recommendations                 │
│ - "Start Using StreamSense" button              │
│ - Mark onboarding_completed = true              │
└─────────────────────────────────────────────────┘
                        ↓
              Main App (Dashboard)
```

## File Structure

```
src/features/onboarding/
├── screens/
│   ├── OnboardingNavigator.tsx      # Main navigator with progress indicator
│   ├── WelcomeScreen.tsx             # Step 1: Welcome
│   ├── PlaidConnectionOnboardingScreen.tsx  # Step 2: Bank connection
│   ├── SubscriptionReviewScreen.tsx  # Step 3: Subscription review
│   └── FirstInsightsScreen.tsx       # Step 4: Insights & completion
├── index.ts                          # Feature exports
└── README.md                         # This file
```

## Components

### OnboardingNavigator

Main component that orchestrates the onboarding flow.

**Features**:
- Progress indicator (Step X of 4)
- Back button (on steps 2-4)
- State management for selected subscriptions
- Automatic navigation between steps
- Marks onboarding as completed on finish

**State**:
```typescript
const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
const [selectedSubscriptionIds, setSelectedSubscriptionIds] = useState<string[]>([]);
const [selectedSubscriptions, setSelectedSubscriptions] = useState<Array<{
  id: string;
  service_name: string;
  price: number;
}>>();
```

**Navigation Flow**:
```typescript
welcome → plaid → subscriptions → insights → (mark complete)
```

### ProgressIndicator

Visual progress indicator showing current step.

**Props**:
```typescript
{
  currentStep: number;    // Current step (1-4)
  totalSteps: number;     // Total steps (4)
}
```

**UI**:
- Animated progress bar
- "Step X of Y" text
- Primary color fill

### BackButton

Chevron-left button for navigating to previous step.

**Props**:
```typescript
{
  onPress: () => void;
}
```

## Step Screens

### 1. WelcomeScreen

App introduction with value proposition.

**Props**:
```typescript
{
  onGetStarted: () => void;
}
```

**Features**:
- App logo (television-play icon)
- App name: "StreamSense"
- Tagline: "Take Control of Your Streaming Subscriptions"
- 4 value propositions with colorful icons:
  - Track All Subscriptions (wallet-outline, primary)
  - Smart Insights (chart-line, green)
  - Never Miss a Renewal (bell-ring, orange)
  - Cut Unnecessary Costs (lightbulb-on, purple)
- Get Started button

**File**: [WelcomeScreen.tsx](./screens/WelcomeScreen.tsx)

### 2. PlaidConnectionOnboardingScreen

Bank connection explanation and setup.

**Props**:
```typescript
{
  onConnect: () => void;
  onSkip: () => void;
}
```

**Features**:
- Bank icon with primary color
- "Connect Your Bank" heading
- Explanation text about secure linking
- 4 benefits with icons:
  - Automatic Detection (auto-fix, green)
  - Secure & Private (shield-lock, blue)
  - Always Up to Date (sync, orange)
  - Save Time (clock-fast, purple)
- Security badge (bank-lock, 256-bit encryption)
- Connect Bank Account button (primary)
- Skip for Now button (text)

**File**: [PlaidConnectionOnboardingScreen.tsx](./screens/PlaidConnectionOnboardingScreen.tsx)

**TODO**: Implement actual Plaid integration in `handleConnect`

### 3. SubscriptionReviewScreen

Review and confirm detected subscriptions.

**Props**:
```typescript
{
  onContinue: (selectedSubscriptions: string[]) => void;
  onAddManual: () => void;
}
```

**Features**:
- Header with title and subtitle
- Loading state while fetching subscriptions
- List of detected subscriptions with:
  - Checkbox for selection/deselection
  - Service name
  - Price per month
  - "Detected from bank" badge
  - Touchable card with selected state styling
- Auto-select all subscriptions on load
- Empty state if no subscriptions detected
- Footer with:
  - Summary (count + total monthly price)
  - "Add Manual Subscription" button
  - "Continue" button
- Confirmation alert if continuing with 0 selected

**File**: [SubscriptionReviewScreen.tsx](./screens/SubscriptionReviewScreen.tsx)

**Hooks Used**:
- `useSuggestedSubscriptions()` - Fetches suggested subscriptions from bank transactions

**TODO**: Implement manual subscription addition in `onAddManual`

### 4. FirstInsightsScreen

Initial spending summary and recommendations.

**Props**:
```typescript
{
  selectedSubscriptions: Array<{
    id: string;
    service_name: string;
    price: number;
  }>;
  onFinish: () => void;
}
```

**Features**:
- Celebration header with party-popper icon
- Dynamic title based on subscription count
- Spending insights (if subscriptions exist):
  - Monthly spending (calendar-month, primary)
  - Yearly projection (calendar-range, green)
  - Subscription count (wallet-outline, orange)
  - Average price per subscription (cash, purple)
- Smart recommendations (4 cards):
  - Bundle Opportunity (if 2+ subscriptions)
  - Enable Renewal Reminders
  - Track Your Usage
  - Build Your Watchlist
- Call to action section
- "Start Using StreamSense" button
- Marks `onboarding_completed = true` on finish

**File**: [FirstInsightsScreen.tsx](./screens/FirstInsightsScreen.tsx)

**Calculations**:
```typescript
const totalMonthly = selectedSubscriptions.reduce((sum, sub) => sum + sub.price, 0);
const totalYearly = totalMonthly * 12;
const subscriptionCount = selectedSubscriptions.length;
const averagePrice = subscriptionCount > 0 ? totalMonthly / subscriptionCount : 0;
```

## Integration

### RootNavigator Integration

The onboarding flow is integrated into the RootNavigator, which determines which navigator to show based on authentication and onboarding status:

```typescript
// In RootNavigator.tsx
const getNavigator = () => {
  if (!isAuthenticated) {
    return <AuthNavigator />;
  }

  if (onboardingCompleted === false) {
    return <OnboardingNavigator />;
  }

  return <MainNavigator />;
};
```

**Flow**:
1. User registers/logs in
2. RootNavigator fetches user profile
3. If `onboarding_completed === false`, show OnboardingNavigator
4. User completes onboarding
5. OnboardingNavigator marks `onboarding_completed = true`
6. RootNavigator detects change and shows MainNavigator

### Database Schema

The onboarding status is stored in the `profiles` table:

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
```

**Type**:
```typescript
profiles: {
  Row: {
    id: string;
    email: string;
    onboarding_completed: boolean;
    // ... other fields
  };
}
```

### Marking Onboarding Complete

When the user clicks "Start Using StreamSense" in Step 4:

```typescript
const handleFinishOnboarding = async () => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user?.id);

    if (error) {
      console.error('Error marking onboarding complete:', error);
    }

    // RootNavigator will automatically detect the change
  } catch (error) {
    console.error('Error finishing onboarding:', error);
  }
};
```

## Styling

### Design System

**Colors**:
- Primary: Blue (`COLORS.primary`)
- Success: Green (`#10B981`)
- Warning: Orange (`#F59E0B`)
- Info: Purple (`#8B5CF6`)
- Background: Light gray (`COLORS.background`)
- Card: White (`COLORS.white`)

**Typography**:
- Titles: 24-26px, weight 700-800
- Subtitles: 15-16px, regular
- Body: 14-15px
- Small: 12-13px

**Spacing**:
- Section padding: 24px horizontal
- Card margins: 16px horizontal
- Gap between cards: 12px
- Internal padding: 16-20px

**Cards**:
- Border radius: 12px
- Background: white
- Shadow: subtle elevation
- Border on selected: 2px primary color

### Progress Indicator

```typescript
<View style={styles.progressBar}>
  <View style={[styles.progressFill, { width: `${progress}%` }]} />
</View>
```

**Styling**:
- Height: 6px
- Border radius: 3px
- Background: Light gray
- Fill: Primary color
- Animated width based on current step

### Responsive Layout

All screens use `ScrollView` for proper scrolling on smaller devices:

```typescript
<ScrollView
  style={styles.container}
  contentContainerStyle={styles.contentContainer}
>
  {/* Content */}
</ScrollView>
```

## User Experience

### Navigation Flow

1. **Linear Progress**: Users move through steps sequentially
2. **Back Navigation**: Users can go back to previous steps (except from Welcome)
3. **Skip Options**: Users can skip bank connection
4. **Optional Selection**: Users can continue with 0 subscriptions (with confirmation)
5. **Clear Progress**: Progress indicator always visible (except Welcome)

### Loading States

- **Authentication**: Loading screen while checking auth status
- **Profile Fetch**: Loading screen while fetching onboarding status
- **Subscriptions**: "Loading subscriptions..." text in SubscriptionReviewScreen
- **Completion**: Immediate transition to main app after marking complete

### Error Handling

- **Profile Fetch Error**: Defaults to showing onboarding
- **Subscription Fetch Error**: Shows empty state with manual add option
- **Database Update Error**: Logs error but doesn't block user

### Empty States

**SubscriptionReviewScreen** (no subscriptions detected):
```typescript
<EmptyState
  icon="wallet-outline"
  title="No Subscriptions Detected"
  message="Connect your bank or add subscriptions manually to get started."
  actionLabel="Add Manual Subscription"
  onActionPress={onAddManual}
/>
```

## Data Flow

### Step 1 → Step 2

```
User clicks "Get Started"
  ↓
OnboardingNavigator sets currentStep = 'plaid'
  ↓
PlaidConnectionOnboardingScreen renders
```

### Step 2 → Step 3

```
User clicks "Connect Bank" or "Skip for Now"
  ↓
OnboardingNavigator sets currentStep = 'subscriptions'
  ↓
SubscriptionReviewScreen renders
  ↓
useSuggestedSubscriptions() fetches suggestions
  ↓
Auto-select all suggestions
```

### Step 3 → Step 4

```
User selects/deselects subscriptions
  ↓
User clicks "Continue"
  ↓
OnboardingNavigator receives selectedIds array
  ↓
Fetch subscription details from database
  ↓
Update selected subscriptions to status = 'active'
  ↓
OnboardingNavigator sets currentStep = 'insights'
  ↓
FirstInsightsScreen renders with subscription data
```

### Step 4 → Main App

```
User clicks "Start Using StreamSense"
  ↓
Update profiles.onboarding_completed = true
  ↓
RootNavigator detects change (via useEffect)
  ↓
RootNavigator renders MainNavigator
  ↓
User sees Dashboard
```

## Future Enhancements

### Step 2 Enhancements
- [ ] Implement actual Plaid Link integration
- [ ] Handle Plaid connection errors
- [ ] Store access token in database
- [ ] Sync transactions immediately after connection

### Step 3 Enhancements
- [ ] Implement manual subscription form
- [ ] Edit detected subscription details (price, billing cycle)
- [ ] Show subscription logos/icons
- [ ] Group by billing cycle
- [ ] Sort by price or service name

### Step 4 Enhancements
- [ ] More sophisticated recommendations
- [ ] Show bundle deals from actual data
- [ ] Preview first 3 watchlist suggestions
- [ ] Animated number counting for spending values
- [ ] Celebration confetti animation

### General Enhancements
- [ ] Add skip/exit option on all steps
- [ ] Save progress to allow resuming later
- [ ] A/B test different messaging
- [ ] Track completion rates per step
- [ ] Add tutorial tooltips
- [ ] Implement gesture-based navigation (swipe)

## Testing

### Test Cases

**OnboardingNavigator**:
- [ ] Progress indicator updates correctly on each step
- [ ] Back button navigates to previous step
- [ ] Back button hidden on welcome screen
- [ ] Progress indicator hidden on welcome screen
- [ ] Subscription data passed correctly to insights screen
- [ ] Onboarding marked complete on finish

**WelcomeScreen**:
- [ ] Renders all 4 value propositions
- [ ] Get Started button navigates to next step

**PlaidConnectionOnboardingScreen**:
- [ ] Renders all 4 benefits
- [ ] Connect button triggers handler
- [ ] Skip button triggers handler
- [ ] Security badge displays

**SubscriptionReviewScreen**:
- [ ] Loading state shows while fetching
- [ ] All subscriptions auto-selected on load
- [ ] Toggle selection works correctly
- [ ] Summary updates when selection changes
- [ ] Empty state shows when no subscriptions
- [ ] Confirmation alert shows when continuing with 0 selected
- [ ] Selected subscriptions passed to handler

**FirstInsightsScreen**:
- [ ] Spending calculations correct
- [ ] Insights cards show correct values
- [ ] Recommendations adapt based on subscription count
- [ ] Finish button marks onboarding complete
- [ ] Empty state message shows when 0 subscriptions

**RootNavigator Integration**:
- [ ] Shows onboarding for new users
- [ ] Shows main app for users with onboarding_completed = true
- [ ] Automatically transitions after onboarding completion
- [ ] Loading screen shows while checking status

## Related Files

- [OnboardingNavigator.tsx](./screens/OnboardingNavigator.tsx) - Main navigator
- [WelcomeScreen.tsx](./screens/WelcomeScreen.tsx) - Step 1
- [PlaidConnectionOnboardingScreen.tsx](./screens/PlaidConnectionOnboardingScreen.tsx) - Step 2
- [SubscriptionReviewScreen.tsx](./screens/SubscriptionReviewScreen.tsx) - Step 3
- [FirstInsightsScreen.tsx](./screens/FirstInsightsScreen.tsx) - Step 4
- [RootNavigator.tsx](../../navigation/RootNavigator.tsx) - Integration point
- [database.ts](../../types/database.ts) - Database types

## Example Usage

### Import and Use

```typescript
import { OnboardingNavigator } from '@/features/onboarding';

// In RootNavigator
if (onboardingCompleted === false) {
  return <OnboardingNavigator />;
}
```

### Force Restart Onboarding (for testing)

```typescript
// Reset onboarding status
await supabase
  .from('profiles')
  .update({ onboarding_completed: false })
  .eq('id', user.id);

// App will show onboarding flow on next launch
```

### Skip Onboarding (for testing)

```typescript
// Mark onboarding as complete
await supabase
  .from('profiles')
  .update({ onboarding_completed: true })
  .eq('id', user.id);

// App will show main navigator on next launch
```
