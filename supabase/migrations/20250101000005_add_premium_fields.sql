-- ========================================
-- Add Premium Subscription Fields to Profiles
-- ========================================
-- Version: 1.0.5
-- Description: Adds fields for tracking RevenueCat premium subscription status

-- Add premium subscription fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;

-- Add index for premium status queries
CREATE INDEX IF NOT EXISTS profiles_is_premium_idx ON public.profiles(is_premium);
CREATE INDEX IF NOT EXISTS profiles_premium_expires_at_idx ON public.profiles(premium_expires_at);

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.is_premium IS 'Whether user has active premium subscription from RevenueCat';
COMMENT ON COLUMN public.profiles.premium_expires_at IS 'Premium subscription expiration date from RevenueCat';

-- Create a function to check if premium is expired and update status
CREATE OR REPLACE FUNCTION public.check_premium_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- If premium_expires_at is in the past, set is_premium to false
  IF NEW.premium_expires_at IS NOT NULL AND NEW.premium_expires_at < NOW() THEN
    NEW.is_premium := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update premium status on insert/update
DROP TRIGGER IF EXISTS check_premium_expiration_trigger ON public.profiles;
CREATE TRIGGER check_premium_expiration_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_premium_expiration();

-- Add comment for trigger
COMMENT ON TRIGGER check_premium_expiration_trigger ON public.profiles IS 'Automatically updates is_premium to false when premium_expires_at is in the past';
