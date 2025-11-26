# Transaction Sync System

Complete guide to the transaction syncing system in StreamSense using Plaid's incremental sync API.

## Overview

StreamSense uses Plaid's `/transactions/sync` endpoint for efficient, cursor-based transaction synchronization. This provides:

- **Incremental updates** - Only new/modified/removed transactions are synced
- **Cursor-based pagination** - Handle large transaction histories efficiently
- **Real-time webhooks** - Automatic sync triggers when new transactions are available
- **Automatic subscription detection** - Match transactions to streaming services

## Architecture

### Components

1. **Edge Functions**:
   - `plaid-sync-transactions` - Syncs transactions using cursor-based pagination
   - `plaid-webhook` - Handles real-time webhook notifications from Plaid

2. **Client Service** (`src/services/plaid.ts`):
   - `syncTransactions()` - Sync single Plaid item
   - `syncAllPlaidItems()` - Sync all connected banks

3. **Database**:
   - `plaid_items.sync_cursor` - Tracks sync position per item
   - `plaid_items.last_synced` - Timestamp of last successful sync
   - `transactions` - Stores all synced transactions

## How It Works

### Initial Sync

When a user connects their bank account:

1. User completes Plaid Link flow
2. Public token is exchanged for access token
3. Initial transaction sync is triggered (last 30 days)
4. Cursor is stored in `plaid_items.sync_cursor`

```typescript
// In PlaidConnectionScreen.tsx
const result = await exchangePublicToken(publicToken, metadata);
await syncTransactions(result.plaidItem.id);
```

### Incremental Sync

For subsequent syncs, only changes since the last cursor are fetched:

1. Retrieve stored cursor from `plaid_items.sync_cursor`
2. Call Plaid `/transactions/sync` with cursor
3. Process added/modified/removed transactions
4. Update cursor for next sync

```typescript
// Manual sync
await syncTransactions(plaidItemId);

// Sync all connected banks
const result = await syncAllPlaidItems();
```

### Webhook-Triggered Sync

Plaid sends webhooks when new transactions are available:

1. Plaid detects new transaction data
2. Webhook sent to `plaid-webhook` Edge Function
3. Function triggers `plaid-sync-transactions` automatically
4. Transactions synced in real-time

## Cursor-Based Pagination

The sync cursor is an opaque string that represents a position in the transaction history:

```typescript
interface SyncRequest {
  plaidItemId: string;
  cursor?: string;    // Optional - uses stored cursor if not provided
  count?: number;     // Number of transactions per page (default: 500)
}
```

### Pagination Flow

```
┌─────────────────┐
│ Get Plaid Item  │
│  & Stored Cursor│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Call /sync API  │
│  with cursor    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Process Changes:│
│ - Added txns    │
│ - Modified txns │
│ - Removed txns  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Update cursor   │
│ & last_synced   │
└────────┬────────┘
         │
         ▼
    Has More? ────Yes────┐
         │                │
         No               │
         │                │
         ▼                │
      Done      ◄─────────┘
```

## Transaction Processing

### Added Transactions

When new transactions are detected:

1. Skip pending transactions
2. Filter for debit transactions (expenses only)
3. Match merchant name to streaming services
4. Insert transaction into database
5. Create/update subscription if matched

```typescript
// Example: Netflix transaction detected
{
  merchant_name: "NETFLIX.COM",
  amount: 15.49,
  date: "2025-01-15"
}
// → Creates/updates Netflix subscription
```

### Modified Transactions

Transactions can be modified after initial import:

- Amount changes
- Merchant name updates
- Category changes
- Pending → posted status

### Removed Transactions

Transactions may be removed if:

- Marked as duplicate by institution
- Cancelled/reversed by merchant
- Corrected by bank

## Subscription Detection

### Matching Algorithm

Transactions are matched to streaming services using merchant patterns:

```sql
SELECT id, name, merchant_patterns
FROM streaming_services;

-- Example patterns:
-- Netflix: ["NETFLIX", "Netflix.com", "NETFLIX.COM"]
-- Hulu: ["HULU", "Hulu.com"]
-- Spotify: ["SPOTIFY", "Spotify.com"]
```

### Auto-Detection Rules

A transaction is considered a subscription if:

1. ✅ Merchant name matches a known pattern
2. ✅ Transaction is a debit (expense)
3. ✅ Transaction is not pending

### Subscription Creation

When a subscription transaction is detected:

```typescript
// Check if subscription already exists
const existing = await supabase
  .from('user_subscriptions')
  .select('id, price')
  .eq('service_id', serviceId)
  .eq('status', 'active')
  .single();

if (!existing) {
  // Create new subscription
  await supabase.from('user_subscriptions').insert({
    service_id: serviceId,
    price: amount,
    billing_cycle: 'monthly',
    status: 'active',
    detected_from: 'plaid'
  });
} else if (existing.price !== amount) {
  // Update price if changed
  await supabase
    .from('user_subscriptions')
    .update({ price: amount })
    .eq('id', existing.id);
}
```

## Webhook Events

### Supported Webhooks

#### TRANSACTIONS

- `SYNC_UPDATES_AVAILABLE` - New transaction data available → **Triggers sync**
- `INITIAL_UPDATE` - Initial historical pull complete → **Triggers sync**
- `HISTORICAL_UPDATE` - Extended history pull complete → **Triggers sync**
- `DEFAULT_UPDATE` - Standard update → **Triggers sync**
- `TRANSACTIONS_REMOVED` - Transactions removed → **Deletes transactions**

#### ITEM

- `ERROR` - Item error occurred → **Marks item as inactive**
- `PENDING_EXPIRATION` - Access expiring soon → **Sets error code**
- `USER_PERMISSION_REVOKED` - User revoked access → **Marks inactive**
- `WEBHOOK_UPDATE_ACKNOWLEDGED` - Webhook URL updated → **Logs event**

### Webhook Setup

Configure webhook URL in Plaid Dashboard:

```
https://your-project.supabase.co/functions/v1/plaid-webhook
```

## Error Handling

### Common Errors

#### ITEM_LOGIN_REQUIRED

User needs to re-authenticate with their bank:

```typescript
// Automatically set in webhook handler
await supabase
  .from('plaid_items')
  .update({
    is_active: false,
    error_code: 'ITEM_LOGIN_REQUIRED'
  });

// User must reconnect via Plaid Link with update mode
```

#### INSTITUTION_DOWN

Bank is temporarily unavailable:

```typescript
// Retry logic with exponential backoff
let retries = 0;
while (retries < 3) {
  try {
    await syncTransactions(itemId);
    break;
  } catch (error) {
    if (error.code === 'INSTITUTION_DOWN') {
      await sleep(2 ** retries * 1000);
      retries++;
    } else {
      throw error;
    }
  }
}
```

## Database Schema

### plaid_items

```sql
CREATE TABLE plaid_items (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  access_token TEXT NOT NULL,          -- Encrypted
  item_id TEXT UNIQUE NOT NULL,
  sync_cursor TEXT,                     -- ← Cursor for incremental sync
  last_synced TIMESTAMPTZ,              -- ← Last sync timestamp
  is_active BOOLEAN DEFAULT true,
  error_code TEXT,
  institution_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### transactions

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  plaid_item_id UUID REFERENCES plaid_items(id),
  plaid_transaction_id TEXT UNIQUE,
  amount DECIMAL(10, 2),
  merchant_name TEXT,
  date DATE,
  category TEXT[],
  is_subscription BOOLEAN DEFAULT false,
  matched_service_id UUID REFERENCES streaming_services(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Usage Examples

### Manual Sync

```typescript
import { syncTransactions } from '@/services/plaid';

// Sync specific Plaid item
const result = await syncTransactions('plaid-item-id');
console.log(`Synced ${result.transactionsSynced} transactions`);
console.log(`Detected ${result.subscriptionsDetected} subscriptions`);
```

### Sync All Items

```typescript
import { syncAllPlaidItems } from '@/services/plaid';

// Sync all connected banks
const result = await syncAllPlaidItems();
console.log(`Synced ${result.itemsSynced} items`);
console.log(`Total transactions: ${result.totalTransactions}`);
console.log(`Total subscriptions: ${result.totalSubscriptions}`);

if (result.errors.length > 0) {
  console.error('Errors:', result.errors);
}
```

### Background Sync

```typescript
// In app initialization or background task
useEffect(() => {
  const syncInterval = setInterval(async () => {
    try {
      await syncAllPlaidItems();
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }, 60 * 60 * 1000); // Every hour

  return () => clearInterval(syncInterval);
}, []);
```

## Performance Optimization

### Batch Processing

Process transactions in batches to avoid overwhelming the database:

```typescript
// Process 500 transactions per API call
await syncTransactions(itemId, undefined, 500);
```

### Limit Total Transactions

Prevent timeouts by limiting total transactions processed:

```typescript
// In plaid-sync-transactions function
if (totalAdded + totalModified > 5000) {
  console.warn('Processed 5000+ transactions, stopping');
  break;
}
```

### Concurrent Syncs

Avoid syncing the same item concurrently:

```typescript
// Use a lock/semaphore pattern
const syncLocks = new Set<string>();

async function syncWithLock(itemId: string) {
  if (syncLocks.has(itemId)) {
    throw new Error('Sync already in progress');
  }

  syncLocks.add(itemId);
  try {
    await syncTransactions(itemId);
  } finally {
    syncLocks.delete(itemId);
  }
}
```

## Testing

### Sandbox Test Credentials

```
Username: user_good
Password: pass_good
MFA Code: 1234
```

### Test Transactions

Sandbox automatically generates test transactions for common merchants including:

- Netflix
- Hulu
- Spotify
- Amazon Prime
- Disney+

### Manual Testing

```bash
# Deploy Edge Functions
supabase functions deploy plaid-sync-transactions
supabase functions deploy plaid-webhook

# Test sync function
curl -X POST \
  https://your-project.supabase.co/functions/v1/plaid-sync-transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plaidItemId": "your-plaid-item-id"}'

# View logs
supabase functions logs plaid-sync-transactions --tail
```

## Monitoring

### Key Metrics

- **Sync frequency**: How often items are synced
- **Transaction volume**: Number of transactions per sync
- **Subscription detection rate**: % of transactions matched
- **Error rate**: Failed syncs / total syncs
- **Cursor progression**: Tracking sync position

### Logging

```typescript
console.log('Sync completed:', {
  itemId: plaidItem.id,
  transactionsAdded: totalAdded,
  transactionsModified: totalModified,
  transactionsRemoved: totalRemoved,
  subscriptionsDetected,
  cursor: currentCursor,
  duration: Date.now() - startTime
});
```

## Best Practices

1. **Use webhooks** - Enable real-time sync instead of polling
2. **Store cursors** - Always save and use sync cursors for efficiency
3. **Handle errors gracefully** - Mark items inactive on auth errors
4. **Limit batch size** - Process max 500 transactions per request
5. **Deduplicate** - Check for existing transactions before inserting
6. **Update prices** - Keep subscription prices in sync with transactions
7. **Background sync** - Schedule periodic syncs as backup to webhooks
8. **Monitor performance** - Track sync duration and success rates

## Troubleshooting

### No transactions synced

- Check if Plaid item is active
- Verify cursor is not stale
- Ensure transactions exist in date range
- Check webhook configuration

### Duplicate transactions

- Verify unique constraint on `plaid_transaction_id`
- Check for concurrent syncs
- Review transaction processing logic

### Missing subscriptions

- Verify merchant patterns are correct
- Check transaction amount (should be > 0)
- Ensure transaction is not pending
- Review matching algorithm

### Webhook not firing

- Verify webhook URL in Plaid Dashboard
- Check Edge Function is deployed
- Review webhook signature validation
- Check CORS headers

## Production Checklist

- [ ] Deploy all Edge Functions
- [ ] Configure webhook URL in Plaid Dashboard
- [ ] Set up webhook verification
- [ ] Add proper encryption for access tokens
- [ ] Implement rate limiting
- [ ] Set up monitoring and alerting
- [ ] Configure error tracking (Sentry, etc.)
- [ ] Schedule background sync jobs
- [ ] Test error recovery flows
- [ ] Document subscription patterns
- [ ] Review and optimize database indices

## Resources

- [Plaid Transactions Sync API](https://plaid.com/docs/api/products/transactions/#transactionssync)
- [Plaid Webhooks](https://plaid.com/docs/api/webhooks/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
