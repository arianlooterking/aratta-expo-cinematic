-- The public calendar view shows only listed exhibitions, only safe columns,
-- and the anon role still cannot read the exhibitions table itself.
begin;

insert into public.exhibitions (slug, name_fa, status, website_listed, registration_open, notes, space_rate)
values
  ('listed-show', 'نمایشگاه منتشرشده', 'selling', true, true, 'staff only note', 1000),
  ('hidden-show', 'نمایشگاه داخلی', 'planning', false, false, null, null),
  ('old-show', 'نمایشگاه قدیمی', 'archived', true, false, null, null);

set local role anon;

do $$
declare n int;
begin
  select count(*) into n from public.website_exhibitions;
  if n <> 1 then raise exception 'expected 1 listed exhibition, got %', n; end if;
  if not exists (select 1 from public.website_exhibitions where slug = 'listed-show' and registration_open) then
    raise exception 'listed exhibition missing';
  end if;
end $$;

do $$
begin
  begin
    perform 1 from public.exhibitions;
  exception when insufficient_privilege then
    return;
  end;
  raise exception 'anon must not read exhibitions directly';
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'website_exhibitions'
      and column_name in ('notes', 'space_rate', 'booth_build_rate', 'created_by')
  ) then
    raise exception 'website view exposes a private column';
  end if;
end $$;

do $$
begin
  begin
    insert into public.website_exhibitions (slug, name_fa) values ('x', 'x');
  exception when insufficient_privilege or object_not_in_prerequisite_state or feature_not_supported then
    return;
  end;
  raise exception 'anon must not write through the view';
end $$;

reset role;
rollback;
