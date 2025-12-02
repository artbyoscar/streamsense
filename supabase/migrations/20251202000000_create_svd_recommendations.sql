-- Create table for SVD-based collaborative filtering recommendations
-- This caches pre-computed Netflix-style matrix factorization recommendations

CREATE TABLE IF NOT EXISTS public.svd_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  predicted_rating DECIMAL(3, 2) NOT NULL CHECK (predicted_rating >= 1.0 AND predicted_rating <= 5.0),
  confidence DECIMAL(3, 2) NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
  rank INTEGER NOT NULL CHECK (rank > 0),
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Unique constraint: one recommendation per user-item pair
  UNIQUE(user_id, tmdb_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_svd_recommendations_user_id ON public.svd_recommendations(user_id);
CREATE INDEX idx_svd_recommendations_user_rank ON public.svd_recommendations(user_id, rank);
CREATE INDEX idx_svd_recommendations_computed_at ON public.svd_recommendations(computed_at);

-- RLS policies
ALTER TABLE public.svd_recommendations ENABLE ROW LEVEL SECURITY;

-- Users can read their own recommendations
CREATE POLICY "Users can view their own SVD recommendations"
  ON public.svd_recommendations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert/update recommendations (for batch computation)
CREATE POLICY "Service role can manage SVD recommendations"
  ON public.svd_recommendations
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE public.svd_recommendations IS
'Cached SVD-based collaborative filtering recommendations.
Computed using matrix factorization on user-item interactions from watchlist.
Recommendations are refreshed periodically (e.g., nightly) or on-demand.';

COMMENT ON COLUMN public.svd_recommendations.predicted_rating IS
'Predicted rating on 1-5 scale from SVD model';

COMMENT ON COLUMN public.svd_recommendations.confidence IS
'Confidence score 0-1 based on singular value weights';

COMMENT ON COLUMN public.svd_recommendations.rank IS
'Ranking of recommendation (1 = best, higher = lower ranked)';

COMMENT ON COLUMN public.svd_recommendations.computed_at IS
'When these recommendations were computed. Used to determine freshness.';
