-- Proxy Me database schema
-- Run this in the Supabase SQL editor

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  description text not null,
  status text not null default 'pending',
  messages jsonb,
  result jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists agent_steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id),
  step_type text not null,
  description text not null,
  metadata jsonb default '{}',
  status text not null default 'complete',
  created_at timestamptz default now()
);

create table if not exists pending_approvals (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id),
  action_summary text not null,
  action_reasoning text not null,
  action_impact text not null,
  alternatives_considered text,
  status text not null default 'pending',
  rejection_reason text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- user_tokens: stores encrypted OAuth tokens (mock replacement for Auth0 Token Vault)
-- In production with Auth0 Pro, this table is not needed — Token Vault handles storage.
create table if not exists user_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  provider text not null default 'google-oauth2',
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider)
);

alter table user_tokens enable row level security;

-- Only server-side (service role) reads/writes user_tokens — no browser access
create policy "Service role only" on user_tokens
  using (false);

alter table tasks enable row level security;
alter table agent_steps enable row level security;
alter table pending_approvals enable row level security;

-- RLS policies: server-side uses service role (bypasses), browser uses anon (blocked unless policy added)
-- For this app, all writes are server-side via service role key.
-- Read access for tasks/steps needs a policy if we want browser reads:
create policy "Users can read own tasks" on tasks
  for select using (auth.uid()::text = user_id);

create policy "Users can read steps for own tasks" on agent_steps
  for select using (
    task_id in (select id from tasks where user_id = auth.uid()::text)
  );

create policy "Users can read approvals for own tasks" on pending_approvals
  for select using (
    task_id in (select id from tasks where user_id = auth.uid()::text)
  );
