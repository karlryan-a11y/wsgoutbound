-- WSG Outbound — Enrichment columns + log table
-- Run in Supabase SQL Editor

-- Add enrichment columns to leads
alter table leads add column if not exists email_source text;
alter table leads add column if not exists email_confidence real;
alter table leads add column if not exists enrichment_status text default 'pending';
alter table leads add column if not exists updated_at timestamptz default now();

create index if not exists leads_enrichment_status_idx on leads(enrichment_status);

-- Enrichment log — tracks every API call attempt per lead
create table if not exists enrichment_log (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references leads(id) on delete cascade,
  source text not null,        -- leadmagic, apollo, pattern, etc.
  result text not null,        -- found, not_found, error
  data jsonb,                  -- raw API response
  created_at timestamptz default now()
);

create index if not exists enrichment_log_contact_idx on enrichment_log(contact_id);
create index if not exists enrichment_log_created_idx on enrichment_log(created_at desc);

-- RLS for enrichment_log
alter table enrichment_log enable row level security;
create policy "authenticated_all" on enrichment_log for all to authenticated using (true) with check (true);
create policy "service_role_all" on enrichment_log for all to service_role using (true) with check (true);
