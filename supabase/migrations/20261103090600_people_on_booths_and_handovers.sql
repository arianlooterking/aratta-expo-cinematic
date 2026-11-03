-- Who looks after each booth, who handed furniture over or took it back,
-- and a picture for every staff member.

alter table public.booths
  add column manager_ids uuid[] not null default '{}';

alter table public.equipment_orders
  add column delivered_by uuid[] not null default '{}',
  add column collected_by uuid[] not null default '{}';

create index booths_manager_ids_idx on public.booths using gin (manager_ids);

-- Arrays cannot carry foreign keys, so check every id against the staff list
-- and drop duplicates. Removing a staff member keeps old records readable;
-- the UI shows them as a former colleague.
create or replace function public.staff_ids_clean(p_ids uuid[])
returns uuid[]
language plpgsql
stable
set search_path = ''
as $$
declare
  cleaned uuid[];
begin
  if p_ids is null then
    return '{}';
  end if;
  -- Keep the order people were added in (the first is the lead), without repeats.
  select coalesce(array_agg(x order by ord), '{}') into cleaned
  from (
    select distinct on (x) x, ord
    from unnest(p_ids) with ordinality as t(x, ord)
    where x is not null
    order by x, ord
  ) firsts;
  if exists (
    select 1 from unnest(cleaned) as x
    where not exists (select 1 from public.staff_members s where s.id = x)
  ) then
    raise exception 'Unknown staff member in list' using errcode = 'foreign_key_violation';
  end if;
  return cleaned;
end;
$$;

create or replace function public.booth_people_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.manager_ids is distinct from old.manager_ids then
    new.manager_ids := public.staff_ids_clean(new.manager_ids);
  end if;
  return new;
end;
$$;

create trigger booths_people_before_write
before insert or update on public.booths
for each row execute function public.booth_people_before_write();

-- A delivery or collection with nobody named is credited to whoever saved it.
create or replace function public.equipment_people_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  me uuid := public.current_staff_id();
begin
  if tg_op = 'INSERT' or new.delivered_by is distinct from old.delivered_by then
    new.delivered_by := public.staff_ids_clean(new.delivered_by);
  end if;
  if tg_op = 'INSERT' or new.collected_by is distinct from old.collected_by then
    new.collected_by := public.staff_ids_clean(new.collected_by);
  end if;
  if new.stage = 'delivered' and (tg_op = 'INSERT' or old.stage is distinct from 'delivered')
     and cardinality(new.delivered_by) = 0 and me is not null then
    new.delivered_by := array[me];
  end if;
  if new.stage = 'collected' and (tg_op = 'INSERT' or old.stage is distinct from 'collected')
     and cardinality(new.collected_by) = 0 and me is not null then
    new.collected_by := array[me];
  end if;
  if new.handled_by is null and me is not null and new.stage in ('delivered', 'collected') then
    new.handled_by := me;
  end if;
  return new;
end;
$$;

create trigger equipment_orders_people_before_write
before insert or update on public.equipment_orders
for each row execute function public.equipment_people_before_write();

revoke execute on function public.booth_people_before_write() from public, authenticated;
revoke execute on function public.equipment_people_before_write() from public, authenticated;

-- Staff choose their own picture: one of the built-in illustrations
-- ("preset:<n>") or, once uploads are on, a file in the avatars folder.
create or replace function public.set_my_avatar(p_avatar text)
returns public.staff_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.staff_members;
begin
  if p_avatar is not null and p_avatar !~ '^(preset:[0-9]{1,2}|avatars/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,80})$' then
    raise exception 'Choose one of the avatars or upload a photo';
  end if;
  update public.staff_members
  set avatar_url = p_avatar, last_seen_at = now()
  where user_id = auth.uid() and status = 'active'
  returning * into result;
  if result.id is null then
    raise exception 'No active staff profile for this account';
  end if;
  return result;
end;
$$;

revoke execute on function public.set_my_avatar(text) from public;
grant execute on function public.set_my_avatar(text) to authenticated;
