-- Exhibitions, halls and the floor plan: booths plus non-booth plan features.
-- All geometry is stored in metres from the hall's top-left corner.

create type public.exhibition_status as enum (
  'planning', 'selling', 'build', 'live', 'strike', 'closed', 'archived'
);
create type public.booth_status as enum (
  'available', 'held', 'reserved', 'contracted', 'paid', 'blocked'
);
create type public.feature_kind as enum (
  'column', 'wall', 'door', 'entrance', 'loading', 'aisle', 'zone',
  'stage', 'service', 'utility', 'label'
);

create table public.exhibitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  name_fa text not null,
  name_en text,
  edition integer,
  year_label text,
  venue_fa text,
  venue_en text,
  city_fa text,
  city_en text,
  starts_on date,
  ends_on date,
  build_starts_on date,
  strike_ends_on date,
  status public.exhibition_status not null default 'planning',
  color text not null default '#c8a25a',
  currency public.currency_code not null default 'IRR',
  vat_rate numeric(5, 4) not null default 0.10 check (vat_rate >= 0 and vat_rate < 1),
  space_rate bigint check (space_rate >= 0),
  booth_build_rate bigint check (booth_build_rate >= 0),
  notes text,
  import_key text unique,
  created_by uuid references public.staff_members (id) on delete set null default public.current_staff_id(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.halls (
  id uuid primary key default gen_random_uuid(),
  exhibition_id uuid not null references public.exhibitions (id) on delete cascade,
  name_fa text not null,
  name_en text,
  width_m numeric(8, 2) not null check (width_m > 0),
  depth_m numeric(8, 2) not null check (depth_m > 0),
  grid_m numeric(5, 2) not null default 1 check (grid_m > 0),
  background_path text,
  background_opacity numeric(3, 2) not null default 0.35 check (background_opacity between 0 and 1),
  sort_order integer not null default 0,
  import_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index halls_exhibition_idx on public.halls (exhibition_id, sort_order);

create table public.hall_features (
  id uuid primary key default gen_random_uuid(),
  hall_id uuid not null references public.halls (id) on delete cascade,
  exhibition_id uuid not null references public.exhibitions (id) on delete cascade,
  kind public.feature_kind not null,
  label_fa text,
  label_en text,
  x numeric(8, 2) not null,
  y numeric(8, 2) not null,
  width numeric(8, 2) not null check (width > 0),
  depth numeric(8, 2) not null check (depth > 0),
  rotation numeric(6, 2) not null default 0,
  polygon jsonb,
  style jsonb not null default '{}'::jsonb,
  import_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index hall_features_hall_idx on public.hall_features (hall_id);

-- Booths are created here; the commercial link (deal_id) is added with the CRM
-- tables in the next migration.
create table public.booths (
  id uuid primary key default gen_random_uuid(),
  hall_id uuid not null references public.halls (id) on delete cascade,
  exhibition_id uuid not null references public.exhibitions (id) on delete cascade,
  code text not null check (length(trim(code)) > 0),
  x numeric(8, 2) not null,
  y numeric(8, 2) not null,
  width numeric(8, 2) not null check (width > 0),
  depth numeric(8, 2) not null check (depth > 0),
  rotation numeric(6, 2) not null default 0,
  polygon jsonb,
  area_m2 numeric(10, 2) not null default 0 check (area_m2 >= 0),
  area_is_manual boolean not null default false,
  open_sides smallint not null default 1 check (open_sides between 0 and 4),
  zone text,
  status public.booth_status not null default 'available',
  price_override bigint check (price_override >= 0),
  notes text,
  import_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hall_id, code)
);

create index booths_exhibition_idx on public.booths (exhibition_id, status);

-- Keep the denormalised exhibition_id in sync with the hall and derive area
-- from the footprint unless someone typed an exact contract area.
create or replace function public.booth_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select h.exhibition_id into new.exhibition_id from public.halls h where h.id = new.hall_id;
  if not new.area_is_manual then
    new.area_m2 := round(new.width * new.depth, 2);
  end if;
  new.code := trim(new.code);
  return new;
end;
$$;

create trigger booths_before_write
before insert or update on public.booths
for each row execute function public.booth_before_write();

create or replace function public.feature_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select h.exhibition_id into new.exhibition_id from public.halls h where h.id = new.hall_id;
  return new;
end;
$$;

create trigger hall_features_before_write
before insert or update on public.hall_features
for each row execute function public.feature_before_write();

create trigger exhibitions_touch before update on public.exhibitions
for each row execute function public.touch_updated_at();
create trigger halls_touch before update on public.halls
for each row execute function public.touch_updated_at();
create trigger hall_features_touch before update on public.hall_features
for each row execute function public.touch_updated_at();
create trigger booths_touch before update on public.booths
for each row execute function public.touch_updated_at();

create trigger exhibitions_audit after insert or update or delete on public.exhibitions
for each row execute function public.audit_row();
create trigger halls_audit after insert or update or delete on public.halls
for each row execute function public.audit_row();
create trigger hall_features_audit after insert or update or delete on public.hall_features
for each row execute function public.audit_row();
create trigger booths_audit after insert or update or delete on public.booths
for each row execute function public.audit_row();
