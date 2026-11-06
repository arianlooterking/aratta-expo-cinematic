// Team chat helpers shared by the screens, the in-browser demo and the tests.
// The database does the same work in supabase/migrations/*_team_chat.sql.

export type ChatAttachment = { path: string; name: string; type: string; size: number };

type ChannelLike = { id: string; kind: "channel" | "direct"; name: string | null; dm_key: string | null; is_private: boolean };
type MemberLike = { id: string; channel_id: string; staff_id: string; unread_count: number; mention_count: number; muted: boolean };
type MessageLike = {
  id: string;
  channel_id: string;
  author_id: string | null;
  bot_name: string | null;
  kind: string;
  body: string;
  mentions: string[];
  attachments: unknown;
  created_at: string;
  deleted_at?: string | null;
};
type Person = { id: string; name: string };

/** Direct conversations are keyed by the two staff ids, sorted, so a pair has one. */
export function dmKey(a: string, b: string) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/** The other person in a direct conversation (yourself for notes-to-self). */
export function dmPartner(channel: Pick<ChannelLike, "dm_key">, me: string) {
  if (!channel.dm_key) return null;
  const [a, b] = channel.dm_key.split(":");
  return a === me ? b : a;
}

export function attachmentsOf(value: unknown): ChatAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (a): a is ChatAttachment => Boolean(a) && typeof a === "object" && typeof (a as ChatAttachment).path === "string",
  );
}

/** The short line shown under a conversation's name. */
export function chatPreview(body: string, attachments: unknown) {
  const text = body.trim().replace(/\s+/g, " ");
  if (text) return text.slice(0, 140);
  const files = attachmentsOf(attachments);
  return files.length ? `📎 ${files[0].name || "فایل"}` : "";
}

/** Everyone whose "@name" is still in the text. Longer names win over their prefixes. */
export function findMentions(text: string, people: readonly Person[]) {
  const found = new Set<string>();
  const sorted = [...people].filter((p) => p.name.trim()).sort((a, b) => b.name.length - a.name.length);
  let rest = text;
  for (const p of sorted) {
    const token = `@${p.name.trim()}`;
    if (rest.includes(token)) {
      found.add(p.id);
      rest = rest.split(token).join(" ");
    }
  }
  return [...found];
}

export type BodyPart = { kind: "text" | "mention" | "link"; value: string; id?: string };

/** Split a message into plain text, @mentions of known people and web links. */
export function splitBody(text: string, people: readonly Person[]): BodyPart[] {
  const names = [...people].filter((p) => p.name.trim()).sort((a, b) => b.name.length - a.name.length);
  const escaped = names.map((p) => `@${p.name.trim()}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp([...escaped, "https?:\\/\\/[^\\s]+"].join("|"), "g");
  const parts: BodyPart[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last) parts.push({ kind: "text", value: text.slice(last, at) });
    const value = match[0];
    if (value.startsWith("@")) {
      const person = names.find((p) => `@${p.name.trim()}` === value);
      parts.push({ kind: "mention", value, id: person?.id });
    } else {
      // Keep closing punctuation out of the link.
      const trimmed = value.replace(/[.,،؛!?)»]+$/u, "");
      parts.push({ kind: "link", value: trimmed });
      if (trimmed.length < value.length) parts.push({ kind: "text", value: value.slice(trimmed.length) });
    }
    last = at + value.length;
  }
  if (last < text.length) parts.push({ kind: "text", value: text.slice(last) });
  return parts;
}

/** The word typed after "@" right before the cursor, for the mention picker. */
export function mentionQuery(text: string, cursor: number) {
  const before = text.slice(0, cursor);
  const match = /(^|\s)@([^\s@]*)$/u.exec(before);
  return match ? { query: match[2], start: before.length - match[2].length - 1 } : null;
}

const RUN_GAP_MS = 5 * 60_000;

export type MessageRun<M> = { key: string; author: string; messages: M[] };
export type DayGroup<M> = { day: string; runs: MessageRun<M>[] };

function dayOf(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Messages in time order, grouped by local day, with back-to-back messages
 * from the same sender (within five minutes) folded under one name.
 */
export function groupMessages<M extends Pick<MessageLike, "id" | "author_id" | "bot_name" | "kind" | "created_at">>(messages: readonly M[]) {
  const sorted = [...messages].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const days: DayGroup<M>[] = [];
  for (const m of sorted) {
    const day = dayOf(m.created_at);
    let group = days.at(-1);
    if (!group || group.day !== day) {
      group = { day, runs: [] };
      days.push(group);
    }
    const author = m.author_id ?? `bot:${m.bot_name ?? ""}`;
    const run = group.runs.at(-1);
    const previous = run?.messages.at(-1);
    const joins =
      run &&
      previous &&
      run.author === author &&
      m.kind === "text" &&
      previous.kind === "text" &&
      new Date(m.created_at).getTime() - new Date(previous.created_at).getTime() < RUN_GAP_MS;
    if (joins) run.messages.push(m);
    else group.runs.push({ key: m.id, author, messages: [m] });
  }
  return days;
}

/** Badge numbers for the menu. Muted conversations only count when someone @mentions you. */
export function unreadTotals(members: readonly Pick<MemberLike, "unread_count" | "mention_count" | "muted">[]) {
  let unread = 0;
  let mentions = 0;
  let badge = 0;
  for (const m of members) {
    mentions += m.mention_count;
    if (!m.muted) unread += m.unread_count;
    badge += m.muted ? m.mention_count : m.unread_count;
  }
  return { unread, mentions, badge };
}

export type ChatNotice = { recipient_id: string; kind: "chat.direct" | "chat.mention"; title: string; body: string; link: string };

/**
 * What a new message changes, as the database trigger does it: membership
 * counters for everyone else, and notifications for a direct message or a mention.
 */
export function afterChatMessage(
  message: MessageLike,
  channel: ChannelLike,
  members: readonly MemberLike[],
  senderName: string,
) {
  const counters = members
    .filter((m) => m.channel_id === channel.id && m.staff_id !== message.author_id)
    .map((m) => ({
      id: m.id,
      unread_count: m.unread_count + 1,
      mention_count: m.mention_count + (message.mentions.includes(m.staff_id) ? 1 : 0),
    }));
  const title = channel.kind === "direct" ? `پیام از ${senderName}` : `${senderName} در #${channel.name ?? ""}`;
  const preview = chatPreview(message.body, message.attachments).slice(0, 280);
  const link = `/staff/chat?c=${channel.id}`;
  const notices: ChatNotice[] = members
    .filter(
      (m) =>
        m.channel_id === channel.id &&
        m.staff_id !== message.author_id &&
        !m.muted &&
        (channel.kind === "direct" || message.mentions.includes(m.staff_id)),
    )
    .map((m) => ({ recipient_id: m.staff_id, kind: channel.kind === "direct" ? "chat.direct" : "chat.mention", title, body: preview, link }));
  return { counters, notices, preview };
}

/** A safe file name for storage: keeps the extension, drops anything odd. */
export function storageName(name: string) {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) : "";
  return ext ? `file.${ext}` : "file";
}

export function isImage(a: Pick<ChatAttachment, "type">) {
  return /^image\/(png|jpe?g|gif|webp|heic|heif|avif)$/i.test(a.type);
}

export const CHAT_MAX_FILE_BYTES = 25 * 1024 * 1024;
