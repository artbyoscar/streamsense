/**
 * Database type definitions
 * These types represent the database schema for StreamSense
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/**
 * Subscription billing cycles
 */
export type BillingCycle = 'monthly' | 'yearly' | 'weekly' | 'quarterly';

/**
 * Subscription status
 */
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

/**
 * Subscription category
 */
export type SubscriptionCategory =
  | 'streaming'
  | 'music'
  | 'gaming'
  | 'productivity'
  | 'fitness'
  | 'education'
  | 'news'
  | 'other';

/**
 * Database tables interface
 */
export interface Database {
  public: {
    Tables: {
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          amount: number;
          currency: string;
          billing_cycle: BillingCycle;
          next_billing_date: string;
          category: SubscriptionCategory;
          status: SubscriptionStatus;
          logo_url: string | null;
          website_url: string | null;
          notes: string | null;
          reminder_enabled: boolean;
          reminder_days_before: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          amount: number;
          currency?: string;
          billing_cycle: BillingCycle;
          next_billing_date: string;
          category?: SubscriptionCategory;
          status?: SubscriptionStatus;
          logo_url?: string | null;
          website_url?: string | null;
          notes?: string | null;
          reminder_enabled?: boolean;
          reminder_days_before?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          amount?: number;
          currency?: string;
          billing_cycle?: BillingCycle;
          next_billing_date?: string;
          category?: SubscriptionCategory;
          status?: SubscriptionStatus;
          logo_url?: string | null;
          website_url?: string | null;
          notes?: string | null;
          reminder_enabled?: boolean;
          reminder_days_before?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          avatar_url: string | null;
          preferred_currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          preferred_currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          preferred_currency?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      billing_cycle: BillingCycle;
      subscription_status: SubscriptionStatus;
      subscription_category: SubscriptionCategory;
    };
  };
}

/**
 * Helper types for easier access
 */
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert'];
export type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update'];

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
