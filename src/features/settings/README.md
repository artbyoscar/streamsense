# Settings Feature

Comprehensive settings screen for user preferences, account management, and app configuration.

## Overview

The Settings screen provides a centralized location for:
- Account management
- Premium subscription status
- Bank connections
- Notification preferences
- App customization
- Support resources
- Legal information

## Screen Structure

### Account Section
- **Profile Info**: Display and edit user name and email
- **Subscription Status**: Shows Free or Premium status with expiration date
- **Connected Banks**: Manage Plaid bank connections
- **Add Bank**: Quick action to add new bank account

### Preferences Section
- **Push Notifications**: Toggle app notifications
- **Renewal Reminders**: Get notified before subscription renewals
- **Price Alerts**: Notifications when subscription prices change
- **Monthly Email Reports**: Premium feature for email summaries
- **Currency**: Select display currency (USD, EUR, GBP)
- **Theme**: Choose between Light, Dark, or System theme

### Support Section
- **Help Center**: Link to help documentation
- **Contact Support**: Email support team
- **Rate App**: Open App Store/Play Store rating
- **Share App**: Share StreamSense with others

### Legal Section
- **Privacy Policy**: View privacy policy
- **Terms of Service**: View terms of service

### Account Actions
- **Logout**: Sign out of account
- **Delete Account**: Permanently delete account (destructive action)

## File Structure

```
src/features/settings/
├── screens/
│   └── SettingsScreen.tsx    # Main settings screen
├── index.ts                    # Feature exports
└── README.md                   # This file
```

## Components

### SettingItem

Reusable component for individual setting rows.

**Props**:
```typescript
{
  icon: string;              // MaterialCommunityIcons name
  title: string;             // Primary text
  subtitle?: string;         // Secondary text
  value?: string;            // Right-side value text
  showChevron?: boolean;     // Show right chevron (default: true)
  showSwitch?: boolean;      // Show toggle switch
  switchValue?: boolean;     // Switch state
  onSwitchChange?: (value) => void;  // Switch callback
  onPress?: () => void;      // Tap handler
  badge?: string;            // Badge text (e.g., "PREMIUM")
  badgeColor?: string;       // Badge background color
  destructive?: boolean;     // Red styling for dangerous actions
}
```

**Usage**:
```typescript
<SettingItem
  icon="crown"
  title="Subscription Status"
  subtitle="Premium • Expires Dec 31, 2024"
  badge="PREMIUM"
  badgeColor={COLORS.warning}
  onPress={handleManageSubscription}
/>
```

### SectionHeader

Section title component.

**Usage**:
```typescript
<SectionHeader title="Account" />
```

## Integration

### Import and Use

```typescript
import { SettingsScreen } from '@/features/settings';

// In navigation
<Stack.Screen
  name="Settings"
  component={SettingsScreen}
  options={{ title: 'Settings' }}
/>
```

### Required Dependencies

```typescript
import { useAuth } from '@/features/auth';  // User and auth methods
import { usePremiumStore } from '@/features/premium';  // Premium status
```

## Features Detail

### Account Management

#### Edit Profile
Currently shows alert. To implement:
```typescript
const handleEditProfile = () => {
  navigation.navigate('EditProfile', {
    name: userName,
    email: userEmail
  });
};
```

#### Manage Subscription
- For premium users: Opens device subscription settings
- For free users: Navigates to upgrade screen

#### Bank Connections
Placeholder for Plaid integration:
```typescript
const handleAddBank = () => {
  navigation.navigate('PlaidConnection');
};
```

### Preferences

#### Notifications
Toggle switches control notification preferences:
- Push Notifications (master toggle)
- Renewal Reminders
- Price Alerts
- Monthly Email Reports (premium only)

State management:
```typescript
const [notificationsEnabled, setNotificationsEnabled] = useState(true);

// Persist to backend
useEffect(() => {
  updateUserPreferences({ notifications: notificationsEnabled });
}, [notificationsEnabled]);
```

#### Currency Selection
Alert-based picker. For better UX, consider:
```typescript
// Use modal picker or dedicated screen
<Modal visible={showCurrencyPicker}>
  <CurrencyPicker
    selected={selectedCurrency}
    onSelect={setSelectedCurrency}
  />
</Modal>
```

#### Theme Selection
Supports:
- Light mode
- Dark mode (TODO: implement dark theme)
- System (follows device setting)

### Support Links

#### Help Center
```typescript
const handleHelpCenter = () => {
  Linking.openURL('https://streamsense.app/help');
};
```

#### Contact Support
```typescript
const handleContactSupport = () => {
  Linking.openURL('mailto:support@streamsense.app');
};
```

#### Rate App
```typescript
const handleRateApp = () => {
  const storeUrl = Platform.select({
    ios: 'itms-apps://itunes.apple.com/app/id123456789',
    android: 'market://details?id=com.streamsense.app',
  });
  Linking.openURL(storeUrl);
};
```

### Account Actions

#### Logout
Two-step confirmation:
```typescript
Alert.alert(
  'Logout',
  'Are you sure?',
  [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Logout',
      style: 'destructive',
      onPress: async () => await logout()
    }
  ]
);
```

#### Delete Account
Three-step process:
1. Initial warning
2. Confirmation dialog
3. Text input verification (optional)

Destructive styling applied to make impact clear.

## Styling

### Theme Colors
- Primary: Blue for icons and badges
- Error: Red for destructive actions
- Warning: Orange for premium badges
- Gray: Subtle text and dividers

### Layout
- Card-based sections
- Consistent icon sizes (22px in 36px circle)
- Dividers between items
- Proper touch targets (48px+ height)

### Visual Hierarchy
```
Section Header (uppercase, gray, small)
  └─ Card
      ├─ Setting Item
      │   ├─ Icon (colored circle)
      │   ├─ Title (bold, dark)
      │   ├─ Subtitle (regular, gray)
      │   └─ Action (switch/chevron/value)
      ├─ Divider
      └─ Setting Item
```

## Premium Integration

Settings that check premium status:
```typescript
const { isPremium, expirationDate } = usePremiumStore();

// Show premium badge
<SettingItem
  title="Monthly Email Reports"
  badge={!isPremium ? 'PREMIUM' : undefined}
  showSwitch
  switchValue={emailReports && isPremium}
  onSwitchChange={isPremium ? setEmailReports : undefined}
/>
```

## Accessibility

- All interactive elements have proper touch targets
- Screen reader labels on icons
- Switch components have accessible roles
- Destructive actions clearly marked
- Proper semantic hierarchy

## Future Enhancements

### Account Section
- [ ] Edit profile screen
- [ ] Avatar upload
- [ ] Password change
- [ ] Two-factor authentication
- [ ] Bank connection management

### Preferences Section
- [ ] Notification categories
- [ ] Custom alert times
- [ ] More currency options
- [ ] Dark mode implementation
- [ ] Language selection
- [ ] Data export

### Support Section
- [ ] In-app FAQ
- [ ] Live chat support
- [ ] Bug reporting
- [ ] Feature requests
- [ ] App tutorial

### Analytics
- [ ] Track which settings are most used
- [ ] Monitor logout/delete patterns
- [ ] A/B test setting layouts

## Testing

### Test Cases

1. **Account Section**
   - [ ] Profile displays correct user info
   - [ ] Premium status shows correctly
   - [ ] Free status shows correctly
   - [ ] Expiration date formats properly

2. **Preferences**
   - [ ] Switches toggle correctly
   - [ ] Premium-only switches disabled for free users
   - [ ] Currency selection works
   - [ ] Theme selection works

3. **Support**
   - [ ] Help center link opens
   - [ ] Email client opens for support
   - [ ] Rate app opens store
   - [ ] Share functionality works

4. **Account Actions**
   - [ ] Logout confirmation shows
   - [ ] Logout actually logs out
   - [ ] Delete account has multiple confirmations
   - [ ] Delete account works

### Edge Cases
- User with no name (shows email)
- User with expired premium
- User with no banks connected
- Invalid email format

## Related Files

- [SettingsScreen.tsx](./screens/SettingsScreen.tsx) - Main implementation
- [Premium Feature](../premium/README.md) - Premium status integration
- [Auth Feature](../auth/README.md) - Logout functionality
- [Navigation](../../navigation/types.ts) - Settings stack types

## Example Implementations

### Add New Setting

```typescript
// In SettingsScreen.tsx, add to appropriate section
<SettingItem
  icon="new-icon"
  title="New Setting"
  subtitle="Setting description"
  showSwitch
  switchValue={newSettingEnabled}
  onSwitchChange={setNewSettingEnabled}
  showChevron={false}
/>
```

### Add New Section

```typescript
<SectionHeader title="New Section" />
<Card style={styles.card}>
  <SettingItem
    icon="icon-name"
    title="First Item"
    onPress={handleFirstItem}
  />

  <View style={styles.divider} />

  <SettingItem
    icon="icon-name"
    title="Second Item"
    onPress={handleSecondItem}
  />
</Card>
```

### Navigate from Settings

```typescript
// Add to navigation params if needed
export type SettingsStackParamList = {
  Settings: undefined;
  EditProfile: { name: string; email: string };
  BankConnections: undefined;
};

// Navigate from settings
const handleEditProfile = () => {
  navigation.navigate('EditProfile', {
    name: userName,
    email: userEmail
  });
};
```
