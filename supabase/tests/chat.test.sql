-- Team chat: who reads what, unread counts, notifications and bot posts.
-- Runs as one transaction and rolls back.
begin;

create schema chat_test;

create function chat_test.as_user(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  execute 'set local role authenticated';
end;
$$;

create function chat_test.as_service() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
end;
$$;

create function chat_test.expect_error(sql text, label text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    return;
  end;
  raise exception 'expected failure: %', label;
end;
$$;

create function chat_test.expect(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is not true then
    raise exception 'assertion failed: %', label;
  end if;
end;
$$;

grant usage on schema chat_test to public;
grant execute on all functions in schema chat_test to public;

-- Sara (member), Kaveh (member), a manager, a viewer, and someone not on the team.
insert into public.staff_members (id, email, role, display_name) values
  ('00000000-0000-0000-0000-0000000000c1', 'sara@example.test', 'member', 'سارا'),
  ('00000000-0000-0000-0000-0000000000c2', 'kaveh@example.test', 'member', 'کاوه'),
  ('00000000-0000-0000-0000-0000000000c3', 'boss@example.test', 'manager', 'مدیر'),
  ('00000000-0000-0000-0000-0000000000c4', 'view@example.test', 'viewer', 'ناظر');
insert into auth.users (id, email, email_confirmed_at) values
  ('10000000-0000-0000-0000-0000000000c1', 'sara@example.test', now()),
  ('10000000-0000-0000-0000-0000000000c2', 'kaveh@example.test', now()),
  ('10000000-0000-0000-0000-0000000000c3', 'boss@example.test', now()),
  ('10000000-0000-0000-0000-0000000000c4', 'view@example.test', now()),
  ('10000000-0000-0000-0000-0000000000cf', 'nobody@example.test', now());

select chat_test.expect(
  (select count(*) from public.chat_members m join public.chat_channels c on c.id = m.channel_id
   where m.staff_id = '00000000-0000-0000-0000-0000000000c1' and c.is_default) = 4,
  'activated staff join the four default channels');

-- Sara writes in #general ------------------------------------------------------
select chat_test.as_user('10000000-0000-0000-0000-0000000000c1');
insert into public.chat_messages (channel_id, body, mentions)
select id, 'سلام @کاوه، غرفه B12 آماده است؟', array['00000000-0000-0000-0000-0000000000c2'::uuid, gen_random_uuid()]
from public.chat_channels where slug = 'general';
select chat_test.expect(
  (select mentions = array['00000000-0000-0000-0000-0000000000c2'::uuid] from public.chat_messages limit 1),
  'mentions keep only real colleagues');
select chat_test.expect_error(
  $$insert into public.chat_messages (channel_id, body, bot_name) select id, 'x', 'Fake bot' from public.chat_channels where slug = 'general'$$,
  'people cannot post as a bot');
select chat_test.expect_error(
  $$insert into public.chat_messages (channel_id, body, author_id) select id, 'x', '00000000-0000-0000-0000-0000000000c2' from public.chat_channels where slug = 'general'$$,
  'people cannot post as someone else');
select chat_test.expect_error(
  $$select public.chat_post_as_bot('alerts', 'Grok', 'hi')$$, 'bot posting is server-only');

select chat_test.as_user('10000000-0000-0000-0000-0000000000c2');
select chat_test.expect(
  (select unread_count = 1 and mention_count = 1 from public.chat_members m join public.chat_channels c on c.id = m.channel_id
   where c.slug = 'general' and m.staff_id = '00000000-0000-0000-0000-0000000000c2'),
  'unread and mention counted for Kaveh');
select chat_test.expect(
  (select count(*) from public.notifications where kind = 'chat.mention') = 1, 'Kaveh is notified of the mention');
select chat_test.expect(
  (select last_message_preview from public.chat_channels where slug = 'general') like 'سلام%', 'channel keeps the latest line');
update public.chat_members set unread_count = 0, mention_count = 0, last_read_at = now()
where staff_id = '00000000-0000-0000-0000-0000000000c2';
select chat_test.expect(
  (select sum(unread_count) from public.chat_members where staff_id = '00000000-0000-0000-0000-0000000000c2') = 0, 'mark as read');
update public.chat_members set staff_id = '00000000-0000-0000-0000-0000000000c1'
where staff_id = '00000000-0000-0000-0000-0000000000c2';
select chat_test.expect(
  (select count(*) from public.chat_members where staff_id = '00000000-0000-0000-0000-0000000000c2') = 4,
  'a membership cannot be moved to someone else');
-- Kaveh cannot edit Sara's words.
update public.chat_messages set body = 'hacked';
select chat_test.expect((select count(*) from public.chat_messages where body = 'hacked') = 0, 'only the author edits');

-- Direct messages are private ---------------------------------------------------
select chat_test.as_user('10000000-0000-0000-0000-0000000000c1');
select set_config('chat_test.dm', public.chat_open_direct('00000000-0000-0000-0000-0000000000c2')::text, true);
select chat_test.expect(
  public.chat_open_direct('00000000-0000-0000-0000-0000000000c2')::text = current_setting('chat_test.dm'),
  'one conversation per pair');
insert into public.chat_messages (channel_id, body) values (current_setting('chat_test.dm')::uuid, 'فاکتور را فرستادم');
select chat_test.expect_error(
  $$insert into public.chat_channels (kind, dm_key) values ('direct', 'a:b')$$, 'direct chats only through the function');

select chat_test.as_user('10000000-0000-0000-0000-0000000000c2');
select chat_test.expect(
  (select count(*) from public.notifications where kind = 'chat.direct' and title like '%سارا%') = 1, 'Kaveh hears about the DM');
select chat_test.expect(
  (select count(*) from public.chat_messages where channel_id = current_setting('chat_test.dm')::uuid) = 1, 'Kaveh reads the DM');

select chat_test.as_user('10000000-0000-0000-0000-0000000000c3');
select chat_test.expect(
  (select count(*) from public.chat_messages where channel_id = current_setting('chat_test.dm')::uuid) = 0,
  'even a manager cannot read other people''s DMs');
select chat_test.expect(
  (select count(*) from public.chat_channels where kind = 'direct') = 0, 'nor see that the DM exists');

-- Private channels ---------------------------------------------------------------
select chat_test.as_user('10000000-0000-0000-0000-0000000000c1');
insert into public.chat_channels (id, name, is_private)
values ('40000000-0000-0000-0000-000000000001', '#مالی محرمانه', true);
select chat_test.expect(
  (select name from public.chat_channels where id = '40000000-0000-0000-0000-000000000001') = 'مالی محرمانه',
  'leading # is trimmed and the maker sees their private channel');
insert into public.chat_messages (channel_id, body) values ('40000000-0000-0000-0000-000000000001', 'سرّی');
select chat_test.as_user('10000000-0000-0000-0000-0000000000c2');
select chat_test.expect(
  (select count(*) from public.chat_messages where channel_id = '40000000-0000-0000-0000-000000000001') = 0,
  'non-members cannot read a private channel');
select chat_test.expect_error(
  $$insert into public.chat_members (channel_id, staff_id) values ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2')$$,
  'nobody joins a private channel by themselves');
select chat_test.as_user('10000000-0000-0000-0000-0000000000c1');
insert into public.chat_members (channel_id, staff_id) values ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2');
select chat_test.as_user('10000000-0000-0000-0000-0000000000c2');
select chat_test.expect(
  (select count(*) from public.chat_messages where channel_id = '40000000-0000-0000-0000-000000000001') = 1,
  'once added, Kaveh reads it');

-- Viewers can talk; strangers see nothing ---------------------------------------
select chat_test.as_user('10000000-0000-0000-0000-0000000000c4');
insert into public.chat_messages (channel_id, body) select id, 'من هم هستم' from public.chat_channels where slug = 'general';
select chat_test.expect_error(
  $$insert into public.chat_channels (name) values ('x')$$, 'viewers cannot make channels');
select chat_test.as_user('10000000-0000-0000-0000-0000000000cf');
select chat_test.expect((select count(*) from public.chat_channels) = 0, 'outsiders see no channels');
select chat_test.expect((select count(*) from public.chat_messages) = 0, 'outsiders see no messages');

-- Removing --------------------------------------------------------------------------
select chat_test.as_user('10000000-0000-0000-0000-0000000000c1');
update public.chat_messages set body = 'سلام کاوه، B12 آماده است؟'
where body like 'سلام @کاوه%';
select chat_test.expect(
  (select edited_at is not null from public.chat_messages where body = 'سلام کاوه، B12 آماده است؟'), 'edits are marked');
select chat_test.as_user('10000000-0000-0000-0000-0000000000c3');
update public.chat_messages set deleted_at = now() where body = 'من هم هستم';
select chat_test.expect(
  (select count(*) from public.chat_messages where deleted_at is not null and body = '') = 1, 'manager removes a message');
select chat_test.expect_error($$delete from public.chat_messages$$, 'no hard deletes');
select chat_test.as_service();
select chat_test.expect((select count(*) from public.chat_messages) = 4, 'messages are never hard-deleted by people');

-- Bots and agents ---------------------------------------------------------------------
set local role service_role;
select public.chat_post_as_bot('alerts', 'Grok', 'سه غرفه هنوز برق ندارند', 'alert', '/staff/map');
reset role;
select chat_test.expect(
  (select bot_name = 'Grok' and author_id is null and kind = 'alert' from public.chat_messages where body like 'سه غرفه%'),
  'service role posts as an agent');
select chat_test.expect(
  (select unread_count from public.chat_members m join public.chat_channels c on c.id = m.channel_id
   where c.slug = 'alerts' and m.staff_id = '00000000-0000-0000-0000-0000000000c1') = 1,
  'bot messages count as unread for everyone');

rollback;
