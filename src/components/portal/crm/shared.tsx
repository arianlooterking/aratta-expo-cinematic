"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { isNativeApp, shareTextFile } from "@/lib/native/app";
import { dealStageLabel } from "@/lib/portal/i18n";
import type { DealStage } from "@/lib/portal/types";
import { usePortal } from "../PortalProvider";

/** Title row used by the CRM, accounting and task pages. */
export function PageHeader({ title, hint, actions, eyebrow }: { title: ReactNode; hint?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1 text-[13px] font-medium text-p-gold">{eyebrow}</div> : null}
        <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-[28px]">{title}</h1>
        {hint ? <p className="mt-1 text-sm text-p-ink-3">{hint}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

const stageTone: Record<DealStage, string> = {
  lead: "bg-p-sunken text-p-ink-2",
  contacted: "bg-p-info-soft text-p-info",
  qualified: "bg-p-info-soft text-p-info",
  proposal: "bg-p-violet-soft text-p-violet",
  negotiation: "bg-p-gold-soft text-p-gold",
  won: "bg-p-ok-soft text-p-ok",
  lost: "bg-p-danger-soft text-p-danger",
};

export function StagePill({ stage, small }: { stage: DealStage; small?: boolean }) {
  const { lang } = usePortal();
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full font-medium", small ? "h-5 px-1.5 text-[11px]" : "h-6 px-2 text-xs", stageTone[stage])}>
      {dealStageLabel[stage][lang]}
    </span>
  );
}

export const STAGES: DealStage[] = ["lead", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];

/** Saves text as a file: a download in the browser, the share sheet in the app. */
export function downloadText(filename: string, text: string, type = "text/plain") {
  if (isNativeApp()) {
    void shareTextFile(filename, text).catch(() => browserDownload(filename, text, type));
    return;
  }
  browserDownload(filename, text, type);
}

function browserDownload(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Initials for a person, for small avatars. */
export function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "؟";
  return parts.length === 1 ? parts[0].charAt(0) : `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`;
}

export function Avatar({ name, className }: { name: string | null | undefined; className?: string }) {
  return (
    <span className={cn("grid size-6 shrink-0 place-items-center rounded-full bg-p-brand-soft text-[10px] font-bold text-p-brand", className)} title={name ?? undefined}>
      {initials(name)}
    </span>
  );
}
