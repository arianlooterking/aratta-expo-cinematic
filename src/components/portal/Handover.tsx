"use client";

import Link from "next/link";
import { Map as MapIcon, PackageCheck, PackageOpen, Printer, Search, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { num, percent, pick } from "@/lib/portal/format";
import type { Booth, EquipmentOrder } from "@/lib/portal/types";
import { useExhibition } from "./ExhibitionProvider";
import { usePortal } from "./PortalProvider";
import { normalizeSearch } from "./SearchPalette";
import { equipmentPatch, nextEquipmentStep } from "@/lib/portal/furniture";
import { EquipmentLine } from "./map/BoothPanel";
import { Button, Card, Empty, Progress, Segmented, Skeleton } from "./ui";

type Mode = "deliver" | "collect" | "issues";

export function Handover() {
  const { lang, store, can, toast } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const [modeChoice, setMode] = useState<Mode | null>(null);
  // Until someone picks, follow the show: deliveries before it, collection after.
  const mode: Mode = modeChoice ?? (x.phase === "strike" || x.phase === "after" ? "collect" : "deliver");
  const [hallId, setHallId] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [showDone, setShowDone] = useState(false);

  const returnable = (o: EquipmentOrder) => x.itemById.get(o.item_id)?.returnable ?? true;

  const groups = useMemo(() => {
    const q = normalizeSearch(query);
    const boothById = new Map(x.booths.map((b) => [b.id, b]));
    const out: Array<{ booth: Booth; company: string; orders: EquipmentOrder[]; open: EquipmentOrder[] }> = [];
    for (const [boothId, list] of x.ordersByBooth) {
      const booth = boothById.get(boothId);
      if (!booth || (hallId !== "all" && booth.hall_id !== hallId)) continue;
      const live = list.filter((o) => o.stage !== "cancelled");
      const relevant =
        mode === "issues"
          ? live.filter((o) => o.stage === "issue")
          : mode === "deliver"
            ? live
            : live.filter((o) => returnable(o) && (o.delivered_qty > 0 || o.stage === "collected"));
      if (!relevant.length) continue;
      const open = relevant.filter((o) => (mode === "issues" ? true : nextEquipmentStep(o, returnable(o)) === (mode === "deliver" ? "deliver" : "collect")));
      const deal = booth.deal_id ? x.dealById.get(booth.deal_id) : undefined;
      const companyRow = deal ? x.companyById.get(deal.company_id) : undefined;
      const company = companyRow ? pick(lang, companyRow.name_fa, companyRow.name_en) : "";
      if (q && !normalizeSearch(`${booth.code} ${company}`).includes(q)) continue;
      out.push({ booth, company, orders: relevant, open });
    }
    return out.sort((a, b) => a.booth.code.localeCompare(b.booth.code, undefined, { numeric: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- returnable reads itemById
  }, [x.ordersByBooth, x.booths, x.dealById, x.companyById, x.itemById, hallId, mode, query, lang]);

  const pieces = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const g of groups) {
      for (const o of g.orders) {
        if (mode === "deliver") {
          total += o.quantity;
          done += nextEquipmentStep(o, returnable(o)) === "deliver" ? 0 : o.quantity;
        } else if (mode === "collect") {
          total += o.delivered_qty;
          done += o.collected_qty + o.damaged_qty;
        }
      }
    }
    return { total, done };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- returnable reads itemById
  }, [groups, mode, x.itemById]);

  const visible = showDone || mode === "issues" ? groups : groups.filter((g) => g.open.length > 0);
  const finished = groups.length - groups.filter((g) => g.open.length > 0).length;

  async function finishBooth(orders: EquipmentOrder[]) {
    const step = mode === "deliver" ? "deliver" : "collect";
    await Promise.all(orders.map((o) => store.update("equipment_orders", o.id, equipmentPatch(o, step))));
    toast(fa ? "ثبت شد" : "Saved");
  }

  if (!x.ready) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:px-6 lg:py-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{fa ? "تحویل و جمع آوری" : "Handover"}</h1>
          <p className="mt-1 text-sm text-p-ink-3">
            {fa
              ? "غرفه به غرفه پیش بروید و هر قلم را با یک لمس ثبت کنید. همه همکاران همان لحظه می بینند."
              : "Walk the floor booth by booth and tick each item off with one tap. Colleagues see it at once."}
          </p>
        </div>
        <Button tone="ghost" size="sm" icon={<Printer className="size-4" />} onClick={() => window.print()} className="print:hidden">
          {fa ? "چاپ فهرست" : "Print list"}
        </Button>
      </div>

      <Card className="grid gap-3 p-4 print:hidden">
        <Segmented
          className="w-full [&>button]:flex-1"
          value={mode}
          onChange={setMode}
          options={[
            { value: "deliver", label: fa ? "تحویل به غرفه" : "Deliver", icon: <PackageCheck className="size-4" /> },
            { value: "collect", label: fa ? "جمع آوری" : "Collect", icon: <PackageOpen className="size-4" /> },
            { value: "issues", label: fa ? "مشکلات" : "Issues", icon: <TriangleAlert className="size-4" /> },
          ]}
        />
        {mode !== "issues" ? (
          <div className="grid gap-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold">
                {mode === "deliver" ? (fa ? "تحویل شده" : "Delivered") : fa ? "برگشته به انبار" : "Back in store"}
              </span>
              <span className="tabular text-p-ink-2">
                {num(lang, pieces.done)} / {num(lang, pieces.total)} · {pieces.total ? percent(lang, pieces.done / pieces.total) : "—"}
              </span>
            </div>
            <Progress value={pieces.total ? pieces.done / pieces.total : 0} tone={mode === "deliver" ? "info" : "ok"} />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <div className="thin-scroll flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {[{ id: "all", name: fa ? "همه سالن ها" : "All halls" }, ...x.halls.map((h) => ({ id: h.id, name: pick(lang, h.name_fa, h.name_en) }))].map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setHallId(h.id)}
                className={cn("h-8 shrink-0 rounded-lg px-3 text-[13px] font-medium", hallId === h.id ? "bg-p-ink text-p-bg" : "text-p-ink-2 hover:bg-p-sunken")}
              >
                {h.name}
              </button>
            ))}
          </div>
          <label className="relative w-full sm:w-48">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-p-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={fa ? "کد غرفه یا شرکت" : "Booth or company"}
              className="h-9 w-full rounded-lg border border-p-line bg-p-surface-2 ps-8 pe-2 text-sm outline-none focus:border-p-brand"
            />
          </label>
        </div>
        {mode !== "issues" && finished > 0 ? (
          <label className="flex items-center gap-2 text-[13px] text-p-ink-2">
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="size-4 accent-[var(--p-brand)]" />
            {fa ? `نمایش ${num(lang, finished)} غرفه تمام شده` : `Show ${finished} finished booths`}
          </label>
        ) : null}
      </Card>

      {visible.length === 0 ? (
        <Card>
          <Empty
            icon={<PackageCheck className="size-6" />}
            title={
              mode === "issues"
                ? fa
                  ? "مشکلی ثبت نشده"
                  : "No issues"
                : groups.length
                  ? fa
                    ? "همه چیز انجام شده"
                    : "All done"
                  : fa
                    ? "تجهیزاتی ثبت نشده"
                    : "No equipment yet"
            }
            hint={
              groups.length || mode === "issues"
                ? undefined
                : fa
                  ? "تجهیزات هر غرفه را از نقشه، در لایه تجهیزات، اضافه کنید."
                  : "Add each booth's equipment from the map's equipment layer."
            }
          />
        </Card>
      ) : null}

      <ul className="grid gap-3">
        {visible.map((g) => {
          const hall = x.halls.find((h) => h.id === g.booth.hall_id);
          return (
            <li key={g.booth.id}>
              <Card className={cn("overflow-hidden", g.open.length === 0 && mode !== "issues" && "opacity-70")}>
                <div className="flex items-center gap-3 border-b border-p-line px-4 py-3">
                  <span className="tabular grid h-10 min-w-12 place-items-center rounded-xl bg-p-sunken px-2 text-sm font-bold" dir="ltr">
                    {g.booth.code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{g.company || (fa ? "بدون شرکت" : "No company")}</p>
                    <p className="truncate text-xs text-p-ink-3">
                      {hall ? pick(lang, hall.name_fa, hall.name_en) : ""}
                      {mode !== "issues" ? ` · ${fa ? `${num(lang, g.open.length)} قلم مانده` : `${g.open.length} lines left`}` : ""}
                    </p>
                  </div>
                  <Link href={`/${lang}/staff/map?booth=${g.booth.id}`} className="grid size-9 place-items-center rounded-xl text-p-ink-3 hover:bg-p-sunken print:hidden" aria-label={fa ? "نمایش روی نقشه" : "Show on map"}>
                    <MapIcon className="size-4" />
                  </Link>
                  {can.edit && mode !== "issues" && g.open.length > 1 ? (
                    <Button size="sm" tone="primary" className="print:hidden" onClick={() => finishBooth(g.open)}>
                      {mode === "deliver" ? (fa ? "تحویل همه" : "Deliver all") : fa ? "جمع همه" : "Collect all"}
                    </Button>
                  ) : null}
                </div>
                <ul className="grid gap-2 p-3">
                  {g.orders.map((o) => (
                    <EquipmentLine key={o.id} order={o} compact />
                  ))}
                </ul>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
