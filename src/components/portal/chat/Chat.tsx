"use client";

import { Bot, Hash, Lock, MessageSquarePlus, MessagesSquare, Plus, Search, VolumeX } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { num, relativeTime } from "@/lib/portal/format";
import { useExhibition } from "../ExhibitionProvider";
import { personName, StaffAvatar } from "../people";
import { usePortal } from "../PortalProvider";
import { normalizeSearch } from "../SearchPalette";
import { Button, Empty, Input, Sheet, Skeleton } from "../ui";
import { Conversation } from "./Conversation";
import { NewChannelSheet } from "./NewChannelSheet";
import { useChatRooms, type ChatRoom } from "./useChat";

function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(min-width: 1024px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => true,
  );
}

/**
 * Team chat: channels on one side, the open conversation on the other.
 * On phones the list and the conversation are separate screens.
 */
export function Chat() {
  const { lang, can, store, toast } = usePortal();
  const fa = lang === "fa";
  const router = useRouter();
  const params = useSearchParams();
  const wide = useWide();
  const rooms = useChatRooms();
  const [query, setQuery] = useState("");
  const [newChannel, setNewChannel] = useState(false);
  const [newDirect, setNewDirect] = useState(false);
  const base = `/${lang}/staff/chat`;

  const asked = params.get("c");
  const fallback = wide ? (rooms.joined[0]?.channel.id ?? null) : null;
  const openId = asked ?? fallback;
  const room = openId ? (rooms.byId.get(openId) ?? null) : null;

  const open = (id: string) => router.push(`${base}?c=${id}`, { scroll: false });
  const startDirect = async (staffId: string) => {
    setNewDirect(false);
    const result = await store.openDirect(staffId);
    if (result.ok) open(result.id);
    else toast(fa ? "گفتگو باز نشد" : "Couldn't open the conversation", "error");
  };

  const q = normalizeSearch(query);
  const filter = (list: ChatRoom[]) => (q ? list.filter((r) => normalizeSearch(r.title).includes(q)) : list);

  const list = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid gap-3 border-b border-p-line p-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="flex items-center gap-2 text-lg font-bold">
            <MessagesSquare className="size-5 text-p-brand" />
            {fa ? "گفتگوی تیم" : "Team chat"}
          </h1>
          <div className="flex gap-1">
            <Button size="sm" tone="quiet" icon={<MessageSquarePlus className="size-4" />} onClick={() => setNewDirect(true)}>
              {fa ? "پیام به همکار" : "Message"}
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-p-ink-3" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={fa ? "جستجوی گفتگو یا همکار" : "Find a chat or colleague"} className="ps-9" />
        </div>
      </div>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-2">
        {rooms.loading ? (
          <div className="grid gap-2 p-1">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : (
          <>
            <Section title={fa ? "کانال ها" : "Channels"} action={can.edit ? { label: fa ? "کانال تازه" : "New channel", onClick: () => setNewChannel(true) } : undefined}>
              {filter(rooms.joined).map((r) => (
                <RoomRow key={r.channel.id} room={r} active={r.channel.id === openId} onOpen={() => open(r.channel.id)} />
              ))}
            </Section>
            <Section title={fa ? "پیام های مستقیم" : "Direct messages"} action={{ label: fa ? "پیام تازه" : "New message", onClick: () => setNewDirect(true) }}>
              {filter(rooms.direct).map((r) => (
                <RoomRow key={r.channel.id} room={r} active={r.channel.id === openId} onOpen={() => open(r.channel.id)} />
              ))}
              {!rooms.direct.length ? (
                <button type="button" onClick={() => setNewDirect(true)} className="w-full rounded-xl px-3 py-2 text-start text-[13px] text-p-ink-3 hover:bg-p-sunken">
                  {fa ? "هنوز پیامی نفرستاده اید. با یک همکار شروع کنید." : "No direct messages yet. Start one with a colleague."}
                </button>
              ) : null}
            </Section>
            {rooms.others.length ? (
              <Section title={fa ? "کانال های دیگر" : "Other channels"}>
                {filter(rooms.others).map((r) => (
                  <RoomRow key={r.channel.id} room={r} active={r.channel.id === openId} onOpen={() => open(r.channel.id)} />
                ))}
              </Section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );

  const showList = wide || !asked;
  const showConversation = wide || Boolean(asked);

  return (
    <div className="flex min-h-0 flex-1">
      {showList ? <aside className={cn("min-h-0 border-p-line bg-p-surface", wide ? "w-80 shrink-0 border-e" : "w-full")}>{list}</aside> : null}
      {showConversation ? (
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          {room ? (
            <Conversation key={room.channel.id} room={room} onBack={() => router.push(base, { scroll: false })} />
          ) : rooms.loading || asked ? (
            <div className="grid flex-1 place-items-center p-6 text-sm text-p-ink-3">{fa ? "در حال باز کردن…" : "Opening…"}</div>
          ) : (
            <div className="grid flex-1 place-items-center p-6">
              <Empty icon={<MessagesSquare className="size-6" />} title={fa ? "یک گفتگو را انتخاب کنید" : "Pick a conversation"} />
            </div>
          )}
        </section>
      ) : null}

      <NewChannelSheet open={newChannel} onClose={() => setNewChannel(false)} onCreated={open} />
      <DirectPicker open={newDirect} onClose={() => setNewDirect(false)} onPick={startDirect} />
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: { label: string; onClick: () => void }; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between px-2 pb-1 pt-2">
        <p className="text-[12px] font-semibold text-p-ink-3">{title}</p>
        {action ? (
          <button type="button" onClick={action.onClick} className="grid size-6 place-items-center rounded-lg text-p-ink-3 hover:bg-p-sunken hover:text-p-brand" aria-label={action.label} title={action.label}>
            <Plus className="size-4" />
          </button>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">{children}</div>
    </div>
  );
}

function RoomRow({ room, active, onOpen }: { room: ChatRoom; active: boolean; onOpen: () => void }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  const m = room.member;
  const unread = m && !active ? (m.muted ? m.mention_count : m.unread_count) : 0;
  const mention = m && !active ? m.mention_count : 0;
  const isAlerts = room.channel.slug === "alerts";
  const preview = room.channel.last_message_preview;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-xl px-2.5 py-2 text-start transition-colors",
        active ? "bg-p-brand-soft" : "hover:bg-p-sunken",
      )}
    >
      {room.channel.kind === "direct" ? (
        <StaffAvatar staff={room.partner} size={34} />
      ) : (
        <span className={cn("grid size-[34px] shrink-0 place-items-center rounded-xl", isAlerts ? "bg-p-danger-soft text-p-danger" : "bg-p-sunken text-p-ink-2")}>
          {isAlerts ? <Bot className="size-4" /> : room.channel.is_private ? <Lock className="size-4" /> : <Hash className="size-4" />}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className={cn("truncate text-sm", unread ? "font-bold text-p-ink" : "font-medium text-p-ink-2", active && "text-p-brand")}>{room.title}</span>
          {m?.muted ? <VolumeX className="size-3.5 shrink-0 text-p-ink-3" aria-label={fa ? "بی صدا" : "Muted"} /> : null}
        </span>
        {preview ? <span className={cn("block truncate text-xs", unread ? "text-p-ink-2" : "text-p-ink-3")}>{preview}</span> : null}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        {room.channel.last_message_at ? <span className="text-[11px] text-p-ink-3">{relativeTime(lang, room.channel.last_message_at)}</span> : null}
        {mention ? (
          <span className="tabular grid h-5 min-w-5 place-items-center rounded-full bg-p-danger px-1.5 text-[11px] font-bold text-white">@{num(lang, mention)}</span>
        ) : unread ? (
          <span className="tabular grid h-5 min-w-5 place-items-center rounded-full bg-p-brand px-1.5 text-[11px] font-bold text-p-brand-ink">{num(lang, unread)}</span>
        ) : null}
      </span>
    </button>
  );
}

/** Pick a colleague to message. */
function DirectPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (id: string) => void }) {
  const { lang, user } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const [query, setQuery] = useState("");
  const people = useMemo(() => {
    const q = normalizeSearch(query);
    return x.staff
      .filter((s) => s.id !== user.id && s.status === "active")
      .filter((s) => !q || normalizeSearch(`${personName(s, lang)} ${s.job_title ?? ""}`).includes(q))
      .sort((a, b) => personName(a, lang).localeCompare(personName(b, lang), "fa"));
  }, [x.staff, user.id, query, lang]);
  return (
    <Sheet open={open} onClose={onClose} closeLabel={fa ? "بستن" : "Close"} title={fa ? "پیام به همکار" : "Message a colleague"}>
      <div className="grid gap-3">
        <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={fa ? "نام همکار" : "Colleague's name"} />
        <ul className="grid max-h-[55dvh] gap-1 overflow-y-auto">
          {people.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => onPick(s.id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start hover:bg-p-sunken">
                <StaffAvatar staff={s} size={38} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{personName(s, lang)}</span>
                  {s.job_title ? <span className="block truncate text-xs text-p-ink-3">{s.job_title}</span> : null}
                </span>
              </button>
            </li>
          ))}
          {!people.length ? <li className="px-3 py-6 text-center text-sm text-p-ink-3">{fa ? "همکاری پیدا نشد" : "No one found"}</li> : null}
        </ul>
      </div>
    </Sheet>
  );
}
