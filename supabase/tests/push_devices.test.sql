-- Access-control and workflow tests. Runs as one transaction and rolls back.
-- Each "as_user" switch mimics a signed-in Supabase request.
begin;

create schema test_helpers;

create or replace function test_helpers.as_user(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  execute 'set local role authenticated';
end;
$$;

create or replace function test_helpers.as_service() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
end;
$$;

create or replace function test_helpers.expect_error(sql text, label text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    return;
  end;
  raise exception 'expected failure: %', label;
end;
$$;

create or replace function test_helpers.expect(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is not true then
    raise exception 'assertion failed: %', label;
  end if;
end;
$$;



grant usage on schema test_helpers to public;
grant execute on all functions in schema test_helpers to public;

-- Fixture people -----------------------------------------------------------
insert into public.staff_members (id, email, role, departments) values
  ('00000000-0000-0000-0000-0000000000b1', 'sara@example.test', 'member', '{sales}'),
  ('00000000-0000-0000-0000-0000000000b2', 'reza@example.test', 'viewer', '{}');
insert into public.staff_members (id, email, role, status) values
  ('00000000-0000-0000-0000-0000000000b3', 'gone@example.test', 'member', 'invited');
insert into auth.users (id, email, email_confirmed_at) values
  ('10000000-0000-0000-0000-0000000000b1', 'sara@example.test', now()),
  ('10000000-0000-0000-0000-0000000000b2', 'reza@example.test', now()),
  ('10000000-0000-0000-0000-0000000000f9', 'stranger@example.test', now());

-- Registering ----------------------------------------------------------------
select test_helpers.as_user('10000000-0000-0000-0000-0000000000b1');
select public.register_push_device('token-sara-phone-0001', 'ios', '1.0.0');
select public.register_push_device('token-sara-phone-0001', 'ios', '1.0.1');
select test_helpers.expect(
  (select count(*) from public.push_devices) = 1, 'registering twice keeps one row');
select test_helpers.expect(
  (select app_version from public.push_devices) = '1.0.1', 'second registration refreshes the row');
select test_helpers.expect_error(
  $$insert into public.push_devices (staff_id, token, platform)
    values ('00000000-0000-0000-0000-0000000000b2', 'token-forged-000001', 'ios')$$,
  'nobody inserts device rows directly');
select test_helpers.expect_error(
  $$select public.register_push_device('token-bad-platform-01', 'windows')$$, 'platform is checked');

-- A shared phone moves to whoever signs in last ------------------------------
select test_helpers.as_user('10000000-0000-0000-0000-0000000000b2');
select test_helpers.expect(
  (select count(*) from public.push_devices) = 0, 'others cannot see my phones');
select public.unregister_push_device('token-sara-phone-0001');
select test_helpers.as_service();
select test_helpers.expect(
  (select count(*) from public.push_devices) = 1, 'others cannot remove my phones');

select test_helpers.as_user('10000000-0000-0000-0000-0000000000b2');
select public.register_push_device('token-sara-phone-0001', 'ios');
select test_helpers.as_service();
select test_helpers.expect(
  (select staff_id from public.push_devices where token = 'token-sara-phone-0001')
    = '00000000-0000-0000-0000-0000000000b2',
  'the phone now notifies the colleague who signed in');

select test_helpers.as_user('10000000-0000-0000-0000-0000000000b2');
select public.unregister_push_device('token-sara-phone-0001');
select test_helpers.as_service();
select test_helpers.expect(
  (select count(*) from public.push_devices) = 0, 'sign-out removes the phone');

-- Outsiders ------------------------------------------------------------------
select test_helpers.as_user('10000000-0000-0000-0000-0000000000f9');
select test_helpers.expect_error(
  $$select public.register_push_device('token-stranger-00001', 'android')$$, 'non-staff cannot register');
select test_helpers.as_service();
set local role anon;
select test_helpers.expect_error(
  $$select public.register_push_device('token-anon-000000001', 'android')$$, 'anonymous cannot register');
select test_helpers.expect_error($$select count(*) from public.push_devices$$, 'anonymous cannot read');

rollback;
