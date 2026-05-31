-- Company Brain - Supabase schema
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- The app also works without this (local JSON fallback); these tables enable
-- shared, persistent roles / gap tickets / document ownership.

create extension if not exists "pgcrypto";

-- Roles / owning teams. New roles are added dynamically as documents are ingested.
create table if not exists roles (
    id          uuid primary key default gen_random_uuid(),
    name        text unique not null,
    description text default '',
    tags        text[] default '{}',
    status      text default 'active',
    created_by  text default 'auto',
    created_at  timestamptz default now()
);

-- Knowledge gap tickets routed to the responsible role.
create table if not exists gap_tickets (
    id             uuid primary key default gen_random_uuid(),
    question       text not null,
    routed_to      text not null,
    body           text default '',
    missing_topics text[] default '{}',
    status         text default 'open',
    created_at     timestamptz default now()
);

-- Document ownership + freshness (one row per source file).
create table if not exists documents (
    source_file      text primary key,
    role_owner       text not null,
    role_owners      text[] default '{}',
    visibility_roles text[] default '{ALL}',
    min_clearance    text default 'standard',
    last_updated     date,
    chunks           integer default 0,
    modality         text default 'document',
    updated_at       timestamptz default now()
);

-- If you created the documents table before these columns were added:
alter table documents add column if not exists modality text default 'document';
alter table documents add column if not exists role_owners text[] default '{}';
alter table documents add column if not exists visibility_roles text[] default '{ALL}';
alter table documents add column if not exists min_clearance text default 'standard';

-- Demo convenience: allow the anon key to read/write.
-- For production, replace these with proper Row Level Security policies.
alter table roles        enable row level security;
alter table gap_tickets  enable row level security;
alter table documents    enable row level security;

create policy "anon all roles"       on roles       for all using (true) with check (true);
create policy "anon all gap_tickets" on gap_tickets for all using (true) with check (true);
create policy "anon all documents"   on documents   for all using (true) with check (true);
