-- Email and password sign-in: who may hand out a password, what it creates,
-- and when the "choose your own password" step clears. Rolls back at the end.
begin;

create schema pw_test;

create or replace function pw_test.as_user(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  execute 'set local role authenticated';
end;
$$;

create or replace function pw_test.as_service() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
end;
$$;

create or replace function pw_test.expect_error(sql text, label text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    return;
  end;
  raise exception 'expected failure: %', label;
end;
$$;

create or replace function pw_test.expect(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is not true then
    raise exception 'assertion failed: %', label;
  end if;
end;
$$;

grant usage on schema pw_test to public;
grant execute on all functions in schema pw_test to public;

-- The first owner is set up from the SQL editor.
insert into public.staff_members (id, email, role, departments, display_name) values
  ('00000000-0000-0000-0000-0000000000b1', 'Owner@Example.test', 'owner', '{executive}', 'Owner');
select pw_test.expect(
  public.staff_account_set_password('owner@example.test', 'first-password') is not null,
  'owner account created');
select pw_test.expect(
  (select status = 'active' and user_id is not null from public.staff_members where id = '00000000-0000-0000-0000-0000000000b1'),
  'creating the account links and activates the staff record');
select pw_test.expect(
  (select encrypted_password = extensions.crypt('first-password', encrypted_password)
          and email = 'owner@example.test' and email_confirmed_at is not null
          and aud = 'authenticated' and role = 'authenticated'
          and confirmation_token = '' and recovery_token = '' and email_change = '' and email_change_token_new = ''
          and raw_app_meta_data ->> 'provider' = 'email'
   from auth.users where email = 'owner@example.test'),
  'account has a checked password and the fields the sign-in service needs');
select pw_test.expect(
  (select count(*) from auth.identities i join auth.users u on u.id = i.user_id
   where u.email = 'owner@example.test' and i.provider = 'email' and i.provider_id = u.id::text
     and i.identity_data ->> 'email' = 'owner@example.test') = 1,
  'email identity created once');

-- Colleagues: an admin, a member, and someone who used Google before.
insert into public.staff_members (id, email, role, departments) values
  ('00000000-0000-0000-0000-0000000000b2', 'admin@example.test', 'admin', '{executive}'),
  ('00000000-0000-0000-0000-0000000000b3', 'member@example.test', 'member', '{sales}'),
  ('00000000-0000-0000-0000-0000000000b4', 'google@example.test', 'member', '{sales}');
insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data) values
  ('10000000-0000-0000-0000-0000000000b4', 'google@example.test', now(), '{"provider":"google","providers":["google"]}');

-- The owner signs in and hands out passwords.
select pw_test.as_user((select user_id from public.staff_members where id = '00000000-0000-0000-0000-0000000000b1'));
select pw_test.expect(public.password_change_pending(), 'handed-out password must be changed');
select public.staff_set_password('00000000-0000-0000-0000-0000000000b2', 'admin-start-1');
select public.staff_set_password('00000000-0000-0000-0000-0000000000b3', 'member-start-1');
select public.staff_set_password('00000000-0000-0000-0000-0000000000b4', 'google-start-1');
select pw_test.expect_error(
  $$select public.staff_set_password('00000000-0000-0000-0000-0000000000b1', 'another-pass')$$, 'not on yourself');
select pw_test.expect_error(
  $$select public.staff_set_password('00000000-0000-0000-0000-0000000000b3', 'short')$$, 'too short');
select pw_test.expect_error(
  $$select public.staff_account_set_password('x@example.test', 'long-enough-1')$$, 'inner function is not callable by people');

select pw_test.as_service();
select pw_test.expect(
  (select count(*) from public.staff_members where status = 'active' and user_id is not null) = 4,
  'a starting password activates each colleague');
select pw_test.expect(
  (select user_id = '10000000-0000-0000-0000-0000000000b4' from public.staff_members where id = '00000000-0000-0000-0000-0000000000b4'),
  'an existing Google account is reused, not duplicated');
select pw_test.expect(
  (select raw_app_meta_data -> 'providers' = '["google", "email"]'::jsonb and raw_app_meta_data ->> 'provider' = 'google'
   from auth.users where id = '10000000-0000-0000-0000-0000000000b4'),
  'email is added next to Google');
select pw_test.expect((select count(*) from auth.users) = 4, 'one account per person');

-- The admin can reset a member, but not the owner. A member cannot at all.
select pw_test.as_user((select user_id from public.staff_members where id = '00000000-0000-0000-0000-0000000000b2'));
select public.staff_set_password('00000000-0000-0000-0000-0000000000b3', 'member-start-2');
select pw_test.expect_error(
  $$select public.staff_set_password('00000000-0000-0000-0000-0000000000b1', 'take-over-1')$$, 'admin cannot reset an owner');
select pw_test.as_user((select user_id from public.staff_members where id = '00000000-0000-0000-0000-0000000000b3'));
select pw_test.expect_error(
  $$select public.staff_set_password('00000000-0000-0000-0000-0000000000b4', 'take-over-1')$$, 'member cannot set passwords');
select pw_test.expect(public.password_change_pending(), 'reset password must be changed too');

-- Choosing a new password (done by the sign-in service) clears the step.
select pw_test.as_service();
select pw_test.expect(
  (select encrypted_password = extensions.crypt('member-start-2', encrypted_password) from auth.users where email = 'member@example.test'),
  'reset replaced the password');
update auth.users set encrypted_password = extensions.crypt('my-own-password', extensions.gen_salt('bf', 4))
where email = 'member@example.test';
select pw_test.as_user((select user_id from public.staff_members where id = '00000000-0000-0000-0000-0000000000b3'));
select pw_test.expect(not public.password_change_pending(), 'own password clears the step');
select pw_test.as_service();
select pw_test.expect(
  (select not raw_app_meta_data ? 'must_change_password' from auth.users where email = 'member@example.test'),
  'flag removed');

-- Suspended colleagues get no password.
update public.staff_members set status = 'suspended' where id = '00000000-0000-0000-0000-0000000000b4';
select pw_test.as_user((select user_id from public.staff_members where id = '00000000-0000-0000-0000-0000000000b1'));
select pw_test.expect_error(
  $$select public.staff_set_password('00000000-0000-0000-0000-0000000000b4', 'google-start-2')$$, 'suspended');

-- Visitors cannot reach any of it.
select pw_test.as_service();
set local role anon;
select pw_test.expect_error(
  $$select public.staff_set_password('00000000-0000-0000-0000-0000000000b3', 'anon-pass-1')$$, 'anon set password');
select pw_test.expect_error($$select public.password_change_pending()$$, 'anon pending check');
select pw_test.as_service();

rollback;
