-- Operations: equipment inventory and per-booth orders (reserve → deliver →
-- collect), contractor build permits and clearance guarantees, guest travel,
-- team tasks, comments, notifications and file attachments.

create type public.equipment_category as enum (
  'furniture', 'av', 'appliance', 'cooling', 'electrical', 'lighting',
  'connectivity', 'signage', 'other'
);
create type public.equipment_stage as enum (
  'requested', 'reserved', 'prepared', 'delivered', 'collected', 'issue', 'cancelled'
);
create type public.guarantee_status as enum ('pending', 'received', 'released', 'forfeited');
create type public.task_status as enum ('todo', 'in_progress', 'blocked', 'done', 'cancelled');
create type public.task_priority as enum ('low', 'normal', 'high', 'urgent');

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  item_code text,
  name_fa text not null,
  name_en text,
  category public.equipment_category not null default 'other',
  unit_fa text not null default 'عدد',
  unit_en text not null default 'unit',
  returnable boolean not null default true,
  on_hand integer not null default 0 check (on_hand >= 0),
  low_stock_threshold integer not null default 0 check (low_stock_threshold >= 0),
  rental_rate bigint check (rental_rate >= 0),
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.equipment_orders (
  id uuid primary key default gen_random_uuid(),
  exhibition_id uuid not null references public.exhibitions (id) on delete cascade,
  booth_id uuid references public.booths (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  item_id uuid not null references public.inventory_items (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price bigint check (unit_price >= 0),
  stage public.equipment_stage not null default 'requested',
  delivered_qty integer not null default 0 check (delivered_qty >= 0),
  collected_qty integer not null default 0 check (collected_qty >= 0),
  damaged_qty integer not null default 0 check (damaged_qty >= 0),
  delivery_due_at timestamptz,
  pickup_due_at timestamptz,
  delivered_at timestamptz,
  collected_at timestamptz,
  handled_by uuid references public.staff_members (id) on delete set null,
  notes text,
  import_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (delivered_qty <= quantity),
  check (collected_qty + damaged_qty <= delivered_qty)
);

create index equipment_orders_booth_idx on public.equipment_orders (booth_id);
create index equipment_orders_exhibition_idx on public.equipment_orders (exhibition_id, stage);

-- Stamp hand-over times and keep exhibition/deal aligned with the booth.
create or replace function public.equipment_order_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.booth_id is not null then
    select b.exhibition_id, coalesce(new.deal_id, b.deal_id)
    into new.exhibition_id, new.deal_id
    from public.booths b
    where b.id = new.booth_id;
  end if;
  if new.stage = 'delivered' and new.delivered_at is null then
    new.delivered_at := now();
    if new.delivered_qty = 0 then new.delivered_qty := new.quantity; end if;
  end if;
  if new.stage = 'collected' and new.collected_at is null then
    new.collected_at := now();
    if new.collected_qty = 0 then new.collected_qty := new.delivered_qty - new.damaged_qty; end if;
  end if;
  return new;
end;
$$;

create trigger equipment_orders_before_write
before insert or update on public.equipment_orders
for each row execute function public.equipment_order_before_write();

-- Stock picture per exhibition: how much of each item is promised to booths.
create view public.inventory_allocation
with (security_invoker = true)
as
select
  i.id as item_id,
  e.id as exhibition_id,
  i.on_hand,
  coalesce(sum(o.quantity) filter (
    where o.stage in ('requested', 'reserved', 'prepared', 'delivered', 'issue')
  ), 0)::integer as allocated,
  (i.on_hand - coalesce(sum(o.quantity) filter (
    where o.stage in ('requested', 'reserved', 'prepared', 'delivered', 'issue')
  ), 0))::integer as available,
  coalesce(sum(o.delivered_qty - o.collected_qty - o.damaged_qty) filter (
    where o.stage <> 'cancelled' and i.returnable
  ), 0)::integer as awaiting_collection
from public.inventory_items i
cross join public.exhibitions e
left join public.equipment_orders o on o.item_id = i.id and o.exhibition_id = e.id
where i.archived_at is null
group by i.id, e.id;

-- Booth-builder (contractor) permits and the clearance guarantee they leave.
create table public.build_permits (
  id uuid primary key default gen_random_uuid(),
  exhibition_id uuid not null references public.exhibitions (id) on delete cascade,
  contractor_id uuid not null references public.companies (id) on delete restrict,
  deal_id uuid references public.deals (id) on delete set null,
  booth_codes text[] not null default '{}',
  built_area_m2 numeric(10, 2) check (built_area_m2 >= 0),
  permit_fee bigint check (permit_fee >= 0),
  permit_paid boolean not null default false,
  guarantee_amount bigint check (guarantee_amount >= 0),
  guarantee_method text,
  guarantee_status public.guarantee_status not null default 'pending',
  insurance_received boolean not null default false,
  documents_received boolean not null default false,
  equipment_paid boolean not null default false,
  notes text,
  import_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index build_permits_exhibition_idx on public.build_permits (exhibition_id);

create table public.guest_travel (
  id uuid primary key default gen_random_uuid(),
  exhibition_id uuid not null references public.exhibitions (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  full_name text not null,
  phone text,
  arrival_at timestamptz,
  arrival_flight text,
  departure_at timestamptz,
  departure_flight text,
  airline text,
  hotel text,
  notes text,
  import_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index guest_travel_exhibition_idx on public.guest_travel (exhibition_id, arrival_at);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  exhibition_id uuid references public.exhibitions (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'normal',
  assignee_id uuid references public.staff_members (id) on delete set null,
  created_by uuid references public.staff_members (id) on delete set null default public.current_staff_id(),
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  booth_id uuid references public.booths (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  company_id uuid references public.companies (id) on delete set null,
  checklist jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist) = 'array'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_assignee_idx on public.tasks (assignee_id, status, due_at);
create index tasks_exhibition_idx on public.tasks (exhibition_id, status);

create or replace function public.task_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'in_progress' and new.started_at is null then
    new.started_at := now();
  end if;
  if new.status = 'done' then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger tasks_before_write
before insert or update on public.tasks
for each row execute function public.task_before_write();

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  author_id uuid references public.staff_members (id) on delete set null default public.current_staff_id(),
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index task_comments_task_idx on public.task_comments (task_id, created_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.staff_members (id) on delete cascade,
  actor_id uuid references public.staff_members (id) on delete set null,
  kind text not null,
  title text not null,
  body text,
  link text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_inbox_idx on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx on public.notifications (recipient_id) where read_at is null;

create or replace function public.notify_task_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := public.current_staff_id();
begin
  if new.assignee_id is not null
     and new.assignee_id is distinct from actor
     and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id) then
    insert into public.notifications (recipient_id, actor_id, kind, title, body, entity_type, entity_id, link)
    values (new.assignee_id, actor, 'task.assigned', new.title, new.description, 'task', new.id, '/staff/tasks/' || new.id);
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status
     and new.created_by is not null and new.created_by is distinct from actor then
    insert into public.notifications (recipient_id, actor_id, kind, title, body, entity_type, entity_id, link)
    values (new.created_by, actor, 'task.status', new.title, new.status::text, 'task', new.id, '/staff/tasks/' || new.id);
  end if;
  return new;
end;
$$;

create trigger tasks_notify
after insert or update of assignee_id, status on public.tasks
for each row execute function public.notify_task_change();

create or replace function public.notify_task_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tasks;
begin
  select * into t from public.tasks where id = new.task_id;
  insert into public.notifications (recipient_id, actor_id, kind, title, body, entity_type, entity_id, link)
  select distinct r, new.author_id, 'task.comment', t.title, left(new.body, 280), 'task', t.id, '/staff/tasks/' || t.id
  from unnest(array[t.assignee_id, t.created_by]) as r
  where r is not null and r is distinct from new.author_id;
  return new;
end;
$$;

create trigger task_comments_notify
after insert on public.task_comments
for each row execute function public.notify_task_comment();

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  update public.notifications
  set read_at = now()
  where recipient_id = public.current_staff_id()
    and read_at is null
    and (p_ids is null or id = any (p_ids));
  get diagnostics changed = row_count;
  return changed;
end;
$$;

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  bucket text not null check (bucket in ('hall-plans', 'documents')),
  path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes >= 0),
  uploaded_by uuid references public.staff_members (id) on delete set null default public.current_staff_id(),
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

create index attachments_entity_idx on public.attachments (entity_type, entity_id);

create trigger inventory_items_touch before update on public.inventory_items
for each row execute function public.touch_updated_at();
create trigger equipment_orders_touch before update on public.equipment_orders
for each row execute function public.touch_updated_at();
create trigger build_permits_touch before update on public.build_permits
for each row execute function public.touch_updated_at();
create trigger guest_travel_touch before update on public.guest_travel
for each row execute function public.touch_updated_at();
create trigger tasks_touch before update on public.tasks
for each row execute function public.touch_updated_at();
create trigger task_comments_touch before update on public.task_comments
for each row execute function public.touch_updated_at();

create trigger inventory_items_audit after insert or update or delete on public.inventory_items
for each row execute function public.audit_row();
create trigger equipment_orders_audit after insert or update or delete on public.equipment_orders
for each row execute function public.audit_row();
create trigger build_permits_audit after insert or update or delete on public.build_permits
for each row execute function public.audit_row();
create trigger guest_travel_audit after insert or update or delete on public.guest_travel
for each row execute function public.audit_row();
create trigger tasks_audit after insert or update or delete on public.tasks
for each row execute function public.audit_row();
create trigger attachments_audit after insert or update or delete on public.attachments
for each row execute function public.audit_row();
