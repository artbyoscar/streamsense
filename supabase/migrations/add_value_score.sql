-- Add Value Score Feature
-- This migration adds monthly viewing hours tracking and automatic value score calculation

-- Step 1: Add monthly_viewing_hours column
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS monthly_viewing_hours DECIMAL(5,1) DEFAULT 0;

-- Step 2: Add value_score as a generated column
-- Value score = monthly cost / monthly viewing hours
-- Lower score = better value (e.g., $1/hr is better than $5/hr)
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS value_score DECIMAL(5,2) GENERATED ALWAYS AS (
  CASE
    WHEN monthly_viewing_hours > 0
    THEN price / monthly_viewing_hours
    ELSE NULL
  END
) STORED;

-- Step 3: Add helpful comments
COMMENT ON COLUMN user_subscriptions.monthly_viewing_hours IS 'Estimated hours per month user watches this service';
COMMENT ON COLUMN user_subscriptions.value_score IS 'Calculated cost per hour (price / viewing_hours). Lower is better value.';

-- Optional: Create index for faster value score queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_value_score
ON user_subscriptions(value_score)
WHERE value_score IS NOT NULL;

-- Optional: Create index for viewing hours queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_viewing_hours
ON user_subscriptions(monthly_viewing_hours)
WHERE monthly_viewing_hours IS NOT NULL;
