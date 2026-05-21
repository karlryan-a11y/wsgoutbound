-- WSG Outbound — Initial Migration
-- Run in Supabase SQL Editor

create extension if not exists vector;
create extension if not exists pgcrypto;

-- ---------- campaigns ----------
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'draft',
  -- statuses: draft, awaiting_sql_review, querying,
  --   awaiting_volume, enriching, awaiting_copy_review,
  --   pushing, completed, failed, cancelled
  brief jsonb not null,
  sql_versions jsonb[] default array[]::jsonb[],
  candidate_count int,
  enriched_count int,
  valid_count int,
  master_copy jsonb,
  instantly_campaign_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

create index on campaigns(status);
create index on campaigns(created_at desc);

-- ---------- leads ----------
create table leads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  source_data jsonb not null,
  email text,
  email_status text,
  personalization jsonb,
  pushed_to_instantly_at timestamptz,
  instantly_lead_id text,
  created_at timestamptz default now()
);

create index on leads(campaign_id);
create index on leads(email);
create index on leads(email_status);

-- ---------- knowledge base (RAG) ----------
create table knowledge (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  content text not null,
  embedding vector(1024),
  source text,
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on knowledge using ivfflat (embedding vector_cosine_ops);
create index on knowledge using gin(tags);

-- ---------- instructions (always-apply rules) ----------
create table instructions (
  id uuid primary key default gen_random_uuid(),
  rule text not null,
  category text not null,
  active boolean default true,
  created_at timestamptz default now(),
  last_referenced_at timestamptz
);

-- ---------- outcomes (learning loop) ----------
create table outcomes (
  campaign_id uuid primary key references campaigns(id) on delete cascade,
  sent_count int default 0,
  opened_count int default 0,
  replied_count int default 0,
  positive_reply_count int default 0,
  what_worked text,
  what_didnt text,
  notes text,
  updated_at timestamptz default now()
);

-- ---------- suppression ----------
create table suppression (
  id uuid primary key default gen_random_uuid(),
  email text,
  domain text,
  reason text,
  created_at timestamptz default now()
);

create unique index on suppression(email) where email is not null;
create index on suppression(domain);

-- ---------- debug log ----------
create table debug_log (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete set null,
  step text not null,
  prompt text,
  response text,
  model text,
  tokens_in int,
  tokens_out int,
  created_at timestamptz default now()
);

create index on debug_log(campaign_id);
create index on debug_log(created_at desc);

-- ---------- RLS ----------
alter table campaigns enable row level security;
alter table leads enable row level security;
alter table knowledge enable row level security;
alter table instructions enable row level security;
alter table outcomes enable row level security;
alter table suppression enable row level security;
alter table debug_log enable row level security;

-- Single-user policies: authenticated can do everything
create policy "authenticated_all" on campaigns for all to authenticated using (true) with check (true);
create policy "authenticated_all" on leads for all to authenticated using (true) with check (true);
create policy "authenticated_all" on knowledge for all to authenticated using (true) with check (true);
create policy "authenticated_all" on instructions for all to authenticated using (true) with check (true);
create policy "authenticated_all" on outcomes for all to authenticated using (true) with check (true);
create policy "authenticated_all" on suppression for all to authenticated using (true) with check (true);
create policy "authenticated_all" on debug_log for all to authenticated using (true) with check (true);

-- Service role bypass (for Inngest server-side calls)
create policy "service_role_all" on campaigns for all to service_role using (true) with check (true);
create policy "service_role_all" on leads for all to service_role using (true) with check (true);
create policy "service_role_all" on knowledge for all to service_role using (true) with check (true);
create policy "service_role_all" on instructions for all to service_role using (true) with check (true);
create policy "service_role_all" on outcomes for all to service_role using (true) with check (true);
create policy "service_role_all" on suppression for all to service_role using (true) with check (true);
create policy "service_role_all" on debug_log for all to service_role using (true) with check (true);

-- ---------- knowledge match function (RAG) ----------
create or replace function match_knowledge(
  query_embedding vector(1024),
  match_count int default 5,
  filter_type text default null
)
returns table (id uuid, title text, content text, type text, similarity float)
language sql stable as $$
  select k.id, k.title, k.content, k.type,
         1 - (k.embedding <=> query_embedding) as similarity
  from knowledge k
  where filter_type is null or k.type = filter_type
  order by k.embedding <=> query_embedding
  limit match_count;
$$;
