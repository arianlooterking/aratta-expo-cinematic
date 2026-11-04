"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { countdownText } from "@/lib/portal/countdown";
import { date, pick, sep } from "@/lib/portal/format";
import { exhibitionStatusLabel } from "@/lib/portal/i18n";
import { exhibitionPhase } from "@/lib/portal/metrics";
import { newId } from "@/lib/portal/store";
import type { Exhibition } from "@/lib/portal/types";
import { useExhibition } from "./ExhibitionProvider";
import { usePortal } from "./PortalProvider";
import { Button, Field, Input, Popover, Select, Sheet } from "./ui";

const phaseTone: Record<string, string> = {
  planning: "bg-p-info",
  build: "bg-p-warn",
  show: "bg-p-ok",
  strike: "bg-p-violet",
  after: "bg-p-ink-3",
};

export function ExhibitionSwitcher({ variant }: { variant: "sidebar" | "compact" }) {
  const { lang, can } = usePortal();
  const { exhibitions, exhibition, selectExhibition, ready } = useExhibition();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const name = exhibition ? pick(lang, exhibition.name_fa, exhibition.name_en) : ready ? (lang === "fa" ? "نمایشگاهی ثبت نشده" : "No exhibition yet") : "…";
  const phase = exhibition ? exhibitionPhase(exhibition) : "planning";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2 text-start transition-colors",
          variant === "sidebar"
            ? "rounded-2xl border border-white/10 bg-white/[0.04] p-3 hover:bg-white/[0.07]"
            : "h-10 rounded-xl px-2 hover:bg-p-sunken",
        )}
      >
        <span className="min-w-0 flex-1">
          {variant === "sidebar" ? (
            <span className="mb-1 block text-[11px] font-medium text-p-side-muted">{lang === "fa" ? "نمایشگاه فعال" : "Current exhibition"}</span>
          ) : null}
          <span className={cn("block truncate font-semibold", variant === "sidebar" ? "text-[13px] leading-snug text-p-side-ink" : "text-sm text-p-ink")}>
            {name}
          </span>
          {exhibition ? (
            <span className={cn("mt-1 flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-xs", variant === "sidebar" ? "text-p-side-muted" : "text-p-ink-3")}>
              <span className={cn("size-1.5 rounded-full", phaseTone[phase])} />
              {countdownText(lang, exhibition)}
            </span>
          ) : null}
        </span>
        <ChevronDown className={cn("size-4 shrink-0", variant === "sidebar" ? "text-p-side-muted" : "text-p-ink-3")} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} align="start" className="w-[min(22rem,calc(100vw-1.5rem))]">
        <div className="thin-scroll max-h-[60dvh] overflow-y-auto">
          {exhibitions.map((e) => (
            <ExhibitionRow
              key={e.id}
              exhibition={e}
              active={e.id === exhibition?.id}
              onPick={() => {
                selectExhibition(e.id);
                setOpen(false);
              }}
            />
          ))}
        </div>
        {can.manage ? (
          <>
            <div className="my-1 h-px bg-p-line" />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setCreating(true);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium text-p-brand hover:bg-p-brand-soft"
            >
              <Plus className="size-4" />
              {lang === "fa" ? "نمایشگاه جدید" : "New exhibition"}
            </button>
          </>
        ) : null}
      </Popover>
      <NewExhibitionSheet open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function ExhibitionRow({ exhibition: e, active, onPick }: { exhibition: Exhibition; active: boolean; onPick: () => void }) {
  const { lang } = usePortal();
  const phase = exhibitionPhase(e);
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn("flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-start", active ? "bg-p-brand-soft" : "hover:bg-p-sunken")}
    >
      <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: e.color }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{pick(lang, e.name_fa, e.name_en)}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-p-ink-3">
          <span className={cn("size-1.5 rounded-full", phaseTone[phase])} />
          {e.starts_on ? date(lang, e.starts_on) : exhibitionStatusLabel[e.status][lang]}
          {sep(lang)}
          {countdownText(lang, e)}
        </span>
      </span>
      {active ? <Check className="mt-1 size-4 text-p-brand" /> : null}
    </button>
  );
}

function slugify(text: string) {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "exhibition"}-${Math.random().toString(36).slice(2, 6)}`;
}

function NewExhibitionSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, store, toast } = usePortal();
  const { selectExhibition } = useExhibition();
  const [busy, setBusy] = useState(false);
  const fa = lang === "fa";
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={fa ? "نمایشگاه جدید" : "New exhibition"}
      closeLabel={fa ? "بستن" : "Close"}
    >
      <form
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const nameFa = String(form.get("name_fa") ?? "").trim();
          if (!nameFa) return;
          setBusy(true);
          const id = newId();
          const nameEn = String(form.get("name_en") ?? "").trim() || null;
          const rate = Number(String(form.get("space_rate") ?? "").replace(/[^\d]/g, "")) || null;
          const result = await store.insert("exhibitions", {
            id,
            slug: slugify(nameEn ?? ""),
            name_fa: nameFa,
            name_en: nameEn,
            starts_on: String(form.get("starts_on") || "") || null,
            ends_on: String(form.get("ends_on") || "") || null,
            build_starts_on: String(form.get("build_starts_on") || "") || null,
            currency: String(form.get("currency") ?? "IRR") as "IRR",
            space_rate: rate,
            status: "selling",
          });
          setBusy(false);
          if (result.ok) {
            selectExhibition(id);
            toast(fa ? "نمایشگاه ساخته شد. حالا سالن ها را روی نقشه بسازید." : "Exhibition created. Now add its halls on the map.");
            onClose();
          }
        }}
      >
        <Field label={fa ? "نام فارسی" : "Name (Persian)"}>
          <Input name="name_fa" required dir="rtl" />
        </Field>
        <Field label={fa ? "نام انگلیسی" : "Name (English)"}>
          <Input name="name_en" dir="ltr" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={fa ? "شروع غرفه سازی" : "Build-up starts"}>
            <Input name="build_starts_on" type="date" />
          </Field>
          <Field label={fa ? "افتتاح" : "Opens"}>
            <Input name="starts_on" type="date" />
          </Field>
          <Field label={fa ? "پایان" : "Closes"}>
            <Input name="ends_on" type="date" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={fa ? "نرخ هر متر فضا" : "Rate per m²"}>
            <Input name="space_rate" inputMode="numeric" dir="ltr" />
          </Field>
          <Field label={fa ? "واحد پول" : "Currency"}>
            <Select name="currency" defaultValue="IRR">
              <option value="IRR">{fa ? "ریال" : "Rial (IRR)"}</option>
              <option value="IRT">{fa ? "تومان" : "Toman"}</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="AED">AED</option>
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button tone="ghost" onClick={onClose}>
            {fa ? "انصراف" : "Cancel"}
          </Button>
          <Button tone="primary" type="submit" disabled={busy}>
            {fa ? "ساخت نمایشگاه" : "Create exhibition"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
