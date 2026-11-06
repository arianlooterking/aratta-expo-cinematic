-- Booth workflow: what each company wants for its booth, the steps every booth
-- goes through on site, and a one-tap "problem" flag that turns a booth red
-- until someone sorts it out.

-- What sales agreed with the company about furniture. The item lines
-- themselves are equipment_orders with this deal_id; until the company has a
-- booth on the plan they wait with booth_id null.
alter table public.deals
  add column furniture_notes text,
  add column furniture_confirmed_at timestamptz,
  add column furniture_confirmed_by uuid references public.staff_members (id) on delete set null;

-- Steps a person ticks on the floor: { "build": { "at": "...", "by": "<staff id>" }, ... }.
-- Known keys: build (stand built, floor and walls up), power (electricity on),
-- handover (exhibitor took the booth), clearance (booth empty and clean).
-- Furniture delivery and collection come from the equipment lines.
alter table public.booths
  add column steps jsonb not null default '{}'::jsonb check (jsonb_typeof(steps) = 'object');

-- When a company gets a booth, its waiting furniture lines move onto it.
-- When the booth goes to someone else, lines that never went out go back to
-- the company, so nothing is lost and nobody delivers to the wrong stand.
create or replace function public.booth_carry_furniture()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.deal_id is not null and old.deal_id is distinct from new.deal_id then
    update public.equipment_orders
    set booth_id = null
    where booth_id = new.id and deal_id = old.deal_id and delivered_qty = 0
      and stage not in ('collected', 'cancelled');
  end if;
  if new.deal_id is not null and new.deal_id is distinct from old.deal_id then
    update public.equipment_orders
    set booth_id = new.id
    where deal_id = new.deal_id and booth_id is null and exhibition_id = new.exhibition_id;
  end if;
  return new;
end;
$$;

create trigger booths_carry_furniture
after update of deal_id on public.booths
for each row execute function public.booth_carry_furniture();

create type public.problem_step as enum (
  'furniture_list', 'build', 'power', 'delivery', 'handover', 'collection',
  'clearance', 'payment', 'other'
);

create table public.problems (
  id uuid primary key default gen_random_uuid(),
  exhibition_id uuid not null references public.exhibitions (id) on delete cascade,
  booth_id uuid references public.booths (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete cascade,
  order_id uuid references public.equipment_orders (id) on delete set null,
  step public.problem_step not null default 'other',
  -- Optional: a tap alone is enough to raise one.
  note text,
  raised_by uuid references public.staff_members (id) on delete set null default public.current_staff_id(),
  raised_at timestamptz not null default now(),
  assignee_id uuid references public.staff_members (id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references public.staff_members (id) on delete set null,
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index problems_open_idx on public.problems (exhibition_id) where resolved_at is null;
create index problems_booth_idx on public.problems (booth_id);
create index problems_deal_idx on public.problems (deal_id);

-- Fill in where the problem is from whatever was given (a line, a booth or a
-- deal) and stamp who sorted it out.
create or replace function public.problem_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.order_id is not null and new.booth_id is null then
    select o.booth_id, coalesce(new.deal_id, o.deal_id), o.exhibition_id
    into new.booth_id, new.deal_id, new.exhibition_id
    from public.equipment_orders o where o.id = new.order_id;
  end if;
  if new.booth_id is not null then
    select b.exhibition_id, coalesce(new.deal_id, b.deal_id)
    into new.exhibition_id, new.deal_id
    from public.booths b where b.id = new.booth_id;
  elsif new.deal_id is not null then
    select d.exhibition_id into new.exhibition_id from public.deals d where d.id = new.deal_id;
  end if;
  new.note := nullif(trim(new.note), '');
  new.resolution := nullif(trim(new.resolution), '');
  if new.resolved_at is not null and (tg_op = 'INSERT' or old.resolved_at is null) then
    new.resolved_by := coalesce(new.resolved_by, public.current_staff_id());
  elsif new.resolved_at is null then
    new.resolved_by := null;
    new.resolution := null;
  end if;
  return new;
end;
$$;

create trigger problems_before_write
before insert or update on public.problems
for each row execute function public.problem_before_write();

-- Tell the people who can fix it: the booth's managers, the salesperson on
-- the deal and anyone it was handed to. Tell whoever raised it once it's fixed.
create or replace function public.notify_problem()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := public.current_staff_id();
  booth_code text;
  title text;
  link text;
begin
  select b.code into booth_code from public.booths b where b.id = new.booth_id;
  title := coalesce('مشکل در غرفه ' || booth_code, 'مشکل ثبت شد');
  link := case when new.booth_id is not null then '/staff/map?booth=' || new.booth_id else '/staff/problems' end;

  if tg_op = 'INSERT' and new.resolved_at is null then
    insert into public.notifications (recipient_id, actor_id, kind, title, body, entity_type, entity_id, link)
    select distinct r, actor, 'problem.raised', title, coalesce(new.note, new.step::text), 'problem', new.id, link
    from (
      select unnest(b.manager_ids) as r from public.booths b where b.id = new.booth_id
      union all select d.owner_id from public.deals d where d.id = new.deal_id
      union all select new.assignee_id
    ) people
    where r is not null and r is distinct from actor;
  elsif tg_op = 'UPDATE' and new.assignee_id is not null and new.assignee_id is distinct from old.assignee_id
        and new.assignee_id is distinct from actor and new.resolved_at is null then
    insert into public.notifications (recipient_id, actor_id, kind, title, body, entity_type, entity_id, link)
    values (new.assignee_id, actor, 'problem.assigned', title, coalesce(new.note, new.step::text), 'problem', new.id, link);
  end if;

  if tg_op = 'UPDATE' and new.resolved_at is not null and old.resolved_at is null
     and new.raised_by is not null and new.raised_by is distinct from actor then
    insert into public.notifications (recipient_id, actor_id, kind, title, body, entity_type, entity_id, link)
    values (new.raised_by, actor, 'problem.resolved', title, new.resolution, 'problem', new.id, link);
  end if;
  return new;
end;
$$;

create trigger problems_notify
after insert or update of resolved_at, assignee_id on public.problems
for each row execute function public.notify_problem();

revoke execute on function public.notify_problem() from public, authenticated;
revoke execute on function public.problem_before_write() from public, authenticated;
revoke execute on function public.booth_carry_furniture() from public, authenticated;

create trigger problems_touch before update on public.problems
for each row execute function public.touch_updated_at();
create trigger problems_audit after insert or update or delete on public.problems
for each row execute function public.audit_row();

-- Anyone on the team can see problems; members raise and resolve them.
alter table public.problems enable row level security;
create policy problems_select on public.problems
  for select to authenticated using (public.is_staff());
create policy problems_insert on public.problems
  for insert to authenticated with check (public.has_role('member'));
create policy problems_update on public.problems
  for update to authenticated using (public.has_role('member')) with check (public.has_role('member'));
create policy problems_delete on public.problems
  for delete to authenticated
  using (raised_by = public.current_staff_id() or public.has_role('manager'));
grant select, insert, update, delete on public.problems to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.problems;
  end if;
end;
$$;
