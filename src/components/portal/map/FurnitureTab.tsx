"use client";

import {
  Armchair,
  Check,
  CheckCircle2,
  Copy,
  Minus,
  PackageCheck,
  PackageOpen,
  Plus,
  Search,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { money, num, pick, relativeTime, sep } from "@/lib/portal/format";
import { kitOf, mergeKit, minQuantity, quantityEditable, quantityPatch, removable, standardKit, stockLeft, type KitLine } from "@/lib/portal/furniture";
import { equipmentStageLabel } from "@/lib/portal/i18n";
import { newId } from "@/lib/portal/store";
import type { Booth, EquipmentOrder, InventoryItem } from "@/lib/portal/types";
import { useExhibition } from "../ExhibitionProvider";
import { usePortal } from "../PortalProvider";
import { normalizeSearch } from "../SearchPalette";
import { Button, Combobox, IconButton, Input, Pill } from "../ui";
import { equipmentPatch, nextEquipmentStep } from "@/lib/portal/furniture";

const CATEGORY: Record<InventoryItem["category"], { fa: string; en: string }> = {
  furniture: { fa: "مبلمان", en: "Furniture" },
  av: { fa: "صوت و تصویر", en: "Audio & video" },
  appliance: { fa: "لوازم", en: "Appliances" },
  cooling: { fa: "سرمایش", en: "Cooling" },
  electrical: { fa: "برق", en: "Electrical" },
  lighting: { fa: "نور", en: "Lighting" },
  connectivity: { fa: "اینترنت", en: "Connectivity" },
  signage: { fa: "تابلو", en: "Signage" },
  other: { fa: "سایر", en: "Other" },
};

const stageTone: Record<string, "neutral" | "warn" | "info" | "ok" | "danger"> = {
  requested: "warn",
  reserved: "warn",
  prepared: "info",
  delivered: "info",
  collected: "ok",
  issue: "danger",
  cancelled: "neutral",
};

/**
 * A booth's furniture list. Tap an item in the catalogue to add one, use − and + to change
 * amounts, and remove lines that haven't gone out yet.
 */
export function FurnitureTab({ booth }: { booth: Booth }) {
  const { lang, store, can, toast } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const orders = useMemo(() => (x.ordersByBooth.get(booth.id) ?? []).filter((o) => o.stage !== "cancelled"), [x.ordersByBooth, booth.id]);
  const summary = x.equipmentByBooth.get(booth.id);
  const items = useMemo(() => x.items.filter((i) => !i.archived_at), [x.items]);
  const [catalogOpen, setCatalogOpen] = useState(orders.length === 0);
  // Lines inserted this session, so quick repeated taps top up the same line.
  const recent = useRef(new Map<string, string>());

  const returnable = (o: EquipmentOrder) => x.itemById.get(o.item_id)?.returnable ?? true;
  const pending = orders.filter((o) => nextEquipmentStep(o, returnable(o)) === "deliver");
  const collectable = orders.filter((o) => nextEquipmentStep(o, returnable(o)) === "collect");
  const rentTotal = orders.reduce((s, o) => s + (o.unit_price ?? 0) * o.quantity, 0);

  const lineFor = (itemId: string): EquipmentOrder | undefined => {
    const fromList = orders.find((o) => o.item_id === itemId && quantityEditable(o));
    const id = fromList?.id ?? recent.current.get(itemId);
    const fresh = id ? (store.findRow("equipment_orders", id) as EquipmentOrder | undefined) : undefined;
    return fresh && quantityEditable(fresh) ? fresh : undefined;
  };

  async function setQuantity(o: EquipmentOrder, next: number) {
    const fresh = (store.findRow("equipment_orders", o.id) as EquipmentOrder | undefined) ?? o;
    const patch = quantityPatch(fresh, next);
    if (patch) await store.update("equipment_orders", o.id, patch);
  }

  async function add(itemId: string, quantity = 1) {
    const line = lineFor(itemId);
    if (line) return setQuantity(line, line.quantity + quantity);
    const item = x.itemById.get(itemId);
    const id = newId();
    recent.current.set(itemId, id);
    await store.insert("equipment_orders", {
      id,
      exhibition_id: booth.exhibition_id,
      booth_id: booth.id,
      deal_id: booth.deal_id,
      item_id: itemId,
      quantity,
      unit_price: item?.rental_rate ?? null,
      stage: "requested",
      delivered_qty: 0,
      collected_qty: 0,
      damaged_qty: 0,
    });
  }

  async function applyKit(kit: KitLine[], label: string) {
    const { updates, inserts } = mergeKit(orders, kit);
    await Promise.all([
      ...updates.map((u) => store.update("equipment_orders", u.id, { quantity: u.quantity, ...(u.stage ? { stage: u.stage } : {}) })),
      ...inserts.map((i) => add(i.item_id, i.quantity)),
    ]);
    const pieces = kit.reduce((s, k) => s + k.quantity, 0);
    toast(fa ? `${label}: ${num(lang, pieces)} قلم اضافه شد` : `${label}: ${pieces} pieces added`);
  }

  async function bulk(step: "deliver" | "collect") {
    const list = step === "deliver" ? pending : collectable;
    await Promise.all(list.map((o) => store.update("equipment_orders", o.id, equipmentPatch(o, step))));
    toast(step === "deliver" ? (fa ? "همه اقلام تحویل شد" : "Everything delivered") : fa ? "همه اقلام جمع آوری شد" : "Everything collected");
  }

  const otherBooths = useMemo(
    () =>
      x.booths
        .filter((b) => b.id !== booth.id && (x.ordersByBooth.get(b.id)?.some((o) => o.stage !== "cancelled") ?? false))
        .sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true })),
    [x.booths, x.ordersByBooth, booth.id],
  );

  return (
    <div className="grid gap-4" data-tour="furniture">
      {summary && orders.length ? (
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            [fa ? "کل اقلام" : "Pieces", summary.pieces],
            [fa ? "مانده تحویل" : "To deliver", summary.toDeliver],
            [fa ? "مانده جمع آوری" : "To collect", summary.toCollect],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-xl bg-p-surface-2 px-2 py-2">
              <p className="text-[11px] text-p-ink-3">{label}</p>
              <p className="tabular text-base font-bold">{num(lang, value as number)}</p>
            </div>
          ))}
        </div>
      ) : null}

      {can.edit && (pending.length > 0 || collectable.length > 0) ? (
        <div className="grid grid-cols-2 gap-2">
          <Button tone="primary" icon={<PackageCheck className="size-4" />} disabled={!pending.length} onClick={() => bulk("deliver")}>
            {fa ? "تحویل همه" : "Deliver all"}
          </Button>
          <Button icon={<PackageOpen className="size-4" />} disabled={!collectable.length} onClick={() => bulk("collect")}>
            {fa ? "جمع آوری همه" : "Collect all"}
          </Button>
        </div>
      ) : null}

      {orders.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed border-p-line-strong px-4 py-5 text-center">
          <Armchair className="size-6 text-p-ink-3" />
          <p className="text-sm text-p-ink-3">{fa ? "برای این غرفه هنوز تجهیزاتی ثبت نشده." : "No furniture for this booth yet."}</p>
          {can.edit ? (
            <Button
              tone="quiet"
              size="sm"
              icon={<Sparkles className="size-4" />}
              onClick={() => applyKit(standardKit(booth.area_m2, items), fa ? "بسته استاندارد" : "Standard kit")}
            >
              {fa ? "بسته استاندارد این متراژ" : "Standard kit for this size"}
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="grid gap-2">
          {orders.map((o) => (
            <FurnitureLine key={o.id} order={o} onQuantity={(q) => setQuantity(o, q)} />
          ))}
        </ul>
      )}

      {orders.length && rentTotal > 0 && x.exhibition ? (
        <p className="text-xs text-p-ink-3">
          {fa ? "اجاره روزانه این اقلام:" : "Daily rent for these items:"} <span className="tabular font-semibold text-p-ink">{money(lang, rentTotal, x.exhibition.currency)}</span>
        </p>
      ) : null}

      {can.edit ? (
        <section className="grid gap-3 rounded-2xl border border-p-line p-3">
          <button type="button" onClick={() => setCatalogOpen((v) => !v)} className="flex items-center gap-2 text-start text-sm font-semibold">
            <Plus className="size-4 text-p-brand" />
            <span className="flex-1">{fa ? "افزودن تجهیزات" : "Add furniture"}</span>
            <span className="text-xs font-normal text-p-ink-3">{catalogOpen ? (fa ? "بستن" : "Hide") : fa ? "نمایش فهرست" : "Show list"}</span>
          </button>
          {catalogOpen ? (
            <Catalog items={items} orders={orders} onAdd={(id) => add(id)} />
          ) : null}
          {otherBooths.length ? (
            <CopyFrom
              booths={otherBooths}
              onPick={(b) => {
                const kit = kitOf(x.ordersByBooth.get(b.id) ?? []);
                if (kit.length) applyKit(kit, fa ? `کپی از ${b.code}` : `Copied from ${b.code}`);
              }}
            />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function FurnitureLine({ order: o, onQuantity }: { order: EquipmentOrder; onQuantity: (q: number) => void }) {
  const { lang, store, can, toast } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const [confirm, setConfirm] = useState(false);
  const item = x.itemById.get(o.item_id);
  const returnable = item?.returnable ?? true;
  const step = nextEquipmentStep(o, returnable);
  const editable = can.edit && quantityEditable(o);
  const min = minQuantity(o);

  return (
    <li className="grid gap-2 rounded-xl border border-p-line bg-p-surface px-3 py-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{item ? pick(lang, item.name_fa, item.name_en) : "—"}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-p-ink-3">
            <Pill tone={stageTone[o.stage]} className="h-5 px-1.5 text-[11px]">
              {equipmentStageLabel[o.stage][lang]}
            </Pill>
            {o.delivered_qty > 0 && o.delivered_qty < o.quantity ? (
              <span>{fa ? `${num(lang, o.delivered_qty)} از ${num(lang, o.quantity)} تحویل شده` : `${o.delivered_qty} of ${o.quantity} delivered`}</span>
            ) : null}
            {o.stage === "collected" && o.collected_at ? relativeTime(lang, o.collected_at) : o.delivered_at ? relativeTime(lang, o.delivered_at) : null}
            {!returnable ? <span>{fa ? "، برگشت ندارد" : "· not returned"}</span> : null}
            {o.damaged_qty > 0 ? <span className="text-p-danger">· {fa ? `${num(lang, o.damaged_qty)} آسیب دیده` : `${o.damaged_qty} damaged`}</span> : null}
            {o.notes ? <span className="text-p-danger">· {o.notes}</span> : null}
          </p>
        </div>
        {can.edit ? (
          o.stage === "issue" ? (
            <IconButton
              size="sm"
              label={fa ? "رفع مشکل" : "Resolve"}
              onClick={() => store.update("equipment_orders", o.id, { stage: o.delivered_qty > 0 ? "delivered" : "requested", notes: null })}
            >
              <CheckCircle2 className="size-4 text-p-ok" />
            </IconButton>
          ) : o.stage !== "collected" ? (
            <IconButton
              size="sm"
              label={fa ? "گزارش مشکل" : "Report an issue"}
              onClick={() => store.update("equipment_orders", o.id, { stage: "issue", notes: o.notes ?? (fa ? "نیاز به بررسی" : "Needs a look") })}
            >
              <TriangleAlert className="size-4" />
            </IconButton>
          ) : null
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex h-9 items-stretch overflow-hidden rounded-xl border border-p-line" aria-label={fa ? "تعداد" : "Quantity"}>
          <button
            type="button"
            aria-label={fa ? "یکی کمتر" : "One less"}
            disabled={!editable || o.quantity <= min}
            onClick={() => onQuantity(o.quantity - 1)}
            className="grid w-9 place-items-center text-p-ink-2 hover:bg-p-sunken disabled:opacity-30"
          >
            <Minus className="size-4" />
          </button>
          <span className="tabular grid min-w-9 place-items-center px-1 text-sm font-bold">{num(lang, o.quantity)}</span>
          <button
            type="button"
            aria-label={fa ? "یکی بیشتر" : "One more"}
            disabled={!editable}
            onClick={() => onQuantity(o.quantity + 1)}
            className="grid w-9 place-items-center text-p-ink-2 hover:bg-p-sunken disabled:opacity-30"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <span className="text-xs text-p-ink-3">{item ? pick(lang, item.unit_fa, item.unit_en) : ""}</span>
        <span className="flex-1" />
        {can.edit && removable(o) ? (
          confirm ? (
            <span className="flex items-center gap-1">
              <Button
                size="sm"
                tone="danger"
                onClick={async () => {
                  await store.remove("equipment_orders", o.id);
                  toast(fa ? "حذف شد" : "Removed");
                }}
              >
                {fa ? "حذف شود" : "Remove"}
              </Button>
              <Button size="sm" tone="ghost" onClick={() => setConfirm(false)}>
                {fa ? "نه" : "Keep"}
              </Button>
            </span>
          ) : (
            <IconButton size="sm" label={fa ? "حذف از فهرست" : "Remove from list"} onClick={() => setConfirm(true)}>
              <Trash2 className="size-4" />
            </IconButton>
          )
        ) : null}
        {can.edit && !confirm ? (
          step ? (
            <Button size="sm" tone={step === "deliver" ? "primary" : "secondary"} onClick={() => store.update("equipment_orders", o.id, equipmentPatch(o, step))}>
              {step === "deliver" ? (fa ? "تحویل" : "Deliver") : fa ? "جمع آوری" : "Collect"}
            </Button>
          ) : (
            <Check className="size-5 text-p-ok" aria-label={fa ? "انجام شد" : "Done"} />
          )
        ) : null}
      </div>
    </li>
  );
}

function Catalog({ items, orders, onAdd }: { items: InventoryItem[]; orders: EquipmentOrder[]; onAdd: (itemId: string) => void }) {
  const { lang } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<InventoryItem["category"] | "all">("all");
  const categories = [...new Set(items.map((i) => i.category))];
  const q = normalizeSearch(query);
  const shown = items.filter(
    (i) => (category === "all" || i.category === category) && (!q || normalizeSearch(`${i.name_fa} ${i.name_en ?? ""} ${i.sku}`).includes(q)),
  );
  const inList = new Map<string, number>();
  for (const o of orders) inList.set(o.item_id, (inList.get(o.item_id) ?? 0) + o.quantity);

  return (
    <div className="grid gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-p-ink-3" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={fa ? "جستجوی قلم" : "Search items"} className="ps-9" aria-label={fa ? "جستجوی قلم" : "Search items"} />
      </div>
      <div className="scroll-fade thin-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {(["all", ...categories] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={cn(
              "h-7 shrink-0 rounded-full px-3 text-xs font-medium transition-colors",
              category === c ? "bg-p-ink text-p-surface" : "bg-p-sunken text-p-ink-2 hover:bg-p-line",
            )}
          >
            {c === "all" ? (fa ? "همه" : "All") : CATEGORY[c][lang]}
          </button>
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {shown.map((i) => {
          const left = stockLeft(i, x.orders);
          const count = inList.get(i.id) ?? 0;
          const low = left <= i.low_stock_threshold;
          return (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => onAdd(i.id)}
                className={cn(
                  "relative grid h-full w-full gap-1 rounded-xl border px-3 py-2.5 text-start transition-[background,border,transform] active:scale-[0.98]",
                  count ? "border-p-brand bg-p-brand-soft/50" : "border-p-line hover:border-p-line-strong",
                )}
              >
                <span className="pe-7 text-[13px] font-semibold leading-snug">{pick(lang, i.name_fa, i.name_en)}</span>
                <span className={cn("text-[11px]", left <= 0 ? "text-p-danger" : low ? "text-p-warn" : "text-p-ink-3")}>
                  {left <= 0 ? (fa ? "در انبار نیست" : "Out of stock") : fa ? `${num(lang, left)} در انبار` : `${left} in stock`}
                </span>
                <span
                  className={cn(
                    "absolute end-2 top-2 grid size-6 place-items-center rounded-full text-[11px] font-bold",
                    count ? "bg-p-brand text-p-brand-ink" : "bg-p-sunken text-p-ink-2",
                  )}
                >
                  {count ? num(lang, count) : <Plus className="size-3.5" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {!shown.length ? <p className="text-center text-xs text-p-ink-3">{fa ? "قلمی پیدا نشد" : "Nothing matches"}</p> : null}
      <p className="text-[11px] text-p-ink-3">{fa ? "هر بار زدن روی یک قلم، یکی اضافه می کند." : "Each tap adds one."}</p>
    </div>
  );
}

function CopyFrom({ booths, onPick }: { booths: Booth[]; onPick: (b: Booth) => void }) {
  const { lang } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <Button size="sm" tone="ghost" className="justify-self-start" icon={<Copy className="size-4" />} onClick={() => setOpen(true)}>
        {fa ? "کپی فهرست از غرفه دیگر" : "Copy the list from another booth"}
      </Button>
    );
  return (
    <Combobox
      autoFocus
      items={booths}
      getKey={(b) => b.id}
      getLabel={(b) => b.code}
      getHint={(b) => {
        const deal = b.deal_id ? x.dealById.get(b.deal_id) : null;
        const company = deal ? x.companyById.get(deal.company_id) : null;
        const pieces = (x.ordersByBooth.get(b.id) ?? []).reduce((s, o) => s + (o.stage === "cancelled" ? 0 : o.quantity), 0);
        return [company ? pick(lang, company.name_fa, company.name_en) : null, fa ? `${num(lang, pieces)} قلم` : `${pieces} pieces`].filter(Boolean).join(sep(lang));
      }}
      placeholder={fa ? "کد غرفه" : "Booth code"}
      emptyText={fa ? "غرفه ای پیدا نشد" : "No booth found"}
      onPick={(b) => {
        onPick(b);
        setOpen(false);
      }}
    />
  );
}
