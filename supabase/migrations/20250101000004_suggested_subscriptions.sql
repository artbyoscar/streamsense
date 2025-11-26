-- ========================================
-- Suggested Subscriptions Table
-- ========================================
-- Version: 1.0.0
-- Description: Stores AI-detected subscription suggestions for user review

-- Create suggestion status enum
CREATE TYPE suggestion_status AS ENUM ('pending', 'accepted', 'rejected', 'ignored');

-- Create suggested_subscriptions table
CREATE TABLE IF NOT EXISTS public.suggested_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.streaming_services(id) ON DELETE SET NULL,
  merchant_name TEXT NOT NULL,
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  suggested_amount DECIMAL(10, 2) NOT NULL,
  suggested_billing_cycle billing_cycle NOT NULL DEFAULT 'monthly',
  transaction_count INTEGER NOT NULL DEFAULT 0,
  detection_metadata JSONB DEFAULT '{}'::jsonb,
  status suggestion_status NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT positive_amount CHECK (suggested_amount >= 0),
  CONSTRAINT positive_transaction_count CHECK (transaction_count >= 0)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS suggested_subscriptions_user_id_idx
ON public.suggested_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS suggested_subscriptions_status_idx
ON public.suggested_subscriptions(status);

CREATE INDEX IF NOT EXISTS suggested_subscriptions_confidence_idx
ON public.suggested_subscriptions(confidence_score DESC);

CREATE INDEX IF NOT EXISTS suggested_subscriptions_user_status_idx
ON public.suggested_subscriptions(user_id, status);

-- Add trigger for updated_at
CREATE TRIGGER update_suggested_subscriptions_updated_at
  BEFORE UPDATE ON public.suggested_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.suggested_subscriptions IS 'AI-detected subscription suggestions pending user review';
COMMENT ON COLUMN public.suggested_subscriptions.confidence_score IS 'Detection confidence score (0-100). Scores above 80 are auto-created, 60-79 suggested for review';
COMMENT ON COLUMN public.suggested_subscriptions.detection_metadata IS 'JSON containing detection details: merchantMatch, amountConsistency, datePatternScore, isRecurring';

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

ALTER TABLE public.suggested_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own suggestions
CREATE POLICY "Users can view own suggestions"
  ON public.suggested_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert suggestions
CREATE POLICY "System can insert suggestions"
  ON public.suggested_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own suggestions (accept/reject)
CREATE POLICY "Users can update own suggestions"
  ON public.suggested_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own suggestions
CREATE POLICY "Users can delete own suggestions"
  ON public.suggested_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);
