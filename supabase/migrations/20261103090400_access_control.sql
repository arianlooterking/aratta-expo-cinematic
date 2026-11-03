-- Row level security, grants, live (realtime) publication and storage buckets.
--
-- Role ladder: owner > admin > manager > member > viewer.
--   viewer  : read everything operational
--   member  : create and edit day-to-day records (CRM, map, equipment, tasks)
--   manager : delete records, manage exhibitions, read the audit trail
--   admin   : manage staff access
--   owner   : everything, including other owners
-- Finance tables additionally allow members in the sales or finance department.

-- Nothing here is public. Anonymous visitors get no table access at all.
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
grant execute on function
  public.current_staff_id(),
  public.has_role(public.staff_role),
  public.is_staff(),
  public.in_department(public.department),
  public.can_manage_finance(),
  public.role_rank(public.staff_role),
  public.update_my_profile(text, text, text, text),
  public.mark_notifications_read(uuid[])
to authenticated;

-- Trigger-only functions must never be callable directly.
revoke execute on function public.link_staff_account() from public, authenticated;
revoke execute on function public.audit_row() from public, authenticated;

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------
alter table public.staff_members enable row level security;

-- Signed-in people can always see their own row (to learn they are pending).
create policy staff_select on public.staff_members
  for select to authenticated
  using (public.is_staff() or user_id = auth.uid());
create policy staff_insert on public.staff_members
  for insert to authenticated with check (public.has_role('admin'));
create policy staff_update on public.staff_members
  for update to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));
create policy staff_delete on public.staff_members
  for delete to authenticated using (public.has_role('admin'));

-- ---------------------------------------------------------------------------
-- Audit log: read-only for managers; triggers write it.
-- ---------------------------------------------------------------------------
alter table public.audit_log enable row level security;
create policy audit_select on public.audit_log
  for select to authenticated using (public.has_role('manager'));
revoke insert, update, delete on public.audit_log from authenticated;

-- ---------------------------------------------------------------------------
-- Standard operational tables
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'halls', 'hall_features', 'booths',
    'companies', 'contacts', 'deals', 'activities',
    'inventory_items', 'equipment_orders', 'build_permits', 'guest_travel', 'tasks'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_staff())',
      t || '_select', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.has_role(''member''))',
      t || '_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.has_role(''member'')) with check (public.has_role(''member''))',
      t || '_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.has_role(''manager''))',
      t || '_delete', t);
  end loop;
end;
$$;

-- Exhibitions are set up by managers.
alter table public.exhibitions enable row level security;
create policy exhibitions_select on public.exhibitions
  for select to authenticated using (public.is_staff());
create policy exhibitions_insert on public.exhibitions
  for insert to authenticated with check (public.has_role('manager'));
create policy exhibitions_update on public.exhibitions
  for update to authenticated
  using (public.has_role('manager')) with check (public.has_role('manager'));
create policy exhibitions_delete on public.exhibitions
  for delete to authenticated using (public.has_role('admin'));

-- Finance: invoices, lines, payments.
do $$
declare
  t text;
begin
  foreach t in array array['invoices', 'invoice_lines', 'payments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_staff())',
      t || '_select', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.can_manage_finance())',
      t || '_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.can_manage_finance()) with check (public.can_manage_finance())',
      t || '_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.has_role(''admin''))',
      t || '_delete', t);
  end loop;
end;
$$;

-- Comments: anyone on the team (member+) can comment as themselves.
alter table public.task_comments enable row level security;
create policy task_comments_select on public.task_comments
  for select to authenticated using (public.is_staff());
create policy task_comments_insert on public.task_comments
  for insert to authenticated
  with check (public.has_role('member') and author_id = public.current_staff_id());
create policy task_comments_update on public.task_comments
  for update to authenticated
  using (author_id = public.current_staff_id())
  with check (author_id = public.current_staff_id());
create policy task_comments_delete on public.task_comments
  for delete to authenticated
  using (author_id = public.current_staff_id() or public.has_role('manager'));

-- Notifications: only the recipient sees or edits theirs; triggers create them.
alter table public.notifications enable row level security;
create policy notifications_select on public.notifications
  for select to authenticated using (recipient_id = public.current_staff_id());
create policy notifications_update on public.notifications
  for update to authenticated
  using (recipient_id = public.current_staff_id())
  with check (recipient_id = public.current_staff_id());
create policy notifications_delete on public.notifications
  for delete to authenticated using (recipient_id = public.current_staff_id());
revoke insert on public.notifications from authenticated;

alter table public.attachments enable row level security;
create policy attachments_select on public.attachments
  for select to authenticated using (public.is_staff());
create policy attachments_insert on public.attachments
  for insert to authenticated with check (public.has_role('member'));
create policy attachments_delete on public.attachments
  for delete to authenticated
  using (uploaded_by = public.current_staff_id() or public.has_role('manager'));

-- ---------------------------------------------------------------------------
-- Live updates: every open screen receives changes to these tables.
-- Realtime applies the same row level security before sending a change.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.exhibitions, public.halls, public.hall_features, public.booths,
      public.companies, public.contacts, public.deals, public.activities,
      public.invoices, public.invoice_lines, public.payments,
      public.inventory_items, public.equipment_orders, public.build_permits,
      public.guest_travel, public.tasks, public.task_comments, public.notifications;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Private storage buckets for hall plans (images/PDF/DWG exports) and documents.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('hall-plans', 'hall-plans', false, 52428800),
  ('documents', 'documents', false, 52428800)
on conflict (id) do nothing;

create policy staff_read_private_files on storage.objects
  for select to authenticated
  using (bucket_id in ('hall-plans', 'documents') and public.is_staff());
create policy staff_upload_private_files on storage.objects
  for insert to authenticated
  with check (bucket_id in ('hall-plans', 'documents') and public.has_role('member'));
create policy staff_update_private_files on storage.objects
  for update to authenticated
  using (bucket_id in ('hall-plans', 'documents') and public.has_role('member'));
create policy staff_delete_private_files on storage.objects
  for delete to authenticated
  using (bucket_id in ('hall-plans', 'documents') and public.has_role('manager'));
