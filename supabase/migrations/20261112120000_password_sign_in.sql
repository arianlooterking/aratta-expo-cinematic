-- Email and password sign-in for staff.
--
-- An admin gives a colleague a starting password in the People page. The
-- colleague signs in with their email and that password, and the portal asks
-- them to choose their own before anything else. Nothing is emailed, so this
-- works without an email service and without Google or Apple being set up.
-- Google and Apple sign-in keep working next to it once they are configured.

-- Creates the sign-in account for an email, or replaces its password. Not
-- callable through the API: admins go through staff_set_password below, and
-- the first owner is created by running this once in the SQL editor.
create or replace function public.staff_account_set_password(p_email text, p_password text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_user uuid;
  v_hash text;
  v_meta jsonb;
begin
  if v_email is null or position('@' in v_email) < 2 then
    raise exception 'A valid email is required';
  end if;
  -- bcrypt reads at most 72 bytes.
  if p_password is null or length(p_password) < 8 or octet_length(p_password) > 72 then
    raise exception 'Password must be 8 to 72 characters';
  end if;

  v_hash := extensions.crypt(p_password, extensions.gen_salt('bf', 10));

  select u.id, coalesce(u.raw_app_meta_data, '{}'::jsonb) into v_user, v_meta
  from auth.users u
  where lower(u.email) = v_email and u.is_sso_user is not true
  limit 1;

  if v_user is null then
    v_user := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    )
    values (
      '00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated',
      v_email, v_hash, now(),
      jsonb_build_object(
        'provider', 'email',
        'providers', jsonb_build_array('email'),
        -- Remembers which password was handed out, so the flag only clears
        -- once the person has really chosen another one.
        'must_change_password', md5(v_hash)
      ),
      '{}'::jsonb, now(), now(), '', '', '', ''
    );
  else
    if not coalesce(v_meta -> 'providers', '[]'::jsonb) ? 'email' then
      v_meta := jsonb_set(v_meta, '{providers}', coalesce(v_meta -> 'providers', '[]'::jsonb) || '"email"'::jsonb);
    end if;
    if not v_meta ? 'provider' then
      v_meta := v_meta || jsonb_build_object('provider', 'email');
    end if;
    -- Naming email_confirmed_at also runs the trigger that links this account
    -- to its staff record when the two have not met yet.
    update auth.users
    set encrypted_password = v_hash,
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_app_meta_data = v_meta || jsonb_build_object('must_change_password', md5(v_hash)),
        updated_at = now()
    where id = v_user;
  end if;

  if not exists (select 1 from auth.identities i where i.user_id = v_user and i.provider = 'email') then
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at)
    values (
      gen_random_uuid(), v_user, v_user::text, 'email',
      jsonb_build_object('sub', v_user::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
      now(), now()
    );
  end if;

  return v_user;
end;
$$;

revoke execute on function public.staff_account_set_password(text, text) from public, anon, authenticated;

-- An admin or owner gives a colleague a starting password, or resets it.
-- Same limits as changing someone's access: not yourself, and only an owner
-- for another owner.
create or replace function public.staff_set_password(p_staff uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.staff_members;
  target public.staff_members;
begin
  select * into actor
  from public.staff_members
  where user_id = auth.uid() and status = 'active';
  if actor.id is null or public.role_rank(actor.role) < public.role_rank('admin') then
    raise exception 'Only admins and owners set sign-in passwords' using errcode = '42501';
  end if;

  select * into target from public.staff_members where id = p_staff;
  if target.id is null then
    raise exception 'Unknown staff member';
  end if;
  if target.id = actor.id then
    raise exception 'Change your own password from your account menu';
  end if;
  if target.role = 'owner' and actor.role <> 'owner' then
    raise exception 'Only an owner can change another owner';
  end if;
  if target.status = 'suspended' then
    raise exception 'Restore access before setting a password';
  end if;

  perform public.staff_account_set_password(target.email, p_password);
end;
$$;

revoke execute on function public.staff_set_password(uuid, text) from public, anon;
grant execute on function public.staff_set_password(uuid, text) to authenticated;

-- Called after the signed-in person chose their own password. Returns true
-- while the handed-out password is still in use.
create or replace function public.password_change_pending()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_flag text;
  v_hash text;
begin
  select u.raw_app_meta_data ->> 'must_change_password', u.encrypted_password
  into v_flag, v_hash
  from auth.users u
  where u.id = auth.uid();

  if v_flag is null then
    return false;
  end if;
  if v_hash is not null and v_flag = md5(v_hash) then
    return true;
  end if;

  update auth.users
  set raw_app_meta_data = raw_app_meta_data - 'must_change_password'
  where id = auth.uid();
  return false;
end;
$$;

revoke execute on function public.password_change_pending() from public, anon;
grant execute on function public.password_change_pending() to authenticated;
