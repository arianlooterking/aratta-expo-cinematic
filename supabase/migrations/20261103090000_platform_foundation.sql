-- Aratta Expo platform foundation: staff identity, roles, shared helpers, audit trail.
-- Every later migration builds on the helpers defined here.

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
create type public.staff_role as enum ('owner', 'admin', 'manager', 'member', 'viewer');
create type public.staff_status as enum ('invited', 'active', 'suspended');
create type public.department as enum (
  'executive', 'sales', 'operations', 'finance', 'logistics', 'marketing'
);
create type public.currency_code as enum ('IRR', 'IRT', 'USD', 'EUR', 'AED');

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff members. A row is created by an admin (an invite) before the person
-- ever signs in. Google / Apple sign-in links the auth user by verified email.
-- ---------------------------------------------------------------------------
create table public.staff_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  email text not null check (position('@' in email) > 1),
  display_name text,
  job_title text,
  role public.staff_role not null default 'member',
  departments public.department[] not null default '{}',
  status public.staff_status not null default 'invited',
  phone text,
  avatar_url text,
  locale text not null default 'fa' check (locale in ('fa', 'en')),
  invited_by uuid references public.staff_members (id) on delete set null,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index staff_members_email_key on public.staff_members (lower(email));

create trigger staff_members_touch
before update on public.staff_members
for each row execute function public.touch_updated_at();

create or replace function public.role_rank(r public.staff_role)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case r
    when 'owner' then 5
    when 'admin' then 4
    when 'manager' then 3
    when 'member' then 2
    when 'viewer' then 1
  end;
$$;

-- The active staff row for the signed-in user, or null.
create or replace function public.current_staff_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id
  from public.staff_members
  where user_id = auth.uid() and status = 'active'
  limit 1;
$$;

create or replace function public.has_role(minimum public.staff_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_members
    where user_id = auth.uid()
      and status = 'active'
      and public.role_rank(role) >= public.role_rank(minimum)
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('viewer');
$$;

create or replace function public.in_department(dept public.department)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_members
    where user_id = auth.uid()
      and status = 'active'
      and dept = any (departments)
  );
$$;

-- Finance records: managers and above, or members working in sales/finance.
create or replace function public.can_manage_finance()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('manager')
    or (public.has_role('member') and (public.in_department('finance') or public.in_department('sales')));
$$;

-- Link a Google / Apple account to its invite when the provider has verified
-- the email address. Unverified or uninvited accounts get no staff access.
create or replace function public.link_staff_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or new.email_confirmed_at is null then
    return new;
  end if;

  update public.staff_members s
  set user_id = new.id,
      status = case when s.status = 'invited' then 'active'::public.staff_status else s.status end,
      display_name = coalesce(
        s.display_name,
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'name'
      ),
      avatar_url = coalesce(s.avatar_url, new.raw_user_meta_data ->> 'avatar_url')
  where lower(s.email) = lower(new.email)
    and s.user_id is null;

  return new;
end;
$$;

create trigger on_auth_user_link_staff
after insert or update of email, email_confirmed_at on auth.users
for each row execute function public.link_staff_account();

-- Protect role changes: nobody edits their own role/status, only owners touch
-- owner rows, and the last active owner cannot be removed or demoted.
create or replace function public.guard_staff_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.staff_members;
  remaining_owners integer;
begin
  -- Service role, migrations and the auth linking trigger run without a user.
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  select * into actor
  from public.staff_members
  where user_id = auth.uid() and status = 'active';

  if tg_op = 'INSERT' then
    if new.role = 'owner' and actor.role is distinct from 'owner' then
      raise exception 'Only an owner can grant owner access';
    end if;
    return new;
  end if;

  if old.id = actor.id then
    if tg_op = 'DELETE' then
      raise exception 'You cannot remove your own staff access';
    end if;
    if new.role <> old.role or new.status <> old.status then
      raise exception 'You cannot change your own role or status';
    end if;
  end if;

  if old.role = 'owner' and actor.role is distinct from 'owner' then
    raise exception 'Only an owner can change another owner';
  end if;

  if tg_op = 'UPDATE' and new.role = 'owner' and old.role <> 'owner' and actor.role is distinct from 'owner' then
    raise exception 'Only an owner can grant owner access';
  end if;

  if old.role = 'owner' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'owner' or new.status <> 'active') then
    select count(*) into remaining_owners
    from public.staff_members
    where role = 'owner' and status = 'active' and id <> old.id;
    if remaining_owners = 0 then
      raise exception 'At least one active owner is required';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger staff_members_guard
before insert or update or delete on public.staff_members
for each row execute function public.guard_staff_change();

-- Self-service profile edits that do not touch role or status.
create or replace function public.update_my_profile(
  p_display_name text default null,
  p_job_title text default null,
  p_phone text default null,
  p_locale text default null
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
      job_title = coalesce(p_job_title, job_title),
      phone = coalesce(p_phone, phone),
      locale = coalesce(p_locale, locale),
      last_seen_at = now()
  where user_id = auth.uid() and status = 'active'
  returning * into result;

  if result.id is null then
    raise exception 'No active staff profile for this account';
  end if;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Audit trail. Written only by triggers; readable by managers and above.
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  table_name text not null,
  row_id uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  actor_id uuid references public.staff_members (id) on delete set null,
  actor_user_id uuid,
  changes jsonb not null default '{}'::jsonb
);

create index audit_log_row_idx on public.audit_log (table_name, row_id, occurred_at desc);
create index audit_log_time_idx on public.audit_log (occurred_at desc);

create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_changes jsonb;
  v_row uuid;
begin
  if tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_row := (v_old ->> 'id')::uuid;
    v_changes := v_old;
  elsif tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_row := (v_new ->> 'id')::uuid;
    v_changes := v_new;
  else
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_row := (v_new ->> 'id')::uuid;
    select jsonb_object_agg(key, jsonb_build_object('from', v_old -> key, 'to', value))
    into v_changes
    from jsonb_each(v_new)
    where key <> 'updated_at' and (v_old -> key) is distinct from value;
    if v_changes is null then
      return new;
    end if;
  end if;

  insert into public.audit_log (table_name, row_id, action, actor_id, actor_user_id, changes)
  values (tg_table_name, v_row, lower(tg_op), public.current_staff_id(), auth.uid(), v_changes);

  return coalesce(new, old);
end;
$$;

create trigger staff_members_audit
after insert or update or delete on public.staff_members
for each row execute function public.audit_row();
