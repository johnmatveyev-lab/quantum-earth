-- Phase 4: Enterprise & Defense Ready
-- Create all tables first, then enable RLS and add policies

-- ============================================
-- 1. Create all tables
-- ============================================

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  logo_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'viewer' check (role in ('viewer', 'analyst', 'admin')),
  invited_by uuid references auth.users(id),
  joined_at timestamptz not null default now(),
  unique(org_id, user_id)
);

create table if not exists public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade not null,
  email text not null,
  role text not null default 'viewer' check (role in ('viewer', 'analyst', 'admin')),
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  metadata jsonb default '{}',
  ip_address text,
  created_at timestamptz not null default now()
);

create table if not exists public.custom_overlays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  org_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  overlay_type text not null check (overlay_type in ('kml', 'geojson', 'tle', 'csv')),
  data jsonb not null default '{}',
  file_size integer default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  snapshot_type text not null check (snapshot_type in ('hourly_counts', 'daily_counts', 'regional_activity', 'top_operators')),
  data jsonb not null default '{}',
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_at timestamptz not null default now()
);

-- ============================================
-- 2. Indexes
-- ============================================

create index if not exists idx_org_members_user on public.org_members(user_id);
create index if not exists idx_org_members_org on public.org_members(org_id);
create index if not exists idx_audit_logs_org on public.audit_logs(org_id, created_at desc);

-- ============================================
-- 3. Enable RLS
-- ============================================

alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.org_invites enable row level security;
alter table public.audit_logs enable row level security;
alter table public.custom_overlays enable row level security;
alter table public.analytics_snapshots enable row level security;

-- ============================================
-- 4. Policies (all tables exist now)
-- ============================================

-- Organizations
drop policy if exists "Org members can view" on public.organizations;
create policy "Org members can view" on public.organizations
  for select using (
    exists (select 1 from public.org_members where org_members.org_id = organizations.id and org_members.user_id = auth.uid())
  );

drop policy if exists "Admins can update" on public.organizations;
create policy "Admins can update" on public.organizations
  for update using (
    exists (select 1 from public.org_members where org_members.org_id = organizations.id and org_members.user_id = auth.uid() and org_members.role = 'admin')
  );

drop policy if exists "Auth users can create" on public.organizations;
create policy "Auth users can create" on public.organizations
  for insert with check (auth.uid() = created_by);

-- Org Members
drop policy if exists "Members can view org members" on public.org_members;
create policy "Members can view org members" on public.org_members
  for select using (
    exists (select 1 from public.org_members om where om.org_id = org_members.org_id and om.user_id = auth.uid())
  );

drop policy if exists "Admins manage members" on public.org_members;
create policy "Admins manage members" on public.org_members
  for all using (
    exists (select 1 from public.org_members om where om.org_id = org_members.org_id and om.user_id = auth.uid() and om.role = 'admin')
  );

-- Org Invites
drop policy if exists "Admins manage invites" on public.org_invites;
create policy "Admins manage invites" on public.org_invites
  for all using (
    exists (select 1 from public.org_members om where om.org_id = org_invites.org_id and om.user_id = auth.uid() and om.role = 'admin')
  );

-- Audit Logs
drop policy if exists "Admins view audit logs" on public.audit_logs;
create policy "Admins view audit logs" on public.audit_logs
  for select using (
    (org_id is null and user_id = auth.uid())
    or exists (select 1 from public.org_members om where om.org_id = audit_logs.org_id and om.user_id = auth.uid() and om.role in ('admin', 'analyst'))
  );

drop policy if exists "System inserts logs" on public.audit_logs;
create policy "System inserts logs" on public.audit_logs
  for insert with check (auth.uid() = user_id);

-- Custom Overlays
drop policy if exists "Users manage own overlays" on public.custom_overlays;
create policy "Users manage own overlays" on public.custom_overlays
  for all using (auth.uid() = user_id);

drop policy if exists "Org members view shared overlays" on public.custom_overlays;
create policy "Org members view shared overlays" on public.custom_overlays
  for select using (
    org_id is not null and exists (select 1 from public.org_members om where om.org_id = custom_overlays.org_id and om.user_id = auth.uid())
  );

-- Analytics Snapshots
drop policy if exists "Users view own analytics" on public.analytics_snapshots;
create policy "Users view own analytics" on public.analytics_snapshots
  for all using (auth.uid() = user_id);
