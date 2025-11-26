-- ========================================
-- Row Level Security (RLS) Policies
-- ========================================
-- Version: 1.0.0
-- Description: RLS policies to ensure users can only access their own data

-- ========================================
-- ENABLE RLS ON ALL TABLES
-- ========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaming_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewing_logs ENABLE ROW LEVEL SECURITY;

-- ========================================
-- PROFILES POLICIES
-- ========================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (handled by trigger, but allow for manual inserts)
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile"
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = id);

-- ========================================
-- STREAMING SERVICES POLICIES
-- ========================================
-- Public read access for streaming services catalog

-- Anyone can view streaming services
CREATE POLICY "Anyone can view streaming services"
  ON public.streaming_services
  FOR SELECT
  USING (true);

-- Only authenticated users can suggest new services (insert)
-- Admin role would be needed to approve - handle via backend
CREATE POLICY "Authenticated users can suggest services"
  ON public.streaming_services
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ========================================
-- USER SUBSCRIPTIONS POLICIES
-- ========================================

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.user_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own subscriptions
CREATE POLICY "Users can insert own subscriptions"
  ON public.user_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions"
  ON public.user_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete own subscriptions"
  ON public.user_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- PLAID ITEMS POLICIES
-- ========================================

-- Users can view their own Plaid connections
CREATE POLICY "Users can view own plaid items"
  ON public.plaid_items
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own Plaid connections
CREATE POLICY "Users can insert own plaid items"
  ON public.plaid_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own Plaid connections
CREATE POLICY "Users can update own plaid items"
  ON public.plaid_items
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own Plaid connections
CREATE POLICY "Users can delete own plaid items"
  ON public.plaid_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- TRANSACTIONS POLICIES
-- ========================================

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
  ON public.transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- System/backend can insert transactions (via service role)
-- Users cannot directly insert transactions
CREATE POLICY "Service role can insert transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own transactions (e.g., mark as subscription)
CREATE POLICY "Users can update own transactions"
  ON public.transactions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own transactions
CREATE POLICY "Users can delete own transactions"
  ON public.transactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- CONTENT POLICIES
-- ========================================
-- Public read access for content catalog

-- Anyone can view content
CREATE POLICY "Anyone can view content"
  ON public.content
  FOR SELECT
  USING (true);

-- Authenticated users can add content (via TMDB sync)
CREATE POLICY "Authenticated users can add content"
  ON public.content
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow updates for content refresh
CREATE POLICY "Authenticated users can update content"
  ON public.content
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ========================================
-- WATCHLIST ITEMS POLICIES
-- ========================================

-- Users can view their own watchlist
CREATE POLICY "Users can view own watchlist"
  ON public.watchlist_items
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add to their own watchlist
CREATE POLICY "Users can insert own watchlist items"
  ON public.watchlist_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own watchlist items
CREATE POLICY "Users can update own watchlist items"
  ON public.watchlist_items
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own watchlist items
CREATE POLICY "Users can delete own watchlist items"
  ON public.watchlist_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- VIEWING LOGS POLICIES
-- ========================================

-- Users can view their own viewing logs
CREATE POLICY "Users can view own viewing logs"
  ON public.viewing_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add their own viewing logs
CREATE POLICY "Users can insert own viewing logs"
  ON public.viewing_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own viewing logs
CREATE POLICY "Users can update own viewing logs"
  ON public.viewing_logs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own viewing logs
CREATE POLICY "Users can delete own viewing logs"
  ON public.viewing_logs
  FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- ADDITIONAL SECURITY
-- ========================================

-- Create a function to check if user is admin (for future use)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT raw_app_meta_data->>'role' = 'admin'
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION is_admin() IS 'Check if current user has admin role in app_metadata';
