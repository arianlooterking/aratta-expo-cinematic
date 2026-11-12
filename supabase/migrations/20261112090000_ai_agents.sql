-- AI agents (Claude, ChatGPT, Grok...) that work in the portal.
-- An agent either acts for one staff member (with that person's role, and
-- every change stamped with their name) or is a bot teammate of its own.
-- Its key is shown once; only a SHA-256 hash is stored here.
-- Every call is logged in ai_agent_actions. Sensitive changes (marking a
-- booth paid, winning or losing a deal) wait there until a person approves.

create table public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  provider text not null default 'other' check (provider in ('claude', 'chatgpt', 'grok', 'other')),
  acts_for uuid references public.staff_members (id) on delete cascade,
  scopes text[] not null default array['read']::text[]
    check (scopes <@ array['read', 'tasks', 'sales', 'operations', 'chat']::text[]),
  needs_approval boolean not null default true,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  token_hint text not null check (char_length(token_hint) between 4 and 12),
  created_by uuid references public.staff_members (id) on delete set null default public.current_staff_id(),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz
);

create index ai_agents_acts_for_idx on public.ai_agents (acts_for);

create table public.ai_agent_actions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.ai_agents (id) on delete cascade,
  acting_for uuid references public.staff_members (id) on delete set null,
  tool text not null,
  summary text not null,
  input jsonb not null default '{}'::jsonb,
  status text not null check (status in ('done', 'failed', 'pending', 'approved', 'rejected')),
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  decided_by uuid references public.staff_members (id) on delete set null,
  decided_at timestamptz
);

create index ai_agent_actions_agent_idx on public.ai_agent_actions (agent_id, created_at desc);
create index ai_agent_actions_pending_idx on public.ai_agent_actions (created_at desc) where status = 'pending';

alter table public.ai_agents enable row level security;
alter table public.ai_agent_actions enable row level security;

-- Admins see and manage every agent. Anyone else manages the agents that act for them.
create policy ai_agents_select on public.ai_agents for select to authenticated
  using (public.has_role('admin') or acts_for = public.current_staff_id());

-- A member may create an agent for themselves; only admins create bot teammates
-- or agents for someone else.
create policy ai_agents_insert on public.ai_agents for insert to authenticated
  with check (
    public.has_role('admin')
    or (public.has_role('member') and acts_for = public.current_staff_id())
  );

create policy ai_agents_update on public.ai_agents for update to authenticated
  using (public.has_role('admin') or acts_for = public.current_staff_id())
  with check (public.has_role('admin') or acts_for = public.current_staff_id());

create policy ai_agents_delete on public.ai_agents for delete to authenticated
  using (public.has_role('admin') or acts_for = public.current_staff_id());

create policy ai_agent_actions_select on public.ai_agent_actions for select to authenticated
  using (public.has_role('admin') or acting_for = public.current_staff_id());

grant select, insert, update, delete on public.ai_agents to authenticated;
grant select on public.ai_agent_actions to authenticated;
grant all on public.ai_agents, public.ai_agent_actions to service_role;

-- Rows are written by the server with the service key; people only decide on
-- pending ones through /api/agent/approve, which re-checks who they are.

-- Live updates for the agents page and the approval badge.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.ai_agents, public.ai_agent_actions;
  end if;
end;
$$;

create trigger ai_agents_audit
after insert or update or delete on public.ai_agents
for each row execute function public.audit_row();
