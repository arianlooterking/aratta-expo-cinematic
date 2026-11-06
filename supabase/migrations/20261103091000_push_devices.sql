-- Phones running the iOS / Android staff app, for push notifications.
--
-- The app registers its token after sign-in (register_push_device) and removes
-- it on sign-out. The `push` edge function (supabase/functions/push) reads this
-- table with the service role when a row is added to public.notifications.

create table public.push_devices (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff_members (id) on delete cascade,
  token text not null unique check (length(token) between 16 and 4096),
  platform text not null check (platform in ('ios', 'android')),
  app_version text check (app_version is null or length(app_version) <= 64),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index push_devices_staff_idx on public.push_devices (staff_id);

alter table public.push_devices enable row level security;

-- Staff can see and remove their own phones. Writes go through the functions
-- below, so a token always belongs to whoever signed in on that phone last.
revoke all on public.push_devices from anon, authenticated;
grant select, delete on public.push_devices to authenticated;

create policy push_devices_select on public.push_devices
  for select to authenticated using (staff_id = public.current_staff_id());
create policy push_devices_delete on public.push_devices
  for delete to authenticated using (staff_id = public.current_staff_id());

create or replace function public.register_push_device(
  p_token text,
  p_platform text,
  p_app_version text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := public.current_staff_id();
begin
  if me is null then
    raise exception 'not an active staff member' using errcode = '42501';
  end if;
  insert into public.push_devices (staff_id, token, platform, app_version)
  values (me, p_token, p_platform, p_app_version)
  on conflict (token) do update
    set staff_id = excluded.staff_id,
        platform = excluded.platform,
        app_version = excluded.app_version,
        last_seen_at = now();
end;
$$;

create or replace function public.unregister_push_device(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.push_devices
  where token = p_token and staff_id = public.current_staff_id();
end;
$$;

revoke execute on function public.register_push_device(text, text, text) from public, anon;
revoke execute on function public.unregister_push_device(text) from public, anon;
grant execute on function public.register_push_device(text, text, text) to authenticated;
grant execute on function public.unregister_push_device(text) to authenticated;
