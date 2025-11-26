# Supabase Setup Guide

This guide explains the Supabase configuration and database schema for StreamSense.

## Quick Start

1. Create a Supabase project at https://supabase.com
2. Copy your credentials to `.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Run the database migrations (see below)
4. Start using the app!

## Database Schema

### Tables

#### `subscriptions`

Stores user subscription information.

```sql
create table public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  amount decimal(10,2) not null,
  currency text default 'USD' not null,
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly', 'weekly', 'quarterly')),
  next_billing_date date not null,
  category text default 'other' not null check (category in ('streaming', 'music', 'gaming', 'productivity', 'fitness', 'education', 'news', 'other')),
  status text default 'active' not null check (status in ('active', 'paused', 'cancelled')),
  logo_url text,
  website_url text,
  notes text,
  reminder_enabled boolean default true,
  reminder_days_before integer default 3,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.subscriptions enable row level security;

-- Policies
create policy "Users can view their own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can create their own subscriptions"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own subscriptions"
  on public.subscriptions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own subscriptions"
  on public.subscriptions for delete
  using (auth.uid() = user_id);

-- Indexes
create index subscriptions_user_id_idx on public.subscriptions(user_id);
create index subscriptions_next_billing_date_idx on public.subscriptions(next_billing_date);
create index subscriptions_status_idx on public.subscriptions(status);

-- Updated at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row
  execute function public.handle_updated_at();
```

#### `profiles`

Stores user profile information.

```sql
create table public.profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  full_name text,
  avatar_url text,
  preferred_currency text default 'USD' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can create their own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

-- Index
create index profiles_user_id_idx on public.profiles(user_id);

-- Updated at trigger
create trigger profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
```

## Architecture

### Service Layer

The app uses a layered architecture:

```
Components/Screens
      ↓
React Query Hooks (src/hooks/useSupabase.ts)
      ↓
Service Layer (src/services/database.ts)
      ↓
Supabase Client (src/config/supabase.ts)
      ↓
Supabase Backend
```

### Files Overview

#### Configuration

- [src/config/supabase.ts](src/config/supabase.ts) - Supabase client with SecureStore

#### Services

- [src/services/supabase.ts](src/services/supabase.ts) - Supabase helper functions
- [src/services/auth.ts](src/services/auth.ts) - Authentication operations
- [src/services/database.ts](src/services/database.ts) - Database operations

#### Hooks

- [src/hooks/useAuth.ts](src/hooks/useAuth.ts) - Authentication hook
- [src/hooks/useSupabase.ts](src/hooks/useSupabase.ts) - React Query hooks for data

#### Types

- [src/types/database.ts](src/types/database.ts) - Database type definitions

## Usage Examples

### Authentication

```typescript
import { useAuth } from '@/hooks';
import { authService } from '@/services';

function LoginScreen() {
  const { signIn, isLoading } = useAuth();

  const handleLogin = async () => {
    await signIn('user@example.com', 'password');
  };

  // Or use the service directly
  const handleLoginDirect = async () => {
    const { user, error } = await authService.signInWithEmail({
      email: 'user@example.com',
      password: 'password',
    });
  };
}
```

### Subscriptions

```typescript
import {
  useSubscriptions,
  useCreateSubscription,
  useUpdateSubscription,
  useDeleteSubscription,
} from '@/hooks';

function SubscriptionsScreen() {
  const { data: subscriptions, isLoading } = useSubscriptions();
  const createMutation = useCreateSubscription();
  const updateMutation = useUpdateSubscription();
  const deleteMutation = useDeleteSubscription();

  const handleCreate = () => {
    createMutation.mutate({
      user_id: 'user-id',
      name: 'Netflix',
      amount: 15.99,
      billing_cycle: 'monthly',
      next_billing_date: '2024-02-01',
      category: 'streaming',
    });
  };

  const handleUpdate = (id: string) => {
    updateMutation.mutate({
      id,
      updates: { amount: 17.99 },
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };
}
```

### Direct Database Access

```typescript
import { dbService } from '@/services';

async function getMySubscriptions() {
  const subscriptions = await dbService.getSubscriptions();
  const active = await dbService.getActiveSubscriptions();
  const total = await dbService.calculateMonthlySpending();
  const expiring = await dbService.getExpiringSubscriptions(7);
}
```

### Profile Management

```typescript
import { useProfile, useUpdateProfile } from '@/hooks';

function ProfileScreen() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const handleUpdate = () => {
    updateProfile.mutate({
      full_name: 'John Doe',
      preferred_currency: 'EUR',
    });
  };
}
```

## Features

### Type Safety

All database operations are fully typed:

```typescript
import type { Subscription, SubscriptionInsert } from '@/types';

const newSub: SubscriptionInsert = {
  user_id: 'user-id',
  name: 'Spotify',
  amount: 9.99,
  billing_cycle: 'monthly', // ✅ Type checked
  next_billing_date: '2024-02-01',
};
```

### Automatic Caching

React Query automatically caches and manages data:

```typescript
// First call - fetches from database
const { data } = useSubscriptions();

// Subsequent calls - returns cached data
const { data: cached } = useSubscriptions();

// Mutations automatically invalidate cache
const create = useCreateSubscription();
create.mutate(newSub); // Refetches subscriptions
```

### Optimistic Updates

```typescript
const updateMutation = useUpdateSubscription();

updateMutation.mutate(
  { id: 'sub-id', updates: { status: 'paused' } },
  {
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['subscriptions']);

      // Snapshot previous value
      const previous = queryClient.getQueryData(['subscriptions']);

      // Optimistically update cache
      queryClient.setQueryData(['subscriptions'], old => {
        // Update the subscription in the cache
      });

      return { previous };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['subscriptions'], context.previous);
    },
  }
);
```

### Real-time Subscriptions

```typescript
import { supabase } from '@/config';

function SubscriptionsScreen() {
  useEffect(() => {
    const channel = supabase
      .channel('subscriptions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
        },
        payload => {
          console.log('Change received!', payload);
          // Invalidate React Query cache
          queryClient.invalidateQueries(['subscriptions']);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
```

## Helper Functions

### Check Authentication

```typescript
import { isAuthenticated, getCurrentUser } from '@/services';

const authenticated = await isAuthenticated();
const user = await getCurrentUser();
```

### Calculate Spending

```typescript
import { dbService } from '@/services';

const monthlyTotal = await dbService.calculateMonthlySpending();
console.log(`Monthly: $${monthlyTotal}`);
```

### Get Expiring Subscriptions

```typescript
const expiringSoon = await dbService.getExpiringSubscriptions(7); // Next 7 days
```

## Security

### Row Level Security (RLS)

All tables use RLS to ensure users can only access their own data:

- ✅ Users can only view their own subscriptions
- ✅ Users can only modify their own data
- ✅ User ID is automatically validated

### Secure Storage

- Auth tokens stored in Expo SecureStore (encrypted)
- Automatic token refresh
- Session persistence across app restarts

## Testing

### Test Authentication

```typescript
import { authService } from '@/services';

// Sign up
const { user, error } = await authService.signUpWithEmail({
  email: 'test@example.com',
  password: 'test123',
});

// Sign in
const { user: signedIn } = await authService.signInWithEmail({
  email: 'test@example.com',
  password: 'test123',
});

// Sign out
await authService.signOut();
```

### Test Database Operations

```typescript
import { dbService } from '@/services';

// Create subscription
const subscription = await dbService.createSubscription({
  user_id: user.id,
  name: 'Test Subscription',
  amount: 9.99,
  billing_cycle: 'monthly',
  next_billing_date: new Date().toISOString(),
});

// Get subscriptions
const subs = await dbService.getSubscriptions();
console.log('Subscriptions:', subs);

// Delete subscription
await dbService.deleteSubscription(subscription.id);
```

## Troubleshooting

### RLS Policies Not Working

1. Ensure you're signed in (auth.uid() must exist)
2. Check that user_id matches auth.uid()
3. Verify policies in Supabase dashboard

### Type Errors

1. Regenerate types: `npx supabase gen types typescript`
2. Update [src/types/database.ts](src/types/database.ts)
3. Run `npm run type-check`

### Cache Not Updating

1. Check that mutations invalidate correct queries
2. Verify query keys match
3. Use React Query DevTools for debugging

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
