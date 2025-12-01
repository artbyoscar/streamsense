-- ============================================================================
-- WATCH LOGS TABLE
-- Track watch time entries for subscriptions to power value analysis
-- ============================================================================

-- Create watch_logs table
CREATE TABLE IF NOT EXISTS watch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  hours_watched DECIMAL(5,2) NOT NULL CHECK (hours_watched > 0 AND hours_watched <= 24),
  watched_date DATE DEFAULT CURRENT_DATE,
  content_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_watch_logs_subscription_id ON watch_logs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_watch_logs_user_id ON watch_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_logs_watched_date ON watch_logs(watched_date DESC);

-- Enable Row Level Security
ALTER TABLE watch_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users own their watch logs" ON watch_logs;

-- Create RLS policies
CREATE POLICY "Users own their watch logs" ON watch_logs
  FOR ALL USING (auth.uid() = user_id);

-- Auto-set user_id trigger function
CREATE OR REPLACE FUNCTION set_watch_log_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-set user_id
DROP TRIGGER IF EXISTS watch_logs_user_id ON watch_logs;
CREATE TRIGGER watch_logs_user_id
  BEFORE INSERT ON watch_logs
  FOR EACH ROW EXECUTE FUNCTION set_watch_log_user_id();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_watch_log_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS watch_logs_updated_at ON watch_logs;
CREATE TRIGGER watch_logs_updated_at
  BEFORE UPDATE ON watch_logs
  FOR EACH ROW EXECUTE FUNCTION update_watch_log_timestamp();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get total watch hours for a subscription
CREATE OR REPLACE FUNCTION get_subscription_total_watch_hours(p_subscription_id UUID)
RETURNS DECIMAL AS $$
  SELECT COALESCE(SUM(hours_watched), 0)
  FROM watch_logs
  WHERE subscription_id = p_subscription_id;
$$ LANGUAGE sql STABLE;

-- Get watch logs summary for a user
CREATE OR REPLACE FUNCTION get_user_watch_summary(p_user_id UUID)
RETURNS TABLE (
  total_hours DECIMAL,
  total_logs INTEGER,
  most_watched_service TEXT,
  avg_hours_per_session DECIMAL
) AS $$
  SELECT
    COALESCE(SUM(wl.hours_watched), 0) as total_hours,
    COUNT(wl.id)::INTEGER as total_logs,
    (
      SELECT us.service_name
      FROM watch_logs wl2
      JOIN user_subscriptions us ON wl2.subscription_id = us.id
      WHERE wl2.user_id = p_user_id
      GROUP BY us.service_name
      ORDER BY SUM(wl2.hours_watched) DESC
      LIMIT 1
    ) as most_watched_service,
    COALESCE(AVG(wl.hours_watched), 0) as avg_hours_per_session
  FROM watch_logs wl
  WHERE wl.user_id = p_user_id;
$$ LANGUAGE sql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_subscription_total_watch_hours(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_watch_summary(UUID) TO authenticated;

-- ============================================================================
-- SAMPLE DATA (for testing - comment out in production)
-- ============================================================================

-- Uncomment to insert sample watch logs for testing
-- INSERT INTO watch_logs (subscription_id, hours_watched, watched_date, content_description)
-- SELECT
--   id,
--   (RANDOM() * 3 + 0.5)::DECIMAL(5,2),
--   CURRENT_DATE - (RANDOM() * 30)::INTEGER,
--   CASE (RANDOM() * 3)::INTEGER
--     WHEN 0 THEN 'Breaking Bad S1E1-E3'
--     WHEN 1 THEN 'The Office marathon'
--     ELSE 'Stranger Things S4'
--   END
-- FROM user_subscriptions
-- WHERE user_id = auth.uid()
-- LIMIT 10;
