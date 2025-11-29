# Plaid Integration Debugging Guide

This guide helps you debug and fix Plaid connection issues in StreamSense.

---

## ✅ Step 1: Set Up Plaid Secrets in Supabase

### 1.1 Get Your Plaid Credentials

1. Go to [Plaid Dashboard](https://dashboard.plaid.com/)
2. Sign up or log in
3. Go to **Team Settings** → **Keys**
4. Copy your:
   - **Client ID** (starts with `5f...` or similar)
   - **Sandbox Secret** (starts with `...sandbox...`)

### 1.2 Add Secrets to Supabase Edge Functions

1. Go to **Supabase Dashboard** → **Edge Functions** → **plaid-create-link-token**
2. Click **Settings** → **Secrets**
3. Add these secrets:

```
PLAID_CLIENT_ID=your_plaid_client_id_here
PLAID_SECRET=your_plaid_sandbox_secret_here
PLAID_ENV=sandbox
```

**IMPORTANT:** Make sure there are NO quotes, NO spaces, NO trailing characters!

✅ **Correct:**
```
PLAID_CLIENT_ID=5f8a7b6c5d4e3f2a1b0c9d8e
PLAID_SECRET=1a2b3c4d5e6f7g8h9i0jsandbox
PLAID_ENV=sandbox
```

❌ **Wrong:**
```
PLAID_CLIENT_ID="5f8a7b6c5d4e3f2a1b0c9d8e"  ❌ No quotes!
PLAID_SECRET=1a2b3c4d5e6f7g8h9i0jsandbox   ❌ Trailing space!
PLAID_ENV=development                       ❌ Use "sandbox"!
```

---

## ✅ Step 2: Deploy the Updated Edge Function

### 2.1 Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

### 2.2 Login to Supabase

```bash
supabase login
```

### 2.3 Link to Your Project

```bash
# Get your project reference from: https://supabase.com/dashboard/project/_/settings/api
supabase link --project-ref YOUR_PROJECT_REF
```

### 2.4 Deploy the Edge Function

```bash
supabase functions deploy plaid-create-link-token
```

**Expected output:**
```
Deploying plaid-create-link-token...
Deployed plaid-create-link-token (version: xxx)
```

---

## ✅ Step 3: Check Edge Function Logs

### 3.1 View Logs in Supabase Dashboard

1. Go to **Supabase Dashboard** → **Edge Functions** → **plaid-create-link-token**
2. Click **Logs**
3. Try connecting your bank in the app
4. Watch the logs in real-time

### 3.2 What to Look For

✅ **Success logs:**
```
[Plaid] Environment check: { hasClientId: true, hasSecret: true, env: 'sandbox', ... }
[Plaid] Auth header present: true
[Plaid] User authentication check: { hasUser: true, ... }
[Plaid] Creating link token for user: abc-123-def
[Plaid] Calling Plaid API: https://sandbox.plaid.com/link/token/create
[Plaid] Plaid API response status: 200
[Plaid] Successfully created link token
```

❌ **Error logs (Missing Credentials):**
```
[Plaid] Environment check: { hasClientId: false, hasSecret: false, ... }
[Plaid] Missing credentials! ...
ERROR: Plaid credentials not configured
```
**Fix:** Go back to Step 1 and add the secrets.

❌ **Error logs (Invalid Credentials):**
```
[Plaid] Plaid API response status: 400
[Plaid] Plaid API error details: { errorCode: 'INVALID_API_KEYS', ... }
```
**Fix:** Double-check your Client ID and Secret are correct.

❌ **Error logs (Auth Failed):**
```
[Plaid] Auth header present: false
ERROR: Missing authorization header
```
**Fix:** The app isn't sending the auth token. Check the client-side code.

---

## ✅ Step 4: Test in the App

### 4.1 Open Browser Console

1. Open your app in a browser
2. Press **F12** to open Developer Tools
3. Go to **Console** tab

### 4.2 Try Connecting Your Bank

1. Navigate to the Plaid connection screen
2. Click "Get Started" or "Connect Bank"
3. Watch the console logs

### 4.3 What to Look For

✅ **Success logs:**
```
[Plaid Client] Creating link token for user: abc-123-def
[Plaid Client] Session check: { hasSession: true, hasAccessToken: true, ... }
[Plaid Client] Invoking edge function...
[Plaid Client] Edge function response: { hasData: true, hasError: false, ... }
[Plaid Client] Successfully received link token
```

❌ **Error logs (No Session):**
```
[Plaid Client] Session check: { hasSession: false }
ERROR: No active session
```
**Fix:** User is not logged in. Sign in first.

❌ **Error logs (Edge Function Error):**
```
[Plaid Client] Edge function response: { hasData: false, hasError: true, error: {...} }
ERROR: Failed to create link token
```
**Fix:** Check Edge Function logs (Step 3) to see the server-side error.

---

## ✅ Step 5: Common Issues & Fixes

### Issue 1: "Edge Function returned a non-2xx status code"

**Cause:** Edge function is crashing or returning an error.

**Fix:**
1. Check Edge Function logs (Step 3.1)
2. Look for the error message
3. Follow the specific fix for that error

### Issue 2: "Plaid credentials not configured"

**Cause:** Secrets are not set in Supabase.

**Fix:**
1. Go to Step 1.2
2. Add PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV
3. Redeploy the function (Step 2.4)

### Issue 3: "INVALID_API_KEYS" from Plaid

**Cause:** Wrong Client ID or Secret.

**Fix:**
1. Go to [Plaid Dashboard](https://dashboard.plaid.com/) → **Team Settings** → **Keys**
2. Copy the **correct** Client ID and Sandbox Secret
3. Update the secrets in Supabase (Step 1.2)
4. Redeploy the function (Step 2.4)

### Issue 4: "User not authenticated"

**Cause:** App isn't sending the auth token.

**Fix:**
1. Check that the user is logged in
2. Verify the session exists in browser console:
   ```javascript
   const { data: { session } } = await supabase.auth.getSession();
   console.log('Session:', session);
   ```
3. If session is null, log in again

### Issue 5: Function works in logs but fails in app

**Cause:** Response format mismatch.

**Fix:**
1. Check Edge Function response in logs
2. Verify it returns `{ linkToken: "..." }`
3. Check client expects `data.linkToken` not `data.link_token`

---

## ✅ Step 6: Verify Everything Works

### 6.1 Full Test Checklist

- [ ] Plaid secrets are set in Supabase
- [ ] Edge function is deployed
- [ ] Edge function logs show success
- [ ] Browser console shows success
- [ ] Plaid Link modal opens
- [ ] Can select a bank (use "First Platypus Bank" for testing)
- [ ] Can enter test credentials (user_good / pass_good)
- [ ] Connection succeeds

### 6.2 Test Credentials for Sandbox

Use these credentials to test in sandbox mode:

**Institution:** First Platypus Bank
**Username:** `user_good`
**Password:** `pass_good`

---

## 📝 Quick Reference

### Environment Variables (Edge Function Secrets)

```bash
PLAID_CLIENT_ID=<your_plaid_client_id>
PLAID_SECRET=<your_plaid_sandbox_secret>
PLAID_ENV=sandbox
```

### Deploy Command

```bash
supabase functions deploy plaid-create-link-token
```

### Check Logs

```bash
# In Supabase Dashboard:
Edge Functions → plaid-create-link-token → Logs

# Or via CLI:
supabase functions logs plaid-create-link-token
```

### Test Credentials

- **Institution:** First Platypus Bank
- **Username:** `user_good`
- **Password:** `pass_good`

---

## 🐛 Still Having Issues?

If you're still stuck:

1. **Check Edge Function logs** - This shows what's happening on the server
2. **Check browser console** - This shows what's happening on the client
3. **Compare the logs** - Find where the flow breaks
4. **Look for specific error codes** - Google the Plaid error code

### Need Help?

1. Copy the **exact error message** from logs
2. Copy the **browser console output**
3. Check if secrets are correctly set
4. Verify function is deployed

---

**Good luck! 🚀**
