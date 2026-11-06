"use client";

import {
  ArrowRight,
  Bell,
  BellOff,
  Bot,
  Copy,
  CornerUpLeft,
  Hash,
  Info,
  Lock,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { attachmentsOf, groupMessages, splitBody, type ChatAttachment } from "@/lib/portal/chat";
import { localDayKey, num, time, weekdayDate } from "@/lib/portal/format";
import type { ChatMessage, StaffMember } from "@/lib/portal/types";
import { useExhibition } from "../ExhibitionProvider";
import { personName, StaffAvatar } from "../people";
import { useCollection, usePortal } from "../PortalProvider";
import { Button, IconButton, Skeleton } from "../ui";
import { AttachmentView } from "./AttachmentView";
import { ChannelDetails } from "./ChannelDetails";
import { Composer } from "./Composer";
import type { ChatRoom } from "./useChat";

const DAY = 86_400_000;

function dayLabel(lang: "fa" | "en", day: string) {
  const today = localDayKey(new Date());
  const yesterday = localDayKey(new Date(Date.now() - DAY));
  if (day === today) return lang === "fa" ? "امروز" : "Today";
  if (day === yesterday) return lang === "fa" ? "دیروز" : "Yesterday";
  return weekdayDate(lang, day);
}

/** Names people can be @mentioned by: their display name, as the database uses it. */
export function mentionName(s: Pick<StaffMember, "display_name" | "email">) {
  return (s.display_name ?? s.email).trim();
}

export function Conversation({ room, onBack }: { room: ChatRoom; onBack: () => void }) {
  const { lang, user, store } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const { channel, member } = room;
  const messages = useCollection("chat_messages", { column: "channel_id", value: channel.id });
  const channelMembers = useCollection("chat_members", { column: "channel_id", value: channel.id });
  const notifications = useCollection("notifications", { column: "recipient_id", value: user.id });
  const [details, setDetails] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  // Where "new messages" starts: the read marker when the conversation was opened.
  const [readMark] = useState(() => (member && member.unread_count > 0 ? member.last_read_at : null));
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const firstScroll = useRef(true);

  const people = useMemo(
    () => x.staff.filter((s) => s.status === "active").map((s) => ({ id: s.id, name: mentionName(s) })),
    [x.staff],
  );
  const byId = useMemo(() => new Map(messages.rows.map((m) => [m.id, m])), [messages.rows]);
  const days = useMemo(() => groupMessages(messages.rows), [messages.rows]);
  const dividerAt = useMemo(() => {
    if (!readMark) return null;
    for (const d of days) for (const run of d.runs) if (run.messages[0].created_at > readMark && run.messages[0].author_id !== user.id) return run.key;
    return null;
  }, [days, readMark, user.id]);

  // Read on open and whenever something new arrives while it is open.
  const unread = member ? member.unread_count + member.mention_count : 0;
  useEffect(() => {
    if (!member || unread === 0) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    void store.update("chat_members", member.id, { unread_count: 0, mention_count: 0, last_read_at: new Date().toISOString() });
  }, [member, unread, store]);
  const staleNotices = useMemo(
    () => notifications.rows.filter((n) => !n.read_at && n.entity_type === "chat" && n.entity_id === channel.id).map((n) => n.id),
    [notifications.rows, channel.id],
  );
  useEffect(() => {
    if (staleNotices.length) void store.markNotificationsRead(staleNotices);
  }, [staleNotices, store]);

  // Keep the newest message in view unless the reader scrolled up.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || messages.status === "loading") return;
    if (firstScroll.current) {
      firstScroll.current = false;
      const divider = el.querySelector<HTMLElement>("[data-new-divider]");
      if (divider) el.scrollTop = divider.offsetTop - 80;
      else el.scrollTop = el.scrollHeight;
      return;
    }
    if (stick.current) el.scrollTop = el.scrollHeight;
  }, [messages.rows, messages.status]);
  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  const memberCount = channelMembers.rows.length;
  const canPost = !channel.archived_at;
  const isAlerts = channel.slug === "alerts";
  const subtitle =
    channel.kind === "direct"
      ? (room.partner?.job_title ?? "")
      : [channel.topic, memberCount ? `${num(lang, memberCount)} ${fa ? "عضو" : memberCount === 1 ? "member" : "members"}` : null].filter(Boolean).join(fa ? "، " : " · ");

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-p-bg">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-p-line bg-p-surface px-2 sm:px-4">
        <IconButton label={fa ? "بازگشت" : "Back"} className="lg:hidden" onClick={onBack}>
          <ArrowRight className="size-5 ltr:rotate-180" />
        </IconButton>
        {channel.kind === "direct" ? (
          <StaffAvatar staff={room.partner} size={34} />
        ) : (
          <span className={cn("grid size-[34px] shrink-0 place-items-center rounded-xl", isAlerts ? "bg-p-danger-soft text-p-danger" : "bg-p-sunken text-p-ink-2")}>
            {isAlerts ? <Bot className="size-4" /> : channel.is_private ? <Lock className="size-4" /> : <Hash className="size-4" />}
          </span>
        )}
        <button type="button" onClick={() => setDetails(true)} className="min-w-0 flex-1 text-start">
          <span className="block truncate text-[15px] font-bold leading-tight">{room.title}</span>
          {subtitle ? <span className="block truncate text-xs text-p-ink-3">{subtitle}</span> : null}
        </button>
        {member ? (
          <IconButton
            label={member.muted ? (fa ? "صدا را روشن کن" : "Unmute") : fa ? "بی صدا" : "Mute"}
            onClick={() => store.update("chat_members", member.id, { muted: !member.muted })}
            active={member.muted}
          >
            {member.muted ? <BellOff className="size-5" /> : <Bell className="size-5" />}
          </IconButton>
        ) : null}
        <IconButton label={fa ? "درباره این گفتگو" : "About this chat"} onClick={() => setDetails(true)}>
          <Info className="size-5" />
        </IconButton>
      </div>

      {/* Messages */}
      <div ref={scroller} onScroll={onScroll} className="thin-scroll min-h-0 flex-1 overflow-y-auto px-2 py-3 sm:px-5" onClick={() => setSelected(null)}>
        {messages.status === "loading" ? (
          <div className="grid gap-4 p-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="grid flex-1 gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-10 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.rows.length === 0 ? (
          <Welcome room={room} />
        ) : (
          days.map((d) => (
            <Fragment key={d.day}>
              <div className="sticky top-0 z-[1] my-3 flex justify-center">
                <span className="rounded-full border border-p-line bg-p-surface/95 px-3 py-1 text-xs font-medium text-p-ink-2 shadow-[var(--p-shadow)] backdrop-blur">
                  {dayLabel(lang, d.day)}
                </span>
              </div>
              {d.runs.map((run) => {
                const showDivider = run.key === dividerAt;
                return (
                  <Fragment key={run.key}>
                    {showDivider ? (
                      <div data-new-divider className="my-2 flex items-center gap-3 text-xs font-semibold text-p-danger">
                        <span className="h-px flex-1 bg-p-danger/40" />
                        {fa ? "پیام های تازه" : "New messages"}
                        <span className="h-px flex-1 bg-p-danger/40" />
                      </div>
                    ) : null}
                    <Run
                      messages={run.messages}
                      people={people}
                      byId={byId}
                      selected={selected}
                      onSelect={setSelected}
                      editing={editing}
                      onEdit={setEditing}
                      onReply={(m) => setReplyTo(m)}
                    />
                  </Fragment>
                );
              })}
            </Fragment>
          ))
        )}
      </div>

      {/* Composer */}
      {canPost ? (
        <Composer
          channelId={channel.id}
          placeholder={channel.kind === "direct" ? (fa ? `پیام به ${room.title}` : `Message ${room.title}`) : fa ? `پیام در #${room.title}` : `Message #${room.title}`}
          people={people}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onSent={() => {
            stick.current = true;
            setReplyTo(null);
          }}
          joinFirst={!member && channel.kind === "channel"}
        />
      ) : (
        <div className="border-t border-p-line bg-p-surface p-3 text-center text-sm text-p-ink-3">
          {channel.archived_at ? (fa ? "این کانال بایگانی شده است." : "This channel is archived.") : fa ? "دسترسی فقط مشاهده" : "Read-only access"}
        </div>
      )}

      <ChannelDetails open={details} onClose={() => setDetails(false)} room={room} members={channelMembers.rows} onLeft={onBack} />
    </div>
  );
}

function Welcome({ room }: { room: ChatRoom }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  return (
    <div className="mx-auto mt-10 max-w-sm text-center">
      <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-p-brand-soft text-p-brand">
        {room.channel.kind === "direct" ? <StaffAvatar staff={room.partner} size={56} /> : <Hash className="size-6" />}
      </div>
      <p className="text-base font-bold">{room.channel.kind === "direct" ? room.title : `# ${room.title}`}</p>
      <p className="mt-1 text-sm text-p-ink-3">
        {room.channel.kind === "direct"
          ? fa
            ? "این شروع گفتگوی شما دو نفر است. فقط شما دو نفر این پیام ها را می بینید."
            : "This is the start of your conversation. Only the two of you can see it."
          : (room.channel.topic ?? (fa ? "اولین پیام را بنویسید." : "Write the first message."))}
      </p>
    </div>
  );
}

type RunProps = {
  messages: ChatMessage[];
  people: { id: string; name: string }[];
  byId: Map<string, ChatMessage>;
  selected: string | null;
  onSelect: (id: string | null) => void;
  editing: string | null;
  onEdit: (id: string | null) => void;
  onReply: (m: ChatMessage) => void;
};

/** Back-to-back messages from one sender, under one name and picture. */
function Run({ messages, ...rest }: RunProps) {
  const { lang, user } = usePortal();
  const { staffById } = useExhibition();
  const first = messages[0];
  const author = first.author_id ? (staffById.get(first.author_id) ?? null) : null;
  const isBot = !first.author_id;
  const mine = first.author_id === user.id;
  const name = isBot ? (first.bot_name ?? (lang === "fa" ? "سامانه" : "System")) : personName(author, lang);
  return (
    <div className="group/run flex gap-2.5 py-1.5 sm:gap-3">
      <div className="w-9 shrink-0 pt-0.5">
        {isBot ? (
          <span className="grid size-9 place-items-center rounded-full bg-p-gold-soft text-p-gold">
            <Bot className="size-5" />
          </span>
        ) : (
          <StaffAvatar staff={author} size={36} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={cn("text-sm font-bold", mine ? "text-p-brand" : "text-p-ink")}>{name}</span>
          {isBot ? <span className="rounded-md bg-p-gold-soft px-1.5 py-px text-[10px] font-bold text-p-gold">{lang === "fa" ? "دستیار" : "Bot"}</span> : null}
          <span className="text-[11px] text-p-ink-3">{time(lang, first.created_at)}</span>
        </div>
        <div className="grid gap-0.5">
          {messages.map((m) => (
            <MessageLine key={m.id} message={m} mine={mine} {...rest} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageLine({ message: m, mine, people, byId, selected, onSelect, editing, onEdit, onReply }: Omit<RunProps, "messages"> & { message: ChatMessage; mine: boolean }) {
  const { lang, store, can, toast } = usePortal();
  const { staffById } = useExhibition();
  const fa = lang === "fa";
  const files = attachmentsOf(m.attachments);
  const removed = Boolean(m.deleted_at);
  const quoted = m.reply_to ? byId.get(m.reply_to) : undefined;
  const isSelected = selected === m.id;
  const canRemove = !removed && (mine || can.manage);

  if (editing === m.id) return <EditBox message={m} onDone={() => onEdit(null)} />;

  return (
    <div
      className={cn("group relative -mx-1.5 rounded-xl px-1.5 py-0.5", isSelected ? "bg-p-sunken" : "hover:bg-p-sunken/60")}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(isSelected ? null : m.id);
      }}
    >
      {quoted ? (
        <div className="mb-1 mt-0.5 border-s-2 border-p-brand/60 ps-2 text-xs text-p-ink-3">
          <span className="font-semibold text-p-ink-2">
            {quoted.author_id ? personName(staffById.get(quoted.author_id), lang) : (quoted.bot_name ?? "")}
          </span>
          <span className="line-clamp-1">{quoted.deleted_at ? (fa ? "پیام حذف شد" : "Message removed") : quoted.body || "📎"}</span>
        </div>
      ) : null}

      {removed ? (
        <p className="text-sm italic text-p-ink-3">{fa ? "این پیام حذف شد" : "This message was removed"}</p>
      ) : m.kind === "alert" ? (
        <div className="my-0.5 rounded-xl border border-p-danger/30 bg-p-danger-soft/60 px-3 py-2">
          <Body text={m.body} people={people} />
          {m.link?.startsWith("/staff/") ? (
            <Link href={`/${lang}${m.link}`} onClick={(e) => e.stopPropagation()} className="mt-1 inline-block text-xs font-semibold text-p-danger hover:underline">
              {fa ? "باز کردن ←" : "Open →"}
            </Link>
          ) : null}
        </div>
      ) : m.body ? (
        <Body text={m.body} people={people} />
      ) : null}

      {files.length && !removed ? (
        <div className="mt-1 flex flex-wrap gap-2">
          {files.map((f: ChatAttachment) => (
            <AttachmentView key={f.path} file={f} />
          ))}
        </div>
      ) : null}
      {m.edited_at && !removed ? <span className="text-[11px] text-p-ink-3">{fa ? "(ویرایش شد)" : "(edited)"}</span> : null}

      {!removed ? (
        <div
          className={cn(
            "absolute -top-4 end-1 z-[2] flex gap-0.5 rounded-xl border border-p-line bg-p-surface p-0.5 shadow-[var(--p-shadow)] transition-opacity",
            isSelected ? "opacity-100" : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <IconButton size="sm" label={fa ? "پاسخ" : "Reply"} onClick={() => { onReply(m); onSelect(null); }}>
            <CornerUpLeft className="size-4" />
          </IconButton>
          {m.body ? (
            <IconButton
              size="sm"
              label={fa ? "کپی" : "Copy"}
              onClick={() => {
                void navigator.clipboard?.writeText(m.body).then(() => toast(fa ? "کپی شد" : "Copied"));
                onSelect(null);
              }}
            >
              <Copy className="size-4" />
            </IconButton>
          ) : null}
          {mine && m.kind === "text" ? (
            <IconButton size="sm" label={fa ? "ویرایش" : "Edit"} onClick={() => { onEdit(m.id); onSelect(null); }}>
              <Pencil className="size-4" />
            </IconButton>
          ) : null}
          {canRemove ? (
            <IconButton
              size="sm"
              label={fa ? "حذف" : "Remove"}
              className="text-p-danger"
              onClick={() => {
                if (window.confirm(fa ? "این پیام حذف شود؟" : "Remove this message?")) void store.update("chat_messages", m.id, { deleted_at: new Date().toISOString() });
                onSelect(null);
              }}
            >
              <Trash2 className="size-4" />
            </IconButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Message text with @mentions highlighted and links clickable. Keeps line breaks. */
function Body({ text, people }: { text: string; people: { id: string; name: string }[] }) {
  const { user } = usePortal();
  const parts = useMemo(() => splitBody(text, people), [text, people]);
  return (
    <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-p-ink" dir="auto">
      {parts.map((p, i) =>
        p.kind === "mention" ? (
          <span key={i} className={cn("rounded px-0.5 font-semibold", p.id === user.id ? "bg-p-gold-soft text-p-gold" : "bg-p-brand-soft text-p-brand")}>
            {p.value}
          </span>
        ) : p.kind === "link" ? (
          <a key={i} href={p.value} target="_blank" rel="noreferrer noopener" className="text-p-info underline underline-offset-2" onClick={(e) => e.stopPropagation()} dir="ltr">
            {p.value}
          </a>
        ) : (
          <Fragment key={i}>{p.value}</Fragment>
        ),
      )}
    </p>
  );
}

function EditBox({ message, onDone }: { message: ChatMessage; onDone: () => void }) {
  const { lang, store } = usePortal();
  const fa = lang === "fa";
  const [value, setValue] = useState(message.body);
  const save = async () => {
    const body = value.trim();
    if (body && body !== message.body) await store.update("chat_messages", message.id, { body });
    onDone();
  };
  return (
    <div className="my-1 grid gap-2 rounded-xl border border-p-brand bg-p-surface p-2">
      <textarea
        autoFocus
        dir="auto"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onDone();
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void save();
          }
        }}
        rows={Math.min(6, value.split("\n").length + 1)}
        className="w-full resize-none bg-transparent text-[15px] leading-7 outline-none"
      />
      <div className="flex justify-end gap-2">
        <Button size="sm" tone="ghost" onClick={onDone}>
          {fa ? "انصراف" : "Cancel"}
        </Button>
        <Button size="sm" tone="primary" onClick={() => void save()}>
          {fa ? "ذخیره" : "Save"}
        </Button>
      </div>
    </div>
  );
}
