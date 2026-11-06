-- Teams (sales, finance, handover crew...), fuller staff profiles, and live
-- updates for the team screens.

-- ---------------------------------------------------------------------------
-- Profile details
-- ---------------------------------------------------------------------------
alter table public.staff_members
  add column bio text,
  add column start_date date,
  add column skills text[] not null default '{}';

-- Once someone has signed in, their email is tied to their Google / Apple
-- account. Changing it would leave the link pointing at the old address.
create or replace function public.guard_staff_email()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.email is distinct from old.email and old.user_id is not null then
    raise exception 'The email of a signed-in colleague cannot be changed';
  end if;
  new.email := lower(trim(new.email));
  new.skills := coalesce(
    (select array_agg(distinct trim(s)) from unnest(new.skills) as s where trim(s) <> ''),
    '{}'
  );
  return new;
end;
$$;

create trigger staff_members_email_guard
before insert or update on public.staff_members
for each row execute function public.guard_staff_email();

revoke execute on function public.guard_staff_email() from public, authenticated;

-- Self-service profile edits. A null argument keeps the current value; an
-- empty string clears it (the name can never be cleared).
drop function if exists public.update_my_profile(text, text, text, text);

create or replace function public.update_my_profile(
  p_display_name text default null,
  p_job_title text default null,
  p_phone text default null,
  p_locale text default null,
  p_bio text default null,
  p_skills text[] default null
)
returns public.staff_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.staff_members;
begin
  update public.staff_members
  set display_name = coalesce(nullif(trim(p_display_name), ''), display_name),
      job_title = case when p_job_title is null then job_title else nullif(trim(p_job_title), '') end,
      phone = case when p_phone is null then phone else nullif(trim(p_phone), '') end,
      locale = coalesce(p_locale, locale),
      bio = case when p_bio is null then bio else nullif(trim(p_bio), '') end,
      skills = coalesce(p_skills, skills),
      last_seen_at = now()
  where user_id = auth.uid() and status = 'active'
  returning * into result;

  if result.id is null then
    raise exception 'No active staff profile for this account';
  end if;
  return result;
end;
$$;

revoke execute on function public.update_my_profile(text, text, text, text, text, text[]) from public;
grant execute on function public.update_my_profile(text, text, text, text, text, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Teams. A team groups colleagues (for example "Sales" or "Hall 2 handover
-- crew"). It can be permanent or belong to one exhibition.
-- ---------------------------------------------------------------------------
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name_fa text not null check (length(trim(name_fa)) > 0),
  name_en text,
  description text,
  color text not null default '#0e5d4c' check (color ~ '^#[0-9a-fA-F]{6}$'),
  lead_id uuid references public.staff_members (id) on delete set null,
  member_ids uuid[] not null default '{}',
  exhibition_id uuid references public.exhibitions (id) on delete cascade,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_by uuid references public.staff_members (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index teams_member_ids_idx on public.teams using gin (member_ids);
create index teams_exhibition_idx on public.teams (exhibition_id);

create trigger teams_touch
before update on public.teams
for each row execute function public.touch_updated_at();

-- Members are checked against the staff list; the lead is always a member
-- and listed first.
create or replace function public.team_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name_fa := trim(new.name_fa);
  new.member_ids := public.staff_ids_clean(new.member_ids);
  if new.lead_id is not null then
    new.member_ids := array[new.lead_id] || array_remove(new.member_ids, new.lead_id);
  end if;
  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by := public.current_staff_id();
  end if;
  return new;
end;
$$;

create trigger teams_before_write
before insert or update on public.teams
for each row execute function public.team_before_write();

revoke execute on function public.team_before_write() from public, authenticated;

-- Removing someone's access takes them off every team.
create or replace function public.staff_leave_teams()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.teams
  set member_ids = array_remove(member_ids, old.id)
  where old.id = any (member_ids);
  return old;
end;
$$;

create trigger staff_members_leave_teams
before delete on public.staff_members
for each row execute function public.staff_leave_teams();

revoke execute on function public.staff_leave_teams() from public, authenticated;

create trigger teams_audit
after insert or update or delete on public.teams
for each row execute function public.audit_row();

-- Everyone on staff sees the teams. Managers shape them; a team's lead can
-- change who is on their own team but cannot hand the team to someone else.
alter table public.teams enable row level security;
grant select, insert, update, delete on public.teams to authenticated;

create policy teams_select on public.teams
  for select to authenticated using (public.is_staff());
create policy teams_insert on public.teams
  for insert to authenticated with check (public.has_role('manager'));
create policy teams_update on public.teams
  for update to authenticated
  using (public.has_role('manager') or (public.has_role('member') and lead_id = public.current_staff_id()))
  with check (public.has_role('manager') or (public.has_role('member') and lead_id = public.current_staff_id()));
create policy teams_delete on public.teams
  for delete to authenticated using (public.has_role('manager'));

-- Live updates for the team screens.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.teams, public.staff_members;
  end if;
end;
$$;
