-- ========================================
-- StreamSense Database Schema - Initial Migration
-- ========================================
-- Version: 1.0.0
-- Description: Core tables for user profiles, streaming services, subscriptions, and content

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- PROFILES TABLE
-- ========================================
-- Extends auth.users with additional profile information

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON public.profiles(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE public.profiles IS 'User profile information extending auth.users';

-- ========================================
-- STREAMING SERVICES TABLE
-- ========================================
-- Catalog of available streaming services

CREATE TABLE IF NOT EXISTS public.streaming_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  base_price DECIMAL(10, 2),
  pricing_tiers JSONB DEFAULT '[]'::jsonb,
  merchant_patterns TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS streaming_services_name_idx ON public.streaming_services(name);
CREATE INDEX IF NOT EXISTS streaming_services_pricing_tiers_idx ON public.streaming_services USING GIN(pricing_tiers);

-- Add comment
COMMENT ON TABLE public.streaming_services IS 'Catalog of streaming services with pricing information';
COMMENT ON COLUMN public.streaming_services.pricing_tiers IS 'JSON array of pricing tiers: [{"name": "Basic", "price": 9.99, "features": [...]}]';
COMMENT ON COLUMN public.streaming_services.merchant_patterns IS 'Array of merchant name patterns for transaction matching (e.g., ["NETFLIX", "Netflix.com"])';

-- ========================================
-- USER SUBSCRIPTIONS TABLE
-- ========================================
-- User's active and past subscriptions

CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'paused', 'expired');
CREATE TYPE billing_cycle AS ENUM ('weekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE detection_source AS ENUM ('manual', 'plaid', 'email');

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.streaming_services(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL, -- Denormalized for when service_id is null
  status subscription_status NOT NULL DEFAULT 'active',
  price DECIMAL(10, 2) NOT NULL,
  billing_cycle billing_cycle NOT NULL DEFAULT 'monthly',
  next_billing_date DATE,
  renewal_reminder_sent BOOLEAN NOT NULL DEFAULT false,
  detected_from detection_source NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,

  CONSTRAINT positive_price CHECK (price >= 0)
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS user_subscriptions_user_id_idx ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS user_subscriptions_service_id_idx ON public.user_subscriptions(service_id);
CREATE INDEX IF NOT EXISTS user_subscriptions_status_idx ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS user_subscriptions_next_billing_date_idx ON public.user_subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS user_subscriptions_user_status_idx ON public.user_subscriptions(user_id, status);

-- Add comment
COMMENT ON TABLE public.user_subscriptions IS 'User subscription records with billing information';

-- ========================================
-- PLAID ITEMS TABLE
-- ========================================
-- Stores Plaid connection information for bank account linking

CREATE TABLE IF NOT EXISTS public.plaid_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL, -- Should be encrypted at application level
  item_id TEXT NOT NULL UNIQUE,
  institution_name TEXT NOT NULL,
  institution_id TEXT,
  last_synced TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS plaid_items_user_id_idx ON public.plaid_items(user_id);
CREATE INDEX IF NOT EXISTS plaid_items_item_id_idx ON public.plaid_items(item_id);
CREATE INDEX IF NOT EXISTS plaid_items_last_synced_idx ON public.plaid_items(last_synced DESC);

-- Add comment
COMMENT ON TABLE public.plaid_items IS 'Plaid bank account connections for transaction sync';
COMMENT ON COLUMN public.plaid_items.access_token IS 'Encrypted Plaid access token - SENSITIVE';

-- ========================================
-- TRANSACTIONS TABLE
-- ========================================
-- Bank transactions from Plaid for subscription detection

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plaid_item_id UUID REFERENCES public.plaid_items(id) ON DELETE CASCADE,
  plaid_transaction_id TEXT UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  merchant_name TEXT NOT NULL,
  date DATE NOT NULL,
  category TEXT[],
  is_subscription BOOLEAN NOT NULL DEFAULT false,
  matched_service_id UUID REFERENCES public.streaming_services(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT transactions_unique_plaid UNIQUE (plaid_transaction_id, plaid_item_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_plaid_item_id_idx ON public.transactions(plaid_item_id);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON public.transactions(date DESC);
CREATE INDEX IF NOT EXISTS transactions_is_subscription_idx ON public.transactions(is_subscription) WHERE is_subscription = true;
CREATE INDEX IF NOT EXISTS transactions_merchant_name_idx ON public.transactions USING GIN(to_tsvector('english', merchant_name));

-- Add comment
COMMENT ON TABLE public.transactions IS 'Bank transactions from Plaid for subscription detection';

-- ========================================
-- CONTENT TABLE
-- ========================================
-- Movies and TV shows from TMDB

CREATE TYPE content_type AS ENUM ('movie', 'tv');

CREATE TABLE IF NOT EXISTS public.content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tmdb_id INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  type content_type NOT NULL,
  overview TEXT,
  poster_url TEXT,
  backdrop_url TEXT,
  genres TEXT[],
  release_date DATE,
  vote_average DECIMAL(3, 1),
  popularity DECIMAL(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS content_tmdb_id_idx ON public.content(tmdb_id);
CREATE INDEX IF NOT EXISTS content_type_idx ON public.content(type);
CREATE INDEX IF NOT EXISTS content_title_idx ON public.content USING GIN(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS content_genres_idx ON public.content USING GIN(genres);
CREATE INDEX IF NOT EXISTS content_popularity_idx ON public.content(popularity DESC);

-- Add comment
COMMENT ON TABLE public.content IS 'Movies and TV shows catalog from TMDB';

-- ========================================
-- WATCHLIST ITEMS TABLE
-- ========================================
-- User's watchlist with priority and notifications

CREATE TYPE watchlist_priority AS ENUM ('low', 'medium', 'high');

CREATE TABLE IF NOT EXISTS public.watchlist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  priority watchlist_priority NOT NULL DEFAULT 'medium',
  notify_on_available BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT watchlist_unique_user_content UNIQUE (user_id, content_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS watchlist_items_user_id_idx ON public.watchlist_items(user_id);
CREATE INDEX IF NOT EXISTS watchlist_items_content_id_idx ON public.watchlist_items(content_id);
CREATE INDEX IF NOT EXISTS watchlist_items_priority_idx ON public.watchlist_items(priority);
CREATE INDEX IF NOT EXISTS watchlist_items_added_at_idx ON public.watchlist_items(added_at DESC);

-- Add comment
COMMENT ON TABLE public.watchlist_items IS 'User watchlist with priority and notification preferences';

-- ========================================
-- VIEWING LOGS TABLE
-- ========================================
-- Track what users have watched and where

CREATE TYPE viewing_source AS ENUM ('self_report', 'detected', 'imported');

CREATE TABLE IF NOT EXISTS public.viewing_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.streaming_services(id) ON DELETE SET NULL,
  watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_minutes INTEGER,
  source viewing_source NOT NULL DEFAULT 'self_report',
  rating DECIMAL(2, 1),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT rating_range CHECK (rating IS NULL OR (rating >= 0 AND rating <= 10))
);

-- Add indexes
CREATE INDEX IF NOT EXISTS viewing_logs_user_id_idx ON public.viewing_logs(user_id);
CREATE INDEX IF NOT EXISTS viewing_logs_content_id_idx ON public.viewing_logs(content_id);
CREATE INDEX IF NOT EXISTS viewing_logs_service_id_idx ON public.viewing_logs(service_id);
CREATE INDEX IF NOT EXISTS viewing_logs_watched_at_idx ON public.viewing_logs(watched_at DESC);

-- Add comment
COMMENT ON TABLE public.viewing_logs IS 'User viewing history across streaming services';

-- ========================================
-- UPDATED_AT TRIGGER FUNCTION
-- ========================================
-- Automatically update updated_at timestamp

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streaming_services_updated_at
  BEFORE UPDATE ON public.streaming_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plaid_items_updated_at
  BEFORE UPDATE ON public.plaid_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_updated_at
  BEFORE UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
