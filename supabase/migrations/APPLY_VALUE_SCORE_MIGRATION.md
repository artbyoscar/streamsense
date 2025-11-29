# Apply Value Score Migration Guide

Follow these steps to apply the Value Score feature to your Supabase database.

---

## ✅ Step 1: Apply the Migration

1. Go to: **Supabase Dashboard** > **SQL Editor** > **New Query**
2. Copy and paste the entire migration from `add_value_score.sql`
3. Click **Run** (or press Ctrl+Enter)

**Expected Result:**
```
Success. No rows returned
```

---

## ✅ Step 2: Verify Columns Were Added

Run this query to verify both columns exist:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_subscriptions'
AND column_name IN ('monthly_viewing_hours', 'value_score')
ORDER BY column_name;
```

**Expected Result:**
```
column_name            | data_type | is_nullable | column_default
-----------------------|-----------|-------------|---------------
monthly_viewing_hours  | numeric   | YES         | 0
value_score            | numeric   | YES         | NULL (generated)
```

---

## ✅ Step 3: Verify Indexes Were Created

Run this query to check indexes:

```sql
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'user_subscriptions'
AND indexname LIKE 'idx_user_subscriptions_%'
ORDER BY indexname;
```

**Expected Result:**
You should see:
- `idx_user_subscriptions_value_score`
- `idx_user_subscriptions_viewing_hours`

---

## ✅ Step 4: Test with Sample Data

### Get your user_id first:
```sql
SELECT id, email FROM auth.users LIMIT 1;
```

### Test the value_score calculation:

Replace `YOUR_USER_ID` with your actual user ID:

```sql
-- Update a subscription with viewing hours
UPDATE user_subscriptions
SET monthly_viewing_hours = 20
WHERE service_name LIKE '%Netflix%'
AND user_id = 'YOUR_USER_ID'
RETURNING id, service_name, price, monthly_viewing_hours, value_score;
```

**Expected Result:**
```
id    | service_name | price | monthly_viewing_hours | value_score
------|--------------|-------|----------------------|-------------
xxx   | Netflix      | 15.49 | 20.0                 | 0.77
```

The value_score should automatically calculate as: `price / monthly_viewing_hours`
- Example: $15.49 / 20 hrs = $0.77/hr

---

## ✅ Step 5: View All Subscriptions with Value Scores

```sql
SELECT
    service_name,
    price,
    monthly_viewing_hours,
    value_score,
    CASE
        WHEN value_score < 1 THEN 'Great Value 🟢'
        WHEN value_score < 3 THEN 'Good Value 🟡'
        WHEN value_score >= 3 THEN 'Low Value 🔴'
        ELSE 'No Data'
    END as value_category
FROM user_subscriptions
WHERE user_id = 'YOUR_USER_ID'
AND status = 'active'
ORDER BY value_score ASC NULLS LAST;
```

**Expected Result:**
```
service_name  | price | hours | value_score | value_category
--------------|-------|-------|-------------|----------------
Netflix       | 15.49 | 20.0  | 0.77        | Great Value 🟢
Hulu          | 7.99  | 10.0  | 0.80        | Great Value 🟢
Disney+       | 7.99  | 5.0   | 1.60        | Good Value 🟡
HBO Max       | 15.99 | 3.0   | 5.33        | Low Value 🔴
```

---

## ✅ Step 6: Test Edge Cases

### Test 1: Zero viewing hours (should return NULL value_score)
```sql
UPDATE user_subscriptions
SET monthly_viewing_hours = 0
WHERE id = 'SOME_SUBSCRIPTION_ID'
RETURNING service_name, monthly_viewing_hours, value_score;
```

**Expected:** `value_score` should be `NULL`

### Test 2: NULL viewing hours (should return NULL value_score)
```sql
UPDATE user_subscriptions
SET monthly_viewing_hours = NULL
WHERE id = 'SOME_SUBSCRIPTION_ID'
RETURNING service_name, monthly_viewing_hours, value_score;
```

**Expected:** `value_score` should be `NULL`

### Test 3: High viewing hours (should return very low value_score)
```sql
UPDATE user_subscriptions
SET monthly_viewing_hours = 100
WHERE id = 'SOME_SUBSCRIPTION_ID'
RETURNING service_name, price, monthly_viewing_hours, value_score;
```

**Expected:** Very low value_score (e.g., $15.49 / 100 = $0.15/hr)

---

## ✅ Step 7: Rollback (if needed)

If something goes wrong, you can rollback with:

```sql
-- Remove indexes
DROP INDEX IF EXISTS idx_user_subscriptions_value_score;
DROP INDEX IF EXISTS idx_user_subscriptions_viewing_hours;

-- Remove columns
ALTER TABLE user_subscriptions DROP COLUMN IF EXISTS value_score;
ALTER TABLE user_subscriptions DROP COLUMN IF EXISTS monthly_viewing_hours;
```

---

## 🎉 Success Checklist

After running all the above:

- [ ] Migration ran without errors
- [ ] Both columns exist (`monthly_viewing_hours`, `value_score`)
- [ ] Both indexes were created
- [ ] Test update calculated `value_score` correctly
- [ ] Edge cases (0, NULL) return NULL for `value_score`
- [ ] Can view all subscriptions with value categories

---

## 📝 Notes

- **value_score is READ-ONLY** - It's automatically calculated by the database
- **Lower is better** - $0.50/hr is better value than $5.00/hr
- **NULL means no data** - User hasn't entered viewing hours yet
- **Updating hours auto-updates score** - The generated column recalculates automatically

---

## 🐛 Troubleshooting

**Error: "column already exists"**
- Migration already applied. Safe to ignore.

**Error: "permission denied"**
- Make sure you're logged into Supabase dashboard
- Use the SQL Editor, not a client connection

**value_score not updating**
- Make sure you're updating `monthly_viewing_hours`, not `value_score` directly
- `value_score` is a generated column and cannot be manually set

**Getting NULL for value_score**
- Check that `monthly_viewing_hours > 0`
- Check that `price > 0`
- If either is 0 or NULL, value_score will be NULL

---

## ✅ After Migration

1. **Test in the app:**
   - Add a subscription with viewing hours
   - Check that value badge appears on dashboard
   - Verify Tips page shows value insights

2. **Update existing subscriptions:**
   - Users can edit existing subscriptions
   - Add viewing hours estimate
   - Value score will auto-calculate

3. **Monitor:**
   - Check that value insights appear in Tips page
   - Verify best/worst value cards show correct data
   - Confirm potential savings calculation works

---

**Ready to apply? Follow Step 1!** 🚀
