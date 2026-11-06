"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { countdownText } from "@/lib/portal/countdown";
import { date, pick, sep } from "@/lib/portal/format";
import { exhibitionStatusLabel } from "@/lib/portal/i18n";
import { exhibitionPhase } from "@/lib/portal/metrics";
import type { Exhibition } from "@/lib/portal/types";
import { useExhibition } from "./ExhibitionProvider";
import { NewExhibitionSheet } from "./NewExhibitionSheet";
import { usePortal } from "./PortalProvider";
import { Popover } from "./ui";

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
