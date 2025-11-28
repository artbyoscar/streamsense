/**
 * StreamSense Type Definitions
 * Central export file for all TypeScript types
 */

// ============================================================================
// EXISTING TYPES
// ============================================================================

export type { User, AuthState } from './auth';
export type {
  AppEnvironment,
  PlaidEnvironment,
  EnvironmentConfig,
  EnvValidationError,
} from './env';

// ============================================================================
// DATABASE TYPES
// ============================================================================

export * from './database';

// Re-export database types for convenience
export type {
  Database,
  Json,
  UserSubscription,
  UserSubscriptionInsert,
  UserSubscriptionUpdate,
  Profile,
  ProfileInsert,
  ProfileUpdate,
  StreamingService,
  StreamingServiceInsert,
  StreamingServiceUpdate,
  Content,
  ContentInsert,
  ContentUpdate,
  WatchlistItem,
  WatchlistItemInsert,
  WatchlistItemUpdate,
  ViewingLog,
  ViewingLogInsert,
  ViewingLogUpdate,
  Transaction,
  TransactionInsert,
  TransactionUpdate,
  PlaidItem,
  PlaidItemInsert,
  PlaidItemUpdate,
  BillingCycle,
  SubscriptionStatus,
  DetectionSource,
  ContentType,
  WatchlistPriority,
  WatchlistStatus,
  ViewingSource,
  PricingTier,
  SubscriptionWithService,
  WatchlistItemWithContent,
  ViewingLogWithDetails,
  TransactionWithService,
} from './database';

// ============================================================================
// TMDB TYPES
// ============================================================================

export type {
  TMDbMovie,
  TMDbMovieDetails,
  TMDbTVShow,
  TMDbTVDetails,
  TMDbMovieListResponse,
  TMDbTVListResponse,
  TMDbMultiSearchResponse,
  TMDbMultiSearchResult,
  UnifiedContent,
  TMDbGenre,
  TMDbImage,
  TMDbConfiguration,
  TMDbError,
} from './tmdb';

// ============================================================================
// API TYPES
// ============================================================================

export type {
  // Authentication
  SignUpRequest,
  SignUpResponse,
  SignInRequest,
  SignInResponse,
  ResetPasswordRequest,
  UpdatePasswordRequest,

  // Profile
  UpdateProfileRequest,
  GetProfileResponse,
  UpdateProfileResponse,

  // Subscriptions
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  GetSubscriptionsResponse,
  GetSubscriptionResponse,
  CreateSubscriptionResponse,
  UpdateSubscriptionResponse,
  DeleteSubscriptionResponse,
  SubscriptionStatsResponse,
  UpcomingRenewal,
  GetUpcomingRenewalsRequest,
  GetUpcomingRenewalsResponse,

  // Streaming Services
  GetStreamingServicesResponse,
  GetStreamingServiceResponse,
  SearchServicesRequest,
  SearchServicesResponse,

  // Plaid
  CreateLinkTokenRequest,
  CreateLinkTokenResponse,
  ExchangePublicTokenRequest,
  ExchangePublicTokenResponse,
  GetPlaidItemsResponse,
  SyncTransactionsRequest,
  SyncTransactionsResponse,
  DeletePlaidItemRequest,
  DeletePlaidItemResponse,

  // Transactions
  GetTransactionsRequest,
  GetTransactionsResponse,
  MarkTransactionAsSubscriptionRequest,
  MarkTransactionAsSubscriptionResponse,

  // Content (TMDB)
  SearchContentRequest,
  ContentSearchResult,
  SearchContentResponse,
  GetContentResponse,
  GetPopularContentRequest,
  GetPopularContentResponse,
  GetTrendingContentRequest,
  GetTrendingContentResponse,

  // Watchlist
  AddToWatchlistRequest,
  AddToWatchlistResponse,
  UpdateWatchlistItemRequest,
  UpdateWatchlistItemResponse,
  GetWatchlistResponse,
  RemoveFromWatchlistResponse,

  // Viewing Logs
  LogViewingRequest,
  LogViewingResponse,
  ViewingHistoryItem,
  GetViewingHistoryRequest,
  GetViewingHistoryResponse,
  UpdateViewingLogRequest,
  UpdateViewingLogResponse,
  DeleteViewingLogResponse,

  // Analytics
  SpendingByServiceResponse,
  SpendingTrendRequest,
  SpendingTrendResponse,
  ViewingStatsResponse,

  // Recommendations
  GetRecommendationsRequest,
  RecommendationItem,
  GetRecommendationsResponse,

  // Notifications
  GetNotificationsResponse,
  MarkNotificationReadRequest,
  MarkNotificationReadResponse,

  // Error Responses
  ApiError,
  ValidationError,

  // Common
  PaginationParams,
  PaginatedResponse,
  SuccessResponse,
} from './api';

// ============================================================================
// BACKWARD COMPATIBILITY ALIASES
// ============================================================================

export type { UserSubscription as Subscription } from './database';
export type { UserSubscriptionInsert as SubscriptionInsert } from './database';
export type { UserSubscriptionUpdate as SubscriptionUpdate } from './database';
