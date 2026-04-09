-- Phase 3: Platform & API
-- Tables: api_keys, api_usage_logs, notification_channels, notification_rules

-- ============================================
-- API Keys
-- ============================================
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'Default',
  prefix text not null,          -- first 8 chars shown in UI (e.g. api_live_abc1)
  key_hash text not null,        -- SHA-256 of full key
  permissions text[] not null default '{"read"}',
  rate_limit integer not null default 1000,   -- requests per day
  last_used_at timestamptz,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.api_keys enable row level security;
create policy "Users manage own API keys" on public.api_keys
  for all using (auth.uid() = user_id);

create index idx_api_keys_user on public.api_keys(user_id);
create index idx_api_keys_prefix on public.api_keys(prefix);

-- ============================================
-- API Usage Logs (daily aggregates per key)
-- ============================================
create table if not exists public.api_usage_logs (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid references public.api_keys(id) on delete cascade not null,
  usage_date date not null default current_date,
  request_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique(api_key_id, usage_date)
);

alter table public.api_usage_logs enable row level security;
create policy "Users view own usage" on public.api_usage_logs
  for select using (
    exists (select 1 from public.api_keys where api_keys.id = api_usage_logs.api_key_id and api_keys.user_id = auth.uid())
  );

-- ============================================
-- Notification Channels
-- ============================================
create table if not exists public.notification_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  channel_type text not null check (channel_type in ('webhook', 'discord', 'slack', 'email')),
  webhook_url text,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.notification_channels enable row level security;
create policy "Users manage own channels" on public.notification_channels
  for all using (auth.uid() = user_id);

-- ============================================
-- Notification Rules
-- ============================================
create table if not exists public.notification_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  channel_id uuid references public.notification_channels(id) on delete cascade not null,
  event_type text not null check (event_type in ('geofence_enter', 'geofence_exit', 'anomaly_high', 'anomaly_medium', 'daily_briefing', 'watchlist_change')),
  filters jsonb default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.notification_rules enable row level security;
create policy "Users manage own rules" on public.notification_rules
  for all using (auth.uid() = user_id);
