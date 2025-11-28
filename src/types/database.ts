/**
 * Supabase Database Types
 * Auto-generated TypeScript definitions for StreamSense database schema
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ============================================================================
// ENUMS
// ============================================================================

export type SubscriptionStatus = 'active' | 'cancelled' | 'paused' | 'expired';
export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type DetectionSource = 'manual' | 'plaid' | 'email';
export type ContentType = 'movie' | 'tv';
export type WatchlistPriority = 'low' | 'medium' | 'high';
export type WatchlistStatus = 'want_to_watch' | 'watching' | 'watched';
export type ViewingSource = 'self_report' | 'detected' | 'imported';

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

export interface Database {
  public: {
    Tables: {
      // ========================================
      // PROFILES
      // ========================================
      profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;
          onboarding_completed: boolean;
          is_premium: boolean;
          premium_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          onboarding_completed?: boolean;
          is_premium?: boolean;
          premium_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          onboarding_completed?: boolean;
          is_premium?: boolean;
          premium_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      // ========================================
      // STREAMING SERVICES
      // ========================================
      streaming_services: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          base_price: number | null;
          pricing_tiers: Json;
          merchant_patterns: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url?: string | null;
          base_price?: number | null;
          pricing_tiers?: Json;
          merchant_patterns?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          logo_url?: string | null;
          base_price?: number | null;
          pricing_tiers?: Json;
          merchant_patterns?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };

      // ========================================
      // USER SUBSCRIPTIONS
      // ========================================
      user_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          service_id: string | null;
          service_name: string;
          status: SubscriptionStatus;
          price: number;
          billing_cycle: BillingCycle;
          next_billing_date: string | null;
          renewal_reminder_sent: boolean;
          detected_from: DetectionSource;
          notes: string | null;
          created_at: string;
          updated_at: string;
          cancelled_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          service_id?: string | null;
          service_name: string;
          status?: SubscriptionStatus;
          price: number;
          billing_cycle?: BillingCycle;
          next_billing_date?: string | null;
          renewal_reminder_sent?: boolean;
          detected_from?: DetectionSource;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          cancelled_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          service_id?: string | null;
          service_name?: string;
          status?: SubscriptionStatus;
          price?: number;
          billing_cycle?: BillingCycle;
          next_billing_date?: string | null;
          renewal_reminder_sent?: boolean;
          detected_from?: DetectionSource;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          cancelled_at?: string | null;
        };
      };

      // ========================================
      // PLAID ITEMS
      // ========================================
      plaid_items: {
        Row: {
          id: string;
          user_id: string;
          access_token: string;
          item_id: string;
          institution_name: string;
          institution_id: string | null;
          last_synced: string | null;
          is_active: boolean;
          error_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          access_token: string;
          item_id: string;
          institution_name: string;
          institution_id?: string | null;
          last_synced?: string | null;
          is_active?: boolean;
          error_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          access_token?: string;
          item_id?: string;
          institution_name?: string;
          institution_id?: string | null;
          last_synced?: string | null;
          is_active?: boolean;
          error_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      // ========================================
      // TRANSACTIONS
      // ========================================
      transactions: {
        Row: {
          id: string;
          user_id: string;
          plaid_item_id: string | null;
          plaid_transaction_id: string | null;
          amount: number;
          merchant_name: string;
          date: string;
          category: string[] | null;
          is_subscription: boolean;
          matched_service_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plaid_item_id?: string | null;
          plaid_transaction_id?: string | null;
          amount: number;
          merchant_name: string;
          date: string;
          category?: string[] | null;
          is_subscription?: boolean;
          matched_service_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plaid_item_id?: string | null;
          plaid_transaction_id?: string | null;
          amount?: number;
          merchant_name?: string;
          date?: string;
          category?: string[] | null;
          is_subscription?: boolean;
          matched_service_id?: string | null;
          created_at?: string;
        };
      };

      // ========================================
      // CONTENT
      // ========================================
      content: {
        Row: {
          id: string;
          tmdb_id: number;
          title: string;
          type: ContentType;
          overview: string | null;
          poster_url: string | null;
          backdrop_url: string | null;
          genres: string[] | null;
          release_date: string | null;
          vote_average: number | null;
          popularity: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tmdb_id: number;
          title: string;
          type: ContentType;
          overview?: string | null;
          poster_url?: string | null;
          backdrop_url?: string | null;
          genres?: string[] | null;
          release_date?: string | null;
          vote_average?: number | null;
          popularity?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tmdb_id?: number;
          title?: string;
          type?: ContentType;
          overview?: string | null;
          poster_url?: string | null;
          backdrop_url?: string | null;
          genres?: string[] | null;
          release_date?: string | null;
          vote_average?: number | null;
          popularity?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      // ========================================
      // WATCHLIST ITEMS
      // ========================================
      watchlist_items: {
        Row: {
          id: string;
          user_id: string;
          content_id: string;
          priority: WatchlistPriority;
          status: WatchlistStatus;
          notify_on_available: boolean;
          notes: string | null;
          streaming_services: Json;
          rating: number | null;
          added_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content_id: string;
          priority?: WatchlistPriority;
          status?: WatchlistStatus;
          notify_on_available?: boolean;
          notes?: string | null;
          streaming_services?: Json;
          rating?: number | null;
          added_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content_id?: string;
          priority?: WatchlistPriority;
          status?: WatchlistStatus;
          notify_on_available?: boolean;
          notes?: string | null;
          streaming_services?: Json;
          rating?: number | null;
          added_at?: string;
        };
      };

      // ========================================
      // VIEWING LOGS
      // ========================================
      viewing_logs: {
        Row: {
          id: string;
          user_id: string;
          content_id: string;
          service_id: string | null;
          watched_at: string;
          duration_minutes: number | null;
          source: ViewingSource;
          rating: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content_id: string;
          service_id?: string | null;
          watched_at?: string;
          duration_minutes?: number | null;
          source?: ViewingSource;
          rating?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content_id?: string;
          service_id?: string | null;
          watched_at?: string;
          duration_minutes?: number | null;
          source?: ViewingSource;
          rating?: number | null;
          notes?: string | null;
          created_at?: string;
        };
      };
    };

    Views: {
      [_ in never]: never;
    };

    Functions: {
      // Calculate monthly spending for a user
      calculate_monthly_spending: {
        Args: { p_user_id: string };
        Returns: number;
      };

      // Get upcoming renewals
      get_upcoming_renewals: {
        Args: { p_user_id: string; p_days_ahead?: number };
        Returns: Array<{
          subscription_id: string;
          service_name: string;
          price: number;
          next_billing_date: string;
          days_until_renewal: number;
        }>;
      };

      // Get subscription statistics
      get_subscription_stats: {
        Args: { p_user_id: string };
        Returns: Array<{
          total_active: number;
          total_cancelled: number;
          monthly_spending: number;
          yearly_spending: number;
          most_expensive_service: string | null;
          most_expensive_price: number | null;
        }>;
      };

      // Search content
      search_content: {
        Args: {
          p_search_query: string;
          p_content_type?: ContentType;
          p_limit?: number;
        };
        Returns: Array<{
          content_id: string;
          tmdb_id: number;
          title: string;
          type: ContentType;
          overview: string | null;
          poster_url: string | null;
          release_date: string | null;
          vote_average: number | null;
          rank: number;
        }>;
      };

      // Get viewing history
      get_viewing_history: {
        Args: { p_user_id: string; p_limit?: number };
        Returns: Array<{
          log_id: string;
          content_title: string;
          content_type: ContentType;
          poster_url: string | null;
          service_name: string | null;
          watched_at: string;
          rating: number | null;
          duration_minutes: number | null;
        }>;
      };

      // Match transaction to service
      match_transaction_to_service: {
        Args: { p_merchant_name: string; p_amount: number };
        Returns: string | null;
      };

      // Check if user is admin
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };

    Enums: {
      subscription_status: SubscriptionStatus;
      billing_cycle: BillingCycle;
      detection_source: DetectionSource;
      content_type: ContentType;
      watchlist_priority: WatchlistPriority;
      viewing_source: ViewingSource;
    };
  };
}

// ============================================================================
// TYPE HELPERS
// ============================================================================

// Extract table row types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type StreamingService = Database['public']['Tables']['streaming_services']['Row'];
export type StreamingServiceInsert = Database['public']['Tables']['streaming_services']['Insert'];
export type StreamingServiceUpdate = Database['public']['Tables']['streaming_services']['Update'];

export type UserSubscription = Database['public']['Tables']['user_subscriptions']['Row'];
export type UserSubscriptionInsert = Database['public']['Tables']['user_subscriptions']['Insert'];
export type UserSubscriptionUpdate = Database['public']['Tables']['user_subscriptions']['Update'];

export type PlaidItem = Database['public']['Tables']['plaid_items']['Row'];
export type PlaidItemInsert = Database['public']['Tables']['plaid_items']['Insert'];
export type PlaidItemUpdate = Database['public']['Tables']['plaid_items']['Update'];

export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update'];

export type Content = Database['public']['Tables']['content']['Row'];
export type ContentInsert = Database['public']['Tables']['content']['Insert'];
export type ContentUpdate = Database['public']['Tables']['content']['Update'];

export type WatchlistItem = Database['public']['Tables']['watchlist_items']['Row'];
export type WatchlistItemInsert = Database['public']['Tables']['watchlist_items']['Insert'];
export type WatchlistItemUpdate = Database['public']['Tables']['watchlist_items']['Update'];

export type ViewingLog = Database['public']['Tables']['viewing_logs']['Row'];
export type ViewingLogInsert = Database['public']['Tables']['viewing_logs']['Insert'];
export type ViewingLogUpdate = Database['public']['Tables']['viewing_logs']['Update'];

// ============================================================================
// PRICING TIER TYPE
// ============================================================================

export interface PricingTier {
  name: string;
  price: number;
  features: string[];
}

// ============================================================================
// EXTENDED TYPES WITH RELATIONS
// ============================================================================

export interface SubscriptionWithService extends UserSubscription {
  service?: StreamingService | null;
}

export interface WatchlistItemWithContent extends WatchlistItem {
  content: Content;
}

export interface ViewingLogWithDetails extends ViewingLog {
  content: Content;
  service?: StreamingService | null;
}

export interface TransactionWithService extends Transaction {
  matched_service?: StreamingService | null;
}
