"use client";

import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  Boxes,
  CheckSquare,
  ChevronDown,
  ClipboardCheck,
  FileSpreadsheet,
  Minus,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type { InventoryItem, InventoryItemTotals } from "@/lib/staff-inventory";
import type { LocalizedText, PortalLocale } from "@/lib/staff-portal";

export type NewInventoryMaterial = Pick<
  InventoryItem,
  "sku" | "name" | "variant" | "category" | "unit" | "returnable" | "onHand" | "lowStockThreshold"
>;

export type InventoryWorkspaceProps = {
  locale: PortalLocale;
  items: InventoryItem[];
  totals: InventoryItemTotals[];
  onUploadFile: (file: File) => void | Promise<void>;
  onAddItem: (material: NewInventoryMaterial) => void | Promise<void>;
  onUpdateOnHand: (itemId: string, onHand: number) => void | Promise<void>;
  onUpdateItem: (
    itemId: string,
    patch: Pick<InventoryItem, "name" | "variant">,
  ) => void | Promise<void>;
  onArchiveItems: (itemIds: string[], archived: boolean) => void | Promise<void>;
  onRemoveItems: (itemIds: string[]) => void | Promise<void>;
  disabled?: boolean;
};

type MaterialDraft = {
  sku: string;
  nameFa: string;
  nameEn: string;
  variant: string;
  category: InventoryItem["category"];
  onHand: string;
  lowStockThreshold: string;
  returnable: boolean;
};

const EMPTY_DRAFT: MaterialDraft = {
  sku: "",
  nameFa: "",
  nameEn: "",
  variant: "",
  category: "furniture",
  onHand: "0",
  lowStockThreshold: "2",
  returnable: true,
};

const copy = {
  fa: {
    eyebrow: "انبار نمایشگاه",
    title: "تجهیزات و موجودی",
    description: "موجودی واقعی، تخصیص غرفه‌ها و کسری‌ها را در یک نمای عملیاتی کنترل کنید.",
    owned: "کل موجودی",
    assigned: "تخصیص یافته",
    available: "قابل تخصیص",
    missing: "کسری",
    search: "جستجوی نام، کد یا نوع تجهیزات",
    upload: "ورود Excel / CSV",
    uploadHint: "فایل‌های .xlsx، .csv و .tsv",
    uploadColumns: "ستون‌های پیشنهادی: کد کالا، نام فارسی و انگلیسی، نوع، دسته‌بندی، واحد، موجودی، قابل بازگشت و حد هشدار.",
    addMaterial: "افزودن تجهیز",
    addDescription: "یک قلم جدید با کد انبار و حد هشدار تعریف کنید.",
    sku: "کد انبار",
    nameFa: "نام فارسی",
    nameEn: "نام انگلیسی",
    variant: "مدل / نوع",
    category: "دسته‌بندی",
    onHand: "موجودی",
    lowStock: "حد هشدار",
    returnable: "قابل بازگشت از غرفه",
    save: "ثبت تجهیز",
    saving: "در حال ثبت…",
    uploadBusy: "در حال پردازش فایل…",
    invalidFile: "فقط فایل Excel یا CSV قابل قبول است.",
    uploadFailed: "فایل وارد نشد. قالب فایل و ستون‌ها را بررسی کنید.",
    addFailed: "تجهیز ثبت نشد. دوباره تلاش کنید.",
    required: "کد انبار و نام فارسی و انگلیسی الزامی است.",
    invalidCounts: "موجودی و حد هشدار باید عدد صحیح و صفر یا بیشتر باشند.",
    stock: "وضعیت موجودی",
    name: "تجهیز",
    assignedShort: "تخصیص",
    remaining: "باقی‌مانده",
    missingShort: "کسری",
    actions: "اصلاح موجودی",
    healthy: "موجود",
    low: "رو به اتمام",
    shortage: "دارای کسری",
    noResults: "تجهیزی با این جستجو پیدا نشد.",
    empty: "هنوز تجهیزی در انبار تعریف نشده است.",
    clearSearch: "پاک کردن جستجو",
    decrease: "کاهش موجودی",
    increase: "افزایش موجودی",
    countFor: "تعداد موجود برای",
    unit: "عدد",
    manage: "مدیریت اقلام",
    bulkMode: "انتخاب گروهی",
    finishBulk: "پایان انتخاب",
    selectAll: "انتخاب همه نتایج",
    clearSelection: "پاک کردن انتخاب",
    selectedCount: "قلم انتخاب شده",
    activeItems: "فعال",
    archivedItems: "بایگانی",
    allItems: "همه",
    archive: "بایگانی",
    restore: "بازگردانی",
    remove: "حذف",
    edit: "تغییر نام",
    editTitle: "ویرایش نام و مدل تجهیز",
    saveChanges: "ذخیره تغییرات",
    archived: "بایگانی شده",
    selectItem: "انتخاب تجهیز",
    cancel: "انصراف",
  },
  en: {
    eyebrow: "Expo inventory",
    title: "Equipment & inventory",
    description: "Control real stock, booth assignments, and shortages from one operational view.",
    owned: "Total owned",
    assigned: "Assigned",
    available: "Available",
    missing: "Missing",
    search: "Search equipment name, SKU, or variant",
    upload: "Import Excel / CSV",
    uploadHint: ".xlsx, .csv, and .tsv files",
    uploadColumns: "Suggested columns: SKU, Persian and English names, variant, category, unit, on hand, returnable, and low-stock threshold.",
    addMaterial: "Add material",
    addDescription: "Define a new stock item with its SKU and low-stock threshold.",
    sku: "SKU",
    nameFa: "Persian name",
    nameEn: "English name",
    variant: "Variant / model",
    category: "Category",
    onHand: "On hand",
    lowStock: "Low-stock level",
    returnable: "Returnable from booths",
    save: "Add material",
    saving: "Adding…",
    uploadBusy: "Processing file…",
    invalidFile: "Choose an Excel or CSV file.",
    uploadFailed: "The file could not be imported. Check its format and columns.",
    addFailed: "The material could not be added. Please try again.",
    required: "SKU, Persian name, and English name are required.",
    invalidCounts: "On-hand and low-stock values must be whole numbers of zero or more.",
    stock: "Stock status",
    name: "Material",
    assignedShort: "Assigned",
    remaining: "Remaining",
    missingShort: "Missing",
    actions: "Adjust stock",
    healthy: "In stock",
    low: "Low stock",
    shortage: "Shortage",
    noResults: "No materials match this search.",
    empty: "No inventory materials have been defined yet.",
    clearSearch: "Clear search",
    decrease: "Decrease on-hand count",
    increase: "Increase on-hand count",
    countFor: "On-hand count for",
    unit: "units",
    manage: "Manage materials",
    bulkMode: "Bulk select",
    finishBulk: "Finish selection",
    selectAll: "Select all results",
    clearSelection: "Clear selection",
    selectedCount: "materials selected",
    activeItems: "Active",
    archivedItems: "Archived",
    allItems: "All",
    archive: "Archive",
    restore: "Restore",
    remove: "Remove",
    edit: "Rename",
    editTitle: "Edit material name and variant",
    saveChanges: "Save changes",
    archived: "Archived",
    selectItem: "Select material",
    cancel: "Cancel",
  },
} as const;

const categoryLabels: Record<InventoryItem["category"], LocalizedText> = {
  furniture: { fa: "مبلمان", en: "Furniture" },
  av: { fa: "صوتی و تصویری", en: "Audio visual" },
  cooling: { fa: "سرمایش", en: "Cooling" },
  appliance: { fa: "لوازم برقی", en: "Appliances" },
  electrical: { fa: "برق", en: "Electrical" },
  connectivity: { fa: "اتصال و شبکه", en: "Connectivity" },
  support: { fa: "پشتیبانی", en: "Support" },
};

function localize(value: LocalizedText | string | undefined, locale: PortalLocale, fallback = "—") {
  if (typeof value === "string") return value || fallback;
  return value?.[locale] || value?.en || value?.fa || fallback;
}

function formatCount(value: number, locale: PortalLocale) {
  return new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US", {
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));
}

function searchable(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(searchable).join(" ");
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).map(searchable).join(" ");
  return "";
}

function CountEditor({
  value,
  itemId,
  label,
  disabled,
  locale,
  onCommit,
}: {
  value: number;
  itemId: string;
  label: string;
  disabled: boolean;
  locale: PortalLocale;
  onCommit: (itemId: string, count: number) => void | Promise<void>;
}) {
  const strings = copy[locale];

  function commit(nextValue: number) {
    const normalized = Math.max(0, Math.round(nextValue));
    if (normalized !== value) void onCommit(itemId, normalized);
  }

  return (
    <div className="inline-flex min-h-11 items-stretch overflow-hidden rounded-xl border border-[#14392f]/14 bg-white shadow-sm focus-within:border-[#b78936]/60 focus-within:ring-2 focus-within:ring-[#b78936]/15">
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center text-[#34564c] transition-colors hover:bg-[#f3f5f1] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#b78936] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`${strings.decrease}: ${label}`}
        disabled={disabled || value <= 0}
        onClick={() => commit(value - 1)}
      >
        <Minus aria-hidden="true" className="h-4 w-4" />
      </button>
      <input
        key={`${itemId}-${value}`}
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        defaultValue={value}
        disabled={disabled}
        aria-label={`${strings.countFor} ${label}`}
        className="h-11 w-[4.5rem] border-x border-[#14392f]/10 bg-[#fbfcf9] px-1 text-center text-sm font-black tabular-nums text-[#17342c] outline-none disabled:opacity-50"
        onBlur={(event) => {
          const nextValue = Number(event.currentTarget.value);
          if (!Number.isInteger(nextValue) || nextValue < 0) {
            event.currentTarget.value = String(value);
            return;
          }
          commit(nextValue);
        }}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            event.currentTarget.value = String(value);
            event.currentTarget.blur();
          }
        }}
      />
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center text-[#34564c] transition-colors hover:bg-[#f3f5f1] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#b78936] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`${strings.increase}: ${label}`}
        disabled={disabled}
        onClick={() => commit(value + 1)}
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}

export function InventoryWorkspace({
  locale,
  items,
  totals,
  onUploadFile,
  onAddItem,
  onUpdateOnHand,
  onUpdateItem,
  onArchiveItems,
  onRemoveItems,
  disabled = false,
}: InventoryWorkspaceProps) {
  const strings = copy[locale];
  const uploadId = useId();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState<MaterialDraft>(EMPTY_DRAFT);
  const [formError, setFormError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lifecycleFilter, setLifecycleFilter] = useState<"active" | "archived" | "all">("active");
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ nameFa: "", nameEn: "", variant: "" });

  const totalsByItem = useMemo(
    () => new Map(totals.map((total) => [total.itemId, total])),
    [totals],
  );
  const activeItemIds = useMemo(
    () => new Set(items.filter((item) => !item.archived).map((item) => item.id)),
    [items],
  );
  const inventorySummary = useMemo(
    () =>
      totals.filter((total) => activeItemIds.has(total.itemId)).reduce(
        (summary, total) => ({
          owned: summary.owned + total.onHand,
          assigned: summary.assigned + total.assigned,
          available: summary.available + total.available,
          missing: summary.missing + total.missing,
        }),
        { owned: 0, assigned: 0, available: 0, missing: 0 },
      ),
    [activeItemIds, totals],
  );
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase(locale === "fa" ? "fa-IR" : "en-US");
  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (lifecycleFilter === "active" && item.archived) return false;
        if (lifecycleFilter === "archived" && !item.archived) return false;
        if (!normalizedQuery) return true;
        return searchable([item.sku, item.name, item.variant, categoryLabels[item.category]])
          .toLocaleLowerCase(locale === "fa" ? "fa-IR" : "en-US")
          .includes(normalizedQuery);
      }),
    [items, lifecycleFilter, locale, normalizedQuery],
  );

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds],
  );

  function toggleSelected(itemId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedIds(new Set(filteredItems.map((item) => item.id)));
  }

  function leaveBulkMode() {
    setBulkMode(false);
    setSelectedIds(new Set());
  }

  function startEdit(item: InventoryItem) {
    setEditingItemId(item.id);
    setEditDraft({
      nameFa: item.name.fa,
      nameEn: item.name.en,
      variant: item.variant ?? "",
    });
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingItemId || !editDraft.nameFa.trim() || !editDraft.nameEn.trim()) return;
    await onUpdateItem(editingItemId, {
      name: { fa: editDraft.nameFa.trim(), en: editDraft.nameEn.trim() },
      variant: editDraft.variant.trim() || undefined,
    });
    setEditingItemId(null);
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/\.(csv|tsv|xlsx)$/i.test(file.name)) {
      setUploadError(strings.invalidFile);
      return;
    }
    setUploadError("");
    setIsUploading(true);
    try {
      await onUploadFile(file);
    } catch {
      setUploadError(strings.uploadFailed);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const onHand = Number(draft.onHand);
    const lowStockThreshold = Number(draft.lowStockThreshold);
    if (!draft.sku.trim() || !draft.nameFa.trim() || !draft.nameEn.trim()) {
      setFormError(strings.required);
      return;
    }
    if (
      !Number.isInteger(onHand) ||
      onHand < 0 ||
      !Number.isInteger(lowStockThreshold) ||
      lowStockThreshold < 0
    ) {
      setFormError(strings.invalidCounts);
      return;
    }

    setIsAdding(true);
    try {
      await onAddItem({
        sku: draft.sku.trim(),
        name: { fa: draft.nameFa.trim(), en: draft.nameEn.trim() },
        variant: draft.variant.trim() || undefined,
        category: draft.category,
        unit: { fa: "عدد", en: "pcs" },
        returnable: draft.returnable,
        onHand,
        lowStockThreshold,
      });
      setDraft(EMPTY_DRAFT);
      detailsRef.current?.removeAttribute("open");
    } catch {
      setFormError(strings.addFailed);
    } finally {
      setIsAdding(false);
    }
  }

  const kpis = [
    { key: "owned", label: strings.owned, value: inventorySummary.owned, icon: Boxes, tone: "text-[#31584c] bg-[#e9f2ed]" },
    { key: "assigned", label: strings.assigned, value: inventorySummary.assigned, icon: ClipboardCheck, tone: "text-[#76571f] bg-[#f8eed9]" },
    { key: "available", label: strings.available, value: inventorySummary.available, icon: PackageCheck, tone: "text-[#176c4b] bg-[#e3f6eb]" },
    { key: "missing", label: strings.missing, value: inventorySummary.missing, icon: AlertTriangle, tone: inventorySummary.missing > 0 ? "text-[#a7322c] bg-[#fff0ee]" : "text-[#61716b] bg-[#f0f2ef]" },
  ] as const;

  return (
    <section className="min-w-0 bg-[#f7f8f4] p-3 sm:p-5 lg:p-6" dir={locale === "fa" ? "rtl" : "ltr"}>
      <div className="mx-auto grid max-w-[100rem] gap-4">
        <header className="rounded-2xl border border-[#14392f]/10 bg-white/90 p-4 shadow-[0_12px_35px_rgba(19,49,41,0.06)] sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#9a742c]">{strings.eyebrow}</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.025em] text-[#17342c] sm:text-2xl">{strings.title}</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#61716b]">{strings.description}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input id={uploadId} type="file" accept=".xlsx,.csv,.tsv" className="sr-only" disabled={disabled || isUploading} onChange={handleUpload} />
              <label htmlFor={uploadId} className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#14392f]/14 bg-white px-4 text-xs font-black text-[#31584c] shadow-sm transition-colors hover:bg-[#f3f6f2] focus-within:ring-2 focus-within:ring-[#b78936] ${(disabled || isUploading) ? "pointer-events-none opacity-50" : ""}`} title={strings.uploadHint}>
                {isUploading ? <Upload aria-hidden="true" className="h-4 w-4 animate-pulse" /> : <FileSpreadsheet aria-hidden="true" className="h-4 w-4" />}
                {isUploading ? strings.uploadBusy : strings.upload}
              </label>
            </div>
          </div>
          <p className="mt-3 rounded-xl border border-[#14392f]/8 bg-[#f7f8f4] px-3 py-2 text-[0.68rem] font-semibold leading-5 text-[#667770]">
            {strings.uploadColumns}
          </p>
          {uploadError ? <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{uploadError}</p> : null}
        </header>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {kpis.map(({ key, label, value, icon: Icon, tone }) => (
            <article key={key} className="flex min-h-[6.5rem] items-center gap-3 rounded-2xl border border-[#14392f]/10 bg-white p-3 shadow-[0_8px_24px_rgba(19,49,41,0.045)] sm:p-4">
              <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon aria-hidden="true" className="h-5 w-5" /></span>
              <div className="min-w-0"><p className="truncate text-[0.68rem] font-bold text-[#71807b]">{label}</p><p className="mt-1 text-xl font-black tabular-nums text-[#17342c] sm:text-2xl">{formatCount(value, locale)}</p></div>
            </article>
          ))}
        </div>

        <details ref={detailsRef} className="group rounded-2xl border border-[#14392f]/10 bg-white shadow-[0_8px_24px_rgba(19,49,41,0.045)]">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#b78936] [&::-webkit-details-marker]:hidden sm:px-5">
            <span className="flex min-w-0 items-center gap-3"><span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf4f0] text-[#31584c]"><Plus aria-hidden="true" className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-sm font-black text-[#17342c]">{strings.addMaterial}</span><span className="mt-0.5 block truncate text-xs text-[#71807b]">{strings.addDescription}</span></span></span>
            <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-[#71807b] transition-transform group-open:rotate-180" />
          </summary>
          <form onSubmit={handleAdd} className="grid gap-4 border-t border-[#14392f]/9 p-4 sm:p-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <FormField label={strings.sku}><input required value={draft.sku} disabled={disabled || isAdding} className={inputClass} dir="ltr" onChange={(event) => setDraft((current) => ({ ...current, sku: event.target.value }))} /></FormField>
              <FormField label={strings.nameFa}><input required value={draft.nameFa} disabled={disabled || isAdding} className={inputClass} dir="rtl" onChange={(event) => setDraft((current) => ({ ...current, nameFa: event.target.value }))} /></FormField>
              <FormField label={strings.nameEn}><input required value={draft.nameEn} disabled={disabled || isAdding} className={inputClass} dir="ltr" onChange={(event) => setDraft((current) => ({ ...current, nameEn: event.target.value }))} /></FormField>
              <FormField label={strings.variant}><input value={draft.variant} disabled={disabled || isAdding} className={inputClass} onChange={(event) => setDraft((current) => ({ ...current, variant: event.target.value }))} /></FormField>
              <FormField label={strings.category}><select value={draft.category} disabled={disabled || isAdding} className={inputClass} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as InventoryItem["category"] }))}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{localize(label, locale)}</option>)}</select></FormField>
              <FormField label={strings.onHand}><input type="number" min={0} step={1} inputMode="numeric" required value={draft.onHand} disabled={disabled || isAdding} className={inputClass} dir="ltr" onChange={(event) => setDraft((current) => ({ ...current, onHand: event.target.value }))} /></FormField>
              <FormField label={strings.lowStock}><input type="number" min={0} step={1} inputMode="numeric" required value={draft.lowStockThreshold} disabled={disabled || isAdding} className={inputClass} dir="ltr" onChange={(event) => setDraft((current) => ({ ...current, lowStockThreshold: event.target.value }))} /></FormField>
              <label className="flex min-h-11 items-center gap-3 self-end rounded-xl border border-[#14392f]/12 bg-[#f8faf7] px-3 text-xs font-bold text-[#405b53]"><input type="checkbox" checked={draft.returnable} disabled={disabled || isAdding} className="h-5 w-5 accent-[#31584c]" onChange={(event) => setDraft((current) => ({ ...current, returnable: event.target.checked }))} />{strings.returnable}</label>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"><p role="alert" aria-live="polite" className="min-h-5 text-xs font-bold text-red-700">{formError}</p><button type="submit" disabled={disabled || isAdding} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#173f34] px-5 text-xs font-black text-white shadow-sm transition-colors hover:bg-[#0f3229] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b78936] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"><Plus aria-hidden="true" className="h-4 w-4" />{isAdding ? strings.saving : strings.save}</button></div>
          </form>
        </details>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#14392f]/10 bg-white shadow-[0_8px_24px_rgba(19,49,41,0.045)]" aria-labelledby="inventory-stock-heading">
          <div className="flex flex-col gap-3 border-b border-[#14392f]/9 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div><h3 id="inventory-stock-heading" className="text-sm font-black text-[#17342c]">{strings.stock}</h3><p className="mt-0.5 text-xs text-[#71807b]">{formatCount(filteredItems.length, locale)} / {formatCount(items.length, locale)}</p></div>
            <div className="flex w-full flex-col gap-2 sm:max-w-2xl sm:flex-row sm:justify-end">
              <label className="relative block w-full sm:max-w-sm"><Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71807b]" /><span className="sr-only">{strings.search}</span><input type="search" value={searchQuery} placeholder={strings.search} className="h-11 w-full rounded-xl border border-[#14392f]/14 bg-[#f9faf7] ps-10 pe-3 text-sm text-[#17342c] outline-none placeholder:text-[#8b9792] focus:border-[#b78936]/60 focus:ring-2 focus:ring-[#b78936]/15" onChange={(event) => setSearchQuery(event.target.value)} /></label>
              <button type="button" onClick={() => bulkMode ? leaveBulkMode() : setBulkMode(true)} className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-black transition ${bulkMode ? "border-[#31584c] bg-[#173f34] text-white" : "border-[#14392f]/14 bg-white text-[#31584c] hover:bg-[#f3f6f2]"}`}><CheckSquare size={16} />{bulkMode ? strings.finishBulk : strings.bulkMode}</button>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-[#14392f]/9 bg-[#f8faf7] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex gap-2 overflow-x-auto">
              {(["active", "archived", "all"] as const).map((filter) => <button key={filter} type="button" onClick={() => { setLifecycleFilter(filter); setSelectedIds(new Set()); }} className={`min-h-10 shrink-0 rounded-xl border px-3 text-xs font-black ${lifecycleFilter === filter ? "border-[#31584c] bg-white text-[#17342c] shadow-sm" : "border-transparent text-[#71807b] hover:bg-white/70"}`}>{filter === "active" ? strings.activeItems : filter === "archived" ? strings.archivedItems : strings.allItems}</button>)}
            </div>
            {bulkMode ? <div className="flex flex-wrap items-center gap-2"><span className="me-1 text-xs font-black text-[#526760]">{formatCount(selectedIds.size, locale)} {strings.selectedCount}</span><button type="button" onClick={selectAllVisible} disabled={!filteredItems.length} className="min-h-10 rounded-xl border border-[#14392f]/12 bg-white px-3 text-xs font-black text-[#31584c] disabled:opacity-40">{strings.selectAll}</button>{selectedIds.size ? <><button type="button" onClick={() => setSelectedIds(new Set())} className="min-h-10 rounded-xl px-3 text-xs font-black text-[#61716b]">{strings.clearSelection}</button><button type="button" onClick={() => void onArchiveItems([...selectedIds], true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-black text-amber-800"><Archive size={15} />{strings.archive}</button>{selectedItems.some((item) => item.archived) ? <button type="button" onClick={() => void onArchiveItems([...selectedIds], false)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 text-xs font-black text-cyan-800"><ArchiveRestore size={15} />{strings.restore}</button> : null}<button type="button" onClick={() => void onRemoveItems([...selectedIds])} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-black text-red-700"><Trash2 size={15} />{strings.remove}</button></> : null}</div> : null}
          </div>

          {filteredItems.length === 0 ? (
            <div className="grid min-h-52 place-items-center px-5 py-10 text-center"><div><span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff3ef] text-[#71807b]"><Boxes aria-hidden="true" className="h-5 w-5" /></span><p className="mt-3 text-sm font-black text-[#405b53]">{items.length === 0 ? strings.empty : strings.noResults}</p>{searchQuery ? <button type="button" className="mt-3 min-h-11 rounded-xl px-4 text-xs font-black text-[#8a6728] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b78936]" onClick={() => setSearchQuery("")}>{strings.clearSearch}</button> : null}</div></div>
          ) : (
            <>
              <div className="grid gap-3 p-3 lg:hidden">
                {filteredItems.map((item) => <InventoryCard key={item.id} item={item} total={totalsByItem.get(item.id)} locale={locale} disabled={disabled} bulkMode={bulkMode} selected={selectedIds.has(item.id)} onToggleSelected={toggleSelected} onUpdateOnHand={onUpdateOnHand} onEdit={startEdit} onArchive={(target) => void onArchiveItems([target.id], !target.archived)} onRemove={(target) => void onRemoveItems([target.id])} />)}
              </div>
              <div className="hidden overflow-x-auto lg:block">
                <InventoryTable items={filteredItems} totalsByItem={totalsByItem} locale={locale} disabled={disabled} bulkMode={bulkMode} selectedIds={selectedIds} onToggleSelected={toggleSelected} onUpdateOnHand={onUpdateOnHand} onEdit={startEdit} onArchive={(target) => void onArchiveItems([target.id], !target.archived)} onRemove={(target) => void onRemoveItems([target.id])} />
              </div>
            </>
          )}
        </section>
      </div>

      {editingItemId ? <div className="fixed inset-0 z-[90] grid place-items-center bg-[#03100d]/65 p-3 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingItemId(null); }}><form onSubmit={saveEdit} role="dialog" aria-modal="true" aria-labelledby="inventory-edit-title" className="w-full max-w-lg rounded-3xl border border-white/10 bg-white p-5 shadow-2xl"><div className="flex items-center justify-between gap-3"><div><p className="text-[0.65rem] font-black uppercase tracking-[0.17em] text-[#9a742c]">{strings.manage}</p><h3 id="inventory-edit-title" className="mt-1 text-lg font-black text-[#17342c]">{strings.editTitle}</h3></div><button type="button" onClick={() => setEditingItemId(null)} className="grid size-11 place-items-center rounded-xl border border-[#14392f]/10 text-[#61716b]" aria-label={strings.cancel}><X size={18} /></button></div><div className="mt-5 grid gap-3"><FormField label={strings.nameFa}><input required value={editDraft.nameFa} className={inputClass} dir="rtl" onChange={(event) => setEditDraft((current) => ({ ...current, nameFa: event.target.value }))} /></FormField><FormField label={strings.nameEn}><input required value={editDraft.nameEn} className={inputClass} dir="ltr" onChange={(event) => setEditDraft((current) => ({ ...current, nameEn: event.target.value }))} /></FormField><FormField label={strings.variant}><input value={editDraft.variant} className={inputClass} onChange={(event) => setEditDraft((current) => ({ ...current, variant: event.target.value }))} /></FormField></div><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setEditingItemId(null)} className="min-h-11 rounded-xl border border-[#14392f]/12 px-4 text-xs font-black text-[#526760]">{strings.cancel}</button><button type="submit" className="min-h-11 rounded-xl bg-[#173f34] px-5 text-xs font-black text-white">{strings.saveChanges}</button></div></form></div> : null}
    </section>
  );
}

const inputClass = "h-11 w-full rounded-xl border border-[#14392f]/14 bg-[#fbfcf9] px-3 text-sm font-semibold text-[#17342c] outline-none placeholder:text-[#94a09b] focus:border-[#b78936]/60 focus:ring-2 focus:ring-[#b78936]/15 disabled:cursor-not-allowed disabled:opacity-50";

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-[0.7rem] font-black text-[#526760]"><span>{label}</span>{children}</label>;
}

function inventoryStatus(item: InventoryItem, total: InventoryItemTotals | undefined, locale: PortalLocale) {
  const strings = copy[locale];
  if (item.archived) return { label: strings.archived, className: "border-slate-200 bg-slate-100 text-slate-700" };
  if ((total?.missing ?? 0) > 0) return { label: strings.shortage, className: "border-red-200 bg-red-50 text-red-700" };
  if ((total?.available ?? item.onHand) <= item.lowStockThreshold) return { label: strings.low, className: "border-amber-200 bg-amber-50 text-amber-800" };
  return { label: strings.healthy, className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
}

type InventoryRowActions = {
  bulkMode: boolean;
  selected: boolean;
  onToggleSelected: (itemId: string) => void;
  onEdit: (item: InventoryItem) => void;
  onArchive: (item: InventoryItem) => void;
  onRemove: (item: InventoryItem) => void;
};

function ItemActions({ item, locale, disabled, onEdit, onArchive, onRemove }: { item: InventoryItem; locale: PortalLocale; disabled: boolean } & Pick<InventoryRowActions, "onEdit" | "onArchive" | "onRemove">) {
  const strings = copy[locale];
  return <div className="flex items-center gap-1"><button type="button" disabled={disabled} onClick={() => onEdit(item)} className="grid min-h-10 min-w-10 place-items-center rounded-lg border border-[#14392f]/10 bg-white text-[#31584c] hover:bg-[#f3f6f2] disabled:opacity-40" aria-label={`${strings.edit}: ${localize(item.name, locale)}`} title={strings.edit}><Pencil size={15} /></button><button type="button" disabled={disabled} onClick={() => onArchive(item)} className="grid min-h-10 min-w-10 place-items-center rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-40" aria-label={`${item.archived ? strings.restore : strings.archive}: ${localize(item.name, locale)}`} title={item.archived ? strings.restore : strings.archive}>{item.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}</button><button type="button" disabled={disabled} onClick={() => onRemove(item)} className="grid min-h-10 min-w-10 place-items-center rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40" aria-label={`${strings.remove}: ${localize(item.name, locale)}`} title={strings.remove}><Trash2 size={15} /></button></div>;
}

function InventoryCard({ item, total, locale, disabled, bulkMode, selected, onToggleSelected, onUpdateOnHand, onEdit, onArchive, onRemove }: { item: InventoryItem; total?: InventoryItemTotals; locale: PortalLocale; disabled: boolean; onUpdateOnHand: InventoryWorkspaceProps["onUpdateOnHand"] } & InventoryRowActions) {
  const strings = copy[locale];
  const status = inventoryStatus(item, total, locale);
  const name = localize(item.name, locale);
  return <article className={`rounded-2xl border p-3 ${selected ? "border-[#b78936] bg-[#fff8e9] ring-2 ring-[#b78936]/15" : total?.missing ? "border-red-200 bg-red-50/40" : item.archived ? "border-slate-200 bg-slate-50 opacity-80" : "border-[#14392f]/10 bg-[#fbfcf9]"}`}><div className="flex items-start justify-between gap-3">{bulkMode ? <label className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-xl border border-[#14392f]/10 bg-white"><span className="sr-only">{strings.selectItem}: {name}</span><input type="checkbox" checked={selected} className="size-5 accent-[#31584c]" onChange={() => onToggleSelected(item.id)} /></label> : null}<div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-[#17342c]">{name}</p><p className="mt-1 text-[0.68rem] font-bold text-[#71807b]" dir="ltr">{item.sku}{item.variant ? ` · ${item.variant}` : ""}</p></div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.62rem] font-black ${status.className}`}>{status.label}</span></div><div className="mt-3 grid grid-cols-4 gap-2">{[[strings.onHand, item.onHand], [strings.assignedShort, total?.assigned ?? 0], [strings.remaining, total?.available ?? item.onHand], [strings.missingShort, total?.missing ?? 0]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-[#14392f]/8 bg-white px-2 py-2 text-center"><p className="text-[0.58rem] font-bold text-[#7a8883]">{label}</p><p className={`mt-1 text-sm font-black tabular-nums ${label === strings.missingShort && Number(value) > 0 ? "text-red-700" : "text-[#17342c]"}`}>{formatCount(Number(value), locale)}</p></div>)}</div><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><ItemActions item={item} locale={locale} disabled={disabled} onEdit={onEdit} onArchive={onArchive} onRemove={onRemove} /><CountEditor value={item.onHand} itemId={item.id} label={name} disabled={disabled || Boolean(item.archived)} locale={locale} onCommit={onUpdateOnHand} /></div></article>;
}

function InventoryTable({ items, totalsByItem, locale, disabled, bulkMode, selectedIds, onToggleSelected, onUpdateOnHand, onEdit, onArchive, onRemove }: { items: InventoryItem[]; totalsByItem: Map<string, InventoryItemTotals>; locale: PortalLocale; disabled: boolean; selectedIds: Set<string>; onUpdateOnHand: InventoryWorkspaceProps["onUpdateOnHand"] } & Omit<InventoryRowActions, "selected">) {
  const strings = copy[locale];
  return <table className="w-full min-w-[76rem] border-collapse text-start"><thead className="bg-[#f5f7f3] text-[0.65rem] font-black text-[#61716b]"><tr>{bulkMode ? <th scope="col" className="w-14 px-4 py-3"><span className="sr-only">{strings.selectItem}</span></th> : null}{[strings.name, strings.sku, strings.variant, strings.onHand, strings.assignedShort, strings.remaining, strings.missingShort, strings.actions, strings.manage].map((heading) => <th key={heading} scope="col" className="px-4 py-3 text-start">{heading}</th>)}</tr></thead><tbody className="divide-y divide-[#14392f]/8">{items.map((item) => { const total = totalsByItem.get(item.id); const status = inventoryStatus(item, total, locale); const name = localize(item.name, locale); const selected = selectedIds.has(item.id); return <tr key={item.id} className={selected ? "bg-[#fff8e9]" : total?.missing ? "bg-red-50/55" : item.archived ? "bg-slate-50 opacity-80" : "hover:bg-[#fafbf8]"}>{bulkMode ? <td className="px-4 py-3"><label className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[#14392f]/10 bg-white"><span className="sr-only">{strings.selectItem}: {name}</span><input type="checkbox" checked={selected} className="size-5 accent-[#31584c]" onChange={() => onToggleSelected(item.id)} /></label></td> : null}<td className="px-4 py-3"><div className="flex items-center gap-3"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.archived ? "bg-slate-400" : total?.missing ? "bg-red-500" : (total?.available ?? item.onHand) <= item.lowStockThreshold ? "bg-amber-500" : "bg-emerald-500"}`} /><div className="min-w-0"><p className="max-w-64 truncate text-sm font-black text-[#17342c]">{name}</p><span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[0.58rem] font-black ${status.className}`}>{status.label}</span></div></div></td><td className="px-4 py-3 text-xs font-bold text-[#526760]" dir="ltr">{item.sku}</td><td className="max-w-52 truncate px-4 py-3 text-xs text-[#61716b]">{item.variant || "—"}</td><td className="px-4 py-3 text-sm font-black tabular-nums text-[#17342c]">{formatCount(item.onHand, locale)}</td><td className="px-4 py-3 text-sm font-bold tabular-nums text-[#526760]">{formatCount(total?.assigned ?? 0, locale)}</td><td className="px-4 py-3 text-sm font-black tabular-nums text-emerald-700">{formatCount(total?.available ?? item.onHand, locale)}</td><td className={`px-4 py-3 text-sm font-black tabular-nums ${(total?.missing ?? 0) > 0 ? "text-red-700" : "text-[#71807b]"}`}>{formatCount(total?.missing ?? 0, locale)}</td><td className="px-4 py-3"><CountEditor value={item.onHand} itemId={item.id} label={name} disabled={disabled || Boolean(item.archived)} locale={locale} onCommit={onUpdateOnHand} /></td><td className="px-4 py-3"><ItemActions item={item} locale={locale} disabled={disabled} onEdit={onEdit} onArchive={onArchive} onRemove={onRemove} /></td></tr>; })}</tbody></table>;
}
