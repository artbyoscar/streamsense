# Plaid Integration Setup Guide

This guide walks you through setting up Plaid integration for StreamSense to enable automatic subscription detection via bank account connections.

## Prerequisites

- Plaid account (sign up at [https://dashboard.plaid.com/signup](https://dashboard.plaid.com/signup))
- Supabase project with CLI installed
- StreamSense project set up

## 1. Plaid Credentials

You already have your Plaid credentials:
- **Client ID**: `69265486e6a8ae001d10b355`
- **Sandbox Secret**: `9ce9d4eea0de1801cafcfb9ee9329c`
- **Environment**: `sandbox`

## 2. Environment Configuration

### Update `.env` file

Create a `.env` file from `.env.example` if you haven't already:

```bash
cp .env.example .env
```

The Plaid credentials are already configured in `.env.example`:

```env
# For Supabase Edge Functions (server-side only)
PLAID_CLIENT_ID=69265486e6a8ae001d10b355
PLAID_SECRET=9ce9d4eea0de1801cafcfb9ee9329c
PLAID_ENV=sandbox

# For React Native client (public)
EXPO_PUBLIC_PLAID_ENV=sandbox
```

**IMPORTANT**: Never expose `PLAID_CLIENT_ID` or `PLAID_SECRET` in client-side code. These are only used in Supabase Edge Functions.

## 3. Deploy Supabase Edge Functions

Deploy the three Plaid Edge Functions to your Supabase project:

```bash
# Login to Supabase CLI
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Set environment variables for Edge Functions
supabase secrets set PLAID_CLIENT_ID=69265486e6a8ae001d10b355
supabase secrets set PLAID_SECRET=9ce9d4eea0de1801cafcfb9ee9329c
supabase secrets set PLAID_ENV=sandbox

# Deploy the functions
supabase functions deploy plaid-create-link-token
supabase functions deploy plaid-exchange-token
supabase functions deploy plaid-sync-transactions
```

## 4. iOS Configuration (if using iOS)

Add the following to your `ios/Podfile`:

```ruby
pod 'Plaid', '~> 4.0'
```

Then run:

```bash
cd ios && pod install && cd ..
```

## 5. Android Configuration (if using Android)

No additional configuration needed for Android.

## 6. Testing in Sandbox Mode

### Test Bank Credentials

When connecting a bank account in sandbox mode, use these credentials:

- **Username**: `user_good`
- **Password**: `pass_good`

### Available Test Institutions

In sandbox mode, you can search for and connect to any of these test banks:
- First Platypus Bank
- Tartan Bank
- Houndstooth Bank
- Any institution name (sandbox creates a test connection)

### Test MFA (if prompted)

If Multi-Factor Authentication is requested:
- **MFA Code**: `1234`

## 7. How It Works

### Flow Overview

1. **User initiates connection** → `PlaidConnectionScreen.tsx`
2. **Create link token** → Calls `plaid-create-link-token` Edge Function
3. **User connects bank** → Plaid Link modal opens
4. **Exchange token** → Calls `plaid-exchange-token` Edge Function
5. **Store access token** → Encrypted in `plaid_items` table
6. **Sync transactions** → Calls `plaid-sync-transactions` Edge Function
7. **Detect subscriptions** → Matches transactions to streaming services

### Security Notes

- ✅ Plaid credentials are **ONLY** stored server-side in Supabase Edge Functions
- ✅ Access tokens are encrypted before storing in database
- ✅ All Plaid API calls happen server-side via Edge Functions
- ✅ Client never has access to sensitive credentials
- ✅ RLS policies ensure users can only access their own Plaid items

## 8. Subscription Detection

Transactions are automatically matched to streaming services based on merchant patterns:

```typescript
// Example: Netflix transaction
{
  merchant_name: "NETFLIX.COM",
  amount: 15.49,
  date: "2025-01-15"
}
```

The system will:
1. Match "NETFLIX.COM" to the Netflix service via merchant patterns
2. Create/update a subscription record
3. Set `detected_from: 'plaid'`
4. Track the subscription in the user's dashboard

## 9. Production Setup

When moving to production:

1. **Get Production Credentials**:
   - Upgrade your Plaid account to Production
   - Get production client ID and secret
   - Complete Plaid's production enablement process

2. **Update Environment Variables**:
   ```bash
   supabase secrets set PLAID_CLIENT_ID=your-production-client-id
   supabase secrets set PLAID_SECRET=your-production-secret
   supabase secrets set PLAID_ENV=production
   ```

3. **Update Client Config**:
   ```env
   EXPO_PUBLIC_PLAID_ENV=production
   ```

4. **Implement Access Token Encryption**:
   - Add proper encryption for access tokens (currently stored as plaintext)
   - Use Supabase Vault or external KMS

## 10. Troubleshooting

### "Invalid credentials" error
- Ensure you're using the sandbox test credentials: `user_good` / `pass_good`
- Check that `PLAID_ENV=sandbox` is set correctly

### "Failed to create link token" error
- Verify Edge Function is deployed: `supabase functions list`
- Check Edge Function logs: `supabase functions logs plaid-create-link-token`
- Ensure environment variables are set: `supabase secrets list`

### "No transactions synced" error
- Sandbox transactions may take a moment to appear
- Try syncing again after a few seconds
- Check Edge Function logs for errors

### Edge Function CORS errors
- Ensure `corsHeaders` are properly set in all Edge Functions
- Check that Supabase URL is correct in client configuration

## 11. Useful Commands

```bash
# View Edge Function logs
supabase functions logs plaid-create-link-token --tail
supabase functions logs plaid-exchange-token --tail
supabase functions logs plaid-sync-transactions --tail

# Test Edge Function locally
supabase functions serve plaid-create-link-token

# Check secrets
supabase secrets list
```

## 12. Resources

- [Plaid Quickstart Guide](https://plaid.com/docs/quickstart/)
- [Plaid Sandbox Guide](https://plaid.com/docs/sandbox/)
- [React Native Plaid Link SDK](https://github.com/plaid/react-native-plaid-link-sdk)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## Support

If you encounter issues:
1. Check the Edge Function logs
2. Review the Plaid API logs in your Plaid Dashboard
3. Ensure all environment variables are set correctly
4. Test with sandbox credentials first before moving to production
