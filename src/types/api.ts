/**
 * API Request/Response Types for StreamSense
 * Types for all API endpoints and their payloads
 */

import type {
  Profile,
  ProfileUpdate,
  UserSubscription,
  UserSubscriptionInsert,
  UserSubscriptionUpdate,
  PlaidItem,
  Transaction,
  Content,
  WatchlistItem,
  WatchlistItemInsert,
  ViewingLog,
  ViewingLogInsert,
  StreamingService,
  SubscriptionStatus,
  BillingCycle,
  DetectionSource,
  ContentType,
  WatchlistPriority,
  ViewingSource,
} from './database';

// ============================================================================
// AUTHENTICATION
// ============================================================================

export interface SignUpRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface SignUpResponse {
  user: {
    id: string;
    email: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
  };
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  user: {
    id: string;
    email: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
  };
}

export interface ResetPasswordRequest {
  email: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ============================================================================
// PROFILE
// ============================================================================

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  onboardingCompleted?: boolean;
}

export interface GetProfileResponse {
  profile: Profile;
}

export interface UpdateProfileResponse {
  profile: Profile;
}

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export interface CreateSubscriptionRequest {
  serviceId?: string | null;
  serviceName: string;
  price: number;
  billingCycle?: BillingCycle;
  nextBillingDate?: string | null;
  detectedFrom?: DetectionSource;
  notes?: string | null;
}

export interface UpdateSubscriptionRequest {
  serviceId?: string | null;
  serviceName?: string;
  status?: SubscriptionStatus;
  price?: number;
  billingCycle?: BillingCycle;
  nextBillingDate?: string | null;
  notes?: string | null;
}

export interface GetSubscriptionsResponse {
  subscriptions: UserSubscription[];
}

export interface GetSubscriptionResponse {
  subscription: UserSubscription;
}

export interface CreateSubscriptionResponse {
  subscription: UserSubscription;
}

export interface UpdateSubscriptionResponse {
  subscription: UserSubscription;
}

export interface DeleteSubscriptionResponse {
  success: boolean;
}

export interface SubscriptionStatsResponse {
  totalActive: number;
  totalCancelled: number;
  monthlySpending: number;
  yearlySpending: number;
  mostExpensiveService: string | null;
  mostExpensivePrice: number | null;
}

export interface UpcomingRenewal {
  subscriptionId: string;
  serviceName: string;
  price: number;
  nextBillingDate: string;
  daysUntilRenewal: number;
}

export interface GetUpcomingRenewalsRequest {
  daysAhead?: number;
}

export interface GetUpcomingRenewalsResponse {
  renewals: UpcomingRenewal[];
}

// ============================================================================
// STREAMING SERVICES
// ============================================================================

export interface GetStreamingServicesResponse {
  services: StreamingService[];
}

export interface GetStreamingServiceResponse {
  service: StreamingService;
}

export interface SearchServicesRequest {
  query: string;
}

export interface SearchServicesResponse {
  services: StreamingService[];
}

// ============================================================================
// PLAID
// ============================================================================

export interface CreateLinkTokenRequest {
  userId: string;
}

export interface CreateLinkTokenResponse {
  linkToken: string;
}

export interface ExchangePublicTokenRequest {
  publicToken: string;
}

export interface ExchangePublicTokenResponse {
  plaidItem: PlaidItem;
}

export interface GetPlaidItemsResponse {
  items: PlaidItem[];
}

export interface SyncTransactionsRequest {
  plaidItemId: string;
  startDate?: string;
  endDate?: string;
}

export interface SyncTransactionsResponse {
  transactionsSynced: number;
  subscriptionsDetected: number;
}

export interface DeletePlaidItemRequest {
  itemId: string;
}

export interface DeletePlaidItemResponse {
  success: boolean;
}

// ============================================================================
// TRANSACTIONS
// ============================================================================

export interface GetTransactionsRequest {
  startDate?: string;
  endDate?: string;
  isSubscription?: boolean;
  limit?: number;
  offset?: number;
}

export interface GetTransactionsResponse {
  transactions: Transaction[];
  total: number;
  hasMore: boolean;
}

export interface MarkTransactionAsSubscriptionRequest {
  transactionId: string;
  isSubscription: boolean;
  serviceId?: string | null;
}

export interface MarkTransactionAsSubscriptionResponse {
  transaction: Transaction;
}

// ============================================================================
// CONTENT (TMDB)
// ============================================================================

export interface SearchContentRequest {
  query: string;
  type?: ContentType;
  limit?: number;
}

export interface ContentSearchResult {
  contentId: string;
  tmdbId: number;
  title: string;
  type: ContentType;
  overview: string | null;
  posterUrl: string | null;
  releaseDate: string | null;
  voteAverage: number | null;
  rank: number;
}

export interface SearchContentResponse {
  results: ContentSearchResult[];
}

export interface GetContentResponse {
  content: Content;
}

export interface GetPopularContentRequest {
  type?: ContentType;
  limit?: number;
}

export interface GetPopularContentResponse {
  content: Content[];
}

export interface GetTrendingContentRequest {
  timeWindow?: 'day' | 'week';
  type?: ContentType;
  limit?: number;
}

export interface GetTrendingContentResponse {
  content: Content[];
}

// ============================================================================
// WATCHLIST
// ============================================================================

export interface AddToWatchlistRequest {
  contentId: string;
  priority?: WatchlistPriority;
  notifyOnAvailable?: boolean;
  notes?: string | null;
}

export interface AddToWatchlistResponse {
  watchlistItem: WatchlistItem;
}

export interface UpdateWatchlistItemRequest {
  priority?: WatchlistPriority;
  notifyOnAvailable?: boolean;
  notes?: string | null;
}

export interface UpdateWatchlistItemResponse {
  watchlistItem: WatchlistItem;
}

export interface GetWatchlistResponse {
  items: Array<WatchlistItem & { content: Content }>;
}

export interface RemoveFromWatchlistResponse {
  success: boolean;
}

// ============================================================================
// VIEWING LOGS
// ============================================================================

export interface LogViewingRequest {
  contentId: string;
  serviceId?: string | null;
  watchedAt?: string;
  durationMinutes?: number | null;
  source?: ViewingSource;
  rating?: number | null;
  notes?: string | null;
}

export interface LogViewingResponse {
  viewingLog: ViewingLog;
}

export interface ViewingHistoryItem {
  logId: string;
  contentTitle: string;
  contentType: ContentType;
  posterUrl: string | null;
  serviceName: string | null;
  watchedAt: string;
  rating: number | null;
  durationMinutes: number | null;
}

export interface GetViewingHistoryRequest {
  limit?: number;
  offset?: number;
}

export interface GetViewingHistoryResponse {
  history: ViewingHistoryItem[];
  total: number;
  hasMore: boolean;
}

export interface UpdateViewingLogRequest {
  rating?: number | null;
  notes?: string | null;
  durationMinutes?: number | null;
}

export interface UpdateViewingLogResponse {
  viewingLog: ViewingLog;
}

export interface DeleteViewingLogResponse {
  success: boolean;
}

// ============================================================================
// ANALYTICS
// ============================================================================

export interface SpendingByServiceResponse {
  data: Array<{
    serviceName: string;
    monthlyAmount: number;
    yearlyAmount: number;
    subscriptionCount: number;
  }>;
}

export interface SpendingTrendRequest {
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
}

export interface SpendingTrendResponse {
  data: Array<{
    date: string;
    amount: number;
  }>;
}

export interface ViewingStatsResponse {
  totalWatched: number;
  totalHours: number;
  favoriteService: string | null;
  favoriteGenre: string | null;
  averageRating: number | null;
  contentByType: {
    movies: number;
    tv: number;
  };
}

// ============================================================================
// RECOMMENDATIONS
// ============================================================================

export interface GetRecommendationsRequest {
  type?: ContentType;
  limit?: number;
}

export interface RecommendationItem {
  content: Content;
  score: number;
  reason: string;
}

export interface GetRecommendationsResponse {
  recommendations: RecommendationItem[];
}

export interface ImpressionRecord {
  contentId: number;
  impressions: number;      // Times shown
  lastShown: Date;
  engaged: boolean;         // Did user interact?
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export interface GetNotificationsResponse {
  notifications: Array<{
    id: string;
    type: 'renewal_reminder' | 'price_change' | 'new_content' | 'watchlist_available';
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface MarkNotificationReadRequest {
  notificationId: string;
}

export interface MarkNotificationReadResponse {
  success: boolean;
}

// ============================================================================
// ERROR RESPONSES
// ============================================================================

export interface ApiError {
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
}

export interface ValidationError {
  error: {
    message: string;
    code: 'VALIDATION_ERROR';
    fields: Record<string, string[]>;
  };
}

// ============================================================================
// PAGINATION
// ============================================================================

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// ============================================================================
// COMMON RESPONSE
// ============================================================================

export interface SuccessResponse {
  success: boolean;
  message?: string;
}
