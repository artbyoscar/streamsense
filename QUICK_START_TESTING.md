# Quick Start - Testing Your New Features

Here's how to quickly test all the features we've implemented:

## Step 1: Start the App

```bash
# Install dependencies (if not already done)
npm install

# Start Expo development server
npx expo start
```

Press:
- `a` for Android emulator
- `i` for iOS simulator
- Or scan QR code for physical device

## Step 2: Access the Test Screen

1. **Login** to the app (or register if you haven't)
2. Navigate to **Settings** tab (bottom right icon)
3. Scroll down to the **"Developer"** section
4. Tap **"Test Features"** button

You should now see the comprehensive test screen!

## Step 3: Test Each Feature

### ✅ Error Handling Tests

**Toggle Error View**
- Tap the button to show/hide an error message
- Check the retry button works

**Trigger Crash (ErrorBoundary)**
- Tap this button to intentionally crash the app
- The ErrorBoundary should catch it and show a fallback UI

### ✅ Toast Notifications

Tap each button to test:
- **Show Success** - Green toast at bottom
- **Show Error** - Red toast with error icon
- **Show Warning** - Orange/yellow toast
- **Show Info** - Blue toast

### ✅ Loading States

**Toggle Skeletons**
- Shows animated skeleton loaders
- Watch the shimmer effect

### ✅ Optimized Images

The screen shows:
- Regular optimized image (with caching)
- Avatar with image
- Avatar with fallback initials (no image)
- Service logo (Netflix)

Try navigating away and back - images should load instantly from cache!

### ✅ Performance Utilities

**Test Performance Measurement**
- Runs a 1-second async operation
- Check console for: `[Performance] testAsyncOperation: 1000ms`
- Shows toast when complete

### ✅ Sentry Integration

**Status**: Shows if Sentry is enabled
- In development: ⚠️ Disabled (Dev Mode)
- In production: ✅ Enabled

Test buttons:
- **Capture Exception** - Sends test error to Sentry (console in dev)
- **Capture Message** - Sends test message to Sentry
- **Add Breadcrumbs** - Adds 4 different breadcrumb types
- **Set User Context** - Sets test user context
- **Clear User Context** - Clears user context

**Note**: In development, Sentry doesn't send events. Check console logs instead!

### ✅ Network Status

At the top of the test screen, you'll see:
- Connected: ✅/❌
- Internet: ✅/❌
- Type: wifi/cellular/etc
- Offline: Yes/No

**To test**:
1. Turn on Airplane Mode on your device
2. Watch status change to offline
3. Red "No Internet Connection" banner appears at top
4. Turn off Airplane Mode
5. Status updates, banner slides away

## Step 4: Additional Testing

### Test Offline Banner App-Wide

1. Turn on **Airplane Mode**
2. Navigate to **Dashboard**
3. Red banner should appear at top
4. Try to load data (will fail gracefully)
5. Turn off **Airplane Mode**
6. Banner disappears

### Test Error Handling in Real Screens

1. Go to **Dashboard** or **Watchlist**
2. Turn on **Airplane Mode**
3. Try to refresh/load data
4. Should see error toast or ErrorView with retry button

### Check Console Logs

Open React Native debugger console to see:
- Performance measurements
- Sentry events (in dev mode)
- Network status changes
- Render performance tracking

## Step 5: Test in Production Build (Optional)

To fully test Sentry:

```bash
# Build production APK/IPA
eas build --platform android --profile production
# or
eas build --platform ios --profile production

# Install and test
```

In production build:
- Sentry **will** send events
- Check your Sentry dashboard at sentry.io
- Trigger errors and see them appear in dashboard

## What You've Tested

After completing these steps, you've verified:

✅ **Error Handling**
- ErrorView component works
- Skeleton loaders animate correctly
- Toast notifications display properly
- Offline banner appears/disappears
- Network status tracking works
- ErrorBoundary catches crashes

✅ **Performance**
- React.memo prevents unnecessary re-renders
- Image optimization and caching works
- Performance measurement utilities work
- Console shows performance metrics

✅ **Sentry Integration**
- Error capture (console in dev, dashboard in prod)
- User context tracking
- Breadcrumb trails
- Message capture
- Integration with ErrorBoundary

## Troubleshooting

**Test screen not showing in Settings?**
- Make sure you're in development mode (`__DEV__` is true)
- The "Developer" section only appears in dev builds

**Toast not appearing?**
- Check that App.tsx has `<ToastProvider>` wrapper
- Look for Snackbar at bottom of screen

**Images not loading?**
- Check internet connection
- Try: `npx expo start -c` to clear cache

**Sentry showing "Disabled"?**
- This is normal in development mode
- Sentry only sends events in production builds
- Check console for Sentry logs instead

**Console not showing logs?**
- Enable Remote JS Debugging in Expo dev menu
- Or install React Native Debugger

## Next Steps

After testing:
1. Read full documentation:
   - [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md)
   - [docs/ERROR_HANDLING.md](docs/ERROR_HANDLING.md)
   - [docs/PERFORMANCE.md](docs/PERFORMANCE.md)
   - [docs/SENTRY_INTEGRATION.md](docs/SENTRY_INTEGRATION.md)

2. Integrate into your real screens:
   - Add error handling to API calls
   - Use skeleton loaders during data fetch
   - Show toasts for user feedback
   - Track performance of slow operations

3. Set up Sentry for production:
   - Create account at sentry.io
   - Copy DSN to `.env`
   - Build production app
   - Monitor errors in dashboard

## Support

For detailed testing instructions, see [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md)

Happy testing! 🎉
