-- Companies, contacts, the sales pipeline (one deal per company per
-- exhibition), activity history, proforma/final invoices and payments.

create type public.company_kind as enum ('exhibitor', 'contractor', 'supplier', 'sponsor', 'partner');
create type public.deal_stage as enum (
  'lead', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'
);
create type public.activity_kind as enum (
  'call', 'sms', 'email', 'meeting', 'message', 'visit', 'note', 'system'
);
create type public.service_kind as enum (
  'space', 'booth_build', 'flooring', 'partition', 'equipment', 'sponsorship', 'other'
);
create type public.invoice_kind as enum ('proforma', 'final');
-- registered = submitted to the national tax system (ارسال سامانه)
create type public.invoice_status as enum ('draft', 'issued', 'registered', 'cancelled');
create type public.payment_method as enum ('bank_transfer', 'pos', 'cash', 'cheque', 'other');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  kind public.company_kind not null default 'exhibitor',
  name_fa text not null check (length(trim(name_fa)) > 0),
  name_en text,
  legal_name text,
  national_id text,
  economic_code text,
  sector text,
  city text,
  address text,
  website text,
  phone text,
  email text,
  owner_id uuid references public.staff_members (id) on delete set null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'strategic')),
  tags text[] not null default '{}',
  notes text,
  import_key text unique,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index companies_name_idx on public.companies (lower(name_fa));
create index companies_kind_idx on public.companies (kind) where archived_at is null;

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  full_name text not null,
  job_title text,
  phone text,
  phone_alt text,
  email text,
  is_primary boolean not null default false,
  notes text,
  import_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contacts_company_idx on public.contacts (company_id);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  exhibition_id uuid not null references public.exhibitions (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  owner_id uuid references public.staff_members (id) on delete set null,
  stage public.deal_stage not null default 'lead',
  source text,
  expected_area_m2 numeric(10, 2) check (expected_area_m2 >= 0),
  probability smallint check (probability between 0 and 100),
  estimated_value bigint check (estimated_value >= 0),
  next_follow_up_at timestamptz,
  last_contact_at timestamptz,
  lost_reason text,
  sponsorship_tier text,
  notes text,
  stage_changed_at timestamptz not null default now(),
  won_at timestamptz,
  import_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exhibition_id, company_id)
);

create index deals_pipeline_idx on public.deals (exhibition_id, stage);
create index deals_owner_follow_up_idx on public.deals (owner_id, next_follow_up_at)
  where stage not in ('won', 'lost');

alter table public.booths
  add column deal_id uuid references public.deals (id) on delete set null;
create index booths_deal_idx on public.booths (deal_id);

-- Assigning a deal reserves a free booth; clearing it frees a sold booth.
create or replace function public.booth_sync_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deal_id is not null and new.status in ('available', 'held') then
    new.status := 'reserved';
  elsif new.deal_id is null and new.status in ('reserved', 'contracted', 'paid') then
    new.status := 'available';
  end if;
  return new;
end;
$$;

create trigger booths_sync_status
before insert or update of deal_id, status on public.booths
for each row execute function public.booth_sync_status();

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  kind public.activity_kind not null,
  summary text not null,
  body text,
  outcome text,
  occurred_at timestamptz not null default now(),
  next_follow_up_at timestamptz,
  author_id uuid references public.staff_members (id) on delete set null default public.current_staff_id(),
  import_key text unique,
  created_at timestamptz not null default now()
);

create index activities_company_idx on public.activities (company_id, occurred_at desc);
create index activities_deal_idx on public.activities (deal_id, occurred_at desc);

-- Logging a conversation moves the deal's "last contact" and optional next
-- follow-up forward, so the pipeline always shows who needs a call today.
create or replace function public.activity_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.deal_id is not null and new.kind <> 'system' then
    update public.deals
    set last_contact_at = greatest(coalesce(last_contact_at, new.occurred_at), new.occurred_at),
        next_follow_up_at = coalesce(new.next_follow_up_at, next_follow_up_at),
        stage = case when stage = 'lead' then 'contacted'::public.deal_stage else stage end
    where id = new.deal_id;
  end if;
  return new;
end;
$$;

create trigger activities_after_insert
after insert on public.activities
for each row execute function public.activity_after_insert();

create or replace function public.deal_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.stage is distinct from old.stage then
    new.stage_changed_at := now();
    if new.stage = 'won' then
      new.won_at := coalesce(new.won_at, now());
    end if;
  end if;
  return new;
end;
$$;

create trigger deals_before_update
before update on public.deals
for each row execute function public.deal_before_update();

create or replace function public.deal_after_stage_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.activities (company_id, deal_id, kind, summary)
  values (new.company_id, new.id, 'system', format('stage:%s→%s', old.stage, new.stage));
  return new;
end;
$$;

create trigger deals_after_stage_change
after update of stage on public.deals
for each row
when (old.stage is distinct from new.stage)
execute function public.deal_after_stage_change();

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  exhibition_id uuid not null references public.exhibitions (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete restrict,
  deal_id uuid references public.deals (id) on delete set null,
  kind public.invoice_kind not null default 'proforma',
  number text,
  status public.invoice_status not null default 'draft',
  official boolean not null default true,
  issued_on date,
  due_on date,
  currency public.currency_code not null default 'IRR',
  vat_rate numeric(5, 4) not null default 0.10 check (vat_rate >= 0 and vat_rate < 1),
  notes text,
  import_key text unique,
  created_by uuid references public.staff_members (id) on delete set null default public.current_staff_id(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index invoices_number_key on public.invoices (exhibition_id, number) where number is not null;
create index invoices_company_idx on public.invoices (company_id);
create index invoices_deal_idx on public.invoices (deal_id);

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  service public.service_kind not null,
  description text,
  booth_id uuid references public.booths (id) on delete set null,
  quantity numeric(12, 2) not null default 1 check (quantity > 0),
  unit text not null default 'unit' check (unit in ('m2', 'unit', 'day', 'set', 'lump')),
  unit_price bigint not null check (unit_price >= 0),
  discount bigint not null default 0 check (discount >= 0),
  sort_order integer not null default 0,
  import_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index invoice_lines_invoice_idx on public.invoice_lines (invoice_id, sort_order);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  deal_id uuid references public.deals (id) on delete set null,
  invoice_id uuid references public.invoices (id) on delete set null,
  amount bigint not null check (amount > 0),
  currency public.currency_code not null default 'IRR',
  paid_on date not null default current_date,
  method public.payment_method not null default 'bank_transfer',
  reference text,
  notes text,
  recorded_by uuid references public.staff_members (id) on delete set null default public.current_staff_id(),
  voided_at timestamptz,
  void_reason text,
  import_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((voided_at is null) = (void_reason is null))
);

create index payments_invoice_idx on public.payments (invoice_id) where voided_at is null;
create index payments_deal_idx on public.payments (deal_id) where voided_at is null;

create view public.invoice_totals
with (security_invoker = true)
as
select
  i.id as invoice_id,
  i.exhibition_id,
  i.company_id,
  i.deal_id,
  i.currency,
  coalesce(l.subtotal, 0)::bigint as subtotal,
  round(coalesce(l.subtotal, 0) * i.vat_rate)::bigint as vat,
  (coalesce(l.subtotal, 0) + round(coalesce(l.subtotal, 0) * i.vat_rate))::bigint as total,
  coalesce(p.paid, 0)::bigint as paid,
  (coalesce(l.subtotal, 0) + round(coalesce(l.subtotal, 0) * i.vat_rate) - coalesce(p.paid, 0))::bigint as balance
from public.invoices i
left join lateral (
  select sum(round(il.quantity * il.unit_price) - il.discount) as subtotal
  from public.invoice_lines il
  where il.invoice_id = i.id
) l on true
left join lateral (
  select sum(pm.amount) as paid
  from public.payments pm
  where pm.invoice_id = i.id and pm.voided_at is null
) p on true
where i.status <> 'cancelled';

-- One row per deal: what was invoiced, what came in, what is still owed.
create view public.deal_balances
with (security_invoker = true)
as
select
  d.id as deal_id,
  d.exhibition_id,
  d.company_id,
  coalesce(sum(t.total), 0)::bigint as invoiced,
  coalesce((
    select sum(pm.amount) from public.payments pm
    where pm.deal_id = d.id and pm.voided_at is null
  ), 0)::bigint as paid,
  (coalesce(sum(t.total), 0) - coalesce((
    select sum(pm.amount) from public.payments pm
    where pm.deal_id = d.id and pm.voided_at is null
  ), 0))::bigint as balance
from public.deals d
left join public.invoice_totals t on t.deal_id = d.id
group by d.id;

-- Payments recorded against an invoice inherit its deal and company.
create or replace function public.payment_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.invoice_id is not null then
    select i.company_id, coalesce(new.deal_id, i.deal_id), i.currency
    into new.company_id, new.deal_id, new.currency
    from public.invoices i
    where i.id = new.invoice_id;
  end if;
  return new;
end;
$$;

create trigger payments_before_write
before insert or update of invoice_id on public.payments
for each row execute function public.payment_before_write();

create trigger companies_touch before update on public.companies
for each row execute function public.touch_updated_at();
create trigger contacts_touch before update on public.contacts
for each row execute function public.touch_updated_at();
create trigger deals_touch before update on public.deals
for each row execute function public.touch_updated_at();
create trigger invoices_touch before update on public.invoices
for each row execute function public.touch_updated_at();
create trigger invoice_lines_touch before update on public.invoice_lines
for each row execute function public.touch_updated_at();
create trigger payments_touch before update on public.payments
for each row execute function public.touch_updated_at();

create trigger companies_audit after insert or update or delete on public.companies
for each row execute function public.audit_row();
create trigger contacts_audit after insert or update or delete on public.contacts
for each row execute function public.audit_row();
create trigger deals_audit after insert or update or delete on public.deals
for each row execute function public.audit_row();
create trigger activities_audit after insert or update or delete on public.activities
for each row execute function public.audit_row();
create trigger invoices_audit after insert or update or delete on public.invoices
for each row execute function public.audit_row();
create trigger invoice_lines_audit after insert or update or delete on public.invoice_lines
for each row execute function public.audit_row();
create trigger payments_audit after insert or update or delete on public.payments
for each row execute function public.audit_row();
