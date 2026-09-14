"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  Box,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  History,
  ListPlus,
  LockKeyhole,
  MapPin,
  Minus,
  NotebookPen,
  PackageCheck,
  Plus,
  Ruler,
  RotateCcw,
  Trash2,
  Truck,
  UserRound,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import {
  calculateDimensionsForTargetArea,
  formatIstanbulDateTime,
  parseMetricDimensionExpression,
  type AuditEvent,
  type Booth,
  type CatalogItem,
  type EquipmentStage,
  type PortalLocale,
} from "@/lib/staff-portal";

type DetailPatch = Partial<
  Pick<Booth, "company" | "status" | "owner" | "zone" | "notes">
>;

export type EquipmentLinePatch = Partial<
  Pick<Booth["equipment"][number], "deliveryWindow" | "pickupWindow" | "notes">
>;

export type BoothDimensions = {
  widthMeters: number;
  depthMeters: number;
};

export type BoothInspectorProps = {
  locale: PortalLocale;
  booth: Booth;
  initialTab?: InspectorTab;
  catalog: CatalogItem[];
  staffMembers: string[];
  activity: AuditEvent[];
  dimensions: BoothDimensions;
  onUpdateDetails: (patch: DetailPatch) => void;
  onApplyDimensions: (dimensions: BoothDimensions) => void;
  onAddEquipment: (catalogItemId: string) => void;
  onChangeEquipmentQuantity: (lineId: string, delta: number) => void;
  onUpdateEquipmentLine: (lineId: string, patch: EquipmentLinePatch) => void;
  onAdvanceEquipment: (lineId: string) => void;
  onSetEquipmentIssue: (lineId: string, isIssue: boolean) => void;
  onRemoveEquipment: (lineId: string) => void;
  onRecordCollection: (lineId: string, collectedQuantity: number) => void;
  onMarkAllDelivered: () => void;
  onMarkAllCollected: () => void;
  onCreateTask: () => void;
  onDeleteBooth: () => void;
};

const boothStatuses = [
  "available",
  "reserved",
  "confirmed",
  "paid",
  "attention",
  "blocked",
] as const;

const equipmentStages: EquipmentStage[] = [
  "requested",
  "preparing",
  "staged",
  "delivered",
  "collected",
  "issue",
];

const normalEquipmentStages: EquipmentStage[] = [
  "requested",
  "preparing",
  "staged",
  "delivered",
  "collected",
];

type InspectorTab = "overview" | "equipment" | "history";
type LocaleKey = "fa" | "en";
type LocalizedTextLike = { fa: string; en: string };
type DetailField = "company" | "zone" | "notes";
type DetailDraft = {
  value: string;
  baseline: string;
  identity: string;
  editing: boolean;
};

type EquipmentLineView = {
  id: string;
  catalogItemId: string;
  quantity: number;
  collectedQuantity?: number;
  stage: EquipmentStage;
  returnable?: boolean;
  deliveryWindow: string;
  pickupWindow: string;
  notes: string;
  name?: unknown;
  category?: unknown;
};

type CatalogItemView = {
  id: string;
  name?: unknown;
  label?: unknown;
  category?: unknown;
  unit?: unknown;
  returnable?: unknown;
};

type AuditEventView = {
  id: string;
  action?: unknown;
  title?: unknown;
  summary?: unknown;
  detail?: unknown;
  description?: unknown;
  actor?: unknown;
  actorName?: unknown;
  createdAt?: unknown;
  timestamp?: unknown;
  type?: unknown;
};

const statusLabels: Record<(typeof boothStatuses)[number], LocalizedTextLike> = {
  available: { fa: "آزاد", en: "Available" },
  reserved: { fa: "رزرو", en: "Reserved" },
  confirmed: { fa: "تاییدشده", en: "Confirmed" },
  paid: { fa: "تسویه شده", en: "Paid" },
  attention: { fa: "نیازمند پیگیری", en: "Needs attention" },
  blocked: { fa: "مسدود", en: "Blocked" },
};

const stageLabels: Record<EquipmentStage, LocalizedTextLike> = {
  requested: { fa: "درخواست", en: "Requested" },
  preparing: { fa: "آماده سازی", en: "Preparing" },
  staged: { fa: "آماده تحویل", en: "Staged" },
  delivered: { fa: "تحویل غرفه", en: "Delivered" },
  collected: { fa: "جمع آوری", en: "Collected" },
  issue: { fa: "دارای مشکل", en: "Issue" },
};

const categoryLabels: Record<CatalogItem["category"], LocalizedTextLike> = {
  furniture: { fa: "مبلمان", en: "Furniture" },
  av: { fa: "صوتی و تصویری", en: "Audio / visual" },
  cooling: { fa: "سرمایش", en: "Cooling" },
  appliance: { fa: "لوازم برقی", en: "Appliance" },
  electrical: { fa: "برق", en: "Electrical" },
  connectivity: { fa: "اتصال و شبکه", en: "Connectivity" },
  support: { fa: "پشتیبانی", en: "Support" },
};

const copy = {
  fa: {
    inspector: "پرونده غرفه",
    booth: "غرفه",
    overview: "مشخصات",
    equipment: "تجهیزات",
    history: "سوابق",
    company: "شرکت / مشارکت کننده",
    companyPlaceholder: "نام شرکت را وارد کنید",
    status: "وضعیت غرفه",
    owner: "مسئول پیگیری",
    unassigned: "بدون مسئول",
    zone: "سالن یا زون",
    zonePlaceholder: "برای مثال سالن A / زون ۲",
    notes: "یادداشت اجرایی",
    notesPlaceholder: "دسترسی، محدودیت ساخت، زمان تحویل یا نکات مهم غرفه",
    boothFacts: "خلاصه عملیات",
    area: "مساحت",
    dimensions: "ابعاد و مساحت",
    dimensionsHint: "اندازه دقیق را بنویسید یا با دستگیره های روی نقشه تغییر دهید.",
    width: "عرض",
    depth: "عمق",
    meters: "متر",
    calculatedArea: "مساحت محاسبه شده",
    aspectRatio: "نسبت ابعاد",
    applyDimensions: "اعمال عرض و عمق",
    quickSize: "ورود سریع",
    quickSizeHint: "ابعاد یا فقط مساحت را وارد کنید؛ برای مساحت، نسبت فعلی حفظ می شود.",
    quickSizePlaceholder: "۲ × ۴ یا ۴۰ متر مربع",
    quickSizeExample: "نمونه: ۲ × ۴، 2x4، 2 by 4 یا ۴۰ m²",
    quickSizePreview: "اندازه پیشنهادی",
    applyQuickSize: "اعمال اندازه پیشنهادی",
    invalidDimension: "عرض و عمق باید عدد مثبت و حداقل ۰٫۲۵ متر باشند.",
    invalidQuickSize: "اندازه را مانند ۲ × ۴ یا مساحت را مانند ۴۰ m² وارد کنید.",
    unchangedDimensions: "این اندازه با ابعاد فعلی یکسان است.",
    equipmentLines: "ردیف تجهیزات",
    equipmentShortcut: "تجهیزات و تطبیق جمع آوری",
    equipmentShortcutEmpty: "هنوز تجهیزی ثبت نشده؛ برای افزودن وارد شوید.",
    returnableSummary: "قابل بازگشت",
    delivered: "تحویل شده",
    collected: "جمع آوری شده",
    issues: "مشکل باز",
    createTask: "ساخت وظیفه برای غرفه",
    createTaskHint: "یک پیگیری اجرایی متصل به این غرفه ایجاد کنید.",
    addEquipment: "افزودن تجهیز",
    chooseCatalogItem: "انتخاب از کاتالوگ تجهیزات",
    emptyCatalog: "کاتالوگ تجهیزی برای انتخاب ندارد.",
    bulkActions: "عملیات گروهی",
    markAllDelivered: "همه تحویل شدند",
    markAllCollected: "همه جمع آوری شدند",
    noEquipment: "هنوز تجهیزی برای این غرفه ثبت نشده است.",
    noEquipmentHint: "از کاتالوگ یک مورد انتخاب کنید و مقدار موردنیاز را تنظیم کنید.",
    quantity: "تعداد",
    collectionCheck: "تطبیق هنگام جمع آوری",
    collectionCheckHint: "تعداد اقلام پیدا شده را با تعداد مورد انتظار تطبیق دهید.",
    requestedCount: "مورد انتظار",
    foundCount: "پیدا شده",
    missingCount: "مورد کسری",
    allAccountedFor: "همه اقلام موجود است",
    recordCollection: "ثبت نتیجه جمع آوری",
    collectionRecorded: "نتیجه ثبت شد",
    decreaseFound: "کاهش تعداد پیدا شده",
    increaseFound: "افزایش تعداد پیدا شده",
    invalidCollectionCount: "تعداد باید عددی بین صفر و تعداد مورد انتظار باشد.",
    decrease: "کاهش تعداد",
    increase: "افزایش تعداد",
    quantityLocked:
      "تعداد این ردیف پس از ورود به مرحله نهایی قفل است؛ مقدار بیشتر را به صورت درخواست جدید ثبت کنید.",
    remove: "حذف ردیف",
    confirmationRequired: "با انتخاب این گزینه، جریان تایید باز می شود.",
    deliveryWindow: "بازه تحویل",
    deliveryWindowPlaceholder: "برای مثال ۱۵ تیر، ساعت ۹ تا ۱۲",
    pickupWindow: "بازه جمع آوری",
    pickupWindowPlaceholder: "برای مثال ۱۸ تیر، ساعت ۱۸ تا ۲۱",
    lineNotes: "یادداشت تجهیز",
    lineNotesPlaceholder: "جزئیات نصب، محل تحویل یا نکته اجرایی",
    returnable: "قابل بازگشت",
    nonReturnable: "خدمت / غیرقابل بازگشت",
    pickupNotRequired: "این مورد به جمع آوری نیاز ندارد.",
    noReturnableItems: "مورد قابل بازگشتی برای جمع آوری وجود ندارد.",
    equipmentDetails: "زمان بندی و جزئیات",
    equipmentDetailsHint: "بازه های تحویل، جمع آوری و یادداشت اجرایی",
    reportIssue: "گزارش مشکل",
    currentStage: "وضعیت جاری",
    advance: "مرحله بعد",
    resolveIssue: "رفع مشکل",
    complete: "تکمیل شده",
    operationalHistory: "تاریخچه تغییرات غرفه",
    eventCount: "رویداد ثبت شده",
    noHistory: "هنوز رویدادی برای این غرفه ثبت نشده است.",
    system: "سیستم",
    recent: "اخیرا",
    dangerZone: "عملیات حساس",
    deleteBooth: "حذف غرفه",
    deleteWarning:
      "حذف غرفه یک اقدام مخرب است. تایید، مجوز و ثبت رویداد باید در جریان والد انجام شود.",
    notSet: "ثبت نشده",
  },
  en: {
    inspector: "Booth record",
    booth: "Booth",
    overview: "Overview",
    equipment: "Equipment",
    history: "History",
    company: "Company / exhibitor",
    companyPlaceholder: "Enter the exhibitor company",
    status: "Booth status",
    owner: "Accountable owner",
    unassigned: "Unassigned",
    zone: "Hall or zone",
    zonePlaceholder: "For example Hall A / Zone 2",
    notes: "Operations notes",
    notesPlaceholder: "Access, build constraints, delivery window, or other booth notes",
    boothFacts: "Operations summary",
    area: "Area",
    dimensions: "Dimensions and area",
    dimensionsHint: "Enter an exact size or use the resize handles on the floor plan.",
    width: "Width",
    depth: "Depth",
    meters: "metres",
    calculatedArea: "Calculated area",
    aspectRatio: "Aspect ratio",
    applyDimensions: "Apply width and depth",
    quickSize: "Quick size",
    quickSizeHint: "Enter dimensions or area only; area entry preserves the current proportion.",
    quickSizePlaceholder: "2 × 4 or 40 m²",
    quickSizeExample: "Examples: 2 × 4, 2x4, 2 by 4, or 40 m²",
    quickSizePreview: "Proposed size",
    applyQuickSize: "Apply proposed size",
    invalidDimension: "Width and depth must be positive numbers of at least 0.25 metres.",
    invalidQuickSize: "Enter dimensions such as 2 × 4 or an area such as 40 m².",
    unchangedDimensions: "This matches the booth's current dimensions.",
    equipmentLines: "Equipment lines",
    equipmentShortcut: "Equipment and return check",
    equipmentShortcutEmpty: "No equipment yet; open this section to add the first item.",
    returnableSummary: "returnable",
    delivered: "Delivered",
    collected: "Collected",
    issues: "Open issues",
    createTask: "Create booth task",
    createTaskHint: "Open an operational follow-up linked to this booth.",
    addEquipment: "Add equipment",
    chooseCatalogItem: "Choose from the equipment catalog",
    emptyCatalog: "No catalog items are available.",
    bulkActions: "Bulk operations",
    markAllDelivered: "Mark all delivered",
    markAllCollected: "Mark all collected",
    noEquipment: "No equipment has been assigned to this booth yet.",
    noEquipmentHint: "Choose a catalog item, then adjust the required quantity.",
    quantity: "Quantity",
    collectionCheck: "Pickup reconciliation",
    collectionCheckHint: "Count the items found at pickup and compare them with the expected quantity.",
    requestedCount: "Expected",
    foundCount: "Found",
    missingCount: "missing",
    allAccountedFor: "All items accounted for",
    recordCollection: "Record pickup result",
    collectionRecorded: "Result recorded",
    decreaseFound: "Decrease found count",
    increaseFound: "Increase found count",
    invalidCollectionCount: "Enter a whole number between zero and the expected quantity.",
    decrease: "Decrease quantity",
    increase: "Increase quantity",
    quantityLocked:
      "Quantity is locked after final staging; add a new requested line for extra units.",
    remove: "Remove line",
    confirmationRequired: "This opens the parent confirmation flow.",
    deliveryWindow: "Delivery window",
    deliveryWindowPlaceholder: "For example 15 Jul, 09:00–12:00",
    pickupWindow: "Pickup window",
    pickupWindowPlaceholder: "For example 18 Jul, 18:00–21:00",
    lineNotes: "Equipment notes",
    lineNotesPlaceholder: "Installation details, handoff location, or operations note",
    returnable: "Returnable",
    nonReturnable: "Service / non-returnable",
    pickupNotRequired: "No pickup is required for this line.",
    noReturnableItems: "There are no returnable lines to collect.",
    equipmentDetails: "Schedule and details",
    equipmentDetailsHint: "Delivery, pickup, and operations notes",
    reportIssue: "Report issue",
    currentStage: "Current stage",
    advance: "Advance",
    resolveIssue: "Resolve issue",
    complete: "Complete",
    operationalHistory: "Booth change history",
    eventCount: "recorded events",
    noHistory: "No activity has been recorded for this booth yet.",
    system: "System",
    recent: "Recently",
    dangerZone: "Sensitive action",
    deleteBooth: "Delete booth",
    deleteWarning:
      "Deleting a booth is destructive. Confirmation, authorization, and audit recording belong to the parent workflow.",
    notSet: "Not set",
  },
} as const;

export function BoothInspector({
  locale,
  booth,
  initialTab = "overview",
  catalog,
  staffMembers,
  activity,
  dimensions,
  onUpdateDetails,
  onApplyDimensions,
  onAddEquipment,
  onChangeEquipmentQuantity,
  onUpdateEquipmentLine,
  onAdvanceEquipment,
  onSetEquipmentIssue,
  onRemoveEquipment,
  onRecordCollection,
  onMarkAllDelivered,
  onMarkAllCollected,
  onCreateTask,
  onDeleteBooth,
}: BoothInspectorProps) {
  const localeKey: LocaleKey = locale === "fa" ? "fa" : "en";
  const t = copy[localeKey];
  const detailIdentity = `${booth.id}:${localeKey}`;
  const detailSources: Record<DetailField, string> = {
    company: localize(booth.company, localeKey),
    zone: localize(booth.zone, localeKey),
    notes: localize(booth.notes, localeKey),
  };
  const [activeTab, setActiveTab] = useState<InspectorTab>(initialTab);
  const [catalogSelection, setCatalogSelection] = useState("");
  const [detailDrafts, setDetailDrafts] = useState<Record<DetailField, DetailDraft>>(
    () => createDetailDrafts(detailIdentity, detailSources),
  );
  const tabPrefix = useId();

  const boothView = booth as unknown as Record<string, unknown>;
  const equipment = readEquipmentLines(boothView);
  const catalogItems = catalog as unknown as CatalogItemView[];
  const returnableEquipment = equipment.filter((line) =>
    isEquipmentReturnable(
      line,
      catalogItems.find((item) => item.id === line.catalogItemId),
    ),
  );
  const selectedCatalogId = catalogItems.some((item) => item.id === catalogSelection)
    ? catalogSelection
    : (catalogItems[0]?.id ?? "");
  const boothCode = readBoothCode(boothView);
  const detailValue = (field: DetailField) => {
    const draft = detailDrafts[field];
    return draft.editing && draft.identity === detailIdentity
      ? draft.value
      : detailSources[field];
  };
  const company = detailValue("company") || t.notSet;
  const zone = detailValue("zone") || t.notSet;
  const deliveredCount = equipment.filter((line) =>
    line.stage === "delivered" || line.stage === "collected",
  ).length;
  const collectedCount = returnableEquipment.filter(
    (line) => line.stage === "collected",
  ).length;
  const issueCount = equipment.filter((line) => line.stage === "issue").length;
  const allDelivered =
    equipment.length > 0 &&
    equipment.every((line) => line.stage === "delivered" || line.stage === "collected");
  const allCollected = returnableEquipment.every((line) => line.stage === "collected");
  const pickupSummaryId = `${tabPrefix}-pickup-summary`;

  function beginDetailEdit(field: DetailField) {
    const source = detailSources[field];
    setDetailDrafts((current) => ({
      ...current,
      [field]: {
        value: detailValue(field),
        baseline: source,
        identity: detailIdentity,
        editing: true,
      },
    }));
  }

  function updateDetailDraft(field: DetailField, value: string) {
    setDetailDrafts((current) => ({
      ...current,
      [field]: { ...current[field], value },
    }));
  }

  function commitDetailDraft(field: DetailField) {
    const draft = detailDrafts[field];
    const source = detailSources[field];
    setDetailDrafts((current) => ({
      ...current,
      [field]: { ...current[field], editing: false },
    }));

    if (draft.identity !== detailIdentity || draft.baseline !== source) return;
    if (draft.value !== source) {
      onUpdateDetails({ [field]: draft.value } as DetailPatch);
    }
  }

  const tabs: Array<{
    id: InspectorTab;
    label: string;
    icon: LucideIcon;
    count?: number;
  }> = [
    { id: "overview", label: t.overview, icon: ClipboardList },
    { id: "equipment", label: t.equipment, icon: Box, count: equipment.length },
    { id: "history", label: t.history, icon: History, count: activity.length },
  ];

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: InspectorTab,
  ) {
    const currentIndex = tabs.findIndex((tab) => tab.id === currentTab);
    let nextIndex: number | undefined;

    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const visualStep = event.key === "ArrowRight" ? 1 : -1;
      const directionStep = localeKey === "fa" ? -visualStep : visualStep;
      nextIndex = (currentIndex + directionStep + tabs.length) % tabs.length;
    }

    if (nextIndex === undefined) return;
    event.preventDefault();
    const nextTab = tabs[nextIndex];
    setActiveTab(nextTab.id);
    event.currentTarget.parentElement
      ?.querySelector<HTMLButtonElement>(`[data-inspector-tab="${nextTab.id}"]`)
      ?.focus();
  }

  function openEquipmentTab() {
    setActiveTab("equipment");
    window.requestAnimationFrame(() => {
      document.getElementById(`${tabPrefix}-equipment-tab`)?.focus();
    });
  }

  return (
    <section
      className="min-w-0 overflow-hidden rounded-2xl border border-[#12312a]/12 bg-white/95 text-[#10211d] shadow-[0_14px_40px_rgba(16,33,29,0.08)]"
      dir={localeKey === "fa" ? "rtl" : "ltr"}
      lang={localeKey}
      aria-label={`${t.inspector}: ${boothCode}`}
    >
      <header className="border-b border-[#12312a]/10 bg-[linear-gradient(135deg,#f8f8f3,#eef2eb)] px-3.5 py-3.5">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-[10px] font-black uppercase tracking-[0.13em] text-[#7c6636]">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#b78936]/20 bg-white/70">
              <Building2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="truncate">{t.inspector}</span>
            <span className="shrink-0 text-[#10211d]/25">/</span>
            <span className="shrink-0 text-[#10211d]">{boothCode}</span>
          </div>
          <StatusChip status={booth.status} locale={localeKey} />
        </div>
        <h2 className="mt-3 break-words text-lg font-black leading-6 tracking-tight">
          {company}
        </h2>
        <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-[#50615b]">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{zone}</span>
        </div>
      </header>

      <div
        className="grid grid-cols-3 gap-1 border-b border-[#12312a]/10 bg-white px-2 pt-2"
        role="tablist"
        aria-label={t.inspector}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`${tabPrefix}-${tab.id}-tab`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${tabPrefix}-${tab.id}-panel`}
              tabIndex={selected ? 0 : -1}
              data-inspector-tab={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
              className={`relative flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-t-xl px-1.5 py-2 text-[11px] font-black transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#b78936] ${
                selected
                  ? "bg-[#eef2eb] text-[#10211d]"
                  : "text-[#65726d] hover:bg-[#f5f6f2] hover:text-[#10211d]"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">{tab.label}</span>
              {typeof tab.count === "number" ? (
                <span
                  className={`grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[10px] ${
                    selected ? "bg-white text-[#10211d]" : "bg-[#10211d]/6 text-[#65726d]"
                  }`}
                >
                  {tab.count}
                </span>
              ) : null}
              {selected ? (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#b78936]" />
              ) : null}
            </button>
          );
        })}
      </div>

      {activeTab === "overview" ? (
        <div
          id={`${tabPrefix}-overview-panel`}
          role="tabpanel"
          aria-labelledby={`${tabPrefix}-overview-tab`}
          className="space-y-3 p-3"
        >
          <section
            className="rounded-xl border border-[#12312a]/9 bg-[#f3f5f0] p-3"
            aria-labelledby={`${tabPrefix}-summary-title`}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 id={`${tabPrefix}-summary-title`} className="text-xs font-black">
                {t.boothFacts}
              </h3>
              {issueCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-[10px] font-black text-red-800">
                  <CircleAlert className="h-3 w-3" aria-hidden="true" />
                  {issueCount} {t.issues}
                </span>
              ) : null}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              <Metric
                label={t.area}
                value={formatSquareMeters(
                  dimensions.widthMeters * dimensions.depthMeters,
                  localeKey,
                )}
              />
              <Metric label={t.equipmentLines} value={String(equipment.length)} />
              <Metric label={t.delivered} value={String(deliveredCount)} tone="success" />
              <Metric label={t.collected} value={String(collectedCount)} />
            </dl>
          </section>

          <button
            type="button"
            onClick={openEquipmentTab}
            aria-controls={`${tabPrefix}-equipment-panel`}
            className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-violet-200/80 bg-violet-50/60 p-3 text-start transition hover:border-violet-300 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-800">
              <Box className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-black text-[#10211d]">
                  {t.equipmentShortcut}
                </span>
                {issueCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-800">
                    <CircleAlert className="h-3 w-3" aria-hidden="true" />
                    {issueCount}
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block text-[11px] leading-4 text-[#65726d]">
                {equipment.length === 0
                  ? t.equipmentShortcutEmpty
                  : `${equipment.length} ${t.equipmentLines} · ${returnableEquipment.length} ${t.returnableSummary}`}
              </span>
            </span>
            {localeKey === "fa" ? (
              <ChevronLeft className="h-4 w-4 shrink-0 text-violet-700" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-violet-700" aria-hidden="true" />
            )}
          </button>

          <BoothDimensionEditor
            key={`${booth.id}:${dimensions.widthMeters}:${dimensions.depthMeters}`}
            locale={localeKey}
            copy={t}
            dimensions={dimensions}
            onApply={onApplyDimensions}
            idPrefix={`${tabPrefix}-dimensions`}
          />

          <section className="rounded-xl border border-[#12312a]/9 bg-[#fbfcf9] p-3">
            <div className="grid gap-3">
              <Field label={t.company} icon={Building2}>
                <input
                  type="text"
                  value={detailValue("company")}
                  placeholder={t.companyPlaceholder}
                  onFocus={() => beginDetailEdit("company")}
                  onChange={(event) =>
                    updateDetailDraft("company", event.currentTarget.value)
                  }
                  onBlur={() => commitDetailDraft("company")}
                  className={fieldClassName}
                />
              </Field>

              <Field label={t.status} icon={CheckCircle2}>
                <select
                  value={booth.status}
                  onChange={(event) =>
                    onUpdateDetails({
                      status: event.currentTarget.value as Booth["status"],
                    })
                  }
                  className={fieldClassName}
                >
                  {boothStatuses.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status][localeKey]}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={t.owner} icon={UserRound}>
                <select
                  value={String(booth.owner ?? "")}
                  onChange={(event) =>
                    onUpdateDetails({ owner: event.currentTarget.value as Booth["owner"] })
                  }
                  className={fieldClassName}
                >
                  <option value="">{t.unassigned}</option>
                  {booth.owner && !staffMembers.includes(String(booth.owner)) ? (
                    <option value={String(booth.owner)}>{String(booth.owner)}</option>
                  ) : null}
                  {staffMembers.map((staffMember) => (
                    <option key={staffMember} value={staffMember}>
                      {staffMember}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={t.zone} icon={MapPin}>
                <input
                  type="text"
                  value={detailValue("zone")}
                  placeholder={t.zonePlaceholder}
                  onFocus={() => beginDetailEdit("zone")}
                  onChange={(event) => updateDetailDraft("zone", event.currentTarget.value)}
                  onBlur={() => commitDetailDraft("zone")}
                  className={fieldClassName}
                />
              </Field>

              <Field label={t.notes} icon={NotebookPen}>
                <textarea
                  rows={3}
                  value={detailValue("notes")}
                  placeholder={t.notesPlaceholder}
                  onFocus={() => beginDetailEdit("notes")}
                  onChange={(event) => updateDetailDraft("notes", event.currentTarget.value)}
                  onBlur={() => commitDetailDraft("notes")}
                  className={`${fieldClassName} min-h-24 resize-y leading-5`}
                />
              </Field>
            </div>
          </section>

          <button
            type="button"
            onClick={onCreateTask}
            className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-[#198ba0]/22 bg-[#198ba0]/8 p-3 text-start transition hover:bg-[#198ba0]/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#198ba0]"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#198ba0]/12 text-[#126b7b]">
              <ListPlus className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black">{t.createTask}</span>
              <span className="mt-0.5 block text-[11px] leading-4 text-[#65726d]">
                {t.createTaskHint}
              </span>
            </span>
            {localeKey === "fa" ? (
              <ChevronLeft className="h-4 w-4 shrink-0 text-[#126b7b]" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-[#126b7b]" aria-hidden="true" />
            )}
          </button>

          <details className="group rounded-xl border border-red-200/75 bg-red-50/55">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-black text-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 [&::-webkit-details-marker]:hidden">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{t.dangerZone}</span>
              <ChevronDown className="h-4 w-4 shrink-0 transition group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="border-t border-red-200/70 px-3 pb-3 pt-2.5">
              <p className="text-xs leading-5 text-red-800/80">{t.deleteWarning}</p>
              <button
                type="button"
                onClick={onDeleteBooth}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-3 py-2.5 text-sm font-black text-red-800 transition hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {t.deleteBooth}
              </button>
            </div>
          </details>
        </div>
      ) : null}

      {activeTab === "equipment" ? (
        <div
          id={`${tabPrefix}-equipment-panel`}
          role="tabpanel"
          aria-labelledby={`${tabPrefix}-equipment-tab`}
          className="p-3"
        >
          <div className="rounded-xl border border-[#12312a]/10 bg-[#f7f8f5] p-3">
            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-black text-[#50615b]">
                {t.chooseCatalogItem}
              </span>
              <div className="grid gap-2">
                <select
                  value={selectedCatalogId}
                  onChange={(event) => setCatalogSelection(event.currentTarget.value)}
                  disabled={catalogItems.length === 0}
                  className={`${fieldClassName} min-w-0`}
                >
                  {catalogItems.length === 0 ? (
                    <option value="">{t.emptyCatalog}</option>
                  ) : (
                    catalogItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {catalogItemLabel(item, localeKey)}
                      </option>
                    ))
                  )}
                </select>
                <button
                  type="button"
                  disabled={!selectedCatalogId}
                  onClick={() => selectedCatalogId && onAddEquipment(selectedCatalogId)}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#10211d] px-3 py-2.5 text-sm font-black text-white transition hover:bg-[#1a382f] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b78936]"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t.addEquipment}
                </button>
              </div>
            </label>
          </div>

          <details className="group mt-2 rounded-xl border border-[#12312a]/9 bg-white">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs font-black text-[#50615b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b78936] [&::-webkit-details-marker]:hidden">
              <PackageCheck className="h-4 w-4 shrink-0 text-[#126b7b]" aria-hidden="true" />
              <span className="flex-1">{t.bulkActions}</span>
              <ChevronDown className="h-4 w-4 shrink-0 transition group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="border-t border-[#12312a]/8 p-3">
              <div className="grid gap-2">
                <button
                  type="button"
                  disabled={equipment.length === 0 || allDelivered}
                  onClick={onMarkAllDelivered}
                  className={bulkActionClassName}
                >
                  <Truck className="h-4 w-4" aria-hidden="true" />
                  {t.markAllDelivered}
                </button>
                <button
                  type="button"
                  disabled={returnableEquipment.length === 0 || allCollected}
                  onClick={onMarkAllCollected}
                  aria-describedby={pickupSummaryId}
                  className={bulkActionClassName}
                >
                  <PackageCheck className="h-4 w-4" aria-hidden="true" />
                  {t.markAllCollected}
                </button>
              </div>
              <p id={pickupSummaryId} className="mt-2 max-w-sm text-xs leading-5 text-[#65726d]">
                {returnableEquipment.length === 0
                  ? t.noReturnableItems
                  : localeKey === "fa"
                    ? `${returnableEquipment.length} ردیف قابل بازگشت در برنامه جمع آوری قرار دارد.`
                    : `${returnableEquipment.length} returnable ${returnableEquipment.length === 1 ? "line is" : "lines are"} included in pickup.`}
              </p>
            </div>
          </details>

          {equipment.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-[#12312a]/18 bg-white px-3 py-8 text-center">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[#10211d]/6 text-[#50615b]">
                <Warehouse className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-black">{t.noEquipment}</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#65726d]">
                {t.noEquipmentHint}
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {equipment.map((line) => {
                const item = catalogItems.find((catalogItem) => catalogItem.id === line.catalogItemId);
                const returnable = isEquipmentReturnable(line, item);
                const nextStage = nextEquipmentStage(line.stage, returnable);
                const quantityLocked = !isEquipmentQuantityEditable(line.stage);
                const lineComplete =
                  line.stage === "collected" || (!returnable && line.stage === "delivered");
                const showCollectionCheck =
                  returnable &&
                  (line.stage === "delivered" ||
                    line.stage === "issue" ||
                    line.stage === "collected");
                const visibleStages = equipmentStages.filter(
                  (stage) => returnable || stage !== "collected" || line.stage === "collected",
                );
                const quantityHintId = `${tabPrefix}-${line.id}-quantity-hint`;
                return (
                  <article
                    key={line.id}
                    className={`rounded-xl border p-3 shadow-[0_8px_24px_rgba(16,33,29,0.04)] ${
                      line.stage === "issue"
                        ? "border-red-200 bg-red-50/35"
                        : "border-[#12312a]/11 bg-white"
                    }`}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-sm font-black leading-5">
                          {item
                            ? catalogItemLabel(item, localeKey)
                            : localize(line.name, localeKey, line.catalogItemId || t.equipment)}
                        </h3>
                        <p className="mt-1 text-[11px] text-[#65726d]">
                          {item
                            ? catalogCategoryLabel(item, localeKey)
                            : localize(line.category, localeKey, t.equipment)}
                        </p>
                      </div>
                      <StageChip stage={line.stage} locale={localeKey} />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black ${
                          returnable
                            ? "border-violet-200 bg-violet-50 text-violet-800"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {returnable ? (
                          <RotateCcw className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        )}
                        {returnable ? t.returnable : t.nonReturnable}
                      </span>
                    </div>

                    <div className="mt-3 rounded-xl border border-[#12312a]/8 bg-[#f7f8f5] p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-[#50615b]">{t.quantity}</span>
                        <button
                          type="button"
                          onClick={() => onRemoveEquipment(line.id)}
                          aria-label={`${t.remove}. ${t.confirmationRequired}`}
                          title={`${t.remove} · ${t.confirmationRequired}`}
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-red-200 bg-white text-red-700 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-[2.75rem_minmax(3rem,1fr)_2.75rem] gap-2">
                        <button
                          type="button"
                          disabled={quantityLocked || line.quantity <= 1}
                          onClick={() => onChangeEquipmentQuantity(line.id, -1)}
                          aria-label={`${t.decrease}: ${line.quantity}`}
                          aria-describedby={quantityLocked ? quantityHintId : undefined}
                          title={quantityLocked ? t.quantityLocked : undefined}
                          className={quantityButtonClassName}
                        >
                          <Minus className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <output
                          className="grid h-11 min-w-0 place-items-center rounded-xl border border-[#12312a]/12 bg-white px-2 text-sm font-black tabular-nums"
                          aria-label={`${t.quantity}: ${line.quantity}`}
                        >
                          {line.quantity}
                        </output>
                        <button
                          type="button"
                          disabled={quantityLocked}
                          onClick={() => onChangeEquipmentQuantity(line.id, 1)}
                          aria-label={`${t.increase}: ${line.quantity}`}
                          aria-describedby={quantityLocked ? quantityHintId : undefined}
                          title={quantityLocked ? t.quantityLocked : undefined}
                          className={quantityButtonClassName}
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                      {quantityLocked ? (
                        <p
                          id={quantityHintId}
                          className="mt-2 flex items-start gap-1.5 text-[11px] leading-4 text-amber-800"
                        >
                          <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {t.quantityLocked}
                        </p>
                      ) : null}
                    </div>

                    {showCollectionCheck ? (
                      <ReturnReconciliation
                        key={`${line.id}:${line.quantity}:${line.collectedQuantity ?? "unrecorded"}`}
                        locale={localeKey}
                        copy={t}
                        lineId={line.id}
                        requestedQuantity={line.quantity}
                        recordedQuantity={
                          line.collectedQuantity ??
                          (line.stage === "collected" ? line.quantity : undefined)
                        }
                        onRecord={onRecordCollection}
                        idPrefix={`${tabPrefix}-${line.id}-collection`}
                      />
                    ) : null}

                    <div className="mt-3 grid gap-2">
                      {line.stage !== "issue" ? (
                        <button
                          type="button"
                          disabled={lineComplete}
                          onClick={() => onAdvanceEquipment(line.id)}
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#198ba0]/25 bg-[#198ba0]/9 px-3 py-2.5 text-sm font-black text-[#126b7b] transition hover:bg-[#198ba0]/14 disabled:cursor-not-allowed disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#198ba0]"
                        >
                          {lineComplete ? (
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          ) : localeKey === "fa" ? (
                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          )}
                          {lineComplete
                            ? t.complete
                            : `${t.advance}: ${nextStage ? stageLabels[nextStage][localeKey] : t.complete}`}
                        </button>
                      ) : null}

                        <button
                          type="button"
                          aria-pressed={line.stage === "issue"}
                          onClick={() => onSetEquipmentIssue(line.id, line.stage !== "issue")}
                          className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
                            line.stage === "issue"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 focus-visible:outline-emerald-600"
                              : "border-red-200 bg-white text-red-800 hover:bg-red-50 focus-visible:outline-red-600"
                          }`}
                        >
                          {line.stage === "issue" ? (
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <CircleAlert className="h-4 w-4" aria-hidden="true" />
                          )}
                          {line.stage === "issue" ? t.resolveIssue : t.reportIssue}
                        </button>
                    </div>

                    <details className="group mt-3 rounded-xl border border-[#12312a]/9 bg-[#fbfcf9]">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b78936] [&::-webkit-details-marker]:hidden">
                        <CalendarClock className="h-4 w-4 shrink-0 text-[#7c6636]" aria-hidden="true" />
                        <span className="min-w-0 flex-1 text-start">
                          <span className="block text-xs font-black">{t.equipmentDetails}</span>
                          <span className="mt-0.5 block truncate text-[10px] text-[#65726d]">
                            {t.equipmentDetailsHint}
                          </span>
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-[#65726d] transition group-open:rotate-180" aria-hidden="true" />
                      </summary>
                      <div className="grid gap-3 border-t border-[#12312a]/8 p-3">
                        <Field label={t.deliveryWindow} icon={CalendarClock}>
                          <input
                            key={`${line.id}-delivery-${line.deliveryWindow}`}
                            type="text"
                            dir="auto"
                            defaultValue={line.deliveryWindow}
                            placeholder={t.deliveryWindowPlaceholder}
                            onBlur={(event) =>
                              commitEquipmentLineField(
                                line,
                                "deliveryWindow",
                                event.currentTarget.value,
                                onUpdateEquipmentLine,
                              )
                            }
                            className={fieldClassName}
                          />
                        </Field>

                        {returnable ? (
                          <Field label={t.pickupWindow} icon={RotateCcw}>
                            <input
                              key={`${line.id}-pickup-${line.pickupWindow}`}
                              type="text"
                              dir="auto"
                              defaultValue={line.pickupWindow}
                              placeholder={t.pickupWindowPlaceholder}
                              onBlur={(event) =>
                                commitEquipmentLineField(
                                  line,
                                  "pickupWindow",
                                  event.currentTarget.value,
                                  onUpdateEquipmentLine,
                                )
                              }
                              className={fieldClassName}
                            />
                          </Field>
                        ) : (
                          <div>
                            <span className="mb-1.5 flex items-center gap-2 text-xs font-black text-[#50615b]">
                              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                              {t.pickupWindow}
                            </span>
                            <div className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700">
                              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                              {t.pickupNotRequired}
                            </div>
                          </div>
                        )}

                        <Field label={t.lineNotes} icon={NotebookPen}>
                          <textarea
                            key={`${line.id}-notes-${line.notes}`}
                            rows={2}
                            dir="auto"
                            defaultValue={line.notes}
                            placeholder={t.lineNotesPlaceholder}
                            onBlur={(event) =>
                              commitEquipmentLineField(
                                line,
                                "notes",
                                event.currentTarget.value,
                                onUpdateEquipmentLine,
                              )
                            }
                            className={`${fieldClassName} min-h-20 resize-y leading-5`}
                          />
                        </Field>

                        <div className="border-t border-[#12312a]/8 pt-3">
                          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#65726d]">
                            {t.currentStage}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {visibleStages.map((stage) => (
                              <StageRailChip
                                key={stage}
                                stage={stage}
                                currentStage={line.stage}
                                locale={localeKey}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </details>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "history" ? (
        <div
          id={`${tabPrefix}-history-panel`}
          role="tabpanel"
          aria-labelledby={`${tabPrefix}-history-tab`}
          className="p-3"
        >
          <div className="flex items-end justify-between gap-2 border-b border-[#12312a]/10 pb-3">
            <div>
              <h3 className="text-sm font-black">{t.operationalHistory}</h3>
              <p className="mt-1 text-xs text-[#65726d]">
                {activity.length} {t.eventCount}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 text-xs text-[#65726d]">
              <History className="h-4 w-4" aria-hidden="true" />
              {boothCode}
            </span>
          </div>

          {activity.length === 0 ? (
            <div className="py-12 text-center">
              <History className="mx-auto h-8 w-8 text-[#10211d]/24" aria-hidden="true" />
              <p className="mt-3 text-sm text-[#65726d]">{t.noHistory}</p>
            </div>
          ) : (
            <ol className="divide-y divide-[#12312a]/8">
              {activity.map((event, index) => (
                <AuditRow
                  key={readAuditId(event, index)}
                  event={event}
                  locale={localeKey}
                  fallbackActor={t.system}
                  recentLabel={t.recent}
                />
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </section>
  );
}

function ReturnReconciliation({
  locale,
  copy: t,
  lineId,
  requestedQuantity,
  recordedQuantity,
  onRecord,
  idPrefix,
}: {
  locale: LocaleKey;
  copy: (typeof copy)[LocaleKey];
  lineId: string;
  requestedQuantity: number;
  recordedQuantity?: number;
  onRecord: (lineId: string, collectedQuantity: number) => void;
  idPrefix: string;
}) {
  const initialFoundQuantity = recordedQuantity ?? requestedQuantity;
  const [foundDraft, setFoundDraft] = useState(String(initialFoundQuantity));
  const [lastRecorded, setLastRecorded] = useState<number | null>(
    recordedQuantity ?? null,
  );
  const foundQuantity = parseCollectionQuantity(foundDraft, requestedQuantity);
  const valid = foundQuantity !== null;
  const missingQuantity = foundQuantity === null ? 0 : requestedQuantity - foundQuantity;
  const hasMissing = valid && missingQuantity > 0;
  const alreadyRecorded = valid && lastRecorded === foundQuantity;
  const hintId = `${idPrefix}-hint`;
  const errorId = `${idPrefix}-error`;
  const statusId = `${idPrefix}-status`;

  function stepFoundQuantity(delta: number) {
    const current = foundQuantity ?? (delta > 0 ? 0 : requestedQuantity);
    setFoundDraft(String(Math.min(requestedQuantity, Math.max(0, current + delta))));
  }

  return (
    <section
      className={`mt-3 rounded-xl border p-3 ${
        !valid || hasMissing
          ? "border-red-200 bg-red-50/70"
          : "border-emerald-200 bg-emerald-50/55"
      }`}
      aria-labelledby={`${idPrefix}-title`}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
            !valid || hasMissing
              ? "bg-red-100 text-red-800"
              : "bg-emerald-100 text-emerald-800"
          }`}
        >
          <PackageCheck className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <h4 id={`${idPrefix}-title`} className="text-xs font-black text-[#10211d]">
              {t.collectionCheck}
            </h4>
            <span className="rounded-full border border-[#12312a]/10 bg-white/80 px-2 py-1 text-[10px] font-black tabular-nums text-[#50615b]">
              {t.requestedCount}: {requestedQuantity}
            </span>
          </div>
          <p id={hintId} className="mt-1 text-[10px] leading-4 text-[#65726d]">
            {t.collectionCheckHint}
          </p>
        </div>
      </div>

      <div className="mt-3 text-[10px] font-black uppercase tracking-[0.08em] text-[#50615b]">
        {t.foundCount}
      </div>
      <div className="mt-1.5 grid grid-cols-[2.75rem_minmax(4rem,1fr)_2.75rem] gap-2">
        <button
          type="button"
          disabled={valid && foundQuantity <= 0}
          onClick={() => stepFoundQuantity(-1)}
          aria-label={`${t.decreaseFound}: ${valid ? foundQuantity : 0}`}
          className={quantityButtonClassName}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <label className="min-w-0">
          <span className="sr-only">{t.foundCount}</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9۰-۹٠-٩]*"
            dir="ltr"
            value={foundDraft}
            onChange={(event) => setFoundDraft(event.currentTarget.value)}
            aria-invalid={!valid}
            aria-describedby={`${hintId} ${valid ? statusId : errorId}`}
            className={`h-11 w-full min-w-0 rounded-xl border bg-white px-2 text-center text-base font-black tabular-nums text-[#10211d] outline-none transition focus:ring-3 ${
              valid
                ? "border-[#12312a]/14 focus:border-[#b78936]/65 focus:ring-[#b78936]/10"
                : "border-red-300 focus:border-red-500 focus:ring-red-500/10"
            }`}
          />
        </label>
        <button
          type="button"
          disabled={valid && foundQuantity >= requestedQuantity}
          onClick={() => stepFoundQuantity(1)}
          aria-label={`${t.increaseFound}: ${valid ? foundQuantity : 0}`}
          className={quantityButtonClassName}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {!valid ? (
        <p
          id={errorId}
          role="alert"
          className="mt-2 flex items-start gap-1.5 text-[11px] font-bold leading-4 text-red-700"
        >
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t.invalidCollectionCount}
        </p>
      ) : (
        <p
          id={statusId}
          className={`mt-2 flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-center text-xs font-black ${
            hasMissing
              ? "bg-red-100 text-red-800"
              : "bg-emerald-100 text-emerald-800"
          }`}
          aria-live="polite"
          aria-atomic="true"
        >
          {hasMissing ? (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          {hasMissing
            ? `${new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US").format(missingQuantity)} ${t.missingCount}`
            : t.allAccountedFor}
        </p>
      )}

      <button
        type="button"
        disabled={!valid || alreadyRecorded}
        onClick={() => {
          if (foundQuantity === null) return;
          onRecord(lineId, foundQuantity);
          setLastRecorded(foundQuantity);
        }}
        className={`mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 ${
          !valid || hasMissing
            ? "border-red-300 bg-red-700 text-white hover:bg-red-800 focus-visible:outline-red-600"
            : "border-emerald-300 bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:outline-emerald-600"
        }`}
      >
        {hasMissing ? (
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        ) : (
          <PackageCheck className="h-4 w-4" aria-hidden="true" />
        )}
        {alreadyRecorded ? t.collectionRecorded : t.recordCollection}
      </button>
    </section>
  );
}

const minimumBoothDimensionMeters = 0.25;

function BoothDimensionEditor({
  locale,
  copy: t,
  dimensions,
  onApply,
  idPrefix,
}: {
  locale: LocaleKey;
  copy: (typeof copy)[LocaleKey];
  dimensions: BoothDimensions;
  onApply: (dimensions: BoothDimensions) => void;
  idPrefix: string;
}) {
  const [widthDraft, setWidthDraft] = useState(
    formatDimensionInput(dimensions.widthMeters),
  );
  const [depthDraft, setDepthDraft] = useState(
    formatDimensionInput(dimensions.depthMeters),
  );
  const [quickSizeDraft, setQuickSizeDraft] = useState("");

  const widthMeters = parseLocalizedMeasurement(widthDraft);
  const depthMeters = parseLocalizedMeasurement(depthDraft);
  const directDimensionsValid =
    isValidBoothDimension(widthMeters) && isValidBoothDimension(depthMeters);
  const directDimensions = directDimensionsValid
    ? { widthMeters, depthMeters }
    : null;
  const directDimensionsChanged =
    directDimensions !== null &&
    !dimensionsEqual(directDimensions, dimensions);

  const quickSize = parseQuickSize(
    quickSizeDraft,
    directDimensions ?? dimensions,
  );
  const quickSizeHasValue = quickSizeDraft.trim().length > 0;
  const quickSizeValid =
    quickSize !== null &&
    isValidBoothDimension(quickSize.widthMeters) &&
    isValidBoothDimension(quickSize.depthMeters);
  const quickSizeChanged =
    quickSizeValid && !dimensionsEqual(quickSize, dimensions);
  const summaryArea = dimensions.widthMeters * dimensions.depthMeters;
  const directErrorId = `${idPrefix}-direct-error`;
  const quickSizeHintId = `${idPrefix}-quick-hint`;
  const quickSizeErrorId = `${idPrefix}-quick-error`;

  return (
    <details
      open
      className="group overflow-hidden rounded-xl border border-[#b78936]/22 bg-[linear-gradient(145deg,#fffdf8,#f6f3e9)]"
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2.5 px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#b78936] [&::-webkit-details-marker]:hidden">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#b78936]/20 bg-white text-[#7c6636] shadow-sm">
          <Ruler className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 text-start">
          <span className="block text-xs font-black">{t.dimensions}</span>
          <span className="mt-0.5 block truncate text-[10px] text-[#65726d]">
            {formatMeasurement(dimensions.widthMeters, locale)} ×{" "}
            {formatMeasurement(dimensions.depthMeters, locale)} {t.meters} ·{" "}
            {formatSquareMeters(summaryArea, locale)}
          </span>
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-[#7c6636] transition group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>

      <div className="space-y-4 border-t border-[#b78936]/15 p-3">
        <p className="text-[11px] leading-5 text-[#65726d]">{t.dimensionsHint}</p>

        <fieldset className="min-w-0">
          <legend className="sr-only">{t.dimensions}</legend>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_1.25rem_minmax(0,1fr)] items-end gap-1.5">
            <DimensionInput
              id={`${idPrefix}-width`}
              label={t.width}
              unit={t.meters}
              value={widthDraft}
              onChange={setWidthDraft}
              invalid={!directDimensionsValid}
              errorId={directErrorId}
            />
            <span
              className="grid min-h-11 place-items-center pb-0.5 text-sm font-black text-[#7c6636]"
              aria-hidden="true"
            >
              ×
            </span>
            <DimensionInput
              id={`${idPrefix}-depth`}
              label={t.depth}
              unit={t.meters}
              value={depthDraft}
              onChange={setDepthDraft}
              invalid={!directDimensionsValid}
              errorId={directErrorId}
            />
          </div>

          {!directDimensionsValid ? (
            <p
              id={directErrorId}
              role="alert"
              className="mt-2 flex items-start gap-1.5 text-[11px] font-bold leading-4 text-red-700"
            >
              <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {t.invalidDimension}
            </p>
          ) : null}

          <div
            className="mt-3 grid grid-cols-2 gap-2"
            aria-live="polite"
            aria-atomic="true"
          >
            <DimensionFact
              label={t.calculatedArea}
              value={
                directDimensions
                  ? formatSquareMeters(
                      directDimensions.widthMeters * directDimensions.depthMeters,
                      locale,
                    )
                  : "—"
              }
            />
            <DimensionFact
              label={t.aspectRatio}
              value={directDimensions ? formatAspectRatio(directDimensions, locale) : "—"}
            />
          </div>

          <button
            type="button"
            disabled={!directDimensionsValid || !directDimensionsChanged}
            onClick={() => {
              if (directDimensions) onApply(directDimensions);
            }}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#12312a] px-3 py-2.5 text-sm font-black text-white transition hover:bg-[#1a443a] disabled:cursor-not-allowed disabled:bg-[#12312a]/28 disabled:text-white/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b78936]"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {directDimensionsValid && !directDimensionsChanged
              ? t.unchangedDimensions
              : t.applyDimensions}
          </button>
        </fieldset>

        <div className="border-t border-[#b78936]/15 pt-4">
          <label
            htmlFor={`${idPrefix}-quick-size`}
            className="block text-[11px] font-black text-[#50615b]"
          >
            {t.quickSize}
          </label>
          <p id={quickSizeHintId} className="mt-1 text-[10px] leading-4 text-[#65726d]">
            {t.quickSizeHint}
          </p>
          <input
            id={`${idPrefix}-quick-size`}
            type="text"
            dir="auto"
            value={quickSizeDraft}
            onChange={(event) => setQuickSizeDraft(event.currentTarget.value)}
            placeholder={t.quickSizePlaceholder}
            aria-describedby={`${quickSizeHintId}${
              quickSizeHasValue && !quickSizeValid ? ` ${quickSizeErrorId}` : ""
            }`}
            aria-invalid={quickSizeHasValue && !quickSizeValid}
            className={`${fieldClassName} mt-2 font-bold tabular-nums`}
          />
          <p className="mt-1.5 text-[10px] leading-4 text-[#65726d]">
            {t.quickSizeExample}
          </p>

          {quickSizeHasValue && !quickSizeValid ? (
            <p
              id={quickSizeErrorId}
              role="alert"
              className="mt-2 flex items-start gap-1.5 text-[11px] font-bold leading-4 text-red-700"
            >
              <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {t.invalidQuickSize}
            </p>
          ) : null}

          {quickSizeValid ? (
            <div
              className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/75 p-2.5"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="text-[9px] font-black uppercase tracking-[0.08em] text-emerald-800/65">
                {t.quickSizePreview}
              </div>
              <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-emerald-950">
                <strong className="text-sm tabular-nums">
                  {formatMeasurement(quickSize.widthMeters, locale)} ×{" "}
                  {formatMeasurement(quickSize.depthMeters, locale)} {t.meters}
                </strong>
                <span className="text-xs font-black tabular-nums">
                  {formatSquareMeters(
                    quickSize.widthMeters * quickSize.depthMeters,
                    locale,
                  )}
                </span>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            disabled={!quickSizeValid || !quickSizeChanged}
            onClick={() => {
              if (quickSizeValid) onApply(quickSize);
            }}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#12312a]/15 bg-white px-3 py-2.5 text-sm font-black text-[#10211d] transition hover:border-[#b78936]/45 hover:bg-[#b78936]/8 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b78936]"
          >
            <Ruler className="h-4 w-4" aria-hidden="true" />
            {quickSizeValid && !quickSizeChanged
              ? t.unchangedDimensions
              : t.applyQuickSize}
          </button>
        </div>
      </div>
    </details>
  );
}

function DimensionInput({
  id,
  label,
  unit,
  value,
  onChange,
  invalid,
  errorId,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  errorId: string;
}) {
  return (
    <label htmlFor={id} className="block min-w-0">
      <span className="mb-1.5 block text-[10px] font-black text-[#50615b]">{label}</span>
      <span className="relative block min-w-0" dir="ltr">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          dir="ltr"
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          className={`${fieldClassName} min-w-0 pe-8 font-black tabular-nums ${
            invalid ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : ""
          }`}
        />
        <span
          className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-[9px] font-black text-[#65726d]"
          aria-hidden="true"
        >
          m
        </span>
      </span>
      <span className="sr-only">{unit}</span>
    </label>
  );
}

function DimensionFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#12312a]/8 bg-white/80 p-2.5">
      <div className="text-[9px] font-bold uppercase leading-3 tracking-[0.07em] text-[#65726d]">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-black tabular-nums text-[#10211d]">
        {value}
      </div>
    </div>
  );
}

const fieldClassName =
  "min-h-11 w-full rounded-xl border border-[#12312a]/14 bg-white px-3 py-2.5 text-sm text-[#10211d] outline-none transition placeholder:text-[#65726d]/58 focus:border-[#b78936]/65 focus:ring-3 focus:ring-[#b78936]/10";

const quantityButtonClassName =
  "grid h-11 w-11 place-items-center rounded-xl border border-[#12312a]/12 bg-white text-[#10211d] transition hover:border-[#b78936]/45 hover:bg-[#b78936]/8 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b78936]";

const bulkActionClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#12312a]/12 bg-white px-3.5 py-2.5 text-sm font-bold text-[#10211d] transition hover:border-[#b78936]/40 hover:bg-[#b78936]/8 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b78936]";

function Field({
  label,
  icon: Icon,
  className = "",
  children,
}: {
  label: string;
  icon: LucideIcon;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 flex min-w-0 items-center gap-1.5 text-[11px] font-black leading-4 text-[#50615b]">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="min-w-0">{label}</span>
      </span>
      {children}
    </label>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
  className = "",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "danger";
  className?: string;
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "danger"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-[#12312a]/8 bg-white text-[#10211d]";
  return (
    <div className={`min-w-0 rounded-xl border p-2.5 ${toneClass} ${className}`}>
      <dt className="break-words text-[9px] font-bold uppercase leading-3 tracking-[0.08em] opacity-65">{label}</dt>
      <dd className="mt-1 break-words text-base font-black leading-5 tabular-nums">{value}</dd>
    </div>
  );
}

function StatusChip({
  status,
  locale,
}: {
  status: Booth["status"];
  locale: LocaleKey;
}) {
  const normalized = boothStatuses.includes(status as (typeof boothStatuses)[number])
    ? (status as (typeof boothStatuses)[number])
    : "attention";
  const tone =
    normalized === "available"
      ? "border-slate-200 bg-slate-50 text-slate-700"
      : normalized === "reserved"
        ? "border-sky-200 bg-sky-50 text-sky-800"
        : normalized === "confirmed"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : normalized === "paid"
            ? "border-[#b78936]/30 bg-[#b78936]/10 text-[#6c501d]"
            : normalized === "blocked"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-amber-200 bg-amber-50 text-amber-800";
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-black ${tone}`}>
      {statusLabels[normalized][locale]}
    </span>
  );
}

function StageChip({ stage, locale }: { stage: EquipmentStage; locale: LocaleKey }) {
  const tone =
    stage === "issue"
      ? "border-red-200 bg-red-50 text-red-800"
      : stage === "collected"
        ? "border-slate-200 bg-slate-100 text-slate-700"
        : stage === "delivered"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-sky-200 bg-sky-50 text-sky-800";
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${tone}`}>
      {stageLabels[stage][locale]}
    </span>
  );
}

function StageRailChip({
  stage,
  currentStage,
  locale,
}: {
  stage: EquipmentStage;
  currentStage: EquipmentStage;
  locale: LocaleKey;
}) {
  const current = stage === currentStage;
  const reached = isStageReached(stage, currentStage);
  const issue = stage === "issue";
  return (
    <span
      className={`inline-flex min-h-8 shrink-0 items-center rounded-lg border px-2.5 text-[10px] font-bold ${
        current && issue
          ? "border-red-300 bg-red-100 text-red-800"
          : current
            ? "border-[#b78936]/45 bg-[#b78936]/13 text-[#65491a]"
            : reached
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : issue
                ? "border-red-100 bg-red-50/45 text-red-700/55"
                : "border-[#12312a]/9 bg-[#f7f8f5] text-[#65726d]"
      }`}
      aria-current={current ? "step" : undefined}
    >
      {stageLabels[stage][locale]}
    </span>
  );
}

function AuditRow({
  event,
  locale,
  fallbackActor,
  recentLabel,
}: {
  event: AuditEvent;
  locale: LocaleKey;
  fallbackActor: string;
  recentLabel: string;
}) {
  const view = event as unknown as AuditEventView;
  const action = localize(view.action ?? view.title, locale, recentLabel);
  const title = localize(view.summary, locale, action);
  const detail = localize(
    view.detail ?? view.description,
    locale,
    title === action ? "" : action,
  );
  const actor = localize(view.actorName ?? view.actor, locale, fallbackActor);
  const timestamp = readString(view.createdAt ?? view.timestamp);
  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 py-3">
      <span className="mt-0.5 grid h-8 w-8 place-items-center rounded-full border border-[#198ba0]/20 bg-[#198ba0]/8 text-[#126b7b]">
        <History className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-black">{title}</div>
        {detail ? <p className="mt-1 text-xs leading-5 text-[#65726d]">{detail}</p> : null}
        <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#65726d]">
          {actor}
        </div>
      </div>
      <time
        dateTime={timestamp || undefined}
        className="col-start-2 whitespace-nowrap text-[10px] text-[#65726d]"
      >
        {formatAuditDate(timestamp, locale, recentLabel)}
      </time>
    </li>
  );
}

function createDetailDrafts(
  identity: string,
  sources: Record<DetailField, string>,
): Record<DetailField, DetailDraft> {
  return {
    company: createDetailDraft(identity, sources.company),
    zone: createDetailDraft(identity, sources.zone),
    notes: createDetailDraft(identity, sources.notes),
  };
}

function createDetailDraft(identity: string, value: string): DetailDraft {
  return { value, baseline: value, identity, editing: false };
}

function commitEquipmentLineField<K extends keyof EquipmentLinePatch>(
  line: EquipmentLineView,
  key: K,
  value: string,
  onUpdate: (lineId: string, patch: EquipmentLinePatch) => void,
) {
  if (value === line[key]) return;
  onUpdate(line.id, { [key]: value } as EquipmentLinePatch);
}

function readEquipmentLines(booth: Record<string, unknown>): EquipmentLineView[] {
  const raw = firstArray(booth.equipment, booth.equipmentLines, booth.requirements);
  return raw.flatMap((value, index) => {
    if (!isRecord(value)) return [];
    const id = readString(value.id ?? value.lineId) || `equipment-${index}`;
    const catalogItemId = readString(value.catalogItemId ?? value.itemId ?? value.catalogId);
    const rawQuantity = Number(value.quantity ?? value.qty ?? value.requested ?? 1);
    const quantity =
      Number.isFinite(rawQuantity) && rawQuantity > 0 ? Math.round(rawQuantity) : 1;
    const rawCollectedQuantity = Number(
      value.collectedQuantity ?? value.foundQuantity ?? value.returnedQuantity,
    );
    const collectedQuantity = Number.isFinite(rawCollectedQuantity)
      ? Math.min(quantity, Math.max(0, Math.round(rawCollectedQuantity)))
      : undefined;
    const stage = normalizeEquipmentStage(value.stage ?? value.status);
    return [
      {
        id,
        catalogItemId,
        quantity,
        collectedQuantity,
        stage,
        returnable:
          typeof value.returnable === "boolean" ? value.returnable : undefined,
        deliveryWindow: readString(value.deliveryWindow),
        pickupWindow: readString(value.pickupWindow),
        notes: readString(value.notes),
        name: value.name ?? value.label,
        category: value.category,
      },
    ];
  });
}

function normalizeEquipmentStage(value: unknown): EquipmentStage {
  const candidate = readString(value) as EquipmentStage;
  return equipmentStages.includes(candidate) ? candidate : "requested";
}

function nextEquipmentStage(
  stage: EquipmentStage,
  returnable: boolean,
): EquipmentStage | undefined {
  if (stage === "issue") return undefined;
  const lifecycle = returnable
    ? normalEquipmentStages
    : normalEquipmentStages.filter((candidate) => candidate !== "collected");
  const index = lifecycle.indexOf(stage);
  return index >= 0 ? lifecycle[index + 1] : undefined;
}

function isEquipmentQuantityEditable(stage: EquipmentStage) {
  return stage === "requested" || stage === "preparing";
}

function isEquipmentReturnable(
  line: EquipmentLineView,
  catalogItem?: CatalogItemView,
) {
  if (typeof line.returnable === "boolean") return line.returnable;
  if (typeof catalogItem?.returnable === "boolean") return catalogItem.returnable;
  return true;
}

function isStageReached(stage: EquipmentStage, currentStage: EquipmentStage) {
  if (stage === "issue" || currentStage === "issue") return stage === currentStage;
  return normalEquipmentStages.indexOf(stage) <= normalEquipmentStages.indexOf(currentStage);
}

function catalogItemLabel(item: CatalogItemView, locale: LocaleKey) {
  const name = localize(item.name ?? item.label, locale, item.id);
  const unit = localize(item.unit, locale);
  return unit ? `${name} · ${unit}` : name;
}

function catalogCategoryLabel(item: CatalogItemView, locale: LocaleKey) {
  const category = readString(item.category) as CatalogItem["category"];
  return categoryLabels[category]?.[locale] ?? copy[locale].equipment;
}

function readBoothCode(booth: Record<string, unknown>) {
  return (
    readString(booth.code ?? booth.number ?? booth.label ?? booth.name) ||
    readString(booth.id) ||
    "Booth"
  );
}

function parseQuickSize(
  value: string,
  aspectSource: BoothDimensions,
): BoothDimensions | null {
  const exactDimensions = parseMetricDimensionExpression(value);
  if (exactDimensions) return exactDimensions;

  const areaSquareMeters = parseAreaExpression(value);
  if (!Number.isFinite(areaSquareMeters) || areaSquareMeters <= 0) return null;
  const aspectRatio = aspectSource.widthMeters / aspectSource.depthMeters;
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) return null;

  const targetDimensions = calculateDimensionsForTargetArea(
    areaSquareMeters,
    aspectRatio,
  );
  return {
    widthMeters: roundDimension(targetDimensions.widthMeters),
    depthMeters: roundDimension(targetDimensions.depthMeters),
  };
}

function parseCollectionQuantity(value: string, requestedQuantity: number) {
  const normalized = normalizeLocalizedDigits(value).trim();
  if (!/^\d+$/.test(normalized)) return null;
  const quantity = Number(normalized);
  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 0 ||
    quantity > requestedQuantity
  ) {
    return null;
  }
  return quantity;
}

function parseAreaExpression(value: string) {
  const normalized = normalizeLocalizedDigits(value)
    .trim()
    .replaceAll("٫", ".")
    .replaceAll("٬", "")
    .replace(/\s+/g, " ")
    .toLowerCase();
  const match = normalized.match(
    /^([0-9]+(?:[.,][0-9]+)?)\s*(?:(?:m(?:\s*\^?\s*2|²))|sqm|sq\.?\s*m|square\s+met(?:er|re)s?|متر\s*مربع)?$/iu,
  );
  if (!match) return Number.NaN;
  return Number(match[1].replace(",", "."));
}

function parseLocalizedMeasurement(value: string) {
  const normalized = normalizeLocalizedDigits(value)
    .trim()
    .replaceAll("٫", ".")
    .replaceAll("٬", "");
  if (!/^\d+(?:[.,]\d+)?$/.test(normalized)) return Number.NaN;
  return Number(normalized.replace(",", "."));
}

function normalizeLocalizedDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function isValidBoothDimension(value: number) {
  return Number.isFinite(value) && value >= minimumBoothDimensionMeters;
}

function dimensionsEqual(left: BoothDimensions, right: BoothDimensions) {
  return (
    Math.abs(left.widthMeters - right.widthMeters) < 0.0005 &&
    Math.abs(left.depthMeters - right.depthMeters) < 0.0005
  );
}

function roundDimension(value: number) {
  return Math.round(value * 1_000) / 1_000;
}

function formatDimensionInput(value: number) {
  if (!Number.isFinite(value)) return "";
  return String(roundDimension(value));
}

function formatMeasurement(value: number, locale: LocaleKey) {
  return new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSquareMeters(value: number, locale: LocaleKey) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return `${formatMeasurement(value, locale)} m²`;
}

function formatAspectRatio(dimensions: BoothDimensions, locale: LocaleKey) {
  const shortestSide = Math.min(dimensions.widthMeters, dimensions.depthMeters);
  if (!Number.isFinite(shortestSide) || shortestSide <= 0) return "—";
  return `${formatMeasurement(dimensions.widthMeters / shortestSide, locale)} : ${formatMeasurement(dimensions.depthMeters / shortestSide, locale)}`;
}

function readAuditId(event: AuditEvent, index: number) {
  const view = event as unknown as AuditEventView;
  return readString(view.id) || `audit-${index}`;
}

function formatAuditDate(value: string, locale: LocaleKey, fallback: string) {
  if (!Number.isFinite(Date.parse(value))) return fallback;
  return formatIstanbulDateTime(value, locale);
}

function localize(value: unknown, locale: LocaleKey, fallback = "") {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return fallback;
  const preferred = value[locale];
  if (typeof preferred === "string" && preferred.trim()) return preferred;
  const alternate = value[locale === "fa" ? "en" : "fa"];
  return typeof alternate === "string" && alternate.trim() ? alternate : fallback;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function firstArray(...values: unknown[]) {
  return (values.find(Array.isArray) as unknown[] | undefined) ?? [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
