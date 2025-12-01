-- Create content_impressions table to track user views of recommendations
create table if not exists public.content_impressions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  content_id integer not null, -- TMDB ID
  impression_count integer default 1 not null,
  last_shown_at timestamptz default now() not null,
  engaged boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  
  -- Unique constraint to prevent duplicate rows for same user/content
  unique(user_id, content_id)
);

-- Enable RLS
alter table public.content_impressions enable row level security;

-- Policies
create policy "Users can view their own impressions"
  on public.content_impressions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own impressions"
  on public.content_impressions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own impressions"
  on public.content_impressions for update
  using (auth.uid() = user_id);

-- Indexes
create index content_impressions_user_id_idx on public.content_impressions(user_id);
create index content_impressions_content_id_idx on public.content_impressions(content_id);
