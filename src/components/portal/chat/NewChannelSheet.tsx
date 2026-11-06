"use client";

import { Hash, Lock } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { newId } from "@/lib/portal/store";
import { usePortal } from "../PortalProvider";
import { Button, Field, Input, Sheet } from "../ui";

/** Make a channel: a name, an optional line on what it is for, open or private. */
export function NewChannelSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  return (
    <Sheet open={open} onClose={onClose} closeLabel={fa ? "بستن" : "Close"} title={fa ? "کانال تازه" : "New channel"}>
      {open ? <Body onClose={onClose} onCreated={onCreated} /> : null}
    </Sheet>
  );
}

function Body({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { lang, store, user } = usePortal();
  const fa = lang === "fa";
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [isPrivate, setPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const clean = name.replace(/^#+/, "").trim();

  const save = async () => {
    if (!clean) return;
    setSaving(true);
    const id = newId();
    const result = await store.insert("chat_channels", {
      id,
      kind: "channel",
      name: clean,
      topic: topic.trim() || null,
      is_private: isPrivate,
      created_by: user.id,
    });
    setSaving(false);
    if (result.ok) {
      onClose();
      onCreated(id);
    }
  };

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Field label={fa ? "نام کانال" : "Channel name"}>
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={fa ? "مثلا: نمایشگاه معدن ۱۴۰۵" : "e.g. Kerman Mining 2026"} />
      </Field>
      <Field label={fa ? "درباره کانال (اختیاری)" : "What it is for (optional)"}>
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={140} placeholder={fa ? "یک جمله کوتاه" : "One short line"} />
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        {(
          [
            [false, <Hash key="h" className="size-5" />, fa ? "همه می بینند" : "Everyone can see", fa ? "هر همکاری می تواند بخواند و بپیوندد" : "Any colleague can read and join"],
            [true, <Lock key="l" className="size-5" />, fa ? "خصوصی" : "Private", fa ? "فقط کسانی که اضافه می کنید" : "Only people you add"],
          ] as const
        ).map(([value, icon, title, hint]) => (
          <button
            key={String(value)}
            type="button"
            onClick={() => setPrivate(value)}
            aria-pressed={isPrivate === value}
            className={cn(
              "flex items-start gap-3 rounded-2xl border p-3 text-start transition-colors",
              isPrivate === value ? "border-p-brand bg-p-brand-soft/60" : "border-p-line hover:bg-p-sunken",
            )}
          >
            <span className={cn("mt-0.5", isPrivate === value ? "text-p-brand" : "text-p-ink-3")}>{icon}</span>
            <span>
              <span className="block text-sm font-semibold">{title}</span>
              <span className="block text-xs text-p-ink-3">{hint}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button tone="ghost" onClick={onClose}>
          {fa ? "انصراف" : "Cancel"}
        </Button>
        <Button tone="primary" type="submit" disabled={!clean || saving}>
          {fa ? "ساختن کانال" : "Create channel"}
        </Button>
      </div>
    </form>
  );
}
