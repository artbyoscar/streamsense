/**
 * TMDb API Types
 * TypeScript definitions for The Movie Database API responses
 */

// ============================================================================
// BASE TYPES
// ============================================================================

export interface TMDbImage {
  file_path: string;
  aspect_ratio: number;
  height: number;
  width: number;
  vote_average: number;
  vote_count: number;
}

export interface TMDbGenre {
  id: number;
  name: string;
}

export interface TMDbProductionCompany {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
}

export interface TMDbProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface TMDbSpokenLanguage {
  english_name: string;
  iso_639_1: string;
  name: string;
}

// ============================================================================
// MOVIE TYPES
// ============================================================================

export interface TMDbMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  adult: boolean;
  genre_ids: number[];
  original_language: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  video: boolean;
}

export interface TMDbMovieDetails extends TMDbMovie {
  genres: TMDbGenre[];
  homepage: string | null;
  imdb_id: string | null;
  production_companies: TMDbProductionCompany[];
  production_countries: TMDbProductionCountry[];
  spoken_languages: TMDbSpokenLanguage[];
  runtime: number | null;
  budget: number;
  revenue: number;
  status: string;
  tagline: string | null;
  belongs_to_collection: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  } | null;
}

// ============================================================================
// TV TYPES
// ============================================================================

export interface TMDbTVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  origin_country: string[];
  genre_ids: number[];
  original_language: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
}

export interface TMDbTVSeason {
  air_date: string | null;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  vote_average: number;
}

export interface TMDbTVCreator {
  id: number;
  credit_id: string;
  name: string;
  gender: number;
  profile_path: string | null;
}

export interface TMDbTVNetwork {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
}

export interface TMDbTVDetails extends TMDbTVShow {
  genres: TMDbGenre[];
  homepage: string;
  in_production: boolean;
  languages: string[];
  last_air_date: string | null;
  last_episode_to_air: {
    id: number;
    name: string;
    overview: string;
    air_date: string;
    episode_number: number;
    season_number: number;
    still_path: string | null;
  } | null;
  next_episode_to_air: {
    id: number;
    name: string;
    overview: string;
    air_date: string;
    episode_number: number;
    season_number: number;
    still_path: string | null;
  } | null;
  networks: TMDbTVNetwork[];
  number_of_episodes: number;
  number_of_seasons: number;
  production_companies: TMDbProductionCompany[];
  production_countries: TMDbProductionCountry[];
  seasons: TMDbTVSeason[];
  spoken_languages: TMDbSpokenLanguage[];
  status: string;
  tagline: string;
  type: string;
  created_by: TMDbTVCreator[];
  episode_run_time: number[];
}

// ============================================================================
// SEARCH & LIST TYPES
// ============================================================================

export interface TMDbPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export type TMDbMovieListResponse = TMDbPaginatedResponse<TMDbMovie>;
export type TMDbTVListResponse = TMDbPaginatedResponse<TMDbTVShow>;

// Multi-search can return movies, TV shows, or people
export interface TMDbMultiSearchResult {
  id: number;
  media_type: 'movie' | 'tv' | 'person';
  adult?: boolean;
  // Movie fields
  title?: string;
  original_title?: string;
  release_date?: string;
  // TV fields
  name?: string;
  original_name?: string;
  first_air_date?: string;
  origin_country?: string[];
  // Common fields
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genre_ids?: number[];
  original_language?: string;
  popularity: number;
  vote_average?: number;
  vote_count?: number;
  // Person fields
  profile_path?: string | null;
  known_for_department?: string;
  known_for?: (TMDbMovie | TMDbTVShow)[];
}

export type TMDbMultiSearchResponse = TMDbPaginatedResponse<TMDbMultiSearchResult>;

// ============================================================================
// UNIFIED CONTENT TYPE
// ============================================================================

/**
 * Unified content type that works for both movies and TV shows
 * Maps TMDb data to our internal Content structure
 */
export interface UnifiedContent {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  originalTitle: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  genres: TMDbGenre[];
  rating: number;
  voteCount: number;
  popularity: number;
  language: string;
  // TV-specific
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  status?: string;
  // Movie-specific
  runtime?: number;
}

// ============================================================================
// IMAGE CONFIGURATION
// ============================================================================

export interface TMDbImageConfig {
  base_url: string;
  secure_base_url: string;
  backdrop_sizes: string[];
  logo_sizes: string[];
  poster_sizes: string[];
  profile_sizes: string[];
  still_sizes: string[];
}

export interface TMDbConfiguration {
  images: TMDbImageConfig;
  change_keys: string[];
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface TMDbError {
  status_code: number;
  status_message: string;
  success: false;
}
