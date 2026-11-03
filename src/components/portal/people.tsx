"use client";

import { Check, UserRoundPlus } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { avatarPhoto, avatarPreset } from "@/lib/portal/avatar";
import { DEMO_STAFF_ID } from "@/lib/portal/demo-seed";
import type { StaffMember } from "@/lib/portal/types";
import { useExhibition } from "./ExhibitionProvider";
import { usePortal } from "./PortalProvider";
import { Button, Sheet } from "./ui";

export { avatarPreset };

/* ------------------------------------------------------------------ Art */

type Hair = "short" | "side" | "bun" | "scarf" | "curly" | "beard" | "long" | "cap";
type Preset = {
  bg: string;
  skin: string;
  hair: string;
  style: Hair;
  shirt: string;
  glasses?: boolean;
};

/** The built-in avatar set. Staff pick one in their profile; until then one is chosen from their id. */
export const AVATAR_PRESETS: Preset[] = [
  { bg: "#cfe8df", skin: "#f1c7a5", hair: "#2b1d16", style: "short", shirt: "#0e5d4c" },
  { bg: "#f7e2b8", skin: "#e8b48f", hair: "#3a2a20", style: "scarf", shirt: "#b07a1e" },
  { bg: "#dbe7f7", skin: "#c98f6b", hair: "#141414", style: "beard", shirt: "#2364a8", glasses: true },
  { bg: "#ece3fa", skin: "#f3d2b6", hair: "#6b3a22", style: "bun", shirt: "#6a43b8" },
  { bg: "#fbe0dc", skin: "#d9a07c", hair: "#1f1a17", style: "curly", shirt: "#c0362c" },
  { bg: "#e3efe0", skin: "#f1c7a5", hair: "#7c7468", style: "side", shirt: "#3d7a4e", glasses: true },
  { bg: "#f5e6d3", skin: "#b9805e", hair: "#22160f", style: "scarf", shirt: "#0f6b78" },
  { bg: "#e0ecf2", skin: "#edc09c", hair: "#4a2f20", style: "long", shirt: "#a8670d" },
  { bg: "#efe6da", skin: "#c98f6b", hair: "#111111", style: "cap", shirt: "#2f3e46" },
  { bg: "#dff1ee", skin: "#f3d2b6", hair: "#2b1d16", style: "beard", shirt: "#0e5d4c" },
  { bg: "#f9e7c9", skin: "#e2a982", hair: "#5a3824", style: "scarf", shirt: "#7a3f9e", glasses: true },
  { bg: "#e6e9f5", skin: "#a66e4e", hair: "#151515", style: "short", shirt: "#c46a2c" },
  { bg: "#f3e0ea", skin: "#f1c7a5", hair: "#8a4b2a", style: "long", shirt: "#b23a6b" },
  { bg: "#e2efe6", skin: "#d9a07c", hair: "#2a2a2a", style: "side", shirt: "#1f5f8b" },
  { bg: "#f4ead7", skin: "#edc09c", hair: "#3b2618", style: "bun", shirt: "#4d7c0f", glasses: true },
  { bg: "#e4e4ea", skin: "#c98f6b", hair: "#9a958c", style: "beard", shirt: "#374151" },
];

/** One round illustrated face: dot eyes, a small smile, hair or a headscarf. */
export function AvatarArt({ preset, className }: { preset: number; className?: string }) {
  const clip = `avatar-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const p = AVATAR_PRESETS[preset % AVATAR_PRESETS.length];
  const ink = "#1d2522";
  const scarf = p.style === "scarf";
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <clipPath id={clip}>
        <circle cx="32" cy="32" r="32" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <circle cx="32" cy="32" r="32" fill={p.bg} />
        {scarf ? <path d="M15 34C15 19 22 11 32 11s17 8 17 23l2 14c-5 4-12 6-19 6s-14-2-19-6z" fill={p.hair} /> : null}
        {p.style === "long" ? <path d="M18 30c0-11 6-17 14-17s14 6 14 17v16c-4 2-9 3-14 3s-10-1-14-3z" fill={p.hair} /> : null}
        <path d="M9 64c1-12 10-19 23-19s22 7 23 19z" fill={p.shirt} />
        <rect x="27.5" y="35" width="9" height="11" rx="4" fill={p.skin} />
        <rect x="27.5" y="40" width="9" height="4" fill="#000" opacity=".08" />
        <circle cx="32" cy="28" r={scarf ? 10.5 : 12} fill={p.skin} />
        {p.style === "short" || p.style === "bun" || p.style === "beard" || p.style === "cap" ? <path d="M20 27c0-9 5-14 12-14 8 0 12 5 12 13-3-4-7-6-12-6s-9 3-12 7z" fill={p.hair} /> : null}
        {p.style === "bun" ? <circle cx="32" cy="12" r="5" fill={p.hair} /> : null}
        {p.style === "side" ? <path d="M20 29c-1-10 4-16 12-16 9 0 13 6 12 13-5-1-11-4-14-8-2 4-6 8-10 11z" fill={p.hair} /> : null}
        {p.style === "long" ? <path d="M20 28c0-9 5-14 12-14s12 5 12 14c-4-3-6-6-7-9-3 4-10 7-17 9z" fill={p.hair} /> : null}
        {p.style === "curly" ? (
          <g fill={p.hair}>
            <circle cx="23" cy="21" r="5" />
            <circle cx="29" cy="16.5" r="5.5" />
            <circle cx="36" cy="16.5" r="5.5" />
            <circle cx="41.5" cy="21.5" r="5" />
            <circle cx="20.5" cy="27" r="3.5" />
            <circle cx="43.5" cy="27" r="3.5" />
          </g>
        ) : null}
        {p.style === "cap" ? <path d="M19 24c1-8 6-12 13-12s12 4 13 12zM43 23.5c3 0 6 .5 8 1.5-2 1.5-5 1.8-8 1.5z" fill={p.shirt} /> : null}
        {scarf ? <path d="M21 26c1-7 5.5-10.5 11-10.5S42 19 43 26c-3-4-6.5-6-11-6s-8 2-11 6z" fill={p.hair} /> : null}
        {p.style === "beard" ? <path d="M21 29c1 7 5 11 11 11s10-4 11-11c-2 3-5 4-11 4s-9-1-11-4z" fill={p.hair} /> : null}
        <circle cx="27.5" cy="28.5" r="1.7" fill={ink} />
        <circle cx="36.5" cy="28.5" r="1.7" fill={ink} />
        <circle cx="25" cy="32.5" r="2" fill="#e8737a" opacity=".22" />
        <circle cx="39" cy="32.5" r="2" fill="#e8737a" opacity=".22" />
        <path d={p.style === "beard" ? "M29 34.5q3 1.8 6 0" : "M28.5 33.5q3.5 3 7 0"} fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
        {p.glasses ? (
          <g fill="none" stroke={ink} strokeWidth="1.3">
            <circle cx="27.5" cy="28.5" r="3.6" />
            <circle cx="36.5" cy="28.5" r="3.6" />
            <path d="M31.1 28.5h1.8" />
          </g>
        ) : null}
      </g>
    </svg>
  );
}

/* --------------------------------------------------------------- Avatars */

type Person = Pick<StaffMember, "id" | "display_name" | "email" | "avatar_url"> | null | undefined;

export function personName(p: Person, lang: "fa" | "en") {
  if (!p) return lang === "fa" ? "همکار سابق" : "Former colleague";
  if (p.id === DEMO_STAFF_ID && lang === "en") return "You (demo owner)";
  return p.display_name ?? p.email;
}

/** A staff member as a round picture, their uploaded photo or their illustration. */
export function StaffAvatar({ staff, size = 24, className, ring }: { staff: Person; size?: number; className?: string; ring?: boolean }) {
  const { lang } = usePortal();
  const photo = avatarPhoto(staff?.avatar_url);
  return (
    <span
      className={cn("inline-grid shrink-0 overflow-hidden rounded-full bg-p-sunken align-middle", ring && "ring-2 ring-p-surface", className)}
      style={{ width: size, height: size }}
      title={personName(staff, lang)}
      role="img"
      aria-label={personName(staff, lang)}
    >
      {!staff ? (
        <svg viewBox="0 0 64 64" aria-hidden>
          <circle cx="32" cy="32" r="32" fill="currentColor" opacity=".12" />
          <circle cx="32" cy="27" r="11" fill="currentColor" opacity=".25" />
          <path d="M11 60c2-11 10-17 21-17s19 6 21 17z" fill="currentColor" opacity=".25" />
        </svg>
      ) : photo ? (
        // Uploaded photos are small and come from our own storage.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <AvatarArt preset={avatarPreset(staff)} className="size-full" />
      )}
    </span>
  );
}

/** Several people as overlapping circles, with a +N for the rest. */
export function AvatarStack({ ids, size = 24, max = 3, className }: { ids: readonly string[]; size?: number; max?: number; className?: string }) {
  const { lang } = usePortal();
  const x = useExhibition();
  const shown = ids.slice(0, max);
  const rest = ids.length - shown.length;
  return (
    <span className={cn("inline-flex items-center", className)} title={ids.map((id) => personName(x.staffById.get(id), lang)).join("، ")}>
      {shown.map((id, i) => (
        <StaffAvatar key={id} staff={x.staffById.get(id)} size={size} ring className={i ? "-ms-1.5" : undefined} />
      ))}
      {rest > 0 ? (
        <span className="-ms-1.5 grid shrink-0 place-items-center rounded-full bg-p-sunken text-[10px] font-bold text-p-ink-2 ring-2 ring-p-surface" style={{ width: size, height: size }}>
          +{rest}
        </span>
      ) : null}
    </span>
  );
}

/** Names next to their faces, for "who delivered" and "managed by" lines. */
export function PeopleLine({ ids, empty, size = 22 }: { ids: readonly string[]; empty?: string; size?: number }) {
  const { lang } = usePortal();
  const x = useExhibition();
  if (!ids.length) return <span className="text-xs text-p-ink-3">{empty ?? "—"}</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <AvatarStack ids={ids} size={size} />
      <span className="min-w-0 truncate text-xs font-medium text-p-ink-2">{ids.map((id) => personName(x.staffById.get(id), lang)).join("، ")}</span>
    </span>
  );
}

/* ---------------------------------------------------------------- Picker */

/**
 * Choose one or more colleagues. The order they are ticked in is kept: the first is the lead.
 * Opens as a dialog on desktop and a bottom sheet on phones.
 */
export function PeoplePicker({
  open,
  onClose,
  value,
  onSave,
  title,
  hint,
  saveLabel,
  extra,
  requireOne,
}: {
  open: boolean;
  onClose: () => void;
  value: readonly string[];
  onSave: (ids: string[]) => void;
  title: string;
  hint?: string;
  saveLabel?: string;
  /** Shown under the list, for example a time field. */
  extra?: React.ReactNode;
  /** A record that must name somebody: saving needs at least one person. */
  requireOne?: boolean;
}) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  return (
    <Sheet open={open} onClose={onClose} closeLabel={fa ? "بستن" : "Close"} title={title}>
      {open ? <PickerBody value={value} onSave={onSave} onClose={onClose} hint={hint} saveLabel={saveLabel} extra={extra} requireOne={requireOne} /> : null}
    </Sheet>
  );
}

function PickerBody({
  value,
  onSave,
  onClose,
  hint,
  saveLabel,
  extra,
  requireOne,
}: {
  value: readonly string[];
  onSave: (ids: string[]) => void;
  onClose: () => void;
  hint?: string;
  saveLabel?: string;
  extra?: React.ReactNode;
  requireOne?: boolean;
}) {
  const { lang, user } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const [picked, setPicked] = useState<string[]>([...value]);
  const people = x.staff
    .filter((s) => s.status !== "suspended" || picked.includes(s.id))
    .sort((a, b) => (a.id === user.id ? -1 : b.id === user.id ? 1 : personName(a, lang).localeCompare(personName(b, lang), "fa")));
  const toggle = (id: string) => setPicked((list) => (list.includes(id) ? list.filter((i) => i !== id) : [...list, id]));
  return (
    <div className="grid gap-3">
      {hint ? <p className="text-sm text-p-ink-3">{hint}</p> : null}
      <ul className="grid max-h-[50dvh] gap-1 overflow-y-auto">
        {people.map((s) => {
          const on = picked.includes(s.id);
          const order = picked.indexOf(s.id);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => toggle(s.id)}
                aria-pressed={on}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-start transition-colors",
                  on ? "border-p-brand bg-p-brand-soft/50" : "border-transparent hover:bg-p-sunken",
                )}
              >
                <StaffAvatar staff={s} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {personName(s, lang)}
                    {s.id === user.id && s.id !== DEMO_STAFF_ID ? <span className="ms-1 text-xs font-normal text-p-ink-3">{fa ? "(خودم)" : "(me)"}</span> : null}
                  </span>
                  {s.job_title ? <span className="block truncate text-xs text-p-ink-3">{s.job_title}</span> : null}
                </span>
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border-2 text-[11px] font-bold", on ? "border-p-brand bg-p-brand text-p-brand-ink" : "border-p-line-strong")}>
                  {on ? picked.length > 1 ? (order + 1).toLocaleString(fa ? "fa-IR" : "en-US") : <Check className="size-3.5" /> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {extra}
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setPicked([])} className="text-xs text-p-ink-3 hover:text-p-danger" disabled={!picked.length}>
          {fa ? "پاک کردن همه" : "Clear all"}
        </button>
        <div className="flex gap-2">
          <Button tone="ghost" onClick={onClose}>
            {fa ? "انصراف" : "Cancel"}
          </Button>
          <Button
            tone="primary"
            icon={<UserRoundPlus className="size-4" />}
            disabled={requireOne && !picked.length}
            onClick={() => {
              onSave(picked);
              onClose();
            }}
          >
            {saveLabel ?? (fa ? "ذخیره" : "Save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------- Avatar chooser */

/** The profile picture chooser: the built-in set now; photo upload arrives with the live database. */
export function AvatarChooser({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, user, store, toast, mode } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const me = x.staffById.get(user.id) ?? null;
  const current = me ? avatarPreset(me) : 0;
  return (
    <Sheet open={open} onClose={onClose} closeLabel={fa ? "بستن" : "Close"} title={fa ? "تصویر شما" : "Your picture"}>
      <div className="grid gap-4">
        <p className="text-sm text-p-ink-3">
          {fa ? "یکی را انتخاب کنید. همکاران شما را با همین تصویر روی غرفه ها، کارها و تحویل ها می بینند." : "Pick one. Colleagues see it on booths, tasks and handovers."}
        </p>
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {AVATAR_PRESETS.map((_, i) => (
            <li key={i}>
              <button
                type="button"
                aria-pressed={current === i && Boolean(me?.avatar_url)}
                aria-label={fa ? `تصویر ${i + 1}` : `Picture ${i + 1}`}
                onClick={async () => {
                  const res = await store.setMyAvatar(user.id, `preset:${i}`);
                  if (res.ok) toast(fa ? "تصویر شما عوض شد" : "Picture updated");
                }}
                className={cn("block aspect-square w-full rounded-full p-0.5 transition", current === i ? "ring-2 ring-p-brand ring-offset-2 ring-offset-p-surface" : "hover:scale-105")}
              >
                <AvatarArt preset={i} className="size-full" />
              </button>
            </li>
          ))}
        </ul>
        <p className="rounded-xl bg-p-surface-2 px-3 py-2 text-xs text-p-ink-3">
          {mode === "demo"
            ? fa
              ? "بارگذاری عکس واقعی بعد از اتصال پایگاه داده فعال می شود."
              : "Uploading a real photo turns on once the live database is connected."
            : fa
              ? "بارگذاری عکس واقعی به زودی."
              : "Photo upload is coming soon."}
        </p>
      </div>
    </Sheet>
  );
}
