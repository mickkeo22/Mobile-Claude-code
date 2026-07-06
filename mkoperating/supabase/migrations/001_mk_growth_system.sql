-- MK Operating growth system schema.
-- Tables are prefixed mk_ (this Supabase project is shared across apps).
-- RLS is enabled with NO policies: anon/publishable keys can read nothing;
-- the app talks to these tables server-side with the service-role key only.

-- ── Leads ──────────────────────────────────────────────────────────────────
create table if not exists mk_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null,
  first_name text,
  business_name text,
  answers jsonb not null default '{}'::jsonb,
  audit jsonb,
  audit_text text,
  status text not null default 'new'
    check (status in ('new','emailed','booked','call_done','proposal_sent','won','lost')),
  stage text not null default 'partial' check (stage in ('partial','completed')),
  source text not null default 'audit_wizard',
  session_id text,
  ghl_status text not null default 'pending'
    check (ghl_status in ('pending','sent','failed','skipped')),
  ghl_attempts integer not null default 0,
  ghl_last_error text,
  ghl_synced_at timestamptz
);
create index if not exists mk_leads_email_idx on mk_leads (email);
create index if not exists mk_leads_session_idx on mk_leads (session_id);
create index if not exists mk_leads_status_idx on mk_leads (status);
create index if not exists mk_leads_created_idx on mk_leads (created_at desc);
create index if not exists mk_leads_ghl_idx on mk_leads (ghl_status);
alter table mk_leads enable row level security;

-- ── Lead events: activity timeline + GHL delivery log ─────────────────────
create table if not exists mk_lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references mk_leads (id) on delete cascade,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists mk_lead_events_lead_idx on mk_lead_events (lead_id, created_at desc);
create index if not exists mk_lead_events_created_idx on mk_lead_events (created_at desc);
alter table mk_lead_events enable row level security;

-- ── Discovery copilot calls ────────────────────────────────────────────────
create table if not exists mk_calls (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references mk_leads (id) on delete cascade,
  status text not null default 'prepped' check (status in ('prepped','live','done')),
  brief jsonb,
  live jsonb not null default '{"notes":"","asked":[],"signals":[],"checklist":[]}'::jsonb,
  summary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mk_calls_lead_idx on mk_calls (lead_id, created_at desc);
alter table mk_calls enable row level security;

-- ── Proposals ──────────────────────────────────────────────────────────────
create table if not exists mk_proposals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references mk_leads (id) on delete cascade,
  slug text not null unique,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','sent','viewed')),
  view_count integer not null default 0,
  first_viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mk_proposals_lead_idx on mk_proposals (lead_id, created_at desc);
alter table mk_proposals enable row level security;

-- ── Outbound prospects ─────────────────────────────────────────────────────
create table if not exists mk_outbound_prospects (
  id uuid primary key default gen_random_uuid(),
  batch text not null default 'default',
  name text not null,
  niche text not null default '',
  town text not null default '',
  website text,
  email text,
  status text not null default 'new'
    check (status in ('new','drafted','sent','replied','converted','dead')),
  teaser jsonb,
  email_subject text,
  email_body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mk_prospects_batch_idx on mk_outbound_prospects (batch);
create index if not exists mk_prospects_status_idx on mk_outbound_prospects (status);
alter table mk_outbound_prospects enable row level security;

-- ── Funnel analytics events ────────────────────────────────────────────────
create table if not exists mk_funnel_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  step text not null,
  event text not null check (event in ('view','complete','submit','audit_ready','audit_error')),
  lead_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists mk_funnel_created_idx on mk_funnel_events (created_at desc);
create index if not exists mk_funnel_session_idx on mk_funnel_events (session_id);
alter table mk_funnel_events enable row level security;

-- ── Trust-page content ─────────────────────────────────────────────────────
create table if not exists mk_testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null default '',
  author text not null default '',
  company text not null default '',
  role text not null default '',
  result text not null default '',
  published boolean not null default false,
  sort integer not null default 100,
  created_at timestamptz not null default now()
);
alter table mk_testimonials enable row level security;

create table if not exists mk_work_items (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  niche text not null default '',
  town text not null default '',
  problem text not null default '',
  built text not null default '',
  result text not null default '',
  published boolean not null default false,
  sort integer not null default 100,
  created_at timestamptz not null default now()
);
alter table mk_work_items enable row level security;
