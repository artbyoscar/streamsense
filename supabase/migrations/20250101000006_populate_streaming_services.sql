-- ========================================
-- Populate Streaming Services
-- ========================================
-- Adds pre-populated streaming services with common pricing

-- Clear existing services (optional, for clean slate)
DELETE FROM public.streaming_services;

-- Insert popular streaming services
INSERT INTO public.streaming_services (name, base_price, merchant_patterns) VALUES
  -- Video Streaming
  ('Netflix', 15.49, ARRAY['NETFLIX', 'Netflix.com', 'NETFLIX.COM']),
  ('Hulu', 7.99, ARRAY['HULU', 'Hulu.com', 'HULU.COM']),
  ('Disney+', 7.99, ARRAY['DISNEY', 'DisneyPlus', 'DISNEY+', 'DISNEYPLUS']),
  ('HBO Max', 15.99, ARRAY['HBO', 'HBO MAX', 'HBOMAX', 'Max']),
  ('Amazon Prime Video', 8.99, ARRAY['AMAZON', 'PRIME VIDEO', 'PRIMEVIDEO', 'AMZ*Prime Video']),
  ('Apple TV+', 6.99, ARRAY['APPLE', 'Apple TV', 'APPLETV', 'APPLE TV+']),
  ('Peacock', 5.99, ARRAY['PEACOCK', 'NBCUniversal', 'NBC PEACOCK']),
  ('Paramount+', 5.99, ARRAY['PARAMOUNT', 'PARAMOUNT+', 'PARAMOUNTPLUS', 'CBS']),
  ('ESPN+', 10.99, ARRAY['ESPN', 'ESPN+', 'ESPNPLUS']),
  ('Discovery+', 4.99, ARRAY['DISCOVERY', 'DISCOVERY+', 'DISCOVERYPLUS']),
  ('AMC+', 8.99, ARRAY['AMC', 'AMC+', 'AMCPLUS']),
  ('Starz', 8.99, ARRAY['STARZ', 'STARZ.COM']),
  ('Showtime', 10.99, ARRAY['SHOWTIME', 'SHO', 'SHOWTIME ANYTIME']),
  ('Crunchyroll', 7.99, ARRAY['CRUNCHYROLL', 'CRUNCHYROLL.COM']),

  -- Music Streaming
  ('Spotify', 10.99, ARRAY['SPOTIFY', 'SPOTIFY.COM', 'SPOTIFY PREMIUM']),
  ('Apple Music', 10.99, ARRAY['APPLE MUSIC', 'APPLEMUSIC', 'APPLE.COM/BILL']),
  ('YouTube Premium', 13.99, ARRAY['YOUTUBE', 'YOUTUBE PREMIUM', 'GOOGLE*YouTube Premium']),

  -- Gaming
  ('Xbox Game Pass', 16.99, ARRAY['XBOX', 'XBOX GAME PASS', 'MICROSOFT*Xbox', 'MS*Xbox']),
  ('PlayStation Plus', 9.99, ARRAY['PLAYSTATION', 'PS PLUS', 'SONY*PlayStation Plus', 'PSN']),
  ('Nintendo Switch Online', 3.99, ARRAY['NINTENDO', 'NINTENDO ONLINE', 'NINTENDO SWITCH'])
ON CONFLICT (name) DO UPDATE SET
  base_price = EXCLUDED.base_price,
  merchant_patterns = EXCLUDED.merchant_patterns,
  updated_at = NOW();

-- Update timestamp
COMMENT ON TABLE public.streaming_services IS 'Pre-populated streaming services catalog (Updated: 2025-01-01)';
