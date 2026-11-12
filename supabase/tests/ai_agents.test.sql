-- AI agents: who can create, see and revoke keys and see agent work.
-- Runs as one transaction and rolls back.
begin;

create schema agent_test;

create function agent_test.as_user(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  execute 'set local role authenticated';
end;
$$;

create function agent_test.as_service() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
end;
$$;

create function agent_test.expect_error(sql text, label text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    return;
  end;
  raise exception 'expected failure: %', label;
end;
$$;

create function agent_test.expect(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is not true then
    raise exception 'assertion failed: %', label;
  end if;
end;
$$;

grant usage on schema agent_test to public;
grant execute on all functions in schema agent_test to public;

insert into public.staff_members (id, email, role, display_name) values
  ('00000000-0000-0000-0000-0000000000a1', 'sara@example.test', 'member', 'سارا'),
  ('00000000-0000-0000-0000-0000000000a2', 'kaveh@example.test', 'member', 'کاوه'),
  ('00000000-0000-0000-0000-0000000000a3', 'admin@example.test', 'admin', 'مدیر'),
  ('00000000-0000-0000-0000-0000000000a4', 'view@example.test', 'viewer', 'ناظر');
insert into auth.users (id, email, email_confirmed_at) values
  ('10000000-0000-0000-0000-0000000000a1', 'sara@example.test', now()),
  ('10000000-0000-0000-0000-0000000000a2', 'kaveh@example.test', now()),
  ('10000000-0000-0000-0000-0000000000a3', 'admin@example.test', now()),
  ('10000000-0000-0000-0000-0000000000a4', 'view@example.test', now());

-- Sara makes a key for an agent that works for her.
select agent_test.as_user('10000000-0000-0000-0000-0000000000a1');
insert into public.ai_agents (id, name, provider, acts_for, scopes, token_hash, token_hint)
values ('20000000-0000-0000-0000-0000000000a1', 'Claude', 'claude', '00000000-0000-0000-0000-0000000000a1', array['read', 'tasks'],
        repeat('a', 64), 'abc123');
select agent_test.expect((select created_by from public.ai_agents where id = '20000000-0000-0000-0000-0000000000a1') = '00000000-0000-0000-0000-0000000000a1', 'creator is stamped');

-- She cannot make one that works for Kaveh, or a bot teammate.
select agent_test.expect_error($$insert into public.ai_agents (name, acts_for, token_hash, token_hint) values ('Grok', '00000000-0000-0000-0000-0000000000a2', repeat('b', 64), 'bbbbbb')$$, 'member acts for someone else');
select agent_test.expect_error($$insert into public.ai_agents (name, acts_for, token_hash, token_hint) values ('Grok', null, repeat('b', 64), 'bbbbbb')$$, 'member makes bot teammate');
-- Unknown scopes and raw keys are refused.
select agent_test.expect_error($$insert into public.ai_agents (name, acts_for, scopes, token_hash, token_hint) values ('X', '00000000-0000-0000-0000-0000000000a1', array['finance'], repeat('c', 64), 'cccccc')$$, 'unknown scope');
select agent_test.expect_error($$insert into public.ai_agents (name, acts_for, token_hash, token_hint) values ('X', '00000000-0000-0000-0000-0000000000a1', 'aratta_plain_key', 'cccccc')$$, 'plain key instead of hash');

-- A viewer cannot make keys at all.
select agent_test.as_user('10000000-0000-0000-0000-0000000000a4');
select agent_test.expect_error($$insert into public.ai_agents (name, acts_for, token_hash, token_hint) values ('V', '00000000-0000-0000-0000-0000000000a4', repeat('d', 64), 'dddddd')$$, 'viewer makes key');

-- Kaveh does not see Sara's agent; the admin does and can make a bot teammate.
select agent_test.as_user('10000000-0000-0000-0000-0000000000a2');
select agent_test.expect((select count(*) from public.ai_agents) = 0, 'colleague cannot see agent');
select agent_test.as_user('10000000-0000-0000-0000-0000000000a3');
select agent_test.expect((select count(*) from public.ai_agents) = 1, 'admin sees agent');
insert into public.ai_agents (id, name, provider, acts_for, scopes, token_hash, token_hint)
values ('20000000-0000-0000-0000-0000000000a2', 'Grok', 'grok', null, array['read', 'chat'], repeat('e', 64), 'eeeeee');

-- The server logs work; people only read it.
select agent_test.as_service();
insert into public.ai_agent_actions (agent_id, acting_for, tool, summary, status)
values ('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'move_deal', 'move_deal(stage=won)', 'pending');
select agent_test.as_user('10000000-0000-0000-0000-0000000000a1');
select agent_test.expect((select count(*) from public.ai_agent_actions) = 1, 'owner sees agent work');
select agent_test.expect_error($$insert into public.ai_agent_actions (agent_id, tool, summary, status) values ('20000000-0000-0000-0000-0000000000a1', 'x', 'x', 'done')$$, 'people cannot forge agent work');
select agent_test.expect_error($$update public.ai_agent_actions set status = 'approved'$$, 'people cannot approve by writing the row');
select agent_test.as_service();
select agent_test.expect((select status from public.ai_agent_actions limit 1) = 'pending', 'people cannot approve by writing the row');

-- Sara can revoke her own key.
select agent_test.as_user('10000000-0000-0000-0000-0000000000a1');
update public.ai_agents set revoked_at = now() where id = '20000000-0000-0000-0000-0000000000a1';
select agent_test.as_service();
select agent_test.expect((select revoked_at is not null from public.ai_agents where id = '20000000-0000-0000-0000-0000000000a1'), 'owner revokes key');

rollback;
