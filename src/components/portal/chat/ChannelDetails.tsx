"use client";

import { Archive, LogIn, LogOut, Phone, UserRoundPlus } from "lucide-react";
import { useState } from "react";
import { newId } from "@/lib/portal/store";
import type { ChatMember } from "@/lib/portal/types";
import { useExhibition } from "../ExhibitionProvider";
import { PeoplePicker, personName, StaffAvatar } from "../people";
import { usePortal } from "../PortalProvider";
import { Button, Field, Input, Sheet } from "../ui";
import type { ChatRoom } from "./useChat";

/** About a conversation: what it is for, who is in it, and joining, adding or leaving. */
export function ChannelDetails({
  open,
  onClose,
  room,
  members,
  onLeft,
}: {
  open: boolean;
  onClose: () => void;
  room: ChatRoom;
  members: readonly ChatMember[];
  onLeft: () => void;
}) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  return (
    <Sheet open={open} onClose={onClose} closeLabel={fa ? "بستن" : "Close"} title={room.channel.kind === "direct" ? room.title : `# ${room.title}`}>
      {open ? <Body room={room} members={members} onClose={onClose} onLeft={onLeft} /> : null}
    </Sheet>
  );
}

function Body({ room, members, onClose, onLeft }: { room: ChatRoom; members: readonly ChatMember[]; onClose: () => void; onLeft: () => void }) {
  const { lang, user, store, can } = usePortal();
  const { staffById } = useExhibition();
  const fa = lang === "fa";
  const { channel, member } = room;
  const [name, setName] = useState(channel.name ?? "");
  const [topic, setTopic] = useState(channel.topic ?? "");
  const [adding, setAdding] = useState(false);

  if (channel.kind === "direct") {
    const p = room.partner;
    return (
      <div className="grid justify-items-center gap-2 py-2 text-center">
        <StaffAvatar staff={p} size={72} />
        <p className="text-lg font-bold">{personName(p, lang)}</p>
        {p?.job_title ? <p className="text-sm text-p-ink-3">{p.job_title}</p> : null}
        {p?.phone ? (
          <a href={`tel:${p.phone}`} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-p-brand-soft px-4 py-2 text-sm font-semibold text-p-brand" dir="ltr">
            <Phone className="size-4" />
            {p.phone}
          </a>
        ) : null}
        <p className="mt-3 text-xs text-p-ink-3">{fa ? "پیام های مستقیم را فقط شما دو نفر می بینید." : "Only the two of you can see direct messages."}</p>
      </div>
    );
  }

  const isOwner = channel.created_by === user.id || can.manage;
  const canAdd = Boolean(member) && isOwner;
  const canLeave = Boolean(member) && !channel.is_default;
  const canEdit = isOwner;
  const canArchive = isOwner && !channel.slug;
  const people = members.map((m) => staffById.get(m.staff_id)).filter((s) => s !== undefined);
  const dirty = name.trim() !== (channel.name ?? "") || topic.trim() !== (channel.topic ?? "");

  return (
    <div className="grid gap-5">
      {canEdit ? (
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            void store.update("chat_channels", channel.id, { name: name.trim(), topic: topic.trim() || null });
          }}
        >
          <Field label={fa ? "نام کانال" : "Channel name"}>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </Field>
          <Field label={fa ? "درباره کانال" : "What it is for"}>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={140} />
          </Field>
          {dirty ? (
            <div className="flex justify-end">
              <Button tone="primary" size="sm" type="submit" disabled={!name.trim()}>
                {fa ? "ذخیره" : "Save"}
              </Button>
            </div>
          ) : null}
        </form>
      ) : channel.topic ? (
        <p className="text-sm text-p-ink-2">{channel.topic}</p>
      ) : null}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">
            {fa ? "اعضا" : "Members"} <span className="text-p-ink-3">({people.length.toLocaleString(fa ? "fa-IR" : "en-US")})</span>
          </p>
          {canAdd ? (
            <Button size="sm" tone="quiet" icon={<UserRoundPlus className="size-4" />} onClick={() => setAdding(true)}>
              {fa ? "افزودن همکار" : "Add people"}
            </Button>
          ) : null}
        </div>
        <ul className="grid max-h-72 gap-1 overflow-y-auto">
          {people.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
              <StaffAvatar staff={s} size={30} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{personName(s, lang)}</span>
                {s.job_title ? <span className="block truncate text-xs text-p-ink-3">{s.job_title}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-p-line pt-4">
        {!member && !channel.is_private ? (
          <Button
            tone="primary"
            icon={<LogIn className="size-4" />}
            onClick={() => {
              void store.insert("chat_members", { id: newId(), channel_id: channel.id, staff_id: user.id });
              onClose();
            }}
          >
            {fa ? "پیوستن به کانال" : "Join channel"}
          </Button>
        ) : null}
        {canArchive ? (
          <Button
            tone="ghost"
            icon={<Archive className="size-4" />}
            onClick={() => {
              if (!window.confirm(fa ? "این کانال بایگانی شود؟ پیام ها می مانند ولی پیام تازه ای نمی شود فرستاد." : "Archive this channel? Messages stay but no one can post.")) return;
              void store.update("chat_channels", channel.id, { archived_at: new Date().toISOString() });
              onClose();
              onLeft();
            }}
          >
            {fa ? "بایگانی" : "Archive"}
          </Button>
        ) : null}
        {canLeave && member ? (
          <Button
            tone="danger"
            icon={<LogOut className="size-4" />}
            onClick={() => {
              void store.remove("chat_members", member.id);
              onClose();
              onLeft();
            }}
          >
            {fa ? "ترک کانال" : "Leave channel"}
          </Button>
        ) : null}
      </div>

      <PeoplePicker
        open={adding}
        onClose={() => setAdding(false)}
        value={[]}
        title={fa ? "افزودن به کانال" : "Add to channel"}
        hint={fa ? "همکارانی که اضافه می کنید از این به بعد پیام ها را می بینند." : "The people you add will see this channel's messages."}
        saveLabel={fa ? "افزودن" : "Add"}
        onSave={(ids) => {
          const already = new Set(members.map((m) => m.staff_id));
          for (const id of ids) if (!already.has(id)) void store.insert("chat_members", { id: newId(), channel_id: channel.id, staff_id: id });
        }}
      />
    </div>
  );
}
