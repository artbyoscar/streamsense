# StreamSense Supabase Database Schema

Complete database schema documentation for the StreamSense subscription tracking application.

## Overview

The StreamSense database is designed to track user subscriptions, streaming content, viewing history, and financial transactions. It integrates with Plaid for automatic subscription detection and TMDB for content metadata.

## Quick Start

### 1. Set Up Supabase Project

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key from Settings > API
3. Update your `.env` file:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Run Migrations

Execute the migration files in order using the Supabase SQL Editor:

1. `20250101000000_initial_schema.sql` - Core tables and indexes
2. `20250101000001_rls_policies.sql` - Row Level Security policies
3. `20250101000002_triggers_functions.sql` - Database functions and triggers

**To run migrations:**

- Go to your Supabase project dashboard
- Navigate to SQL Editor
- Copy and paste each migration file content
- Execute in order

### 3. Verify Setup

Run this query to verify all tables were created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see:

- content
- plaid_items
- profiles
- streaming_services
- transactions
- user_subscriptions
- viewing_logs
- watchlist_items

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐
│ auth.users  │
│ (Supabase)  │
└──────┬──────┘
       │
       │ 1:1
       ▼
┌─────────────────────────────────────────────────────────────┐
│ profiles                                                     │
├─────────────────────────────────────────────────────────────┤
│ • id (FK → auth.users.id)                                   │
│ • email, first_name, last_name, avatar_url                  │
│ • onboarding_completed                                      │
└────────┬──────────────────────────────────┬─────────────────┘
         │                                   │
         │ 1:N                               │ 1:N
         ▼                                   ▼
┌──────────────────────┐           ┌──────────────────────┐
│ user_subscriptions   │           │ plaid_items          │
├──────────────────────┤           ├──────────────────────┤
│ • user_id (FK)       │           │ • user_id (FK)       │
│ • service_id (FK)    │◄──┐       │ • access_token       │
│ • price, billing     │   │       │ • item_id            │
│ • status, next_date  │   │       │ • institution_name   │
└──────────────────────┘   │       └──────────┬───────────┘
                           │                  │
         ┌─────────────────┘                  │ 1:N
         │                                    ▼
         │                          ┌──────────────────────┐
         │                          │ transactions         │
         │                          ├──────────────────────┤
         │                          │ • user_id (FK)       │
         │                          │ • plaid_item_id (FK) │
         │                          │ • amount, merchant   │
         │                          │ • is_subscription    │
         │                          │ • matched_service_id │
         │                          └──────────────────────┘
         │
┌────────┴──────────────┐
│ streaming_services    │
├───────────────────────┤
│ • name, logo_url      │
│ • pricing_tiers       │
│ • merchant_patterns   │
└───────────────────────┘
         │
         │ N:M (via watchlist_items, viewing_logs)
         ▼
┌─────────────────────────────────────────────┐
│ content                                     │
├─────────────────────────────────────────────┤
│ • tmdb_id, title, type (movie/tv)          │
│ • overview, poster_url, genres             │
│ • vote_average, popularity                  │
└────────┬────────────────────────┬───────────┘
         │                        │
         │ N:M                    │ N:M
         ▼                        ▼
┌──────────────────┐    ┌──────────────────────┐
│ watchlist_items  │    │ viewing_logs         │
├──────────────────┤    ├──────────────────────┤
│ • user_id (FK)   │    │ • user_id (FK)       │
│ • content_id (FK)│    │ • content_id (FK)    │
│ • priority       │    │ • service_id (FK)    │
│ • notify         │    │ • watched_at, rating │
└──────────────────┘    └──────────────────────┘
```

## Tables

### profiles

User profile information extending Supabase auth.users.

**Columns:**

- `id` (UUID, PK, FK → auth.users) - User ID
- `email` (TEXT) - User email
- `first_name` (TEXT, nullable) - First name
- `last_name` (TEXT, nullable) - Last name
- `avatar_url` (TEXT, nullable) - Profile picture URL
- `onboarding_completed` (BOOLEAN) - Whether user finished onboarding
- `created_at` (TIMESTAMPTZ) - Profile creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Indexes:**

- `profiles_email_idx` on email
- `profiles_created_at_idx` on created_at DESC

**RLS Policies:**

- Users can view, update, and delete their own profile
- Auto-created on user signup via trigger

### streaming_services

Catalog of available streaming services with pricing information.

**Columns:**

- `id` (UUID, PK) - Service ID
- `name` (TEXT, UNIQUE) - Service name (e.g., "Netflix")
- `logo_url` (TEXT, nullable) - Service logo URL
- `base_price` (DECIMAL, nullable) - Base subscription price
- `pricing_tiers` (JSONB) - Array of pricing tiers with features
- `merchant_patterns` (TEXT[]) - Patterns for transaction matching
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Pricing Tiers Format:**

```json
[
  {
    "name": "Basic",
    "price": 9.99,
    "features": ["1080p", "1 screen", "No ads"]
  },
  {
    "name": "Premium",
    "price": 19.99,
    "features": ["4K", "4 screens", "No ads"]
  }
]
```

**Indexes:**

- `streaming_services_name_idx` on name
- `streaming_services_pricing_tiers_idx` GIN on pricing_tiers

**RLS Policies:**

- Public read access
- Authenticated users can suggest new services

**Seeded Services:**
Netflix, Disney+, HBO Max, Hulu, Amazon Prime Video, Apple TV+, Paramount+, Peacock, YouTube Premium, Spotify

### user_subscriptions

User's subscription records with billing information.

**Columns:**

- `id` (UUID, PK) - Subscription ID
- `user_id` (UUID, FK → profiles) - Owner user ID
- `service_id` (UUID, FK → streaming_services, nullable) - Linked service
- `service_name` (TEXT) - Service name (denormalized)
- `status` (ENUM) - active, cancelled, paused, expired
- `price` (DECIMAL) - Subscription price
- `billing_cycle` (ENUM) - weekly, monthly, quarterly, yearly
- `next_billing_date` (DATE, nullable) - Next billing date
- `renewal_reminder_sent` (BOOLEAN) - Whether reminder was sent
- `detected_from` (ENUM) - manual, plaid, email
- `notes` (TEXT, nullable) - User notes
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp
- `cancelled_at` (TIMESTAMPTZ, nullable) - Cancellation timestamp

**Indexes:**

- `user_subscriptions_user_id_idx` on user_id
- `user_subscriptions_service_id_idx` on service_id
- `user_subscriptions_status_idx` on status
- `user_subscriptions_next_billing_date_idx` on next_billing_date
- `user_subscriptions_user_status_idx` on (user_id, status)

**RLS Policies:**

- Users can CRUD their own subscriptions only

**Triggers:**

- Auto-sets `cancelled_at` when status changes to cancelled

### plaid_items

Plaid bank account connections for transaction sync.

**Columns:**

- `id` (UUID, PK) - Plaid item ID
- `user_id` (UUID, FK → profiles) - Owner user ID
- `access_token` (TEXT) - Encrypted Plaid access token
- `item_id` (TEXT, UNIQUE) - Plaid item identifier
- `institution_name` (TEXT) - Bank/institution name
- `institution_id` (TEXT, nullable) - Plaid institution ID
- `last_synced` (TIMESTAMPTZ, nullable) - Last sync timestamp
- `is_active` (BOOLEAN) - Whether connection is active
- `error_code` (TEXT, nullable) - Error code if sync failed
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Security:**

- `access_token` should be encrypted at application level before storing
- Never expose access tokens to client-side code

**Indexes:**

- `plaid_items_user_id_idx` on user_id
- `plaid_items_item_id_idx` on item_id
- `plaid_items_last_synced_idx` on last_synced DESC

**RLS Policies:**

- Users can CRUD their own Plaid connections only

### transactions

Bank transactions from Plaid for subscription detection.

**Columns:**

- `id` (UUID, PK) - Transaction ID
- `user_id` (UUID, FK → profiles) - Owner user ID
- `plaid_item_id` (UUID, FK → plaid_items, nullable) - Source Plaid item
- `plaid_transaction_id` (TEXT, nullable) - Plaid transaction ID
- `amount` (DECIMAL) - Transaction amount
- `merchant_name` (TEXT) - Merchant name
- `date` (DATE) - Transaction date
- `category` (TEXT[], nullable) - Transaction categories
- `is_subscription` (BOOLEAN) - Marked as subscription
- `matched_service_id` (UUID, FK → streaming_services, nullable) - Matched service
- `created_at` (TIMESTAMPTZ) - Creation timestamp

**Indexes:**

- `transactions_user_id_idx` on user_id
- `transactions_plaid_item_id_idx` on plaid_item_id
- `transactions_date_idx` on date DESC
- `transactions_is_subscription_idx` on is_subscription WHERE is_subscription = true
- `transactions_merchant_name_idx` GIN full-text search on merchant_name

**RLS Policies:**

- Users can view and update their own transactions
- Service role can insert transactions

**Constraints:**

- UNIQUE (plaid_transaction_id, plaid_item_id)

### content

Movies and TV shows catalog from TMDB.

**Columns:**

- `id` (UUID, PK) - Content ID
- `tmdb_id` (INTEGER, UNIQUE) - TMDB identifier
- `title` (TEXT) - Content title
- `type` (ENUM) - movie, tv
- `overview` (TEXT, nullable) - Description
- `poster_url` (TEXT, nullable) - Poster image URL
- `backdrop_url` (TEXT, nullable) - Backdrop image URL
- `genres` (TEXT[], nullable) - Genre tags
- `release_date` (DATE, nullable) - Release date
- `vote_average` (DECIMAL, nullable) - TMDB rating (0-10)
- `popularity` (DECIMAL, nullable) - TMDB popularity score
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Indexes:**

- `content_tmdb_id_idx` on tmdb_id
- `content_type_idx` on type
- `content_title_idx` GIN full-text search on title
- `content_genres_idx` GIN on genres
- `content_popularity_idx` on popularity DESC

**RLS Policies:**

- Public read access
- Authenticated users can add/update content

### watchlist_items

User watchlist with priority and notification preferences.

**Columns:**

- `id` (UUID, PK) - Watchlist item ID
- `user_id` (UUID, FK → profiles) - Owner user ID
- `content_id` (UUID, FK → content) - Content reference
- `priority` (ENUM) - low, medium, high
- `notify_on_available` (BOOLEAN) - Send notification when available
- `notes` (TEXT, nullable) - User notes
- `added_at` (TIMESTAMPTZ) - When added to watchlist

**Indexes:**

- `watchlist_items_user_id_idx` on user_id
- `watchlist_items_content_id_idx` on content_id
- `watchlist_items_priority_idx` on priority
- `watchlist_items_added_at_idx` on added_at DESC

**RLS Policies:**

- Users can CRUD their own watchlist items only

**Constraints:**

- UNIQUE (user_id, content_id) - No duplicate watchlist entries

### viewing_logs

User viewing history across streaming services.

**Columns:**

- `id` (UUID, PK) - Log entry ID
- `user_id` (UUID, FK → profiles) - Owner user ID
- `content_id` (UUID, FK → content) - Content watched
- `service_id` (UUID, FK → streaming_services, nullable) - Where watched
- `watched_at` (TIMESTAMPTZ) - When watched
- `duration_minutes` (INTEGER, nullable) - Watch duration
- `source` (ENUM) - self_report, detected, imported
- `rating` (DECIMAL, nullable) - User rating (0-10)
- `notes` (TEXT, nullable) - User notes
- `created_at` (TIMESTAMPTZ) - Creation timestamp

**Indexes:**

- `viewing_logs_user_id_idx` on user_id
- `viewing_logs_content_id_idx` on content_id
- `viewing_logs_service_id_idx` on service_id
- `viewing_logs_watched_at_idx` on watched_at DESC

**RLS Policies:**

- Users can CRUD their own viewing logs only

**Constraints:**

- CHECK rating >= 0 AND rating <= 10

## Database Functions

### calculate_monthly_spending(p_user_id UUID)

Calculates total monthly spending across all active subscriptions, normalizing different billing cycles.

**Returns:** DECIMAL (total monthly amount)

**Example:**

```sql
SELECT calculate_monthly_spending(auth.uid());
-- Returns: 45.67
```

### get_upcoming_renewals(p_user_id UUID, p_days_ahead INTEGER DEFAULT 7)

Returns subscriptions renewing within the specified number of days.

**Returns:** Table of upcoming renewals

**Example:**

```sql
SELECT * FROM get_upcoming_renewals(auth.uid(), 7);
-- Returns renewals in next 7 days
```

### get_subscription_stats(p_user_id UUID)

Returns comprehensive subscription statistics.

**Returns:** Table with:

- total_active
- total_cancelled
- monthly_spending
- yearly_spending
- most_expensive_service
- most_expensive_price

**Example:**

```sql
SELECT * FROM get_subscription_stats(auth.uid());
```

### search_content(p_search_query TEXT, p_content_type content_type, p_limit INTEGER)

Full-text search for movies and TV shows.

**Returns:** Ranked search results

**Example:**

```sql
SELECT * FROM search_content('stranger things', 'tv', 10);
```

### get_viewing_history(p_user_id UUID, p_limit INTEGER DEFAULT 50)

Returns user's viewing history with content and service details.

**Returns:** Table of viewing logs with content info

**Example:**

```sql
SELECT * FROM get_viewing_history(auth.uid(), 20);
```

### match_transaction_to_service(p_merchant_name TEXT, p_amount DECIMAL)

Attempts to match a transaction merchant name to a known streaming service using merchant patterns.

**Returns:** UUID (service_id) or NULL

**Example:**

```sql
SELECT match_transaction_to_service('NETFLIX.COM', 15.99);
-- Returns Netflix service ID if pattern matches
```

### update_expired_subscriptions()

Updates all subscriptions to 'expired' status when next_billing_date has passed.

**Returns:** void

**Usage:** Call periodically (e.g., daily cron job)

```sql
SELECT update_expired_subscriptions();
```

## Security (RLS)

All tables have Row Level Security (RLS) enabled with the following principles:

1. **User Data Isolation**: Users can only access their own data
2. **Public Catalogs**: Content and streaming services are publicly readable
3. **Authenticated Actions**: Only authenticated users can modify data
4. **Service Role Access**: Backend services use service role key for system operations

### Example RLS Policy

```sql
-- Users can only view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.user_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);
```

## Triggers

### on_auth_user_created

Automatically creates a profile when a new user signs up via Supabase Auth.

**Trigger:** AFTER INSERT ON auth.users
**Function:** handle_new_user()

**Metadata Mapping:**

- `raw_user_meta_data->>'first_name'` → `profiles.first_name`
- `raw_user_meta_data->>'last_name'` → `profiles.last_name`

### on_subscription_cancelled

Sets `cancelled_at` timestamp when subscription status changes to 'cancelled'.

**Trigger:** BEFORE UPDATE ON user_subscriptions
**Function:** set_subscription_cancelled_at()

### update\_\*\_updated_at

Auto-updates `updated_at` timestamp on row modifications.

**Tables:**

- profiles
- streaming_services
- user_subscriptions
- plaid_items
- content

## Maintenance

### Regular Tasks

1. **Update Expired Subscriptions** (Daily)

```sql
SELECT update_expired_subscriptions();
```

2. **Clean Old Transactions** (Monthly)

```sql
DELETE FROM transactions
WHERE created_at < NOW() - INTERVAL '1 year'
  AND is_subscription = false;
```

3. **Refresh Content Metadata** (Weekly)

```sql
-- Re-fetch popular content from TMDB
-- Implement in application code
```

### Monitoring Queries

**Active Subscriptions Count:**

```sql
SELECT COUNT(*) as active_subscriptions
FROM user_subscriptions
WHERE status = 'active';
```

**Total Monthly Revenue:**

```sql
SELECT SUM(calculate_monthly_spending(id)) as total_monthly
FROM profiles;
```

**Most Popular Services:**

```sql
SELECT
  ss.name,
  COUNT(*) as subscriber_count
FROM user_subscriptions us
JOIN streaming_services ss ON us.service_id = ss.id
WHERE us.status = 'active'
GROUP BY ss.name
ORDER BY subscriber_count DESC
LIMIT 10;
```

## Backup and Recovery

### Backup

Supabase automatically backs up your database. To create manual backups:

1. Go to Database > Backups in Supabase dashboard
2. Click "Create backup"
3. Or use pg_dump for local backups

### Point-in-Time Recovery

Supabase Pro plan offers point-in-time recovery:

- Database > Backups > Point in Time Recovery
- Restore to any point in the last 7 days

## Migration History

| Migration      | Date       | Description                        |
| -------------- | ---------- | ---------------------------------- |
| 20250101000000 | 2025-01-01 | Initial schema with core tables    |
| 20250101000001 | 2025-01-01 | Row Level Security policies        |
| 20250101000002 | 2025-01-01 | Triggers, functions, and seed data |

## Support

For issues or questions:

- Check Supabase docs: https://supabase.com/docs
- Review migration files in `/supabase/migrations/`
- Check TypeScript types in `/src/types/database.ts`
