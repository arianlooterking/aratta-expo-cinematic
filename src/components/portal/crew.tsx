"use client";

import { PackageCheck, PackageOpen, Pencil, UsersRound } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { addDays } from "@/lib/portal/finance";
import { dayTime, fromLocal, localDayKey, localTimeKey, weekdayDate } from "@/lib/portal/format";
import type { EquipmentOrder } from "@/lib/portal/types";
import { useExhibition } from "./ExhibitionProvider";
import { PeopleLine, PeoplePicker, personName } from "./people";
import { useNow, usePersistentState, usePortal } from "./PortalProvider";
import { Field, Input, Select } from "./ui";

const CREW_KEY = "aratta.portal.crew";

/**
 * Who is out on the floor with this device. Every delivery or collection saved here is
 * recorded in their names; it starts as just you and is remembered on this device.
 */
export function useCrew() {
  const { user } = usePortal();
  const x = useExhibition();
  const [raw, setRaw] = usePersistentState<string>(CREW_KEY, "");
  const known = raw.split(",").filter((id) => {
    const s = x.staffById.get(id);
    return s && s.status !== "suspended";
  });
  const crew = known.length ? known : [user.id];
  return { crew, setCrew: (ids: string[]) => setRaw(ids.join(",")) };
}

/** The crew strip above handover buttons: whose names the next taps are saved under. */
export function CrewBar({ className }: { className?: string }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  const { crew, setCrew } = useCrew();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("flex min-w-0 items-center gap-2 rounded-xl border border-p-line bg-p-surface-2 px-3 py-2 text-start hover:border-p-line-strong", className)}
        data-tour="handover-crew"
      >
        <UsersRound className="size-4 shrink-0 text-p-ink-3" />
        <span className="shrink-0 text-xs text-p-ink-3">{fa ? "تیم تحویل" : "Crew"}</span>
        <span className="min-w-0 flex-1">
          <PeopleLine ids={crew} size={22} />
        </span>
        <span className="shrink-0 text-xs font-semibold text-p-brand">{fa ? "تغییر" : "Change"}</span>
      </button>
      <PeoplePicker
        open={open}
        onClose={() => setOpen(false)}
        value={crew}
        onSave={setCrew}
        requireOne
        title={fa ? "چه کسانی تحویل می دهند؟" : "Who is handing over?"}
        hint={
          fa
            ? "هر تحویل یا جمع آوری که از این دستگاه ثبت شود، به نام این افراد و با ساعت دقیق ثبت می شود. بعداً روی هر ردیف قابل اصلاح است."
            : "Every delivery or collection saved on this device is recorded in these names, with the exact time. You can correct any line afterwards."
        }
      />
    </>
  );
}

/**
 * Who delivered and who collected a line, and exactly when. Tap to correct the people or the time.
 */
export function HandoverStamp({ order: o, className }: { order: EquipmentOrder; className?: string }) {
  const { lang, can } = usePortal();
  const fa = lang === "fa";
  const [editing, setEditing] = useState<"deliver" | "collect" | null>(null);
  const rows: Array<{ step: "deliver" | "collect"; at: string; by: string[] }> = [];
  if (o.delivered_at && o.delivered_qty > 0) rows.push({ step: "deliver", at: o.delivered_at, by: o.delivered_by });
  if (o.collected_at && o.stage === "collected") rows.push({ step: "collect", at: o.collected_at, by: o.collected_by });
  if (!rows.length) return null;
  return (
    <div className={cn("grid gap-1", className)}>
      {rows.map((r) => {
        const body = (
          <>
            {r.step === "deliver" ? <PackageCheck className="size-3.5 shrink-0 text-p-info" /> : <PackageOpen className="size-3.5 shrink-0 text-p-ok" />}
            <span className="shrink-0 font-medium text-p-ink-2">{r.step === "deliver" ? (fa ? "تحویل" : "Delivered") : fa ? "جمع آوری" : "Collected"}</span>
            <span className="min-w-0">
              <PeopleLine ids={r.by} size={20} empty={fa ? "نامشخص" : "Not recorded"} />
            </span>
            <span className="tabular shrink-0 text-p-ink-3">{dayTime(lang, r.at)}</span>
          </>
        );
        return can.edit ? (
          <button
            key={r.step}
            type="button"
            onClick={() => setEditing(r.step)}
            className="group flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg px-1 py-0.5 text-start text-xs hover:bg-p-sunken"
            aria-label={r.step === "deliver" ? (fa ? "اصلاح تحویل" : "Correct the delivery") : fa ? "اصلاح جمع آوری" : "Correct the collection"}
          >
            {body}
            <Pencil className="size-3 shrink-0 text-p-ink-3 opacity-50 group-hover:opacity-100" />
          </button>
        ) : (
          <p key={r.step} className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 px-1 text-xs">
            {body}
          </p>
        );
      })}
      {editing ? <HandoverEdit order={o} step={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function HandoverEdit({ order: o, step, onClose }: { order: EquipmentOrder; step: "deliver" | "collect"; onClose: () => void }) {
  const { lang, store, toast } = usePortal();
  const x = useExhibition();
  const now = useNow();
  const fa = lang === "fa";
  const at = (step === "deliver" ? o.delivered_at : o.collected_at) ?? new Date(now).toISOString();
  const by = step === "deliver" ? o.delivered_by : o.collected_by;
  const [day, setDay] = useState(localDayKey(at));
  const [time, setTime] = useState(localTimeKey(at));
  const item = x.itemById.get(o.item_id);
  const itemName = item ? (fa ? item.name_fa : (item.name_en ?? item.name_fa)) : "";

  // The last two weeks and tomorrow, plus the saved day if it is older.
  const today = localDayKey(new Date(now));
  const days = Array.from({ length: 16 }, (_, i) => addDays(today, 1 - i));
  if (!days.includes(day)) days.push(day);
  const comma = fa ? "، " : ", ";
  const dayLabel = (d: string) => {
    const label = weekdayDate(lang, new Date(`${d}T12:00`));
    if (d === today) return `${fa ? "امروز" : "Today"}${comma}${label}`;
    if (d === addDays(today, -1)) return `${fa ? "دیروز" : "Yesterday"}${comma}${label}`;
    return label;
  };
  const when = fromLocal(day, time);

  return (
    <PeoplePicker
      open
      onClose={onClose}
      value={by}
      requireOne
      title={step === "deliver" ? (fa ? `چه کسی ${itemName} را تحویل داد؟` : `Who delivered the ${itemName}?`) : fa ? `چه کسی ${itemName} را جمع کرد؟` : `Who collected the ${itemName}?`}
      hint={fa ? "یک یا چند نفر، به ترتیب. نفر اول مسئول تحویل است." : "One or more people, in order. The first one is in charge."}
      saveLabel={fa ? "ثبت" : "Save"}
      extra={
        <div className="grid grid-cols-[1fr_9.5rem] gap-2">
          <Field label={fa ? "روز" : "Day"}>
            <Select value={day} onChange={(e) => setDay(e.target.value)}>
              {days.map((d) => (
                <option key={d} value={d}>
                  {dayLabel(d)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={fa ? "ساعت" : "Time"}>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} dir="ltr" className="tabular text-center" required />
          </Field>
        </div>
      }
      onSave={async (ids) => {
        if (!when) return;
        const res = await store.update("equipment_orders", o.id, step === "deliver" ? { delivered_by: ids, delivered_at: when } : { collected_by: ids, collected_at: when });
        if (res.ok) toast(fa ? `ثبت شد: ${ids.map((id) => personName(x.staffById.get(id), lang)).join("، ")}` : "Saved");
      }}
    />
  );
}
