"use client";

import { AtSign, Loader2, Paperclip, SendHorizontal, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { CHAT_MAX_FILE_BYTES, findMentions, mentionQuery, storageName, type ChatAttachment } from "@/lib/portal/chat";
import { newId } from "@/lib/portal/store";
import type { ChatMessage } from "@/lib/portal/types";
import { useExhibition } from "../ExhibitionProvider";
import { personName, StaffAvatar } from "../people";
import { usePortal } from "../PortalProvider";
import { normalizeSearch } from "../SearchPalette";
import { IconButton } from "../ui";

type Pending = ChatAttachment & { key: string; uploading: boolean };

function coarsePointer() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

/**
 * Where messages are written. Enter sends on a computer (Shift+Enter for a new
 * line); on a phone the send button sends. Typing @ suggests colleagues.
 */
export function Composer({
  channelId,
  placeholder,
  people,
  replyTo,
  onCancelReply,
  onSent,
  joinFirst,
}: {
  channelId: string;
  placeholder: string;
  people: { id: string; name: string }[];
  replyTo: ChatMessage | null;
  onCancelReply: () => void;
  onSent: () => void;
  joinFirst: boolean;
}) {
  const { lang, store, user, toast } = usePortal();
  const { staffById } = useExhibition();
  const fa = lang === "fa";
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Pending[]>([]);
  const [cursor, setCursor] = useState(0);
  const [highlight, setHighlight] = useState(0);
  const area = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  const mq = mentionQuery(text, cursor);
  const suggestions = useMemo(() => {
    if (!mq) return [];
    const q = normalizeSearch(mq.query);
    return people.filter((p) => p.id !== user.id && (!q || normalizeSearch(p.name).includes(q))).slice(0, 6);
  }, [mq, people, user.id]);

  const uploading = files.some((f) => f.uploading);
  const ready = (text.trim().length > 0 || files.length > 0) && !uploading;

  const pickMention = (p: { id: string; name: string }) => {
    if (!mq) return;
    const before = text.slice(0, mq.start);
    const after = text.slice(cursor);
    const next = `${before}@${p.name} ${after.replace(/^\S*/, "")}`;
    const pos = before.length + p.name.length + 2;
    setText(next);
    setCursor(pos);
    requestAnimationFrame(() => {
      area.current?.focus();
      area.current?.setSelectionRange(pos, pos);
    });
  };

  const insertAt = () => {
    const el = area.current;
    const pos = el?.selectionStart ?? text.length;
    const needsSpace = pos > 0 && !/\s$/.test(text.slice(0, pos));
    const next = `${text.slice(0, pos)}${needsSpace ? " " : ""}@${text.slice(pos)}`;
    const at = pos + (needsSpace ? 2 : 1);
    setText(next);
    setCursor(at);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at, at);
    });
  };

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    for (const file of Array.from(list)) {
      if (file.size > CHAT_MAX_FILE_BYTES) {
        toast(fa ? `«${file.name}» بزرگ تر از ۲۵ مگابایت است` : `"${file.name}" is over 25 MB`, "error");
        continue;
      }
      const key = newId();
      const path = `chat/${channelId}/${key}/${storageName(file.name)}`;
      const entry: Pending = { key, path, name: file.name, type: file.type || "application/octet-stream", size: file.size, uploading: true };
      setFiles((f) => [...f, entry]);
      const result = await store.uploadFile("documents", path, file);
      if (result.ok) setFiles((f) => f.map((x) => (x.key === key ? { ...x, uploading: false } : x)));
      else {
        setFiles((f) => f.filter((x) => x.key !== key));
        toast(fa ? `«${file.name}» بارگذاری نشد` : `"${file.name}" didn't upload`, "error");
      }
    }
  };

  const send = async () => {
    if (!ready) return;
    const body = text.trim();
    const attachments = files.map(({ path, name, type, size }) => ({ path, name, type, size }));
    const reply = replyTo?.id ?? null;
    setText("");
    setFiles([]);
    setCursor(0);
    onSent();
    const result = await store.insert("chat_messages", {
      id: newId(),
      channel_id: channelId,
      author_id: user.id,
      body,
      mentions: findMentions(body, people),
      attachments,
      reply_to: reply,
      created_at: new Date().toISOString(),
    });
    if (!result.ok) {
      // Give the words back so nothing typed is lost.
      setText(body);
    }
  };

  const replyName = replyTo ? (replyTo.author_id ? personName(staffById.get(replyTo.author_id), lang) : (replyTo.bot_name ?? "")) : "";

  return (
    <div className="relative shrink-0 border-t border-p-line bg-p-surface px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-4">
      {suggestions.length ? (
        <div className="absolute inset-x-2 bottom-full mb-1 rounded-2xl border border-p-line bg-p-surface p-1 shadow-[var(--p-shadow-lg)] sm:inset-x-4">
          {suggestions.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pickMention(p)}
              className={cn("flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-sm", i === highlight ? "bg-p-brand-soft text-p-brand" : "hover:bg-p-sunken")}
            >
              <StaffAvatar staff={staffById.get(p.id)} size={26} />
              <span className="flex-1 truncate font-medium">{p.name}</span>
              <span className="text-xs text-p-ink-3">{staffById.get(p.id)?.job_title}</span>
            </button>
          ))}
        </div>
      ) : null}

      {replyTo ? (
        <div className="mb-2 flex items-start gap-2 rounded-xl bg-p-sunken px-3 py-2 text-xs">
          <div className="min-w-0 flex-1 border-s-2 border-p-brand ps-2">
            <span className="font-semibold text-p-brand">{fa ? `پاسخ به ${replyName}` : `Replying to ${replyName}`}</span>
            <span className="line-clamp-1 text-p-ink-3">{replyTo.body || "📎"}</span>
          </div>
          <IconButton size="sm" label={fa ? "لغو پاسخ" : "Cancel reply"} onClick={onCancelReply}>
            <X className="size-4" />
          </IconButton>
        </div>
      ) : null}

      {files.length ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((f) => (
            <span key={f.key} className="inline-flex max-w-full items-center gap-1.5 rounded-xl border border-p-line bg-p-sunken px-2.5 py-1.5 text-xs">
              {f.uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Paperclip className="size-3.5" />}
              <span className="max-w-48 truncate">{f.name}</span>
              <button type="button" aria-label={fa ? "برداشتن" : "Remove"} onClick={() => setFiles((list) => list.filter((x) => x.key !== f.key))} className="text-p-ink-3 hover:text-p-danger">
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {joinFirst ? (
        <p className="mb-1.5 px-1 text-xs text-p-ink-3">{fa ? "با فرستادن پیام به این کانال می پیوندید." : "Sending a message joins this channel."}</p>
      ) : null}

      <div className="flex items-end gap-1.5">
        <input ref={picker} type="file" multiple hidden onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
        <IconButton label={fa ? "پیوست فایل یا عکس" : "Attach a file or photo"} onClick={() => picker.current?.click()}>
          <Paperclip className="size-5" />
        </IconButton>
        <IconButton label={fa ? "نام بردن از همکار" : "Mention a colleague"} onClick={insertAt}>
          <AtSign className="size-5" />
        </IconButton>
        <textarea
          ref={area}
          dir="auto"
          value={text}
          rows={1}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value);
            setCursor(e.target.selectionStart);
            setHighlight(0);
          }}
          onSelect={(e) => setCursor(e.currentTarget.selectionStart)}
          onPaste={(e) => {
            if (e.clipboardData.files.length) {
              e.preventDefault();
              void addFiles(e.clipboardData.files);
            }
          }}
          onKeyDown={(e) => {
            if (suggestions.length) {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((h) => (h + (e.key === "ArrowDown" ? 1 : suggestions.length - 1)) % suggestions.length);
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                pickMention(suggestions[Math.min(highlight, suggestions.length - 1)]);
                return;
              }
            }
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !coarsePointer()) {
              e.preventDefault();
              void send();
            }
          }}
          className="thin-scroll max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-p-line bg-p-bg px-3.5 py-2.5 text-[15px] leading-6 outline-none transition-colors [field-sizing:content] placeholder:text-p-ink-3 focus:border-p-brand"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={!ready}
          aria-label={fa ? "فرستادن" : "Send"}
          title={fa ? "فرستادن" : "Send"}
          className="grid size-11 shrink-0 place-items-center rounded-2xl bg-p-brand text-p-brand-ink shadow-[var(--p-shadow)] transition-[filter,opacity] hover:brightness-110 disabled:opacity-40"
        >
          <SendHorizontal className="size-5 rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
}
