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
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.test', 'owner', '{executive}'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin@example.test', 'admin', '{executive}'),
  ('00000000-0000-0000-0000-0000000000a3', 'manager@example.test', 'manager', '{operations}'),
  ('00000000-0000-0000-0000-0000000000a4', 'Seller@Example.test', 'member', '{sales}'),
  ('00000000-0000-0000-0000-0000000000a5', 'ops@example.test', 'member', '{operations}'),
  ('00000000-0000-0000-0000-0000000000a6', 'viewer@example.test', 'viewer', '{}');

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('10000000-0000-0000-0000-0000000000a1', 'owner@example.test', now(), '{"full_name":"Owner One"}'),
  ('10000000-0000-0000-0000-0000000000a2', 'admin@example.test', now(), '{}'),
  ('10000000-0000-0000-0000-0000000000a3', 'manager@example.test', now(), '{}'),
  ('10000000-0000-0000-0000-0000000000a4', 'seller@example.test', now(), '{"name":"Seller"}'),
  ('10000000-0000-0000-0000-0000000000a5', 'ops@example.test', now(), '{}'),
  ('10000000-0000-0000-0000-0000000000a6', 'viewer@example.test', now(), '{}'),
  ('10000000-0000-0000-0000-0000000000f1', 'stranger@example.test', now(), '{}'),
  ('10000000-0000-0000-0000-0000000000f2', 'unverified@example.test', null, '{}');

-- An invite for an unverified address must not activate.
insert into public.staff_members (email, role) values ('unverified@example.test', 'member');

select test_helpers.expect(
  (select count(*) from public.staff_members where status = 'active') = 6,
  'verified invites are linked and activated (case-insensitive email)');
select test_helpers.expect(
  (select display_name from public.staff_members where email = 'owner@example.test') = 'Owner One',
  'display name copied from the provider profile');
select test_helpers.expect(
  (select status from public.staff_members where email = 'unverified@example.test') = 'invited',
  'unverified email stays invited');

-- Owner sets up an exhibition and a hall ----------------------------------
select test_helpers.as_user('10000000-0000-0000-0000-0000000000a1');
insert into public.exhibitions (id, slug, name_fa, name_en, vat_rate)
values ('20000000-0000-0000-0000-000000000001', 'kerman-mining-1405', 'نمایشگاه معدن کرمان', 'Kerman Mining', 0.10);
insert into public.halls (id, exhibition_id, name_fa, width_m, depth_m)
values ('20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'سالن خواجوی کرمانی', 80, 40);
select test_helpers.expect(
  (select created_by from public.exhibitions where slug = 'kerman-mining-1405') = '00000000-0000-0000-0000-0000000000a1',
  'created_by defaults to the signed-in staff member');

-- Strangers and anonymous visitors see nothing ----------------------------
select test_helpers.as_user('10000000-0000-0000-0000-0000000000f1');
select test_helpers.expect((select count(*) from public.exhibitions) = 0, 'uninvited user sees no exhibitions');
select test_helpers.expect((select count(*) from public.staff_members) = 0, 'uninvited user sees no staff');
select test_helpers.expect_error($$insert into public.companies (name_fa) values ('x')$$, 'uninvited insert');
select test_helpers.as_service();
set local role anon;
select test_helpers.expect_error($$select count(*) from public.companies$$, 'anon has no table grant');
select test_helpers.as_service();

-- Viewer reads but cannot write --------------------------------------------
select test_helpers.as_user('10000000-0000-0000-0000-0000000000a6');
select test_helpers.expect((select count(*) from public.halls) = 1, 'viewer can read halls');
select test_helpers.expect_error($$insert into public.companies (name_fa) values ('x')$$, 'viewer insert');

-- Members do day-to-day work ------------------------------------------------
select test_helpers.as_user('10000000-0000-0000-0000-0000000000a5');
select test_helpers.expect_error(
  $$insert into public.exhibitions (slug, name_fa) values ('nope', 'x')$$, 'member cannot create exhibitions');
insert into public.booths (id, hall_id, code, x, y, width, depth)
values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', ' B1 ', 0, 0, 8.5, 6);
select test_helpers.expect(
  (select area_m2 = 51 and code = 'B1' and exhibition_id = '20000000-0000-0000-0000-000000000001'
   from public.booths where id = '30000000-0000-0000-0000-000000000001'),
  'booth area, code and exhibition derived');
delete from public.booths where id = '30000000-0000-0000-0000-000000000001';
select test_helpers.expect((select count(*) from public.booths) = 1, 'member cannot delete booths');
update public.staff_members set role = 'owner' where email = 'ops@example.test';
select test_helpers.expect(
  (select role from public.staff_members where email = 'ops@example.test') = 'member',
  'member cannot change roles');

-- Sales pipeline -------------------------------------------------------------
select test_helpers.as_user('10000000-0000-0000-0000-0000000000a4');
insert into public.companies (id, name_fa) values ('40000000-0000-0000-0000-000000000001', 'یاتاقان سازی');
insert into public.deals (id, exhibition_id, company_id, owner_id)
values ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000001', public.current_staff_id());
insert into public.activities (company_id, deal_id, kind, summary, next_follow_up_at)
values ('40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'call',
        'Discussed 51 m² in Khajoo hall', now() + interval '2 days');
select test_helpers.expect(
  (select stage = 'contacted' and last_contact_at is not null and next_follow_up_at > now()
   from public.deals where id = '40000000-0000-0000-0000-000000000002'),
  'logging a call advances the deal and schedules the follow-up');
select test_helpers.expect(
  (select count(*) from public.activities where kind = 'system' and summary = 'stage:lead→contacted') = 1,
  'stage change recorded in history');

update public.booths set deal_id = '40000000-0000-0000-0000-000000000002'
where id = '30000000-0000-0000-0000-000000000001';
select test_helpers.expect(
  (select status from public.booths where id = '30000000-0000-0000-0000-000000000001') = 'reserved',
  'assigning a deal reserves the booth');

-- Sales member can invoice; 51 m² x 45,000,000 + 10% VAT.
insert into public.invoices (id, exhibition_id, company_id, deal_id, number, status)
values ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'P-1405-001', 'registered');
insert into public.invoice_lines (invoice_id, service, booth_id, quantity, unit, unit_price)
values ('50000000-0000-0000-0000-000000000001', 'space', '30000000-0000-0000-0000-000000000001', 51, 'm2', 45000000);
insert into public.payments (invoice_id, company_id, amount)
values ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1000000000);
select test_helpers.expect(
  (select subtotal = 2295000000 and vat = 229500000 and total = 2524500000 and paid = 1000000000
     and balance = 1524500000
   from public.invoice_totals where invoice_id = '50000000-0000-0000-0000-000000000001'),
  'invoice totals with VAT, paid and balance');
select test_helpers.expect(
  (select balance from public.deal_balances where deal_id = '40000000-0000-0000-0000-000000000002') = 1524500000,
  'deal balance');

-- Finance can take a line off a draft invoice, but not off an issued one.
insert into public.invoices (id, exhibition_id, company_id, deal_id, status)
values ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'draft');
insert into public.invoice_lines (id, invoice_id, service, quantity, unit, unit_price)
values ('50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', 'equipment', 2, 'unit', 1000);
delete from public.invoice_lines where id = '50000000-0000-0000-0000-000000000003';
select test_helpers.expect(
  not exists (select 1 from public.invoice_lines where id = '50000000-0000-0000-0000-000000000003'),
  'finance removes a line from a draft');
delete from public.invoice_lines where invoice_id = '50000000-0000-0000-0000-000000000001';
select test_helpers.expect(
  (select count(*) from public.invoice_lines where invoice_id = '50000000-0000-0000-0000-000000000001') = 1,
  'lines of an issued invoice stay');

-- Operations member outside sales/finance cannot touch money.
select test_helpers.as_user('10000000-0000-0000-0000-0000000000a5');
select test_helpers.expect_error(
  $$insert into public.payments (company_id, amount) values ('40000000-0000-0000-0000-000000000001', 5)$$,
  'ops member cannot record payments');

-- Equipment flow ---------------------------------------------------------
insert into public.inventory_items (id, sku, item_code, name_fa, category, on_hand)
values ('60000000-0000-0000-0000-000000000001', 'tv-55', '252', 'تلویزیون ۵۵', 'av', 10);
insert into public.equipment_orders (id, booth_id, exhibition_id, item_id, quantity)
values ('60000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 2);
update public.equipment_orders set stage = 'delivered' where id = '60000000-0000-0000-0000-000000000002';
select test_helpers.expect(
  (select delivered_qty = 2 and delivered_at is not null and deal_id = '40000000-0000-0000-0000-000000000002'
   from public.equipment_orders where id = '60000000-0000-0000-0000-000000000002'),
  'delivery stamps time and quantity and inherits the booth deal');
select test_helpers.expect(
  (select delivered_by = array['00000000-0000-0000-0000-0000000000a5'::uuid] and handled_by = '00000000-0000-0000-0000-0000000000a5'
   from public.equipment_orders where id = '60000000-0000-0000-0000-000000000002'),
  'a delivery with nobody named is credited to whoever saved it');
update public.equipment_orders
set delivered_by = array['00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a4']::uuid[]
where id = '60000000-0000-0000-0000-000000000002';
select test_helpers.expect(
  (select delivered_by = array['00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5']::uuid[]
   from public.equipment_orders where id = '60000000-0000-0000-0000-000000000002'),
  'several people can be named for one handover, in order, without repeats');
select test_helpers.expect_error(
  $$update public.equipment_orders set delivered_by = array['99999999-0000-0000-0000-000000000000']::uuid[]
    where id = '60000000-0000-0000-0000-000000000002'$$,
  'only real staff can be named on a handover');

-- Booth managers: staff only, order kept, repeats dropped.
update public.booths
set manager_ids = array['00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5']::uuid[]
where id = '30000000-0000-0000-0000-000000000001';
select test_helpers.expect(
  (select manager_ids = array['00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a4']::uuid[]
   from public.booths where id = '30000000-0000-0000-0000-000000000001'),
  'booth managers keep their order without repeats');
select test_helpers.expect_error(
  $$update public.booths set manager_ids = array[gen_random_uuid()] where id = '30000000-0000-0000-0000-000000000001'$$,
  'booth managers must be staff');

-- Avatars: staff pick their own, from the set or an uploaded file, nothing else.
select public.set_my_avatar('preset:7');
select test_helpers.expect(
  (select avatar_url = 'preset:7' from public.staff_members where id = '00000000-0000-0000-0000-0000000000a5'),
  'staff choose their own avatar');
select test_helpers.expect_error($$select public.set_my_avatar('https://example.test/x.png')$$, 'avatars come from the set or the avatars folder');
select test_helpers.expect(
  (select available = 8 and awaiting_collection = 2 from public.inventory_allocation
   where item_id = '60000000-0000-0000-0000-000000000001'
     and exhibition_id = '20000000-0000-0000-0000-000000000001'),
  'inventory allocation and awaiting collection');
update public.equipment_orders set stage = 'collected' where id = '60000000-0000-0000-0000-000000000002';
select test_helpers.expect(
  (select awaiting_collection = 0 and available = 10 from public.inventory_allocation
   where item_id = '60000000-0000-0000-0000-000000000001'
     and exhibition_id = '20000000-0000-0000-0000-000000000001'),
  'collection returns stock');
select test_helpers.expect(
  (select collected_by = array['00000000-0000-0000-0000-0000000000a5'::uuid]
   from public.equipment_orders where id = '60000000-0000-0000-0000-000000000002'),
  'collection is credited too');

-- Tasks and notifications ------------------------------------------------
select test_helpers.as_user('10000000-0000-0000-0000-0000000000a3');
insert into public.tasks (id, exhibition_id, title, assignee_id, booth_id)
values ('70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
        'Deliver TVs to B1', '00000000-0000-0000-0000-0000000000a5', '30000000-0000-0000-0000-000000000001');
select test_helpers.expect((select count(*) from public.notifications) = 0, 'manager does not see the assignee inbox');

select test_helpers.as_user('10000000-0000-0000-0000-0000000000a5');
select test_helpers.expect(
  (select count(*) from public.notifications where kind = 'task.assigned') = 1, 'assignee is notified');
update public.tasks set status = 'done' where id = '70000000-0000-0000-0000-000000000001';
insert into public.task_comments (task_id, body) values ('70000000-0000-0000-0000-000000000001', 'Delivered');
select test_helpers.expect(
  (select completed_at is not null from public.tasks where id = '70000000-0000-0000-0000-000000000001'),
  'completion time stamped');
select test_helpers.expect(public.mark_notifications_read() = 1, 'marking inbox read');
select test_helpers.expect_error(
  $$insert into public.notifications (recipient_id, kind, title) values ('00000000-0000-0000-0000-0000000000a1', 'x', 'spoof')$$,
  'cannot forge notifications');

select test_helpers.as_user('10000000-0000-0000-0000-0000000000a3');
select test_helpers.expect(
  (select count(*) from public.notifications where kind in ('task.status', 'task.comment')) = 2,
  'creator hears about status and comment');

-- Audit trail --------------------------------------------------------------
select test_helpers.expect(
  (select count(*) from public.audit_log where table_name = 'booths' and action = 'update') >= 1,
  'manager reads audit history');
select test_helpers.expect(
  (select actor_id from public.audit_log where table_name = 'tasks' and action = 'insert' limit 1)
    = '00000000-0000-0000-0000-0000000000a3',
  'audit records the actor');
select test_helpers.as_user('10000000-0000-0000-0000-0000000000a5');
select test_helpers.expect((select count(*) from public.audit_log) = 0, 'members cannot read audit history');

-- Furniture agreed with a company before it has a booth ------------------
select test_helpers.as_user('10000000-0000-0000-0000-0000000000a4');
insert into public.companies (id, name_fa) values ('80000000-0000-0000-0000-000000000001', 'فولاد نمونه');
insert into public.deals (id, exhibition_id, company_id, owner_id)
values ('80000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
        '80000000-0000-0000-0000-000000000001', public.current_staff_id());
update public.deals set furniture_notes = 'Two high chairs', furniture_confirmed_at = now(),
  furniture_confirmed_by = public.current_staff_id()
where id = '80000000-0000-0000-0000-000000000002';
insert into public.equipment_orders (id, exhibition_id, deal_id, item_id, quantity)
values ('80000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001',
        '80000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 1);
insert into public.booths (id, hall_id, code, x, y, width, depth)
values ('80000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'B2', 10, 0, 3, 3);
update public.booths set deal_id = '80000000-0000-0000-0000-000000000002'
where id = '80000000-0000-0000-0000-000000000004';
select test_helpers.expect(
  (select booth_id from public.equipment_orders where id = '80000000-0000-0000-0000-000000000003')
    = '80000000-0000-0000-0000-000000000004',
  'furniture agreed on the company record moves onto its new booth');
update public.booths set deal_id = null where id = '80000000-0000-0000-0000-000000000004';
select test_helpers.expect(
  (select booth_id is null from public.equipment_orders where id = '80000000-0000-0000-0000-000000000003'),
  'furniture that never went out goes back to the company when the booth is given up');
update public.booths set steps = '{"build": {"at": "2026-11-06T08:00:00Z"}}' where id = '80000000-0000-0000-0000-000000000004';
select test_helpers.expect_error(
  $$update public.booths set steps = '[]' where id = '80000000-0000-0000-0000-000000000004'$$,
  'booth steps must be an object');

-- Problems: one tap turns a booth red, someone else sorts it out ----------
select test_helpers.as_user('10000000-0000-0000-0000-0000000000a6');
select test_helpers.expect_error(
  $$insert into public.problems (exhibition_id, booth_id) values ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001')$$,
  'viewers cannot raise problems');
select test_helpers.as_user('10000000-0000-0000-0000-0000000000a5');
insert into public.problems (id, exhibition_id, booth_id, step, note)
values ('80000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002',
        '30000000-0000-0000-0000-000000000001', 'delivery', '   ');
select test_helpers.expect(
  (select exhibition_id = '20000000-0000-0000-0000-000000000001'
      and deal_id = '40000000-0000-0000-0000-000000000002'
      and raised_by = '00000000-0000-0000-0000-0000000000a5'
      and note is null
   from public.problems where id = '80000000-0000-0000-0000-000000000005'),
  'a problem takes its exhibition and deal from the booth, and a blank note is no note');
select test_helpers.as_user('10000000-0000-0000-0000-0000000000a4');
select test_helpers.expect(
  (select count(*) from public.notifications where kind = 'problem.raised') = 1,
  'the booth managers and the salesperson hear about it');
update public.problems set resolved_at = now(), resolution = 'Sent two more chairs'
where id = '80000000-0000-0000-0000-000000000005';
select test_helpers.expect(
  (select resolved_by = '00000000-0000-0000-0000-0000000000a4' from public.problems where id = '80000000-0000-0000-0000-000000000005'),
  'resolving stamps who did it');
select test_helpers.as_user('10000000-0000-0000-0000-0000000000a5');
select test_helpers.expect(
  (select count(*) from public.notifications where kind = 'problem.resolved') = 1,
  'whoever raised it hears it was sorted');
update public.problems set resolved_at = null where id = '80000000-0000-0000-0000-000000000005';
select test_helpers.expect(
  (select resolved_by is null and resolution is null from public.problems where id = '80000000-0000-0000-0000-000000000005'),
  'reopening clears the resolution');

-- Staff administration guards ----------------------------------------------
select test_helpers.as_user('10000000-0000-0000-0000-0000000000a2');
insert into public.staff_members (email, role) values ('new.hire@example.test', 'member');
select test_helpers.expect_error(
  $$insert into public.staff_members (email, role) values ('x@example.test', 'owner')$$, 'admin cannot mint owners');
select test_helpers.expect_error(
  $$update public.staff_members set role = 'manager' where email = 'owner@example.test'$$, 'admin cannot demote owner');
select test_helpers.expect_error(
  $$update public.staff_members set role = 'owner' where email = 'admin@example.test'$$, 'admin cannot promote self');

select test_helpers.as_user('10000000-0000-0000-0000-0000000000a1');
select test_helpers.expect_error(
  $$update public.staff_members set role = 'admin' where email = 'owner@example.test'$$, 'owner cannot demote self');
select test_helpers.expect(
  (select display_name from public.update_my_profile('Arian', null, null, 'en')) = 'Arian', 'profile self-service');

-- Profiles and teams --------------------------------------------------------
select test_helpers.expect(
  (select bio from public.update_my_profile(null, '', null, null, 'Runs the halls', array['Persian', ' Persian ', 'English'])) = 'Runs the halls',
  'profile self-service keeps bio');
select test_helpers.as_service();
select test_helpers.expect(
  (select job_title is null and cardinality(skills) = 2 from public.staff_members where email = 'owner@example.test'),
  'empty string clears a field and skills are de-duplicated');
select test_helpers.expect_error(
  $$update public.staff_members set email = 'other@example.test' where email = 'seller@example.test'$$,
  'signed-in email is locked');

select test_helpers.as_user('10000000-0000-0000-0000-0000000000a3');
insert into public.teams (id, name_fa, lead_id, member_ids) values
  ('20000000-0000-0000-0000-0000000000b1', 'فروش', '00000000-0000-0000-0000-0000000000a4',
   array['00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a5']::uuid[]);
select test_helpers.expect(
  (select member_ids from public.teams where id = '20000000-0000-0000-0000-0000000000b1')
    = array['00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5']::uuid[],
  'lead is first, members de-duplicated');
select test_helpers.expect(
  (select created_by from public.teams where id = '20000000-0000-0000-0000-0000000000b1') = '00000000-0000-0000-0000-0000000000a3',
  'team remembers who made it');
select test_helpers.expect_error(
  $$insert into public.teams (name_fa, member_ids) values ('x', array['99999999-0000-0000-0000-000000000000']::uuid[])$$,
  'unknown members are refused');

-- The lead (a member) can change who is on the team, but not give it away.
select test_helpers.as_user('10000000-0000-0000-0000-0000000000a4');
update public.teams set member_ids = array['00000000-0000-0000-0000-0000000000a4']::uuid[]
  where id = '20000000-0000-0000-0000-0000000000b1';
select test_helpers.expect(
  (select cardinality(member_ids) from public.teams where id = '20000000-0000-0000-0000-0000000000b1') = 1,
  'lead edits members');
select test_helpers.expect_error(
  $$update public.teams set lead_id = '00000000-0000-0000-0000-0000000000a5' where id = '20000000-0000-0000-0000-0000000000b1'$$,
  'lead cannot hand the team away');
select test_helpers.expect_error(
  $$insert into public.teams (name_fa) values ('y')$$, 'members cannot create teams');
-- A member who does not lead the team changes nothing.
select test_helpers.as_user('10000000-0000-0000-0000-0000000000a5');
update public.teams set name_fa = 'hack' where id = '20000000-0000-0000-0000-0000000000b1';
select test_helpers.expect(
  (select name_fa from public.teams where id = '20000000-0000-0000-0000-0000000000b1') = 'فروش', 'non-lead cannot edit');
select test_helpers.expect((select count(*) from public.teams) = 1, 'every staff member sees teams');

-- Removing someone takes them off their teams.
select test_helpers.as_user('10000000-0000-0000-0000-0000000000a3');
update public.teams set member_ids = array['00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5']::uuid[]
  where id = '20000000-0000-0000-0000-0000000000b1';
select test_helpers.as_user('10000000-0000-0000-0000-0000000000a2');
delete from public.staff_members where id = '00000000-0000-0000-0000-0000000000a5';
select test_helpers.expect(
  (select member_ids from public.teams where id = '20000000-0000-0000-0000-0000000000b1') = array['00000000-0000-0000-0000-0000000000a4']::uuid[],
  'removed colleague leaves the team');
select test_helpers.expect(
  (select count(*) from public.audit_log where table_name = 'teams') >= 3, 'team changes are in the history');

rollback;
