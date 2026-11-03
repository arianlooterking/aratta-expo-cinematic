"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  Boxes,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDollarSign,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  CloudOff,
  Command,
  Download,
  FileJson,
  FileSpreadsheet,
  Filter,
  HardDrive,
  Handshake,
  History,
  ImageUp,
  Languages,
  Layers3,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  Map,
  Menu,
  Moon,
  PackageCheck,
  PackageOpen,
  PenTool,
  Plus,
  RotateCcw,
  Save,
  Search,
  ScanLine,
  Settings2,
  Sun,
  Truck,
  Upload,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import type { ComponentType, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminPanel } from "@/components/AdminPanel";
import {
  equipmentCatalog,
  portalSeedState as initialPortalState,
} from "@/data/staff-portal";
import { staffInventorySeed } from "@/data/staff-inventory";
import {
  clonePortalState,
  calculateBoothAreaFromGeometry,
  calculateGeometryFromMetricDimensions,
  calculateMetricDimensionsFromGeometry,
  detachTasksFromMissingBooths,
  exportPublicSafeHall as makePublicHallExport,
  findHallContainingBooth,
  formatIstanbulDateTime as formatPortalDate,
  getNextEquipmentLineStage,
  getActiveExhibition,
  getExhibitionHalls,
  importBoothsFromCsv as parseBoothCsv,
  prependAuditEvent,
  upgradePortalSnapshot,
  validatePortalSnapshot,
  type AuditEvent,
  type Booth,
  type BoothStatus,
  type EquipmentStage,
  type Exhibition,
  type Hall,
  type HallFeature,
  type HallFeatureKind,
  type PortalLocale,
  type PortalState,
  type PortalTask,
} from "@/lib/staff-portal";
import {
  deriveInventoryTotals,
  inventoryItemsToCatalog,
  makeInventorySlug,
  parseInventoryDelimitedText,
  parseInventoryRows,
  upsertInventoryItems,
  validateInventoryItems,
  type InventoryItem,
} from "@/lib/staff-inventory";
import {
  BoothInspector,
  type BoothDimensions,
  type EquipmentLinePatch,
} from "./BoothInspector";
import {
  HallCanvas,
  type BoothGeometryPatch,
  type HallCanvasLayers,
  type HallFeaturePatch,
  type HallOverlayMode,
} from "./HallCanvas";
import {
  InventoryWorkspace,
  type InventoryWorkspaceProps,
  type NewInventoryMaterial,
} from "./InventoryWorkspace";
import {
  ExhibitionWorkspace,
  type NewExhibitionDraft,
} from "./ExhibitionWorkspace";
import {
  AssistantWorkspace,
  FinanceWorkspace,
  type NewAccountDraft,
  type NewCommunicationDraft,
  type NewPaymentDraft,
} from "./CommercialWorkspace";
import {
  calculateCommercialAccount,
  type LeadInteraction,
  type SalesLead,
} from "@/lib/staff-commercial";
import {
  CrmWorkspace,
  type CompanyPatch,
  type LeadPatch,
  type NewCrmLeadDraft,
} from "./CrmWorkspace";
import {
  StaffWorkspace,
  type NewStaffDraft,
  type StaffPatch,
} from "./StaffWorkspace";
import {
  applyPlanReconstruction,
  normalizeVisionPlan,
  parsePlanRows,
  validateApplicablePlan,
  type PlanApplyMode,
} from "@/lib/staff-plan-import";
import styles from "./StaffPortal.module.css";

type PortalView =
  | "exhibitions"
  | "assistant"
  | "crm"
  | "team"
  | "payments"
  | "content"
  | "overview"
  | "floorplan"
  | "logistics"
  | "tasks"
  | "exhibitors"
  | "activity";

type StorageStatus = "preparing" | "active" | "error";

type Notice = {
  tone: "success" | "warning" | "error";
  title: string;
  body?: string;
};

type ConfirmRequest = {
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  action: () => void;
};

type ImportPreview =
  | {
      kind: "snapshot";
      fileName: string;
      state: PortalState;
      inventoryItems?: InventoryItem[];
      booths: number;
      halls: number;
    }
  | {
      kind: "csv";
      fileName: string;
      booths: Booth[];
      warnings: string[];
    }
  | {
      kind: "plan";
      fileName: string;
      hallId: string;
      hallName: string;
      hallWidth: number;
      hallHeight: number;
      physicalWidth: number;
      physicalHeight: number;
      booths: Booth[];
      features: HallFeature[];
      warnings: string[];
      confidence?: number;
      sourceSummary?: string;
      sourceImageDataUrl?: string;
      keepSourceAsReference: boolean;
      applyMode: PlanApplyMode;
    };

type PortalCopy = {
  operations: string;
  workspace: string;
  archivedTemplate: string;
  localMode: string;
  localModeBody: string;
  noBackend: string;
  search: string;
  exhibitions: string;
  assistant: string;
  crm: string;
  team: string;
  payments: string;
  contentStudio: string;
  activeExhibition: string;
  overview: string;
  floorplan: string;
  logistics: string;
  tasks: string;
  exhibitors: string;
  activity: string;
  workflow: string;
  fieldTools: string;
  commandCenter: string;
  commandBody: string;
  floorplanTitle: string;
  floorplanBody: string;
  logisticsTitle: string;
  logisticsBody: string;
  tasksTitle: string;
  tasksBody: string;
  exhibitorsTitle: string;
  exhibitorsBody: string;
  activityTitle: string;
  activityBody: string;
  save: string;
  saved: string;
  saving: string;
  export: string;
  import: string;
  editor: string;
  layers: string;
  allocation: string;
  delivery: string;
  pickup: string;
  issues: string;
  allStatuses: string;
  activeHall: string;
  booths: string;
  ready: string;
  delivered: string;
  openTasks: string;
  attention: string;
  occupancy: string;
  operationalReadiness: string;
  priorityQueue: string;
  recentMovement: string;
  openFloorplan: string;
  viewLogistics: string;
  noResults: string;
  noResultsBody: string;
  addBooth: string;
  addColumn: string;
  addDoor: string;
  addZone: string;
  referenceImage: string;
  importData: string;
  reconstructPlan: string;
  exportData: string;
  publicPlan: string;
  resetWorkspace: string;
  map: string;
  list: string;
  blankHall: string;
  assigned: string;
  unassigned: string;
  requirement: string;
  quantity: string;
  stage: string;
  booth: string;
  owner: string;
  nextAction: string;
  complete: string;
  advance: string;
  addTask: string;
  taskTitle: string;
  taskOwner: string;
  createTask: string;
  auditNote: string;
  currentSession: string;
  close: string;
  cancel: string;
  confirm: string;
  reviewImport: string;
  replaceDataWarning: string;
  rasterOnly: string;
  mobileFieldMode: string;
};

const copyByLocale: Record<PortalLocale, PortalCopy> = {
  fa: {
    operations: "مرکز عملیات نمایشگاهی",
    workspace: "پورتال کارکنان اَرَتَ",
    archivedTemplate: "الگوی عملیاتی آرشیوی",
    localMode: "فضای کاری محلی",
    localModeBody: "تغییرات در همین مرورگر ذخیره می‌شوند و به سامانه دیگری ارسال نمی‌شوند.",
    noBackend: "همگام سازی چندکاربره متصل نیست",
    search: "جستجوی غرفه، شرکت، تجهیز یا وضعیت",
    exhibitions: "نمایشگاه‌ها",
    assistant: "دستیار هوشمند",
    crm: "CRM و سرنخ‌ها",
    team: "کاربران و ساختار تیم",
    payments: "پرداخت و تحویل",
    contentStudio: "محتوای وب‌سایت",
    activeExhibition: "نمایشگاه فعال",
    overview: "نمای کلی",
    floorplan: "نقشه سالن",
    logistics: "تجهیزات و لجستیک",
    tasks: "برنامه اجرا",
    exhibitors: "غرفه داران",
    activity: "تاریخچه تغییرات",
    workflow: "عملیات نمایشگاه",
    fieldTools: "ابزارهای میدانی",
    commandCenter: "امروز چه چیزی نیاز به اقدام دارد؟",
    commandBody: "آمادگی سالن، تحویل تجهیزات و کارهای باز را از یک نمای عملیاتی کنترل کنید.",
    floorplanTitle: "فضای طراحی و اجرای سالن",
    floorplanBody: "غرفه ها، ستون ها، درها و نواحی خدماتی را روی نقشه زنده مدیریت کنید.",
    logisticsTitle: "صف تحویل و جمع آوری",
    logisticsBody: "وضعیت همه اقلام غرفه ها را از درخواست تا تحویل و جمع آوری پیگیری کنید.",
    tasksTitle: "برنامه اجرایی تیم",
    tasksBody: "کارهای سالن را به مسئول مشخص متصل و تا پایان پیگیری کنید.",
    exhibitorsTitle: "فهرست عملیاتی غرفه داران",
    exhibitorsBody: "هر شرکت را همراه با غرفه، مساحت، آمادگی و نیازهای اجرایی ببینید.",
    activityTitle: "دفتر تغییرات عملیاتی",
    activityBody: "تغییرات مهم عملیاتی این نمونه محلی با زمان و مسئول ثبت می‌شوند.",
    save: "ذخیره اکنون",
    saved: "ذخیره شد",
    saving: "در حال ذخیره",
    export: "خروجی",
    import: "ورود اطلاعات",
    editor: "ویرایش نقشه",
    layers: "لایه ها",
    allocation: "تخصیص",
    delivery: "تحویل",
    pickup: "جمع آوری",
    issues: "مشکلات",
    allStatuses: "همه وضعیت ها",
    activeHall: "سالن فعال",
    booths: "غرفه",
    ready: "آماده",
    delivered: "تحویل کامل",
    openTasks: "کار باز",
    attention: "نیازمند توجه",
    occupancy: "نرخ تخصیص سالن",
    operationalReadiness: "آمادگی عملیاتی",
    priorityQueue: "صف اقدام های مهم",
    recentMovement: "آخرین تغییرات",
    openFloorplan: "باز کردن نقشه",
    viewLogistics: "مشاهده لجستیک",
    noResults: "موردی پیدا نشد",
    noResultsBody: "عبارت جستجو یا فیلتر وضعیت را تغییر دهید.",
    addBooth: "افزودن غرفه",
    addColumn: "افزودن ستون",
    addDoor: "افزودن در",
    addZone: "افزودن ناحیه",
    referenceImage: "پس زمینه مرجع (فقط)",
    importData: "ورود JSON / CSV",
    reconstructPlan: "بازسازی از Excel، PDF یا تصویر",
    exportData: "خروجی کامل",
    publicPlan: "نقشه عمومی امن",
    resetWorkspace: "بازگردانی الگو",
    map: "نقشه",
    list: "فهرست",
    blankHall: "سالن خالی",
    assigned: "تخصیص یافته",
    unassigned: "بدون شرکت",
    requirement: "نیاز تجهیزاتی",
    quantity: "تعداد",
    stage: "مرحله",
    booth: "غرفه",
    owner: "مسئول",
    nextAction: "اقدام بعدی",
    complete: "تکمیل",
    advance: "مرحله بعد",
    addTask: "افزودن کار",
    taskTitle: "عنوان کار",
    taskOwner: "مسئول اجرا",
    createTask: "ساخت کار",
    auditNote: "تاریخچه این نسخه فقط در همین مرورگر نگهداری می‌شود.",
    currentSession: "اپراتور نمونه / مدیر عملیات",
    close: "بستن",
    cancel: "انصراف",
    confirm: "تایید",
    reviewImport: "بررسی ورود اطلاعات",
    replaceDataWarning: "پس از تایید، داده های فعلی این فضای محلی جایگزین می‌شوند.",
    rasterOnly: "برای امنیت، تصویر مرجع PNG، JPG یا WebP و حداکثر ۸ مگابایت باشد.",
    mobileFieldMode: "حالت میدانی موبایل",
  },
  en: {
    operations: "Exhibition operations center",
    workspace: "Aratta staff portal",
    archivedTemplate: "Archived operations template",
    localMode: "Local workspace",
    localModeBody: "Changes are stored in this browser and are not sent to another system.",
    noBackend: "Multi-user sync is not connected",
    search: "Search booth, company, equipment, or status",
    exhibitions: "Exhibitions",
    assistant: "Smart assistant",
    crm: "CRM & leads",
    team: "Staff & hierarchy",
    payments: "Payments & handover",
    contentStudio: "Website content",
    activeExhibition: "Active exhibition",
    overview: "Overview",
    floorplan: "Hall plan",
    logistics: "Equipment & logistics",
    tasks: "Run of show",
    exhibitors: "Exhibitors",
    activity: "Change history",
    workflow: "Exhibition operations",
    fieldTools: "Field tools",
    commandCenter: "What needs action today?",
    commandBody: "Control hall readiness, equipment delivery, and open work from one operational view.",
    floorplanTitle: "Hall planning and execution workspace",
    floorplanBody: "Manage booths, columns, doors, and service zones on a live operational plan.",
    logisticsTitle: "Delivery and pickup queue",
    logisticsBody: "Track every booth requirement from request through delivery and collection.",
    tasksTitle: "Team run of show",
    tasksBody: "Connect hall tasks to a clear owner and follow them through completion.",
    exhibitorsTitle: "Operational exhibitor directory",
    exhibitorsBody: "See each company with its booth, area, readiness, and execution requirements.",
    activityTitle: "Operations change ledger",
    activityBody: "Important operational changes are recorded with an actor and timestamp.",
    save: "Save now",
    saved: "Saved",
    saving: "Saving",
    export: "Export",
    import: "Import",
    editor: "Map editor",
    layers: "Layers",
    allocation: "Allocation",
    delivery: "Delivery",
    pickup: "Pickup",
    issues: "Issues",
    allStatuses: "All statuses",
    activeHall: "Active hall",
    booths: "booths",
    ready: "Ready",
    delivered: "Fully delivered",
    openTasks: "Open tasks",
    attention: "Needs attention",
    occupancy: "Hall allocation",
    operationalReadiness: "Operational readiness",
    priorityQueue: "Priority action queue",
    recentMovement: "Recent movement",
    openFloorplan: "Open floor plan",
    viewLogistics: "View logistics",
    noResults: "Nothing matched",
    noResultsBody: "Change the search term or status filter.",
    addBooth: "Add booth",
    addColumn: "Add column",
    addDoor: "Add door",
    addZone: "Add zone",
    referenceImage: "Reference underlay only",
    importData: "Import JSON / CSV",
    reconstructPlan: "Reconstruct from Excel, PDF, or image",
    exportData: "Export full data",
    publicPlan: "Public-safe plan",
    resetWorkspace: "Restore template",
    map: "Map",
    list: "List",
    blankHall: "Blank hall",
    assigned: "Assigned",
    unassigned: "Unassigned",
    requirement: "Equipment requirement",
    quantity: "Quantity",
    stage: "Stage",
    booth: "Booth",
    owner: "Owner",
    nextAction: "Next action",
    complete: "Complete",
    advance: "Advance",
    addTask: "Add task",
    taskTitle: "Task title",
    taskOwner: "Task owner",
    createTask: "Create task",
    auditNote: "This version history is stored in this browser only.",
    currentSession: "Demo operator / Operations manager",
    close: "Close",
    cancel: "Cancel",
    confirm: "Confirm",
    reviewImport: "Review import",
    replaceDataWarning: "After confirmation, the current local workspace data will be replaced.",
    rasterOnly: "For safety, use a PNG, JPG, or WebP reference up to 8 MB.",
    mobileFieldMode: "Mobile field mode",
  },
};

const boothStatuses: BoothStatus[] = [
  "available",
  "reserved",
  "confirmed",
  "paid",
  "attention",
  "blocked",
];

const hallFeatureLabels: Record<HallFeatureKind, { fa: string; en: string }> = {
  column: { fa: "ستون", en: "Column" },
  door: { fa: "درب", en: "Door" },
  zone: { fa: "ناحیه خدمات", en: "Service zone" },
  aisle: { fa: "راهرو", en: "Corridor / aisle" },
  loading: { fa: "ناحیه بارگیری", en: "Loading bay" },
  utility: { fa: "نقطه تاسیسات", en: "Utility point" },
  entrance: { fa: "ورودی", en: "Entrance" },
  wall: { fa: "دیوار", en: "Wall" },
  label: { fa: "برچسب نقشه", en: "Plan label" },
};

const hallFeatureKinds = Object.keys(hallFeatureLabels) as HallFeatureKind[];

const equipmentStages: EquipmentStage[] = [
  "requested",
  "preparing",
  "staged",
  "delivered",
  "collected",
  "issue",
];

const staffMembers = [
  "Mina Karimi",
  "Reza Ahmadi",
  "Sara Moradi",
  "Omid Jalali",
  "Niloofar Asadi",
];

const STORAGE_KEY = "aratta-expo-staff-operations-v1";
const INVENTORY_STORAGE_KEY = "aratta-expo-staff-inventory-v1";
const THEME_STORAGE_KEY = "aratta-expo-staff-theme-v1";
const MAX_IMPORT_FILE_BYTES = 8 * 1024 * 1024;

const viewIcons: Record<PortalView, ComponentType<{ size?: number; className?: string }>> = {
  exhibitions: CalendarDays,
  assistant: Bot,
  crm: Handshake,
  team: Users,
  payments: CircleDollarSign,
  content: PenTool,
  overview: LayoutDashboard,
  floorplan: Map,
  logistics: PackageCheck,
  tasks: ListChecks,
  exhibitors: Building2,
  activity: History,
};

const statusLabels: Record<BoothStatus, { fa: string; en: string }> = {
  available: { fa: "آزاد", en: "Available" },
  reserved: { fa: "رزرو", en: "Reserved" },
  confirmed: { fa: "تایید شده", en: "Confirmed" },
  paid: { fa: "تسویه شده", en: "Paid" },
  attention: { fa: "نیازمند توجه", en: "Attention" },
  blocked: { fa: "مسدود", en: "Blocked" },
};

const stageLabels: Record<EquipmentStage, { fa: string; en: string }> = {
  requested: { fa: "درخواست", en: "Requested" },
  preparing: { fa: "آماده سازی", en: "Preparing" },
  staged: { fa: "آماده تحویل", en: "Staged" },
  delivered: { fa: "تحویل شده", en: "Delivered" },
  collected: { fa: "جمع آوری شده", en: "Collected" },
  issue: { fa: "دارای مشکل", en: "Issue" },
};

const statusTone: Record<BoothStatus, string> = {
  available: "border-slate-200 bg-slate-100 text-slate-700",
  reserved: "border-amber-200 bg-amber-50 text-amber-800",
  confirmed: "border-cyan-200 bg-cyan-50 text-cyan-800",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-800",
  attention: "border-rose-200 bg-rose-50 text-rose-800",
  blocked: "border-zinc-300 bg-zinc-200 text-zinc-800",
};

const stageTone: Record<EquipmentStage, string> = {
  requested: "bg-slate-100 text-slate-700",
  preparing: "bg-amber-50 text-amber-800",
  staged: "bg-cyan-50 text-cyan-800",
  delivered: "bg-emerald-50 text-emerald-800",
  collected: "bg-indigo-50 text-indigo-800",
  issue: "bg-rose-50 text-rose-800",
};

function localize(value: { fa: string; en: string }, locale: PortalLocale) {
  return value[locale];
}

function formatCount(value: number, locale: PortalLocale) {
  return new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-GB").format(value);
}

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return prefix + "-" + crypto.randomUUID();
  }
  return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

function makeBlankHall(id: string, sequence: number): Hall {
  return {
    id,
    name: { fa: `سالن ${sequence}`, en: `Hall ${sequence}` },
    width: 960,
    height: 640,
    physicalWidth: 48,
    physicalHeight: 32,
    unit: "m",
    booths: [],
    features: [],
  };
}

const exhibitionColors = ["#b78936", "#198ba0", "#7c5cbf", "#2f7d5c", "#b85748"];

function downloadJson(fileName: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getAllBooths(state: PortalState) {
  return state.halls.flatMap((hall) => hall.booths);
}

function isBoothReady(booth: Booth) {
  const operationallyAssigned =
    Boolean(booth.company) && (booth.status === "confirmed" || booth.status === "paid");
  return (
    operationallyAssigned &&
    booth.equipment.every((line) => line.stage === "delivered" || line.stage === "collected")
  );
}

function isEquipmentLineTerminal(line: Booth["equipment"][number]) {
  return line.stage === "collected" || (!line.returnable && line.stage === "delivered");
}

function isEquipmentLineAdvanceBlocked(line: Booth["equipment"][number]) {
  return line.stage === "issue" || isEquipmentLineTerminal(line);
}

function deriveMetrics(state: PortalState) {
  const booths = getAllBooths(state);
  const lines = booths.flatMap((booth) => booth.equipment);
  const assigned = booths.filter((booth) => Boolean(booth.company)).length;
  const ready = booths.filter(isBoothReady).length;
  const delivered = lines.filter(
    (line) => line.stage === "delivered" || line.stage === "collected",
  ).length;
  const openTasks = state.tasks.filter((task) => task.status !== "done").length;
  const attention = booths.filter(
    (booth) =>
      booth.status === "attention" ||
      booth.equipment.some((line) => line.stage === "issue"),
  ).length;

  return {
    booths: booths.length,
    assigned,
    ready,
    delivered,
    lines: lines.length,
    openTasks,
    attention,
    occupancy: booths.length ? Math.round((assigned / booths.length) * 100) : 0,
    readiness: booths.length ? Math.round((ready / booths.length) * 100) : 0,
  };
}

function getValidationResult(
  value: unknown,
  catalog = equipmentCatalog,
): { valid: boolean; state?: PortalState; errors: string[] } {
  const upgradedValue = upgradePortalSnapshot(value);
  const result = validatePortalSnapshot(upgradedValue, catalog);
  if (typeof result === "boolean") {
    return {
      valid: result,
      state: result ? (upgradedValue as PortalState) : undefined,
      errors: result ? [] : ["The selected file is not a valid Aratta operations snapshot."],
    };
  }
  if (result && typeof result === "object") {
    const candidate = result as {
      valid?: boolean;
      success?: boolean;
      state?: PortalState;
      data?: PortalState;
      value?: PortalState;
      errors?: string[];
    };
    const valid = Boolean(candidate.valid ?? candidate.success);
    return {
      valid,
      state:
        candidate.state ??
        candidate.data ??
        candidate.value ??
        (valid ? (upgradedValue as PortalState) : undefined),
      errors: candidate.errors ?? [],
    };
  }
  return { valid: false, errors: ["The selected file could not be validated."] };
}

function buildLocalAudit(
  action: string,
  entityType: string,
  entityId: string,
  fa: string,
  en: string,
): AuditEvent {
  return {
    id: makeId("audit"),
    action,
    entityType,
    entityId,
    actor: "Demo operator",
    summary: { fa, en },
    timestamp: new Date().toISOString(),
  };
}

function appendAudit(state: PortalState, event: AuditEvent) {
  state.audit = prependAuditEvent(state.audit, event);
}

function cloneInventoryItems(items: readonly InventoryItem[]): InventoryItem[] {
  return items.map((item) => ({
    ...item,
    name: { ...item.name },
    unit: { ...item.unit },
  }));
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampGeometryValue(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function resolveBoothGeometry(hall: Hall, booth: Booth, patch: BoothGeometryPatch) {
  const minimumWidth = Math.min(hall.width, (hall.width / hall.physicalWidth) * 0.25);
  const minimumHeight = Math.min(hall.height, (hall.height / hall.physicalHeight) * 0.25);
  const requestedWidth = Number.isFinite(patch.width) ? Number(patch.width) : booth.width;
  const requestedHeight = Number.isFinite(patch.height) ? Number(patch.height) : booth.height;
  const width = clampGeometryValue(requestedWidth, minimumWidth, hall.width);
  const height = clampGeometryValue(requestedHeight, minimumHeight, hall.height);
  const requestedX = Number.isFinite(patch.x) ? Number(patch.x) : booth.x;
  const requestedY = Number.isFinite(patch.y) ? Number(patch.y) : booth.y;
  const x = clampGeometryValue(requestedX, 0, Math.max(0, hall.width - width));
  const y = clampGeometryValue(requestedY, 0, Math.max(0, hall.height - height));
  return {
    x,
    y,
    width,
    height,
    area: calculateBoothAreaFromGeometry(hall, width, height),
  };
}

function useModalFocus<T extends HTMLElement>(
  active: boolean,
  onClose: () => void,
  initialFocusSelector: string,
) {
  const containerRef = useRef<T>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      const container = containerRef.current;
      const preferred = container?.querySelector<HTMLElement>(initialFocusSelector);
      preferred?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      restoreFocusRef.current?.focus();
    };
  }, [active, initialFocusSelector, onClose]);

  return containerRef;
}

export function StaffPortal({ initialLocale }: { initialLocale: PortalLocale }) {
  const locale = initialLocale;
  const copy = copyByLocale[locale];
  const [state, setState] = useState<PortalState>(() => clonePortalState(initialPortalState));
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(() =>
    cloneInventoryItems(staffInventorySeed),
  );
  const [hydrated, setHydrated] = useState(false);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>("preparing");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [activeView, setActiveView] = useState<PortalView>("overview");
  const [selectedBoothId, setSelectedBoothId] = useState<string | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BoothStatus>("all");
  const [overlay, setOverlay] = useState<HallOverlayMode>("allocation");
  const [editMode, setEditMode] = useState(false);
  const [layers, setLayers] = useState<HallCanvasLayers>({
    grid: true,
    features: true,
    labels: true,
    background: true,
  });
  const [referenceImages, setReferenceImages] = useState<Record<string, string>>({});
  const [mobileMapMode, setMobileMapMode] = useState<"map" | "list">("list");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [planImportBusy, setPlanImportBusy] = useState(false);
  const [taskDraft, setTaskDraft] = useState({ title: "", owner: staffMembers[0] });
  const importInputRef = useRef<HTMLInputElement>(null);
  const planInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mobileDialogRef = useRef<HTMLDialogElement>(null);

  const activeExhibition = useMemo(() => getActiveExhibition(state), [state]);
  const activeExhibitionHalls = useMemo(() => getExhibitionHalls(state), [state]);
  const activeHall = useMemo(
    () =>
      activeExhibitionHalls.find((hall) => hall.id === state.activeHallId) ??
      activeExhibitionHalls[0],
    [activeExhibitionHalls, state.activeHallId],
  );
  const exhibitionState = useMemo(
    () => ({ ...state, halls: activeExhibitionHalls }),
    [activeExhibitionHalls, state],
  );
  const metrics = useMemo(() => deriveMetrics(exhibitionState), [exhibitionState]);
  const validationCatalog = useMemo(
    () => inventoryItemsToCatalog(inventoryItems),
    [inventoryItems],
  );
  const catalog = useMemo(
    () => inventoryItemsToCatalog(inventoryItems.filter((item) => !item.archived)),
    [inventoryItems],
  );
  const inventoryTotals = useMemo(
    () => deriveInventoryTotals(inventoryItems, state.halls),
    [inventoryItems, state.halls],
  );
  const selectedBooth = useMemo(
    () =>
      activeHall?.booths.find((booth) => booth.id === selectedBoothId) ??
      activeHall?.booths[0] ??
      null,
    [activeHall, selectedBoothId],
  );
  const activeBoothActivity = useMemo(
    () =>
      selectedBooth
        ? state.audit.filter(
            (event) =>
              event.entityId === selectedBooth.id ||
              selectedBooth.equipment.some((line) => line.id === event.entityId),
          )
        : [],
    [selectedBooth, state.audit],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
        let restoredInventory = cloneInventoryItems(staffInventorySeed);
        const storedInventory = window.localStorage.getItem(INVENTORY_STORAGE_KEY);
        if (storedInventory) {
          const inventoryValidation = validateInventoryItems(JSON.parse(storedInventory));
          if (inventoryValidation.valid) {
            restoredInventory = inventoryValidation.items;
          } else {
            setNotice({
              tone: "warning",
              title:
                locale === "fa"
                  ? "موجودی ذخیره شده قابل استفاده نبود"
                  : "The saved inventory could not be restored",
              body: inventoryValidation.errors.slice(0, 2).join(" "),
            });
          }
        }
        setInventoryItems(restoredInventory);
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          const validation = getValidationResult(
            parsed,
            inventoryItemsToCatalog(restoredInventory),
          );
          if (validation.valid && validation.state) {
            setState(validation.state);
          } else {
            setNotice({
              tone: "warning",
              title:
                locale === "fa"
                  ? "نسخه ذخیره شده قابل استفاده نبود"
                  : "The saved workspace could not be restored",
              body:
                locale === "fa"
                  ? "الگوی امن داخلی بارگذاری شد."
                  : "The safe bundled template was loaded instead.",
            });
          }
        }
      } catch {
        setStorageStatus("error");
        setSaveState("error");
        setNotice({
          tone: "warning",
          title:
            locale === "fa"
              ? "ذخیره محلی خوانده نشد"
              : "Local storage could not be read",
        });
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [locale]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Theme persistence is non-critical; the selected theme remains active for this session.
    }
  }, [hydrated, theme]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      const validation = validatePortalSnapshot(state, validationCatalog);
      if (!validation.valid) {
        setSaveState("error");
        setNotice({
          tone: "error",
          title:
            locale === "fa"
              ? "نسخه نامعتبر ذخیره نشد"
              : "Invalid workspace was not saved",
          body: validation.errors.slice(0, 3).join(" "),
        });
        return;
      }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        window.localStorage.setItem(
          INVENTORY_STORAGE_KEY,
          JSON.stringify(inventoryItems),
        );
        setSaveState("saved");
        setStorageStatus("active");
      } catch {
        setSaveState("error");
        setStorageStatus("error");
        setNotice({
          tone: "error",
          title:
            locale === "fa"
              ? "ذخیره محلی انجام نشد"
              : "The workspace could not be saved locally",
        });
      }
    }, 320);
    return () => window.clearTimeout(timer);
  }, [hydrated, inventoryItems, locale, state, validationCatalog]);

  useEffect(() => {
    const dialog = mobileDialogRef.current;
    if (!dialog) return;
    if (menuOpen && !dialog.open) dialog.showModal();
    if (!menuOpen && dialog.open) dialog.close();
  }, [menuOpen]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const commit = useCallback(
    (
      audit: {
        action: string;
        entityType: string;
        entityId: string;
        fa: string;
        en: string;
      },
      mutate: (next: PortalState) => void,
      success?: { fa: string; en: string },
    ) => {
      setState((current) => {
        const next = clonePortalState(current);
        mutate(next);
        next.lastSavedAt = new Date().toISOString();
        appendAudit(
          next,
          buildLocalAudit(
            audit.action,
            audit.entityType,
            audit.entityId,
            audit.fa,
            audit.en,
          ),
        );
        return next;
      });
      setSaveState("saving");
      if (success) {
        setNotice({ tone: "success", title: success[locale] });
      }
    },
    [locale],
  );

  function updateSelectedBooth(
    patch: Partial<Pick<Booth, "company" | "status" | "owner" | "zone" | "notes">>,
  ) {
    if (!selectedBooth) return;
    const normalizedPatch = {
      ...patch,
      ...(patch.zone !== undefined
        ? { zone: patch.zone.trim() || "unassigned" }
        : {}),
    };
    commit(
      {
        action: "booth.updated",
        entityType: "booth",
        entityId: selectedBooth.id,
        fa: "اطلاعات غرفه " + selectedBooth.code + " به روز شد.",
        en: "Booth " + selectedBooth.code + " details were updated.",
      },
      (next) => {
        const hall = next.halls.find((item) => item.id === next.activeHallId);
        const booth = hall?.booths.find((item) => item.id === selectedBooth.id);
        if (booth) {
          Object.assign(booth, normalizedPatch);
          booth.updatedAt = new Date().toISOString();
        }
      },
    );
  }

  function updateBoothPosition(boothId: string, x: number, y: number) {
    setSaveState("saving");
    setState((current) => {
      const next = clonePortalState(current);
      const hall = next.halls.find((item) => item.id === next.activeHallId);
      const booth = hall?.booths.find((item) => item.id === boothId);
      if (booth) {
        booth.x = x;
        booth.y = y;
        booth.updatedAt = new Date().toISOString();
      }
      next.lastSavedAt = new Date().toISOString();
      return next;
    });
  }

  function updateBoothGeometry(boothId: string, patch: BoothGeometryPatch) {
    setSaveState("saving");
    setState((current) => {
      const next = clonePortalState(current);
      const hall = next.halls.find((item) => item.id === next.activeHallId);
      const booth = hall?.booths.find((item) => item.id === boothId);
      if (hall && booth) {
        Object.assign(booth, resolveBoothGeometry(hall, booth, patch));
        booth.updatedAt = new Date().toISOString();
      }
      next.lastSavedAt = new Date().toISOString();
      return next;
    });
  }

  function commitBoothGeometry(boothId: string, patch: BoothGeometryPatch) {
    setSaveState("saving");
    setState((current) => {
      const next = clonePortalState(current);
      const hall = next.halls.find((item) => item.id === next.activeHallId);
      const booth = hall?.booths.find((item) => item.id === boothId);
      if (!hall || !booth) return current;
      const geometry = resolveBoothGeometry(hall, booth, patch);
      Object.assign(booth, geometry);
      booth.updatedAt = new Date().toISOString();
      const metric = calculateMetricDimensionsFromGeometry(hall, geometry.width, geometry.height);
      const widthLabel = Number(metric.widthMeters.toFixed(2));
      const depthLabel = Number(metric.depthMeters.toFixed(2));
      appendAudit(
        next,
        buildLocalAudit(
          "map.booth_resized",
          "booth",
          boothId,
          `ابعاد غرفه ${booth.code} به ${widthLabel} × ${depthLabel} متر (${metric.areaSquareMeters} متر مربع) تغییر کرد.`,
          `Booth ${booth.code} was resized to ${widthLabel} × ${depthLabel} m (${metric.areaSquareMeters} m²).`,
        ),
      );
      next.lastSavedAt = new Date().toISOString();
      return next;
    });
  }

  function applySelectedBoothDimensions(dimensions: BoothDimensions) {
    if (!activeHall || !selectedBooth) return;
    const { widthMeters, depthMeters } = dimensions;
    if (
      !Number.isFinite(widthMeters) ||
      !Number.isFinite(depthMeters) ||
      widthMeters < 0.25 ||
      depthMeters < 0.25 ||
      widthMeters > activeHall.physicalWidth ||
      depthMeters > activeHall.physicalHeight
    ) {
      setNotice({
        tone: "error",
        title:
          locale === "fa"
            ? "ابعاد واردشده داخل این سالن قابل اجرا نیست."
            : "Those dimensions cannot fit inside this hall.",
        body:
          locale === "fa"
            ? `حد مجاز این سالن ${activeHall.physicalWidth} × ${activeHall.physicalHeight} متر است.`
            : `This hall supports up to ${activeHall.physicalWidth} × ${activeHall.physicalHeight} m.`,
      });
      return;
    }
    const geometry = calculateGeometryFromMetricDimensions(activeHall, widthMeters, depthMeters);
    commitBoothGeometry(selectedBooth.id, geometry);
    setNotice({
      tone: "success",
      title:
        locale === "fa"
          ? `ابعاد غرفه ${selectedBooth.code} اعمال شد.`
          : `Booth ${selectedBooth.code} dimensions applied.`,
      body:
        locale === "fa"
          ? `${Number(widthMeters.toFixed(2))} × ${Number(depthMeters.toFixed(2))} متر · ${Number((widthMeters * depthMeters).toFixed(2))} متر مربع`
          : `${Number(widthMeters.toFixed(2))} × ${Number(depthMeters.toFixed(2))} m · ${Number((widthMeters * depthMeters).toFixed(2))} m²`,
    });
  }

  function completeBoothMove(boothId: string) {
    const booth = activeHall?.booths.find((item) => item.id === boothId);
    if (!booth) return;
    setState((current) => {
      const next = clonePortalState(current);
      appendAudit(
        next,
        buildLocalAudit(
          "map.booth_moved",
          "booth",
          boothId,
          "موقعیت غرفه " + booth.code + " روی نقشه تغییر کرد.",
          "Booth " + booth.code + " was repositioned on the plan.",
        ),
      );
      next.lastSavedAt = new Date().toISOString();
      return next;
    });
  }

  function updateFeature(featureId: string, patch: HallFeaturePatch) {
    setSaveState("saving");
    setState((current) => {
      const next = clonePortalState(current);
      const hall = next.halls.find((item) => item.id === next.activeHallId);
      const feature = hall?.features.find((item) => item.id === featureId);
      if (feature) Object.assign(feature, patch);
      next.lastSavedAt = new Date().toISOString();
      return next;
    });
  }

  function commitFeature(featureId: string, patch: HallFeaturePatch) {
    const sourceFeature = activeHall?.features.find((feature) => feature.id === featureId);
    if (!sourceFeature) return;
    setState((current) => {
      const next = clonePortalState(current);
      const hall = next.halls.find((item) => item.id === next.activeHallId);
      const feature = hall?.features.find((item) => item.id === featureId);
      if (feature) Object.assign(feature, patch);
      appendAudit(
        next,
        buildLocalAudit(
          "map.feature_updated",
          "map_feature",
          featureId,
          "هندسه " + localize(sourceFeature.label, "fa") + " روی نقشه تغییر کرد.",
          "Map geometry for " + localize(sourceFeature.label, "en") + " was updated.",
        ),
      );
      next.lastSavedAt = new Date().toISOString();
      return next;
    });
    setSaveState("saving");
  }

  function deleteFeature(featureId: string) {
    const sourceFeature = activeHall?.features.find((feature) => feature.id === featureId);
    if (!sourceFeature) return;
    commit(
      {
        action: "map.feature_deleted",
        entityType: "map_feature",
        entityId: featureId,
        fa: localize(sourceFeature.label, "fa") + " از نقشه حذف شد.",
        en: localize(sourceFeature.label, "en") + " was removed from the plan.",
      },
      (next) => {
        const hall = next.halls.find((item) => item.id === next.activeHallId);
        if (hall) hall.features = hall.features.filter((feature) => feature.id !== featureId);
      },
      { fa: "عنصر نقشه حذف شد", en: "Map feature removed" },
    );
    setSelectedFeatureId(null);
  }

  function addEquipment(catalogItemId: string) {
    if (!selectedBooth) return;
    const catalogItem = catalog.find((item) => item.id === catalogItemId);
    if (!catalogItem) return;
    commit(
      {
        action: "equipment.requirement_added",
        entityType: "booth",
        entityId: selectedBooth.id,
        fa:
          localize(catalogItem.name, "fa") +
          " به نیازهای غرفه " +
          selectedBooth.code +
          " افزوده شد.",
        en:
          localize(catalogItem.name, "en") +
          " was added to booth " +
          selectedBooth.code +
          ".",
      },
      (next) => {
        const hall = next.halls.find((item) => item.id === next.activeHallId);
        const booth = hall?.booths.find((item) => item.id === selectedBooth.id);
        if (!booth) return;
        const existing = booth.equipment.find(
          (line) =>
            line.catalogItemId === catalogItemId &&
            (line.stage === "requested" || line.stage === "preparing"),
        );
        if (existing) {
          existing.quantity += 1;
          existing.updatedAt = new Date().toISOString();
          return;
        }
        booth.equipment.push({
          id: makeId("equipment"),
          catalogItemId,
          name: catalogItem.name,
          quantity: 1,
          stage: "requested",
          returnable: catalogItem.returnable,
          deliveryWindow: "",
          pickupWindow: "",
          notes: "",
          updatedAt: new Date().toISOString(),
        });
      },
    );
  }

  function changeEquipmentQuantity(lineId: string, delta: number) {
    if (!selectedBooth) return;
    const sourceLine = selectedBooth.equipment.find((line) => line.id === lineId);
    if (!sourceLine) return;
    if (sourceLine.stage !== "requested" && sourceLine.stage !== "preparing") {
      setNotice({
        tone: "warning",
        title:
          locale === "fa"
            ? "تعداد تجهیز در حال اجرا قابل تغییر نیست"
            : "In-progress equipment quantities are locked",
        body:
          locale === "fa"
            ? "برای نیاز جدید، همان تجهیز را دوباره به غرفه اضافه کنید."
            : "Add the same catalog item again to create a new requested line.",
      });
      return;
    }
    commit(
      {
        action: "equipment.quantity_adjusted",
        entityType: "equipment",
        entityId: lineId,
        fa: "تعداد تجهیز غرفه " + selectedBooth.code + " تغییر کرد.",
        en: "An equipment quantity for booth " + selectedBooth.code + " was adjusted.",
      },
      (next) => {
        const hall = next.halls.find((item) => item.id === next.activeHallId);
        const booth = hall?.booths.find((item) => item.id === selectedBooth.id);
        const line = booth?.equipment.find((item) => item.id === lineId);
        if (line) {
          line.quantity = Math.max(1, line.quantity + delta);
          line.updatedAt = new Date().toISOString();
        }
      },
    );
  }

  function updateEquipmentLine(lineId: string, patch: EquipmentLinePatch) {
    if (!selectedBooth) return;
    const sourceLine = selectedBooth.equipment.find((line) => line.id === lineId);
    if (!sourceLine) return;
    commit(
      {
        action: "equipment.logistics_updated",
        entityType: "equipment",
        entityId: lineId,
        fa:
          "زمان بندی یا یادداشت " +
          localize(sourceLine.name, "fa") +
          " در غرفه " +
          selectedBooth.code +
          " به روز شد.",
        en:
          "Scheduling or notes for " +
          localize(sourceLine.name, "en") +
          " at booth " +
          selectedBooth.code +
          " were updated.",
      },
      (next) => {
        const hall = next.halls.find((item) => item.id === next.activeHallId);
        const booth = hall?.booths.find((item) => item.id === selectedBooth.id);
        const line = booth?.equipment.find((item) => item.id === lineId);
        if (line) {
          Object.assign(line, patch);
          line.updatedAt = new Date().toISOString();
        }
      },
      {
        fa: "جزئیات تجهیز ذخیره شد",
        en: "Equipment details saved",
      },
    );
  }

  function setEquipmentIssue(lineId: string, isIssue: boolean) {
    if (!selectedBooth) return;
    const sourceLine = selectedBooth.equipment.find((line) => line.id === lineId);
    if (!sourceLine || (isIssue && sourceLine.stage === "issue")) return;
    if (!isIssue && sourceLine.stage !== "issue") return;
    if (
      !isIssue &&
      sourceLine.collectedQuantity !== undefined &&
      sourceLine.collectedQuantity < sourceLine.quantity
    ) {
      setNotice({
        tone: "warning",
        title:
          locale === "fa"
            ? "کسری جمع آوری هنوز باز است"
            : "The collection shortage is still open",
        body:
          locale === "fa"
            ? "تعداد پیدا شده را در بخش تطبیق جمع آوری اصلاح کنید؛ این هشدار تا تطبیق کامل بسته نمی شود."
            : "Correct the found count in collection reconciliation; this alert stays open until every unit is accounted for.",
      });
      return;
    }
    commit(
      {
        action: isIssue ? "equipment.issue_reported" : "equipment.issue_resolved",
        entityType: "equipment",
        entityId: lineId,
        fa: isIssue
          ? "برای " + localize(sourceLine.name, "fa") + " در غرفه " + selectedBooth.code + " مشکل ثبت شد."
          : "مشکل " + localize(sourceLine.name, "fa") + " در غرفه " + selectedBooth.code + " رفع شد.",
        en: isIssue
          ? "An issue was reported for " + localize(sourceLine.name, "en") + " at booth " + selectedBooth.code + "."
          : "The issue for " + localize(sourceLine.name, "en") + " at booth " + selectedBooth.code + " was resolved.",
      },
      (next) => {
        const hall = next.halls.find((item) => item.id === next.activeHallId);
        const booth = hall?.booths.find((item) => item.id === selectedBooth.id);
        const line = booth?.equipment.find((item) => item.id === lineId);
        if (line) {
          if (isIssue && line.stage !== "issue") {
            line.stageBeforeIssue = line.stage;
            line.stage = "issue";
          } else if (!isIssue && line.stage === "issue") {
            line.stage = line.stageBeforeIssue ?? "preparing";
            delete line.stageBeforeIssue;
          }
          line.updatedAt = new Date().toISOString();
        }
      },
      {
        fa: isIssue ? "مشکل تجهیز ثبت شد" : "مشکل تجهیز رفع شد",
        en: isIssue ? "Equipment issue reported" : "Equipment issue resolved",
      },
    );
  }

  function advanceEquipment(lineId: string, boothId = selectedBooth?.id) {
    if (!boothId) return;
    const sourceBooth = activeHall?.booths.find((item) => item.id === boothId);
    const sourceLine = sourceBooth?.equipment.find((item) => item.id === lineId);
    if (!sourceBooth || !sourceLine) return;
    const nextStage = getNextEquipmentLineStage(sourceLine);
    if (nextStage === sourceLine.stage) return;
    commit(
      {
        action: "equipment.stage_advanced",
        entityType: "equipment",
        entityId: lineId,
        fa:
          "وضعیت " +
          localize(sourceLine.name, "fa") +
          " در غرفه " +
          sourceBooth.code +
          " به «" +
          localize(stageLabels[nextStage], "fa") +
          "» تغییر کرد.",
        en:
          localize(sourceLine.name, "en") +
          " at booth " +
          sourceBooth.code +
          " moved to " +
          localize(stageLabels[nextStage], "en") +
          ".",
      },
      (next) => {
        const hall = next.halls.find((item) => item.id === next.activeHallId);
        const booth = hall?.booths.find((item) => item.id === boothId);
        const line = booth?.equipment.find((item) => item.id === lineId);
        if (line) {
          line.stage = nextStage;
          if (nextStage === "collected" && line.returnable) {
            line.collectedQuantity = line.quantity;
          }
          line.updatedAt = new Date().toISOString();
        }
      },
      {
        fa: "مرحله تجهیز ثبت شد",
        en: "Equipment stage updated",
      },
    );
  }

  function recordEquipmentCollection(lineId: string, collectedQuantity: number) {
    if (!selectedBooth) return;
    const sourceLine = selectedBooth.equipment.find((line) => line.id === lineId);
    if (!sourceLine || !sourceLine.returnable) return;
    const safeQuantity = Math.min(
      sourceLine.quantity,
      Math.max(0, Math.round(collectedQuantity)),
    );
    const missingQuantity = sourceLine.quantity - safeQuantity;
    commit(
      {
        action:
          missingQuantity > 0
            ? "equipment.collection_shortage"
            : "equipment.collection_reconciled",
        entityType: "equipment",
        entityId: lineId,
        fa:
          localize(sourceLine.name, "fa") +
          " در غرفه " +
          selectedBooth.code +
          ": " +
          safeQuantity.toLocaleString("fa-IR") +
          " از " +
          sourceLine.quantity.toLocaleString("fa-IR") +
          " پیدا شد" +
          (missingQuantity > 0
            ? "؛ " + missingQuantity.toLocaleString("fa-IR") + " مورد کسری ثبت شد."
            : " و جمع آوری کامل شد."),
        en:
          localize(sourceLine.name, "en") +
          " at booth " +
          selectedBooth.code +
          ": " +
          safeQuantity.toLocaleString("en-GB") +
          " of " +
          sourceLine.quantity.toLocaleString("en-GB") +
          " found" +
          (missingQuantity > 0
            ? "; " + missingQuantity.toLocaleString("en-GB") + " missing."
            : " and fully collected."),
      },
      (next) => {
        const hall = next.halls.find((item) => item.id === next.activeHallId);
        const booth = hall?.booths.find((item) => item.id === selectedBooth.id);
        const line = booth?.equipment.find((item) => item.id === lineId);
        if (!line) return;
        line.collectedQuantity = safeQuantity;
        if (missingQuantity > 0) {
          if (line.stage !== "issue") {
            line.stageBeforeIssue =
              line.stage === "collected" ? "delivered" : line.stage;
          }
          line.stage = "issue";
        } else {
          line.stage = "collected";
          delete line.stageBeforeIssue;
        }
        line.updatedAt = new Date().toISOString();
      },
      {
        fa:
          missingQuantity > 0
            ? missingQuantity.toLocaleString("fa-IR") + " مورد کسری ثبت شد"
            : "جمع آوری کامل ثبت شد",
        en:
          missingQuantity > 0
            ? missingQuantity.toLocaleString("en-GB") + " missing item(s) recorded"
            : "Collection fully reconciled",
      },
    );
  }

  function removeEquipment(lineId: string) {
    if (!selectedBooth) return;
    const sourceLine = selectedBooth.equipment.find((item) => item.id === lineId);
    if (!sourceLine) return;
    setConfirmRequest({
      title: locale === "fa" ? "حذف نیاز تجهیزاتی؟" : "Remove equipment requirement?",
      body:
        locale === "fa"
          ? "این مورد از غرفه حذف می شود و اقدام در تاریخچه ثبت خواهد شد."
          : "This line will be removed from the booth and recorded in the activity history.",
      confirmLabel: locale === "fa" ? "حذف مورد" : "Remove item",
      destructive: true,
      action: () =>
        commit(
          {
            action: "equipment.requirement_removed",
            entityType: "booth_equipment",
            entityId: selectedBooth.id,
            fa:
              "نیاز «" +
              localize(sourceLine.name, "fa") +
              "» از غرفه " +
              selectedBooth.code +
              " حذف شد.",
            en:
              "The “" +
              localize(sourceLine.name, "en") +
              "” requirement was removed from booth " +
              selectedBooth.code +
              ".",
          },
          (next) => {
            const hall = next.halls.find((item) => item.id === next.activeHallId);
            const booth = hall?.booths.find((item) => item.id === selectedBooth.id);
            if (booth) {
              booth.equipment = booth.equipment.filter((item) => item.id !== lineId);
            }
          },
        ),
    });
  }

  function markAll(stage: "delivered" | "collected") {
    if (!selectedBooth) return;
    const label =
      stage === "delivered"
        ? { fa: "تحویل کامل غرفه", en: "Mark booth fully delivered" }
        : { fa: "جمع آوری کامل غرفه", en: "Mark booth fully collected" };
    setConfirmRequest({
      title: label[locale],
      body:
        locale === "fa"
          ? "اقلام بدون مشکل باز به روز می شوند؛ موارد دارای مشکل تا زمان رفع، بدون تغییر می مانند."
          : "Eligible lines will be updated; open-issue lines stay unchanged until resolved.",
      confirmLabel: copy.confirm,
      action: () =>
        commit(
          {
            action: "equipment.bulk_stage",
            entityType: "booth",
            entityId: selectedBooth.id,
            fa:
              stage === "delivered"
                ? "اقلام واجد شرایط غرفه " + selectedBooth.code + " تحویل شده ثبت شدند."
                : "اقلام بازگشتی غرفه " + selectedBooth.code + " جمع آوری شدند.",
            en:
              stage === "delivered"
                ? "Eligible items for booth " + selectedBooth.code + " were marked delivered."
                : "Returnable items for booth " + selectedBooth.code + " were marked collected.",
          },
          (next) => {
            const hall = next.halls.find((item) => item.id === next.activeHallId);
            const booth = hall?.booths.find((item) => item.id === selectedBooth.id);
            booth?.equipment.forEach((line) => {
              if (
                stage === "delivered" &&
                line.stage !== "collected" &&
                line.stage !== "issue"
              ) {
                line.stage = "delivered";
                line.updatedAt = new Date().toISOString();
              } else if (
                stage === "collected" &&
                line.returnable &&
                line.stage !== "collected" &&
                line.stage !== "issue"
              ) {
                line.stage = stage;
                line.collectedQuantity = line.quantity;
                line.updatedAt = new Date().toISOString();
              }
            });
          },
          {
            fa: stage === "delivered" ? "غرفه تحویل کامل شد" : "جمع آوری غرفه ثبت شد",
            en: stage === "delivered" ? "Booth delivery completed" : "Booth pickup completed",
          },
        ),
    });
  }

  function addBooth() {
    if (!activeHall) return;
    const existingCodes = new Set(activeHall.booths.map((booth) => booth.code));
    let index = activeHall.booths.length + 1;
    let code = "N-" + String(index).padStart(2, "0");
    while (existingCodes.has(code)) {
      index += 1;
      code = "N-" + String(index).padStart(2, "0");
    }
    const boothWidth = 150;
    const boothHeight = 110;
    const proposedX = 120 + ((index - 1) % 5) * 190;
    const proposedY = 120 + Math.floor((index - 1) / 5) * 160;
    const booth: Booth = {
      id: makeId("booth"),
      code,
      x: Math.max(0, Math.min(proposedX, activeHall.width - boothWidth)),
      y: Math.max(0, Math.min(proposedY, activeHall.height - boothHeight)),
      width: boothWidth,
      height: boothHeight,
      area: calculateBoothAreaFromGeometry(activeHall, boothWidth, boothHeight),
      status: "available",
      company: null,
      owner: staffMembers[0],
      notes: "",
      equipment: [],
      zone: locale === "fa" ? "ناحیه جدید" : "New zone",
      updatedAt: new Date().toISOString(),
    };
    commit(
      {
        action: "map.booth_created",
        entityType: "booth",
        entityId: booth.id,
        fa: "غرفه " + code + " به نقشه اضافه شد.",
        en: "Booth " + code + " was added to the plan.",
      },
      (next) => {
        const hall = next.halls.find((item) => item.id === next.activeHallId);
        hall?.booths.push(booth);
      },
      { fa: "غرفه جدید ساخته شد", en: "New booth created" },
    );
    setSelectedBoothId(booth.id);
  }

  function addFeature(kind: HallFeatureKind) {
    if (!activeHall) return;
    const ordinal = activeHall.features.filter((feature) => feature.kind === kind).length + 1;
    const label = {
      fa: hallFeatureLabels[kind].fa + " " + ordinal,
      en: hallFeatureLabels[kind].en + " " + ordinal,
    };
    const defaultGeometry: Record<HallFeatureKind, { width: number; height: number }> = {
      column: { width: 42, height: 42 },
      door: { width: 90, height: 18 },
      zone: { width: 190, height: 100 },
      aisle: { width: 360, height: 80 },
      loading: { width: 210, height: 90 },
      utility: { width: 110, height: 75 },
      entrance: { width: 120, height: 24 },
      wall: { width: 320, height: 12 },
      label: { width: 180, height: 40 },
    };
    const width = Math.min(defaultGeometry[kind].width, activeHall.width);
    const height = Math.min(defaultGeometry[kind].height, activeHall.height);
    const columns = Math.max(1, Math.floor((activeHall.width - 80) / (width + 24)));
    const slot = activeHall.features.length;
    const feature: HallFeature = {
      id: makeId(kind),
      kind,
      x: Math.min(
        Math.max(0, activeHall.width - width),
        40 + (slot % columns) * (width + 24),
      ),
      y: Math.min(
        Math.max(0, activeHall.height - height),
        40 + Math.floor(slot / columns) * (height + 24),
      ),
      width,
      height,
      label,
      rotation: 0,
    };
    commit(
      {
        action: "map.feature_created",
        entityType: "map_feature",
        entityId: feature.id,
        fa: label.fa + " به نقشه اضافه شد.",
        en: label.en + " was added to the plan.",
      },
      (next) => {
        const hall = next.halls.find((item) => item.id === next.activeHallId);
        hall?.features.push(feature);
      },
      { fa: label.fa + " اضافه شد", en: label.en + " added" },
    );
    setSelectedFeatureId(feature.id);
    setEditMode(true);
  }

  function deleteSelectedBooth() {
    if (!selectedBooth) return;
    setConfirmRequest({
      title:
        locale === "fa"
          ? "حذف غرفه " + selectedBooth.code + "؟"
          : "Delete booth " + selectedBooth.code + "?",
      body:
        locale === "fa"
          ? "غرفه و نیازهای تجهیزاتی آن از این نسخه محلی حذف می شوند."
          : "The booth and its equipment requirements will be removed from this local version.",
      confirmLabel: locale === "fa" ? "حذف غرفه" : "Delete booth",
      destructive: true,
      action: () =>
        commit(
          {
            action: "map.booth_deleted",
            entityType: "booth",
            entityId: selectedBooth.id,
            fa: "غرفه " + selectedBooth.code + " حذف شد.",
            en: "Booth " + selectedBooth.code + " was deleted.",
          },
          (next) => {
            const hall = next.halls.find((item) => item.id === next.activeHallId);
            if (hall) {
              hall.booths = hall.booths.filter((item) => item.id !== selectedBooth.id);
            }
            next.tasks = detachTasksFromMissingBooths(
              next.tasks,
              next.halls.flatMap((item) => item.booths.map((booth) => booth.id)),
            );
          },
        ),
    });
  }

  function createBoothTask() {
    if (!selectedBooth) return;
    const task: PortalTask = {
      id: makeId("task"),
      title: {
        fa: "بررسی نهایی غرفه " + selectedBooth.code,
        en: "Final readiness check for booth " + selectedBooth.code,
      },
      boothId: selectedBooth.id,
      owner: selectedBooth.owner || staffMembers[0],
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: "open",
      priority: "high",
      notes: "",
    };
    commit(
      {
        action: "task.created",
        entityType: "task",
        entityId: task.id,
        fa: "کار جدید برای غرفه " + selectedBooth.code + " ساخته شد.",
        en: "A new task was created for booth " + selectedBooth.code + ".",
      },
      (next) => next.tasks.unshift(task),
      { fa: "کار جدید به برنامه اضافه شد", en: "Task added to the run of show" },
    );
    setActiveView("tasks");
  }

  function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = taskDraft.title.trim();
    if (!title) {
      setNotice({
        tone: "warning",
        title: locale === "fa" ? "عنوان کار را وارد کنید" : "Enter a task title",
      });
      return;
    }
    const task: PortalTask = {
      id: makeId("task"),
      title: { fa: title, en: title },
      owner: taskDraft.owner,
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: "open",
      priority: "medium",
      notes: "",
    };
    commit(
      {
        action: "task.created",
        entityType: "task",
        entityId: task.id,
        fa: "کار «" + title + "» ایجاد شد.",
        en: "Task “" + title + "” was created.",
      },
      (next) => next.tasks.unshift(task),
      { fa: "کار ساخته شد", en: "Task created" },
    );
    setTaskDraft((current) => ({ ...current, title: "" }));
  }

  function advanceTask(taskId: string) {
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) return;
    const nextStatus =
      task.status === "open" ? "in-progress" : task.status === "in-progress" ? "done" : "open";
    commit(
      {
        action: "task.status_changed",
        entityType: "task",
        entityId: taskId,
        fa: "وضعیت کار «" + localize(task.title, "fa") + "» تغییر کرد.",
        en: "Task “" + localize(task.title, "en") + "” changed status.",
      },
      (next) => {
        const target = next.tasks.find((item) => item.id === taskId);
        if (target) target.status = nextStatus;
      },
    );
  }

  function saveNow() {
    const validation = validatePortalSnapshot(state, validationCatalog);
    if (!validation.valid) {
      setSaveState("error");
      setNotice({
        tone: "error",
        title: locale === "fa" ? "نسخه نامعتبر ذخیره نشد" : "Invalid workspace was not saved",
        body: validation.errors.slice(0, 3).join(" "),
      });
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      window.localStorage.setItem(
        INVENTORY_STORAGE_KEY,
        JSON.stringify(inventoryItems),
      );
      setSaveState("saved");
      setStorageStatus("active");
      setNotice({
        tone: "success",
        title:
          locale === "fa"
            ? "نسخه محلی ذخیره شد"
            : "Local workspace saved",
      });
    } catch {
      setSaveState("error");
      setStorageStatus("error");
      setNotice({
        tone: "error",
        title: locale === "fa" ? "ذخیره انجام نشد" : "Save failed",
      });
    }
  }

  function exportFullSnapshot() {
    setConfirmRequest({
      title: locale === "fa" ? "خروجی کامل داخلی؟" : "Export the full internal workspace?",
      body:
        locale === "fa"
          ? "این فایل شامل یادداشت ها، مسئولان و جزئیات عملیاتی است. آن را فقط در محل امن نگهداری کنید."
          : "This file contains notes, owners, and operational details. Store it only in an approved secure location.",
      confirmLabel: locale === "fa" ? "دریافت خروجی کامل" : "Download full export",
      action: () => {
        const next = clonePortalState(state);
        appendAudit(
          next,
          buildLocalAudit(
            "export.full_downloaded",
            "workspace",
            "local-workspace",
            "خروجی کامل داخلی دریافت شد.",
            "A full internal workspace export was downloaded.",
          ),
        );
        next.lastSavedAt = new Date().toISOString();
        setState(next);
        setInventoryItems(cloneInventoryItems(staffInventorySeed));
        setSaveState("saving");
        downloadJson("aratta-operations-workspace.json", {
          schema: "aratta-staff-workspace",
          version: 1,
          portal: next,
          inventory: cloneInventoryItems(inventoryItems),
        });
        setNotice({
          tone: "success",
          title:
            locale === "fa"
              ? "خروجی کامل آماده شد"
              : "Full workspace export prepared",
        });
      },
    });
  }

  function exportPublicPlan() {
    if (!activeHall) return;
    downloadJson(
      "aratta-public-hall-plan-" + activeHall.id + ".json",
      makePublicHallExport(activeHall),
    );
    setNotice({
      tone: "success",
      title:
        locale === "fa"
          ? "نقشه عمومی بدون اطلاعات خصوصی آماده شد"
          : "Public-safe hall plan prepared",
    });
  }

  async function readImportFile(file: File) {
    try {
      if (file.size > MAX_IMPORT_FILE_BYTES) {
        throw new Error(
          locale === "fa"
            ? "حجم فایل ورودی باید کمتر از ۸ مگابایت باشد."
            : "Import files must be smaller than 8 MB.",
        );
      }
      const extension = file.name.split(".").pop()?.toLocaleLowerCase("en-US");
      if (extension === "xlsx") {
        if (!activeHall) throw new Error("No active hall is available.");
        const { default: readWorkbook } = await import("read-excel-file/browser");
        const sheets = await readWorkbook(file);
        const reconstructions = sheets.map((sheet) =>
          parsePlanRows(sheet.data, {
            hall: activeHall,
            updatedAt: new Date().toISOString(),
            sourceName: `${file.name} · ${sheet.sheet}`,
          }),
        );
        const boothCodes = new Set<string>();
        const booths = reconstructions.flatMap((result) => result.booths).filter((booth) => {
          if (boothCodes.has(booth.code)) return false;
          boothCodes.add(booth.code);
          return true;
        });
        const features = reconstructions.flatMap((result) => result.features);
        const warnings = reconstructions.flatMap((result, index) =>
          result.warnings.map((warning) => `${sheets[index]?.sheet ?? "Sheet"}: ${warning}`),
        );
        if (!booths.length) {
          throw new Error(
            locale === "fa"
              ? "هیچ جدول غرفه قابل ویرایشی در فایل Excel پیدا نشد. ستون‌های کد، X، Y، عرض و عمق را اضافه کنید؛ برای نقشه تصویری از PDF/تصویر و بازسازی هوشمند استفاده کنید."
              : "No editable booth table was found. Add code, X, Y, width, and depth columns; use AI reconstruction for visual PDF/image plans.",
          );
        }
        setImportPreview({
          kind: "plan",
          fileName: file.name,
          hallId: activeHall.id,
          hallName: localize(activeHall.name, locale),
          hallWidth: activeHall.width,
          hallHeight: activeHall.height,
          physicalWidth: activeHall.physicalWidth,
          physicalHeight: activeHall.physicalHeight,
          booths,
          features,
          warnings,
          sourceSummary: `${sheets.length} workbook sheet(s) inspected locally`,
          keepSourceAsReference: false,
          applyMode: "merge",
        });
        return;
      }
      if (["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(file.type)) {
        if (!activeHall) throw new Error("No active hall is available.");
        const targetHall = activeHall;
        const sourceImageDataUrl = file.type.startsWith("image/")
          ? await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("The image could not be read."));
              reader.onerror = () => reject(new Error("The image could not be read."));
              reader.readAsDataURL(file);
            })
          : undefined;
        setPlanImportBusy(true);
        setNotice({
          tone: "warning",
          title: locale === "fa" ? "در حال بازسازی نقشه…" : "Reconstructing the plan…",
          body: locale === "fa" ? "هوش مصنوعی در حال ساخت غرفه‌ها و سازه‌های قابل ویرایش است؛ نتیجه پیش از اعمال نمایش داده می‌شود." : "AI is building editable booths and structural objects. You will review the native result before applying it.",
        });
        const form = new FormData();
        form.append("file", file);
        form.append("hallWidth", String(targetHall.physicalWidth));
        form.append("hallHeight", String(targetHall.physicalHeight));
        const response = await fetch("/api/staff/plan-reconstruction", { method: "POST", body: form });
        const payload = await response.json() as { plan?: unknown; error?: string; code?: string };
        if (!response.ok || !payload.plan) {
          if (payload.code === "AUTH_REQUIRED") {
            setNotice({
              tone: "error",
              title: locale === "fa" ? "برای بازسازی هوشمند وارد شوید" : "Sign in to use AI reconstruction",
              body: locale === "fa" ? "فایل شما اعمال نشد. پس از ورود دوباره آن را انتخاب کنید." : "Nothing was applied. Sign in, then choose the file again.",
            });
            if (window.location.hostname.endsWith(".chatgpt.site")) {
              // Platform-owned authentication must leave the client router.
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.assign(`/signin-with-chatgpt?return_to=${encodeURIComponent(window.location.pathname)}`);
            }
            return;
          }
          throw new Error(payload.error || "Automatic reconstruction failed.");
        }
        const reconstructed = normalizeVisionPlan(payload.plan, { hall: targetHall, updatedAt: new Date().toISOString(), sourceName: file.name });
        const applicability = validateApplicablePlan(reconstructed);
        if (!applicability.valid) {
          throw new Error(locale === "fa" ? "هیچ غرفه قابل ویرایشی با هندسه معتبر از فایل استخراج نشد." : "No editable booth with valid geometry was extracted from the file.");
        }
        setImportPreview({
          kind: "plan",
          fileName: file.name,
          hallId: targetHall.id,
          hallName: localize(targetHall.name, locale),
          hallWidth: targetHall.width,
          hallHeight: targetHall.height,
          physicalWidth: targetHall.physicalWidth,
          physicalHeight: targetHall.physicalHeight,
          sourceImageDataUrl,
          keepSourceAsReference: Boolean(sourceImageDataUrl),
          applyMode: "merge",
          ...reconstructed,
        });
        setNotice(null);
        return;
      }
      const text = await file.text();
      if (file.name.toLowerCase().endsWith(".csv")) {
        const parsed = parseBoothCsv(text, {
          idPrefix: activeHall?.id ?? "csv-booth",
          updatedAt: new Date().toISOString(),
        });
        const warnings = parsed.errors.map(
          (error) => "Row " + error.row + ": " + error.message,
        );
        const booths = parsed.booths.filter((booth) => {
          const insideHall = Boolean(
            activeHall &&
              booth.x >= 0 &&
              booth.y >= 0 &&
              booth.x + booth.width <= activeHall.width &&
              booth.y + booth.height <= activeHall.height,
          );
          if (!insideHall) {
            warnings.push(
              "Booth " + booth.code + " exceeds the active hall boundaries and was skipped.",
            );
          }
          return insideHall;
        });
        if (!booths.length) {
          throw new Error("No booth rows were found.");
        }
        setImportPreview({
          kind: "csv",
          fileName: file.name,
          booths,
          warnings,
        });
        return;
      }
      const parsed: unknown = JSON.parse(text);
      let portalCandidate = parsed;
      let importedInventory: InventoryItem[] | undefined;
      if (
        isPlainRecord(parsed) &&
        parsed.schema === "aratta-staff-workspace" &&
        "portal" in parsed
      ) {
        const inventoryValidation = validateInventoryItems(parsed.inventory);
        if (!inventoryValidation.valid) {
          throw new Error(inventoryValidation.errors.join(" "));
        }
        importedInventory = inventoryValidation.items;
        portalCandidate = parsed.portal;
      }
      const validation = getValidationResult(
        portalCandidate,
        importedInventory ? inventoryItemsToCatalog(importedInventory) : validationCatalog,
      );
      if (!validation.valid || !validation.state) {
        throw new Error(validation.errors.join(" ") || "Invalid snapshot.");
      }
      setImportPreview({
        kind: "snapshot",
        fileName: file.name,
        state: validation.state,
        ...(importedInventory ? { inventoryItems: importedInventory } : {}),
        booths: getAllBooths(validation.state).length,
        halls: validation.state.halls.length,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title:
          locale === "fa"
            ? "فایل قابل ورود نیست"
            : "The file could not be imported",
        body: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setPlanImportBusy(false);
      if (importInputRef.current) importInputRef.current.value = "";
      if (planInputRef.current) planInputRef.current.value = "";
    }
  }

  async function readInventoryFile(file: File) {
    try {
      if (file.size > MAX_IMPORT_FILE_BYTES) {
        throw new Error(
          locale === "fa"
            ? "حجم فایل موجودی باید کمتر از ۵ مگابایت باشد."
            : "Inventory files must be smaller than 5 MB.",
        );
      }
      const extension = file.name.split(".").pop()?.toLocaleLowerCase("en-US");
      let rows: readonly (readonly unknown[])[];
      if (extension === "xlsx") {
        const { readSheet } = await import("read-excel-file/browser");
        rows = await readSheet(file);
      } else if (extension === "csv" || extension === "tsv") {
        rows = parseInventoryDelimitedText(
          await file.text(),
          extension === "tsv" ? "\t" : undefined,
        );
      } else {
        throw new Error(
          locale === "fa"
            ? "فقط فایل های XLSX، CSV و TSV پذیرفته می شوند."
            : "Only XLSX, CSV, and TSV inventory files are accepted.",
        );
      }

      const parsed = parseInventoryRows(rows, { updatedAt: new Date().toISOString() });
      if (!parsed.items.length) {
        throw new Error(
          parsed.errors[0]?.message ??
            (locale === "fa"
              ? "هیچ ردیف معتبر موجودی پیدا نشد."
              : "No valid inventory rows were found."),
        );
      }
      setInventoryItems((current) => upsertInventoryItems(current, parsed.items));
      setState((current) => {
        const next = clonePortalState(current);
        appendAudit(
          next,
          buildLocalAudit(
            "inventory.file_imported",
            "inventory",
            "warehouse-catalog",
            parsed.items.length.toLocaleString("fa-IR") +
              " قلم موجودی از " +
              file.name +
              " وارد یا به روز شد.",
            parsed.items.length.toLocaleString("en-GB") +
              " inventory item(s) were imported or updated from " +
              file.name +
              ".",
          ),
        );
        next.lastSavedAt = new Date().toISOString();
        return next;
      });
      setSaveState("saving");
      setNotice({
        tone: parsed.errors.length ? "warning" : "success",
        title:
          locale === "fa"
            ? parsed.items.length.toLocaleString("fa-IR") + " قلم موجودی ثبت شد"
            : parsed.items.length.toLocaleString("en-GB") + " inventory item(s) saved",
        body: parsed.errors.length
          ? (locale === "fa"
              ? parsed.errors.length.toLocaleString("fa-IR") +
                " خطای ردیف نادیده گرفته شد. "
              : parsed.errors.length.toLocaleString("en-GB") +
                " invalid row error(s) were skipped. ") +
            parsed.errors
              .slice(0, 2)
              .map((error) => `Row ${error.row}: ${error.message}`)
              .join(" ")
          : undefined,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title:
          locale === "fa"
            ? "فایل موجودی قابل ورود نیست"
            : "The inventory file could not be imported",
        body: error instanceof Error ? error.message : undefined,
      });
    }
  }

  function saveInventoryItem(item: InventoryItem) {
    const validation = validateInventoryItems([item]);
    if (!validation.valid) {
      setNotice({
        tone: "error",
        title: locale === "fa" ? "قلم موجودی ذخیره نشد" : "Inventory item was not saved",
        body: validation.errors.slice(0, 2).join(" "),
      });
      return;
    }
    setInventoryItems((current) => upsertInventoryItems(current, validation.items));
    setSaveState("saving");
    setNotice({
      tone: "success",
      title: locale === "fa" ? "قلم موجودی ذخیره شد" : "Inventory item saved",
    });
  }

  function addInventoryMaterial(material: NewInventoryMaterial) {
    const id = makeInventorySlug(material.sku);
    if (!id) {
      setNotice({
        tone: "error",
        title: locale === "fa" ? "کد انبار معتبر نیست" : "The inventory SKU is invalid",
      });
      return;
    }
    saveInventoryItem({
      ...material,
      id,
      updatedAt: new Date().toISOString(),
    });
  }

  function updateInventoryOnHand(itemId: string, onHand: number) {
    if (!Number.isSafeInteger(onHand) || onHand < 0) return;
    setInventoryItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? { ...item, onHand, updatedAt: new Date().toISOString() }
          : item,
      ),
    );
    setSaveState("saving");
  }

  function updateInventoryItem(
    itemId: string,
    patch: Pick<InventoryItem, "name" | "variant">,
  ) {
    const target = inventoryItems.find((item) => item.id === itemId);
    if (!target) return;
    setInventoryItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              name: { ...patch.name },
              ...(patch.variant ? { variant: patch.variant } : { variant: undefined }),
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    setSaveState("saving");
    setNotice({
      tone: "success",
      title:
        locale === "fa"
          ? `نام «${localize(target.name, locale)}» به‌روز شد`
          : `“${localize(target.name, locale)}” was updated`,
    });
  }

  function archiveInventoryItems(itemIds: string[], archived: boolean) {
    const ids = new Set(itemIds);
    if (!ids.size) return;
    setInventoryItems((current) =>
      current.map((item) =>
        ids.has(item.id)
          ? {
              ...item,
              ...(archived ? { archived: true } : { archived: undefined }),
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    setSaveState("saving");
    setNotice({
      tone: "success",
      title:
        locale === "fa"
          ? `${formatCount(ids.size, locale)} قلم ${archived ? "بایگانی" : "فعال"} شد`
          : `${formatCount(ids.size, locale)} material${ids.size === 1 ? "" : "s"} ${archived ? "archived" : "restored"}`,
    });
  }

  function requestRemoveInventoryItems(itemIds: string[]) {
    const ids = new Set(itemIds);
    if (!ids.size) return;
    const referencedIds = new Set(
      state.halls.flatMap((hall) =>
        hall.booths.flatMap((booth) => booth.equipment.map((line) => line.catalogItemId)),
      ),
    );
    const protectedItems = inventoryItems.filter(
      (item) => ids.has(item.id) && (referencedIds.has(item.id) || referencedIds.has(item.sku)),
    );
    if (protectedItems.length) {
      setNotice({
        tone: "warning",
        title:
          locale === "fa"
            ? "قلم تخصیص‌یافته حذف نمی‌شود"
            : "Assigned materials cannot be removed",
        body:
          locale === "fa"
            ? `${formatCount(protectedItems.length, locale)} قلم در سابقه غرفه‌ها استفاده شده است. برای پنهان کردن بدون شکستن سوابق، آن‌ها را بایگانی کنید.`
            : `${protectedItems.length} selected material${protectedItems.length === 1 ? " is" : "s are"} referenced by booth history. Archive instead to preserve those records.`,
      });
      return;
    }
    setConfirmRequest({
      title:
        locale === "fa"
          ? `حذف ${formatCount(ids.size, locale)} قلم موجودی؟`
          : `Remove ${ids.size} inventory material${ids.size === 1 ? "" : "s"}?`,
      body:
        locale === "fa"
          ? "این اقلام هیچ تخصیص غرفه‌ای ندارند و پس از تأیید از فضای محلی حذف می‌شوند. این کار قابل بازگشت نیست."
          : "These materials have no booth assignments and will be removed from this local workspace. This cannot be undone.",
      confirmLabel: locale === "fa" ? "حذف اقلام" : "Remove materials",
      destructive: true,
      action: () => {
        setInventoryItems((current) => current.filter((item) => !ids.has(item.id)));
        setSaveState("saving");
        setNotice({
          tone: "success",
          title: locale === "fa" ? "اقلام انتخاب‌شده حذف شدند" : "Selected materials removed",
        });
      },
    });
  }

  function applyImport() {
    if (!importPreview) return;
    if (importPreview.kind === "snapshot") {
      const next = clonePortalState(importPreview.state);
      appendAudit(
        next,
        buildLocalAudit(
          "import.snapshot_applied",
          "workspace",
          "local-workspace",
          "نسخه کامل " + importPreview.fileName + " وارد شد.",
          "Full snapshot " + importPreview.fileName + " was imported.",
        ),
      );
      next.lastSavedAt = new Date().toISOString();
      setState(next);
      if (importPreview.inventoryItems) {
        setInventoryItems(cloneInventoryItems(importPreview.inventoryItems));
      }
      setSelectedBoothId(
        next.halls.find((hall) => hall.id === next.activeHallId)?.booths[0]?.id ?? null,
      );
    } else if (importPreview.kind === "csv") {
      setState((current) => {
        const next = clonePortalState(current);
        const hall = next.halls.find((item) => item.id === next.activeHallId);
        if (hall) hall.booths = importPreview.booths;
        next.tasks = detachTasksFromMissingBooths(
          next.tasks,
          next.halls.flatMap((item) => item.booths.map((booth) => booth.id)),
        );
        appendAudit(
          next,
          buildLocalAudit(
            "import.csv_applied",
            "hall",
            next.activeHallId,
            formatCount(importPreview.booths.length, "fa") + " غرفه از CSV وارد شد.",
            formatCount(importPreview.booths.length, "en") + " booths were imported from CSV.",
          ),
        );
        next.lastSavedAt = new Date().toISOString();
        return next;
      });
      setSelectedBoothId(importPreview.booths[0]?.id ?? null);
    } else {
      try {
        const next = applyPlanReconstruction(state, {
          hallId: importPreview.hallId,
          plan: importPreview,
          mode: importPreview.applyMode,
        });
        const owningExhibition = next.exhibitions.find((exhibition) =>
          exhibition.hallIds.includes(importPreview.hallId),
        );
        next.activeHallId = importPreview.hallId;
        if (owningExhibition) next.activeExhibitionId = owningExhibition.id;
        appendAudit(
          next,
          buildLocalAudit(
            "import.plan_reconstructed",
            "hall",
            importPreview.hallId,
            `${formatCount(importPreview.booths.length, "fa")} غرفه و ${formatCount(importPreview.features.length, "fa")} سازه قابل ویرایش از ${importPreview.fileName} با حالت ${importPreview.applyMode === "merge" ? "ادغام" : "جایگزینی"} ساخته شد.`,
            `${formatCount(importPreview.booths.length, "en")} editable booths and ${formatCount(importPreview.features.length, "en")} native features were reconstructed from ${importPreview.fileName} in ${importPreview.applyMode} mode.`,
          ),
        );
        next.lastSavedAt = new Date().toISOString();
        const validation = validatePortalSnapshot(next, validationCatalog);
        if (!validation.valid) throw new Error(validation.errors.slice(0, 3).join(" "));
        setState(next);
        const targetHall = next.halls.find((hall) => hall.id === importPreview.hallId);
        setSelectedBoothId(targetHall?.booths[0]?.id ?? null);
        setEditMode(true);
        setActiveView("floorplan");
        if (importPreview.keepSourceAsReference && importPreview.sourceImageDataUrl) {
          setReferenceImages((current) => ({
            ...current,
            [importPreview.hallId]: importPreview.sourceImageDataUrl as string,
          }));
        }
      } catch (error) {
        setNotice({
          tone: "error",
          title: locale === "fa" ? "بازسازی اعمال نشد" : "Reconstruction was not applied",
          body: error instanceof Error ? error.message : undefined,
        });
        return;
      }
    }
    setSaveState("saving");
    setSelectedFeatureId(null);
    setNotice({
      tone: "success",
      title:
        locale === "fa"
          ? importPreview.kind === "plan"
            ? "نقشه قابل ویرایش روی پلتفرم ساخته شد"
            : "ورود اطلاعات با موفقیت اعمال شد"
          : importPreview.kind === "plan"
            ? "Editable native map created"
            : "Import applied successfully",
    });
    setImportPreview(null);
  }

  function readReferenceImage(file: File) {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type) || file.size > MAX_IMPORT_FILE_BYTES) {
      setNotice({ tone: "warning", title: copy.rasterOnly });
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string" && activeHall) {
        setReferenceImages((current) => ({
          ...current,
          [activeHall.id]: reader.result as string,
        }));
        setNotice({
          tone: "success",
          title:
            locale === "fa"
              ? "تصویر مرجع روی نقشه قرار گرفت"
              : "Reference image added to the plan",
          body:
            locale === "fa"
              ? "این تصویر فقط تا پایان نشست فعلی نگهداری می شود."
              : "This image is kept for the current session only.",
        });
      }
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function restoreTemplate() {
    setConfirmRequest({
      title:
        locale === "fa"
          ? "بازگردانی الگوی اولیه؟"
          : "Restore the bundled template?",
      body: copy.replaceDataWarning,
      confirmLabel: copy.resetWorkspace,
      destructive: true,
      action: () => {
        const next = clonePortalState(initialPortalState);
        appendAudit(
          next,
          buildLocalAudit(
            "workspace.template_restored",
            "workspace",
            "local-workspace",
            "الگوی عملیاتی اولیه بازگردانی شد.",
            "The bundled operations template was restored.",
          ),
        );
        next.lastSavedAt = new Date().toISOString();
        setState(next);
        setSelectedBoothId(
          next.halls.find((hall) => hall.id === next.activeHallId)?.booths[0]?.id ?? null,
        );
        setSelectedFeatureId(null);
        setSaveState("saving");
        try {
          window.localStorage.removeItem(STORAGE_KEY);
          window.localStorage.removeItem(INVENTORY_STORAGE_KEY);
        } catch {
          setStorageStatus("error");
          setSaveState("error");
        }
        setReferenceImages({});
        setNotice({
          tone: "success",
          title:
            locale === "fa"
              ? "الگوی عملیاتی بازگردانی شد"
              : "Operations template restored",
        });
      },
    });
  }

  function changeActiveExhibition(exhibitionId: string, preferredHallId?: string) {
    const exhibition = state.exhibitions.find((item) => item.id === exhibitionId);
    if (!exhibition) return;
    const hallId =
      preferredHallId && exhibition.hallIds.includes(preferredHallId)
        ? preferredHallId
        : exhibition.hallIds[0];
    const hall = state.halls.find((item) => item.id === hallId);
    if (!hall) return;
    if (state.activeExhibitionId !== exhibitionId || state.activeHallId !== hall.id) {
      commit(
        {
          action: "exhibition.selected",
          entityType: "exhibition",
          entityId: exhibitionId,
          fa: "نمایشگاه " + localize(exhibition.name, "fa") + " به عنوان رویداد فعال انتخاب شد.",
          en: localize(exhibition.name, "en") + " was selected as the active exhibition.",
        },
        (next) => {
          next.activeExhibitionId = exhibitionId;
          next.activeHallId = hall.id;
        },
      );
    }
    setSelectedBoothId(hall.booths[0]?.id ?? null);
    setSelectedFeatureId(null);
    setSearchQuery("");
  }

  function addExhibition(draft: NewExhibitionDraft) {
    const exhibitionId = makeId("exhibition");
    const halls = Array.from({ length: draft.hallCount }, (_, index) =>
      makeBlankHall(makeId("hall"), index + 1),
    );
    const exhibition: Exhibition = {
      id: exhibitionId,
      name: { fa: draft.name, en: draft.name },
      venue: { fa: draft.venue, en: draft.venue },
      city: { fa: draft.city, en: draft.city },
      startDate: draft.startDate,
      endDate: draft.endDate,
      status: "planning",
      hallIds: halls.map((hall) => hall.id),
      notes: {
        fa: "رویداد محلی تازه ایجاد شده؛ جزئیات را پیش از انتشار بررسی کنید.",
        en: "New local event; review the details before external use.",
      },
      color: exhibitionColors[state.exhibitions.length % exhibitionColors.length],
    };
    commit(
      {
        action: "exhibition.created",
        entityType: "exhibition",
        entityId: exhibitionId,
        fa: `نمایشگاه «${draft.name}» با ${draft.hallCount} سالن ایجاد شد.`,
        en: `Exhibition “${draft.name}” was created with ${draft.hallCount} halls.`,
      },
      (next) => {
        next.exhibitions.push(exhibition);
        next.halls.push(...halls);
        next.activeExhibitionId = exhibitionId;
        next.activeHallId = halls[0].id;
      },
      { fa: "نمایشگاه و سالن‌های آن ساخته شد", en: "Exhibition and halls created" },
    );
    setSelectedBoothId(null);
    setSelectedFeatureId(null);
    setActiveView("exhibitions");
  }

  function updateExhibition(
    exhibitionId: string,
    patch: Partial<Pick<Exhibition, "name" | "venue" | "city" | "startDate" | "endDate" | "status">>,
  ) {
    const exhibition = state.exhibitions.find((item) => item.id === exhibitionId);
    if (!exhibition) return;
    commit(
      {
        action: patch.status ? "exhibition.status_changed" : "exhibition.updated",
        entityType: "exhibition",
        entityId: exhibitionId,
        fa: `مشخصات نمایشگاه «${localize(exhibition.name, "fa")}» به‌روز شد.`,
        en: `Exhibition “${localize(exhibition.name, "en")}” was updated.`,
      },
      (next) => {
        const target = next.exhibitions.find((item) => item.id === exhibitionId);
        if (target) Object.assign(target, patch);
      },
      {
        fa: patch.status === "archived" ? "نمایشگاه بایگانی شد" : "تغییرات نمایشگاه ذخیره شد",
        en: patch.status === "archived" ? "Exhibition archived" : "Exhibition changes saved",
      },
    );
  }

  function removeExhibition(exhibitionId: string) {
    const exhibition = state.exhibitions.find((item) => item.id === exhibitionId);
    if (!exhibition) return;
    if (state.exhibitions.length <= 1) {
      setNotice({
        tone: "warning",
        title: locale === "fa" ? "حداقل یک نمایشگاه باید باقی بماند" : "At least one exhibition must remain",
      });
      return;
    }
    const boothCount = state.halls
      .filter((hall) => exhibition.hallIds.includes(hall.id))
      .reduce((sum, hall) => sum + hall.booths.length, 0);
    setConfirmRequest({
      title:
        locale === "fa"
          ? `حذف نمایشگاه «${localize(exhibition.name, locale)}»؟`
          : `Remove “${localize(exhibition.name, locale)}”?`,
      body:
        locale === "fa"
          ? `این کار ${exhibition.hallIds.length} سالن و ${boothCount} غرفه وابسته را از فضای محلی حذف می‌کند. برای نگهداری سابقه از بایگانی استفاده کنید.`
          : `This removes ${exhibition.hallIds.length} halls and ${boothCount} dependent booths from the local workspace. Archive it to keep the history.`,
      confirmLabel: locale === "fa" ? "حذف نمایشگاه" : "Remove exhibition",
      destructive: true,
      action: () => {
        const fallback = state.exhibitions.find((item) => item.id !== exhibitionId);
        if (!fallback) return;
        commit(
          {
            action: "exhibition.removed",
            entityType: "exhibition",
            entityId: exhibitionId,
            fa: `نمایشگاه «${localize(exhibition.name, "fa")}» حذف شد.`,
            en: `Exhibition “${localize(exhibition.name, "en")}” was removed.`,
          },
          (next) => {
            const removedHallIds = new Set(exhibition.hallIds);
            next.exhibitions = next.exhibitions.filter((item) => item.id !== exhibitionId);
            next.halls = next.halls.filter((hall) => !removedHallIds.has(hall.id));
            next.leads = next.leads.filter((lead) => lead.exhibitionId !== exhibitionId);
            next.commercialAccounts = next.commercialAccounts.filter(
              (account) => account.exhibitionId !== exhibitionId,
            );
            next.tasks = detachTasksFromMissingBooths(
              next.tasks,
              next.halls.flatMap((hall) => hall.booths.map((booth) => booth.id)),
            );
            if (next.activeExhibitionId === exhibitionId) {
              next.activeExhibitionId = fallback.id;
              next.activeHallId = fallback.hallIds[0];
            }
          },
          { fa: "نمایشگاه حذف شد", en: "Exhibition removed" },
        );
        const fallbackHall = state.halls.find((hall) => hall.id === fallback.hallIds[0]);
        setSelectedBoothId(fallbackHall?.booths[0]?.id ?? null);
        setSelectedFeatureId(null);
      },
    });
  }

  function addHallToExhibition(exhibitionId: string) {
    const exhibition = state.exhibitions.find((item) => item.id === exhibitionId);
    if (!exhibition) return;
    const hall = makeBlankHall(makeId("hall"), exhibition.hallIds.length + 1);
    commit(
      {
        action: "hall.created",
        entityType: "hall",
        entityId: hall.id,
        fa: `سالن جدید به نمایشگاه «${localize(exhibition.name, "fa")}» افزوده شد.`,
        en: `A new hall was added to “${localize(exhibition.name, "en")}”.`,
      },
      (next) => {
        next.halls.push(hall);
        next.exhibitions.find((item) => item.id === exhibitionId)?.hallIds.push(hall.id);
      },
      { fa: "سالن جدید افزوده شد", en: "New hall added" },
    );
  }

  function updateHallInExhibition(
    exhibitionId: string,
    hallId: string,
    patch: Pick<Hall, "name" | "physicalWidth" | "physicalHeight">,
  ) {
    const exhibition = state.exhibitions.find((item) => item.id === exhibitionId);
    const hall = state.halls.find((item) => item.id === hallId);
    const dimensionsAreValid = [patch.physicalWidth, patch.physicalHeight].every(
      (value) => Number.isFinite(value) && value >= 1 && value <= 500,
    );
    if (!exhibition?.hallIds.includes(hallId) || !hall || !dimensionsAreValid) {
      setNotice({
        tone: "error",
        title:
          locale === "fa"
            ? "نام یا ابعاد سالن معتبر نیست"
            : "The hall name or dimensions are invalid",
      });
      return;
    }

    commit(
      {
        action: "hall.updated",
        entityType: "hall",
        entityId: hallId,
        fa: `سالن ${localize(hall.name, "fa")} از ${hall.physicalWidth} × ${hall.physicalHeight} به ${patch.physicalWidth} × ${patch.physicalHeight} متر به‌روزرسانی شد.`,
        en: `${localize(hall.name, "en")} was updated from ${hall.physicalWidth} × ${hall.physicalHeight} to ${patch.physicalWidth} × ${patch.physicalHeight} metres.`,
      },
      (next) => {
        const target = next.halls.find((item) => item.id === hallId);
        if (!target) return;
        target.name = patch.name;
        target.physicalWidth = patch.physicalWidth;
        target.physicalHeight = patch.physicalHeight;
        const updatedAt = new Date().toISOString();
        for (const booth of target.booths) {
          booth.area = Number(
            calculateBoothAreaFromGeometry(target, booth.width, booth.height).toFixed(2),
          );
          booth.updatedAt = updatedAt;
        }
      },
      { fa: "مشخصات سالن و مساحت غرفه‌ها ذخیره شد", en: "Hall details and booth areas saved" },
    );
  }

  function removeHallFromExhibition(exhibitionId: string, hallId: string) {
    const exhibition = state.exhibitions.find((item) => item.id === exhibitionId);
    const hall = state.halls.find((item) => item.id === hallId);
    if (!exhibition || !hall) return;
    if (exhibition.hallIds.length <= 1) {
      setNotice({
        tone: "warning",
        title: locale === "fa" ? "هر نمایشگاه باید حداقل یک سالن داشته باشد" : "Every exhibition needs at least one hall",
      });
      return;
    }
    setConfirmRequest({
      title: locale === "fa" ? `حذف ${localize(hall.name, locale)}؟` : `Remove ${localize(hall.name, locale)}?`,
      body:
        locale === "fa"
          ? `این سالن ${hall.booths.length} غرفه دارد. حذف، نقشه و داده‌های وابسته را از فضای محلی پاک می‌کند؛ سوابق مالی حفظ می‌شوند اما اتصال آن‌ها به غرفه حذف خواهد شد.`
          : `This hall contains ${hall.booths.length} booths. Removing it deletes the plan and dependent local data; financial history is retained but detached from its booth.`,
      confirmLabel: locale === "fa" ? "حذف سالن" : "Remove hall",
      destructive: true,
      action: () => {
        const fallbackHallId = exhibition.hallIds.find((id) => id !== hallId) ?? "";
        commit(
          {
            action: "hall.removed",
            entityType: "hall",
            entityId: hallId,
            fa: `سالن ${localize(hall.name, "fa")} حذف شد.`,
            en: `${localize(hall.name, "en")} was removed.`,
          },
          (next) => {
            next.halls = next.halls.filter((item) => item.id !== hallId);
            const target = next.exhibitions.find((item) => item.id === exhibitionId);
            if (target) target.hallIds = target.hallIds.filter((id) => id !== hallId);
            const validBoothIds = new Set(
              next.halls.flatMap((item) => item.booths.map((booth) => booth.id)),
            );
            next.tasks = detachTasksFromMissingBooths(
              next.tasks,
              validBoothIds,
            );
            const updatedAt = new Date().toISOString();
            for (const account of next.commercialAccounts) {
              if (account.boothId && !validBoothIds.has(account.boothId)) {
                delete account.boothId;
                account.updatedAt = updatedAt;
              }
            }
            if (next.activeHallId === hallId) next.activeHallId = fallbackHallId;
          },
          { fa: "سالن حذف شد", en: "Hall removed" },
        );
        if (state.activeHallId === hallId) {
          const fallbackHall = state.halls.find((item) => item.id === fallbackHallId);
          setSelectedBoothId(fallbackHall?.booths[0]?.id ?? null);
          setSelectedFeatureId(null);
        }
      },
    });
  }

  function openExhibitionOperations(exhibitionId: string, hallId?: string) {
    changeActiveExhibition(exhibitionId, hallId);
    setActiveView(hallId ? "floorplan" : "overview");
    setMenuOpen(false);
  }

  function changeActiveHall(hallId: string, preferredBoothId?: string) {
    const nextHall = state.halls.find((hall) => hall.id === hallId);
    if (!nextHall) return;
    const nextExhibition = state.exhibitions.find((item) => item.hallIds.includes(hallId));
    if (!nextExhibition) return;
    const nextBoothId =
      preferredBoothId && nextHall.booths.some((booth) => booth.id === preferredBoothId)
        ? preferredBoothId
        : nextHall.booths[0]?.id ?? null;
    if (state.activeHallId !== hallId || state.activeExhibitionId !== nextExhibition.id) {
      commit(
        {
          action: "hall.selected",
          entityType: "hall",
          entityId: hallId,
          fa: "سالن " + localize(nextHall.name, "fa") + " به عنوان سالن فعال انتخاب شد.",
          en: localize(nextHall.name, "en") + " was selected as the active hall.",
        },
        (next) => {
          next.activeExhibitionId = nextExhibition.id;
          next.activeHallId = hallId;
        },
      );
    }
    setSelectedBoothId(nextBoothId);
    setSelectedFeatureId(null);
  }

  function openBooth(boothId: string) {
    const owningHall = findHallContainingBooth(state, boothId);
    if (!owningHall) return;
    setSelectedFeatureId(null);
    changeActiveHall(owningHall.id, boothId);
    setActiveView("floorplan");
    setMenuOpen(false);
  }

  function addLead(draft: NewCrmLeadDraft) {
    const now = new Date().toISOString();
    const existingCompany = draft.existingCompanyId
      ? state.companies.find((company) => company.id === draft.existingCompanyId)
      : undefined;
    const newExhibitionIds = draft.exhibitionIds.filter(
      (exhibitionId) =>
        !existingCompany?.participations.some(
          (participation) => participation.exhibitionId === exhibitionId,
        ),
    );
    if (!newExhibitionIds.length) {
      setNotice({
        tone: "warning",
        title:
          locale === "fa"
            ? "این شرکت از قبل به نمایشگاه‌های انتخابی متصل است"
            : "This company is already linked to the selected exhibitions",
      });
      return;
    }
    const companyId = existingCompany?.id ?? makeId("company");
    const leadIds = newExhibitionIds.map(() => makeId("lead"));
    const owner = state.staffUsers.find((staff) => staff.id === draft.ownerId);
    const ownerName = owner?.displayName ?? (locale === "fa" ? "بدون مسئول" : "Unassigned");
    commit(
      {
        action: "lead.created",
        entityType: "company",
        entityId: companyId,
        fa: `سرنخ ${draft.company} ساخته شد.`,
        en: `${draft.company} was added across ${newExhibitionIds.length} exhibition opportunity record(s).`,
      },
      (next) => {
        let company = next.companies.find((item) => item.id === companyId);
        if (!company) {
          company = {
            id: companyId,
            name: draft.company,
            legalName: draft.legalName || draft.company,
            industry: draft.industry,
            country: draft.country,
            city: draft.city,
            website: draft.website,
            lifecycle: "prospect",
            priority: draft.priority,
            tags: [],
            ownerIds: [draft.ownerId, ...draft.collaboratorIds],
            contacts: [],
            participations: [],
            activities: [],
            notes: draft.notes,
            createdAt: now,
            updatedAt: now,
          };
          next.companies.unshift(company);
        }
        if (draft.contactName && !company.contacts.some((contact) => contact.name === draft.contactName)) {
          company.contacts.push({
            id: makeId("contact"),
            name: draft.contactName,
            title: draft.contactTitle,
            phone: draft.contactPhone,
            email: draft.contactEmail,
            preferredChannel: draft.preferredChannel,
            preferredLanguage: locale === "fa" ? "fa" : "en",
            consentStatus: draft.consentStatus,
            primary: company.contacts.length === 0,
          });
        }
        company.priority = draft.priority;
        company.ownerIds = Array.from(new Set([...company.ownerIds, draft.ownerId, ...draft.collaboratorIds]));
        const collaborators = draft.collaboratorIds.map((staffUserId) => {
          const staff = next.staffUsers.find((item) => item.id === staffUserId);
          return {
            staffUserId,
            role: staff?.departments[0] ?? "operations",
            permission: "comment" as const,
            responsibility: locale === "fa" ? "همکاری در پیگیری و اجرای پرونده" : "Collaborate on follow-up and delivery",
          };
        });
        newExhibitionIds.forEach((exhibitionId, index) => {
          const leadId = leadIds[index];
          const lead: SalesLead = {
            id: leadId,
            companyId,
            exhibitionId,
            company: company!.name,
            contactName: draft.contactName || company!.contacts.find((contact) => contact.primary)?.name || "",
            contactChannel: draft.contactPhone || draft.contactEmail || draft.preferredChannel,
            source: draft.source,
            stage: "new",
            owner: ownerName,
            ownerId: draft.ownerId,
            collaborators,
            priority: draft.priority,
            probability: draft.probability,
            requestedServices: draft.requestedServices,
            preferredChannel: draft.preferredChannel,
            consentStatus: draft.consentStatus,
            quotedAmount: draft.quotedAmount,
            currency: draft.currency,
            expectedArea: draft.expectedArea,
            nextActionAt: draft.nextActionAt,
            notes: draft.notes,
            interactions: [],
            createdAt: now,
            updatedAt: now,
          };
          next.leads.unshift(lead);
          company!.participations.push({
            id: makeId("participation"),
            exhibitionId,
            leadId,
            status: "prospect",
            expectedArea: draft.expectedArea,
            requestedServices: draft.requestedServices,
            ownerIds: [draft.ownerId, ...draft.collaboratorIds],
            createdAt: now,
            updatedAt: now,
          });
          company!.activities.unshift({
            id: makeId("crm-activity"),
            kind: "participation",
            ownerId: draft.ownerId,
            summary:
              locale === "fa"
                ? "فرصت نمایشگاهی تازه و اقدام بعدی ثبت شد."
                : "A new exhibition opportunity and next action were recorded.",
            occurredAt: now,
            leadId,
            exhibitionId,
          });
        });
        company.updatedAt = now;
      },
      {
        fa: `${formatCount(newExhibitionIds.length, "fa")} فرصت برای شرکت ساخته شد`,
        en: `${newExhibitionIds.length} opportunity record(s) created`,
      },
    );
  }

  function updateLead(
    leadId: string,
    patch: LeadPatch,
  ) {
    commit(
      {
        action: "lead.updated",
        entityType: "lead",
        entityId: leadId,
        fa: "پرونده سرنخ به‌روزرسانی شد.",
        en: "The lead record was updated.",
      },
      (next) => {
        const lead = next.leads.find((item) => item.id === leadId);
        if (!lead) return;
        const now = new Date().toISOString();
        const previousStage = lead.stage;
        const previousOwnerId = lead.ownerId;
        Object.assign(lead, patch, { updatedAt: now });
        if (patch.ownerId) {
          lead.owner = next.staffUsers.find((staff) => staff.id === patch.ownerId)?.displayName ?? lead.owner;
        }
        const company = next.companies.find((item) => item.id === lead.companyId);
        const participation = company?.participations.find((item) => item.leadId === leadId);
        if (participation) {
          participation.expectedArea = lead.expectedArea;
          participation.ownerIds = Array.from(new Set([lead.ownerId, ...lead.collaborators.map((item) => item.staffUserId)]));
          participation.status = lead.stage === "won" ? "confirmed" : lead.stage === "lost" ? "cancelled" : lead.stage === "new" ? "prospect" : "negotiating";
          participation.updatedAt = now;
        }
        if (company && (previousStage !== lead.stage || previousOwnerId !== lead.ownerId)) {
          company.activities.unshift({
            id: makeId("crm-activity"),
            kind: previousStage !== lead.stage ? "stage" : "assignment",
            ownerId: lead.ownerId,
            summary:
              previousStage !== lead.stage
                ? `${locale === "fa" ? "مرحله فرصت تغییر کرد" : "Opportunity stage changed"}: ${previousStage} → ${lead.stage}`
                : `${locale === "fa" ? "مسئول پرونده تغییر کرد" : "Record owner changed"}: ${lead.owner}`,
            occurredAt: now,
            leadId,
            exhibitionId: lead.exhibitionId,
          });
          company.updatedAt = now;
        }
      },
      { fa: "تغییرات CRM ذخیره شد", en: "CRM changes saved" },
    );
  }

  function updateCompany(companyId: string, patch: CompanyPatch) {
    commit(
      {
        action: "company.updated",
        entityType: "company",
        entityId: companyId,
        fa: "مشخصات و سلامت پرونده شرکت به‌روزرسانی شد.",
        en: "Company profile and account health were updated.",
      },
      (next) => {
        const company = next.companies.find((item) => item.id === companyId);
        if (company) Object.assign(company, patch, { updatedAt: new Date().toISOString() });
      },
      { fa: "پرونده شرکت ذخیره شد", en: "Company record saved" },
    );
  }

  function addLeadInteraction(
    leadId: string,
    interaction: Omit<LeadInteraction, "id" | "occurredAt">,
  ) {
    const interactionId = makeId("lead-interaction");
    commit(
      {
        action: "lead.interaction-recorded",
        entityType: "lead",
        entityId: leadId,
        fa: "یک ارتباط تازه در پرونده سرنخ ثبت شد.",
        en: "A new interaction was recorded on the lead.",
      },
      (next) => {
        const lead = next.leads.find((item) => item.id === leadId);
        if (!lead) return;
        const now = new Date().toISOString();
        lead.interactions.push({ ...interaction, id: interactionId, occurredAt: now });
        lead.updatedAt = now;
        const company = next.companies.find((item) => item.id === lead.companyId);
        if (company) {
          company.activities.unshift({ id: makeId("crm-activity"), kind: interaction.kind, ownerId: lead.ownerId, summary: interaction.summary, occurredAt: now, leadId, exhibitionId: lead.exhibitionId });
          company.updatedAt = now;
        }
      },
      { fa: "ارتباط در تاریخچه ثبت شد", en: "Interaction added to history" },
    );
  }

  function addStaff(draft: NewStaffDraft) {
    const id = makeId("staff");
    const now = new Date().toISOString();
    commit(
      { action: "staff.created", entityType: "staff", entityId: id, fa: `کاربر ${draft.displayName} به ساختار تیم اضافه شد.`, en: `${draft.displayName} was added to the team structure.` },
      (next) => { next.staffUsers.push({ ...draft, id, createdAt: now, updatedAt: now }); },
      { fa: "کاربر با وضعیت دعوت‌شده ساخته شد", en: "Staff user created with invited status" },
    );
  }

  function updateStaff(staffId: string, patch: StaffPatch) {
    const target = state.staffUsers.find((staff) => staff.id === staffId);
    if (!target) return;
    const activeOwners = state.staffUsers.filter((staff) => staff.accessRole === "owner" && staff.status !== "inactive");
    if (target.accessRole === "owner" && activeOwners.length === 1 && ((patch.accessRole && patch.accessRole !== "owner") || patch.status === "inactive")) {
      setNotice({ tone: "error", title: locale === "fa" ? "آخرین مالک فعال قابل حذف یا تنزل نیست" : "The last active owner cannot be removed or downgraded" });
      return;
    }
    if (patch.status === "inactive" && state.leads.some((lead) => lead.ownerId === staffId && !["won", "lost"].includes(lead.stage))) {
      setNotice({ tone: "warning", title: locale === "fa" ? "ابتدا پرونده‌های باز این کاربر را واگذار کنید" : "Reassign this user's open records first" });
      return;
    }
    if (patch.managerId) {
      const seen = new Set([staffId]);
      let cursor: string | undefined = patch.managerId;
      while (cursor) {
        if (seen.has(cursor)) {
          setNotice({ tone: "error", title: locale === "fa" ? "این مدیر باعث چرخه در سلسله‌مراتب می‌شود" : "This manager would create a hierarchy cycle" });
          return;
        }
        seen.add(cursor);
        cursor = state.staffUsers.find((staff) => staff.id === cursor)?.managerId;
      }
    }
    commit(
      { action: "staff.updated", entityType: "staff", entityId: staffId, fa: `جایگاه ${target.displayName} به‌روزرسانی شد.`, en: `${target.displayName}'s staff profile was updated.` },
      (next) => {
        const staff = next.staffUsers.find((item) => item.id === staffId);
        if (staff) Object.assign(staff, patch, { updatedAt: new Date().toISOString() });
      },
      { fa: "تغییرات کاربر ذخیره شد", en: "Staff changes saved" },
    );
  }

  function addCommercialAccount(draft: NewAccountDraft) {
    if (draft.boothId && state.commercialAccounts.some((item) => item.boothId === draft.boothId)) {
      setNotice({
        tone: "error",
        title: locale === "fa" ? "این غرفه از قبل پرونده مالی دارد." : "This booth already has a financial account.",
      });
      return;
    }
    const accountId = makeId("commercial-account");
    commit(
      {
        action: "commercial-account.created",
        entityType: "commercial-account",
        entityId: accountId,
        fa: `پرونده مالی ${draft.company} ساخته شد.`,
        en: `${draft.company} financial account was created.`,
      },
      (next) => {
        next.commercialAccounts.unshift({
          ...draft,
          id: accountId,
          exceptionApproved: false,
          exceptionReason: "",
          payments: [],
          communications: [],
          updatedAt: new Date().toISOString(),
        });
      },
      { fa: "پرونده مالی ساخته شد", en: "Financial account created" },
    );
  }

  function requestAddPayment(accountId: string, draft: NewPaymentDraft) {
    const account = state.commercialAccounts.find((item) => item.id === accountId);
    if (!account) return;
    const currentBalance = calculateCommercialAccount(account).outstanding;
    if (!Number.isFinite(draft.amount) || draft.amount <= 0 || draft.amount > currentBalance) {
      setNotice({ tone: "error", title: locale === "fa" ? "مبلغ پرداخت معتبر نیست." : "The payment amount is invalid." });
      return;
    }
    const formatted = new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US").format(draft.amount);
    setConfirmRequest({
      title: locale === "fa" ? "تایید ثبت پرداخت" : "Confirm payment record",
      body: locale === "fa"
        ? `پرداخت ${formatted} ${account.currency === "IRT" ? "تومان" : account.currency} برای ${account.company} ثبت شود؟ این اقدام در دفتر تغییرات باقی می‌ماند.`
        : `Record ${formatted} ${account.currency} for ${account.company}? This action remains in the audit ledger.`,
      confirmLabel: locale === "fa" ? "ثبت پرداخت" : "Record payment",
      action: () => {
        const paymentId = makeId("payment");
        commit(
          {
            action: "payment.recorded",
            entityType: "commercial-account",
            entityId: accountId,
            fa: `پرداخت ${formatted} برای ${account.company} ثبت شد.`,
            en: `${formatted} was recorded for ${account.company}.`,
          },
          (next) => {
            const target = next.commercialAccounts.find((item) => item.id === accountId);
            if (!target) return;
            target.payments.push({ ...draft, id: paymentId, recordedBy: "Demo operator", status: "recorded" });
            target.updatedAt = new Date().toISOString();
            if (calculateCommercialAccount(target).outstanding === 0 && target.boothId) {
              const hall = next.halls.find((item) => item.booths.some((booth) => booth.id === target.boothId));
              const booth = hall?.booths.find((item) => item.id === target.boothId);
              if (booth) booth.status = "paid";
            }
          },
          { fa: "پرداخت ثبت و مانده به‌روز شد", en: "Payment recorded and balance updated" },
        );
      },
    });
  }

  function addCommercialCommunication(accountId: string, draft: NewCommunicationDraft) {
    const communicationId = makeId("commercial-communication");
    commit(
      {
        action: "commercial-communication.recorded",
        entityType: "commercial-account",
        entityId: accountId,
        fa: "پیگیری مالی در پرونده ثبت شد.",
        en: "A financial follow-up was recorded.",
      },
      (next) => {
        const account = next.commercialAccounts.find((item) => item.id === accountId);
        if (!account) return;
        account.communications.push({ ...draft, id: communicationId, occurredAt: new Date().toISOString() });
        account.updatedAt = new Date().toISOString();
      },
      { fa: "پیگیری مالی ثبت شد", en: "Financial follow-up recorded" },
    );
  }

  function requestSetCommercialException(accountId: string, approved: boolean, reason: string) {
    const account = state.commercialAccounts.find((item) => item.id === accountId);
    if (!account || (approved && !reason.trim())) return;
    setConfirmRequest({
      title: approved
        ? (locale === "fa" ? "تایید استثنای تحویل" : "Approve handover exception")
        : (locale === "fa" ? "لغو استثنای تحویل" : "Revoke handover exception"),
      body: approved
        ? (locale === "fa" ? `با این تایید، تحویل غرفه ${account.company} با وجود مانده بدهی مجاز می‌شود. دلیل و نام تاییدکننده ثبت خواهد شد.` : `${account.company} will become handover-eligible despite an outstanding balance. The reason and approver will be recorded.`)
        : (locale === "fa" ? `استثنای ${account.company} لغو و قانون مسدودسازی بر اساس مانده دوباره اعمال شود؟` : `Revoke ${account.company}'s exception and reapply the balance-based handover block?`),
      confirmLabel: approved ? (locale === "fa" ? "تایید استثنا" : "Approve exception") : (locale === "fa" ? "لغو استثنا" : "Revoke exception"),
      destructive: !approved,
      action: () => commit(
        {
          action: approved ? "handover-exception.approved" : "handover-exception.revoked",
          entityType: "commercial-account",
          entityId: accountId,
          fa: approved ? `استثنای تحویل ${account.company} با دلیل مکتوب تایید شد.` : `استثنای تحویل ${account.company} لغو شد.`,
          en: approved ? `${account.company} handover exception was approved with a written reason.` : `${account.company} handover exception was revoked.`,
        },
        (next) => {
          const target = next.commercialAccounts.find((item) => item.id === accountId);
          if (!target) return;
          target.exceptionApproved = approved;
          target.exceptionReason = approved ? reason.trim() : "";
          target.exceptionApprovedBy = approved ? "Demo commercial manager" : undefined;
          target.updatedAt = new Date().toISOString();
        },
        { fa: approved ? "استثنای تحویل ثبت شد" : "استثنا لغو شد", en: approved ? "Handover exception recorded" : "Exception revoked" },
      ),
    });
  }

  const navItems: Array<{ id: PortalView; label: string; count?: number }> = [
    { id: "exhibitions", label: copy.exhibitions, count: state.exhibitions.length },
    { id: "assistant", label: copy.assistant },
    { id: "crm", label: copy.crm, count: state.leads.filter((item) => item.exhibitionId === activeExhibition?.id && !["won", "lost"].includes(item.stage)).length },
    { id: "team", label: copy.team, count: state.staffUsers.filter((item) => item.status === "active").length },
    { id: "payments", label: copy.payments, count: state.commercialAccounts.filter((item) => item.exhibitionId === activeExhibition?.id && calculateCommercialAccount(item).outstanding > 0 && !item.exceptionApproved).length },
    { id: "content", label: copy.contentStudio },
    { id: "overview", label: copy.overview },
    { id: "floorplan", label: copy.floorplan, count: activeHall?.booths.length },
    { id: "logistics", label: copy.logistics, count: metrics.lines },
    { id: "tasks", label: copy.tasks, count: metrics.openTasks },
    { id: "exhibitors", label: copy.exhibitors, count: metrics.assigned },
    { id: "activity", label: copy.activity },
  ];

  return (
    <main
      className={styles.portal}
      dir={locale === "fa" ? "rtl" : "ltr"}
      lang={locale}
      data-theme={theme}
    >
      <div
        className={[
          styles.shell,
          sidebarCollapsed ? styles.shellCollapsed : "",
        ].join(" ")}
      >
        <aside id="staff-primary-navigation" className={styles.sidebar}>
          <PortalSidebar
            locale={locale}
            copy={copy}
            navItems={navItems}
            activeView={activeView}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((current) => !current)}
            onNavigate={(view) => {
              setActiveView(view);
              setMenuOpen(false);
            }}
          />
        </aside>

        <dialog
          ref={mobileDialogRef}
          className={styles.mobileDialog}
          onClose={() => setMenuOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setMenuOpen(false);
          }}
        >
          <div className={styles.mobileDialogPanel}>
            <div className="flex justify-end p-3">
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-white"
                aria-label={copy.close}
              >
                <X size={19} />
              </button>
            </div>
            <PortalSidebar
              locale={locale}
              copy={copy}
              navItems={navItems}
              activeView={activeView}
              onNavigate={(view) => {
                setActiveView(view);
                setMenuOpen(false);
              }}
              compact
            />
          </div>
        </dialog>

        <section className={styles.workspace}>
          <PortalHeader
            locale={locale}
            copy={copy}
            state={state}
            activeExhibition={activeExhibition}
            exhibitionHalls={activeExhibitionHalls}
            activeExhibitionId={activeExhibition?.id ?? ""}
            activeHallId={activeHall?.id ?? ""}
            searchQuery={searchQuery}
            showSearch={
              activeView === "floorplan" ||
              activeView === "logistics" ||
              activeView === "exhibitors"
            }
            saveState={saveState}
            attentionCount={metrics.attention + metrics.openTasks}
            onOpenMenu={() => setMenuOpen(true)}
            onSearch={setSearchQuery}
            onExhibitionChange={changeActiveExhibition}
            onHallChange={changeActiveHall}
            theme={theme}
            onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            onSave={saveNow}
            onOpenTasks={() => setActiveView("tasks")}
          />

          <ProviderStrip locale={locale} copy={copy} storageStatus={storageStatus} />

          <div className="mx-auto mt-5 max-w-[106rem]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
                {activeView === "exhibitions" ? (
                  <ExhibitionWorkspace
                    locale={locale}
                    state={state}
                    onSelectExhibition={changeActiveExhibition}
                    onOpenOperations={openExhibitionOperations}
                    onAddExhibition={addExhibition}
                    onUpdateExhibition={updateExhibition}
                    onRemoveExhibition={removeExhibition}
                    onAddHall={addHallToExhibition}
                    onUpdateHall={updateHallInExhibition}
                    onRemoveHall={removeHallFromExhibition}
                  />
                ) : null}
                {activeView === "assistant" ? (
                  <AssistantWorkspace
                    locale={locale}
                    state={state}
                    onNavigate={(target) => setActiveView(target)}
                  />
                ) : null}
                {activeView === "crm" ? (
                  <CrmWorkspace
                    locale={locale}
                    state={state}
                    onAddLead={addLead}
                    onUpdateLead={updateLead}
                    onUpdateCompany={updateCompany}
                    onAddInteraction={addLeadInteraction}
                  />
                ) : null}
                {activeView === "team" ? (
                  <StaffWorkspace
                    locale={locale}
                    state={state}
                    onAddStaff={addStaff}
                    onUpdateStaff={updateStaff}
                  />
                ) : null}
                {activeView === "payments" ? (
                  <FinanceWorkspace
                    locale={locale}
                    state={state}
                    onOpenBooth={openBooth}
                    onAddAccount={addCommercialAccount}
                    onAddPayment={requestAddPayment}
                    onAddCommunication={addCommercialCommunication}
                    onSetException={requestSetCommercialException}
                  />
                ) : null}
                {activeView === "content" ? (
                  <AdminPanel embedded initialLang={locale} />
                ) : null}
                {activeView === "overview" ? (
                  <OverviewPanel
                    locale={locale}
                    copy={copy}
                    state={exhibitionState}
                    metrics={metrics}
                    activeHall={activeHall}
                    onOpenFloorplan={() => setActiveView("floorplan")}
                    onOpenLogistics={() => setActiveView("logistics")}
                    onOpenBooth={openBooth}
                    onAdvanceTask={advanceTask}
                  />
                ) : null}
                {activeView === "floorplan" && activeHall ? (
                  <FloorplanPanel
                    locale={locale}
                    copy={copy}
                    hall={activeHall}
                    catalog={catalog}
                    selectedBooth={selectedBooth}
                    selectedFeatureId={selectedFeatureId}
                    selectedBoothActivity={activeBoothActivity}
                    searchQuery={searchQuery}
                    statusFilter={statusFilter}
                    overlay={overlay}
                    editMode={editMode}
                    layers={layers}
                    referenceImage={referenceImages[activeHall.id]}
                    planImportBusy={planImportBusy}
                    mobileMapMode={mobileMapMode}
                    onMobileMapMode={setMobileMapMode}
                    onStatusFilter={setStatusFilter}
                    onOverlay={setOverlay}
                    onEditMode={() =>
                      setEditMode((current) => {
                        if (current) setSelectedFeatureId(null);
                        return !current;
                      })
                    }
                    onLayers={setLayers}
                    onSelectBooth={setSelectedBoothId}
                    onMoveBooth={updateBoothPosition}
                    onMoveComplete={completeBoothMove}
                    onUpdateBoothGeometry={updateBoothGeometry}
                    onCommitBoothGeometry={commitBoothGeometry}
                    onApplyBoothDimensions={applySelectedBoothDimensions}
                    onSelectFeature={setSelectedFeatureId}
                    onUpdateFeature={updateFeature}
                    onCommitFeature={commitFeature}
                    onDeleteFeature={deleteFeature}
                    onUpdateBooth={updateSelectedBooth}
                    onAddEquipment={addEquipment}
                    onChangeEquipmentQuantity={changeEquipmentQuantity}
                    onUpdateEquipmentLine={updateEquipmentLine}
                    onAdvanceEquipment={(lineId) => advanceEquipment(lineId)}
                    onSetEquipmentIssue={setEquipmentIssue}
                    onRecordCollection={recordEquipmentCollection}
                    onRemoveEquipment={removeEquipment}
                    onMarkAllDelivered={() => markAll("delivered")}
                    onMarkAllCollected={() => markAll("collected")}
                    onCreateTask={createBoothTask}
                    onDeleteBooth={deleteSelectedBooth}
                    onAddBooth={addBooth}
                    onAddFeature={addFeature}
                    onImport={() => importInputRef.current?.click()}
                    onPlanImport={() => planInputRef.current?.click()}
                    onReferenceImage={() => imageInputRef.current?.click()}
                    onExport={exportFullSnapshot}
                    onExportPublic={exportPublicPlan}
                    onRestore={restoreTemplate}
                  />
                ) : null}
                {activeView === "logistics" && activeHall ? (
                  <LogisticsPanel
                    locale={locale}
                    copy={copy}
                    hall={activeHall}
                    inventoryItems={inventoryItems}
                    inventoryTotals={inventoryTotals}
                    searchQuery={searchQuery}
                    onOpenBooth={openBooth}
                    onAdvance={advanceEquipment}
                    onUploadInventory={readInventoryFile}
                    onAddInventoryItem={addInventoryMaterial}
                    onUpdateInventoryOnHand={updateInventoryOnHand}
                    onUpdateInventoryItem={updateInventoryItem}
                    onArchiveInventoryItems={archiveInventoryItems}
                    onRemoveInventoryItems={requestRemoveInventoryItems}
                  />
                ) : null}
                {activeView === "tasks" ? (
                  <TasksPanel
                    locale={locale}
                    copy={copy}
                    tasks={state.tasks}
                    booths={getAllBooths(state)}
                    taskDraft={taskDraft}
                    onTaskDraft={setTaskDraft}
                    onSubmit={submitTask}
                    onAdvance={advanceTask}
                    onOpenBooth={openBooth}
                  />
                ) : null}
                {activeView === "exhibitors" ? (
                  <ExhibitorsPanel
                    locale={locale}
                    copy={copy}
                    halls={activeExhibitionHalls}
                    searchQuery={searchQuery}
                    onOpenBooth={openBooth}
                  />
                ) : null}
                {activeView === "activity" ? (
                  <ActivityPanel
                    locale={locale}
                    copy={copy}
                    audit={state.audit}
                  />
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </div>

      <input
        ref={importInputRef}
        type="file"
        accept=".json,.csv,application/json,text/csv"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void readImportFile(file);
        }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) readReferenceImage(file);
        }}
      />
      <input
        ref={planInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf,image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void readImportFile(file);
        }}
      />

      <AnimatePresence>
        {notice ? <PortalNotice notice={notice} onClose={() => setNotice(null)} /> : null}
      </AnimatePresence>
      <ConfirmDialog
        locale={locale}
        copy={copy}
        request={confirmRequest}
        onClose={() => setConfirmRequest(null)}
      />
      <ImportDialog
        locale={locale}
        copy={copy}
        preview={importPreview}
        onClose={() => setImportPreview(null)}
        onApply={applyImport}
        onPlanOptions={(patch) =>
          setImportPreview((current) =>
            current?.kind === "plan" ? { ...current, ...patch } : current,
          )
        }
      />
    </main>
  );
}

function PortalSidebar({
  locale,
  copy,
  navItems,
  activeView,
  onNavigate,
  compact = false,
  collapsed = false,
  onToggle,
}: {
  locale: PortalLocale;
  copy: PortalCopy;
  navItems: Array<{ id: PortalView; label: string; count?: number }>;
  activeView: PortalView;
  onNavigate: (view: PortalView) => void;
  compact?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const collapseLabel =
    locale === "fa" ? "جمع کردن نوار راهبری" : "Collapse navigation";
  const expandLabel =
    locale === "fa" ? "باز کردن نوار راهبری" : "Expand navigation";
  const ToggleIcon = collapsed
    ? locale === "fa"
      ? ChevronsLeft
      : ChevronsRight
    : locale === "fa"
      ? ChevronsRight
      : ChevronsLeft;

  return (
    <div
      className={[
        "flex min-h-full flex-col",
        compact
          ? "px-4 pb-5"
          : collapsed
            ? "px-2 py-4"
            : "px-4 py-5",
      ].join(" ")}
    >
      <div
        className={[
          "flex border-b border-white/10 pb-4",
          collapsed ? "flex-col items-center gap-3" : "items-center gap-3 px-2",
        ].join(" ")}
      >
        <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[#d4aa55]/25 bg-[#d4aa55]/10">
          <Image
            src="/brand-v2/aratta-official-mark.png"
            alt=""
            width={48}
            height={48}
            className="h-11 w-11 object-contain"
            unoptimized
          />
        </div>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white">ARATTA EXPO</p>
            <p className="mt-1 truncate text-[0.64rem] font-bold uppercase tracking-[0.16em] text-white/45">
              {copy.workspace}
            </p>
          </div>
        ) : null}
        {!compact && onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.055] text-white/68 transition hover:bg-white/[0.1] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa55]/60"
            aria-label={collapsed ? expandLabel : collapseLabel}
            aria-expanded={!collapsed}
            aria-controls="staff-primary-navigation"
            title={collapsed ? expandLabel : collapseLabel}
          >
            <ToggleIcon size={17} aria-hidden />
          </button>
        ) : null}
      </div>

      {!collapsed ? (
        <div className="mt-5 px-2">
          <span className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-[#d4aa55]">
            {copy.workflow}
          </span>
        </div>
      ) : null}
      <nav
        className={["grid gap-1.5", collapsed ? "mt-4" : "mt-3"].join(" ")}
        aria-label={copy.workflow}
      >
        {navItems.map((item) => {
          const Icon = viewIcons[item.id];
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-label={collapsed ? item.label : undefined}
              title={collapsed ? item.label : undefined}
              className={[
                "group flex min-h-12 items-center rounded-xl py-2.5 text-start text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa55]/55",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                active
                  ? "bg-white/[0.105] text-white ring-1 ring-white/10"
                  : "text-white/58 hover:bg-white/[0.055] hover:text-white",
              ].join(" ")}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={[
                  "grid size-8 shrink-0 place-items-center rounded-lg transition",
                  active
                    ? "bg-[#d4aa55]/18 text-[#e3bd6d]"
                    : "bg-white/[0.04] text-white/50 group-hover:text-white",
                ].join(" ")}
              >
                <Icon size={17} aria-hidden />
              </span>
              {!collapsed ? (
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              ) : null}
              {!collapsed && typeof item.count === "number" && item.count > 0 ? (
                <span
                  className={[
                    "min-w-6 rounded-full px-1.5 py-1 text-center text-[0.65rem] font-black",
                    active ? "bg-[#d4aa55]/18 text-[#e8c779]" : "bg-white/[0.06] text-white/45",
                  ].join(" ")}
                >
                  {formatCount(item.count, locale)}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-6">
        {!collapsed ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3.5">
            <div className="flex items-center gap-2 text-[#8cd7c0]">
              <HardDrive size={15} aria-hidden />
              <span className="text-xs font-black">{copy.localMode}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-white/43">{copy.localModeBody}</p>
          </div>
        ) : (
          <div
            className="mx-auto grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-[#8cd7c0]"
            title={copy.localMode}
            aria-label={copy.localMode}
          >
            <HardDrive size={17} aria-hidden />
          </div>
        )}
        <div
          className={[
            "mt-3 flex items-center py-2",
            collapsed ? "justify-center" : "gap-3 px-2",
          ].join(" ")}
        >
          <div className="grid size-9 place-items-center rounded-full bg-[#d4aa55]/14 text-xs font-black text-[#efcf89]">
            AO
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white/82">{copy.currentSession}</p>
              <p className="mt-0.5 text-[0.65rem] text-white/38">
                {locale === "fa" ? "جلسه آزمایشی محلی" : "Local prototype session"}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PortalHeader({
  locale,
  copy,
  state,
  activeExhibition,
  exhibitionHalls,
  activeExhibitionId,
  activeHallId,
  searchQuery,
  showSearch,
  saveState,
  attentionCount,
  onOpenMenu,
  onSearch,
  onExhibitionChange,
  onHallChange,
  theme,
  onToggleTheme,
  onSave,
  onOpenTasks,
}: {
  locale: PortalLocale;
  copy: PortalCopy;
  state: PortalState;
  activeExhibition?: Exhibition;
  exhibitionHalls: Hall[];
  activeExhibitionId: string;
  activeHallId: string;
  searchQuery: string;
  showSearch: boolean;
  saveState: "saved" | "saving" | "error";
  attentionCount: number;
  onOpenMenu: () => void;
  onSearch: (value: string) => void;
  onExhibitionChange: (exhibitionId: string) => void;
  onHallChange: (hallId: string) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onSave: () => void;
  onOpenTasks: () => void;
}) {
  const alternateLocale: PortalLocale = locale === "fa" ? "en" : "fa";
  return (
    <header className="mx-auto max-w-[106rem]">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#13372f]/10 bg-white/72 p-2.5 shadow-[0_10px_32px_rgba(18,49,42,0.05)] backdrop-blur-xl">
        <button
          type="button"
          onClick={onOpenMenu}
          className="grid size-11 place-items-center rounded-xl border border-[#13372f]/10 bg-white text-[#153a30] lg:hidden"
          aria-label={locale === "fa" ? "باز کردن فهرست" : "Open navigation"}
        >
          <Menu size={19} />
        </button>

        <div className="min-w-[12rem] flex-1 px-1 sm:flex-none">
          <div className="flex items-center gap-2">
            <span className="text-[0.62rem] font-black uppercase tracking-[0.19em] text-[#9b742e]">
              {copy.operations}
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[0.6rem] font-black text-amber-800">
              {copy.archivedTemplate}
            </span>
          </div>
          <h1 className="mt-1 truncate text-lg font-black text-[#102b24]">
            {activeExhibition ? localize(activeExhibition.name, locale) : localize(state.eventName, locale)}
          </h1>
        </div>

        <label className="relative hidden min-w-64 2xl:block">
          <span className="sr-only">{copy.activeExhibition}</span>
          <CalendarDays
            size={16}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#36564e]"
          />
          <select
            value={activeExhibitionId}
            onChange={(event) => onExhibitionChange(event.target.value)}
            className="min-h-11 w-full appearance-none rounded-xl border border-[#13372f]/10 bg-[#f6f6f1] py-2.5 pe-9 ps-9 text-sm font-bold text-[#183d34] outline-none transition focus:border-[#198ba0]/45"
          >
            {state.exhibitions.map((exhibition) => (
              <option key={exhibition.id} value={exhibition.id}>
                {localize(exhibition.name, locale)} · {formatCount(exhibition.hallIds.length, locale)} {locale === "fa" ? "سالن" : "halls"}
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[#36564e]" />
        </label>

        <label className="relative hidden min-w-52 xl:block">
          <span className="sr-only">{copy.activeHall}</span>
          <Warehouse
            size={16}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#36564e]"
          />
          <select
            value={activeHallId}
            onChange={(event) => onHallChange(event.target.value)}
            className="min-h-11 w-full appearance-none rounded-xl border border-[#13372f]/10 bg-[#f6f6f1] py-2.5 pe-9 ps-9 text-sm font-bold text-[#183d34] outline-none transition focus:border-[#198ba0]/45"
          >
            {exhibitionHalls.map((hall) => (
              <option key={hall.id} value={hall.id}>
                {localize(hall.name, locale)} · {hall.physicalWidth}×{hall.physicalHeight}
                {hall.unit}
              </option>
            ))}
          </select>
          <ChevronDown
            size={15}
            className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[#36564e]"
          />
        </label>

        {showSearch ? (
          <label className="relative order-last w-full lg:order-none lg:min-w-64 lg:flex-1">
            <span className="sr-only">{copy.search}</span>
            <Search
              size={17}
              className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[#698078]"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearch(event.target.value)}
              placeholder={copy.search}
              className="min-h-11 w-full rounded-xl border border-[#13372f]/10 bg-white py-2.5 pe-4 ps-10 text-sm font-semibold text-[#183d34] outline-none transition placeholder:text-[#6c7c77] focus:border-[#198ba0]/50 focus:ring-2 focus:ring-[#198ba0]/10"
            />
          </label>
        ) : (
          <span className="hidden flex-1 lg:block" aria-hidden="true" />
        )}

        <Link
          href={"/" + alternateLocale + "/staff"}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#13372f]/10 bg-white px-3 text-sm font-black text-[#183d34] transition hover:bg-[#f4f4ef]"
          aria-label={locale === "fa" ? "Switch to English" : "تغییر به فارسی"}
        >
          <Languages size={17} />
          <span>{alternateLocale.toUpperCase()}</span>
        </Link>

        <button
          type="button"
          onClick={onToggleTheme}
          className="grid size-11 place-items-center rounded-xl border border-[#13372f]/10 bg-white text-[#183d34] transition hover:bg-[#f4f4ef]"
          aria-label={
            theme === "dark"
              ? locale === "fa" ? "فعال کردن پس‌زمینه روشن" : "Use light background"
              : locale === "fa" ? "فعال کردن پس‌زمینه تیره" : "Use dark background"
          }
          aria-pressed={theme === "dark"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          type="button"
          onClick={onOpenTasks}
          className="relative grid size-11 place-items-center rounded-xl border border-[#13372f]/10 bg-white text-[#183d34] transition hover:bg-[#f4f4ef]"
          aria-label={copy.openTasks}
        >
          <Bell size={18} />
          {attentionCount > 0 ? (
            <span className="absolute -end-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-rose-600 px-1 text-[0.6rem] font-black text-white">
              {formatCount(Math.min(attentionCount, 99), locale)}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={onSave}
          className={[
            "inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-black text-white shadow-sm transition",
            saveState === "error"
              ? "bg-rose-700 hover:bg-rose-800"
              : "bg-[#12372e] hover:bg-[#1a493d]",
          ].join(" ")}
          aria-label={
            saveState === "error"
              ? locale === "fa"
                ? "تلاش دوباره برای ذخیره"
                : "Retry local save"
              : saveState === "saving"
                ? copy.saving
                : copy.save
          }
        >
          {saveState === "saving" ? (
            <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none" />
          ) : saveState === "error" ? (
            <AlertTriangle size={17} />
          ) : (
            <Save size={17} />
          )}
          <span className="hidden sm:inline">
            {saveState === "saving"
              ? copy.saving
              : saveState === "error"
                ? locale === "fa"
                  ? "تلاش ذخیره"
                  : "Retry save"
                : copy.save}
          </span>
        </button>
      </div>

      <div className="mt-2 grid gap-2 xl:hidden md:grid-cols-2">
        <label className="relative block">
          <span className="sr-only">{copy.activeExhibition}</span>
          <CalendarDays size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#36564e]" />
          <select value={activeExhibitionId} onChange={(event) => onExhibitionChange(event.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-[#13372f]/10 bg-white/90 py-2.5 pe-9 ps-9 text-sm font-bold text-[#183d34] outline-none">
            {state.exhibitions.map((exhibition) => <option key={exhibition.id} value={exhibition.id}>{localize(exhibition.name, locale)}</option>)}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[#36564e]" />
        </label>
        <label className="relative block">
          <span className="sr-only">{copy.activeHall}</span>
          <Warehouse size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#36564e]" />
          <select value={activeHallId} onChange={(event) => onHallChange(event.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-[#13372f]/10 bg-white/90 py-2.5 pe-9 ps-9 text-sm font-bold text-[#183d34] outline-none">
            {exhibitionHalls.map((hall) => <option key={hall.id} value={hall.id}>{localize(hall.name, locale)} · {hall.physicalWidth}×{hall.physicalHeight}{hall.unit}</option>)}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[#36564e]" />
        </label>
      </div>
    </header>
  );
}

function ProviderStrip({
  locale,
  copy,
  storageStatus,
}: {
  locale: PortalLocale;
  copy: PortalCopy;
  storageStatus: StorageStatus;
}) {
  const storageActive = storageStatus === "active";
  const storageError = storageStatus === "error";
  return (
    <div
      className="mx-auto mt-2 flex max-w-[106rem] flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-[#13372f]/8 bg-white/56 px-4 py-2.5 text-[0.7rem] font-bold text-[#526861]"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-2">
        <span
          className={[
            "size-1.5 rounded-full text-emerald-500",
            storageActive ? styles.pulseDot : "",
            storageActive
              ? "bg-emerald-500"
              : storageError
                ? "bg-rose-600"
                : "bg-amber-500",
          ].join(" ")}
        />
        {storageActive
          ? locale === "fa"
            ? "ذخیره مرورگر فعال"
            : "Browser storage active"
          : storageError
            ? locale === "fa"
              ? "ذخیره مرورگر در دسترس نیست"
              : "Browser storage unavailable"
          : locale === "fa"
            ? "در حال آماده سازی"
            : "Preparing workspace"}
      </span>
      <span className="inline-flex items-center gap-2">
        <CloudOff size={13} className="text-amber-600" />
        {copy.noBackend}
      </span>
      <span className="inline-flex items-center gap-2">
        <LockKeyhole size={13} className="text-[#198ba0]" />
        {locale === "fa"
          ? "داده نمونه بدون اطلاعات تماس خصوصی"
          : "Safe sample data with no private contacts"}
      </span>
      <span className="ms-auto hidden items-center gap-2 md:inline-flex">
        <Command size={13} />
        {locale === "fa" ? "نسخه محلی ۳" : "Local revision 3"}
      </span>
    </div>
  );
}

function SectionIntro({
  eyebrow,
  title,
  body,
  actions,
}: {
  eyebrow: string;
  title: string;
  body: string;
  actions?: React.ReactNode;
}) {
  return (
    <header data-portal-intro className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[#9b742e]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.025em] text-[#102b24] sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#60736d]">{body}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  meta,
  tone,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  meta: string;
  tone: "gold" | "cyan" | "green" | "rose";
}) {
  const tones = {
    gold: "bg-[#b78936]/10 text-[#9b742e]",
    cyan: "bg-cyan-500/10 text-cyan-700",
    green: "bg-emerald-500/10 text-emerald-700",
    rose: "bg-rose-500/10 text-rose-700",
  };
  return (
    <article className={[styles.surface, "rounded-2xl p-4 sm:p-5"].join(" ")}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-black uppercase tracking-[0.13em] text-[#6e7e78]">{label}</p>
        <span className={["grid size-9 place-items-center rounded-xl", tones[tone]].join(" ")}>
          <Icon size={17} />
        </span>
      </div>
      <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#102b24]">{value}</p>
      <p className="mt-1.5 text-xs font-semibold text-[#72817c]">{meta}</p>
    </article>
  );
}

function ProgressBar({
  value,
  label,
  locale,
  tone = "green",
}: {
  value: number;
  label: string;
  locale: PortalLocale;
  tone?: "green" | "cyan" | "gold";
}) {
  const fill = {
    green: "bg-emerald-500",
    cyan: "bg-[#198ba0]",
    gold: "bg-[#b78936]",
  };
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold">
        <span className="text-[#4f645d]">{label}</span>
        <span className="font-black text-[#17372f]">{formatCount(value, locale)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#dce2dd]">
        <motion.div
          className={["h-full rounded-full", fill[tone]].join(" ")}
          initial={{ width: 0 }}
          animate={{ width: String(Math.max(0, Math.min(100, value))) + "%" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function OverviewPanel({
  locale,
  copy,
  state,
  metrics,
  activeHall,
  onOpenFloorplan,
  onOpenLogistics,
  onOpenBooth,
  onAdvanceTask,
}: {
  locale: PortalLocale;
  copy: PortalCopy;
  state: PortalState;
  metrics: ReturnType<typeof deriveMetrics>;
  activeHall?: Hall;
  onOpenFloorplan: () => void;
  onOpenLogistics: () => void;
  onOpenBooth: (boothId: string) => void;
  onAdvanceTask: (taskId: string) => void;
}) {
  const openTasks = state.tasks
    .filter((task) => task.status !== "done")
    .sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 };
      return rank[a.priority] - rank[b.priority] || a.dueAt.localeCompare(b.dueAt);
    })
    .slice(0, 5);
  const recent = state.audit.slice(0, 5);
  const attentionBooths =
    activeHall?.booths
      .filter(
        (booth) =>
          booth.status === "attention" ||
          booth.equipment.some((line) => line.stage === "issue"),
      )
      .slice(0, 4) ?? [];

  return (
    <>
      <SectionIntro
        eyebrow={copy.overview}
        title={copy.commandCenter}
        body={copy.commandBody}
        actions={
          <>
            <button
              type="button"
              onClick={onOpenFloorplan}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#14392f]/12 bg-white px-4 text-sm font-black text-[#17372f] shadow-sm transition hover:bg-[#f8f8f4]"
            >
              <Map size={16} />
              {copy.openFloorplan}
            </button>
            <button
              type="button"
              onClick={onOpenLogistics}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#12372e] px-4 text-sm font-black text-white transition hover:bg-[#1b493e]"
            >
              <Truck size={16} />
              {copy.viewLogistics}
            </button>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Building2}
          label={copy.booths}
          value={formatCount(metrics.booths, locale)}
          meta={
            formatCount(metrics.assigned, locale) +
            " " +
            (locale === "fa" ? "غرفه تخصیص یافته" : "assigned")
          }
          tone="gold"
        />
        <KpiCard
          icon={CheckCircle2}
          label={copy.ready}
          value={formatCount(metrics.ready, locale)}
          meta={formatCount(metrics.readiness, locale) + "% " + copy.operationalReadiness}
          tone="green"
        />
        <KpiCard
          icon={PackageCheck}
          label={copy.delivered}
          value={formatCount(metrics.delivered, locale)}
          meta={
            formatCount(metrics.lines, locale) +
            " " +
            (locale === "fa" ? "ردیف تجهیزاتی" : "equipment lines")
          }
          tone="cyan"
        />
        <KpiCard
          icon={AlertTriangle}
          label={copy.attention}
          value={formatCount(metrics.attention + metrics.openTasks, locale)}
          meta={
            formatCount(metrics.openTasks, locale) +
            " " +
            (locale === "fa" ? "کار باز" : "open tasks")
          }
          tone="rose"
        />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(19rem,0.7fr)]">
        <article className={[styles.surface, "rounded-2xl p-4 sm:p-5"].join(" ")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.67rem] font-black uppercase tracking-[0.18em] text-[#9b742e]">
                {copy.activeHall}
              </p>
              <h3 className="mt-1.5 text-xl font-black text-[#15352d]">
                {activeHall ? localize(activeHall.name, locale) : "—"}
              </h3>
              {activeHall ? (
                <p className="mt-1 text-xs font-semibold text-[#6c7d77]">
                  {activeHall.physicalWidth} × {activeHall.physicalHeight}
                  {activeHall.unit} · {formatCount(activeHall.booths.length, locale)} {copy.booths}
                </p>
              ) : null}
            </div>
            <span className="rounded-full border border-[#14392f]/10 bg-[#edf1ed] px-3 py-1.5 text-xs font-black text-[#34584e]">
              {copy.archivedTemplate}
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <ProgressBar value={metrics.occupancy} label={copy.occupancy} locale={locale} tone="gold" />
            <ProgressBar
              value={metrics.readiness}
              label={copy.operationalReadiness}
              locale={locale}
              tone="green"
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {boothStatuses.map((status) => {
              const count =
                activeHall?.booths.filter((booth) => booth.status === status).length ?? 0;
              return (
                <div key={status} className="rounded-xl border border-[#14392f]/8 bg-[#f8f8f4] p-3">
                  <p className="text-lg font-black text-[#15352d]">{formatCount(count, locale)}</p>
                  <p className="mt-1 truncate text-[0.66rem] font-bold text-[#667a73]">
                    {localize(statusLabels[status], locale)}
                  </p>
                </div>
              );
            })}
          </div>

          {attentionBooths.length ? (
            <div className="mt-5 border-t border-[#14392f]/8 pt-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-700">
                {copy.attention}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {attentionBooths.map((booth) => (
                  <button
                    key={booth.id}
                    type="button"
                    onClick={() => onOpenBooth(booth.id)}
                    className="flex min-h-12 items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/65 px-3 text-start transition hover:border-rose-200"
                  >
                    <span className="grid size-8 place-items-center rounded-lg bg-rose-100 text-xs font-black text-rose-800">
                      {booth.code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-black text-[#203d35]">
                        {booth.company || copy.unassigned}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.65rem] text-[#687a74]">
                        {booth.equipment.filter((line) => line.stage === "issue").length
                          ? locale === "fa"
                            ? "مشکل تجهیزاتی ثبت شده"
                            : "Equipment issue recorded"
                          : localize(statusLabels[booth.status], locale)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </article>

        <div className="grid gap-4">
          <article className={[styles.surface, "rounded-2xl p-4 sm:p-5"].join(" ")}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black text-[#15352d]">{copy.priorityQueue}</h3>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-800">
                {formatCount(openTasks.length, locale)}
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {openTasks.length ? (
                openTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-[#14392f]/8 bg-[#fafaf7] p-3"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={[
                          "mt-1 size-2 rounded-full",
                          task.priority === "high"
                            ? "bg-rose-500"
                            : task.priority === "medium"
                              ? "bg-amber-500"
                              : "bg-slate-400",
                        ].join(" ")}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black leading-5 text-[#203d35]">
                          {localize(task.title, locale)}
                        </p>
                        <p className="mt-1 text-[0.65rem] font-semibold text-[#71807b]">
                          {task.owner} · {formatPortalDate(task.dueAt, locale)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAdvanceTask(task.id)}
                        className="grid size-11 shrink-0 place-items-center rounded-lg border border-[#14392f]/10 bg-white text-[#31564c] transition hover:bg-emerald-50 hover:text-emerald-700"
                        aria-label={copy.advance}
                      >
                        <Check size={15} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyInline locale={locale} />
              )}
            </div>
          </article>

          <article className={[styles.surface, "rounded-2xl p-4 sm:p-5"].join(" ")}>
            <h3 className="text-sm font-black text-[#15352d]">{copy.recentMovement}</h3>
            <div className="mt-3 grid gap-3">
              {recent.map((event) => (
                <div key={event.id} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#198ba0]" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-5 text-[#36554d]">
                      {localize(event.summary, locale)}
                    </p>
                    <p className="mt-0.5 text-[0.62rem] text-[#7a8883]">
                      {event.actor} · {formatPortalDate(event.timestamp, locale)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}

function EmptyInline({ locale }: { locale: PortalLocale }) {
  return (
    <div className="rounded-xl border border-dashed border-[#14392f]/14 bg-[#f7f8f4] px-4 py-6 text-center text-xs font-bold text-[#71807b]">
      {locale === "fa" ? "در حال حاضر مورد بازی وجود ندارد." : "There is nothing open right now."}
    </div>
  );
}

function FloorplanPanel({
  locale,
  copy,
  hall,
  catalog,
  selectedBooth,
  selectedFeatureId,
  selectedBoothActivity,
  searchQuery,
  statusFilter,
  overlay,
  editMode,
  layers,
  referenceImage,
  planImportBusy,
  mobileMapMode,
  onMobileMapMode,
  onStatusFilter,
  onOverlay,
  onEditMode,
  onLayers,
  onSelectBooth,
  onMoveBooth,
  onMoveComplete,
  onUpdateBoothGeometry,
  onCommitBoothGeometry,
  onApplyBoothDimensions,
  onSelectFeature,
  onUpdateFeature,
  onCommitFeature,
  onDeleteFeature,
  onUpdateBooth,
  onAddEquipment,
  onChangeEquipmentQuantity,
  onUpdateEquipmentLine,
  onAdvanceEquipment,
  onSetEquipmentIssue,
  onRecordCollection,
  onRemoveEquipment,
  onMarkAllDelivered,
  onMarkAllCollected,
  onCreateTask,
  onDeleteBooth,
  onAddBooth,
  onAddFeature,
  onImport,
  onPlanImport,
  onReferenceImage,
  onExport,
  onExportPublic,
  onRestore,
}: {
  locale: PortalLocale;
  copy: PortalCopy;
  hall: Hall;
  catalog: ReturnType<typeof inventoryItemsToCatalog>;
  selectedBooth: Booth | null;
  selectedFeatureId: string | null;
  selectedBoothActivity: AuditEvent[];
  searchQuery: string;
  statusFilter: "all" | BoothStatus;
  overlay: HallOverlayMode;
  editMode: boolean;
  layers: HallCanvasLayers;
  referenceImage?: string;
  planImportBusy: boolean;
  mobileMapMode: "map" | "list";
  onMobileMapMode: (mode: "map" | "list") => void;
  onStatusFilter: (status: "all" | BoothStatus) => void;
  onOverlay: (overlay: HallOverlayMode) => void;
  onEditMode: () => void;
  onLayers: (layers: HallCanvasLayers) => void;
  onSelectBooth: (boothId: string) => void;
  onMoveBooth: (boothId: string, x: number, y: number) => void;
  onMoveComplete: (boothId: string) => void;
  onUpdateBoothGeometry: (boothId: string, patch: BoothGeometryPatch) => void;
  onCommitBoothGeometry: (boothId: string, patch: BoothGeometryPatch) => void;
  onApplyBoothDimensions: (dimensions: BoothDimensions) => void;
  onSelectFeature: (featureId: string | null) => void;
  onUpdateFeature: (featureId: string, patch: HallFeaturePatch) => void;
  onCommitFeature: (featureId: string, patch: HallFeaturePatch) => void;
  onDeleteFeature: (featureId: string) => void;
  onUpdateBooth: (
    patch: Partial<Pick<Booth, "company" | "status" | "owner" | "zone" | "notes">>,
  ) => void;
  onAddEquipment: (catalogItemId: string) => void;
  onChangeEquipmentQuantity: (lineId: string, delta: number) => void;
  onUpdateEquipmentLine: (lineId: string, patch: EquipmentLinePatch) => void;
  onAdvanceEquipment: (lineId: string) => void;
  onSetEquipmentIssue: (lineId: string, isIssue: boolean) => void;
  onRecordCollection: (lineId: string, collectedQuantity: number) => void;
  onRemoveEquipment: (lineId: string) => void;
  onMarkAllDelivered: () => void;
  onMarkAllCollected: () => void;
  onCreateTask: () => void;
  onDeleteBooth: () => void;
  onAddBooth: () => void;
  onAddFeature: (kind: HallFeatureKind) => void;
  onImport: () => void;
  onPlanImport: () => void;
  onReferenceImage: () => void;
  onExport: () => void;
  onExportPublic: () => void;
  onRestore: () => void;
}) {
  const [showLayers, setShowLayers] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [inspectorExpanded, setInspectorExpanded] = useState(true);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const query = searchQuery.trim().toLocaleLowerCase(locale === "fa" ? "fa-IR" : "en-GB");
  const selectedBoothMetricDimensions = selectedBooth
    ? calculateMetricDimensionsFromGeometry(hall, selectedBooth.width, selectedBooth.height)
    : null;
  const filteredBooths = hall.booths.filter((booth) => {
    const searchable = [
      booth.code,
      booth.company ?? "",
      booth.owner,
      booth.zone,
      booth.notes,
      localize(statusLabels[booth.status], locale),
      ...booth.equipment.map((line) => localize(line.name, locale)),
      ...booth.equipment.map((line) => localize(stageLabels[line.stage], locale)),
    ]
      .join(" ")
      .toLocaleLowerCase(locale === "fa" ? "fa-IR" : "en-GB");
    return (
      (!query || searchable.includes(query)) &&
      (statusFilter === "all" || booth.status === statusFilter)
    );
  });

  useEffect(() => {
    if (!mobileInspectorOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileInspectorOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileInspectorOpen]);

  const openBoothForTouch = (boothId: string) => {
    onSelectBooth(boothId);
    if (window.matchMedia("(max-width: 1279px)").matches) {
      onMobileMapMode("list");
      setMobileInspectorOpen(true);
    }
  };

  const renderInspectorContent = (
    initialTab: "overview" | "equipment" | "history" = "overview",
  ) => selectedBooth ? (
    <BoothInspector
      key={`${selectedBooth.id}-${initialTab}`}
      locale={locale}
      booth={selectedBooth}
      initialTab={initialTab}
      catalog={catalog}
      staffMembers={staffMembers}
      activity={selectedBoothActivity}
      dimensions={{
        widthMeters: selectedBoothMetricDimensions?.widthMeters ?? 0,
        depthMeters: selectedBoothMetricDimensions?.depthMeters ?? 0,
      }}
      onUpdateDetails={onUpdateBooth}
      onApplyDimensions={onApplyBoothDimensions}
      onAddEquipment={onAddEquipment}
      onChangeEquipmentQuantity={onChangeEquipmentQuantity}
      onUpdateEquipmentLine={onUpdateEquipmentLine}
      onAdvanceEquipment={onAdvanceEquipment}
      onSetEquipmentIssue={onSetEquipmentIssue}
      onRecordCollection={onRecordCollection}
      onRemoveEquipment={onRemoveEquipment}
      onMarkAllDelivered={onMarkAllDelivered}
      onMarkAllCollected={onMarkAllCollected}
      onCreateTask={onCreateTask}
      onDeleteBooth={onDeleteBooth}
    />
  ) : (
    <div className="grid min-h-[34rem] place-items-center p-6">
      <EmptyState
        copy={copy}
        icon={Map}
        customBody={
          locale === "fa"
            ? "برای مشاهده جزئیات، یک غرفه را از نقشه یا فهرست انتخاب کنید."
            : "Select a booth on the map or list to inspect its operations."
        }
      />
    </div>
  );

  return (
    <>
      <SectionIntro
        eyebrow={copy.floorplan}
        title={copy.floorplanTitle}
        body={copy.floorplanBody}
        actions={
          <>
            <button
              type="button"
              onClick={onEditMode}
              className={[
                "inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-black transition",
                editMode
                  ? "border-[#198ba0]/30 bg-[#198ba0] text-white"
                  : "border-[#14392f]/12 bg-white text-[#17372f]",
              ].join(" ")}
              aria-pressed={editMode}
            >
              <PenTool size={16} />
              {copy.editor}
            </button>
            <button
              type="button"
              onClick={onPlanImport}
              disabled={planImportBusy}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#198ba0] px-3.5 py-1.5 text-sm font-black text-white shadow-[0_10px_28px_rgba(25,139,160,0.2)] transition hover:bg-[#15778a] disabled:cursor-wait disabled:opacity-65"
            >
              {planImportBusy ? <Activity size={16} className="animate-spin" /> : <ScanLine size={16} />}
              <span className="flex flex-col items-start leading-tight">
                <span>
                  {planImportBusy
                    ? locale === "fa"
                      ? "در حال ساخت نقشه…"
                      : "Building native map…"
                    : locale === "fa"
                      ? "بازسازی هوشمند نقشه"
                      : "Build editable map with AI"}
                </span>
                <span className="mt-0.5 text-[0.58rem] font-bold text-white/75">
                  {locale === "fa"
                    ? "فایل برای استخراج امن به OpenAI ارسال می شود"
                    : "File is securely processed by OpenAI"}
                </span>
              </span>
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDataMenu((current) => !current)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#12372e] px-3.5 text-sm font-black text-white"
                aria-expanded={showDataMenu}
              >
                <FileJson size={16} />
                {copy.import} / {copy.export}
                <ChevronDown size={14} />
              </button>
              {showDataMenu ? (
                <div className="absolute end-0 top-[calc(100%+0.45rem)] z-50 w-64 rounded-2xl border border-[#14392f]/12 bg-white p-2 shadow-[0_20px_60px_rgba(15,46,38,0.18)]">
                  <ActionMenuButton icon={Upload} label={copy.importData} onClick={() => { setShowDataMenu(false); onImport(); }} />
                  <ActionMenuButton icon={ScanLine} label={copy.reconstructPlan} onClick={() => { setShowDataMenu(false); onPlanImport(); }} />
                  <ActionMenuButton icon={ImageUp} label={copy.referenceImage} onClick={() => { setShowDataMenu(false); onReferenceImage(); }} />
                  <ActionMenuButton icon={Download} label={copy.exportData} onClick={() => { setShowDataMenu(false); onExport(); }} />
                  <ActionMenuButton icon={Map} label={copy.publicPlan} onClick={() => { setShowDataMenu(false); onExportPublic(); }} />
                  <div className="my-1 border-t border-[#14392f]/8" />
                  <ActionMenuButton icon={RotateCcw} label={copy.resetWorkspace} onClick={() => { setShowDataMenu(false); onRestore(); }} danger />
                </div>
              ) : null}
            </div>
          </>
        }
      />

      <section className={[styles.surface, "overflow-visible rounded-2xl"].join(" ")}>
        <div className="flex flex-wrap items-center gap-2 border-b border-[#14392f]/9 p-3">
          <div className="flex min-h-11 items-center gap-1 overflow-x-auto rounded-xl border border-[#14392f]/10 bg-[#f4f5f0] p-1">
            {(
              [
                ["allocation", copy.allocation],
                ["delivery", copy.delivery],
                ["pickup", copy.pickup],
                ["issues", copy.issues],
              ] as Array<[HallOverlayMode, string]>
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onOverlay(value)}
                className={[
                  "min-h-9 whitespace-nowrap rounded-lg px-3 text-xs font-black transition",
                  overlay === value
                    ? "bg-white text-[#15372f] shadow-sm ring-1 ring-[#14392f]/8"
                    : "text-[#667a73] hover:text-[#15372f]",
                ].join(" ")}
                aria-pressed={overlay === value}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="relative min-w-44 flex-1 sm:flex-none">
            <span className="sr-only">{copy.allStatuses}</span>
            <Filter
              size={15}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#587068]"
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                onStatusFilter(event.target.value as "all" | BoothStatus)
              }
              className="min-h-11 w-full appearance-none rounded-xl border border-[#14392f]/10 bg-white py-2 pe-8 ps-9 text-xs font-black text-[#31554b] outline-none"
            >
              <option value="all">{copy.allStatuses}</option>
              {boothStatuses.map((status) => (
                <option key={status} value={status}>
                  {localize(statusLabels[status], locale)}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[#587068]"
            />
          </label>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLayers((current) => !current)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#14392f]/10 bg-white px-3 text-xs font-black text-[#31554b]"
              aria-expanded={showLayers}
            >
              <Layers3 size={16} />
              {copy.layers}
              <ChevronDown size={14} />
            </button>
            {showLayers ? (
              <div className="absolute end-0 top-[calc(100%+0.4rem)] z-40 w-56 rounded-2xl border border-[#14392f]/12 bg-white p-2 shadow-[0_18px_48px_rgba(15,46,38,0.16)]">
                {(Object.keys(layers) as Array<keyof HallCanvasLayers>).map((layer) => (
                  <label
                    key={layer}
                    className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-3 text-xs font-bold text-[#31554b] hover:bg-[#f4f6f2]"
                  >
                    <input
                      type="checkbox"
                      checked={layers[layer]}
                      onChange={(event) =>
                        onLayers({ ...layers, [layer]: event.target.checked })
                      }
                      className="size-4 accent-[#198ba0]"
                    />
                    <span>
                      {layer === "grid"
                        ? locale === "fa"
                          ? "شبکه"
                          : "Grid"
                        : layer === "features"
                          ? locale === "fa"
                            ? "سازه ها"
                            : "Structure"
                          : layer === "labels"
                            ? locale === "fa"
                              ? "برچسب ها"
                              : "Labels"
                            : locale === "fa"
                              ? "تصویر مرجع"
                              : "Reference"}
                    </span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setInspectorExpanded((current) => !current)}
            className="hidden min-h-11 items-center gap-2 rounded-xl border border-[#14392f]/10 bg-white px-3 text-xs font-black text-[#31554b] transition hover:bg-[#f4f6f2] xl:inline-flex"
            aria-expanded={inspectorExpanded}
            aria-controls="booth-operations-inspector"
            title={
              locale === "fa"
                ? inspectorExpanded
                  ? "جمع کردن پنل غرفه"
                  : "باز کردن پنل غرفه"
                : inspectorExpanded
                  ? "Collapse booth panel"
                  : "Expand booth panel"
            }
          >
            {inspectorExpanded ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            {locale === "fa"
              ? inspectorExpanded
                ? "بستن پنل"
                : "باز کردن پنل"
              : inspectorExpanded
                ? "Collapse panel"
                : "Expand panel"}
          </button>

          <div className="ms-auto flex rounded-xl border border-[#14392f]/10 bg-[#f4f5f0] p-1 xl:hidden">
            <button
              type="button"
              onClick={() => onMobileMapMode("list")}
              className={[
                "min-h-9 rounded-lg px-3 text-xs font-black",
                mobileMapMode === "list" ? "bg-white shadow-sm" : "text-[#657870]",
              ].join(" ")}
            >
              {copy.list}
            </button>
            <button
              type="button"
              onClick={() => onMobileMapMode("map")}
              className={[
                "min-h-9 rounded-lg px-3 text-xs font-black",
                mobileMapMode === "map" ? "bg-white shadow-sm" : "text-[#657870]",
              ].join(" ")}
            >
              {copy.map}
            </button>
          </div>
        </div>

        {editMode ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-[#14392f]/9 bg-[#edf4f2] px-3 py-2.5">
            <span className="me-1 inline-flex items-center gap-2 text-xs font-black text-[#235348]">
              <Settings2 size={15} />
              {locale === "fa" ? "ابزار ساخت" : "Build tools"}
            </span>
            <MapToolButton icon={Plus} label={copy.addBooth} onClick={onAddBooth} />
            <label className="relative min-w-48">
              <span className="sr-only">
                {locale === "fa" ? "افزودن عنصر به نقشه" : "Add a plan element"}
              </span>
              <select
                value=""
                onChange={(event) => {
                  const kind = event.target.value as HallFeatureKind;
                  if (kind) onAddFeature(kind);
                }}
                className="min-h-9 w-full appearance-none rounded-lg border border-[#1c6455]/12 bg-white py-2 pe-9 ps-3 text-xs font-black text-[#29574c] outline-none transition hover:border-[#198ba0]/30 focus:border-[#198ba0]/45 focus:ring-2 focus:ring-[#198ba0]/10"
              >
                <option value="">
                  {locale === "fa" ? "+ افزودن عنصر نقشه" : "+ Add plan element"}
                </option>
                {hallFeatureKinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {localize(hallFeatureLabels[kind], locale)}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[#587068]"
              />
            </label>
            <p className="ms-auto text-[0.68rem] font-semibold text-[#61766f]">
              {locale === "fa"
                ? "غرفه یا سازه را انتخاب کنید؛ بکشید، اندازه دهید و سازه‌ها را با دستگیره گرد بچرخانید."
                : "Select a booth or hall feature, then drag, resize, or rotate features with the round handle."}
            </p>
          </div>
        ) : null}

        <div
          className={[
            "grid min-h-0",
            inspectorExpanded
              ? "xl:grid-cols-[minmax(0,1fr)_24rem]"
              : "xl:grid-cols-[minmax(0,1fr)_3.5rem]",
          ].join(" ")}
        >
          <div
            className={[
              "min-w-0 border-[#14392f]/9 xl:border-e",
              mobileMapMode === "map" ? "block" : "hidden xl:block",
            ].join(" ")}
          >
            <HallCanvas
              key={hall.id}
              locale={locale}
              hall={hall}
              selectedBoothId={selectedBooth?.id}
              selectedFeatureId={selectedFeatureId}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              overlay={overlay}
              editMode={editMode}
              backgroundImage={referenceImage}
              layerVisibility={layers}
              onSelectBooth={openBoothForTouch}
              onMoveBooth={onMoveBooth}
              onMoveComplete={(boothId) => onMoveComplete(boothId)}
              onUpdateBoothGeometry={onUpdateBoothGeometry}
              onCommitBoothGeometry={onCommitBoothGeometry}
              onSelectFeature={onSelectFeature}
              onUpdateFeature={onUpdateFeature}
              onCommitFeature={onCommitFeature}
              onDeleteFeature={onDeleteFeature}
            />
          </div>

          <div
            id="booth-operations-inspector"
            className={[
              "min-h-[34rem] min-w-0 bg-[#fbfbf8]",
              mobileMapMode === "list" ? "block" : "hidden xl:block",
            ].join(" ")}
          >
            {!inspectorExpanded ? (
              <div className="hidden min-h-[34rem] place-items-start border-s border-[#14392f]/9 bg-[#f4f6f2] p-1.5 pt-3 xl:grid">
                <button
                  type="button"
                  onClick={() => setInspectorExpanded(true)}
                  className="grid size-11 place-items-center rounded-xl border border-[#14392f]/10 bg-white text-[#31554b] shadow-sm transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#198ba0]"
                  aria-label={locale === "fa" ? "باز کردن پنل غرفه" : "Expand booth panel"}
                  title={locale === "fa" ? "باز کردن پنل غرفه" : "Expand booth panel"}
                >
                  <ChevronsLeft size={18} />
                </button>
              </div>
            ) : null}
            <div className={!inspectorExpanded ? "xl:hidden" : undefined}>
            <div className="border-b border-[#14392f]/9 p-3 xl:hidden">
              <p className="text-xs font-black text-[#31554b]">
                {formatCount(filteredBooths.length, locale)} {copy.booths}
              </p>
              <div className="mt-3 grid gap-2">
                {filteredBooths.map((booth) => (
                  <BoothListButton
                    key={booth.id}
                    locale={locale}
                    booth={booth}
                    active={selectedBooth?.id === booth.id}
                    onClick={() => openBoothForTouch(booth.id)}
                  />
                ))}
                {!filteredBooths.length ? (
                  <EmptyState copy={copy} icon={Search} />
                ) : null}
              </div>
            </div>

            <div className="hidden xl:block">{renderInspectorContent()}</div>
            </div>
          </div>
        </div>
      </section>

      {mobileInspectorOpen && selectedBooth ? (
        <div
          className="fixed inset-0 z-[90] xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={
            locale === "fa"
              ? `عملیات غرفه ${selectedBooth.code}`
              : `Booth ${selectedBooth.code} operations`
          }
        >
          <button
            type="button"
            className="absolute inset-0 size-full bg-[#0b231d]/55 backdrop-blur-[2px]"
            onClick={() => setMobileInspectorOpen(false)}
            aria-label={locale === "fa" ? "بستن پنجره غرفه" : "Close booth window"}
          />
          <section className="absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-[1.75rem] border-t border-white/60 bg-[#fbfbf8] shadow-[0_-24px_70px_rgba(8,31,25,0.28)]">
            <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-[#14392f]/10 bg-[#fbfbf8]/96 px-3 py-2 backdrop-blur-xl">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#173f34] font-latin text-xs font-black text-white">
                {selectedBooth.code}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#8b6a2b]">
                  {locale === "fa" ? "پنجره عملیات غرفه" : "Booth operations"}
                </p>
                <p className="mt-0.5 truncate text-sm font-black text-[#17372f]">
                  {selectedBooth.company || copy.unassigned}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileInspectorOpen(false)}
                className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#14392f]/12 bg-white text-[#31554b] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#198ba0]"
                aria-label={locale === "fa" ? "بستن پنجره غرفه" : "Close booth window"}
              >
                <X size={19} />
              </button>
            </header>
            {renderInspectorContent("equipment")}
          </section>
        </div>
      ) : null}
    </>
  );
}

function ActionMenuButton({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-start text-xs font-black transition",
        danger ? "text-rose-700 hover:bg-rose-50" : "text-[#31554b] hover:bg-[#f3f6f2]",
      ].join(" ")}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function MapToolButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#1c6455]/12 bg-white px-3 text-xs font-black text-[#29574c] transition hover:border-[#198ba0]/30 hover:text-[#126a7a]"
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function BoothListButton({
  locale,
  booth,
  active,
  onClick,
}: {
  locale: PortalLocale;
  booth: Booth;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex min-h-16 w-full items-center gap-3 rounded-xl border px-3 text-start transition",
        active
          ? "border-[#198ba0]/35 bg-cyan-50/60 ring-2 ring-[#198ba0]/8"
          : "border-[#14392f]/8 bg-white hover:border-[#14392f]/18",
      ].join(" ")}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#12372e] font-latin text-xs font-black text-white">
        {booth.code}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-black text-[#203d35]">
          {booth.company || localize(statusLabels.available, locale)}
        </span>
        <span className="mt-1 block text-[0.65rem] font-semibold text-[#70817b]">
          {booth.area}m² · {booth.equipment.length}{" "}
          {locale === "fa" ? "ردیف تجهیز" : "equipment lines"}
        </span>
      </span>
      <span
        className={[
          "rounded-full border px-2 py-1 text-[0.62rem] font-black",
          statusTone[booth.status],
        ].join(" ")}
      >
        {localize(statusLabels[booth.status], locale)}
      </span>
    </button>
  );
}

function LogisticsPanel({
  locale,
  copy,
  hall,
  inventoryItems,
  inventoryTotals,
  searchQuery,
  onOpenBooth,
  onAdvance,
  onUploadInventory,
  onAddInventoryItem,
  onUpdateInventoryOnHand,
  onUpdateInventoryItem,
  onArchiveInventoryItems,
  onRemoveInventoryItems,
}: {
  locale: PortalLocale;
  copy: PortalCopy;
  hall: Hall;
  inventoryItems: InventoryItem[];
  inventoryTotals: ReturnType<typeof deriveInventoryTotals>;
  searchQuery: string;
  onOpenBooth: (boothId: string) => void;
  onAdvance: (lineId: string, boothId: string) => void;
  onUploadInventory: (file: File) => void | Promise<void>;
  onAddInventoryItem: (material: NewInventoryMaterial) => void | Promise<void>;
  onUpdateInventoryOnHand: (itemId: string, onHand: number) => void | Promise<void>;
  onUpdateInventoryItem: InventoryWorkspaceProps["onUpdateItem"];
  onArchiveInventoryItems: InventoryWorkspaceProps["onArchiveItems"];
  onRemoveInventoryItems: InventoryWorkspaceProps["onRemoveItems"];
}) {
  const [stageFilter, setStageFilter] = useState<"all" | EquipmentStage>("all");
  const query = searchQuery.trim().toLocaleLowerCase(locale === "fa" ? "fa-IR" : "en-GB");
  const rows = hall.booths
    .flatMap((booth) =>
      booth.equipment.map((line) => ({
        booth,
        line,
      })),
    )
    .filter(({ booth, line }) => {
      const searchText = [
        booth.code,
        booth.company ?? "",
        booth.owner,
        localize(line.name, locale),
        line.stage,
        localize(statusLabels[booth.status], locale),
        localize(stageLabels[line.stage], locale),
      ]
        .join(" ")
        .toLocaleLowerCase(locale === "fa" ? "fa-IR" : "en-GB");
      return (
        (!query || searchText.includes(query)) &&
        (stageFilter === "all" || line.stage === stageFilter)
      );
    })
    .sort((a, b) => {
      const rank = (stage: EquipmentStage) => {
        if (stage === "issue") return -1;
        return equipmentStages.indexOf(stage);
      };
      return rank(a.line.stage) - rank(b.line.stage) || a.booth.code.localeCompare(b.booth.code);
    });

  const stageCounts = Object.fromEntries(
    equipmentStages.map((stage) => [
      stage,
      hall.booths
        .flatMap((booth) => booth.equipment)
        .filter((line) => line.stage === stage).length,
    ]),
  ) as Record<EquipmentStage, number>;
  const total = hall.booths.flatMap((booth) => booth.equipment).length;
  const completed = stageCounts.delivered + stageCounts.collected;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  return (
    <>
      <SectionIntro
        eyebrow={copy.logistics}
        title={copy.logisticsTitle}
        body={copy.logisticsBody}
        actions={
          <label className="relative min-w-48">
            <span className="sr-only">{copy.stage}</span>
            <Filter
              size={15}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#587068]"
            />
            <select
              value={stageFilter}
              onChange={(event) =>
                setStageFilter(event.target.value as "all" | EquipmentStage)
              }
              className="min-h-11 w-full appearance-none rounded-xl border border-[#14392f]/12 bg-white py-2 pe-8 ps-9 text-xs font-black text-[#31554b] outline-none"
            >
              <option value="all">
                {locale === "fa" ? "همه مراحل" : "All stages"}
              </option>
              {equipmentStages.map((stage) => (
                <option key={stage} value={stage}>
                  {localize(stageLabels[stage], locale)} ({formatCount(stageCounts[stage], locale)})
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[#587068]"
            />
          </label>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Boxes}
          label={locale === "fa" ? "کل نیازها" : "Total requirements"}
          value={formatCount(total, locale)}
          meta={localize(hall.name, locale)}
          tone="gold"
        />
        <KpiCard
          icon={PackageOpen}
          label={localize(stageLabels.staged, locale)}
          value={formatCount(stageCounts.staged, locale)}
          meta={locale === "fa" ? "آماده خروج از انبار" : "Ready to leave warehouse"}
          tone="cyan"
        />
        <KpiCard
          icon={PackageCheck}
          label={copy.delivered}
          value={formatCount(completed, locale)}
          meta={formatCount(progress, locale) + "% " + copy.complete}
          tone="green"
        />
        <KpiCard
          icon={AlertTriangle}
          label={copy.issues}
          value={formatCount(stageCounts.issue, locale)}
          meta={locale === "fa" ? "نیازمند پیگیری میدانی" : "Needs field follow-up"}
          tone="rose"
        />
      </section>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#14392f]/8 bg-[#f7f8f4]">
        <InventoryWorkspace
          locale={locale}
          items={inventoryItems}
          totals={inventoryTotals}
          onUploadFile={onUploadInventory}
          onAddItem={onAddInventoryItem}
          onUpdateOnHand={onUpdateInventoryOnHand}
          onUpdateItem={onUpdateInventoryItem}
          onArchiveItems={onArchiveInventoryItems}
          onRemoveItems={onRemoveInventoryItems}
        />
      </div>

      <section className={[styles.surface, "mt-4 overflow-hidden rounded-2xl"].join(" ")}>
        <div className="flex flex-wrap items-center gap-3 border-b border-[#14392f]/9 px-4 py-3">
          <div>
            <h3 className="text-sm font-black text-[#15352d]">
              {locale === "fa" ? "صف اجرایی سالن" : "Hall execution queue"}
            </h3>
            <p className="mt-1 text-xs font-semibold text-[#6c7d77]">
              {formatCount(rows.length, locale)}{" "}
              {locale === "fa" ? "ردیف مطابق فیلتر" : "lines match the current filter"}
            </p>
          </div>
          <div className="ms-auto w-full sm:w-56">
            <ProgressBar value={progress} label={copy.operationalReadiness} locale={locale} tone="green" />
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[780px] border-collapse text-start">
            <thead>
              <tr className="bg-[#f4f5f0] text-[0.66rem] font-black uppercase tracking-[0.13em] text-[#64766f]">
                <th className="px-4 py-3 text-start">{copy.booth}</th>
                <th className="px-4 py-3 text-start">{copy.requirement}</th>
                <th className="px-4 py-3 text-start">{copy.quantity}</th>
                <th className="px-4 py-3 text-start">{copy.stage}</th>
                <th className="px-4 py-3 text-start">{copy.owner}</th>
                <th className="px-4 py-3 text-end">{copy.nextAction}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ booth, line }) => (
                <tr key={line.id} className="border-t border-[#14392f]/8 bg-white hover:bg-[#fafbf8]">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onOpenBooth(booth.id)}
                      className="flex items-center gap-3 text-start"
                    >
                      <span className="grid size-9 place-items-center rounded-lg bg-[#12372e] font-latin text-[0.68rem] font-black text-white">
                        {booth.code}
                      </span>
                      <span>
                        <span className="block max-w-44 truncate text-xs font-black text-[#203d35]">
                          {booth.company || copy.unassigned}
                        </span>
                        <span className="mt-0.5 block text-[0.62rem] text-[#71807b]">{booth.zone}</span>
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-black text-[#2b4b42]">
                      {localize(line.name, locale)}
                    </span>
                    <span className="mt-1 block text-[0.62rem] text-[#75847f]">
                      {line.returnable
                        ? locale === "fa"
                          ? "بازگشتی"
                          : "Returnable"
                        : locale === "fa"
                          ? "مصرفی / خدماتی"
                          : "Consumable / service"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-latin text-sm font-black text-[#203d35]">
                    {formatCount(line.quantity, locale)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={["inline-flex rounded-full px-2.5 py-1 text-[0.66rem] font-black", stageTone[line.stage]].join(" ")}>
                      {localize(stageLabels[line.stage], locale)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-[#526961]">{booth.owner || "—"}</td>
                  <td className="px-4 py-3 text-end">
                    <button
                      type="button"
                      onClick={() => onAdvance(line.id, booth.id)}
                      disabled={isEquipmentLineAdvanceBlocked(line)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#14392f]/10 bg-white px-3 text-xs font-black text-[#31564c] transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {line.stage === "issue" ? (
                        <AlertTriangle size={15} />
                      ) : isEquipmentLineTerminal(line) ? (
                        <CheckCircle2 size={15} />
                      ) : (
                        <Truck size={15} />
                      )}
                      {line.stage === "issue"
                        ? copy.issues
                        : isEquipmentLineTerminal(line)
                          ? copy.complete
                          : copy.advance}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-2 p-3 md:hidden">
          {rows.map(({ booth, line }) => (
            <article key={line.id} className="rounded-xl border border-[#14392f]/9 bg-white p-3">
              <button
                type="button"
                onClick={() => onOpenBooth(booth.id)}
                className="flex w-full items-center gap-3 text-start"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-[#12372e] font-latin text-xs font-black text-white">
                  {booth.code}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-black text-[#203d35]">
                    {localize(line.name, locale)} × {formatCount(line.quantity, locale)}
                  </span>
                  <span className="mt-1 block truncate text-[0.65rem] text-[#71807b]">
                    {booth.company || copy.unassigned}
                  </span>
                </span>
                <span className={["rounded-full px-2 py-1 text-[0.62rem] font-black", stageTone[line.stage]].join(" ")}>
                  {localize(stageLabels[line.stage], locale)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onAdvance(line.id, booth.id)}
                disabled={isEquipmentLineAdvanceBlocked(line)}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#12372e] px-3 text-xs font-black text-white disabled:bg-[#a9b4b0]"
              >
                {line.stage === "issue" ? (
                  <AlertTriangle size={16} />
                ) : isEquipmentLineTerminal(line) ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <Truck size={16} />
                )}
                {line.stage === "issue"
                  ? copy.issues
                  : isEquipmentLineTerminal(line)
                    ? copy.complete
                    : copy.advance}
              </button>
            </article>
          ))}
        </div>

        {!rows.length ? (
          <div className="p-6">
            <EmptyState copy={copy} icon={PackageOpen} />
          </div>
        ) : null}
      </section>
    </>
  );
}

function TasksPanel({
  locale,
  copy,
  tasks,
  booths,
  taskDraft,
  onTaskDraft,
  onSubmit,
  onAdvance,
  onOpenBooth,
}: {
  locale: PortalLocale;
  copy: PortalCopy;
  tasks: PortalTask[];
  booths: Booth[];
  taskDraft: { title: string; owner: string };
  onTaskDraft: (draft: { title: string; owner: string }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAdvance: (taskId: string) => void;
  onOpenBooth: (boothId: string) => void;
}) {
  const columns: Array<{
    status: PortalTask["status"];
    title: string;
    tone: string;
  }> = [
    {
      status: "open",
      title: locale === "fa" ? "در انتظار" : "Open",
      tone: "bg-slate-400",
    },
    {
      status: "in-progress",
      title: locale === "fa" ? "در حال اجرا" : "In progress",
      tone: "bg-amber-500",
    },
    {
      status: "done",
      title: locale === "fa" ? "تکمیل شده" : "Done",
      tone: "bg-emerald-500",
    },
  ];

  return (
    <>
      <SectionIntro eyebrow={copy.tasks} title={copy.tasksTitle} body={copy.tasksBody} />

      <form
        onSubmit={onSubmit}
        className={[styles.surface, "mb-4 grid gap-3 rounded-2xl p-3 sm:grid-cols-[minmax(0,1fr)_13rem_auto]"].join(" ")}
      >
        <label>
          <span className="sr-only">{copy.taskTitle}</span>
          <input
            value={taskDraft.title}
            onChange={(event) => onTaskDraft({ ...taskDraft, title: event.target.value })}
            placeholder={copy.taskTitle}
            className="min-h-11 w-full rounded-xl border border-[#14392f]/10 bg-[#fafbf8] px-3 text-sm font-bold text-[#203d35] outline-none focus:border-[#198ba0]/45"
          />
        </label>
        <label>
          <span className="sr-only">{copy.taskOwner}</span>
          <select
            value={taskDraft.owner}
            onChange={(event) => onTaskDraft({ ...taskDraft, owner: event.target.value })}
            className="min-h-11 w-full rounded-xl border border-[#14392f]/10 bg-[#fafbf8] px-3 text-sm font-bold text-[#31554b] outline-none"
          >
            {staffMembers.map((member) => (
              <option key={member}>{member}</option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#12372e] px-4 text-sm font-black text-white"
        >
          <Plus size={16} />
          {copy.createTask}
        </button>
      </form>

      <section className="grid gap-4 lg:grid-cols-3">
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.status);
          return (
            <article key={column.status} className={[styles.surface, "rounded-2xl p-3"].join(" ")}>
              <div className="flex items-center gap-2 px-1 py-2">
                <span className={["size-2 rounded-full", column.tone].join(" ")} />
                <h3 className="text-sm font-black text-[#15352d]">{column.title}</h3>
                <span className="ms-auto rounded-full bg-[#edf0ec] px-2 py-1 text-[0.65rem] font-black text-[#5e706a]">
                  {formatCount(columnTasks.length, locale)}
                </span>
              </div>
              <div className="mt-2 grid gap-2">
                {columnTasks.map((task) => {
                  const booth = task.boothId
                    ? booths.find((item) => item.id === task.boothId)
                    : undefined;
                  return (
                    <div key={task.id} className="rounded-xl border border-[#14392f]/9 bg-white p-3 shadow-[0_8px_22px_rgba(20,57,47,0.04)]">
                      <div className="flex items-start gap-3">
                        <span
                          className={[
                            "mt-1.5 size-2 shrink-0 rounded-full",
                            task.priority === "high"
                              ? "bg-rose-500"
                              : task.priority === "medium"
                                ? "bg-amber-500"
                                : "bg-slate-400",
                          ].join(" ")}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black leading-5 text-[#203d35]">
                            {localize(task.title, locale)}
                          </p>
                          <p className="mt-2 text-[0.65rem] font-semibold text-[#71807b]">
                            {task.owner}
                          </p>
                          <p className="mt-1 text-[0.62rem] text-[#87928e]">
                            {formatPortalDate(task.dueAt, locale)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2 border-t border-[#14392f]/7 pt-3">
                        {booth ? (
                          <button
                            type="button"
                            onClick={() => onOpenBooth(booth.id)}
                            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#14392f]/10 bg-[#f7f8f5] px-3 text-[0.66rem] font-black text-[#31554b]"
                          >
                            <Map size={14} />
                            {booth.code}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onAdvance(task.id)}
                          className="ms-auto inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#12372e] px-3 text-[0.66rem] font-black text-white"
                        >
                          {task.status === "done" ? <RotateCcw size={14} /> : <Check size={14} />}
                          {task.status === "done" ? (locale === "fa" ? "بازگشایی" : "Reopen") : copy.advance}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {!columnTasks.length ? <EmptyInline locale={locale} /> : null}
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}

function ExhibitorsPanel({
  locale,
  copy,
  halls,
  searchQuery,
  onOpenBooth,
}: {
  locale: PortalLocale;
  copy: PortalCopy;
  halls: Hall[];
  searchQuery: string;
  onOpenBooth: (boothId: string) => void;
}) {
  const query = searchQuery.trim().toLocaleLowerCase(locale === "fa" ? "fa-IR" : "en-GB");
  const exhibitors = halls
    .flatMap((hall) =>
      hall.booths
        .filter((booth) => booth.company)
        .map((booth) => ({ hall, booth })),
    )
    .filter(({ hall, booth }) => {
      const text = [
        localize(hall.name, locale),
        booth.code,
        booth.company ?? "",
        booth.zone,
        booth.owner,
        localize(statusLabels[booth.status], locale),
        ...booth.equipment.map((line) => localize(line.name, locale)),
        ...booth.equipment.map((line) => localize(stageLabels[line.stage], locale)),
      ]
        .join(" ")
        .toLocaleLowerCase(locale === "fa" ? "fa-IR" : "en-GB");
      return !query || text.includes(query);
    });

  return (
    <>
      <SectionIntro eyebrow={copy.exhibitors} title={copy.exhibitorsTitle} body={copy.exhibitorsBody} />
      {exhibitors.length ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {exhibitors.map(({ hall, booth }) => {
            const ready = isBoothReady(booth);
            const delivered = booth.equipment.filter(
              (line) => line.stage === "delivered" || line.stage === "collected",
            ).length;
            return (
              <button
                key={booth.id}
                type="button"
                onClick={() => onOpenBooth(booth.id)}
                className={[styles.surface, "group rounded-2xl p-4 text-start transition hover:-translate-y-0.5 hover:border-[#198ba0]/28"].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#12372e] font-latin text-xs font-black text-white">
                    {booth.code}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-[#183b32]">
                      {booth.company || copy.unassigned}
                    </span>
                    <span className="mt-1 block truncate text-[0.66rem] font-semibold text-[#71807b]">
                      {localize(hall.name, locale)} · {booth.zone}
                    </span>
                  </span>
                  <span
                    className={[
                      "rounded-full border px-2 py-1 text-[0.6rem] font-black",
                      statusTone[booth.status],
                    ].join(" ")}
                  >
                    {localize(statusLabels[booth.status], locale)}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <MiniMetric label={locale === "fa" ? "مساحت" : "Area"} value={booth.area + "m²"} />
                  <MiniMetric label={locale === "fa" ? "نیازها" : "Items"} value={formatCount(booth.equipment.length, locale)} />
                  <MiniMetric label={locale === "fa" ? "تحویل" : "Delivered"} value={formatCount(delivered, locale)} />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[#14392f]/8 pt-3 text-xs font-bold">
                  <span className={ready ? "text-emerald-700" : "text-amber-700"}>
                    {ready
                      ? locale === "fa"
                        ? "آماده عملیات"
                        : "Operationally ready"
                      : locale === "fa"
                        ? "نیازمند تکمیل"
                        : "Needs completion"}
                  </span>
                  <span className="text-[#198ba0] transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                    {locale === "fa" ? "باز کردن ←" : "Open →"}
                  </span>
                </div>
              </button>
            );
          })}
        </section>
      ) : (
        <EmptyState copy={copy} icon={Users} />
      )}
    </>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-xl bg-[#f2f4f0] p-2.5">
      <span className="block text-sm font-black text-[#203d35]">{value}</span>
      <span className="mt-1 block truncate text-[0.6rem] font-bold text-[#78857f]">{label}</span>
    </span>
  );
}

function ActivityPanel({
  locale,
  copy,
  audit,
}: {
  locale: PortalLocale;
  copy: PortalCopy;
  audit: AuditEvent[];
}) {
  const [actionFilter, setActionFilter] = useState("all");
  const actionGroups = Array.from(new Set(audit.map((event) => event.action.split(".")[0])));
  const events =
    actionFilter === "all"
      ? audit
      : audit.filter((event) => event.action.startsWith(actionFilter + "."));

  return (
    <>
      <SectionIntro
        eyebrow={copy.activity}
        title={copy.activityTitle}
        body={copy.activityBody}
        actions={
          <label className="relative min-w-48">
            <span className="sr-only">{copy.activity}</span>
            <Activity
              size={15}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#587068]"
            />
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="min-h-11 w-full appearance-none rounded-xl border border-[#14392f]/12 bg-white py-2 pe-8 ps-9 text-xs font-black text-[#31554b]"
            >
              <option value="all">{locale === "fa" ? "همه تغییرات" : "All changes"}</option>
              {actionGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[#587068]"
            />
          </label>
        }
      />

      <section className={[styles.surface, "overflow-hidden rounded-2xl"].join(" ")}>
        <div className="border-b border-amber-200/70 bg-amber-50/70 px-4 py-3 text-xs font-bold leading-5 text-amber-900">
          <span className="inline-flex items-center gap-2">
            <HardDrive size={15} />
            {copy.auditNote}
          </span>
        </div>
        <ol className="divide-y divide-[#14392f]/8">
          {events.map((event) => (
            <li key={event.id} className="relative grid gap-3 px-4 py-4 sm:grid-cols-[10rem_minmax(0,1fr)_11rem] sm:items-center">
              <div>
                <span className="inline-flex rounded-full border border-[#198ba0]/14 bg-cyan-50 px-2.5 py-1 font-latin text-[0.62rem] font-black text-cyan-800">
                  {event.action}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black leading-5 text-[#29483f]">
                  {localize(event.summary, locale)}
                </p>
                <p className="mt-1 font-latin text-[0.62rem] text-[#7b8883]">
                  {event.entityType} / {event.entityId}
                </p>
              </div>
              <div className="sm:text-end">
                <p className="text-[0.66rem] font-black text-[#4f675f]">{event.actor}</p>
                <p className="mt-1 text-[0.6rem] text-[#87928e]">
                  {formatPortalDate(event.timestamp, locale)}
                </p>
              </div>
            </li>
          ))}
        </ol>
        {!events.length ? (
          <div className="p-6">
            <EmptyState copy={copy} icon={History} />
          </div>
        ) : null}
      </section>
    </>
  );
}

function EmptyState({
  copy,
  icon: Icon,
  customBody,
}: {
  copy: PortalCopy;
  icon: ComponentType<{ size?: number; className?: string }>;
  customBody?: string;
}) {
  return (
    <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-[#14392f]/14 bg-[#f7f8f4] p-6 text-center">
      <div>
        <span className="mx-auto grid size-11 place-items-center rounded-xl bg-[#e8ece8] text-[#597068]">
          <Icon size={19} />
        </span>
        <p className="mt-3 text-sm font-black text-[#31554b]">{copy.noResults}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#76857f]">
          {customBody ?? copy.noResultsBody}
        </p>
      </div>
    </div>
  );
}

function PortalNotice({
  notice,
  onClose,
}: {
  notice: Notice;
  onClose: () => void;
}) {
  const tone = {
    success: {
      shell: "border-emerald-200 bg-white text-emerald-950",
      icon: "bg-emerald-100 text-emerald-700",
      Icon: CheckCircle2,
    },
    warning: {
      shell: "border-amber-200 bg-white text-amber-950",
      icon: "bg-amber-100 text-amber-700",
      Icon: AlertTriangle,
    },
    error: {
      shell: "border-rose-200 bg-white text-rose-950",
      icon: "bg-rose-100 text-rose-700",
      Icon: AlertTriangle,
    },
  }[notice.tone];
  const Icon = tone.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      role="status"
      aria-live="polite"
      className={[
        "fixed bottom-5 end-4 z-[100] flex w-[min(26rem,calc(100vw-2rem))] items-start gap-3 rounded-2xl border p-3.5 shadow-[0_24px_70px_rgba(11,34,28,0.2)]",
        tone.shell,
      ].join(" ")}
    >
      <span className={["grid size-9 shrink-0 place-items-center rounded-xl", tone.icon].join(" ")}>
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-black">{notice.title}</p>
        {notice.body ? <p className="mt-1 text-xs leading-5 opacity-65">{notice.body}</p> : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-current/50 hover:bg-black/5 hover:text-current"
        aria-label="Close"
      >
        <X size={15} />
      </button>
    </motion.div>
  );
}

function ConfirmDialog({
  locale,
  copy,
  request,
  onClose,
}: {
  locale: PortalLocale;
  copy: PortalCopy;
  request: ConfirmRequest | null;
  onClose: () => void;
}) {
  const initialFocusSelector = "[data-modal-cancel]";
  const modalRef = useModalFocus<HTMLElement>(
    Boolean(request),
    onClose,
    initialFocusSelector,
  );

  return (
    <AnimatePresence>
      {request ? (
        <motion.div
          className="fixed inset-0 z-[110] grid place-items-center bg-[#06130f]/55 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.section
            ref={modalRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="portal-confirm-title"
            aria-describedby="portal-confirm-body"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="w-full max-w-md rounded-3xl border border-white/70 bg-[#fcfcf8] p-5 text-[#18372f] shadow-[0_35px_100px_rgba(3,19,14,0.34)]"
          >
            <span
              className={[
                "grid size-11 place-items-center rounded-2xl",
                request.destructive
                  ? "bg-rose-100 text-rose-700"
                  : "bg-amber-100 text-amber-800",
              ].join(" ")}
            >
              {request.destructive ? <AlertTriangle size={20} /> : <ClipboardCheck size={20} />}
            </span>
            <h2 id="portal-confirm-title" className="mt-4 text-xl font-black">
              {request.title}
            </h2>
            <p id="portal-confirm-body" className="mt-2 text-sm leading-6 text-[#62746e]">
              {request.body}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                data-modal-cancel
                onClick={onClose}
                className="min-h-11 rounded-xl border border-[#14392f]/12 bg-white px-4 text-sm font-black text-[#31554b]"
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                data-modal-confirm
                onClick={() => {
                  request.action();
                  onClose();
                }}
                className={[
                  "min-h-11 rounded-xl px-4 text-sm font-black text-white",
                  request.destructive ? "bg-rose-700 hover:bg-rose-800" : "bg-[#12372e] hover:bg-[#1b493e]",
                ].join(" ")}
              >
                {request.confirmLabel}
              </button>
            </div>
            <p className="mt-4 text-[0.62rem] font-semibold text-[#87928e]">
              {locale === "fa"
                ? "این اقدام در تاریخچه نسخه محلی ثبت می شود."
                : "This action is recorded in the local version history."}
            </p>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function PlanReconstructionPreview({
  preview,
  locale,
}: {
  preview: Extract<ImportPreview, { kind: "plan" }>;
  locale: PortalLocale;
}) {
  const labelSize = Math.max(1.7, preview.hallWidth / 34);
  const gridSize = Math.max(2, Math.min(preview.hallWidth, preview.hallHeight) / 12);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#14392f]/12 bg-[#edf3ef]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#14392f]/10 bg-white px-4 py-3">
        <div>
          <p className="text-[0.64rem] font-black uppercase tracking-[0.14em] text-[#198ba0]">
            {locale === "fa" ? "پیش نمایش اشیای بومی پلتفرم" : "Native platform object preview"}
          </p>
          <p className="mt-1 text-sm font-black text-[#173a31]">{preview.hallName}</p>
        </div>
        <span className="rounded-full border border-[#14392f]/10 bg-[#f7f8f5] px-3 py-1.5 text-[0.68rem] font-black text-[#50665f]" dir="ltr">
          {formatCount(preview.physicalWidth, locale)} × {formatCount(preview.physicalHeight, locale)} m
        </span>
      </div>
      <div className="relative aspect-[16/9] min-h-64 w-full overflow-hidden p-3 sm:min-h-80">
        <svg
          viewBox={`0 0 ${preview.hallWidth} ${preview.hallHeight}`}
          className="h-full w-full rounded-xl bg-[#fbfcf9] shadow-inner"
          role="img"
          aria-label={locale === "fa" ? "پیش نمایش غرفه ها و سازه های قابل ویرایش" : "Preview of editable booths and structural objects"}
        >
          <defs>
            <pattern id="plan-preview-grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
              <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#6b827a" strokeOpacity="0.14" strokeWidth="0.12" />
            </pattern>
          </defs>
          <rect width={preview.hallWidth} height={preview.hallHeight} fill="#fbfcf9" />
          {preview.sourceImageDataUrl ? (
            <image
              href={preview.sourceImageDataUrl}
              x={0}
              y={0}
              width={preview.hallWidth}
              height={preview.hallHeight}
              preserveAspectRatio="none"
              opacity={0.26}
            />
          ) : null}
          <rect width={preview.hallWidth} height={preview.hallHeight} fill="url(#plan-preview-grid)" />
          {preview.features.map((feature) => (
            <g
              key={feature.id}
              transform={feature.rotation
                ? `rotate(${feature.rotation} ${feature.x + feature.width / 2} ${feature.y + feature.height / 2})`
                : undefined}
            >
              <rect
                x={feature.x}
                y={feature.y}
                width={feature.width}
                height={feature.height}
                rx={0.45}
                fill={feature.kind === "aisle" || feature.kind === "zone" ? "#f5e6bd" : "#dce7e2"}
                fillOpacity={0.72}
                stroke={feature.kind === "aisle" || feature.kind === "zone" ? "#a8751d" : "#3f6459"}
                strokeDasharray={feature.kind === "aisle" || feature.kind === "zone" ? "1.2 0.8" : undefined}
                strokeWidth={0.35}
              />
            </g>
          ))}
          {preview.booths.map((booth, index) => (
            <g key={booth.id}>
              <rect
                x={booth.x}
                y={booth.y}
                width={booth.width}
                height={booth.height}
                rx={0.55}
                fill={index % 3 === 0 ? "#d9f4e9" : index % 3 === 1 ? "#e6f1ed" : "#fff0c9"}
                fillOpacity={0.94}
                stroke={index % 3 === 2 ? "#ae7418" : "#168064"}
                strokeWidth={0.48}
              />
              {booth.width >= labelSize * 2.2 && booth.height >= labelSize * 1.3 ? (
                <text
                  x={booth.x + booth.width / 2}
                  y={booth.y + booth.height / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={labelSize}
                  fontWeight="800"
                  fill="#153a30"
                >
                  {booth.code}
                </text>
              ) : null}
            </g>
          ))}
          <rect x={0.2} y={0.2} width={preview.hallWidth - 0.4} height={preview.hallHeight - 0.4} fill="none" stroke="#12372e" strokeWidth={0.45} />
        </svg>
        <div className="pointer-events-none absolute bottom-5 start-5 flex flex-wrap gap-2">
          <span className="rounded-lg border border-emerald-700/20 bg-white/90 px-2.5 py-1 text-[0.62rem] font-black text-emerald-800 shadow-sm backdrop-blur">
            {formatCount(preview.booths.length, locale)} {locale === "fa" ? "غرفه قابل ویرایش" : "editable booths"}
          </span>
          <span className="rounded-lg border border-amber-700/20 bg-white/90 px-2.5 py-1 text-[0.62rem] font-black text-amber-800 shadow-sm backdrop-blur">
            {formatCount(preview.features.length, locale)} {locale === "fa" ? "سازه" : "features"}
          </span>
        </div>
      </div>
    </section>
  );
}

function ImportDialog({
  locale,
  copy,
  preview,
  onClose,
  onApply,
  onPlanOptions,
}: {
  locale: PortalLocale;
  copy: PortalCopy;
  preview: ImportPreview | null;
  onClose: () => void;
  onApply: () => void;
  onPlanOptions: (patch: {
    applyMode?: PlanApplyMode;
    keepSourceAsReference?: boolean;
  }) => void;
}) {
  const modalRef = useModalFocus<HTMLElement>(
    Boolean(preview),
    onClose,
    "[data-modal-cancel]",
  );

  return (
    <AnimatePresence>
      {preview ? (
        <motion.div
          className="fixed inset-0 z-[110] grid place-items-center bg-[#06130f]/55 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.section
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="portal-import-title"
            aria-describedby="portal-import-warning"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className={[
              "max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-3xl border border-white/70 bg-[#fcfcf8] p-5 text-[#18372f] shadow-[0_35px_100px_rgba(3,19,14,0.34)]",
              preview.kind === "plan" ? "max-w-5xl" : "max-w-lg",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cyan-100 text-cyan-800">
                {preview.kind === "csv" ? <Upload size={20} /> : preview.kind === "plan" ? <FileSpreadsheet size={20} /> : <FileJson size={20} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.64rem] font-black uppercase tracking-[0.16em] text-[#9b742e]">
                  {copy.reviewImport}
                </p>
                <h2 id="portal-import-title" className="mt-1 truncate text-xl font-black">
                  {preview.fileName}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid size-9 place-items-center rounded-xl border border-[#14392f]/10 bg-white text-[#62746e]"
                aria-label={copy.close}
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MiniMetric
                label={copy.booths}
                value={formatCount(
                  preview.kind === "snapshot" ? preview.booths : preview.booths.length,
                  locale,
                )}
              />
              <MiniMetric
                label={locale === "fa" ? "نوع ورود" : "Import type"}
                value={
                  preview.kind === "csv"
                    ? locale === "fa"
                      ? "غرفه های CSV"
                      : "CSV booths"
                    : preview.kind === "plan"
                      ? `${formatCount(preview.features.length, locale)} ${locale === "fa" ? "سازه" : "features"}`
                      : formatCount(preview.halls, locale) +
                      " " +
                      (locale === "fa" ? "سالن" : "halls")
                }
              />
            </div>

            {preview.kind === "plan" ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(17rem,0.55fr)]">
                <PlanReconstructionPreview preview={preview} locale={locale} />
                <div className="grid content-start gap-3">
                  <section className="rounded-2xl border border-[#14392f]/10 bg-white p-4">
                    <p className="text-[0.64rem] font-black uppercase tracking-[0.14em] text-[#8f6c2e]">
                      {locale === "fa" ? "روش اعمال" : "Apply strategy"}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-[#f1f4ef] p-1">
                      {(["merge", "replace"] as PlanApplyMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => onPlanOptions({ applyMode: mode })}
                          className={[
                            "min-h-11 rounded-lg px-3 text-xs font-black transition",
                            preview.applyMode === mode
                              ? "bg-[#12372e] text-white shadow-sm"
                              : "text-[#536a63] hover:bg-white",
                          ].join(" ")}
                          aria-pressed={preview.applyMode === mode}
                        >
                          {mode === "merge"
                            ? locale === "fa" ? "ادغام امن" : "Safe merge"
                            : locale === "fa" ? "جایگزینی کامل" : "Full replace"}
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-[0.68rem] font-semibold leading-5 text-[#6c7d77]">
                      {preview.applyMode === "merge"
                        ? locale === "fa"
                          ? "غرفه های هم کد به روز می شوند و اطلاعات اجرایی، تجهیزات و وضعیت فعلی آنها حفظ می شود."
                          : "Matching booth codes update their geometry while operational status, equipment, and assignments stay intact."
                        : locale === "fa"
                          ? "نقشه فعلی این سالن با نتیجه بازسازی جایگزین می شود. وظایف غرفه های حذف شده از آنها جدا می شوند."
                          : "The target hall map is replaced. Tasks linked to removed booths are safely detached."}
                    </p>
                  </section>

                  <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-[#14392f]/10 bg-white p-3.5">
                    <input
                      type="checkbox"
                      checked={preview.keepSourceAsReference}
                      disabled={!preview.sourceImageDataUrl}
                      onChange={(event) =>
                        onPlanOptions({ keepSourceAsReference: event.target.checked })
                      }
                      className="size-5 shrink-0 accent-[#198ba0]"
                    />
                    <span className="min-w-0">
                      <strong className="block text-xs font-black text-[#294a41]">
                        {locale === "fa" ? "نگهداری تصویر برای تطبیق" : "Keep source for alignment"}
                      </strong>
                      <span className="mt-0.5 block text-[0.65rem] font-semibold leading-5 text-[#788781]">
                        {preview.sourceImageDataUrl
                          ? locale === "fa" ? "تصویر فقط لایه مرجع است؛ غرفه های رنگی بالا کاملا قابل ویرایش اند." : "The image remains only as a reference layer; colored booths above it are fully editable."
                          : locale === "fa" ? "برای فایل Excel یا PDF تصویری در این نشست ذخیره نمی شود." : "No raster reference is retained for this Excel/PDF import."}
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            ) : null}

            {preview.kind === "plan" && (preview.confidence !== undefined || preview.sourceSummary) ? (
              <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-xs font-bold leading-5 text-cyan-900">
                {preview.confidence !== undefined ? <strong className="block">{locale === "fa" ? "اطمینان استخراج" : "Extraction confidence"}: {formatCount(Math.round(preview.confidence * 100), locale)}%</strong> : null}
                {preview.sourceSummary ? <p className="mt-1 text-cyan-900/70">{preview.sourceSummary}</p> : null}
              </div>
            ) : null}

            {preview.kind !== "snapshot" && preview.warnings.length ? (
              <div className="mt-4 max-h-36 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-black text-amber-900">
                  {locale === "fa" ? "هشدارهای اعتبارسنجی" : "Validation warnings"}
                </p>
                <ul className="mt-2 list-disc space-y-1 ps-4 text-[0.68rem] leading-5 text-amber-900/75">
                  {preview.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div
              id="portal-import-warning"
              className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs font-bold leading-5 text-amber-900"
            >
              {preview.kind === "plan"
                ? (locale === "fa"
                    ? `نتیجه روی «${preview.hallName}» اعمال می شود؛ حتی اگر در زمان تحلیل سالن دیگری را باز کرده باشید. اینها اشیای واقعی و قابل ویرایش پلتفرم هستند، نه یک تصویر پس زمینه.`
                    : `The result is applied to “${preview.hallName}” even if you opened another hall while it was processing. These are real editable platform objects, not a background image.`)
                : copy.replaceDataWarning}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                data-modal-cancel
                onClick={onClose}
                className="min-h-11 rounded-xl border border-[#14392f]/12 bg-white px-4 text-sm font-black text-[#31554b]"
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                onClick={onApply}
                className="min-h-12 rounded-xl bg-[#12372e] px-5 text-sm font-black text-white shadow-[0_10px_28px_rgba(18,55,46,0.2)] hover:bg-[#1b493e]"
              >
                {preview.kind === "plan"
                  ? locale === "fa" ? "ساخت نقشه قابل ویرایش" : "Create editable map"
                  : locale === "fa" ? "اعمال ورود اطلاعات" : "Apply import"}
              </button>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
