"use client";

import {
  Crosshair,
  Grid3X3,
  Hand,
  LockKeyhole,
  Magnet,
  MousePointer2,
  RotateCcw,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { calculatePointerRotation, type MapPoint } from "@/lib/staff-map-geometry";
import type { Booth, BoothStatus, Hall, HallFeature, PortalLocale } from "@/lib/staff-portal";
import styles from "./StaffPortal.module.css";

export type HallOverlayMode = "allocation" | "delivery" | "pickup" | "issues";
export type HallCanvasOverlay = HallOverlayMode;

export type HallCanvasLayers = {
  grid: boolean;
  features: boolean;
  labels: boolean;
  background: boolean;
};

export type HallFeaturePatch = Partial<Pick<HallFeature, "x" | "y" | "width" | "height" | "rotation">>;
export type BoothGeometryPatch = Partial<Pick<Booth, "x" | "y" | "width" | "height">>;

export type HallCanvasProps = {
  locale: PortalLocale;
  hall: Hall;
  selectedBoothId?: string | null;
  selectedFeatureId?: string | null;
  searchQuery?: string;
  statusFilter?: "all" | BoothStatus;
  overlay?: HallOverlayMode;
  editMode?: boolean;
  backgroundImage?: string | null;
  layerVisibility?: HallCanvasLayers;
  onSelectBooth?: (boothId: string) => void;
  onMoveBooth?: (boothId: string, x: number, y: number) => void;
  onMoveComplete?: (boothId: string, x: number, y: number) => void;
  onUpdateBoothGeometry?: (boothId: string, patch: BoothGeometryPatch) => void;
  onCommitBoothGeometry?: (boothId: string, patch: BoothGeometryPatch) => void;
  onSelectFeature?: (featureId: string | null) => void;
  onUpdateFeature?: (featureId: string, patch: HallFeaturePatch) => void;
  onCommitFeature?: (featureId: string, patch: HallFeaturePatch) => void;
  onDeleteFeature?: (featureId: string) => void;
};

type CanvasPoint = { x: number; y: number };
type InteractionTool = "select" | "pan";
type ResizeHandle = "northWest" | "north" | "northEast" | "east" | "southEast" | "south" | "southWest" | "west";
type ResizeTarget = "booth" | "feature";
type ResizeGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};
type ResizeState = {
  pointerId: number;
  target: ResizeTarget;
  itemId: string;
  handle: ResizeHandle;
  startClientX: number;
  startClientY: number;
  start: ResizeGeometry;
  geometry: ResizeGeometry;
  moved: boolean;
};
type DragState = {
  pointerId: number;
  boothId: string;
  offsetX: number;
  offsetY: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  moved: boolean;
  x: number;
  y: number;
};
type FeatureDragState = {
  pointerId: number;
  featureId: string;
  offsetX: number;
  offsetY: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  moved: boolean;
  x: number;
  y: number;
};
type RotationState = {
  pointerId: number;
  featureId: string;
  startClientX: number;
  startClientY: number;
  center: MapPoint;
  startPointer: MapPoint;
  start: ResizeGeometry;
  geometry: ResizeGeometry;
  moved: boolean;
};
type PanState = {
  pointerId: number;
  clientX: number;
  clientY: number;
  originX: number;
  originY: number;
};

type EquipmentSummary = {
  requested: number;
  delivered: number;
  pickedUp: number;
  issues: number;
};

type BoothPalette = {
  fill: string;
  stroke: string;
  text: string;
  accent: string;
};

const DEFAULT_LAYERS: HallCanvasLayers = {
  grid: true,
  features: true,
  labels: true,
  background: true,
};

const ZOOM_MIN = 0.55;
const ZOOM_MAX = 2.8;
const ZOOM_STEP = 0.18;
const SNAP_METRIC_OPTIONS = [0.25, 0.5, 1, 2] as const;
const DRAG_THRESHOLD_PX = 3;
const GEOMETRY_EPSILON = 1e-4;

const copy = {
  fa: {
    canvas: "نقشه عملیاتی سالن",
    select: "انتخاب",
    pan: "جابجایی نقشه",
    zoomIn: "بزرگ نمایی",
    zoomOut: "کوچک نمایی",
    reset: "بازنشانی نما",
    fit: "نمای کامل سالن",
    lockedBackground: "مرجع تصویری قفل شده",
    boothsShown: "غرفه قابل مشاهده",
    editHint: "برای جابجایی بکشید؛ دستگیره‌های گوشه اندازه و دستگیره گرد زاویه سازه را تغییر می‌دهند.",
    viewHint: "برای انتخاب غرفه Enter یا فاصله را بزنید. برای جابجایی نقشه بکشید.",
    allocation: "جانمایی",
    delivery: "تحویل",
    pickup: "جمع آوری",
    issues: "مشکلات",
    available: "آزاد",
    reserved: "رزرو",
    confirmed: "قطعی",
    paid: "پرداخت شده",
    problem: "نیازمند رسیدگی",
    delivered: "تحویل",
    collected: "جمع شده",
    issueCount: "مشکل",
    noCompany: "بدون شرکت",
    feature: "سازه سالن",
    width: "عرض",
    height: "ارتفاع",
    rotation: "چرخش",
    rotationHandle: "دستگیره چرخش",
    rotationHint: "دستگیره گرد را با لمس یا ماوس بکشید؛ کلیدهای چپ و راست نیز سازه را می‌چرخانند.",
    degrees: "درجه",
    deleteFeature: "حذف سازه",
    confirmDeleteFeature: "برای تایید دوباره بزنید",
    grid: "شبکه",
    gridVisible: "شبکه از کنترل لایه ها روشن است",
    gridHidden: "شبکه از کنترل لایه ها خاموش است",
    snap: "چفت شبکه",
    enableSnap: "فعال کردن چفت به شبکه",
    disableSnap: "غیرفعال کردن چفت به شبکه",
    gridSpacing: "فاصله شبکه و گام حرکت",
    ruler: "خط کش متریک سالن",
    resize: "تغییر اندازه",
    resizeHint: "دستگیره را بکشید یا با کلیدهای جهت اندازه را تغییر دهید",
    dimensions: "ابعاد",
    area: "مساحت",
  },
  en: {
    canvas: "Hall operations map",
    select: "Select",
    pan: "Pan map",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    reset: "Reset view",
    fit: "Fit hall",
    lockedBackground: "Locked reference image",
    boothsShown: "booths visible",
    editHint: "Drag to move; corner handles resize and the round handle rotates hall features.",
    viewHint: "Press Enter or Space to select a booth. Drag the canvas to pan.",
    allocation: "Allocation",
    delivery: "Delivery",
    pickup: "Pickup",
    issues: "Issues",
    available: "Available",
    reserved: "Reserved",
    confirmed: "Confirmed",
    paid: "Paid",
    problem: "Needs attention",
    delivered: "delivered",
    collected: "collected",
    issueCount: "issues",
    noCompany: "Unassigned",
    feature: "Hall feature",
    width: "Width",
    height: "Height",
    rotation: "Rotation",
    rotationHandle: "Rotation handle",
    rotationHint: "Drag the round handle with touch or mouse; Left and Right Arrow also rotate the feature.",
    degrees: "degrees",
    deleteFeature: "Delete feature",
    confirmDeleteFeature: "Press again to confirm",
    grid: "Grid",
    gridVisible: "Grid is enabled in layer controls",
    gridHidden: "Grid is disabled in layer controls",
    snap: "Snap",
    enableSnap: "Enable snap to grid",
    disableSnap: "Disable snap to grid",
    gridSpacing: "Grid spacing and movement step",
    ruler: "Metric hall ruler",
    resize: "Resize",
    resizeHint: "Drag the handle or use arrow keys to resize",
    dimensions: "Dimensions",
    area: "Area",
  },
} as const;

const neutralPalette: BoothPalette = {
  fill: "#f8faf7",
  stroke: "#75827d",
  text: "#17342c",
  accent: "#75827d",
};

const statusPalettes: Record<string, BoothPalette> = {
  available: { fill: "#f7faf8", stroke: "#779187", text: "#17382f", accent: "#779187" },
  on_hold: { fill: "#fff8e7", stroke: "#c28a2e", text: "#5f441b", accent: "#c28a2e" },
  hold: { fill: "#fff8e7", stroke: "#c28a2e", text: "#5f441b", accent: "#c28a2e" },
  reserved: { fill: "#fff2d7", stroke: "#b7791f", text: "#62420e", accent: "#b7791f" },
  proposal_sent: { fill: "#edf7fb", stroke: "#278ba2", text: "#174b59", accent: "#278ba2" },
  confirmed: { fill: "#e8f6ef", stroke: "#258460", text: "#13543d", accent: "#258460" },
  paid: { fill: "#ddf7ea", stroke: "#137a50", text: "#0d5136", accent: "#137a50" },
  attention: { fill: "#fff0ee", stroke: "#bf443d", text: "#702722", accent: "#bf443d" },
  problem: { fill: "#fff0ee", stroke: "#bf443d", text: "#702722", accent: "#bf443d" },
  issue: { fill: "#fff0ee", stroke: "#bf443d", text: "#702722", accent: "#bf443d" },
  cancelled: { fill: "#f2f2ef", stroke: "#8c918d", text: "#565d59", accent: "#8c918d" },
  blocked: { fill: "#ebecea", stroke: "#646b67", text: "#3e4541", accent: "#646b67" },
  internal_use: { fill: "#ebecea", stroke: "#646b67", text: "#3e4541", accent: "#646b67" },
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function snapToIncrement(value: number, increment: number) {
  if (!Number.isFinite(increment) || increment <= 0) return value;
  return Math.round(value / increment) * increment;
}

function niceMetricStep(extent: number, targetTicks = 10) {
  if (!Number.isFinite(extent) || extent <= 0) return 1;
  const roughStep = extent / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

function buildRulerTicks(extent: number) {
  const majorStep = niceMetricStep(extent);
  const minorStep = majorStep / 5;
  const ticks: Array<{ value: number; major: boolean }> = [];
  const count = Math.floor(extent / minorStep + 1e-7);

  for (let index = 0; index <= count; index += 1) {
    const value = index * minorStep;
    const major = Math.abs(value / majorStep - Math.round(value / majorStep)) < 1e-7;
    ticks.push({ value, major });
  }

  const lastValue = ticks.at(-1)?.value ?? 0;
  if (extent - lastValue > minorStep * 0.05) ticks.push({ value: extent, major: true });
  else if (ticks.length > 0) ticks[ticks.length - 1] = { value: extent, major: true };

  return ticks;
}

function finiteNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizedStatus(status: BoothStatus | string) {
  return String(status)
    .trim()
    .toLowerCase()
    .replace(/[\s/-]+/g, "_");
}

function localize(value: unknown, locale: PortalLocale, fallback = "") {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const localized = record[locale];
    if (typeof localized === "string") return localized;
    const english = record.en;
    if (typeof english === "string") return english;
    const persian = record.fa;
    if (typeof persian === "string") return persian;
    const name = record.name;
    if (typeof name === "string") return name;
  }
  return fallback;
}

function searchableValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(searchableValue).join(" ");
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).map(searchableValue).join(" ");
  return "";
}

function firstNumeric(record: Record<string, unknown>, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  }
  return fallback;
}

function summarizeEquipment(booth: Booth): EquipmentSummary {
  const lines = Array.isArray(booth.equipment) ? (booth.equipment as unknown[]) : [];

  return lines.reduce<EquipmentSummary>(
    (summary, item) => {
      if (!item || typeof item !== "object") return summary;
      const line = item as Record<string, unknown>;
      const requested = firstNumeric(
        line,
        ["approvedQuantity", "approvedQty", "requestedQuantity", "requestedQty", "quantity", "qty", "planned"],
        1,
      );
      const stage = String(line.stage ?? line.status ?? line.state ?? "").toLowerCase();
      const explicitDelivered = firstNumeric(line, ["deliveredQuantity", "deliveredQty", "delivered"], 0);
      const explicitPickedUp = firstNumeric(
        line,
        ["pickedUpQuantity", "pickedUpQty", "collectedQuantity", "collectedQty", "returnedQuantity", "returnedQty"],
        0,
      );
      const issueQuantity = firstNumeric(line, ["damagedQuantity", "missingQuantity", "issueQuantity"], 0);
      const delivered = explicitDelivered || (stage === "delivered" || stage === "collected" ? requested : 0);
      const pickedUp = explicitPickedUp || (stage === "collected" ? delivered : 0);
      const hasIssue = issueQuantity > 0 || /(issue|problem|damage|missing|blocked|overdue)/.test(stage);

      summary.requested += requested;
      summary.delivered += Math.min(delivered, requested || delivered);
      summary.pickedUp += Math.min(pickedUp, delivered || pickedUp);
      summary.issues += hasIssue ? Math.max(1, issueQuantity) : 0;
      return summary;
    },
    { requested: 0, delivered: 0, pickedUp: 0, issues: 0 },
  );
}

function paletteFor(booth: Booth, overlay: HallCanvasOverlay, summary: EquipmentSummary): BoothPalette {
  if (overlay === "issues") {
    return summary.issues > 0 ? statusPalettes.problem : neutralPalette;
  }

  if (overlay === "delivery") {
    if (summary.issues > 0) return statusPalettes.problem;
    if (summary.requested === 0) return neutralPalette;
    if (summary.delivered >= summary.requested) return statusPalettes.confirmed;
    if (summary.delivered > 0) return statusPalettes.proposal_sent;
    return statusPalettes.on_hold;
  }

  if (overlay === "pickup") {
    if (summary.issues > 0) return statusPalettes.problem;
    if (summary.delivered === 0) return neutralPalette;
    if (summary.pickedUp >= summary.delivered) return statusPalettes.paid;
    if (summary.pickedUp > 0) return statusPalettes.proposal_sent;
    return statusPalettes.on_hold;
  }

  return statusPalettes[normalizedStatus(booth.status)] ?? neutralPalette;
}

function statusLabel(status: BoothStatus | string, locale: PortalLocale) {
  const key = normalizedStatus(status);
  const labels: Record<string, { fa: string; en: string }> = {
    available: { fa: "آزاد", en: "Available" },
    on_hold: { fa: "نگه داشته", en: "On hold" },
    hold: { fa: "نگه داشته", en: "On hold" },
    reserved: { fa: "رزرو", en: "Reserved" },
    proposal_sent: { fa: "پیشنهاد ارسال شده", en: "Proposal sent" },
    confirmed: { fa: "قطعی", en: "Confirmed" },
    paid: { fa: "پرداخت شده", en: "Paid" },
    attention: { fa: "نیازمند رسیدگی", en: "Needs attention" },
    problem: { fa: "نیازمند رسیدگی", en: "Needs attention" },
    issue: { fa: "نیازمند رسیدگی", en: "Needs attention" },
    cancelled: { fa: "لغو شده", en: "Cancelled" },
    blocked: { fa: "مسدود", en: "Blocked" },
    internal_use: { fa: "استفاده داخلی", en: "Internal use" },
  };
  return labels[key]?.[locale] ?? String(status).replaceAll("_", " ");
}

function equipmentStageLabel(stage: unknown, locale: PortalLocale) {
  const key = String(stage ?? "").toLowerCase();
  const labels: Record<string, { fa: string; en: string }> = {
    requested: { fa: "درخواست شده", en: "Requested" },
    preparing: { fa: "در حال آماده سازی", en: "Preparing" },
    staged: { fa: "آماده تحویل", en: "Staged" },
    delivered: { fa: "تحویل شده", en: "Delivered" },
    collected: { fa: "جمع آوری شده", en: "Collected" },
    issue: { fa: "دارای مشکل", en: "Issue" },
  };
  return labels[key]?.[locale] ?? key.replaceAll("_", " ");
}

function featureKindLabel(kind: HallFeature["kind"], locale: PortalLocale) {
  const labels: Record<HallFeature["kind"], { fa: string; en: string }> = {
    column: { fa: "ستون", en: "Column" },
    door: { fa: "درب", en: "Door" },
    zone: { fa: "ناحیه", en: "Zone" },
    aisle: { fa: "راهرو", en: "Aisle" },
    loading: { fa: "بارگیری", en: "Loading" },
    utility: { fa: "تاسیسات", en: "Utility" },
    entrance: { fa: "ورودی", en: "Entrance" },
    wall: { fa: "دیوار", en: "Wall" },
    label: { fa: "برچسب", en: "Label" },
  };
  return labels[kind][locale];
}

function normalizeSearchText(value: string, locale: PortalLocale) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase(locale === "fa" ? "fa-IR" : "en-US")
    .replace(/[\u200b-\u200f\u202a-\u202e]/g, "")
    .replaceAll("ي", "ی")
    .replaceAll("ك", "ک")
    .replace(/\s+/g, " ")
    .trim();
}

function boundedFeatureGeometry(
  feature: HallFeature,
  patch: HallFeaturePatch,
  hallWidth: number,
  hallHeight: number,
  minimumWidth?: number,
  minimumHeight?: number,
) {
  const fallbackMinimum = Math.max(0.1, Math.min(8, hallWidth, hallHeight));
  const boundedMinimumWidth = clamp(finiteNumber(minimumWidth, fallbackMinimum), 0.1, hallWidth);
  const boundedMinimumHeight = clamp(finiteNumber(minimumHeight, fallbackMinimum), 0.1, hallHeight);
  let width = clamp(finiteNumber(patch.width, feature.width), boundedMinimumWidth, hallWidth);
  let height = clamp(finiteNumber(patch.height, feature.height), boundedMinimumHeight, hallHeight);
  const rotation = clamp(finiteNumber(patch.rotation, feature.rotation ?? 0), -360, 360);
  const radians = (rotation * Math.PI) / 180;
  const cosine = Math.abs(Math.cos(radians));
  const sine = Math.abs(Math.sin(radians));

  let boundingWidth = width * cosine + height * sine;
  let boundingHeight = width * sine + height * cosine;
  const fitScale = Math.min(
    1,
    hallWidth / Math.max(boundingWidth, Number.EPSILON),
    hallHeight / Math.max(boundingHeight, Number.EPSILON),
  );

  if (fitScale < 1) {
    width *= fitScale;
    height *= fitScale;
    boundingWidth = width * cosine + height * sine;
    boundingHeight = width * sine + height * cosine;
  }

  const requestedX = finiteNumber(patch.x, feature.x);
  const requestedY = finiteNumber(patch.y, feature.y);
  const minimumCenterX = boundingWidth / 2;
  const maximumCenterX = Math.max(minimumCenterX, hallWidth - boundingWidth / 2);
  const minimumCenterY = boundingHeight / 2;
  const maximumCenterY = Math.max(minimumCenterY, hallHeight - boundingHeight / 2);
  const centerX = clamp(requestedX + width / 2, minimumCenterX, maximumCenterX);
  const centerY = clamp(requestedY + height / 2, minimumCenterY, maximumCenterY);
  const x = centerX - width / 2;
  const y = centerY - height / 2;
  return { x, y, width, height, rotation };
}

const RESIZE_HANDLES: ReadonlyArray<{
  handle: ResizeHandle;
  xFactor: 0 | 0.5 | 1;
  yFactor: 0 | 0.5 | 1;
  cursor: string;
}> = [
  { handle: "northWest", xFactor: 0, yFactor: 0, cursor: "nwse-resize" },
  { handle: "north", xFactor: 0.5, yFactor: 0, cursor: "ns-resize" },
  { handle: "northEast", xFactor: 1, yFactor: 0, cursor: "nesw-resize" },
  { handle: "east", xFactor: 1, yFactor: 0.5, cursor: "ew-resize" },
  { handle: "southEast", xFactor: 1, yFactor: 1, cursor: "nwse-resize" },
  { handle: "south", xFactor: 0.5, yFactor: 1, cursor: "ns-resize" },
  { handle: "southWest", xFactor: 0, yFactor: 1, cursor: "nesw-resize" },
  { handle: "west", xFactor: 0, yFactor: 0.5, cursor: "ew-resize" },
];

function resizeHandleLabel(handle: ResizeHandle, locale: PortalLocale) {
  const labels: Record<ResizeHandle, { fa: string; en: string }> = {
    northWest: { fa: "بالا چپ", en: "top left" },
    north: { fa: "بالا", en: "top" },
    northEast: { fa: "بالا راست", en: "top right" },
    east: { fa: "راست", en: "right" },
    southEast: { fa: "پایین راست", en: "bottom right" },
    south: { fa: "پایین", en: "bottom" },
    southWest: { fa: "پایین چپ", en: "bottom left" },
    west: { fa: "چپ", en: "left" },
  };
  return labels[handle][locale];
}

function geometryChanged(first: ResizeGeometry, second: ResizeGeometry) {
  return (
    Math.abs(first.x - second.x) > GEOMETRY_EPSILON ||
    Math.abs(first.y - second.y) > GEOMETRY_EPSILON ||
    Math.abs(first.width - second.width) > GEOMETRY_EPSILON ||
    Math.abs(first.height - second.height) > GEOMETRY_EPSILON ||
    Math.abs(first.rotation - second.rotation) > GEOMETRY_EPSILON
  );
}

function rotatePoint(point: CanvasPoint, center: CanvasPoint, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const offsetX = point.x - center.x;
  const offsetY = point.y - center.y;
  return {
    x: center.x + offsetX * cosine - offsetY * sine,
    y: center.y + offsetX * sine + offsetY * cosine,
  };
}

function resizeHandlePoint(geometry: ResizeGeometry, handle: ResizeHandle) {
  const definition = RESIZE_HANDLES.find((item) => item.handle === handle) ?? RESIZE_HANDLES[0];
  const center = {
    x: geometry.x + geometry.width / 2,
    y: geometry.y + geometry.height / 2,
  };
  return rotatePoint(
    {
      x: geometry.x + geometry.width * definition.xFactor,
      y: geometry.y + geometry.height * definition.yFactor,
    },
    center,
    geometry.rotation,
  );
}

function resizedGeometryFromPoint(
  start: ResizeGeometry,
  handle: ResizeHandle,
  canvasPoint: CanvasPoint,
  options: {
    snap: boolean;
    stepX: number;
    stepY: number;
    minimumWidth: number;
    minimumHeight: number;
  },
) {
  const startCenter = {
    x: start.x + start.width / 2,
    y: start.y + start.height / 2,
  };
  const localPoint = rotatePoint(canvasPoint, startCenter, -start.rotation);
  const movesWest = handle === "northWest" || handle === "west" || handle === "southWest";
  const movesEast = handle === "northEast" || handle === "east" || handle === "southEast";
  const movesNorth = handle === "northWest" || handle === "north" || handle === "northEast";
  const movesSouth = handle === "southWest" || handle === "south" || handle === "southEast";

  let left = start.x;
  let right = start.x + start.width;
  let top = start.y;
  let bottom = start.y + start.height;

  if (movesWest || movesEast) {
    const fixedX = movesWest ? right : left;
    const rawWidth = movesWest ? fixedX - localPoint.x : localPoint.x - fixedX;
    const snappedWidth = options.snap ? snapToIncrement(rawWidth, options.stepX) : rawWidth;
    const width = Math.max(options.minimumWidth, snappedWidth);
    if (movesWest) left = fixedX - width;
    else right = fixedX + width;
  }

  if (movesNorth || movesSouth) {
    const fixedY = movesNorth ? bottom : top;
    const rawHeight = movesNorth ? fixedY - localPoint.y : localPoint.y - fixedY;
    const snappedHeight = options.snap ? snapToIncrement(rawHeight, options.stepY) : rawHeight;
    const height = Math.max(options.minimumHeight, snappedHeight);
    if (movesNorth) top = fixedY - height;
    else bottom = fixedY + height;
  }

  const width = right - left;
  const height = bottom - top;
  const localCenter = { x: left + width / 2, y: top + height / 2 };
  const center = rotatePoint(localCenter, startCenter, start.rotation);
  return {
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
    rotation: start.rotation,
  };
}

function boundedBoothGeometry(
  geometry: ResizeGeometry,
  hallWidth: number,
  hallHeight: number,
  minimumWidth: number,
  minimumHeight: number,
) {
  const width = clamp(finiteNumber(geometry.width, minimumWidth), minimumWidth, hallWidth);
  const height = clamp(finiteNumber(geometry.height, minimumHeight), minimumHeight, hallHeight);
  const x = clamp(finiteNumber(geometry.x), 0, Math.max(0, hallWidth - width));
  const y = clamp(finiteNumber(geometry.y), 0, Math.max(0, hallHeight - height));
  return { x, y, width, height, rotation: 0 };
}

function ResizeHandles({
  x,
  y,
  width,
  height,
  size,
  locale,
  subject,
  onPointerDown,
  onKeyDown,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  size: number;
  locale: PortalLocale;
  subject: string;
  onPointerDown: (event: ReactPointerEvent<SVGGElement>, handle: ResizeHandle) => void;
  onKeyDown: (event: ReactKeyboardEvent<SVGGElement>, handle: ResizeHandle) => void;
}) {
  return (
    <g data-resize-handles="true">
      {RESIZE_HANDLES.map(({ handle, xFactor, yFactor, cursor }) => {
        const cx = x + width * xFactor;
        const cy = y + height * yFactor;
        return (
          <g
            key={handle}
            role="button"
            tabIndex={0}
            aria-label={`${copy[locale].resize} ${subject}, ${resizeHandleLabel(handle, locale)}. ${copy[locale].resizeHint}`}
            data-resize-handle={handle}
            style={{ cursor }}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => onPointerDown(event, handle)}
            onKeyDown={(event) => onKeyDown(event, handle)}
          >
            <circle cx={cx} cy={cy} r={size * 3.4} fill="transparent" stroke="transparent" />
            {xFactor === 0.5 || yFactor === 0.5 ? (
              <rect
                x={cx - size * 0.9}
                y={cy - size * 0.9}
                width={size * 1.8}
                height={size * 1.8}
                rx={size * 0.45}
                fill="#fffdf7"
                stroke="#9a6e20"
                strokeWidth={size * 0.45}
                pointerEvents="none"
              />
            ) : (
              <circle
                cx={cx}
                cy={cy}
                r={size}
                fill="#fffdf7"
                stroke="#9a6e20"
                strokeWidth={size * 0.5}
                pointerEvents="none"
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

function RotationHandle({
  stem,
  handle,
  rotation,
  size,
  locale,
  subject,
  onPointerDown,
  onKeyDown,
}: {
  stem: CanvasPoint;
  handle: CanvasPoint;
  rotation: number;
  size: number;
  locale: PortalLocale;
  subject: string;
  onPointerDown: (event: ReactPointerEvent<SVGGElement>) => void;
  onKeyDown: (event: ReactKeyboardEvent<SVGGElement>) => void;
}) {
  return (
    <g
      role="button"
      tabIndex={0}
      data-rotation-handle="true"
      aria-label={`${copy[locale].rotationHandle}: ${subject}. ${copy[locale].rotationHint}`}
      style={{ cursor: "grab" }}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    >
      <line
        x1={stem.x}
        y1={stem.y}
        x2={handle.x}
        y2={handle.y}
        stroke="#9a6e20"
        strokeWidth={size * 0.75}
        strokeDasharray={`${size * 1.8} ${size}`}
        pointerEvents="none"
      />
      <circle cx={handle.x} cy={handle.y} r={size * 14} fill="transparent" stroke="transparent" />
      <circle
        cx={handle.x}
        cy={handle.y}
        r={size * 6}
        fill="#fff8e8"
        stroke="#9a6e20"
        strokeWidth={size * 0.75}
        pointerEvents="none"
      />
      <text
        x={handle.x}
        y={handle.y}
        dominantBaseline="middle"
        textAnchor="middle"
        fill="#805e20"
        fontSize={size * 5}
        fontWeight="800"
        pointerEvents="none"
      >
        ↻
      </text>
      <text
        x={handle.x}
        y={handle.y - size * 8.3}
        textAnchor="middle"
        fill="#6d511e"
        fontSize={size * 2.7}
        fontWeight="800"
        pointerEvents="none"
      >
        {Math.round(rotation)}°
      </text>
    </g>
  );
}

function DimensionBadge({
  x,
  y,
  width,
  height,
  hallWidth,
  hallHeight,
  physicalWidth,
  physicalHeight,
  unit,
  locale,
  size,
}: ResizeGeometry & {
  hallWidth: number;
  hallHeight: number;
  physicalWidth: number;
  physicalHeight: number;
  unit: string;
  locale: PortalLocale;
  size: number;
}) {
  const metricWidth = (width / hallWidth) * physicalWidth;
  const metricHeight = (height / hallHeight) * physicalHeight;
  const area = metricWidth * metricHeight;
  const formatter = new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const label = `${formatter.format(metricWidth)} × ${formatter.format(metricHeight)} ${unit} · ${formatter.format(area)} ${unit}²`;
  const badgeWidth = Math.max(size * 34, label.length * size * 2.05);
  const badgeHeight = size * 8.5;
  const centerX = x + width / 2;
  const placeAbove = y > badgeHeight + size * 2.5;
  const badgeY = placeAbove ? y - badgeHeight - size * 2 : y + height + size * 2;

  return (
    <g pointerEvents="none" data-dimension-readout="true" aria-hidden="true">
      <rect
        x={centerX - badgeWidth / 2}
        y={badgeY}
        width={badgeWidth}
        height={badgeHeight}
        rx={size * 2.2}
        fill="#17342c"
        stroke="#fffdf7"
        strokeWidth={size * 0.35}
        opacity={0.96}
      />
      <text
        x={centerX}
        y={badgeY + badgeHeight / 2}
        dominantBaseline="middle"
        textAnchor="middle"
        direction="ltr"
        fill="#fffdf7"
        fontSize={size * 2.8}
        fontWeight="750"
      >
        {label}
      </text>
    </g>
  );
}

function formatMetric(value: number, locale: PortalLocale) {
  return new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US", {
    maximumFractionDigits: value < 10 ? 1 : 0,
  }).format(value);
}

function overlayText(
  booth: Booth,
  overlay: HallOverlayMode,
  summary: EquipmentSummary,
  locale: PortalLocale,
) {
  const strings = copy[locale];
  if (overlay === "delivery") return `${summary.delivered}/${summary.requested} ${strings.delivered}`;
  if (overlay === "pickup") return `${summary.pickedUp}/${summary.delivered} ${strings.collected}`;
  if (overlay === "issues") return `${summary.issues} ${strings.issueCount}`;
  return localize(booth.company, locale, strings.noCompany);
}

function featureStyle(kind: string) {
  const normalized = kind.toLowerCase().replace(/[\s/-]+/g, "_");
  if (normalized.includes("zone")) {
    return { fill: "rgba(183, 137, 54, 0.09)", stroke: "#ad8339", dash: "5 4", text: "#6e511d" };
  }
  if (normalized.includes("aisle") || normalized.includes("corridor")) {
    return { fill: "rgba(255,255,255,0.42)", stroke: "#9aa7a1", dash: "8 5", text: "#65736e" };
  }
  if (normalized.includes("loading")) {
    return { fill: "rgba(221, 147, 56, 0.18)", stroke: "#b66d1f", dash: "4 3", text: "#794415" };
  }
  if (normalized.includes("utility") || normalized.includes("power") || normalized.includes("water")) {
    return { fill: "rgba(25, 139, 160, 0.16)", stroke: "#197f92", dash: "3 2", text: "#125666" };
  }
  if (normalized.includes("door") || normalized.includes("entrance") || normalized.includes("exit")) {
    return { fill: "rgba(56, 132, 99, 0.12)", stroke: "#27795a", dash: "", text: "#18523d" };
  }
  if (normalized.includes("column") || normalized.includes("pillar")) {
    return { fill: "#31423d", stroke: "#102a23", dash: "", text: "#ffffff" };
  }
  return { fill: "rgba(82, 101, 94, 0.12)", stroke: "#6d7d77", dash: "4 3", text: "#46544f" };
}

function isZoneFeature(kind: string) {
  const normalized = kind.toLowerCase();
  return normalized.includes("zone") || normalized.includes("aisle") || normalized.includes("corridor");
}

export function HallCanvas({
  locale,
  hall,
  selectedBoothId = null,
  selectedFeatureId = null,
  searchQuery = "",
  statusFilter = "all",
  overlay = "allocation",
  editMode = false,
  backgroundImage = null,
  layerVisibility = DEFAULT_LAYERS,
  onSelectBooth,
  onMoveBooth,
  onMoveComplete,
  onUpdateBoothGeometry,
  onCommitBoothGeometry,
  onSelectFeature,
  onUpdateFeature,
  onCommitFeature,
  onDeleteFeature,
}: HallCanvasProps) {
  const strings = copy[locale];
  const reactId = useId().replaceAll(":", "");
  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const featureDragRef = useRef<FeatureDragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const rotationRef = useRef<RotationState | null>(null);
  const panRef = useRef<PanState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<CanvasPoint>({ x: 0, y: 0 });
  const [tool, setTool] = useState<InteractionTool>("select");
  const [stateHallId, setStateHallId] = useState(hall.id);
  const [dragPreview, setDragPreview] = useState<{ boothId: string; x: number; y: number } | null>(null);
  const [featureDragPreview, setFeatureDragPreview] = useState<{
    featureId: string;
    x: number;
    y: number;
  } | null>(null);
  const [resizePreview, setResizePreview] = useState<{
    target: ResizeTarget;
    itemId: string;
    geometry: ResizeGeometry;
  } | null>(null);
  const [deleteArmedFor, setDeleteArmedFor] = useState<string | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapMetric, setSnapMetric] = useState<(typeof SNAP_METRIC_OPTIONS)[number]>(0.5);

  if (stateHallId !== hall.id) {
    setStateHallId(hall.id);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setTool("select");
    setDragPreview(null);
    setFeatureDragPreview(null);
    setResizePreview(null);
    setDeleteArmedFor(null);
  }

  useEffect(() => {
    const pointerIds = [
      dragRef.current?.pointerId,
      featureDragRef.current?.pointerId,
      resizeRef.current?.pointerId,
      rotationRef.current?.pointerId,
      panRef.current?.pointerId,
    ];
    for (const pointerId of pointerIds) {
      if (pointerId !== undefined && viewportRef.current?.hasPointerCapture(pointerId)) {
        viewportRef.current.releasePointerCapture(pointerId);
      }
    }
    dragRef.current = null;
    featureDragRef.current = null;
    resizeRef.current = null;
    rotationRef.current = null;
    panRef.current = null;
  }, [hall.id]);

  const hallWidth = Math.max(1, finiteNumber(hall.width, 1));
  const hallHeight = Math.max(1, finiteNumber(hall.height, 1));
  const physicalWidth = Math.max(0, finiteNumber(hall.physicalWidth, hallWidth));
  const physicalHeight = Math.max(0, finiteNumber(hall.physicalHeight, hallHeight));
  const unit = typeof hall.unit === "string" ? hall.unit : "m";
  const padding = Math.max(hallWidth, hallHeight) * 0.075;
  const strokeUnit = clamp(Math.min(hallWidth, hallHeight) / 260, 0.28, 2.2);
  const canvasPerMetricX = physicalWidth > 0 ? hallWidth / physicalWidth : hallWidth / 50;
  const canvasPerMetricY = physicalHeight > 0 ? hallHeight / physicalHeight : hallHeight / 40;
  const minimumCanvasWidth = clamp(canvasPerMetricX * 0.25, 0.1, hallWidth);
  const minimumCanvasHeight = clamp(canvasPerMetricY * 0.25, 0.1, hallHeight);
  const gridWidth = Math.max(strokeUnit * 2, canvasPerMetricX * snapMetric);
  const gridHeight = Math.max(strokeUnit * 2, canvasPerMetricY * snapMetric);
  const majorGridWidth = gridWidth * 5;
  const majorGridHeight = gridHeight * 5;
  const rulerThickness = strokeUnit * 14;
  const rulerFontSize = strokeUnit * 4;
  const horizontalRulerTicks = buildRulerTicks(physicalWidth);
  const verticalRulerTicks = buildRulerTicks(physicalHeight);
  const mapTitle = localize(hall.name, locale, hall.id);
  const gridId = `hall-grid-${reactId}`;
  const majorGridId = `hall-major-grid-${reactId}`;
  const clipId = `hall-clip-${reactId}`;
  const gridVisible = layerVisibility.grid;
  const query = normalizeSearchText(searchQuery, locale);
  const selectedFeature = useMemo(
    () => hall.features.find((feature) => feature.id === selectedFeatureId) ?? null,
    [hall.features, selectedFeatureId],
  );

  const boothViews = useMemo(
    () =>
      hall.booths.map((booth) => {
        const summary = summarizeEquipment(booth);
        const equipmentLabels = booth.equipment
          .map((line) =>
            [localize(line.name, locale), equipmentStageLabel(line.stage, locale), line.stage].join(" "),
          )
          .join(" ");
        const searchText = [
          booth.code,
          booth.company,
          booth.owner,
          booth.notes,
          booth.zone,
          booth.status,
          statusLabel(booth.status, locale),
          equipmentLabels,
          booth.equipment,
        ]
          .map(searchableValue)
          .join(" ");
        const normalizedSearchText = normalizeSearchText(searchText, locale);
        const matchesQuery = !query || normalizedSearchText.includes(query);
        const matchesStatus = statusFilter === "all" || booth.status === statusFilter;
        return {
          booth,
          summary,
          matches: matchesQuery && matchesStatus,
          palette: paletteFor(booth, overlay, summary),
        };
      }),
    [hall.booths, locale, overlay, query, statusFilter],
  );

  const visibleCount = boothViews.filter((item) => item.matches).length;

  const snapCanvasPoint = useCallback(
    (x: number, y: number): CanvasPoint => {
      if (!snapEnabled) return { x, y };
      return {
        x: snapToIncrement(x, gridWidth),
        y: snapToIncrement(y, gridHeight),
      };
    },
    [gridHeight, gridWidth, snapEnabled],
  );

  const clientToCanvas = useCallback((clientX: number, clientY: number): CanvasPoint | null => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x, y: transformed.y };
  }, []);

  const beginPan = useCallback(
    (event: ReactPointerEvent<Element>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      viewportRef.current?.setPointerCapture(event.pointerId);
      panRef.current = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        originX: pan.x,
        originY: pan.y,
      };
    },
    [pan.x, pan.y],
  );

  const handleBoothPointerDown = useCallback(
    (event: ReactPointerEvent<SVGGElement>, booth: Booth) => {
      if (tool === "pan") {
        event.stopPropagation();
        beginPan(event);
        return;
      }

      event.stopPropagation();
      onSelectFeature?.(null);
      onSelectBooth?.(booth.id);
      if (!editMode || event.button !== 0) return;

      const point = clientToCanvas(event.clientX, event.clientY);
      if (!point) return;
      event.preventDefault();
      viewportRef.current?.setPointerCapture(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        boothId: booth.id,
        offsetX: point.x - booth.x,
        offsetY: point.y - booth.y,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: booth.x,
        startY: booth.y,
        moved: false,
        x: booth.x,
        y: booth.y,
      };
      setDragPreview({ boothId: booth.id, x: booth.x, y: booth.y });
    },
    [beginPan, clientToCanvas, editMode, onSelectBooth, onSelectFeature, tool],
  );

  const handleFeaturePointerDown = useCallback(
    (event: ReactPointerEvent<SVGGElement>, feature: HallFeature) => {
      if (!editMode) return;
      if (tool === "pan") {
        event.stopPropagation();
        beginPan(event);
        return;
      }

      event.stopPropagation();
      onSelectFeature?.(feature.id);
      setDeleteArmedFor(null);
      if (event.button !== 0) return;

      const point = clientToCanvas(event.clientX, event.clientY);
      if (!point) return;
      event.preventDefault();
      viewportRef.current?.setPointerCapture(event.pointerId);
      featureDragRef.current = {
        pointerId: event.pointerId,
        featureId: feature.id,
        offsetX: point.x - feature.x,
        offsetY: point.y - feature.y,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: feature.x,
        startY: feature.y,
        moved: false,
        x: feature.x,
        y: feature.y,
      };
      setFeatureDragPreview({ featureId: feature.id, x: feature.x, y: feature.y });
    },
    [beginPan, clientToCanvas, editMode, onSelectFeature, tool],
  );

  const beginResize = useCallback(
    (
      event: ReactPointerEvent<SVGGElement>,
      target: ResizeTarget,
      item: Booth | HallFeature,
      handle: ResizeHandle,
    ) => {
      if (!editMode || tool !== "select" || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      if (target === "booth") {
        onSelectFeature?.(null);
        onSelectBooth?.(item.id);
      } else {
        onSelectFeature?.(item.id);
        setDeleteArmedFor(null);
      }
      viewportRef.current?.setPointerCapture(event.pointerId);
      const geometry: ResizeGeometry = {
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        rotation: target === "feature" ? (item as HallFeature).rotation ?? 0 : 0,
      };
      resizeRef.current = {
        pointerId: event.pointerId,
        target,
        itemId: item.id,
        handle,
        startClientX: event.clientX,
        startClientY: event.clientY,
        start: geometry,
        geometry,
        moved: false,
      };
      setResizePreview({ target, itemId: item.id, geometry });
    },
    [editMode, onSelectBooth, onSelectFeature, tool],
  );

  const beginRotation = useCallback(
    (event: ReactPointerEvent<SVGGElement>, feature: HallFeature) => {
      if (!editMode || tool !== "select" || event.button !== 0) return;
      const startPointer = clientToCanvas(event.clientX, event.clientY);
      if (!startPointer) return;
      event.preventDefault();
      event.stopPropagation();
      onSelectFeature?.(feature.id);
      setDeleteArmedFor(null);
      viewportRef.current?.setPointerCapture(event.pointerId);
      const geometry: ResizeGeometry = {
        x: feature.x,
        y: feature.y,
        width: feature.width,
        height: feature.height,
        rotation: feature.rotation ?? 0,
      };
      rotationRef.current = {
        pointerId: event.pointerId,
        featureId: feature.id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        center: {
          x: feature.x + feature.width / 2,
          y: feature.y + feature.height / 2,
        },
        startPointer,
        start: geometry,
        geometry,
        moved: false,
      };
      setResizePreview({ target: "feature", itemId: feature.id, geometry });
    },
    [clientToCanvas, editMode, onSelectFeature, tool],
  );

  const handleRotationHandleKeyDown = useCallback(
    (event: ReactKeyboardEvent<SVGGElement>, feature: HallFeature) => {
      if (!editMode || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
      event.preventDefault();
      event.stopPropagation();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const rotation = calculatePointerRotation({
        center: { x: 0, y: 0 },
        startPointer: { x: 1, y: 0 },
        currentPointer: {
          x: Math.cos((direction * (event.shiftKey ? 15 : 5) * Math.PI) / 180),
          y: Math.sin((direction * (event.shiftKey ? 15 : 5) * Math.PI) / 180),
        },
        initialRotation: feature.rotation ?? 0,
      });
      const next = boundedFeatureGeometry(
        feature,
        { rotation },
        hallWidth,
        hallHeight,
        minimumCanvasWidth,
        minimumCanvasHeight,
      );
      onUpdateFeature?.(feature.id, next);
      onCommitFeature?.(feature.id, next);
    },
    [editMode, hallHeight, hallWidth, minimumCanvasHeight, minimumCanvasWidth, onCommitFeature, onUpdateFeature],
  );

  const handleResizeHandleKeyDown = useCallback(
    (
      event: ReactKeyboardEvent<SVGGElement>,
      target: ResizeTarget,
      item: Booth | HallFeature,
      handle: ResizeHandle,
    ) => {
      if (!editMode || !event.key.startsWith("Arrow")) return;
      event.preventDefault();
      event.stopPropagation();
      const start: ResizeGeometry = {
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        rotation: target === "feature" ? (item as HallFeature).rotation ?? 0 : 0,
      };
      const handlePoint = resizeHandlePoint(start, handle);
      const multiplier = event.shiftKey ? 5 : 1;
      const stepX = snapEnabled ? gridWidth * multiplier : event.shiftKey ? 10 : 2;
      const stepY = snapEnabled ? gridHeight * multiplier : event.shiftKey ? 10 : 2;
      if (event.key === "ArrowLeft") handlePoint.x -= stepX;
      if (event.key === "ArrowRight") handlePoint.x += stepX;
      if (event.key === "ArrowUp") handlePoint.y -= stepY;
      if (event.key === "ArrowDown") handlePoint.y += stepY;
      const resized = resizedGeometryFromPoint(start, handle, handlePoint, {
        snap: snapEnabled,
        stepX: gridWidth,
        stepY: gridHeight,
        minimumWidth: minimumCanvasWidth,
        minimumHeight: minimumCanvasHeight,
      });
      const next =
        target === "booth"
          ? boundedBoothGeometry(resized, hallWidth, hallHeight, minimumCanvasWidth, minimumCanvasHeight)
          : boundedFeatureGeometry(
              item as HallFeature,
              resized,
              hallWidth,
              hallHeight,
              minimumCanvasWidth,
              minimumCanvasHeight,
            );
      if (!geometryChanged(start, next)) return;
      const patch = { x: next.x, y: next.y, width: next.width, height: next.height };
      if (target === "booth") {
        onUpdateBoothGeometry?.(item.id, patch);
        onCommitBoothGeometry?.(item.id, patch);
      } else {
        onUpdateFeature?.(item.id, patch);
        onCommitFeature?.(item.id, patch);
      }
    },
    [
      editMode,
      gridHeight,
      gridWidth,
      hallHeight,
      hallWidth,
      minimumCanvasHeight,
      minimumCanvasWidth,
      onCommitBoothGeometry,
      onCommitFeature,
      onUpdateBoothGeometry,
      onUpdateFeature,
      snapEnabled,
    ],
  );

  const handleViewportPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (editMode && tool === "select") {
        onSelectFeature?.(null);
        setDeleteArmedFor(null);
      }
      beginPan(event);
    },
    [beginPan, editMode, onSelectFeature, tool],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const rotationInteraction = rotationRef.current;
      if (rotationInteraction?.pointerId === event.pointerId) {
        if (
          !rotationInteraction.moved &&
          Math.hypot(
            event.clientX - rotationInteraction.startClientX,
            event.clientY - rotationInteraction.startClientY,
          ) < DRAG_THRESHOLD_PX
        ) {
          return;
        }
        const currentPointer = clientToCanvas(event.clientX, event.clientY);
        const feature = hall.features.find((item) => item.id === rotationInteraction.featureId);
        if (!currentPointer || !feature) return;
        rotationInteraction.moved = true;
        const rotation = calculatePointerRotation({
          center: rotationInteraction.center,
          startPointer: rotationInteraction.startPointer,
          currentPointer,
          initialRotation: rotationInteraction.start.rotation,
          snapIncrement: event.shiftKey ? 15 : snapEnabled ? 5 : 0,
        });
        const next = boundedFeatureGeometry(
          feature,
          { ...rotationInteraction.start, rotation },
          hallWidth,
          hallHeight,
          minimumCanvasWidth,
          minimumCanvasHeight,
        );
        if (!geometryChanged(rotationInteraction.geometry, next)) return;
        rotationInteraction.geometry = next;
        setResizePreview({ target: "feature", itemId: feature.id, geometry: next });
        onUpdateFeature?.(feature.id, next);
        return;
      }

      const resize = resizeRef.current;
      if (resize?.pointerId === event.pointerId) {
        if (
          !resize.moved &&
          Math.hypot(event.clientX - resize.startClientX, event.clientY - resize.startClientY) < DRAG_THRESHOLD_PX
        ) {
          return;
        }
        resize.moved = true;
        const point = clientToCanvas(event.clientX, event.clientY);
        if (!point) return;
        const resized = resizedGeometryFromPoint(resize.start, resize.handle, point, {
          snap: snapEnabled,
          stepX: gridWidth,
          stepY: gridHeight,
          minimumWidth: minimumCanvasWidth,
          minimumHeight: minimumCanvasHeight,
        });
        const item =
          resize.target === "booth"
            ? hall.booths.find((booth) => booth.id === resize.itemId)
            : hall.features.find((feature) => feature.id === resize.itemId);
        if (!item) return;
        const next =
          resize.target === "booth"
            ? boundedBoothGeometry(resized, hallWidth, hallHeight, minimumCanvasWidth, minimumCanvasHeight)
            : boundedFeatureGeometry(
                item as HallFeature,
                resized,
                hallWidth,
                hallHeight,
                minimumCanvasWidth,
                minimumCanvasHeight,
              );
        if (!geometryChanged(resize.geometry, next)) return;
        resize.geometry = next;
        setResizePreview({ target: resize.target, itemId: resize.itemId, geometry: next });
        const patch = { x: next.x, y: next.y, width: next.width, height: next.height };
        if (resize.target === "booth") onUpdateBoothGeometry?.(resize.itemId, patch);
        else onUpdateFeature?.(resize.itemId, patch);
        return;
      }

      const drag = dragRef.current;
      if (drag?.pointerId === event.pointerId) {
        if (
          !drag.moved &&
          Math.hypot(event.clientX - drag.startClientX, event.clientY - drag.startClientY) < DRAG_THRESHOLD_PX
        ) {
          return;
        }
        drag.moved = true;
        const booth = hall.booths.find((item) => item.id === drag.boothId);
        const point = clientToCanvas(event.clientX, event.clientY);
        if (!booth || !point) return;
        const snapped = snapCanvasPoint(point.x - drag.offsetX, point.y - drag.offsetY);
        const x = clamp(snapped.x, 0, Math.max(0, hallWidth - booth.width));
        const y = clamp(snapped.y, 0, Math.max(0, hallHeight - booth.height));
        if (Math.abs(x - drag.x) <= GEOMETRY_EPSILON && Math.abs(y - drag.y) <= GEOMETRY_EPSILON) return;
        drag.x = x;
        drag.y = y;
        setDragPreview({ boothId: booth.id, x, y });
        onMoveBooth?.(booth.id, x, y);
        return;
      }

      const featureDrag = featureDragRef.current;
      if (featureDrag?.pointerId === event.pointerId) {
        if (
          !featureDrag.moved &&
          Math.hypot(
            event.clientX - featureDrag.startClientX,
            event.clientY - featureDrag.startClientY,
          ) < DRAG_THRESHOLD_PX
        ) {
          return;
        }
        featureDrag.moved = true;
        const feature = hall.features.find((item) => item.id === featureDrag.featureId);
        const point = clientToCanvas(event.clientX, event.clientY);
        if (!feature || !point) return;
        const snapped = snapCanvasPoint(point.x - featureDrag.offsetX, point.y - featureDrag.offsetY);
        const next = boundedFeatureGeometry(
          feature,
          { x: snapped.x, y: snapped.y },
          hallWidth,
          hallHeight,
          minimumCanvasWidth,
          minimumCanvasHeight,
        );
        if (
          Math.abs(next.x - featureDrag.x) <= GEOMETRY_EPSILON &&
          Math.abs(next.y - featureDrag.y) <= GEOMETRY_EPSILON
        ) {
          return;
        }
        featureDrag.x = next.x;
        featureDrag.y = next.y;
        setFeatureDragPreview({ featureId: feature.id, x: next.x, y: next.y });
        onUpdateFeature?.(feature.id, { x: next.x, y: next.y });
        return;
      }

      const activePan = panRef.current;
      if (activePan?.pointerId === event.pointerId) {
        setPan({
          x: activePan.originX + event.clientX - activePan.clientX,
          y: activePan.originY + event.clientY - activePan.clientY,
        });
      }
    },
    [
      clientToCanvas,
      hall.booths,
      hall.features,
      hallHeight,
      hallWidth,
      gridHeight,
      gridWidth,
      minimumCanvasHeight,
      minimumCanvasWidth,
      onMoveBooth,
      onUpdateBoothGeometry,
      onUpdateFeature,
      snapCanvasPoint,
      snapEnabled,
    ],
  );

  const finishPointerInteraction = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const rotationInteraction = rotationRef.current;
      if (rotationInteraction?.pointerId === event.pointerId) {
        if (
          rotationInteraction.moved &&
          geometryChanged(rotationInteraction.start, rotationInteraction.geometry)
        ) {
          onCommitFeature?.(rotationInteraction.featureId, rotationInteraction.geometry);
        }
        rotationRef.current = null;
        setResizePreview(null);
      }
      const resize = resizeRef.current;
      if (resize?.pointerId === event.pointerId) {
        if (resize.moved && geometryChanged(resize.start, resize.geometry)) {
          const patch = {
            x: resize.geometry.x,
            y: resize.geometry.y,
            width: resize.geometry.width,
            height: resize.geometry.height,
          };
          if (resize.target === "booth") onCommitBoothGeometry?.(resize.itemId, patch);
          else onCommitFeature?.(resize.itemId, patch);
        }
        resizeRef.current = null;
        setResizePreview(null);
      }
      const drag = dragRef.current;
      if (drag?.pointerId === event.pointerId) {
        if (
          drag.moved &&
          (Math.abs(drag.x - drag.startX) > GEOMETRY_EPSILON ||
            Math.abs(drag.y - drag.startY) > GEOMETRY_EPSILON)
        ) {
          onMoveComplete?.(drag.boothId, drag.x, drag.y);
        }
        dragRef.current = null;
        setDragPreview(null);
      }
      const featureDrag = featureDragRef.current;
      if (featureDrag?.pointerId === event.pointerId) {
        if (
          featureDrag.moved &&
          (Math.abs(featureDrag.x - featureDrag.startX) > GEOMETRY_EPSILON ||
            Math.abs(featureDrag.y - featureDrag.startY) > GEOMETRY_EPSILON)
        ) {
          onCommitFeature?.(featureDrag.featureId, { x: featureDrag.x, y: featureDrag.y });
        }
        featureDragRef.current = null;
        setFeatureDragPreview(null);
      }
      if (panRef.current?.pointerId === event.pointerId) panRef.current = null;
      if (viewportRef.current?.hasPointerCapture(event.pointerId)) {
        viewportRef.current.releasePointerCapture(event.pointerId);
      }
    },
    [onCommitBoothGeometry, onCommitFeature, onMoveComplete],
  );

  const handleBoothKeyDown = useCallback(
    (event: ReactKeyboardEvent<SVGGElement>, booth: Booth) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelectFeature?.(null);
        onSelectBooth?.(booth.id);
        return;
      }

      if (!editMode || !event.key.startsWith("Arrow")) return;
      event.preventDefault();
      const multiplier = event.shiftKey ? 5 : 1;
      const stepX = snapEnabled ? gridWidth * multiplier : multiplier;
      const stepY = snapEnabled ? gridHeight * multiplier : multiplier;
      let x = booth.x;
      let y = booth.y;
      if (event.key === "ArrowLeft") x = snapEnabled ? snapToIncrement(x - stepX, gridWidth) : x - stepX;
      if (event.key === "ArrowRight") x = snapEnabled ? snapToIncrement(x + stepX, gridWidth) : x + stepX;
      if (event.key === "ArrowUp") y = snapEnabled ? snapToIncrement(y - stepY, gridHeight) : y - stepY;
      if (event.key === "ArrowDown") y = snapEnabled ? snapToIncrement(y + stepY, gridHeight) : y + stepY;
      x = clamp(x, 0, Math.max(0, hallWidth - booth.width));
      y = clamp(y, 0, Math.max(0, hallHeight - booth.height));
      if (Math.abs(x - booth.x) <= GEOMETRY_EPSILON && Math.abs(y - booth.y) <= GEOMETRY_EPSILON) return;
      onMoveBooth?.(booth.id, x, y);
      onMoveComplete?.(booth.id, x, y);
    },
    [
      editMode,
      gridHeight,
      gridWidth,
      hallHeight,
      hallWidth,
      onMoveBooth,
      onMoveComplete,
      onSelectBooth,
      onSelectFeature,
      snapEnabled,
    ],
  );

  const handleFeatureKeyDown = useCallback(
    (event: ReactKeyboardEvent<SVGGElement>, feature: HallFeature) => {
      if (!editMode) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelectFeature?.(feature.id);
        setDeleteArmedFor(null);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        onSelectFeature?.(null);
        setDeleteArmedFor(null);
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (!onDeleteFeature) return;
        event.preventDefault();
        if (deleteArmedFor === feature.id) {
          onDeleteFeature(feature.id);
          setDeleteArmedFor(null);
        } else {
          onSelectFeature?.(feature.id);
          setDeleteArmedFor(feature.id);
        }
        return;
      }
      if (!event.key.startsWith("Arrow")) return;

      event.preventDefault();
      const multiplier = event.shiftKey ? 5 : 1;
      const stepX = snapEnabled ? gridWidth * multiplier : event.shiftKey ? 10 : 2;
      const stepY = snapEnabled ? gridHeight * multiplier : event.shiftKey ? 10 : 2;
      let x = feature.x;
      let y = feature.y;
      if (event.key === "ArrowLeft") x = snapEnabled ? snapToIncrement(x - stepX, gridWidth) : x - stepX;
      if (event.key === "ArrowRight") x = snapEnabled ? snapToIncrement(x + stepX, gridWidth) : x + stepX;
      if (event.key === "ArrowUp") y = snapEnabled ? snapToIncrement(y - stepY, gridHeight) : y - stepY;
      if (event.key === "ArrowDown") y = snapEnabled ? snapToIncrement(y + stepY, gridHeight) : y + stepY;
      const next = boundedFeatureGeometry(
        feature,
        { x, y },
        hallWidth,
        hallHeight,
        minimumCanvasWidth,
        minimumCanvasHeight,
      );
      const patch = { x: next.x, y: next.y };
      if (
        Math.abs(patch.x - feature.x) <= GEOMETRY_EPSILON &&
        Math.abs(patch.y - feature.y) <= GEOMETRY_EPSILON
      ) {
        return;
      }
      onUpdateFeature?.(feature.id, patch);
      onCommitFeature?.(feature.id, patch);
    },
    [
      deleteArmedFor,
      editMode,
      gridHeight,
      gridWidth,
      hallHeight,
      hallWidth,
      minimumCanvasHeight,
      minimumCanvasWidth,
      onCommitFeature,
      onDeleteFeature,
      onSelectFeature,
      onUpdateFeature,
      snapEnabled,
    ],
  );

  const updateSelectedFeatureGeometry = useCallback(
    (patch: HallFeaturePatch) => {
      if (!selectedFeature) return;
      const next = boundedFeatureGeometry(
        selectedFeature,
        patch,
        hallWidth,
        hallHeight,
        minimumCanvasWidth,
        minimumCanvasHeight,
      );
      onUpdateFeature?.(selectedFeature.id, next);
    },
    [hallHeight, hallWidth, minimumCanvasHeight, minimumCanvasWidth, onUpdateFeature, selectedFeature],
  );

  const commitSelectedFeatureGeometry = useCallback(() => {
    if (!selectedFeature) return;
    onCommitFeature?.(
      selectedFeature.id,
      boundedFeatureGeometry(
        selectedFeature,
        {},
        hallWidth,
        hallHeight,
        minimumCanvasWidth,
        minimumCanvasHeight,
      ),
    );
  }, [hallHeight, hallWidth, minimumCanvasHeight, minimumCanvasWidth, onCommitFeature, selectedFeature]);

  const handleWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    setZoom((current) => clamp(current + direction * ZOOM_STEP, ZOOM_MIN, ZOOM_MAX));
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const toolbarButton =
    "inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[rgba(18,49,42,0.14)] bg-white/90 text-[#17342c] shadow-sm outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-[#b78936] aria-pressed:border-[#b78936]/50 aria-pressed:bg-[#fff8e8] aria-pressed:text-[#805e20] disabled:cursor-not-allowed disabled:opacity-40";

  const selectedFeatureResizeGeometry =
    selectedFeature && resizePreview?.target === "feature" && resizePreview.itemId === selectedFeature.id
      ? resizePreview.geometry
      : null;
  const selectedFeatureDisplayGeometry = selectedFeature
    ? {
        x:
          selectedFeatureResizeGeometry?.x ??
          (featureDragPreview?.featureId === selectedFeature.id
            ? featureDragPreview.x
            : selectedFeature.x),
        y:
          selectedFeatureResizeGeometry?.y ??
          (featureDragPreview?.featureId === selectedFeature.id
            ? featureDragPreview.y
            : selectedFeature.y),
        width: selectedFeatureResizeGeometry?.width ?? selectedFeature.width,
        height: selectedFeatureResizeGeometry?.height ?? selectedFeature.height,
        rotation: selectedFeatureResizeGeometry?.rotation ?? selectedFeature.rotation ?? 0,
      }
    : null;
  const rotationHandleGeometry = selectedFeatureDisplayGeometry
    ? (() => {
        const center = {
          x: selectedFeatureDisplayGeometry.x + selectedFeatureDisplayGeometry.width / 2,
          y: selectedFeatureDisplayGeometry.y + selectedFeatureDisplayGeometry.height / 2,
        };
        const offset = Math.max(
          strokeUnit * 13,
          Math.min(strokeUnit * 22, selectedFeatureDisplayGeometry.height * 0.28),
        );
        return {
          stem: rotatePoint(
            { x: center.x, y: selectedFeatureDisplayGeometry.y },
            center,
            selectedFeatureDisplayGeometry.rotation,
          ),
          handle: rotatePoint(
            { x: center.x, y: selectedFeatureDisplayGeometry.y - offset },
            center,
            selectedFeatureDisplayGeometry.rotation,
          ),
        };
      })()
    : null;

  return (
    <section
      className={`${styles.blueprint} overflow-hidden rounded-[1.35rem] border border-[rgba(18,49,42,0.13)]`}
      aria-labelledby={`hall-canvas-title-${reactId}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(18,49,42,0.12)] bg-white/80 px-4 py-3 backdrop-blur-md sm:px-5">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <Crosshair aria-hidden="true" className="h-4 w-4 shrink-0 text-[#b78936]" />
            <h2 id={`hall-canvas-title-${reactId}`} className="truncate text-sm font-semibold text-[#10211d]">
              {mapTitle}
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-[#65726d]" dir="ltr">
            {formatMetric(physicalWidth, locale)} × {formatMetric(physicalHeight, locale)} {unit}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#65726d]">
          <span className="rounded-full border border-[rgba(18,49,42,0.12)] bg-white/70 px-2.5 py-1">
            {visibleCount}/{hall.booths.length} {strings.boothsShown}
          </span>
          <span className="rounded-full border border-[#b78936]/25 bg-[#b78936]/10 px-2.5 py-1 font-medium text-[#76571f]">
            {strings[overlay]}
          </span>
          {backgroundImage && layerVisibility.background ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(18,49,42,0.12)] bg-white/70 px-2.5 py-1">
              <LockKeyhole aria-hidden="true" className="h-3 w-3" />
              {strings.lockedBackground}
            </span>
          ) : null}
        </div>
      </header>

      <p id={`hall-canvas-help-${reactId}`} className="sr-only">
        {editMode ? strings.editHint : strings.viewHint}
      </p>

      <div
        ref={viewportRef}
        className={styles.mapViewport}
        aria-label={strings.canvas}
        aria-describedby={`hall-canvas-help-${reactId}`}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerInteraction}
        onPointerCancel={finishPointerInteraction}
        onWheel={handleWheel}
      >
        <div
          className="absolute start-3 top-3 z-20 flex items-center gap-1 rounded-xl border border-[rgba(18,49,42,0.13)] bg-white/90 p-1 shadow-lg backdrop-blur-md"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className={toolbarButton}
            aria-label={strings.select}
            aria-pressed={tool === "select"}
            title={strings.select}
            onClick={() => setTool("select")}
          >
            <MousePointer2 aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={toolbarButton}
            aria-label={strings.pan}
            aria-pressed={tool === "pan"}
            title={strings.pan}
            onClick={() => setTool("pan")}
          >
            <Hand aria-hidden="true" className="h-4 w-4" />
          </button>
          <span className="mx-0.5 h-5 w-px bg-[rgba(18,49,42,0.13)]" aria-hidden="true" />
          <button
            type="button"
            className={toolbarButton}
            aria-label={strings.zoomOut}
            title={strings.zoomOut}
            disabled={zoom <= ZOOM_MIN}
            onClick={() => setZoom((current) => clamp(current - ZOOM_STEP, ZOOM_MIN, ZOOM_MAX))}
          >
            <ZoomOut aria-hidden="true" className="h-4 w-4" />
          </button>
          <span className="min-w-11 px-1 text-center text-[11px] font-semibold tabular-nums text-[#43534d]">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className={toolbarButton}
            aria-label={strings.zoomIn}
            title={strings.zoomIn}
            disabled={zoom >= ZOOM_MAX}
            onClick={() => setZoom((current) => clamp(current + ZOOM_STEP, ZOOM_MIN, ZOOM_MAX))}
          >
            <ZoomIn aria-hidden="true" className="h-4 w-4" />
          </button>
          <button type="button" className={toolbarButton} aria-label={strings.reset} title={strings.fit} onClick={resetView}>
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div
          className="absolute end-3 top-14 z-20 flex items-center gap-1 rounded-xl border border-[rgba(18,49,42,0.13)] bg-white/90 p-1 shadow-lg backdrop-blur-md sm:top-3"
          aria-label={`${strings.grid} / ${strings.snap}`}
          onPointerDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          <span
            role="status"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border shadow-sm ${
              gridVisible
                ? "border-[#b78936]/50 bg-[#fff8e8] text-[#805e20]"
                : "border-[rgba(18,49,42,0.12)] bg-white/70 text-[#87928d]"
            }`}
            aria-label={gridVisible ? strings.gridVisible : strings.gridHidden}
            title={gridVisible ? strings.gridVisible : strings.gridHidden}
          >
            <Grid3X3 aria-hidden="true" className="h-4 w-4" />
          </span>
          {editMode ? (
            <button
              type="button"
              className={toolbarButton}
              aria-label={snapEnabled ? strings.disableSnap : strings.enableSnap}
              aria-pressed={snapEnabled}
              title={snapEnabled ? strings.disableSnap : strings.enableSnap}
              onClick={() => setSnapEnabled((current) => !current)}
            >
              <Magnet aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : null}
          <label
            className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-[rgba(18,49,42,0.14)] bg-white/90 px-2 text-[#17342c] shadow-sm focus-within:ring-2 focus-within:ring-[#b78936]"
            title={strings.gridSpacing}
          >
            <span className="sr-only">{strings.gridSpacing}</span>
            <select
              value={snapMetric}
              aria-label={strings.gridSpacing}
              dir="ltr"
              className="h-full min-w-[4.25rem] cursor-pointer bg-transparent pe-1 text-center text-[11px] font-semibold tabular-nums text-[#43534d] outline-none"
              onChange={(event) => {
                const value = Number(event.target.value);
                if (SNAP_METRIC_OPTIONS.includes(value as (typeof SNAP_METRIC_OPTIONS)[number])) {
                  setSnapMetric(value as (typeof SNAP_METRIC_OPTIONS)[number]);
                }
              }}
            >
              {SNAP_METRIC_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} {unit}
                </option>
              ))}
            </select>
          </label>
        </div>

        {editMode && selectedFeature ? (
          <div
            className="absolute end-3 top-28 z-30 w-[min(18rem,calc(100%-1.5rem))] rounded-xl border border-[rgba(18,49,42,0.14)] bg-white/95 p-3 shadow-xl backdrop-blur-md sm:top-16"
            dir={locale === "fa" ? "rtl" : "ltr"}
            onPointerDown={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") setDeleteArmedFor(null);
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8b6a2b]">
                  {strings.feature}
                </div>
                <div className="mt-1 truncate text-sm font-semibold text-[#17342c]">
                  {localize(selectedFeature.label, locale, featureKindLabel(selectedFeature.kind, locale))}
                </div>
                <div className="mt-0.5 text-[11px] text-[#65726d]">
                  {featureKindLabel(selectedFeature.kind, locale)}
                </div>
              </div>
              <button
                type="button"
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-[#b78936] disabled:cursor-not-allowed disabled:opacity-45 ${
                  deleteArmedFor === selectedFeature.id
                    ? "border-red-300 bg-red-600 text-white"
                    : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                }`}
                disabled={!onDeleteFeature}
                aria-label={
                  deleteArmedFor === selectedFeature.id
                    ? strings.confirmDeleteFeature
                    : strings.deleteFeature
                }
                title={
                  deleteArmedFor === selectedFeature.id
                    ? strings.confirmDeleteFeature
                    : strings.deleteFeature
                }
                onClick={() => {
                  if (deleteArmedFor === selectedFeature.id) {
                    onDeleteFeature?.(selectedFeature.id);
                    onSelectFeature?.(null);
                    setDeleteArmedFor(null);
                  } else {
                    setDeleteArmedFor(selectedFeature.id);
                  }
                }}
              >
                <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {deleteArmedFor === selectedFeature.id
                    ? strings.confirmDeleteFeature
                    : strings.deleteFeature}
                </span>
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <label className="grid gap-1 text-[10px] font-semibold text-[#52635d]">
                <span>{strings.width}</span>
                <div className="relative">
                  <input
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={Number(((selectedFeature.width / hallWidth) * physicalWidth).toFixed(2))}
                    disabled={!onUpdateFeature}
                    dir="ltr"
                    className="h-11 w-full rounded-lg border border-[rgba(18,49,42,0.16)] bg-[#fbfcf9] px-2 pe-6 text-xs font-semibold tabular-nums text-[#17342c] outline-none focus:border-[#b78936] focus:ring-2 focus:ring-[#b78936]/20 disabled:opacity-50"
                    onChange={(event) => {
                      const metricValue = Number(event.target.value);
                      if (!Number.isFinite(metricValue) || metricValue <= 0) return;
                      updateSelectedFeatureGeometry({
                        width: physicalWidth > 0 ? (metricValue / physicalWidth) * hallWidth : metricValue,
                      });
                    }}
                    onBlur={commitSelectedFeatureGeometry}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                  />
                  <span className="pointer-events-none absolute end-1.5 top-1/2 -translate-y-1/2 text-[9px] text-[#78857f]">
                    {unit}
                  </span>
                </div>
              </label>
              <label className="grid gap-1 text-[10px] font-semibold text-[#52635d]">
                <span>{strings.height}</span>
                <div className="relative">
                  <input
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={Number(((selectedFeature.height / hallHeight) * physicalHeight).toFixed(2))}
                    disabled={!onUpdateFeature}
                    dir="ltr"
                    className="h-11 w-full rounded-lg border border-[rgba(18,49,42,0.16)] bg-[#fbfcf9] px-2 pe-6 text-xs font-semibold tabular-nums text-[#17342c] outline-none focus:border-[#b78936] focus:ring-2 focus:ring-[#b78936]/20 disabled:opacity-50"
                    onChange={(event) => {
                      const metricValue = Number(event.target.value);
                      if (!Number.isFinite(metricValue) || metricValue <= 0) return;
                      updateSelectedFeatureGeometry({
                        height: physicalHeight > 0 ? (metricValue / physicalHeight) * hallHeight : metricValue,
                      });
                    }}
                    onBlur={commitSelectedFeatureGeometry}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                  />
                  <span className="pointer-events-none absolute end-1.5 top-1/2 -translate-y-1/2 text-[9px] text-[#78857f]">
                    {unit}
                  </span>
                </div>
              </label>
              <label className="grid gap-1 text-[10px] font-semibold text-[#52635d]">
                <span>{strings.rotation}</span>
                <div className="relative">
                  <input
                    type="number"
                    min="-360"
                    max="360"
                    step="5"
                    value={selectedFeature.rotation ?? 0}
                    disabled={!onUpdateFeature}
                    dir="ltr"
                    className="h-11 w-full rounded-lg border border-[rgba(18,49,42,0.16)] bg-[#fbfcf9] px-2 pe-5 text-xs font-semibold tabular-nums text-[#17342c] outline-none focus:border-[#b78936] focus:ring-2 focus:ring-[#b78936]/20 disabled:opacity-50"
                    onChange={(event) => {
                      const rotation = Number(event.target.value);
                      if (Number.isFinite(rotation)) updateSelectedFeatureGeometry({ rotation });
                    }}
                    onBlur={commitSelectedFeatureGeometry}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                  />
                  <span className="pointer-events-none absolute end-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[#78857f]">
                    °
                  </span>
                </div>
              </label>
            </div>
          </div>
        ) : null}

        <div
          className={`${styles.mapSheet} ${editMode ? "cursor-default" : ""}`}
          style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` }}
        >
          <svg
            ref={svgRef}
            viewBox={`${-padding} ${-padding} ${hallWidth + padding * 2} ${hallHeight + padding * 2}`}
            role="img"
            aria-labelledby={`hall-svg-title-${reactId} hall-svg-description-${reactId}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <title id={`hall-svg-title-${reactId}`}>{mapTitle}</title>
            <desc id={`hall-svg-description-${reactId}`}>
              {strings.canvas}. {hall.booths.length} booths. {editMode ? strings.editHint : strings.viewHint}
            </desc>

            <defs>
              <pattern id={gridId} width={gridWidth} height={gridHeight} patternUnits="userSpaceOnUse">
                <path
                  d={`M ${gridWidth} 0 L 0 0 0 ${gridHeight}`}
                  fill="none"
                  stroke="#234b40"
                  strokeOpacity="0.08"
                  strokeWidth={strokeUnit * 0.28}
                />
              </pattern>
              <pattern id={majorGridId} width={majorGridWidth} height={majorGridHeight} patternUnits="userSpaceOnUse">
                <rect width={majorGridWidth} height={majorGridHeight} fill={`url(#${gridId})`} />
                <path
                  d={`M ${majorGridWidth} 0 L 0 0 0 ${majorGridHeight}`}
                  fill="none"
                  stroke="#173f34"
                  strokeOpacity="0.15"
                  strokeWidth={strokeUnit * 0.48}
                />
              </pattern>
              <clipPath id={clipId}>
                <rect x="0" y="0" width={hallWidth} height={hallHeight} rx={strokeUnit * 2} />
              </clipPath>
            </defs>

            <g pointerEvents="none" aria-hidden="true">
              <rect
                x={0}
                y={-rulerThickness}
                width={hallWidth}
                height={rulerThickness}
                rx={strokeUnit * 1.2}
                fill="#f5f6f2"
                stroke="#a9b4ae"
                strokeWidth={strokeUnit * 0.55}
              />
              <rect
                x={-rulerThickness}
                y={0}
                width={rulerThickness}
                height={hallHeight}
                rx={strokeUnit * 1.2}
                fill="#f5f6f2"
                stroke="#a9b4ae"
                strokeWidth={strokeUnit * 0.55}
              />
              <rect
                x={-rulerThickness}
                y={-rulerThickness}
                width={rulerThickness}
                height={rulerThickness}
                rx={strokeUnit * 1.4}
                fill="#17342c"
              />
              <text
                x={-rulerThickness / 2}
                y={-rulerThickness / 2}
                dominantBaseline="middle"
                textAnchor="middle"
                fill="#fffdf7"
                fontSize={rulerFontSize}
                fontWeight="800"
              >
                {unit}
              </text>

              {horizontalRulerTicks.map((tick) => {
                const x = physicalWidth > 0 ? (tick.value / physicalWidth) * hallWidth : 0;
                const isStart = tick.value === 0;
                const isEnd = Math.abs(tick.value - physicalWidth) < 1e-7;
                return (
                  <g key={`ruler-x-${tick.value}`}>
                    <line
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={-rulerThickness * (tick.major ? 0.44 : 0.23)}
                      stroke={tick.major ? "#38564d" : "#87958f"}
                      strokeWidth={strokeUnit * (tick.major ? 0.62 : 0.38)}
                    />
                    {tick.major ? (
                      <text
                        x={x + (isStart ? strokeUnit * 1.8 : isEnd ? -strokeUnit * 1.8 : 0)}
                        y={-rulerThickness * 0.63}
                        dominantBaseline="middle"
                        textAnchor={isStart ? "start" : isEnd ? "end" : "middle"}
                        fill="#43564f"
                        fontSize={rulerFontSize}
                        fontWeight="700"
                      >
                        {formatMetric(tick.value, locale)}
                      </text>
                    ) : null}
                  </g>
                );
              })}

              {verticalRulerTicks.map((tick) => {
                const y = physicalHeight > 0 ? (tick.value / physicalHeight) * hallHeight : 0;
                return (
                  <g key={`ruler-y-${tick.value}`}>
                    <line
                      x1={0}
                      y1={y}
                      x2={-rulerThickness * (tick.major ? 0.44 : 0.23)}
                      y2={y}
                      stroke={tick.major ? "#38564d" : "#87958f"}
                      strokeWidth={strokeUnit * (tick.major ? 0.62 : 0.38)}
                    />
                    {tick.major && tick.value > 0 ? (
                      <text
                        x={-rulerThickness * 0.65}
                        y={y}
                        dominantBaseline="middle"
                        textAnchor="middle"
                        fill="#43564f"
                        fontSize={rulerFontSize}
                        fontWeight="700"
                        transform={`rotate(-90 ${-rulerThickness * 0.65} ${y})`}
                      >
                        {formatMetric(tick.value, locale)}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </g>

            <rect
              x={0}
              y={0}
              width={hallWidth}
              height={hallHeight}
              rx={strokeUnit * 2}
              fill="#f8faf6"
              stroke="#153b31"
              strokeWidth={strokeUnit * 1.6}
            />

            <g clipPath={`url(#${clipId})`}>
              {backgroundImage && layerVisibility.background ? (
                <image
                  href={backgroundImage}
                  x={0}
                  y={0}
                  width={hallWidth}
                  height={hallHeight}
                  preserveAspectRatio="xMidYMid meet"
                  opacity={0.34}
                  pointerEvents="none"
                  aria-hidden="true"
                />
              ) : null}

              {gridVisible ? (
                <rect x={0} y={0} width={hallWidth} height={hallHeight} fill={`url(#${majorGridId})`} pointerEvents="none" />
              ) : null}

              {layerVisibility.features
                ? hall.features
                    .filter((feature) => isZoneFeature(feature.kind))
                    .map((feature, index) => {
                      const visual = featureStyle(feature.kind);
                      const selected = selectedFeatureId === feature.id;
                      const resizeGeometry =
                        resizePreview?.target === "feature" && resizePreview.itemId === feature.id
                          ? resizePreview.geometry
                          : null;
                      const x = resizeGeometry?.x ?? (featureDragPreview?.featureId === feature.id ? featureDragPreview.x : feature.x);
                      const y = resizeGeometry?.y ?? (featureDragPreview?.featureId === feature.id ? featureDragPreview.y : feature.y);
                      const featureWidth = resizeGeometry?.width ?? feature.width;
                      const featureHeight = resizeGeometry?.height ?? feature.height;
                      const featureRotation = resizeGeometry?.rotation ?? feature.rotation ?? 0;
                      const centerX = x + featureWidth / 2;
                      const centerY = y + featureHeight / 2;
                      const label = localize(feature.label, locale, feature.kind);
                      return (
                        <g
                          key={feature.id || `${feature.kind}-${feature.x}-${feature.y}-${index}`}
                          transform={`rotate(${featureRotation} ${centerX} ${centerY})`}
                          className={editMode ? `${styles.booth} ${selected ? styles.boothSelected : ""}` : undefined}
                          role={editMode ? "button" : undefined}
                          tabIndex={editMode ? 0 : -1}
                          aria-label={
                            editMode
                              ? `${featureKindLabel(feature.kind, locale)}: ${label}, ${strings.width} ${formatMetric(
                                  (featureWidth / hallWidth) * physicalWidth,
                                  locale,
                                )} ${unit}, ${strings.height} ${formatMetric(
                                  (featureHeight / hallHeight) * physicalHeight,
                                  locale,
                                )} ${unit}`
                              : undefined
                          }
                          aria-pressed={editMode ? selected : undefined}
                          data-feature-id={feature.id}
                          pointerEvents={editMode ? "all" : "none"}
                          onClick={() => {
                            if (editMode && tool !== "pan") onSelectFeature?.(feature.id);
                          }}
                          onKeyDown={(event) => handleFeatureKeyDown(event, feature)}
                          onPointerDown={(event) => handleFeaturePointerDown(event, feature)}
                          style={{ cursor: editMode && tool === "select" ? "move" : tool === "pan" ? "grab" : "default" }}
                        >
                          <rect
                            x={x}
                            y={y}
                            width={featureWidth}
                            height={featureHeight}
                            rx={strokeUnit * 1.5}
                            fill={visual.fill}
                            stroke={selected ? "#9a6e20" : visual.stroke}
                            strokeWidth={selected ? strokeUnit * 1.8 : strokeUnit * 0.75}
                            strokeDasharray={visual.dash}
                          />
                          {layerVisibility.labels ? (
                            <text
                              x={centerX}
                              y={centerY}
                              dominantBaseline="middle"
                              textAnchor="middle"
                              fill={visual.text}
                              fontSize={clamp(Math.min(featureWidth, featureHeight) * 0.15, strokeUnit * 3.8, strokeUnit * 8)}
                              fontWeight="650"
                            >
                              {label}
                            </text>
                          ) : null}
                          {selected && editMode ? (
                            <>
                              <DimensionBadge
                                x={x}
                                y={y}
                                width={featureWidth}
                                height={featureHeight}
                                rotation={featureRotation}
                                hallWidth={hallWidth}
                                hallHeight={hallHeight}
                                physicalWidth={physicalWidth}
                                physicalHeight={physicalHeight}
                                unit={unit}
                                locale={locale}
                                size={strokeUnit}
                              />
                              <ResizeHandles
                                x={x}
                                y={y}
                                width={featureWidth}
                                height={featureHeight}
                                size={strokeUnit * 1.9}
                                locale={locale}
                                subject={label}
                                onPointerDown={(event, handle) => beginResize(event, "feature", feature, handle)}
                                onKeyDown={(event, handle) =>
                                  handleResizeHandleKeyDown(event, "feature", feature, handle)
                                }
                              />
                            </>
                          ) : null}
                        </g>
                      );
                    })
                : null}

              {boothViews.map(({ booth, summary, matches, palette }) => {
                const selected = selectedBoothId === booth.id;
                const resizeGeometry =
                  resizePreview?.target === "booth" && resizePreview.itemId === booth.id
                    ? resizePreview.geometry
                    : null;
                const x = resizeGeometry?.x ?? (dragPreview?.boothId === booth.id ? dragPreview.x : booth.x);
                const y = resizeGeometry?.y ?? (dragPreview?.boothId === booth.id ? dragPreview.y : booth.y);
                const boothWidth = Math.max(
                  strokeUnit * 6,
                  finiteNumber(resizeGeometry?.width ?? booth.width, strokeUnit * 6),
                );
                const boothHeight = Math.max(
                  strokeUnit * 6,
                  finiteNumber(resizeGeometry?.height ?? booth.height, strokeUnit * 6),
                );
                const labelSize = clamp(Math.min(boothWidth * 0.18, boothHeight * 0.25), strokeUnit * 3, strokeUnit * 8);
                const secondarySize = clamp(labelSize * 0.62, strokeUnit * 2.3, strokeUnit * 4.8);
                const progress =
                  overlay === "delivery"
                    ? summary.requested > 0
                      ? clamp(summary.delivered / summary.requested, 0, 1)
                      : 0
                    : overlay === "pickup"
                      ? summary.delivered > 0
                        ? clamp(summary.pickedUp / summary.delivered, 0, 1)
                        : 0
                      : 0;
                const company = localize(booth.company, locale, strings.noCompany);
                const operationalText = overlayText(booth, overlay, summary, locale);
                const accessibleLabel = [
                  `Booth ${booth.code}`,
                  company,
                  statusLabel(booth.status, locale),
                  operationalText,
                  `${formatMetric((boothWidth / hallWidth) * physicalWidth, locale)} × ${formatMetric(
                    (boothHeight / hallHeight) * physicalHeight,
                    locale,
                  )} ${unit}`,
                ]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <g
                    key={booth.id}
                    className={`${styles.booth} ${selected ? styles.boothSelected : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-label={accessibleLabel}
                    aria-pressed={selected}
                    data-booth-id={booth.id}
                    opacity={matches || selected ? 1 : 0.2}
                    onClick={() => {
                      if (tool !== "pan") onSelectBooth?.(booth.id);
                    }}
                    onKeyDown={(event) => handleBoothKeyDown(event, booth)}
                    onPointerDown={(event) => handleBoothPointerDown(event, booth)}
                    style={{ cursor: editMode && tool === "select" ? "move" : tool === "pan" ? "grab" : "pointer" }}
                  >
                    <rect
                      x={x}
                      y={y}
                      width={boothWidth}
                      height={boothHeight}
                      rx={strokeUnit * 1.35}
                      fill={palette.fill}
                      stroke={selected ? "#9a6e20" : palette.stroke}
                      strokeWidth={selected ? strokeUnit * 1.85 : strokeUnit * 0.9}
                    />
                    {overlay === "delivery" || overlay === "pickup" ? (
                      <rect
                        x={x}
                        y={y + boothHeight - strokeUnit * 2.2}
                        width={boothWidth * progress}
                        height={strokeUnit * 2.2}
                        rx={strokeUnit}
                        fill={palette.accent}
                        opacity={0.86}
                        pointerEvents="none"
                      />
                    ) : null}
                    {overlay === "issues" && summary.issues > 0 ? (
                      <g pointerEvents="none">
                        <circle
                          cx={x + boothWidth - strokeUnit * 2.5}
                          cy={y + strokeUnit * 2.5}
                          r={strokeUnit * 2.2}
                          fill="#bf443d"
                        />
                        <text
                          x={x + boothWidth - strokeUnit * 2.5}
                          y={y + strokeUnit * 2.55}
                          dominantBaseline="middle"
                          textAnchor="middle"
                          fill="#fff"
                          fontSize={strokeUnit * 2.7}
                          fontWeight="800"
                        >
                          {summary.issues}
                        </text>
                      </g>
                    ) : null}
                    {layerVisibility.labels ? (
                      <g pointerEvents="none" fill={palette.text} textAnchor="middle">
                        <text
                          x={x + boothWidth / 2}
                          y={y + boothHeight * 0.43}
                          dominantBaseline="middle"
                          fontSize={labelSize}
                          fontWeight="800"
                          direction="ltr"
                        >
                          {booth.code}
                        </text>
                        {boothHeight >= labelSize * 2.6 ? (
                          <text
                            x={x + boothWidth / 2}
                            y={y + boothHeight * 0.68}
                            dominantBaseline="middle"
                            fontSize={secondarySize}
                            fontWeight="600"
                            opacity={0.84}
                          >
                            {operationalText.length > 28 ? `${operationalText.slice(0, 27)}…` : operationalText}
                          </text>
                        ) : null}
                      </g>
                    ) : null}
                    {selected && editMode ? (
                      <>
                        <DimensionBadge
                          x={x}
                          y={y}
                          width={boothWidth}
                          height={boothHeight}
                          rotation={0}
                          hallWidth={hallWidth}
                          hallHeight={hallHeight}
                          physicalWidth={physicalWidth}
                          physicalHeight={physicalHeight}
                          unit={unit}
                          locale={locale}
                          size={strokeUnit}
                        />
                        <ResizeHandles
                          x={x}
                          y={y}
                          width={boothWidth}
                          height={boothHeight}
                          size={strokeUnit * 1.9}
                          locale={locale}
                          subject={`${locale === "fa" ? "غرفه" : "Booth"} ${booth.code}`}
                          onPointerDown={(event, handle) => beginResize(event, "booth", booth, handle)}
                          onKeyDown={(event, handle) => handleResizeHandleKeyDown(event, "booth", booth, handle)}
                        />
                      </>
                    ) : null}
                  </g>
                );
              })}

              {layerVisibility.features
                ? hall.features
                    .filter((feature) => !isZoneFeature(feature.kind))
                    .map((feature, index) => {
                      const visual = featureStyle(feature.kind);
                      const selected = selectedFeatureId === feature.id;
                      const resizeGeometry =
                        resizePreview?.target === "feature" && resizePreview.itemId === feature.id
                          ? resizePreview.geometry
                          : null;
                      const x = resizeGeometry?.x ?? (featureDragPreview?.featureId === feature.id ? featureDragPreview.x : feature.x);
                      const y = resizeGeometry?.y ?? (featureDragPreview?.featureId === feature.id ? featureDragPreview.y : feature.y);
                      const featureWidth = resizeGeometry?.width ?? feature.width;
                      const featureHeight = resizeGeometry?.height ?? feature.height;
                      const featureRotation = resizeGeometry?.rotation ?? feature.rotation ?? 0;
                      const centerX = x + featureWidth / 2;
                      const centerY = y + featureHeight / 2;
                      const kind = feature.kind.toLowerCase();
                      const isColumn = kind.includes("column") || kind.includes("pillar");
                      const isDoor = kind.includes("door") || kind.includes("entrance") || kind.includes("exit");
                      const label = localize(feature.label, locale, feature.kind);
                      return (
                        <g
                          key={feature.id || `${feature.kind}-${feature.x}-${feature.y}-${index}`}
                          transform={`rotate(${featureRotation} ${centerX} ${centerY})`}
                          className={editMode ? `${styles.booth} ${selected ? styles.boothSelected : ""}` : undefined}
                          role={editMode ? "button" : undefined}
                          tabIndex={editMode ? 0 : -1}
                          aria-label={
                            editMode
                              ? `${featureKindLabel(feature.kind, locale)}: ${label}, ${strings.width} ${formatMetric(
                                  (featureWidth / hallWidth) * physicalWidth,
                                  locale,
                                )} ${unit}, ${strings.height} ${formatMetric(
                                  (featureHeight / hallHeight) * physicalHeight,
                                  locale,
                                )} ${unit}`
                              : undefined
                          }
                          aria-pressed={editMode ? selected : undefined}
                          data-feature-id={feature.id}
                          pointerEvents={editMode ? "all" : "none"}
                          onClick={() => {
                            if (editMode && tool !== "pan") onSelectFeature?.(feature.id);
                          }}
                          onKeyDown={(event) => handleFeatureKeyDown(event, feature)}
                          onPointerDown={(event) => handleFeaturePointerDown(event, feature)}
                          style={{ cursor: editMode && tool === "select" ? "move" : tool === "pan" ? "grab" : "default" }}
                        >
                          {isColumn ? (
                            <>
                              <rect
                                x={x}
                                y={y}
                                width={featureWidth}
                                height={featureHeight}
                                rx={strokeUnit * 0.8}
                                fill={visual.fill}
                                stroke={selected ? "#9a6e20" : visual.stroke}
                                strokeWidth={selected ? strokeUnit * 1.8 : strokeUnit}
                              />
                              <path
                                d={`M ${x} ${y} L ${x + featureWidth} ${y + featureHeight} M ${x + featureWidth} ${y} L ${x} ${y + featureHeight}`}
                                stroke="rgba(255,255,255,0.38)"
                                strokeWidth={strokeUnit * 0.55}
                              />
                            </>
                          ) : isDoor ? (
                            <>
                              <rect
                                x={x}
                                y={y}
                                width={featureWidth}
                                height={featureHeight}
                                rx={strokeUnit * 0.6}
                                fill={visual.fill}
                                stroke={selected ? "#9a6e20" : visual.stroke}
                                strokeWidth={selected ? strokeUnit * 1.8 : strokeUnit}
                              />
                              <path
                                d={`M ${x} ${y + featureHeight} Q ${x + featureWidth * 0.15} ${y + featureHeight * 0.15} ${x + featureWidth} ${y}`}
                                fill="none"
                                stroke={selected ? "#9a6e20" : visual.stroke}
                                strokeDasharray={`${strokeUnit * 2} ${strokeUnit}`}
                                strokeWidth={strokeUnit * 0.75}
                              />
                            </>
                          ) : (
                            <rect
                              x={x}
                              y={y}
                              width={featureWidth}
                              height={featureHeight}
                              rx={strokeUnit}
                              fill={visual.fill}
                              stroke={selected ? "#9a6e20" : visual.stroke}
                              strokeDasharray={visual.dash}
                              strokeWidth={selected ? strokeUnit * 1.8 : strokeUnit * 0.85}
                            />
                          )}
                          {layerVisibility.labels && Math.min(featureWidth, featureHeight) > strokeUnit * 8 ? (
                            <text
                              x={centerX}
                              y={centerY}
                              dominantBaseline="middle"
                              textAnchor="middle"
                              fill={isColumn ? "#fff" : visual.text}
                              fontSize={clamp(Math.min(featureWidth, featureHeight) * 0.18, strokeUnit * 2.4, strokeUnit * 5.5)}
                              fontWeight="700"
                            >
                              {label}
                            </text>
                          ) : null}
                          {selected && editMode ? (
                            <>
                              <DimensionBadge
                                x={x}
                                y={y}
                                width={featureWidth}
                                height={featureHeight}
                                rotation={featureRotation}
                                hallWidth={hallWidth}
                                hallHeight={hallHeight}
                                physicalWidth={physicalWidth}
                                physicalHeight={physicalHeight}
                                unit={unit}
                                locale={locale}
                                size={strokeUnit}
                              />
                              <ResizeHandles
                                x={x}
                                y={y}
                                width={featureWidth}
                                height={featureHeight}
                                size={strokeUnit * 1.9}
                                locale={locale}
                                subject={label}
                                onPointerDown={(event, handle) => beginResize(event, "feature", feature, handle)}
                                onKeyDown={(event, handle) =>
                                  handleResizeHandleKeyDown(event, "feature", feature, handle)
                                }
                              />
                            </>
                          ) : null}
                        </g>
                      );
                    })
                : null}
            </g>

            {editMode && selectedFeature && rotationHandleGeometry && selectedFeatureDisplayGeometry ? (
              <RotationHandle
                stem={rotationHandleGeometry.stem}
                handle={rotationHandleGeometry.handle}
                rotation={selectedFeatureDisplayGeometry.rotation}
                size={strokeUnit * 1.9}
                locale={locale}
                subject={localize(
                  selectedFeature.label,
                  locale,
                  featureKindLabel(selectedFeature.kind, locale),
                )}
                onPointerDown={(event) => beginRotation(event, selectedFeature)}
                onKeyDown={(event) => handleRotationHandleKeyDown(event, selectedFeature)}
              />
            ) : null}

          </svg>
        </div>

        <div
          className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex items-end justify-between gap-3"
          aria-hidden="true"
        >
          <div className="max-w-[min(34rem,72%)] rounded-lg border border-[rgba(18,49,42,0.12)] bg-white/86 px-3 py-2 text-[11px] leading-4 text-[#65726d] shadow-sm backdrop-blur-md">
            {editMode ? strings.editHint : strings.viewHint}
          </div>
          <div className="rounded-lg border border-[rgba(18,49,42,0.12)] bg-white/86 px-2.5 py-1.5 text-[10px] font-semibold tabular-nums text-[#43534d] shadow-sm backdrop-blur-md">
            {formatMetric(physicalWidth, locale)} × {formatMetric(physicalHeight, locale)} {unit}
          </div>
        </div>
      </div>
    </section>
  );
}
