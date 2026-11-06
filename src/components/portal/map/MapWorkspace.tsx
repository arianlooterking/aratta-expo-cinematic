"use client";

import {
  Armchair,
  Building2,
  Columns3,
  Copy,
  DoorOpen,
  Hand,
  Keyboard,
  Lock,
  LockOpen,
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
import { area, compact, num, percent, pick, sep } from "@/lib/portal/format";
import { nextCode, overlapping, type Rect } from "@/lib/portal/geometry";
import { boothStatusLabel, featureLabel } from "@/lib/portal/i18n";
import { type EquipmentState } from "@/lib/portal/metrics";
import { boothWorkflow, nextStep, PROGRESS_TONES, problemStepLabel, progressTone, progressToneLabel, workflowShare, type ProgressTone } from "@/lib/portal/workflow";
import { paidShare } from "@/lib/portal/money";
import { newId, type AnyRow } from "@/lib/portal/store";
import type { Booth, BoothStatus, FeatureKind, Hall, HallFeature, Patch } from "@/lib/portal/types";
import { useExhibition } from "../ExhibitionProvider";
import { usePortal } from "../PortalProvider";
import { AvatarStack, StaffAvatar } from "../people";
import { normalizeSearch } from "../SearchPalette";
import { Button, Empty, IconButton, Kbd, MenuItem, Segmented, Sheet, Skeleton, TonePill } from "../ui";
import { BoothPanel, type PanelTab } from "./BoothPanel";
import { FeaturePanel } from "./FeaturePanel";
import { HallCanvas, type CanvasBooth, type CanvasFeature, type CanvasTool } from "./HallCanvas";
import { HallSetupSheet } from "./HallSetupSheet";
import { usePageTour } from "../Tour";

type Layer = "sales" | "equipment" | "work";
type Op = { table: "booths" | "hall_features"; id: string; before: AnyRow | null; after: AnyRow | null };

const SALES_TONES: Array<BoothStatus | "problem"> = ["available", "held", "reserved", "contracted", "paid", "blocked", "problem"];
const EQUIPMENT_TONES: Array<EquipmentState | "problem"> = ["none", "waiting", "partial", "delivered", "collecting", "collected", "issue", "problem"];

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

/** Structure (corridors, columns, entrances...) can be locked so it never moves by accident. */
export function isLocked(f: { style: unknown }) {
  return Boolean(f.style && typeof f.style === "object" && (f.style as { locked?: boolean }).locked);
}

export function MapWorkspace() {
  const { lang, store, can, toast, user } = usePortal();
  const x = useExhibition();
  usePageTour("map");
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
  const [mine, setMine] = useState(false);
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null);
  const [setup, setSetup] = useState<"new" | "edit" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [assignDealId, setAssignDealId] = useState<string | null>(params.get("assign"));
  const [menu, setMenu] = useState<{ id: string; kind: "booth" | "feature"; x: number; y: number } | null>(null);
  const [structureInfo, setStructureInfo] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<string | null>(null);
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
          for (const key of ["x", "y", "width", "depth", "code", "status", "deal_id", "notes", "open_sides", "area_m2", "area_is_manual", "price_override", "kind", "label_fa", "label_en", "rotation", "zone", "style", "manager_ids", "steps"]) {
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

  // Keys that work whether or not the plan is being edited.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [role=dialog]")) return;
      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
      } else if (e.key === "/") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>("[data-map-search]")?.focus();
      } else if (e.key === "Escape" && !editing) {
        setSelected(new Set());
        setMenu(null);
        setStructureInfo(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing]);

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

  const setLocked = (id: string, locked: boolean) => {
    const f = x.features.find((ff) => ff.id === id);
    if (!f) return;
    const style = f.style && typeof f.style === "object" && !Array.isArray(f.style) ? f.style : {};
    updateRow("hall_features", id, { style: { ...style, locked } });
    toast(locked ? (fa ? "قفل شد؛ دیگر جابجا نمی شود" : "Locked in place") : fa ? "قفل باز شد" : "Unlocked");
  };

  /** Add several hall features in one undoable step (columns along a corridor, a copy...). */
  const addFeatures = (rows: Array<Partial<HallFeature> & Rect & { kind: FeatureKind }>) => {
    if (!hall || !x.exhibition) return;
    const now = new Date().toISOString();
    const ops: Op[] = rows.map((r) => {
      const row = {
        id: newId(),
        hall_id: hall.id,
        exhibition_id: x.exhibition!.id,
        label_fa: null,
        label_en: null,
        rotation: 0,
        style: {},
        created_at: now,
        updated_at: now,
        ...r,
      } as unknown as AnyRow;
      return { table: "hall_features", id: row.id, before: null, after: row };
    });
    commit(ops);
    return ops.map((o) => o.id);
  };

  const duplicate = (id: string) => {
    const f = x.features.find((ff) => ff.id === id);
    if (!f || !hall) return;
    const offset = Math.max(hall.grid_m || 1, 1);
    const ids = addFeatures([
      {
        kind: f.kind,
        label_fa: f.label_fa,
        label_en: f.label_en,
        x: Math.min(hall.width_m - f.width, f.x + offset),
        y: Math.min(hall.depth_m - f.depth, f.y + offset),
        width: f.width,
        depth: f.depth,
      },
    ]);
    if (ids?.[0]) setSelected(new Set([ids[0]]));
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(fa ? "کپی شد" : "Copied");
    } catch {
      toast(text);
    }
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
      const problems = x.openProblemsByBooth.get(b.id) ?? [];
      const flow = boothWorkflow({ steps: b.steps, deal, equipment: eq, problems });
      const work = workflowShare(flow);
      const baseTone = layer === "sales" ? b.status : layer === "equipment" ? (eq?.state ?? "none") : progressTone(flow, Boolean(deal), x.phase, 0);
      // An open problem turns the booth red whatever layer is showing.
      const tone = problems.length ? "problem" : baseTone;
      const matchesQuery = !q || normalizeSearch(`${b.code} ${company?.name_fa ?? ""} ${company?.name_en ?? ""}`).includes(q);
      const visible = !hidden.has(tone) && matchesQuery && (!mine || b.manager_ids.includes(user.id));
      let subtitle: string;
      let progress: number | null = null;
      let badge: string | null = null;
      if (layer === "work") {
        const next = nextStep(flow);
        subtitle = !deal ? (fa ? "بدون مشارکت کننده" : "No exhibitor") : next ? problemStepLabel[next][lang] : fa ? "همه مراحل انجام شد" : "All steps done";
        progress = deal ? work.share : null;
      } else if (layer === "sales") {
        subtitle = share != null ? `${area(lang, b.area_m2)}${sep(lang)}${percent(lang, share)}` : area(lang, b.area_m2);
        progress = share;
      } else {
        const strike = x.phase === "strike" || x.phase === "after";
        badge = eq && eq.pieces ? num(lang, eq.pieces) : null;
        if (!eq || !eq.lines) subtitle = fa ? "بدون تجهیزات" : "No equipment";
        else if (strike || eq.collected > 0) subtitle = eq.toCollect ? (fa ? `${num(lang, eq.toCollect)} مانده جمع آوری` : `${eq.toCollect} to collect`) : fa ? "جمع آوری کامل" : "All collected";
        else subtitle = eq.toDeliver ? (fa ? `${num(lang, eq.toDeliver)} مانده تحویل` : `${eq.toDeliver} to deliver`) : fa ? "تحویل کامل" : "All delivered";
        if (eq && eq.pieces) progress = strike || eq.collected > 0 ? (eq.delivered ? eq.collected / eq.delivered : 0) : (eq.pieces - eq.toDeliver) / eq.pieces;
      }
      const statusText = boothStatusLabel[b.status][lang];
      const hoverLines = [
        `${b.code}${sep(lang)}${area(lang, b.area_m2)}${sep(lang)}${num(lang, b.width, 1)}×${num(lang, b.depth, 1)} ${fa ? "متر" : "m"}`,
        layer === "sales"
          ? [statusText, share != null ? (fa ? `${percent(lang, share)} پرداخت شده` : `${percent(lang, share)} paid`) : null, balance && balance.balance > 0 ? (fa ? `مانده ${compact(lang, balance.balance)}` : `${compact(lang, balance.balance)} due`) : null]
              .filter(Boolean)
              .join(sep(lang))
          : subtitle,
      ];
      if (layer === "work" && deal) hoverLines.push(fa ? `${num(lang, work.done)} از ${num(lang, work.total)} مرحله` : `${work.done} of ${work.total} steps`);
      for (const p of problems.slice(0, 3)) hoverLines.push(`⚠ ${problemStepLabel[p.step][lang]}${p.note ? `: ${p.note}` : ""}`);
      if (problems.length) badge = "!";
      if (layer === "equipment" && eq?.issues) hoverLines.push(fa ? `${num(lang, eq.issues)} مشکل باز` : `${eq.issues} open issues`);
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
          hover: { title: companyName || statusText, lines: hoverLines, people: b.manager_ids },
        } satisfies CanvasBooth,
      };
    });
  }, [hallBooths, x.dealById, x.companyById, x.equipmentByBooth, x.balanceByDeal, x.openProblemsByBooth, x.phase, layer, lang, fa, q, hidden, flagged, mine, user.id]);
  const myBooths = useMemo(() => hallBooths.filter((b) => b.manager_ids.includes(user.id)).length, [hallBooths, user.id]);

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
        locked: isLocked(f),
      })),
    [hallFeatures, lang],
  );

  const toneCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of decorated) counts.set(d.tone, (counts.get(d.tone) ?? 0) + 1);
    return counts;
  }, [decorated]);

  const tones: string[] = layer === "sales" ? SALES_TONES : layer === "equipment" ? EQUIPMENT_TONES : PROGRESS_TONES;
  const toneLabel = (tone: string) =>
    tone === "problem"
      ? progressToneLabel.problem[lang]
      : layer === "sales"
        ? boothStatusLabel[tone as BoothStatus][lang]
        : layer === "equipment"
          ? equipmentToneLabel[tone as EquipmentState][lang]
          : progressToneLabel[tone as ProgressTone][lang];

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
          <div className="thin-scroll scroll-fade flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" data-tour="map-halls">
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
          <IconButton label={fa ? "راهنمای ماوس، کیبورد و لمس (?)" : "Mouse, keyboard and touch help (?)"} size="sm" onClick={() => setShortcutsOpen(true)} className="hidden sm:inline-flex" data-tour="map-help">
            <Keyboard className="size-4" />
          </IconButton>
          {hall && can.edit ? (
            <>
              <IconButton label={fa ? "تنظیمات سالن" : "Hall settings"} size="sm" onClick={() => setSetup("edit")}>
                <Settings2 className="size-4" />
              </IconButton>
              <Button
                size="sm"
                data-tour="map-edit"
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
            <div data-tour="map-layers" className="shrink-0">
            <Segmented
              size="sm"
              value={layer}
              onChange={(l) => {
                setLayer(l);
                setHidden(new Set());
                setTab(l === "equipment" ? "equipment" : l === "work" ? "work" : "sales");
              }}
              options={[
                { value: "sales", label: fa ? "فروش" : "Sales" },
                { value: "equipment", label: fa ? "تجهیزات" : "Equipment" },
                { value: "work", label: fa ? "روند کار" : "Work" },
              ]}
            />
            </div>
            <label className="relative hidden min-w-0 max-w-56 flex-1 sm:block">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-p-ink-3" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={fa ? "کد یا شرکت" : "Code or company"}
                data-map-search
                className="h-8 w-full rounded-lg border border-p-line bg-p-surface-2 ps-8 pe-2 text-[13px] outline-none focus:border-p-brand"
              />
            </label>
            {myBooths || mine ? (
              <button
                type="button"
                aria-pressed={mine}
                onClick={() => setMine((m) => !m)}
                title={fa ? "فقط غرفه هایی که مسئولشان شما هستید" : "Only booths you look after"}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-1.5 pe-2 text-xs font-medium transition-colors",
                  mine ? "border-p-brand bg-p-brand-soft text-p-brand" : "border-p-line hover:bg-p-sunken",
                )}
                data-tour="map-mine"
              >
                <StaffAvatar staff={x.staffById.get(user.id)} size={20} />
                <span className="hidden sm:inline">{fa ? "غرفه های من" : "My booths"}</span>
                <span className="tabular text-p-ink-3">{num(lang, myBooths)}</span>
              </button>
            ) : null}
            <div className="thin-scroll scroll-fade flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" data-tour="map-legend">
              {tones.map((tone) => {
                const count = toneCounts.get(tone) ?? 0;
                if (!count && (layer !== "sales" || tone === "problem")) return null;
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
          <div className={cn("relative min-w-0 flex-1", view === "list" && "hidden")} data-tour="map-canvas">
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
              onContext={(id, kind, point) => {
                setStructureInfo(null);
                setMenu({ id, kind, ...point });
              }}
              onStructureTap={(id) => {
                setSelected(new Set());
                setStructureInfo(id);
              }}
            />
            {menu ? (
              <QuickMenu
                menu={menu}
                onClose={() => setMenu(null)}
                booth={menu.kind === "booth" ? (hallBooths.find((b) => b.id === menu.id) ?? null) : null}
                feature={menu.kind === "feature" ? (hallFeatures.find((f) => f.id === menu.id) ?? null) : null}
                editing={editing}
                onOpen={(t) => {
                  setSelected(new Set([menu.id]));
                  setTab(t);
                }}
                onAssign={() => {
                  setSelected(new Set([menu.id]));
                  setTab("sales");
                  setAssignFor(menu.id);
                }}
                onBoothStatus={(status) => updateRow("booths", menu.id, { status })}
                onCopy={copyText}
                onEditStructure={() => {
                  setEditing(true);
                  setTool("select");
                  setView("map");
                  setSelected(new Set([menu.id]));
                }}
                onLock={(locked) => setLocked(menu.id, locked)}
                onDuplicate={() => duplicate(menu.id)}
                onDelete={() => requestDelete([menu.id])}
              />
            ) : null}
            {structureInfo && !editing ? (
              <StructureCard
                feature={hallFeatures.find((f) => f.id === structureInfo) ?? null}
                onClose={() => setStructureInfo(null)}
                onEdit={() => {
                  const id = structureInfo;
                  setStructureInfo(null);
                  setEditing(true);
                  setTool("select");
                  setView("map");
                  setSelected(new Set([id]));
                }}
              />
            ) : null}
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
                  assignOpen={assignFor === selectedBooth.id}
                  onAssignOpen={(open) => setAssignFor(open ? selectedBooth.id : null)}
                  onAssigned={() => {
                    setAssignDealId(null);
                    router.replace(`/${lang}/staff/map`);
                  }}
                />
              ) : selectedFeature ? (
                <FeaturePanel
                  feature={selectedFeature as HallFeature}
                  hall={hall}
                  locked={isLocked(selectedFeature)}
                  onClose={() => setSelected(new Set())}
                  onUpdate={(patch) => updateRow("hall_features", selectedFeature.id, patch as Record<string, unknown>)}
                  onDelete={() => requestDelete([selectedFeature.id])}
                  onLock={(locked) => setLocked(selectedFeature.id, locked)}
                  onDuplicate={() => duplicate(selectedFeature.id)}
                  onAddFeatures={(rows) => addFeatures(rows)}
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
              ? `${num(lang, hallBooths.length)} غرفه، ${num(lang, Math.round(totals.sold))} از ${num(lang, Math.round(totals.total))} متر فروخته شده`
              : `${hallBooths.length} booths · ${Math.round(totals.sold)} of ${Math.round(totals.total)} m² sold`}
          </span>
          <span className="tabular font-semibold text-p-ink-2">{totals.total ? percent(lang, totals.sold / totals.total) : ""}</span>
          <span className="flex-1" />
          <span className="hidden sm:inline" dir="ltr">
            {num(lang, hall.width_m)} × {num(lang, hall.depth_m)} {fa ? "متر" : "m"}
          </span>
        </div>
      ) : null}

      <ShortcutsSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

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
  const workCell = (booth: Booth) => {
    const deal = booth.deal_id ? x.dealById.get(booth.deal_id) : null;
    if (!deal) return "—";
    const w = workflowShare(boothWorkflow({ steps: booth.steps, deal, equipment: x.equipmentByBooth.get(booth.id), problems: x.openProblemsByBooth.get(booth.id) ?? [] }));
    return `${num(lang, w.done)}/${num(lang, w.total)}`;
  };
  return (
    <div className="thin-scroll min-w-0 flex-1 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-p-surface-2 text-xs text-p-ink-3">
          <tr className="border-b border-p-line">
            <th className="px-4 py-2.5 text-start font-medium">{fa ? "غرفه" : "Booth"}</th>
            <th className="px-2 py-2.5 text-start font-medium">{fa ? "شرکت" : "Company"}</th>
            <th className="hidden px-2 py-2.5 text-start font-medium sm:table-cell">{fa ? "متراژ" : "Area"}</th>
            <th className="px-2 py-2.5 text-start font-medium">{fa ? "وضعیت" : "Status"}</th>
            <th className="hidden px-2 py-2.5 text-start font-medium sm:table-cell">{fa ? "مسئول" : "Managed by"}</th>
            <th className="hidden px-4 py-2.5 text-end font-medium md:table-cell">{layer === "sales" ? (fa ? "مانده" : "Balance") : layer === "work" ? (fa ? "مراحل" : "Steps") : fa ? "اقلام" : "Pieces"}</th>
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
                <td className="hidden px-2 py-2.5 sm:table-cell">{booth.manager_ids.length ? <AvatarStack ids={booth.manager_ids} size={24} /> : <span className="text-p-ink-3">—</span>}</td>
                <td className="tabular hidden px-4 py-2.5 text-end md:table-cell">
                  {layer === "sales" ? (balance ? compact(lang, Math.max(0, balance.balance)) : "—") : layer === "work" ? workCell(booth) : eq ? num(lang, eq.pieces) : "—"}
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

/* ------------------------------------------------------------ quick menu */

function QuickMenu({
  menu,
  onClose,
  booth,
  feature,
  editing,
  onOpen,
  onAssign,
  onBoothStatus,
  onCopy,
  onEditStructure,
  onLock,
  onDuplicate,
  onDelete,
}: {
  menu: { x: number; y: number };
  onClose: () => void;
  booth: Booth | null;
  feature: HallFeature | null;
  editing: boolean;
  onOpen: (tab: PanelTab) => void;
  onAssign: () => void;
  onBoothStatus: (status: BoothStatus) => void;
  onCopy: (text: string) => void;
  onEditStructure: () => void;
  onLock: (locked: boolean) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { lang, can } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: menu.x, top: menu.y });

  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const left = Math.max(8, Math.min(parent.clientWidth - el.offsetWidth - 8, menu.x));
    const top = Math.max(8, Math.min(parent.clientHeight - el.offsetHeight - 8, menu.y));
    setPos({ left, top });
    el.querySelector<HTMLButtonElement>("button")?.focus();
  }, [menu.x, menu.y]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const t = window.setTimeout(() => document.addEventListener("pointerdown", onDown), 0);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };

  const deal = booth?.deal_id ? x.dealById.get(booth.deal_id) : undefined;
  const company = deal ? x.companyById.get(deal.company_id) : undefined;
  const locked = feature ? isLocked(feature) : false;

  return (
    <div
      ref={ref}
      role="menu"
      className="animate-fade absolute z-40 w-64 rounded-2xl border border-p-line bg-p-surface p-1.5 shadow-[var(--p-shadow-lg)]"
      style={{ left: pos.left, top: pos.top }}
    >
      {booth ? (
        <>
          <div className="px-2.5 pb-1.5 pt-1">
            <p className="text-sm font-bold" dir="ltr">
              {booth.code}
            </p>
            <p className="text-xs leading-snug text-p-ink-3">{company ? pick(lang, company.name_fa, company.name_en) : boothStatusLabel[booth.status][lang]}</p>
          </div>
          <MenuItem icon={<Building2 className="size-4" />} onClick={run(() => onOpen("sales"))}>
            {fa ? "فروش و مالی" : "Sales and money"}
          </MenuItem>
          <MenuItem icon={<Armchair className="size-4" />} onClick={run(() => onOpen("equipment"))}>
            {fa ? "فهرست تجهیزات و مبلمان" : "Furniture and equipment"}
          </MenuItem>
          {can.edit && !booth.deal_id && booth.status !== "blocked" ? (
            <MenuItem icon={<Plus className="size-4" />} onClick={run(onAssign)}>
              {fa ? "واگذاری به شرکت…" : "Give to a company…"}
            </MenuItem>
          ) : null}
          {can.edit && !booth.deal_id && booth.status === "available" ? (
            <MenuItem icon={<Hand className="size-4" />} onClick={run(() => onBoothStatus("held"))}>
              {fa ? "نگه داشتن" : "Put on hold"}
            </MenuItem>
          ) : null}
          {can.edit && booth.status === "held" ? (
            <MenuItem icon={<Undo2 className="size-4" />} onClick={run(() => onBoothStatus("available"))}>
              {fa ? "آزاد کردن" : "Release hold"}
            </MenuItem>
          ) : null}
          <MenuItem icon={<Copy className="size-4" />} onClick={run(() => onCopy(company ? `${booth.code}${sep(lang)}${pick(lang, company.name_fa, company.name_en)}` : booth.code))}>
            {fa ? "کپی کد غرفه" : "Copy booth code"}
          </MenuItem>
          {editing && can.manage ? (
            <MenuItem icon={<Trash2 className="size-4" />} danger onClick={run(onDelete)}>
              {fa ? "حذف غرفه" : "Delete booth"}
            </MenuItem>
          ) : null}
        </>
      ) : feature ? (
        <>
          <div className="px-2.5 pb-1.5 pt-1">
            <p className="text-sm font-bold">{pick(lang, feature.label_fa, feature.label_en) || featureLabel[feature.kind][lang]}</p>
            <p className="text-xs text-p-ink-3" dir="ltr">
              {num(lang, feature.width, 1)} × {num(lang, feature.depth, 1)} {fa ? "متر" : "m"}
            </p>
          </div>
          {can.edit ? (
            <>
              <MenuItem icon={<Pencil className="size-4" />} onClick={run(onEditStructure)}>
                {fa ? "ویرایش ابعاد و جای آن" : "Edit size and position"}
              </MenuItem>
              <MenuItem icon={locked ? <LockOpen className="size-4" /> : <Lock className="size-4" />} onClick={run(() => onLock(!locked))}>
                {locked ? (fa ? "باز کردن قفل" : "Unlock") : fa ? "قفل کردن" : "Lock in place"}
              </MenuItem>
              {editing ? (
                <>
                  <MenuItem icon={<Copy className="size-4" />} onClick={run(onDuplicate)}>
                    {fa ? "تکثیر" : "Duplicate"}
                  </MenuItem>
                  <MenuItem icon={<Trash2 className="size-4" />} danger disabled={locked} onClick={run(onDelete)}>
                    {fa ? "حذف" : "Delete"}
                  </MenuItem>
                </>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function StructureCard({ feature, onClose, onEdit }: { feature: HallFeature | null; onClose: () => void; onEdit: () => void }) {
  const { lang, can } = usePortal();
  const fa = lang === "fa";
  if (!feature) return null;
  const name = pick(lang, feature.label_fa, feature.label_en) || featureLabel[feature.kind][lang];
  const narrow = Math.min(feature.width, feature.depth);
  return (
    <div className="animate-sheet absolute inset-x-3 bottom-3 z-30 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-p-line bg-p-surface p-3 shadow-[var(--p-shadow-lg)]">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-p-sunken text-p-ink-2">
        {feature.kind === "column" ? <Grid3x3 className="size-5" /> : feature.kind === "entrance" || feature.kind === "door" ? <DoorOpen className="size-5" /> : <SquareDashed className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
          {name}
          {isLocked(feature) ? <Lock className="size-3.5 text-p-ink-3" aria-label={fa ? "قفل" : "Locked"} /> : null}
        </p>
        <p className="text-xs text-p-ink-3">
          {featureLabel[feature.kind][lang]}{sep(lang)}{num(lang, feature.width, 1)} × {num(lang, feature.depth, 1)} {fa ? "متر" : "m"}
          {feature.kind === "aisle" ? `${sep(lang)}${fa ? "عرض عبور" : "clear width"} ${num(lang, narrow, 1)} ${fa ? "متر" : "m"}` : ""}
        </p>
      </div>
      {can.edit ? (
        <Button size="sm" tone="primary" icon={<Pencil className="size-3.5" />} onClick={onEdit}>
          {fa ? "ویرایش" : "Edit"}
        </Button>
      ) : null}
      <IconButton size="sm" label={fa ? "بستن" : "Close"} onClick={onClose}>
        <X className="size-4" />
      </IconButton>
    </div>
  );
}

function ShortcutsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  const groups: Array<{ title: string; rows: Array<[React.ReactNode, string]> }> = [
    {
      title: fa ? "ماوس و تاچ پد" : "Mouse and trackpad",
      rows: [
        [fa ? "کلیک" : "Click", fa ? "باز کردن غرفه" : "Open a booth"],
        [fa ? "کلیک راست" : "Right click", fa ? "منوی سریع غرفه یا راهرو" : "Quick menu for a booth or corridor"],
        [fa ? "کشیدن" : "Drag", fa ? "جابجایی نقشه" : "Pan the plan"],
        [fa ? "چرخ ماوس" : "Scroll wheel", fa ? "بزرگنمایی" : "Zoom"],
        [<>Shift + {fa ? "چرخ" : "wheel"}</>, fa ? "جابجایی افقی" : "Pan sideways"],
        [<>Shift + {fa ? "کلیک" : "click"}</>, fa ? "انتخاب چند مورد (ویرایش)" : "Select several (editing)"],
      ],
    },
    {
      title: fa ? "لمسی (موبایل و تبلت)" : "Touch (phone and tablet)",
      rows: [
        [fa ? "ضربه" : "Tap", fa ? "باز کردن غرفه" : "Open a booth"],
        [fa ? "نگه داشتن انگشت" : "Press and hold", fa ? "منوی سریع" : "Quick menu"],
        [fa ? "یک انگشت" : "One finger", fa ? "جابجایی نقشه" : "Pan"],
        [fa ? "دو انگشت" : "Two fingers", fa ? "بزرگنمایی و جابجایی" : "Zoom and pan"],
      ],
    },
    {
      title: fa ? "کیبورد" : "Keyboard",
      rows: [
        [<Kbd key="k1">+</Kbd>, fa ? "بزرگنمایی" : "Zoom in"],
        [<Kbd key="k2">−</Kbd>, fa ? "کوچک نمایی" : "Zoom out"],
        [<Kbd key="k3">0</Kbd>, fa ? "نمایش کل سالن" : "Fit the hall"],
        [fa ? "کلیدهای جهت" : "Arrow keys", fa ? "جابجایی نقشه، یا جابجایی انتخاب در ویرایش" : "Pan, or move the selection while editing"],
        [<Kbd key="k4">/</Kbd>, fa ? "جستجوی غرفه یا شرکت" : "Search booths and companies"],
        [<Kbd key="k5">Esc</Kbd>, fa ? "بستن پنل" : "Close the panel"],
        [<>Ctrl + Z / Ctrl + Y</>, fa ? "واگرد و انجام دوباره (ویرایش)" : "Undo and redo (editing)"],
        [<>V · B · A · C · W · E · L</>, fa ? "ابزارها: انتخاب، غرفه، راهرو، ستون، دیوار، ورودی، برچسب" : "Tools: select, booth, aisle, column, wall, entrance, label"],
        [<>Delete</>, fa ? "حذف انتخاب (ویرایش)" : "Delete the selection (editing)"],
      ],
    },
  ];
  return (
    <Sheet open={open} onClose={onClose} title={fa ? "کار با نقشه" : "Working the map"} closeLabel={fa ? "بستن" : "Close"} wide>
      <div className="grid gap-5 sm:grid-cols-2">
        {groups.map((g) => (
          <section key={g.title} className={cn("grid content-start gap-2", g.rows.length > 6 && "sm:col-span-2")}>
            <h3 className="text-[13px] font-semibold text-p-ink-2">{g.title}</h3>
            <dl className={cn("grid gap-1.5", g.rows.length > 6 && "sm:grid-cols-2 sm:gap-x-6")}>
              {g.rows.map(([k, v], i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-p-surface-2 px-3 py-2 text-sm">
                  <dt className="shrink-0 font-medium" dir={typeof k === "string" ? undefined : "ltr"}>
                    {k}
                  </dt>
                  <dd className="text-end text-p-ink-3">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Sheet>
  );
}
