-- Team chat: channels everyone can see, private channels, direct messages
-- between two colleagues, and messages posted by the system or an AI agent.
--
-- Unread counts live on each person's membership row, so a phone only has to
-- listen to its own rows to keep the badges right. Direct messages and
-- @mentions also create a notification, which the push function sends on.

create type public.chat_kind as enum ('channel', 'direct');

create table public.chat_channels (
  id uuid primary key default gen_random_uuid(),
  kind public.chat_kind not null default 'channel',
  -- Well-known channels the system posts into ("general", "alerts").
  slug text unique,
  name text,
  topic text,
  is_private boolean not null default false,
  -- Everyone joins a default channel, including people invited later.
  is_default boolean not null default false,
  exhibition_id uuid references public.exhibitions (id) on delete set null,
  -- Direct messages: the two staff ids, sorted, so a pair has one conversation.
  dm_key text unique,
  created_by uuid references public.staff_members (id) on delete set null default public.current_staff_id(),
  last_message_at timestamptz,
  last_message_preview text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_channels_shape check (
    (kind = 'channel' and name is not null and length(trim(name)) > 0 and dm_key is null)
    or (kind = 'direct' and dm_key is not null and not is_default)
  )
);

create trigger chat_channels_touch
before update on public.chat_channels
for each row execute function public.touch_updated_at();

create table public.chat_members (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.chat_channels (id) on delete cascade,
  staff_id uuid not null references public.staff_members (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  unread_count integer not null default 0 check (unread_count >= 0),
  mention_count integer not null default 0 check (mention_count >= 0),
  muted boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (channel_id, staff_id)
);

create index chat_members_staff_idx on public.chat_members (staff_id);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.chat_channels (id) on delete cascade,
  author_id uuid references public.staff_members (id) on delete set null default public.current_staff_id(),
  -- Set when the system or an AI agent posted the message ("دستیار اَرَتَ", "Grok").
  bot_name text,
  kind text not null default 'text' check (kind in ('text', 'alert', 'system')),
  body text not null default '',
  mentions uuid[] not null default '{}',
  -- [{ "path": "chat/<channel>/<file>", "name": "...", "type": "image/jpeg", "size": 1234 }]
  attachments jsonb not null default '[]'::jsonb check (jsonb_typeof(attachments) = 'array'),
  reply_to uuid references public.chat_messages (id) on delete set null,
  link text,
  entity_type text,
  entity_id uuid,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint chat_messages_not_empty check (
    deleted_at is not null or length(trim(body)) > 0 or jsonb_array_length(attachments) > 0
  ),
  constraint chat_messages_body_length check (length(body) <= 8000)
);

create index chat_messages_channel_idx on public.chat_messages (channel_id, created_at);

-- ---------------------------------------------------------------------------
-- Who can read a conversation
-- ---------------------------------------------------------------------------
create or replace function public.chat_is_member(p_channel uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.chat_members
    where channel_id = p_channel and staff_id = public.current_staff_id()
  );
$$;

create or replace function public.chat_can_read(p_channel uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_staff() and exists (
    select 1 from public.chat_channels c
    where c.id = p_channel
      and ((c.kind = 'channel' and not c.is_private) or public.chat_is_member(c.id))
  );
$$;

create or replace function public.chat_can_post(p_channel uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.chat_can_read(p_channel)
    and exists (select 1 from public.chat_channels where id = p_channel and archived_at is null);
$$;

-- ---------------------------------------------------------------------------
-- Channel rules
-- ---------------------------------------------------------------------------
create or replace function public.chat_channel_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    -- What a conversation is never changes after it is made.
    new.kind := old.kind;
    new.dm_key := old.dm_key;
    new.slug := old.slug;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  if new.kind = 'channel' then
    new.name := trim(regexp_replace(new.name, '^#+', ''));
  end if;
  return new;
end;
$$;

create trigger chat_channels_guard
before insert or update on public.chat_channels
for each row execute function public.chat_channel_guard();

-- The creator joins their channel; a default channel takes the whole team.
create or replace function public.chat_channel_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind <> 'channel' then
    return new;
  end if;
  if new.is_default then
    insert into public.chat_members (channel_id, staff_id)
    select new.id, s.id from public.staff_members s where s.status = 'active'
    on conflict do nothing;
  elsif new.created_by is not null then
    insert into public.chat_members (channel_id, staff_id) values (new.id, new.created_by)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger chat_channels_after_insert
after insert on public.chat_channels
for each row execute function public.chat_channel_after_insert();

-- New colleagues land in the default channels the moment their account is active.
create or replace function public.chat_join_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    insert into public.chat_members (channel_id, staff_id)
    select c.id, new.id from public.chat_channels c where c.is_default and c.archived_at is null
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger staff_members_chat_defaults
after insert or update of status on public.staff_members
for each row execute function public.chat_join_defaults();

-- Members only change their own read marker and mute switch.
create or replace function public.chat_member_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.channel_id := old.channel_id;
  new.staff_id := old.staff_id;
  new.joined_at := old.joined_at;
  return new;
end;
$$;

create trigger chat_members_guard
before update on public.chat_members
for each row execute function public.chat_member_guard();

-- ---------------------------------------------------------------------------
-- Message rules
-- ---------------------------------------------------------------------------
create or replace function public.chat_message_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  me uuid := public.current_staff_id();
begin
  new.body := coalesce(new.body, '');
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.edited_at := null;
    new.deleted_at := null;
    -- Mentions only name real colleagues, once each.
    new.mentions := coalesce((
      select array_agg(distinct m) from unnest(new.mentions) as m
      where exists (select 1 from public.staff_members s where s.id = m)
    ), '{}');
    if new.reply_to is not null
       and not exists (select 1 from public.chat_messages where id = new.reply_to and channel_id = new.channel_id) then
      new.reply_to := null;
    end if;
    return new;
  end if;

  -- Updates: the conversation, author and time are fixed.
  new.channel_id := old.channel_id;
  new.author_id := old.author_id;
  new.bot_name := old.bot_name;
  new.kind := old.kind;
  new.created_at := old.created_at;
  new.reply_to := old.reply_to;
  new.link := old.link;
  new.entity_type := old.entity_type;
  new.entity_id := old.entity_id;
  new.mentions := old.mentions;

  if old.deleted_at is not null then
    -- A removed message stays removed.
    return old;
  end if;

  if new.deleted_at is not null then
    new.deleted_at := now();
    new.body := '';
    new.attachments := '[]'::jsonb;
    return new;
  end if;

  -- Only the author edits the words; a manager may only remove.
  if me is distinct from old.author_id and me is not null then
    new.body := old.body;
    new.attachments := old.attachments;
    return new;
  end if;

  if new.body is distinct from old.body or new.attachments is distinct from old.attachments then
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;
  return new;
end;
$$;

create trigger chat_messages_before_write
before insert or update on public.chat_messages
for each row execute function public.chat_message_before_write();

create or replace function public.chat_preview(p_body text, p_attachments jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when length(trim(coalesce(p_body, ''))) > 0 then left(regexp_replace(trim(p_body), '\s+', ' ', 'g'), 140)
    when jsonb_array_length(coalesce(p_attachments, '[]'::jsonb)) > 0 then '📎 ' || coalesce(p_attachments -> 0 ->> 'name', 'فایل')
    else ''
  end;
$$;

-- After a message: bump unread counts, remember the latest line, and notify
-- the other person in a direct message or anyone @mentioned.
create or replace function public.chat_message_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ch public.chat_channels;
  sender text;
  preview text := public.chat_preview(new.body, new.attachments);
  where_label text;
begin
  select * into ch from public.chat_channels where id = new.channel_id;

  update public.chat_channels
  set last_message_at = new.created_at, last_message_preview = preview
  where id = new.channel_id;

  -- Writing in a public channel joins it.
  if new.author_id is not null then
    insert into public.chat_members (channel_id, staff_id, last_read_at)
    values (new.channel_id, new.author_id, now())
    on conflict (channel_id, staff_id) do update set last_read_at = now(), unread_count = 0, mention_count = 0;
  end if;

  update public.chat_members m
  set unread_count = m.unread_count + 1,
      mention_count = m.mention_count + (case when m.staff_id = any (new.mentions) then 1 else 0 end)
  where m.channel_id = new.channel_id and m.staff_id is distinct from new.author_id;

  sender := coalesce(
    new.bot_name,
    (select coalesce(s.display_name, s.email) from public.staff_members s where s.id = new.author_id),
    'همکار'
  );
  where_label := case when ch.kind = 'direct' then 'پیام از ' || sender else sender || ' در #' || ch.name end;

  insert into public.notifications (recipient_id, actor_id, kind, title, body, entity_type, entity_id, link)
  select m.staff_id,
         new.author_id,
         case when ch.kind = 'direct' then 'chat.direct' else 'chat.mention' end,
         where_label,
         left(preview, 280),
         'chat',
         new.channel_id,
         '/staff/chat?c=' || new.channel_id
  from public.chat_members m
  where m.channel_id = new.channel_id
    and m.staff_id is distinct from new.author_id
    and not m.muted
    and (ch.kind = 'direct' or m.staff_id = any (new.mentions));

  -- Someone @mentioned in a public channel they have not joined still hears about it.
  if ch.kind = 'channel' and not ch.is_private then
    insert into public.notifications (recipient_id, actor_id, kind, title, body, entity_type, entity_id, link)
    select s.id, new.author_id, 'chat.mention', where_label, left(preview, 280), 'chat', new.channel_id,
           '/staff/chat?c=' || new.channel_id
    from public.staff_members s
    where s.id = any (new.mentions)
      and s.id is distinct from new.author_id
      and s.status = 'active'
      and not exists (select 1 from public.chat_members m where m.channel_id = new.channel_id and m.staff_id = s.id);
  end if;
  return new;
end;
$$;

create trigger chat_messages_after_insert
after insert on public.chat_messages
for each row execute function public.chat_message_after_insert();

-- ---------------------------------------------------------------------------
-- Calls from the app
-- ---------------------------------------------------------------------------

-- Open (or find) the one direct conversation with a colleague.
create or replace function public.chat_open_direct(p_staff uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := public.current_staff_id();
  key text;
  channel uuid;
begin
  if me is null then
    raise exception 'not signed in as staff' using errcode = '42501';
  end if;
  if not exists (select 1 from public.staff_members where id = p_staff and status <> 'suspended') then
    raise exception 'unknown colleague' using errcode = '22023';
  end if;
  key := least(me::text, p_staff::text) || ':' || greatest(me::text, p_staff::text);
  select id into channel from public.chat_channels where dm_key = key;
  if channel is null then
    insert into public.chat_channels (kind, dm_key, created_by)
    values ('direct', key, me)
    on conflict (dm_key) do nothing
    returning id into channel;
    if channel is null then
      select id into channel from public.chat_channels where dm_key = key;
    end if;
  end if;
  insert into public.chat_members (channel_id, staff_id)
  values (channel, me), (channel, p_staff)
  on conflict do nothing;
  return channel;
end;
$$;

-- System and AI-agent messages. Not callable from the browser: only database
-- triggers and the server-side agent endpoint (service role) post as a bot.
create or replace function public.chat_post_as_bot(
  p_channel text,
  p_bot text,
  p_body text,
  p_kind text default 'alert',
  p_link text default null,
  p_entity_type text default null,
  p_entity_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  channel uuid;
  message uuid;
begin
  select id into channel from public.chat_channels
  where (slug = p_channel or id::text = p_channel) and kind = 'channel' and archived_at is null;
  if channel is null then
    raise exception 'unknown channel %', p_channel using errcode = '22023';
  end if;
  if coalesce(trim(p_bot), '') = '' or coalesce(trim(p_body), '') = '' then
    raise exception 'bot name and text are required' using errcode = '22023';
  end if;
  insert into public.chat_messages (channel_id, author_id, bot_name, kind, body, link, entity_type, entity_id)
  values (channel, null, left(trim(p_bot), 60), coalesce(p_kind, 'alert'), left(p_body, 8000), p_link, p_entity_type, p_entity_id)
  returning id into message;
  return message;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.chat_channels, public.chat_members, public.chat_messages to authenticated;
grant all on public.chat_channels, public.chat_members, public.chat_messages to service_role;
grant execute on function
  public.chat_is_member(uuid),
  public.chat_can_read(uuid),
  public.chat_can_post(uuid),
  public.chat_open_direct(uuid)
to authenticated;
revoke execute on function public.chat_post_as_bot(text, text, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.chat_post_as_bot(text, text, text, text, text, text, uuid) to service_role;
revoke execute on function
  public.chat_channel_after_insert(),
  public.chat_join_defaults(),
  public.chat_message_after_insert()
from public, authenticated;

alter table public.chat_channels enable row level security;
create policy chat_channels_select on public.chat_channels
  for select to authenticated
  using (
    public.is_staff()
    and ((kind = 'channel' and not is_private) or public.chat_is_member(id) or created_by = public.current_staff_id())
  );
-- Direct conversations are only made through chat_open_direct.
create policy chat_channels_insert on public.chat_channels
  for insert to authenticated
  with check (
    public.has_role('member') and kind = 'channel' and slug is null and not is_default
    and created_by = public.current_staff_id()
  );
create policy chat_channels_update on public.chat_channels
  for update to authenticated
  using (kind = 'channel' and (created_by = public.current_staff_id() or public.has_role('manager')))
  with check (kind = 'channel' and (created_by = public.current_staff_id() or public.has_role('manager')));
create policy chat_channels_delete on public.chat_channels
  for delete to authenticated
  using (kind = 'channel' and slug is null and public.has_role('manager'));

alter table public.chat_members enable row level security;
create policy chat_members_select on public.chat_members
  for select to authenticated
  using (staff_id = public.current_staff_id() or public.chat_can_read(channel_id));
-- Join a public channel yourself; the channel's maker or a manager adds others.
create policy chat_members_insert on public.chat_members
  for insert to authenticated
  with check (
    public.is_staff()
    and exists (
      select 1 from public.chat_channels c
      where c.id = channel_id and c.kind = 'channel'
        and (
          (staff_id = public.current_staff_id() and not c.is_private)
          or (public.chat_is_member(c.id) and (c.created_by = public.current_staff_id() or public.has_role('manager')))
        )
    )
  );
create policy chat_members_update on public.chat_members
  for update to authenticated
  using (staff_id = public.current_staff_id())
  with check (staff_id = public.current_staff_id());
create policy chat_members_delete on public.chat_members
  for delete to authenticated
  using (
    (staff_id = public.current_staff_id()
      and exists (select 1 from public.chat_channels c where c.id = channel_id and c.kind = 'channel' and not c.is_default))
    or (public.has_role('manager') and exists (select 1 from public.chat_channels c where c.id = channel_id and c.kind = 'channel'))
  );

alter table public.chat_messages enable row level security;
create policy chat_messages_select on public.chat_messages
  for select to authenticated using (public.chat_can_read(channel_id));
create policy chat_messages_insert on public.chat_messages
  for insert to authenticated
  with check (
    author_id = public.current_staff_id()
    and bot_name is null
    and kind = 'text'
    and public.chat_can_post(channel_id)
  );
-- Edit or remove your own; managers can remove anyone's (the trigger keeps their words).
create policy chat_messages_update on public.chat_messages
  for update to authenticated
  using (author_id = public.current_staff_id() or (public.has_role('manager') and public.chat_can_read(channel_id)))
  with check (author_id = public.current_staff_id() or (public.has_role('manager') and public.chat_can_read(channel_id)));
revoke delete on public.chat_messages from authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.chat_channels, public.chat_members, public.chat_messages;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- The channels every team starts with
-- ---------------------------------------------------------------------------
insert into public.chat_channels (slug, name, topic, is_default, created_by) values
  ('general', 'گفتگوی عمومی', 'همه همکاران اینجا هستند. خبرها و هماهنگی روزانه.', true, null),
  ('sales', 'فروش', 'مشتری ها، پیگیری ها و قراردادها', true, null),
  ('operations', 'اجرا و سالن', 'ساخت غرفه، برق، مبلمان، تحویل و تخلیه', true, null),
  ('alerts', 'هشدارها', 'پیام های خودکار سامانه و دستیارها', true, null);

-- ---------------------------------------------------------------------------
-- Booth problems (the red flag) also land in #هشدارها, when that feature exists.
-- ---------------------------------------------------------------------------
create or replace function public.chat_problem_alert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  booth_code text;
  step_label text;
  text_out text;
begin
  select code into booth_code from public.booths where id = new.booth_id;
  step_label := case new.step::text
    when 'furniture_list' then 'فهرست مبلمان'
    when 'build' then 'ساخت غرفه'
    when 'power' then 'برق'
    when 'delivery' then 'ارسال مبلمان'
    when 'handover' then 'تحویل غرفه'
    when 'collection' then 'جمع آوری'
    when 'clearance' then 'تخلیه'
    when 'payment' then 'پرداخت'
    else 'سایر'
  end;
  if tg_op = 'INSERT' then
    text_out := '🔴 مشکل در ' || coalesce('غرفه ' || booth_code, 'یک غرفه') || ' (' || step_label || ')'
      || coalesce(': ' || nullif(trim(new.note), ''), '');
  elsif new.resolved_at is not null and old.resolved_at is null then
    text_out := '✅ مشکل ' || coalesce('غرفه ' || booth_code, 'غرفه') || ' (' || step_label || ') برطرف شد'
      || coalesce(': ' || nullif(trim(new.resolution), ''), '');
  else
    return new;
  end if;
  perform public.chat_post_as_bot('alerts', 'دستیار اَرَتَ', text_out, 'alert', '/staff/problems', 'problem', new.id);
  return new;
end;
$$;

revoke execute on function public.chat_problem_alert() from public, authenticated;

do $$
begin
  if to_regclass('public.problems') is not null then
    execute 'create trigger problems_chat_alert
      after insert or update of resolved_at on public.problems
      for each row execute function public.chat_problem_alert()';
  end if;
end;
$$;
