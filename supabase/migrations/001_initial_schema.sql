-- StreamSense Database Schema
-- Initial migration to create all tables, enums, and Row Level Security policies

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'paused', 'expired');
CREATE TYPE billing_cycle AS ENUM ('weekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE detection_source AS ENUM ('manual', 'plaid', 'email');
CREATE TYPE content_type AS ENUM ('movie', 'tv');
CREATE TYPE watchlist_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE viewing_source AS ENUM ('self_report', 'detected', 'imported');

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  premium_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STREAMING SERVICES TABLE
-- ============================================================================

CREATE TABLE streaming_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  base_price NUMERIC(10, 2),
  pricing_tiers JSONB DEFAULT '[]'::jsonb,
  merchant_patterns TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_streaming_services_updated_at
  BEFORE UPDATE ON streaming_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert common streaming services
INSERT INTO streaming_services (name, base_price, merchant_patterns) VALUES
  ('Netflix', 15.49, ARRAY['netflix', 'netflix.com']),
  ('Hulu', 7.99, ARRAY['hulu', 'hulu.com']),
  ('Disney+', 7.99, ARRAY['disney', 'disneyplus', 'disney+']),
  ('HBO Max', 9.99, ARRAY['hbo', 'hbo max', 'hbomax']),
  ('Amazon Prime Video', 8.99, ARRAY['amazon prime', 'prime video']),
  ('Apple TV+', 6.99, ARRAY['apple tv', 'appletv']),
  ('Paramount+', 5.99, ARRAY['paramount', 'paramount+']),
  ('Peacock', 4.99, ARRAY['peacock', 'peacocktv']),
  ('Discovery+', 4.99, ARRAY['discovery', 'discovery+']),
  ('YouTube Premium', 11.99, ARRAY['youtube premium', 'youtube']),
  ('Spotify', 10.99, ARRAY['spotify']),
  ('Apple Music', 10.99, ARRAY['apple music'])
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- USER SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES streaming_services(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  price NUMERIC(10, 2) NOT NULL,
  billing_cycle billing_cycle NOT NULL DEFAULT 'monthly',
  next_billing_date DATE,
  renewal_reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
  detected_from detection_source NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_next_billing ON user_subscriptions(next_billing_date);

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PLAID ITEMS TABLE
-- ============================================================================

CREATE TABLE plaid_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  item_id TEXT NOT NULL UNIQUE,
  institution_name TEXT NOT NULL,
  institution_id TEXT,
  last_synced TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plaid_items_user_id ON plaid_items(user_id);
CREATE INDEX idx_plaid_items_item_id ON plaid_items(item_id);

CREATE TRIGGER update_plaid_items_updated_at
  BEFORE UPDATE ON plaid_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plaid_item_id UUID REFERENCES plaid_items(id) ON DELETE SET NULL,
  plaid_transaction_id TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  merchant_name TEXT NOT NULL,
  date DATE NOT NULL,
  category TEXT[],
  is_subscription BOOLEAN NOT NULL DEFAULT FALSE,
  matched_service_id UUID REFERENCES streaming_services(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_is_subscription ON transactions(is_subscription);
CREATE INDEX idx_transactions_plaid_transaction_id ON transactions(plaid_transaction_id);

-- ============================================================================
-- CONTENT TABLE
-- ============================================================================

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  type content_type NOT NULL,
  overview TEXT,
  poster_url TEXT,
  backdrop_url TEXT,
  genres TEXT[],
  release_date DATE,
  vote_average NUMERIC(3, 1),
  popularity NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_tmdb_id ON content(tmdb_id);
CREATE INDEX idx_content_type ON content(type);
CREATE INDEX idx_content_title ON content USING gin(to_tsvector('english', title));

CREATE TRIGGER update_content_updated_at
  BEFORE UPDATE ON content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- WATCHLIST ITEMS TABLE
-- ============================================================================

CREATE TABLE watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  priority watchlist_priority NOT NULL DEFAULT 'medium',
  notify_on_available BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

CREATE INDEX idx_watchlist_items_user_id ON watchlist_items(user_id);
CREATE INDEX idx_watchlist_items_content_id ON watchlist_items(content_id);
CREATE INDEX idx_watchlist_items_priority ON watchlist_items(priority);

-- ============================================================================
-- VIEWING LOGS TABLE
-- ============================================================================

CREATE TABLE viewing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  service_id UUID REFERENCES streaming_services(id) ON DELETE SET NULL,
  watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_minutes INTEGER,
  source viewing_source NOT NULL DEFAULT 'self_report',
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_viewing_logs_user_id ON viewing_logs(user_id);
CREATE INDEX idx_viewing_logs_content_id ON viewing_logs(content_id);
CREATE INDEX idx_viewing_logs_watched_at ON viewing_logs(watched_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE viewing_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- User subscriptions policies
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON user_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Plaid items policies
CREATE POLICY "Users can view own plaid items"
  ON plaid_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plaid items"
  ON plaid_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plaid items"
  ON plaid_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plaid items"
  ON plaid_items FOR DELETE
  USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Watchlist items policies
CREATE POLICY "Users can view own watchlist"
  ON watchlist_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist items"
  ON watchlist_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist items"
  ON watchlist_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist items"
  ON watchlist_items FOR DELETE
  USING (auth.uid() = user_id);

-- Viewing logs policies
CREATE POLICY "Users can view own viewing logs"
  ON viewing_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own viewing logs"
  ON viewing_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own viewing logs"
  ON viewing_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own viewing logs"
  ON viewing_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Streaming services are public (read-only for users)
ALTER TABLE streaming_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view streaming services"
  ON streaming_services FOR SELECT
  TO authenticated
  USING (true);

-- Content is public (read-only for users)
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view content"
  ON content FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Calculate monthly spending
CREATE OR REPLACE FUNCTION calculate_monthly_spending(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_spending NUMERIC;
BEGIN
  SELECT COALESCE(SUM(
    CASE billing_cycle
      WHEN 'weekly' THEN price * 4.33
      WHEN 'monthly' THEN price
      WHEN 'quarterly' THEN price / 3
      WHEN 'yearly' THEN price / 12
    END
  ), 0)
  INTO total_spending
  FROM user_subscriptions
  WHERE user_id = p_user_id AND status = 'active';

  RETURN total_spending;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get upcoming renewals
CREATE OR REPLACE FUNCTION get_upcoming_renewals(p_user_id UUID, p_days_ahead INTEGER DEFAULT 30)
RETURNS TABLE (
  subscription_id UUID,
  service_name TEXT,
  price NUMERIC,
  next_billing_date DATE,
  days_until_renewal INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    user_subscriptions.service_name,
    user_subscriptions.price,
    user_subscriptions.next_billing_date,
    (user_subscriptions.next_billing_date - CURRENT_DATE)::INTEGER
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
    AND user_subscriptions.next_billing_date IS NOT NULL
    AND user_subscriptions.next_billing_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + p_days_ahead)
  ORDER BY user_subscriptions.next_billing_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
