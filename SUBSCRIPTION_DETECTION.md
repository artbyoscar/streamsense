## Subscription Detection Algorithm

Complete guide to the intelligent subscription detection system in StreamSense.

## Overview

StreamSense uses a sophisticated AI-powered algorithm to detect recurring subscriptions from transaction history. The system combines:

- **Fuzzy string matching** using Levenshtein distance
- **Pattern recognition** for recurring charges
- **Confidence scoring** based on multiple factors
- **Automatic subscription creation** for high-confidence matches
- **User review system** for medium-confidence suggestions

## Architecture

### Components

1. **Client Service** (`src/services/subscriptionDetection.ts`):
   - Fuzzy string matching algorithms
   - Pattern detection logic
   - Confidence scoring calculations
   - TypeScript types and interfaces

2. **Edge Function** (`detect-subscriptions`):
   - Server-side detection execution
   - Batch processing of transactions
   - Auto-creation of subscriptions
   - Suggestion management

3. **Database**:
   - `suggested_subscriptions` table - Stores lower-confidence detections for review
   - Confidence thresholds for automation

## Detection Algorithm

### Step 1: Fuzzy String Matching

Uses Levenshtein distance to match merchant names to known streaming services:

```typescript
// Example: Match "NETFLIX INC" to "Netflix"
const similarity = stringSimilarity("NETFLIX INC", "Netflix");
// Returns: 75 (75% similar)
```

#### Normalization

Merchant names are normalized before matching:

```typescript
normalizeMerchantName("NETFLIX, INC.")
// → "netflix"

normalizeMerchantName("Hulu LLC - Payment")
// → "hulu payment"
```

Normalization rules:
- Convert to lowercase
- Remove company suffixes (Inc, LLC, Ltd, Corp)
- Remove special characters
- Normalize whitespace

#### Similarity Calculation

```typescript
function stringSimilarity(str1, str2): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  const similarity = (1 - distance / maxLength) * 100;
  return similarity; // 0-100
}
```

### Step 2: Pattern Recognition

Detects recurring payment patterns:

#### Transaction Grouping

```typescript
// Group transactions by merchant
const groups = {
  "netflix": [
    { date: "2025-01-15", amount: 15.49 },
    { date: "2024-12-15", amount: 15.49 },
    { date: "2024-11-15", amount: 15.49 }
  ],
  "spotify": [
    { date: "2025-01-10", amount: 10.99 },
    { date: "2024-12-10", amount: 10.99 }
  ]
}
```

#### Interval Analysis

Calculate days between transactions:

```typescript
intervals = [31, 30, 31] // Days between transactions
averageInterval = 30.67 days
```

#### Billing Cycle Detection

```typescript
function determineBillingCycle(averageInterval) {
  if (Math.abs(averageInterval - 7) <= 7) return 'weekly';
  if (Math.abs(averageInterval - 30) <= 7) return 'monthly';
  if (Math.abs(averageInterval - 90) <= 14) return 'quarterly';
  if (Math.abs(averageInterval - 365) <= 30) return 'yearly';
  return null;
}
```

Allows variance:
- Weekly: ±7 days
- Monthly: ±7 days
- Quarterly: ±14 days
- Yearly: ±30 days

### Step 3: Confidence Scoring

Calculates confidence score (0-100) based on weighted factors:

```typescript
confidence =
  (merchantScore × 0.40) +
  (amountConsistency × 0.25) +
  (datePatternScore × 0.25) +
  (transactionCountScore × 0.10)
```

#### Factor Weights

| Factor | Weight | Description |
|--------|--------|-------------|
| Merchant Match | 40% | How well merchant name matches known service |
| Amount Consistency | 25% | How consistent transaction amounts are |
| Date Pattern | 25% | How regular the billing intervals are |
| Transaction Count | 10% | Number of transactions (more = higher confidence) |

#### Merchant Match Score (0-100)

```typescript
// Exact pattern match
"NETFLIX.COM" matches "NETFLIX" → 100

// Fuzzy match
"NETFLX INC" matches "Netflix" → 85

// Partial match
"ENTERTAINMENT CO" matches "Disney+" → 45
```

#### Amount Consistency Score (0-100)

```typescript
amounts = [15.49, 15.49, 15.49, 15.49]
variance = 0
consistency = 100 // Perfect consistency

amounts = [15.49, 14.99, 15.99, 15.49]
variance = 0.17
consistency = 91 // High consistency

amounts = [15.49, 22.99, 9.99, 15.49]
variance = 21.5
consistency = 0 // Poor consistency
```

Allows $2 variance for same subscription.

#### Date Pattern Score (0-100)

Based on interval consistency:

```typescript
intervals = [30, 30, 31, 30] // Monthly billing
stdDev = 0.5
consistency = 98 // Very regular

intervals = [28, 32, 29, 31] // Monthly with variance
stdDev = 1.7
consistency = 94 // Still good

intervals = [15, 45, 30, 60] // Irregular
stdDev = 18.7
consistency = 37 // Poor pattern
```

#### Transaction Count Score (0-100)

```typescript
transactionCount = 2 → 33
transactionCount = 3 → 50
transactionCount = 6 → 100 (maxes out at 6)
transactionCount = 12 → 100
```

### Example Calculations

#### High Confidence Detection (Netflix)

```typescript
transactions = [
  { date: "2025-01-15", amount: 15.49, merchant: "NETFLIX.COM" },
  { date: "2024-12-15", amount: 15.49, merchant: "NETFLIX.COM" },
  { date: "2024-11-15", amount: 15.49, merchant: "NETFLIX.COM" },
  { date: "2024-10-15", amount: 15.49, merchant: "NETFLIX.COM" }
]

merchantScore = 100      // Exact pattern match
amountConsistency = 100  // All amounts identical
datePatternScore = 100   // Perfect 30-day intervals
transactionCount = 4     // 67

confidence = (100 × 0.4) + (100 × 0.25) + (100 × 0.25) + (67 × 0.1)
           = 40 + 25 + 25 + 6.7
           = 96.7 ✓ AUTO-CREATE
```

#### Medium Confidence Detection (Unknown Service)

```typescript
transactions = [
  { date: "2025-01-10", amount: 12.99, merchant: "STREAM MEDIA CO" },
  { date: "2024-12-12", amount: 12.99, merchant: "STREAM MEDIA CO" },
  { date: "2024-11-09", amount: 12.99, merchant: "STREAM MEDIA CO" }
]

merchantScore = 45       // No known service match
amountConsistency = 100  // Consistent amounts
datePatternScore = 95    // Good pattern (29-31 days)
transactionCount = 3     // 50

confidence = (45 × 0.4) + (100 × 0.25) + (95 × 0.25) + (50 × 0.1)
           = 18 + 25 + 23.75 + 5
           = 71.75 ✓ SUGGEST FOR REVIEW
```

#### Low Confidence Detection (Irregular)

```typescript
transactions = [
  { date: "2025-01-15", amount: 9.99, merchant: "DIGITAL SERVICES" },
  { date: "2024-10-03", amount: 12.99, merchant: "DIGITAL SERVICES" }
]

merchantScore = 30       // Poor match
amountConsistency = 70   // Different amounts
datePatternScore = 40    // Irregular (104 days)
transactionCount = 2     // 33

confidence = (30 × 0.4) + (70 × 0.25) + (40 × 0.25) + (33 × 0.1)
           = 12 + 17.5 + 10 + 3.3
           = 42.8 ✗ IGNORE
```

## Confidence Thresholds

### Automatic Creation (≥80%)

High-confidence detections are automatically converted to subscriptions:

- Strong merchant name match
- Consistent amounts
- Regular billing pattern
- Multiple transactions

```typescript
if (confidence >= 80) {
  await createSubscription(detection);
  // ✓ Added to user_subscriptions
}
```

### Suggested for Review (60-79%)

Medium-confidence detections flagged for user review:

- Moderate merchant match
- Some amount variance
- Decent billing pattern
- 2-3 transactions

```typescript
if (confidence >= 60 && confidence < 80) {
  await createSuggestedSubscription(detection);
  // → Added to suggested_subscriptions
  // → User can accept/reject
}
```

### Ignored (<60%)

Low-confidence detections are not shown to user:

- Poor merchant match
- Inconsistent amounts
- Irregular patterns
- Too few transactions

## Suggested Subscriptions Table

Stores medium-confidence detections for user review:

```sql
CREATE TABLE suggested_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  service_id UUID REFERENCES streaming_services(id),
  merchant_name TEXT,
  confidence_score INTEGER, -- 60-79
  suggested_amount DECIMAL(10, 2),
  suggested_billing_cycle billing_cycle,
  transaction_count INTEGER,
  detection_metadata JSONB,
  status suggestion_status, -- pending, accepted, rejected, ignored
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

### Detection Metadata

```json
{
  "merchantMatch": 65,
  "amountConsistency": 90,
  "datePatternScore": 85,
  "isRecurring": true
}
```

## Usage

### Automatic Detection

Triggered automatically after:

1. **Initial bank connection** - After first transaction sync
2. **Transaction sync** - After each incremental sync
3. **Manual trigger** - User can request detection

### Manual Trigger

```typescript
import { supabase } from '@/lib/supabase';

// Trigger detection for current user
const { data, error } = await supabase.functions.invoke(
  'detect-subscriptions',
  {
    body: {
      minTransactions: 2 // Optional
    }
  }
);

console.log(`Detected: ${data.detected}`);
console.log(`Auto-created: ${data.created}`);
console.log(`Suggested: ${data.suggested}`);
```

### Review Suggestions

```typescript
// Get pending suggestions
const { data: suggestions } = await supabase
  .from('suggested_subscriptions')
  .select('*')
  .eq('status', 'pending')
  .order('confidence_score', { ascending: false });

// Accept a suggestion
await supabase
  .from('suggested_subscriptions')
  .update({
    status: 'accepted',
    reviewed_at: new Date().toISOString()
  })
  .eq('id', suggestionId);

// Create actual subscription from suggestion
await supabase
  .from('user_subscriptions')
  .insert({
    service_id: suggestion.service_id,
    service_name: suggestion.merchant_name,
    price: suggestion.suggested_amount,
    billing_cycle: suggestion.suggested_billing_cycle,
    status: 'active',
    detected_from: 'plaid'
  });
```

## Optimization Tips

### Improve Merchant Patterns

Add common merchant name variations to `streaming_services.merchant_patterns`:

```typescript
// Good patterns
"merchant_patterns": [
  "NETFLIX",
  "Netflix.com",
  "NETFLIX.COM",
  "NFLX"
]

// Better patterns
"merchant_patterns": [
  "NETFLIX",
  "NETFLX",
  "NFLX",
  "Netflix.com",
  "NETFLIX INC"
]
```

### Adjust Thresholds

Fine-tune confidence thresholds based on feedback:

```typescript
// More aggressive (auto-create more)
const CONFIDENCE_THRESHOLD_AUTO = 75;
const CONFIDENCE_THRESHOLD_SUGGEST = 55;

// More conservative (fewer false positives)
const CONFIDENCE_THRESHOLD_AUTO = 85;
const CONFIDENCE_THRESHOLD_SUGGEST = 65;
```

### Exclude Non-Subscriptions

Filter out one-time purchases:

```typescript
// Skip categories that are never subscriptions
const excludedCategories = [
  'Shopping',
  'Groceries',
  'Gas Stations',
  'Restaurants'
];

if (transaction.category?.some(cat => excludedCategories.includes(cat))) {
  continue; // Skip this transaction
}
```

## Testing

### Unit Tests

```typescript
import { stringSimilarity, determineBillingCycle } from '@/services/subscriptionDetection';

// Test fuzzy matching
expect(stringSimilarity("NETFLIX", "Netflix")).toBe(100);
expect(stringSimilarity("NETFLX", "Netflix")).toBeGreaterThan(80);

// Test billing cycle detection
expect(determineBillingCycle(30)).toBe('monthly');
expect(determineBillingCycle(7)).toBe('weekly');
expect(determineBillingCycle(365)).toBe('yearly');
```

### Integration Tests

```typescript
// Test full detection flow
const transactions = [
  { date: '2025-01-15', amount: 15.49, merchant_name: 'NETFLIX' },
  { date: '2024-12-15', amount: 15.49, merchant_name: 'NETFLIX' },
  { date: '2024-11-15', amount: 15.49, merchant_name: 'NETFLIX' }
];

const result = await supabase.functions.invoke('detect-subscriptions');
expect(result.created).toBeGreaterThan(0);
```

## Monitoring

### Detection Metrics

Track detection performance:

```sql
-- Auto-creation rate
SELECT
  COUNT(*) FILTER (WHERE confidence_score >= 80) as auto_created,
  COUNT(*) FILTER (WHERE confidence_score BETWEEN 60 AND 79) as suggested,
  COUNT(*) FILTER (WHERE confidence_score < 60) as ignored
FROM suggested_subscriptions;

-- Accuracy (user accepted suggestions)
SELECT
  COUNT(*) FILTER (WHERE status = 'accepted') * 100.0 /
  COUNT(*) FILTER (WHERE status IN ('accepted', 'rejected')) as accuracy_rate
FROM suggested_subscriptions;
```

### Common Issues

**False Positives**: Detected subscriptions that aren't real

```typescript
// Solution: Increase confidence threshold
const CONFIDENCE_THRESHOLD_AUTO = 85; // Up from 80
```

**False Negatives**: Missing real subscriptions

```typescript
// Solution: Add more merchant patterns
// Solution: Decrease thresholds
// Solution: Improve fuzzy matching
```

## Best Practices

1. **Start conservative** - Higher thresholds, fewer auto-creations
2. **Gather feedback** - Track user acceptance/rejection rates
3. **Iterate on patterns** - Add merchant patterns based on real data
4. **Monitor accuracy** - Adjust thresholds based on metrics
5. **Handle edge cases** - Annual subscriptions, trial periods, price changes
6. **Provide transparency** - Show detection confidence to users
7. **Allow corrections** - Let users report false positives/negatives

## Future Enhancements

- **Machine learning** - Train model on user feedback
- **Price change detection** - Alert when subscription price increases
- **Trial period detection** - Identify free trials vs paid subscriptions
- **Bundle detection** - Recognize bundled services (Amazon Prime + Video)
- **Cancellation detection** - Auto-update status when last transaction was >60 days ago
- **Smart categorization** - Auto-tag subscriptions (streaming, music, news, etc.)
