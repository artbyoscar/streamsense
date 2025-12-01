-- Create savings_vault table
CREATE TABLE IF NOT EXISTS savings_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT, -- 'cancelled', 'paused', 'downgraded', 'avoided_trial'
  service_name TEXT,
  monthly_amount DECIMAL,
  annual_projection DECIMAL,
  action_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create free_trials table
CREATE TABLE IF NOT EXISTS free_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  service_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  trial_length_days INTEGER,
  post_trial_price DECIMAL,
  cancellation_url TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'converted', 'expired'
  reminder_sent_day_5 BOOLEAN DEFAULT FALSE,
  reminder_sent_day_2 BOOLEAN DEFAULT FALSE,
  reminder_sent_day_1 BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update user_subscriptions table
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS last_watched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_free_trial BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trial_end_date DATE;
