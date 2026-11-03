"use client";

import {
  Columns3,
  DoorOpen,
  Grid3x3,
  List,
  Map as MapIcon,
  MousePointer2,
  Pencil,
  Plus,
  Redo2,
  Search,
  Settings2,
  Square,
  SquareDashed,
  Trash2,
  Type,
  Undo2,
  X,
  Zap,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { area, compact, num, percent, pick } from "@/lib/portal/format";
import { nextCode, overlapping, type Rect } from "@/lib/portal/geometry";
import { boothStatusLabel, featureLabel } from "@/lib/portal/i18n";
import { type EquipmentState } from "@/lib/portal/metrics";
import { paidShare } from "@/lib/portal/money";
import { newId, type AnyRow } from "@/lib/portal/store";
import type { Booth, BoothStatus, FeatureKind, Hall, HallFeature, Patch } from "@/lib/portal/types";
import { useExhibition } from "../ExhibitionProvider";
import { usePortal } from "../PortalProvider";
import { normalizeSearch } from "../SearchPalette";
import { Button, Empty, IconButton, Segmented, Sheet, Skeleton, TonePill } from "../ui";
import { BoothPanel, type PanelTab } from "./BoothPanel";
import { FeaturePanel } from "./FeaturePanel";
import { HallCanvas, type CanvasBooth, type CanvasFeature, type CanvasTool } from "./HallCanvas";
import { HallSetupSheet } from "./HallSetupSheet";

type Layer = "sales" | "equipment";
type Op = { table: "booths" | "hall_features"; id: string; before: AnyRow | null; after: AnyRow | null };

const SALES_TONES: BoothStatus[] = ["available", "held", "reserved", "contracted", "paid", "blocked"];
const EQUIPMENT_TONES: EquipmentState[] = ["none", "waiting", "partial", "delivered", "collecting", "collected", "issue"];

const equipmentToneLabel: Record<EquipmentState, { fa: string; en: string }> = {
  none: { fa: "بدون تجهیزات", en: "No equipment" },
  waiting: { fa: "منتظر تحویل", en: "Waiting" },
  partial: { fa: "تحویل ناقص", en: "Part delivered" },
  delivered: { fa: "تحویل شده", en: "Delivered" },
  collecting: { fa: "در حال جمع آوری", en: "Collecting" },
  collected: { fa: "جمع آوری شده", en: "Collected" },
  issue: { fa: "مشکل", en: "Issue" },
};

const TOOLS: Array<{ tool: CanvasTool; icon: React.ReactNode }> = [
  { tool: "select", icon: <MousePointer2 className="size-4" /> },
  { tool: "booth", icon: <Square className="size-4" /> },
  { tool: "aisle", icon: <SquareDashed className="size-4" /> },
  { tool: "column", icon: <Grid3x3 className="size-4" /> },
  { tool: "wall", icon: <Columns3 className="size-4" /> },
  { tool: "entrance", icon: <DoorOpen className="size-4" /> },
  { tool: "zone", icon: <SquareDashed className="size-4" /> },
  { tool: "utility", icon: <Zap className="size-4" /> },
  { tool: "label", icon: <Type className="size-4" /> },
];

const MORE_FEATURES: FeatureKind[] = ["door", "loading", "stage", "service"];

export function MapWorkspace() {
  const { lang, store, can, toast } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const params = useSearchParams();
  const router = useRouter();

  const [hallChoice, setHallChoice] = useState<string | null>(params.get("hall"));
  const [layer, setLayer] = useState<Layer>("sales");
  const [view, setView] = useState<"map" | "list">("map");
  const [editing, setEditing] = useState(false);
  const [tool, setTool] = useState<CanvasTool>("select");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<PanelTab>("sales");
  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null);
  const [setup, setSetup] = useState<"new" | "edit" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [assignDealId, setAssignDealId] = useState<string | null>(params.get("assign"));
  const undo = useRef<Op[][]>([]);
  const redo = useRef<Op[][]>([]);
  const [counts, setCounts] = useState({ undo: 0, redo: 0 });
  const syncCounts = () => setCounts({ undo: undo.current.length, redo: redo.current.length });
  const [bgUrl, setBgUrl] = useState<{ path: string; url: string | null } | null>(null);

  const hall: Hall | null = x.halls.find((h) => h.id === hallChoice) ?? x.halls[0] ?? null;
  const hallBooths = useMemo(() => x.booths.filter((b) => b.hall_id === hall?.id), [x.booths, hall?.id]);
  const hallFeatures = useMemo(() => x.features.filter((f) => f.hall_id === hall?.id), [x.features, hall?.id]);
  const assignDeal = assignDealId ? (x.dealById.get(assignDealId) ?? null) : null;

  // Open a booth from a link (?booth=...).
  const boothParam = params.get("booth");
  const [handledParam, setHandledParam] = useState<string | null>(null);
  if (boothParam && handledParam !== boothParam && x.ready) {
    const b = x.booths.find((bb) => bb.id === boothParam);
    if (b) {
      setHandledParam(boothParam);
      setHallChoice(b.hall_id);
      setSelected(new Set([b.id]));
      setFocus((f) => ({ id: b.id, nonce: (f?.nonce ?? 0) + 1 }));
    }
  }

  // Signed URL for the tracing image.
  useEffect(() => {
    const path = hall?.background_path;
    if (!path) return;
    let cancelled = false;
    store.fileUrl("hall-plans", path).then((url) => {
      if (!cancelled) setBgUrl({ path, url });
    });
    return () => {
      cancelled = true;
    };
  }, [hall?.background_path, store]);
  const background = hall?.background_path && bgUrl?.path === hall.background_path && bgUrl.url ? { url: bgUrl.url, opacity: Number(hall.background_opacity) } : null;

  /* ---------------------------------------------------------- history */

  const apply = useCallback(
    async (ops: Op[], direction: "do" | "undo") => {
      for (const op of ops) {
        const from = direction === "do" ? op.before : op.after;
        const to = direction === "do" ? op.after : op.before;
        if (!to && from) await store.remove(op.table, op.id);
        else if (to && !from) await store.insert(op.table, to as never);
        else if (to) {
          const patch: Record<string, unknown> = {};
          for (const key of ["x", "y", "width", "depth", "code", "status", "deal_id", "notes", "open_sides", "area_m2", "area_is_manual", "price_override", "kind", "label_fa", "label_en", "rotation", "zone"]) {
            if (key in to && to[key] !== from?.[key]) patch[key] = to[key];
          }
          if (Object.keys(patch).length) await store.update(op.table, op.id, patch as never);
        }
      }
    },
    [store],
  );

  const commit = useCallback(
    async (ops: Op[]) => {
      if (!ops.length) return;
      undo.current.push(ops);
      if (undo.current.length > 100) undo.current.shift();
      redo.current = [];
      syncCounts();
      await apply(ops, "do");
    },
    [apply],
  );

  const runUndo = useCallback(async () => {
    const ops = undo.current.pop();
    if (!ops) return;
    redo.current.push(ops);
    syncCounts();
    await apply([...ops].reverse(), "undo");
  }, [apply]);

  const runRedo = useCallback(async () => {
    const ops = redo.current.pop();
    if (!ops) return;
    undo.current.push(ops);
    syncCounts();
    await apply(ops, "do");
  }, [apply]);

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) runRedo();
        else runUndo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        runRedo();
      }
      if (e.key === "Escape") {
        setTool("select");
        setSelected(new Set());
      }
      const shortcuts: Record<string, CanvasTool> = { v: "select", b: "booth", a: "aisle", c: "column", w: "wall", e: "entrance", l: "label" };
      const t = shortcuts[e.key.toLowerCase()];
      if (t && !e.metaKey && !e.ctrlKey) setTool(t);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, runUndo, runRedo]);

  /* ---------------------------------------------------------- edits */

  const rowOf = (table: "booths" | "hall_features", id: string) =>
    (table === "booths" ? x.booths.find((b) => b.id === id) : x.features.find((f) => f.id === id)) as unknown as AnyRow | undefined;

  const updateRow = (table: "booths" | "hall_features", id: string, patch: Record<string, unknown>) => {
    const before = rowOf(table, id);
    if (!before) return;
    commit([{ table, id, before, after: { ...before, ...patch } }]);
  };

  const onMove = (ids: string[], kind: "booth" | "feature", dx: number, dy: number) => {
    if (!hall) return;
    const table = kind === "booth" ? "booths" : "hall_features";
    const ops: Op[] = [];
    for (const id of ids) {
      const before = rowOf(table, id);
      if (!before) continue;
      const w = Number(before.width);
      const d = Number(before.depth);
      const nx = Math.max(0, Math.min(hall.width_m - w, Number(before.x) + dx));
      const ny = Math.max(0, Math.min(hall.depth_m - d, Number(before.y) + dy));
      ops.push({ table, id, before, after: { ...before, x: Math.round(nx * 100) / 100, y: Math.round(ny * 100) / 100 } });
    }
    commit(ops);
  };

  const onResize = (id: string, kind: "booth" | "feature", r: Rect) => updateRow(kind === "booth" ? "booths" : "hall_features", id, { ...r });

  const onDraw = (r: Rect) => {
    if (!hall || !x.exhibition) return;
    const now = new Date().toISOString();
    if (tool === "booth") {
      const selectedBooth = [...selected].map((id) => hallBooths.find((b) => b.id === id)).find(Boolean);
      const prefix = selectedBooth ? (/^[^\d]*/.exec(selectedBooth.code)?.[0] ?? undefined) : undefined;
      const code = nextCode(
        x.booths.filter((b) => b.hall_id === hall.id).map((b) => b.code),
        prefix,
      );
      const row = {
        id: newId(),
        hall_id: hall.id,
        exhibition_id: x.exhibition.id,
        code,
        x: r.x,
        y: r.y,
        width: r.width,
        depth: r.depth,
        rotation: 0,
        area_m2: Math.round(r.width * r.depth * 100) / 100,
        area_is_manual: false,
        open_sides: 1,
        status: "available",
        created_at: now,
        updated_at: now,
      } as unknown as AnyRow;
      commit([{ table: "booths", id: row.id, before: null, after: row }]);
      setSelected(new Set([row.id]));
    } else {
      const kind = tool as FeatureKind;
      const label = kind === "column" ? null : featureLabel[kind].fa;
      const row = {
        id: newId(),
        hall_id: hall.id,
        exhibition_id: x.exhibition.id,
        kind,
        label_fa: label,
        label_en: kind === "column" ? null : featureLabel[kind].en,
        x: r.x,
        y: r.y,
        width: r.width,
        depth: r.depth,
        rotation: 0,
        style: {},
        created_at: now,
        updated_at: now,
      } as unknown as AnyRow;
      commit([{ table: "hall_features", id: row.id, before: null, after: row }]);
      setSelected(new Set([row.id]));
    }
  };

  const deleteIds = (ids: string[]) => {
    const ops: Op[] = [];
    for (const id of ids) {
      const booth = rowOf("booths", id);
      if (booth) ops.push({ table: "booths", id, before: booth, after: null });
      const feature = rowOf("hall_features", id);
      if (feature) ops.push({ table: "hall_features", id, before: feature, after: null });
    }
    commit(ops);
    setSelected(new Set());
    setConfirmDelete(null);
  };

  const requestDelete = (ids: string[]) => {
    if (!ids.length) return;
    const booths = ids.map((id) => x.booths.find((b) => b.id === id)).filter(Boolean) as Booth[];
    if (booths.length && !can.manage) {
      toast(fa ? "حذف غرفه فقط برای مدیران مجاز است" : "Only managers can delete booths", "error");
      return;
    }
    const risky = booths.some((b) => b.deal_id || (x.ordersByBooth.get(b.id)?.length ?? 0) > 0);
    if (risky || ids.length > 3) setConfirmDelete(ids);
    else deleteIds(ids);
  };

  /* ---------------------------------------------------------- visuals */

  const flagged = useMemo(() => (editing ? overlapping(hallBooths) : new Set<string>()), [editing, hallBooths]);
  const q = normalizeSearch(query);

  const decorated = useMemo(() => {
    return hallBooths.map((b) => {
      const deal = b.deal_id ? x.dealById.get(b.deal_id) : undefined;
      const company = deal ? x.companyById.get(deal.company_id) : undefined;
      const companyName = company ? pick(lang, company.name_fa, company.name_en) : "";
      const eq = x.equipmentByBooth.get(b.id);
      const balance = deal ? x.balanceByDeal.get(deal.id) : undefined;
      const share = paidShare(balance);
      const tone = layer === "sales" ? b.status : (eq?.state ?? "none");
      const matchesQuery = !q || normalizeSearch(`${b.code} ${company?.name_fa ?? ""} ${company?.name_en ?? ""}`).includes(q);
      const visible = !hidden.has(tone) && matchesQuery;
      let subtitle: string;
      let progress: number | null = null;
      let badge: string | null = null;
      if (layer === "sales") {
        subtitle = share != null ? `${area(lang, b.area_m2)} · ${percent(lang, share)}` : area(lang, b.area_m2);
        progress = share;
      } else {
        const strike = x.phase === "strike" || x.phase === "after";
        badge = eq && eq.pieces ? num(lang, eq.pieces) : null;
        if (!eq || !eq.lines) subtitle = fa ? "بدون تجهیزات" : "No equipment";
        else if (strike || eq.collected > 0) subtitle = eq.toCollect ? (fa ? `${num(lang, eq.toCollect)} مانده جمع آوری` : `${eq.toCollect} to collect`) : fa ? "جمع آوری کامل" : "All collected";
        else subtitle = eq.toDeliver ? (fa ? `${num(lang, eq.toDeliver)} مانده تحویل` : `${eq.toDeliver} to deliver`) : fa ? "تحویل کامل" : "All delivered";
        if (eq && eq.pieces) progress = strike || eq.collected > 0 ? (eq.delivered ? eq.collected / eq.delivered : 0) : (eq.pieces - eq.toDeliver) / eq.pieces;
      }
      return {
        booth: b,
        companyName,
        tone,
        visible,
        canvas: {
          id: b.id,
          x: b.x,
          y: b.y,
          width: b.width,
          depth: b.depth,
          rotation: b.rotation,
          code: b.code,
          tone,
          title: companyName || (b.status === "available" ? (fa ? "آزاد" : "Free") : boothStatusLabel[b.status][lang]),
          subtitle,
          badge,
          progress,
          dim: !visible,
          flagged: flagged.has(b.id),
        } satisfies CanvasBooth,
      };
    });
  }, [hallBooths, x.dealById, x.companyById, x.equipmentByBooth, x.balanceByDeal, x.phase, layer, lang, fa, q, hidden, flagged]);

  const canvasFeatures = useMemo<CanvasFeature[]>(
    () =>
      hallFeatures.map((f) => ({
        id: f.id,
        kind: f.kind,
        x: f.x,
        y: f.y,
        width: f.width,
        depth: f.depth,
        label: pick(lang, f.label_fa, f.label_en) || null,
      })),
    [hallFeatures, lang],
  );

  const toneCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of decorated) counts.set(d.tone, (counts.get(d.tone) ?? 0) + 1);
    return counts;
  }, [decorated]);

  const tones = layer === "sales" ? SALES_TONES : EQUIPMENT_TONES;
  const toneLabel = (tone: string) => (layer === "sales" ? boothStatusLabel[tone as BoothStatus][lang] : equipmentToneLabel[tone as EquipmentState][lang]);

  const selectedBooth = selected.size === 1 ? (hallBooths.find((b) => selected.has(b.id)) ?? null) : null;
  const selectedFeature = selected.size === 1 && editing ? (hallFeatures.find((f) => selected.has(f.id)) ?? null) : null;

  const totals = useMemo(() => {
    let sold = 0;
    let total = 0;
    for (const b of hallBooths) {
      if (b.status === "blocked") continue;
      total += b.area_m2;
      if (b.status === "reserved" || b.status === "contracted" || b.status === "paid") sold += b.area_m2;
    }
    return { sold, total };
  }, [hallBooths]);

  /* ---------------------------------------------------------- render */

  if (!x.ready) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Skeleton className="h-12" />
        <Skeleton className="flex-1" />
      </div>
    );
  }
  if (!x.exhibition) {
    return (
      <div className="p-6">
        <Empty icon={<MapIcon className="size-6" />} title={fa ? "اول یک نمایشگاه بسازید" : "Create an exhibition first"} />
      </div>
    );
  }

  const panelOpen = Boolean(selectedBooth || selectedFeature || (editing && selected.size > 1));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 border-b border-p-line bg-p-surface px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2">
          <div className="thin-scroll scroll-fade flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {x.halls.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => {
                  setHallChoice(h.id);
                  setSelected(new Set());
                }}
                className={cn(
                  "h-9 shrink-0 rounded-xl px-3 text-[13px] font-semibold transition-colors",
                  h.id === hall?.id ? "bg-p-ink text-p-bg" : "text-p-ink-2 hover:bg-p-sunken",
                )}
              >
                {pick(lang, h.name_fa, h.name_en)}
                <span className="tabular ms-1.5 text-[11px] font-medium opacity-70">{num(lang, x.booths.filter((b) => b.hall_id === h.id).length)}</span>
              </button>
            ))}
            {can.edit ? (
              <IconButton label={fa ? "سالن جدید" : "New hall"} size="sm" onClick={() => setSetup("new")}>
                <Plus className="size-4" />
              </IconButton>
            ) : null}
          </div>
          <Segmented
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: "map", label: <span className="sr-only sm:not-sr-only">{fa ? "نقشه" : "Map"}</span>, icon: <MapIcon className="size-3.5" /> },
              { value: "list", label: <span className="sr-only sm:not-sr-only">{fa ? "فهرست" : "List"}</span>, icon: <List className="size-3.5" /> },
            ]}
          />
          {hall && can.edit ? (
            <>
              <IconButton label={fa ? "تنظیمات سالن" : "Hall settings"} size="sm" onClick={() => setSetup("edit")}>
                <Settings2 className="size-4" />
              </IconButton>
              <Button
                size="sm"
                tone={editing ? "primary" : "secondary"}
                icon={editing ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}
                onClick={() => {
                  setEditing((e) => !e);
                  setTool("select");
                  setView("map");
                }}
              >
                <span className="hidden sm:inline">{editing ? (fa ? "پایان ویرایش" : "Done") : fa ? "ویرایش نقشه" : "Edit plan"}</span>
              </Button>
            </>
          ) : null}
        </div>
        {hall ? (
          <div className="flex items-center gap-2">
            <Segmented
              size="sm"
              value={layer}
              onChange={(l) => {
                setLayer(l);
                setHidden(new Set());
                setTab(l === "equipment" ? "equipment" : "sales");
              }}
              options={[
                { value: "sales", label: fa ? "فروش" : "Sales" },
                { value: "equipment", label: fa ? "تجهیزات" : "Equipment" },
              ]}
            />
            <label className="relative hidden min-w-0 max-w-56 flex-1 sm:block">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-p-ink-3" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={fa ? "کد یا شرکت" : "Code or company"}
                className="h-8 w-full rounded-lg border border-p-line bg-p-surface-2 ps-8 pe-2 text-[13px] outline-none focus:border-p-brand"
              />
            </label>
            <div className="thin-scroll scroll-fade flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
              {tones.map((tone) => {
                const count = toneCounts.get(tone) ?? 0;
                if (!count && layer === "equipment") return null;
                const off = hidden.has(tone);
                return (
                  <button
                    key={tone}
                    type="button"
                    data-tone={tone}
                    aria-pressed={!off}
                    onClick={() =>
                      setHidden((h) => {
                        const next = new Set(h);
                        if (next.has(tone)) next.delete(tone);
                        else next.add(tone);
                        return next;
                      })
                    }
                    className={cn(
                      "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-opacity",
                      off ? "opacity-40" : "hover:bg-p-sunken",
                    )}
                  >
                    <span className="swatch" />
                    {toneLabel(tone)}
                    <span className="tabular text-p-ink-3">{num(lang, count)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* Body */}
      {!hall ? (
        <div className="grid flex-1 place-items-center p-6">
          <Empty
            icon={<MapIcon className="size-6" />}
            title={fa ? "هنوز سالنی برای این نمایشگاه نیست" : "This exhibition has no halls yet"}
            hint={
              fa
                ? "یک سالن با ابعادش بسازید، نقشه را روی آن بکشید یا عکس نقشه را زیر آن بگذارید و رویش بکشید."
                : "Add a hall with its size, then draw the plan by hand or trace over a photo of the drawing."
            }
            action={
              can.edit ? (
                <Button tone="primary" icon={<Plus className="size-4" />} onClick={() => setSetup("new")}>
                  {fa ? "ساخت سالن" : "Add a hall"}
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1">
          <div className={cn("relative min-w-0 flex-1", view === "list" && "hidden")}>
            <HallCanvas
              lang={lang}
              hall={hall}
              background={background}
              booths={decorated.map((d) => d.canvas)}
              features={canvasFeatures}
              selected={selected}
              editing={editing}
              tool={tool}
              focus={focus}
              onSelect={(id, kind, additive) => {
                if (!id) {
                  setSelected(new Set());
                  return;
                }
                if (kind === "feature" && !editing) return;
                setSelected((s) => {
                  if (!additive) return new Set([id]);
                  const next = new Set(s);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                });
              }}
              onMove={onMove}
              onResize={onResize}
              onDraw={onDraw}
              onDelete={() => requestDelete([...selected])}
            />
            {editing ? (
              <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
                <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-p-line bg-p-surface p-1 shadow-[var(--p-shadow-lg)]">
                  {TOOLS.map(({ tool: t, icon }) => (
                    <IconButton
                      key={t}
                      size="sm"
                      active={tool === t}
                      label={t === "select" ? (fa ? "انتخاب و جابجایی (V)" : "Select and move (V)") : t === "booth" ? (fa ? "کشیدن غرفه (B)" : "Draw booth (B)") : featureLabel[t as FeatureKind][lang]}
                      onClick={() => setTool(t)}
                    >
                      {icon}
                    </IconButton>
                  ))}
                  <select
                    aria-label={fa ? "عناصر دیگر" : "More elements"}
                    value={MORE_FEATURES.includes(tool as FeatureKind) ? tool : ""}
                    onChange={(e) => e.target.value && setTool(e.target.value as FeatureKind)}
                    className="h-8 rounded-lg bg-transparent px-1 text-xs text-p-ink-2 outline-none"
                  >
                    <option value="">{fa ? "بیشتر…" : "More…"}</option>
                    {MORE_FEATURES.map((k) => (
                      <option key={k} value={k}>
                        {featureLabel[k][lang]}
                      </option>
                    ))}
                  </select>
                  <span className="mx-1 h-6 w-px bg-p-line" />
                  <IconButton size="sm" label={fa ? "واگرد (Ctrl+Z)" : "Undo (Ctrl+Z)"} disabled={!counts.undo} onClick={runUndo}>
                    <Undo2 className="size-4 rtl:-scale-x-100" />
                  </IconButton>
                  <IconButton size="sm" label={fa ? "انجام دوباره" : "Redo"} disabled={!counts.redo} onClick={runRedo}>
                    <Redo2 className="size-4 rtl:-scale-x-100" />
                  </IconButton>
                  {selected.size ? (
                    <IconButton size="sm" label={fa ? "حذف انتخاب شده ها" : "Delete selection"} onClick={() => requestDelete([...selected])}>
                      <Trash2 className="size-4 text-p-danger" />
                    </IconButton>
                  ) : null}
                </div>
              </div>
            ) : null}
            {editing && tool !== "select" ? (
              <p className="pointer-events-none absolute inset-x-0 top-16 text-center text-xs font-medium text-p-ink-3">
                {tool === "booth"
                  ? fa
                    ? "برای ساخت غرفه، روی نقشه بکشید. اندازه ها به شبکه می چسبند."
                    : "Drag on the plan to draw a booth. Sizes snap to the grid."
                  : fa
                    ? `برای افزودن «${featureLabel[tool as FeatureKind].fa}»، بکشید یا بزنید.`
                    : `Drag or tap to add a ${featureLabel[tool as FeatureKind].en.toLowerCase()}.`}
              </p>
            ) : null}
            {flagged.size ? (
              <p className="absolute start-3 top-3 rounded-xl bg-p-danger-soft px-3 py-1.5 text-xs font-medium text-p-danger">
                {fa ? `${num(lang, flagged.size)} غرفه روی هم افتاده اند` : `${flagged.size} booths overlap`}
              </p>
            ) : null}
          </div>

          {view === "list" ? (
            <BoothList
              rows={decorated.filter((d) => d.visible)}
              layer={layer}
              toneLabel={toneLabel}
              onPick={(id) => {
                setSelected(new Set([id]));
              }}
              selectedId={selectedBooth?.id ?? null}
            />
          ) : null}

          {/* Side panel (desktop) / bottom sheet (phone) */}
          {panelOpen ? (
            <aside className="animate-sheet absolute inset-x-0 bottom-0 z-20 flex max-h-[72%] flex-col rounded-t-3xl border border-p-line bg-p-surface shadow-[var(--p-shadow-lg)] lg:static lg:max-h-none lg:w-[400px] lg:shrink-0 lg:rounded-none lg:border-y-0 lg:border-e-0 lg:shadow-none">
              <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-p-line-strong lg:hidden" />
              {selectedBooth ? (
                <BoothPanel
                  booth={selectedBooth}
                  tab={tab}
                  onTab={setTab}
                  onClose={() => setSelected(new Set())}
                  onUpdate={(patch: Patch<"booths">) => updateRow("booths", selectedBooth.id, patch as Record<string, unknown>)}
                  onDelete={() => requestDelete([selectedBooth.id])}
                  assignDeal={assignDeal}
                  onAssigned={() => {
                    setAssignDealId(null);
                    router.replace(`/${lang}/staff/map`);
                  }}
                />
              ) : selectedFeature ? (
                <FeaturePanel
                  feature={selectedFeature as HallFeature}
                  onClose={() => setSelected(new Set())}
                  onUpdate={(patch) => updateRow("hall_features", selectedFeature.id, patch as Record<string, unknown>)}
                  onDelete={() => requestDelete([selectedFeature.id])}
                />
              ) : (
                <div className="grid gap-3 p-4">
                  <p className="font-semibold">{fa ? `${num(lang, selected.size)} مورد انتخاب شده` : `${selected.size} selected`}</p>
                  <p className="text-sm text-p-ink-3">{fa ? "با کشیدن، همه با هم جابجا می شوند. با کلیدهای جهت هم می توانید جابجا کنید." : "Drag to move them together, or use the arrow keys."}</p>
                  <div className="flex gap-2">
                    <Button tone="danger" icon={<Trash2 className="size-4" />} onClick={() => requestDelete([...selected])}>
                      {fa ? "حذف" : "Delete"}
                    </Button>
                    <Button tone="ghost" onClick={() => setSelected(new Set())}>
                      {fa ? "لغو انتخاب" : "Clear selection"}
                    </Button>
                  </div>
                </div>
              )}
            </aside>
          ) : null}
        </div>
      )}

      {/* Footer */}
      {hall ? (
        <div className="flex items-center gap-3 border-t border-p-line bg-p-surface px-4 py-2 text-xs text-p-ink-3">
          <span className="tabular">
            {fa
              ? `${num(lang, hallBooths.length)} غرفه · ${num(lang, Math.round(totals.sold))} از ${num(lang, Math.round(totals.total))} متر فروخته شده`
              : `${hallBooths.length} booths · ${Math.round(totals.sold)} of ${Math.round(totals.total)} m² sold`}
          </span>
          <span className="tabular font-semibold text-p-ink-2">{totals.total ? percent(lang, totals.sold / totals.total) : ""}</span>
          <span className="flex-1" />
          <span className="hidden sm:inline" dir="ltr">
            {num(lang, hall.width_m)} × {num(lang, hall.depth_m)} {fa ? "متر" : "m"}
          </span>
        </div>
      ) : null}

      <HallSetupSheet
        open={setup !== null}
        hall={setup === "edit" ? hall : null}
        onClose={() => setSetup(null)}
        onCreated={(id) => {
          setHallChoice(id);
          setEditing(true);
          setTool("booth");
        }}
      />

      <Sheet
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={fa ? "حذف از نقشه؟" : "Delete from the plan?"}
        closeLabel={fa ? "بستن" : "Close"}
        footer={
          <>
            <Button tone="ghost" onClick={() => setConfirmDelete(null)}>
              {fa ? "انصراف" : "Cancel"}
            </Button>
            <Button tone="danger" onClick={() => confirmDelete && deleteIds(confirmDelete)} icon={<Trash2 className="size-4" />}>
              {fa ? "حذف" : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-p-ink-2">
          {fa
            ? `${num(lang, confirmDelete?.length ?? 0)} مورد حذف می شود. اگر غرفه ای شرکت یا تجهیزات دارد، شرکت و فاکتورها می مانند ولی اتصال به غرفه برداشته می شود. با «واگرد» برمی گردد.`
            : `${confirmDelete?.length ?? 0} items will be removed. Companies and invoices stay, but they lose the link to the booth. Undo brings it back.`}
        </p>
      </Sheet>
    </div>
  );
}

function BoothList({
  rows,
  layer,
  toneLabel,
  onPick,
  selectedId,
}: {
  rows: Array<{ booth: Booth; companyName: string; tone: string; canvas: CanvasBooth }>;
  layer: Layer;
  toneLabel: (tone: string) => string;
  onPick: (id: string) => void;
  selectedId: string | null;
}) {
  const { lang } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const sorted = [...rows].sort((a, b) => a.booth.code.localeCompare(b.booth.code, undefined, { numeric: true }));
  return (
    <div className="thin-scroll min-w-0 flex-1 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-p-surface-2 text-xs text-p-ink-3">
          <tr className="border-b border-p-line">
            <th className="px-4 py-2.5 text-start font-medium">{fa ? "غرفه" : "Booth"}</th>
            <th className="px-2 py-2.5 text-start font-medium">{fa ? "شرکت" : "Company"}</th>
            <th className="hidden px-2 py-2.5 text-start font-medium sm:table-cell">{fa ? "متراژ" : "Area"}</th>
            <th className="px-2 py-2.5 text-start font-medium">{fa ? "وضعیت" : "Status"}</th>
            <th className="hidden px-4 py-2.5 text-end font-medium md:table-cell">{layer === "sales" ? (fa ? "مانده" : "Balance") : fa ? "اقلام" : "Pieces"}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ booth, companyName, tone }) => {
            const balance = booth.deal_id ? x.balanceByDeal.get(booth.deal_id) : undefined;
            const eq = x.equipmentByBooth.get(booth.id);
            return (
              <tr
                key={booth.id}
                onClick={() => onPick(booth.id)}
                className={cn("cursor-pointer border-b border-p-line hover:bg-p-surface-2", selectedId === booth.id && "bg-p-brand-soft")}
              >
                <td className="px-4 py-2.5 font-semibold" dir="ltr">
                  {booth.code}
                </td>
                <td className="max-w-[14rem] truncate px-2 py-2.5">{companyName || <span className="text-p-ink-3">—</span>}</td>
                <td className="tabular hidden px-2 py-2.5 sm:table-cell">{area(lang, booth.area_m2)}</td>
                <td className="px-2 py-2.5">
                  <TonePill tone={tone}>{toneLabel(tone)}</TonePill>
                </td>
                <td className="tabular hidden px-4 py-2.5 text-end md:table-cell">
                  {layer === "sales" ? (balance ? compact(lang, Math.max(0, balance.balance)) : "—") : eq ? num(lang, eq.pieces) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.length === 0 ? <p className="py-12 text-center text-sm text-p-ink-3">{fa ? "غرفه ای با این فیلتر نیست" : "No booths match"}</p> : null}
    </div>
  );
}
