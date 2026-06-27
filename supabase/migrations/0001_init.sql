-- ─────────────────────────────────────────────────────────────────────────────
-- Aether — initial schema
-- Multi-tenant AI agency platform. Each agency owner (auth.users) owns clients;
-- every downstream record is scoped to a client and protected by RLS so an
-- agency can only ever see its own data.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  agency_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, agency_name)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'agency_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Clients (the agency's customers) ─────────────────────────────────────────
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  website text,
  industry text,
  status text not null default 'onboarding',
  brand_color text not null default '#6d4aff',
  contact_email text,
  contact_phone text,
  monthly_value numeric not null default 0,
  agent_persona text,
  created_at timestamptz not null default now(),
  unique (owner_id, slug)
);

-- ── Knowledge base (feeds the support agent) ─────────────────────────────────
create table if not exists public.knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  content text not null,
  source_url text,
  created_at timestamptz not null default now()
);

-- ── Conversations + messages (the AI support agent) ──────────────────────────
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  channel text not null default 'web',
  visitor_id text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- ── Leads ────────────────────────────────────────────────────────────────────
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text,
  email text,
  phone text,
  source text,
  message text,
  score int not null default 0,
  status text not null default 'new',
  qualification text,
  created_at timestamptz not null default now()
);

-- ── Content ──────────────────────────────────────────────────────────────────
create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  platform text,
  status text not null default 'draft',
  scheduled_for timestamptz,
  created_at timestamptz not null default now()
);

-- ── Automations ──────────────────────────────────────────────────────────────
create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  type text not null,
  name text not null,
  status text not null default 'active',
  config jsonb not null default '{}'::jsonb,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  status text not null,
  summary text,
  created_at timestamptz not null default now()
);

-- ── Subscriptions (Stripe billing) ───────────────────────────────────────────
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'starter',
  status text not null default 'trialing',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists idx_clients_owner on public.clients(owner_id);
create index if not exists idx_knowledge_client on public.knowledge_docs(client_id);
create index if not exists idx_conversations_client on public.conversations(client_id);
create index if not exists idx_messages_conversation on public.messages(conversation_id);
create index if not exists idx_leads_client on public.leads(client_id);
create index if not exists idx_content_client on public.content_items(client_id);
create index if not exists idx_automations_client on public.automations(client_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles        enable row level security;
alter table public.clients         enable row level security;
alter table public.knowledge_docs  enable row level security;
alter table public.conversations   enable row level security;
alter table public.messages        enable row level security;
alter table public.leads           enable row level security;
alter table public.content_items   enable row level security;
alter table public.automations     enable row level security;
alter table public.automation_runs enable row level security;
alter table public.subscriptions   enable row level security;

-- Profiles: a user manages only their own row.
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Clients: scoped to the owning agency.
create policy "own clients" on public.clients
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Helper predicate: does the current user own the client behind this row?
-- Implemented inline per table for clarity.
create policy "own knowledge" on public.knowledge_docs
  for all using (exists (select 1 from public.clients c where c.id = client_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.clients c where c.id = client_id and c.owner_id = auth.uid()));

create policy "own conversations" on public.conversations
  for all using (exists (select 1 from public.clients c where c.id = client_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.clients c where c.id = client_id and c.owner_id = auth.uid()));

create policy "own messages" on public.messages
  for all using (exists (
    select 1 from public.conversations conv
    join public.clients c on c.id = conv.client_id
    where conv.id = conversation_id and c.owner_id = auth.uid()))
  with check (exists (
    select 1 from public.conversations conv
    join public.clients c on c.id = conv.client_id
    where conv.id = conversation_id and c.owner_id = auth.uid()));

create policy "own leads" on public.leads
  for all using (exists (select 1 from public.clients c where c.id = client_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.clients c where c.id = client_id and c.owner_id = auth.uid()));

create policy "own content" on public.content_items
  for all using (exists (select 1 from public.clients c where c.id = client_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.clients c where c.id = client_id and c.owner_id = auth.uid()));

create policy "own automations" on public.automations
  for all using (exists (select 1 from public.clients c where c.id = client_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.clients c where c.id = client_id and c.owner_id = auth.uid()));

create policy "own automation_runs" on public.automation_runs
  for all using (exists (
    select 1 from public.automations a
    join public.clients c on c.id = a.client_id
    where a.id = automation_id and c.owner_id = auth.uid()))
  with check (exists (
    select 1 from public.automations a
    join public.clients c on c.id = a.client_id
    where a.id = automation_id and c.owner_id = auth.uid()));

create policy "own subscription" on public.subscriptions
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
