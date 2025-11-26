-- ========================================
-- Triggers and Database Functions
-- ========================================
-- Version: 1.0.0
-- Description: Auto-create profiles, update subscription status, detect subscriptions

-- ========================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- ========================================

-- Function to create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile when a new user signs up';

-- ========================================
-- AUTO-UPDATE SUBSCRIPTION STATUS
-- ========================================

-- Function to automatically set subscription status to expired when next_billing_date passes
CREATE OR REPLACE FUNCTION public.update_expired_subscriptions()
RETURNS void AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET status = 'expired'
  WHERE status = 'active'
    AND next_billing_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION public.update_expired_subscriptions() IS 'Updates subscriptions to expired status when billing date has passed';

-- ========================================
-- SET CANCELLED_AT TIMESTAMP
-- ========================================

-- Function to automatically set cancelled_at when subscription is cancelled
CREATE OR REPLACE FUNCTION public.set_subscription_cancelled_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    NEW.cancelled_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set cancelled_at
DROP TRIGGER IF EXISTS on_subscription_cancelled ON public.user_subscriptions;
CREATE TRIGGER on_subscription_cancelled
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_subscription_cancelled_at();

-- Add comment
COMMENT ON FUNCTION public.set_subscription_cancelled_at() IS 'Sets cancelled_at timestamp when subscription status changes to cancelled';

-- ========================================
-- DETECT SUBSCRIPTION FROM TRANSACTION
-- ========================================

-- Function to match transaction to streaming service and potentially create subscription
CREATE OR REPLACE FUNCTION public.match_transaction_to_service(
  p_merchant_name TEXT,
  p_amount DECIMAL
)
RETURNS UUID AS $$
DECLARE
  v_service_id UUID;
  v_pattern TEXT;
BEGIN
  -- Try to match merchant name to service patterns
  SELECT id INTO v_service_id
  FROM public.streaming_services
  WHERE EXISTS (
    SELECT 1
    FROM unnest(merchant_patterns) AS pattern
    WHERE p_merchant_name ILIKE '%' || pattern || '%'
  )
  LIMIT 1;

  RETURN v_service_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION public.match_transaction_to_service(TEXT, DECIMAL) IS 'Attempts to match a transaction merchant name to a known streaming service';

-- ========================================
-- CALCULATE MONTHLY SPENDING
-- ========================================

-- Function to calculate user's total monthly subscription spending
CREATE OR REPLACE FUNCTION public.calculate_monthly_spending(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_total DECIMAL;
BEGIN
  SELECT COALESCE(SUM(
    CASE billing_cycle
      WHEN 'weekly' THEN price * 4.33
      WHEN 'monthly' THEN price
      WHEN 'quarterly' THEN price / 3
      WHEN 'yearly' THEN price / 12
      ELSE 0
    END
  ), 0) INTO v_total
  FROM public.user_subscriptions
  WHERE user_id = p_user_id
    AND status = 'active';

  RETURN ROUND(v_total, 2);
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION public.calculate_monthly_spending(UUID) IS 'Calculates total monthly spending for a user across all active subscriptions';

-- ========================================
-- GET UPCOMING RENEWALS
-- ========================================

-- Function to get subscriptions renewing in the next N days
CREATE OR REPLACE FUNCTION public.get_upcoming_renewals(
  p_user_id UUID,
  p_days_ahead INTEGER DEFAULT 7
)
RETURNS TABLE (
  subscription_id UUID,
  service_name TEXT,
  price DECIMAL,
  next_billing_date DATE,
  days_until_renewal INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    us.id,
    us.service_name,
    us.price,
    us.next_billing_date,
    (us.next_billing_date - CURRENT_DATE)::INTEGER
  FROM public.user_subscriptions us
  WHERE us.user_id = p_user_id
    AND us.status = 'active'
    AND us.next_billing_date IS NOT NULL
    AND us.next_billing_date BETWEEN CURRENT_DATE AND CURRENT_DATE + p_days_ahead
  ORDER BY us.next_billing_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION public.get_upcoming_renewals(UUID, INTEGER) IS 'Returns subscriptions renewing within the specified number of days';

-- ========================================
-- SUBSCRIPTION STATISTICS
-- ========================================

-- Function to get comprehensive subscription statistics for a user
CREATE OR REPLACE FUNCTION public.get_subscription_stats(p_user_id UUID)
RETURNS TABLE (
  total_active INTEGER,
  total_cancelled INTEGER,
  monthly_spending DECIMAL,
  yearly_spending DECIMAL,
  most_expensive_service TEXT,
  most_expensive_price DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'active')::INTEGER AS total_active,
    COUNT(*) FILTER (WHERE status = 'cancelled')::INTEGER AS total_cancelled,
    public.calculate_monthly_spending(p_user_id) AS monthly_spending,
    public.calculate_monthly_spending(p_user_id) * 12 AS yearly_spending,
    (
      SELECT service_name
      FROM public.user_subscriptions
      WHERE user_id = p_user_id AND status = 'active'
      ORDER BY price DESC
      LIMIT 1
    ) AS most_expensive_service,
    (
      SELECT price
      FROM public.user_subscriptions
      WHERE user_id = p_user_id AND status = 'active'
      ORDER BY price DESC
      LIMIT 1
    ) AS most_expensive_price
  FROM public.user_subscriptions
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION public.get_subscription_stats(UUID) IS 'Returns comprehensive subscription statistics for a user';

-- ========================================
-- SEARCH CONTENT
-- ========================================

-- Function for full-text search of content
CREATE OR REPLACE FUNCTION public.search_content(
  p_search_query TEXT,
  p_content_type content_type DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  content_id UUID,
  tmdb_id INTEGER,
  title TEXT,
  type content_type,
  overview TEXT,
  poster_url TEXT,
  release_date DATE,
  vote_average DECIMAL,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.tmdb_id,
    c.title,
    c.type,
    c.overview,
    c.poster_url,
    c.release_date,
    c.vote_average,
    ts_rank(to_tsvector('english', c.title || ' ' || COALESCE(c.overview, '')), plainto_tsquery('english', p_search_query)) AS rank
  FROM public.content c
  WHERE
    to_tsvector('english', c.title || ' ' || COALESCE(c.overview, '')) @@ plainto_tsquery('english', p_search_query)
    AND (p_content_type IS NULL OR c.type = p_content_type)
  ORDER BY rank DESC, c.popularity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION public.search_content(TEXT, content_type, INTEGER) IS 'Full-text search for movies and TV shows';

-- ========================================
-- GET VIEWING HISTORY WITH DETAILS
-- ========================================

-- Function to get user's viewing history with content details
CREATE OR REPLACE FUNCTION public.get_viewing_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  log_id UUID,
  content_title TEXT,
  content_type content_type,
  poster_url TEXT,
  service_name TEXT,
  watched_at TIMESTAMPTZ,
  rating DECIMAL,
  duration_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vl.id,
    c.title,
    c.type,
    c.poster_url,
    ss.name,
    vl.watched_at,
    vl.rating,
    vl.duration_minutes
  FROM public.viewing_logs vl
  JOIN public.content c ON vl.content_id = c.id
  LEFT JOIN public.streaming_services ss ON vl.service_id = ss.id
  WHERE vl.user_id = p_user_id
  ORDER BY vl.watched_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION public.get_viewing_history(UUID, INTEGER) IS 'Returns user viewing history with content and service details';

-- ========================================
-- SEED POPULAR STREAMING SERVICES
-- ========================================

-- Function to seed database with popular streaming services
CREATE OR REPLACE FUNCTION public.seed_streaming_services()
RETURNS void AS $$
BEGIN
  -- Insert popular streaming services if they don't exist
  INSERT INTO public.streaming_services (name, base_price, merchant_patterns, pricing_tiers)
  VALUES
    ('Netflix', 15.49, ARRAY['NETFLIX', 'Netflix.com', 'NETFLIX.COM'], '[
      {"name": "Standard with ads", "price": 6.99, "features": ["1080p", "Ads"]},
      {"name": "Standard", "price": 15.49, "features": ["1080p", "2 screens", "No ads"]},
      {"name": "Premium", "price": 22.99, "features": ["4K", "4 screens", "No ads"]}
    ]'::jsonb),
    ('Disney+', 13.99, ARRAY['DISNEY', 'DISNEYPLUS', 'Disney+'], '[
      {"name": "Basic", "price": 7.99, "features": ["1080p", "Ads"]},
      {"name": "Premium", "price": 13.99, "features": ["4K", "No ads"]}
    ]'::jsonb),
    ('HBO Max', 15.99, ARRAY['HBO', 'HBOMAX', 'MAX'], '[
      {"name": "With Ads", "price": 9.99, "features": ["1080p", "Ads"]},
      {"name": "Ad-Free", "price": 15.99, "features": ["4K", "No ads"]}
    ]'::jsonb),
    ('Hulu', 17.99, ARRAY['HULU', 'Hulu.com'], '[
      {"name": "With Ads", "price": 7.99, "features": ["1080p", "Ads"]},
      {"name": "No Ads", "price": 17.99, "features": ["1080p", "No ads"]}
    ]'::jsonb),
    ('Amazon Prime Video', 14.99, ARRAY['AMAZON PRIME', 'PRIME VIDEO', 'AMAZON.COM'], '[
      {"name": "Monthly", "price": 14.99, "features": ["4K", "Prime benefits"]},
      {"name": "Annual", "price": 139.00, "features": ["4K", "Prime benefits", "Yearly"]}
    ]'::jsonb),
    ('Apple TV+', 9.99, ARRAY['APPLE', 'APPLE.COM/BILL', 'APPLE TV'], '[
      {"name": "Monthly", "price": 9.99, "features": ["4K", "Family Sharing"]}
    ]'::jsonb),
    ('Paramount+', 11.99, ARRAY['PARAMOUNT', 'PARAMOUNTPLUS', 'CBS'], '[
      {"name": "Essential", "price": 5.99, "features": ["Limited ads"]},
      {"name": "Premium", "price": 11.99, "features": ["No ads", "Live TV"]}
    ]'::jsonb),
    ('Peacock', 11.99, ARRAY['PEACOCK', 'NBCUNIVERSAL'], '[
      {"name": "Premium", "price": 5.99, "features": ["Limited ads"]},
      {"name": "Premium Plus", "price": 11.99, "features": ["No ads"]}
    ]'::jsonb),
    ('YouTube Premium', 13.99, ARRAY['YOUTUBE', 'GOOGLE*YouTube', 'YOUTUBE PREMIUM'], '[
      {"name": "Individual", "price": 13.99, "features": ["Ad-free", "Background play", "YouTube Music"]},
      {"name": "Family", "price": 22.99, "features": ["Ad-free", "Up to 5 members", "YouTube Music"]}
    ]'::jsonb),
    ('Spotify', 10.99, ARRAY['SPOTIFY', 'Spotify.com'], '[
      {"name": "Free", "price": 0.00, "features": ["Ads", "Shuffle only"]},
      {"name": "Premium", "price": 10.99, "features": ["No ads", "Offline", "On-demand"]},
      {"name": "Duo", "price": 14.99, "features": ["2 accounts", "Premium features"]},
      {"name": "Family", "price": 16.99, "features": ["Up to 6 accounts", "Premium features"]}
    ]'::jsonb)
  ON CONFLICT (name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION public.seed_streaming_services() IS 'Seeds database with popular streaming services and their pricing tiers';

-- Execute the seed function
SELECT public.seed_streaming_services();
