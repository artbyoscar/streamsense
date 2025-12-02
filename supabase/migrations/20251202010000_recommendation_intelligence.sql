-- ============================================
-- CONTENT DNA CACHE
-- Stores computed DNA for content items
-- ============================================
CREATE TABLE IF NOT EXISTS content_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'movie',

  -- Tone dimensions (0-1 scale)
  tone_dark DECIMAL(3,2) DEFAULT 0,
  tone_humorous DECIMAL(3,2) DEFAULT 0,
  tone_tense DECIMAL(3,2) DEFAULT 0,
  tone_emotional DECIMAL(3,2) DEFAULT 0,
  tone_cerebral DECIMAL(3,2) DEFAULT 0,
  tone_escapist DECIMAL(3,2) DEFAULT 0,

  -- Theme dimensions (0-1 scale)
  theme_redemption DECIMAL(3,2) DEFAULT 0,
  theme_revenge DECIMAL(3,2) DEFAULT 0,
  theme_family DECIMAL(3,2) DEFAULT 0,
  theme_coming_of_age DECIMAL(3,2) DEFAULT 0,
  theme_good_vs_evil DECIMAL(3,2) DEFAULT 0,
  theme_survival DECIMAL(3,2) DEFAULT 0,
  theme_identity DECIMAL(3,2) DEFAULT 0,
  theme_power DECIMAL(3,2) DEFAULT 0,
  theme_love DECIMAL(3,2) DEFAULT 0,
  theme_loss DECIMAL(3,2) DEFAULT 0,
  theme_technology DECIMAL(3,2) DEFAULT 0,
  theme_nature DECIMAL(3,2) DEFAULT 0,
  theme_isolation DECIMAL(3,2) DEFAULT 0,
  theme_friendship DECIMAL(3,2) DEFAULT 0,
  theme_betrayal DECIMAL(3,2) DEFAULT 0,
  theme_justice DECIMAL(3,2) DEFAULT 0,

  -- Pacing dimensions
  pacing_slow DECIMAL(3,2) DEFAULT 0,
  pacing_medium DECIMAL(3,2) DEFAULT 0,
  pacing_fast DECIMAL(3,2) DEFAULT 0,

  -- Aesthetic dimensions
  aesthetic_visual DECIMAL(3,2) DEFAULT 0,
  aesthetic_gritty DECIMAL(3,2) DEFAULT 0,
  aesthetic_stylized DECIMAL(3,2) DEFAULT 0,

  -- Narrative dimensions
  narrative_nonlinear DECIMAL(3,2) DEFAULT 0,
  narrative_twist DECIMAL(3,2) DEFAULT 0,

  -- Content signals
  content_violence DECIMAL(3,2) DEFAULT 0,
  content_mature DECIMAL(3,2) DEFAULT 0,

  -- Production metadata
  production_budget TEXT, -- 'indie', 'mid', 'blockbuster'
  production_era TEXT,    -- 'classic', 'modern', 'contemporary'
  origin_countries TEXT[], -- Array of country codes

  -- Talent (stored as arrays for flexibility)
  directors TEXT[],
  writers TEXT[],
  lead_actors TEXT[],
  composers TEXT[],

  -- TMDb enrichment
  keywords TEXT[],
  similar_titles INTEGER[],

  -- Metadata
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tmdb_data_version TEXT, -- Track which TMDb data version was used

  UNIQUE(tmdb_id, media_type)
);

-- Index for fast lookups
CREATE INDEX idx_content_dna_tmdb ON content_dna(tmdb_id, media_type);
CREATE INDEX idx_content_dna_directors ON content_dna USING GIN(directors);
CREATE INDEX idx_content_dna_keywords ON content_dna USING GIN(keywords);

-- ============================================
-- USER TASTE PROFILES
-- Aggregated taste preferences per user
-- ============================================
CREATE TABLE IF NOT EXISTS user_taste_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Aggregated tone preferences (learned from watched content)
  pref_tone_dark DECIMAL(3,2) DEFAULT 0,
  pref_tone_humorous DECIMAL(3,2) DEFAULT 0,
  pref_tone_tense DECIMAL(3,2) DEFAULT 0,
  pref_tone_emotional DECIMAL(3,2) DEFAULT 0,
  pref_tone_cerebral DECIMAL(3,2) DEFAULT 0,
  pref_tone_escapist DECIMAL(3,2) DEFAULT 0,

  -- Aggregated theme preferences
  pref_theme_redemption DECIMAL(3,2) DEFAULT 0,
  pref_theme_revenge DECIMAL(3,2) DEFAULT 0,
  pref_theme_family DECIMAL(3,2) DEFAULT 0,
  pref_theme_coming_of_age DECIMAL(3,2) DEFAULT 0,
  pref_theme_good_vs_evil DECIMAL(3,2) DEFAULT 0,
  pref_theme_survival DECIMAL(3,2) DEFAULT 0,
  pref_theme_identity DECIMAL(3,2) DEFAULT 0,
  pref_theme_power DECIMAL(3,2) DEFAULT 0,
  pref_theme_love DECIMAL(3,2) DEFAULT 0,
  pref_theme_loss DECIMAL(3,2) DEFAULT 0,
  pref_theme_technology DECIMAL(3,2) DEFAULT 0,
  pref_theme_nature DECIMAL(3,2) DEFAULT 0,
  pref_theme_isolation DECIMAL(3,2) DEFAULT 0,
  pref_theme_friendship DECIMAL(3,2) DEFAULT 0,
  pref_theme_betrayal DECIMAL(3,2) DEFAULT 0,
  pref_theme_justice DECIMAL(3,2) DEFAULT 0,

  -- Aggregated pacing preferences
  pref_pacing_slow DECIMAL(3,2) DEFAULT 0,
  pref_pacing_medium DECIMAL(3,2) DEFAULT 0,
  pref_pacing_fast DECIMAL(3,2) DEFAULT 0,

  -- Viewing pattern metrics
  exploration_score DECIMAL(3,2) DEFAULT 0.5, -- 0=comfort zone, 1=adventurous
  violence_tolerance DECIMAL(3,2) DEFAULT 0.5,
  complexity_preference DECIMAL(3,2) DEFAULT 0.5,
  movie_vs_tv_ratio DECIMAL(3,2) DEFAULT 0.5, -- 0=movies only, 1=TV only
  new_vs_classic_ratio DECIMAL(3,2) DEFAULT 0.5, -- 0=classics, 1=new releases
  mainstream_vs_niche DECIMAL(3,2) DEFAULT 0.5, -- 0=mainstream, 1=niche

  -- Favorite talent (top 5 each, stored as JSONB for flexibility)
  favorite_directors JSONB DEFAULT '[]'::jsonb,
  favorite_actors JSONB DEFAULT '[]'::jsonb,
  favorite_decades JSONB DEFAULT '[]'::jsonb,

  -- Computed taste signature (human-readable)
  taste_signature TEXT,

  -- Discovery opportunities identified
  discovery_opportunities TEXT[],

  -- Avoid preferences
  avoid_genres INTEGER[],
  avoid_keywords TEXT[],

  -- Profile metadata
  content_count INTEGER DEFAULT 0, -- How many items informed this profile
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  profile_version INTEGER DEFAULT 1,

  UNIQUE(user_id)
);

-- Index for user lookups
CREATE INDEX idx_taste_profiles_user ON user_taste_profiles(user_id);

-- ============================================
-- USER INTEREST CLUSTERS
-- Groups of content that represent distinct taste clusters
-- ============================================
CREATE TABLE IF NOT EXISTS user_interest_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  cluster_name TEXT NOT NULL, -- "Mind-Bending Sci-Fi", "Dark Crime Thrillers"
  cluster_strength DECIMAL(3,2) DEFAULT 0, -- How strong is this interest

  -- Content that defines this cluster
  seed_content_ids INTEGER[], -- TMDb IDs
  seed_content_count INTEGER DEFAULT 0,

  -- Defining characteristics
  defining_themes TEXT[],
  defining_tones TEXT[],
  defining_keywords TEXT[],

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, cluster_name)
);

CREATE INDEX idx_interest_clusters_user ON user_interest_clusters(user_id);

-- ============================================
-- INTEREST GRAPH EDGES
-- Connections between interests for bridge recommendations
-- ============================================
CREATE TABLE IF NOT EXISTS interest_graph_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  from_node_type TEXT NOT NULL, -- 'genre', 'theme', 'director', 'actor', 'keyword'
  from_node_id TEXT NOT NULL,   -- 'genre_28', 'theme_identity', 'director_Christopher_Nolan'

  to_node_type TEXT NOT NULL,
  to_node_id TEXT NOT NULL,

  edge_weight DECIMAL(4,3) DEFAULT 0, -- Connection strength 0-1
  relationship_type TEXT, -- 'co_occurrence', 'thematic_link', 'talent_connection'

  -- For user-specific edges (learned from their viewing)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- For global edges (pre-defined or learned from all users)
  is_global BOOLEAN DEFAULT FALSE,

  occurrence_count INTEGER DEFAULT 0, -- How many times seen together

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(from_node_id, to_node_id, user_id)
);

CREATE INDEX idx_graph_edges_from ON interest_graph_edges(from_node_id);
CREATE INDEX idx_graph_edges_to ON interest_graph_edges(to_node_id);
CREATE INDEX idx_graph_edges_user ON interest_graph_edges(user_id);
CREATE INDEX idx_graph_edges_global ON interest_graph_edges(is_global) WHERE is_global = TRUE;

-- ============================================
-- RECOMMENDATION LANES CACHE
-- Cache generated recommendation lanes
-- ============================================
CREATE TABLE IF NOT EXISTS recommendation_lanes_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  lane_id TEXT NOT NULL, -- 'because_12345', 'hidden_gems', 'cluster_dark_thrillers'
  lane_title TEXT NOT NULL,
  lane_subtitle TEXT,
  lane_strategy TEXT NOT NULL, -- 'because_you_watched', 'hidden_gems', etc.
  lane_explanation TEXT,
  lane_priority INTEGER DEFAULT 50,

  -- Cached content items (as JSONB for flexibility)
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  item_count INTEGER DEFAULT 0,

  -- Cache metadata
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '6 hours'),
  is_stale BOOLEAN DEFAULT FALSE,

  UNIQUE(user_id, lane_id)
);

CREATE INDEX idx_lanes_cache_user ON recommendation_lanes_cache(user_id);
CREATE INDEX idx_lanes_cache_expiry ON recommendation_lanes_cache(expires_at);

-- ============================================
-- TEMPORAL VIEWING PATTERNS
-- Track when users watch what type of content
-- ============================================
CREATE TABLE IF NOT EXISTS viewing_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Time slot aggregates
  time_slot TEXT NOT NULL, -- 'morning', 'afternoon', 'evening', 'late_night'
  day_type TEXT NOT NULL,  -- 'weekday', 'weekend'

  -- Genre preferences for this time slot
  genre_preferences JSONB DEFAULT '{}'::jsonb, -- { "28": 0.8, "35": 0.6 }

  -- Tone preferences for this time slot
  tone_preferences JSONB DEFAULT '{}'::jsonb,

  -- Average runtime preference
  avg_runtime_preference INTEGER,

  -- Content type preference
  movie_ratio DECIMAL(3,2) DEFAULT 0.5,

  -- Sample size
  view_count INTEGER DEFAULT 0,

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, time_slot, day_type)
);

CREATE INDEX idx_viewing_patterns_user ON viewing_patterns(user_id);

-- ============================================
-- LLM RECOMMENDATION CACHE
-- Cache LLM-generated recommendations (expensive)
-- ============================================
CREATE TABLE IF NOT EXISTS llm_recommendations_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  request_type TEXT NOT NULL, -- 'personalized', 'mood_based', 'specific_request'
  request_params JSONB, -- Parameters used for the request

  -- LLM response
  recommendations JSONB NOT NULL,
  explanation TEXT,

  -- Cost tracking
  tokens_used INTEGER,
  model_used TEXT,

  -- Cache metadata
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),

  UNIQUE(user_id, request_type, request_params)
);

CREATE INDEX idx_llm_cache_user ON llm_recommendations_cache(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE content_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_taste_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interest_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE interest_graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_lanes_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE viewing_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_recommendations_cache ENABLE ROW LEVEL SECURITY;

-- Content DNA is public (shared cache)
CREATE POLICY "Content DNA is readable by all authenticated users"
  ON content_dna FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Content DNA is insertable by authenticated users"
  ON content_dna FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- User-specific tables are private
CREATE POLICY "Users can read own taste profile"
  ON user_taste_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own taste profile"
  ON user_taste_profiles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own interest clusters"
  ON user_interest_clusters FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own interest clusters"
  ON user_interest_clusters FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own or global graph edges"
  ON interest_graph_edges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_global = TRUE);

CREATE POLICY "Users can manage own graph edges"
  ON interest_graph_edges FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own lanes cache"
  ON recommendation_lanes_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own lanes cache"
  ON recommendation_lanes_cache FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own viewing patterns"
  ON viewing_patterns FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own viewing patterns"
  ON viewing_patterns FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own LLM cache"
  ON llm_recommendations_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own LLM cache"
  ON llm_recommendations_cache FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to compute cosine similarity between two JSONB objects
CREATE OR REPLACE FUNCTION cosine_similarity(a JSONB, b JSONB)
RETURNS DECIMAL AS $$
DECLARE
  dot_product DECIMAL := 0;
  norm_a DECIMAL := 0;
  norm_b DECIMAL := 0;
  key TEXT;
  val_a DECIMAL;
  val_b DECIMAL;
BEGIN
  FOR key IN SELECT jsonb_object_keys(a) UNION SELECT jsonb_object_keys(b)
  LOOP
    val_a := COALESCE((a->>key)::DECIMAL, 0);
    val_b := COALESCE((b->>key)::DECIMAL, 0);
    dot_product := dot_product + (val_a * val_b);
    norm_a := norm_a + (val_a * val_a);
    norm_b := norm_b + (val_b * val_b);
  END LOOP;

  IF norm_a = 0 OR norm_b = 0 THEN
    RETURN 0;
  END IF;

  RETURN dot_product / (SQRT(norm_a) * SQRT(norm_b));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to invalidate stale caches
CREATE OR REPLACE FUNCTION invalidate_stale_caches()
RETURNS void AS $$
BEGIN
  UPDATE recommendation_lanes_cache
  SET is_stale = TRUE
  WHERE expires_at < NOW();

  DELETE FROM llm_recommendations_cache
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
