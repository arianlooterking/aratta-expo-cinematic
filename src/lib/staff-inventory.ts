import type {
  CatalogItem,
  EquipmentCategory,
  EquipmentLine,
  Hall,
  LocalizedText,
} from "./staff-portal";

export type InventoryItem = {
  id: string;
  sku: string;
  name: LocalizedText;
  variant?: string;
  category: EquipmentCategory;
  unit: LocalizedText;
  returnable: boolean;
  onHand: number;
  lowStockThreshold: number;
  archived?: boolean;
  updatedAt: string;
};

export type InventoryItemTotals = {
  itemId: string;
  sku: string;
  onHand: number;
  assigned: number;
  outstanding: number;
  missing: number;
  available: number;
};

export type InventoryRowError = {
  row: number;
  field?: string;
  message: string;
};

export type InventoryRowParseResult = {
  items: InventoryItem[];
  errors: InventoryRowError[];
};

export type InventoryRowParseOptions = {
  updatedAt?: string;
};

export type InventoryDelimiter = "," | "\t" | ";";

export type InventoryValidationResult =
  | { valid: true; items: InventoryItem[] }
  | { valid: false; errors: string[] };

type InventoryEquipmentLine = EquipmentLine & { collectedQuantity?: number };

type HeaderField =
  | "sku"
  | "name"
  | "nameFa"
  | "nameEn"
  | "variant"
  | "category"
  | "unit"
  | "unitFa"
  | "unitEn"
  | "onHand"
  | "returnable"
  | "lowStockThreshold";

const EQUIPMENT_CATEGORIES: readonly EquipmentCategory[] = [
  "furniture",
  "av",
  "cooling",
  "appliance",
  "electrical",
  "connectivity",
  "support",
];

const HEADER_ALIASES: Record<HeaderField, readonly string[]> = {
  sku: [
    "sku",
    "code",
    "item code",
    "product code",
    "stock code",
    "کد",
    "کد کالا",
    "کد محصول",
    "شناسه کالا",
  ],
  name: ["name", "item", "item name", "product", "product name", "نام", "نام کالا", "کالا"],
  nameFa: ["name fa", "fa name", "persian name", "نام فارسی", "نام کالا فارسی"],
  nameEn: ["name en", "en name", "english name", "نام انگلیسی", "نام کالا انگلیسی"],
  variant: [
    "variant",
    "type",
    "model",
    "size",
    "tv size",
    "television size",
    "نوع",
    "مدل",
    "سایز",
    "اندازه",
    "سایز تلویزیون",
    "اندازه تلویزیون",
  ],
  category: ["category", "group", "item category", "دسته", "دسته بندی", "گروه", "گروه کالا"],
  unit: ["unit", "uom", "unit of measure", "واحد", "واحد شمارش"],
  unitFa: ["unit fa", "fa unit", "persian unit", "واحد فارسی"],
  unitEn: ["unit en", "en unit", "english unit", "واحد انگلیسی"],
  onHand: [
    "quantity",
    "qty",
    "on hand",
    "onhand",
    "stock",
    "stock quantity",
    "available quantity",
    "موجودی",
    "تعداد",
    "تعداد موجود",
    "موجودی فعلی",
  ],
  returnable: [
    "returnable",
    "return",
    "reusable",
    "قابل برگشت",
    "برگشت پذیر",
    "عودت پذیر",
    "امانی",
  ],
  lowStockThreshold: [
    "threshold",
    "low stock threshold",
    "reorder point",
    "minimum stock",
    "min stock",
    "حداقل موجودی",
    "آستانه کمبود",
    "نقطه سفارش",
  ],
};

const CATEGORY_ALIASES = new Map<string, EquipmentCategory>([
  ["furniture", "furniture"],
  ["furnishings", "furniture"],
  ["مبلمان", "furniture"],
  ["اثاثیه", "furniture"],
  ["av", "av"],
  ["audio visual", "av"],
  ["a v", "av"],
  ["صوتی تصویری", "av"],
  ["صوت و تصویر", "av"],
  ["تصویری", "av"],
  ["cooling", "cooling"],
  ["hvac", "cooling"],
  ["سرمایش", "cooling"],
  ["تهویه", "cooling"],
  ["appliance", "appliance"],
  ["appliances", "appliance"],
  ["لوازم", "appliance"],
  ["لوازم برقی", "appliance"],
  ["electrical", "electrical"],
  ["electric", "electrical"],
  ["برق", "electrical"],
  ["الکتریکی", "electrical"],
  ["connectivity", "connectivity"],
  ["network", "connectivity"],
  ["internet", "connectivity"],
  ["شبکه", "connectivity"],
  ["اینترنت", "connectivity"],
  ["support", "support"],
  ["service", "support"],
  ["services", "support"],
  ["پشتیبانی", "support"],
  ["خدمات", "support"],
]);

const TRUE_VALUES = new Set([
  "1",
  "true",
  "yes",
  "y",
  "returnable",
  "reusable",
  "بله",
  "آری",
  "بلی",
  "امانی",
  "قابل برگشت",
  "برگشت پذیر",
  "عودت پذیر",
]);

const FALSE_VALUES = new Set([
  "0",
  "false",
  "no",
  "n",
  "consumable",
  "خیر",
  "نه",
  "مصرفی",
  "غیر قابل برگشت",
]);

function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKC")
    .replaceAll("ي", "ی")
    .replaceAll("ك", "ک")
    .replace(/[\u200b\u200d-\u200f\u202a-\u202e]/g, "")
    .trim();
}

function normalizeLookup(value: unknown): string {
  return normalizeDigits(normalizeText(value))
    .toLocaleLowerCase("en-US")
    .replace(/\u200c/g, " ")
    .replace(/[_./\\()-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function makeInventorySlug(value: string): string {
  return normalizeLookup(value)
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseNonNegativeInteger(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
  }
  const normalized = normalizeDigits(normalizeText(value))
    .replace(/[\s,\u060c\u066c]/g, "")
    .replace("٫", ".");
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function parseReturnable(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  const normalized = normalizeLookup(value);
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return undefined;
}

function parseCategory(value: unknown): EquipmentCategory | undefined {
  const normalized = normalizeLookup(value);
  if (EQUIPMENT_CATEGORIES.includes(normalized as EquipmentCategory)) {
    return normalized as EquipmentCategory;
  }
  return CATEGORY_ALIASES.get(normalized);
}

function isValidTimestamp(value: string): boolean {
  return value.length > 0 && Number.isFinite(Date.parse(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validatedLocalizedText(value: unknown): LocalizedText | undefined {
  if (!isRecord(value)) return undefined;
  const fa = typeof value.fa === "string" ? value.fa.trim() : "";
  const en = typeof value.en === "string" ? value.en.trim() : "";
  return fa && en ? { fa, en } : undefined;
}

function cloneLocalizedText(value: LocalizedText): LocalizedText {
  return { fa: value.fa, en: value.en };
}

function cloneInventoryItem(item: InventoryItem): InventoryItem {
  return {
    ...item,
    name: cloneLocalizedText(item.name),
    unit: cloneLocalizedText(item.unit),
  };
}

function normalizedSku(value: string): string {
  return normalizeLookup(value).replace(/\s+/g, "");
}

export function inventoryItemToCatalogItem(item: InventoryItem): CatalogItem {
  const variant = normalizeText(item.variant);
  const withVariant = (value: string) => (variant ? `${value} · ${variant}` : value);
  return {
    id: item.id,
    name: {
      fa: withVariant(item.name.fa),
      en: withVariant(item.name.en),
    },
    category: item.category,
    returnable: item.returnable,
    unit: cloneLocalizedText(item.unit),
  };
}

export function inventoryItemsToCatalog(items: readonly InventoryItem[]): CatalogItem[] {
  return items.map(inventoryItemToCatalogItem);
}

export function validateInventoryItems(value: unknown): InventoryValidationResult {
  if (!Array.isArray(value)) {
    return { valid: false, errors: ["inventory must be an array."] };
  }

  const errors: string[] = [];
  const items: InventoryItem[] = [];
  const ids = new Set<string>();
  const skus = new Set<string>();

  value.forEach((candidate, index) => {
    const path = `inventory[${index}]`;
    if (!isRecord(candidate)) {
      errors.push(`${path} must be an object.`);
      return;
    }

    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const sku = typeof candidate.sku === "string" ? candidate.sku.trim() : "";
    const name = validatedLocalizedText(candidate.name);
    const unit = validatedLocalizedText(candidate.unit);
    const category = parseCategory(candidate.category);
    const returnable = candidate.returnable;
    const onHand = candidate.onHand;
    const lowStockThreshold = candidate.lowStockThreshold;
    const updatedAt = typeof candidate.updatedAt === "string" ? candidate.updatedAt : "";
    const variant = candidate.variant;
    const archived = candidate.archived;
    const skuKey = normalizedSku(sku);

    if (!id) errors.push(`${path}.id is required.`);
    else if (makeInventorySlug(id) !== id) errors.push(`${path}.id must be a safe slug.`);
    else if (ids.has(id)) errors.push(`${path}.id must be unique.`);
    else ids.add(id);
    if (!sku) errors.push(`${path}.sku is required.`);
    else if (skus.has(skuKey)) errors.push(`${path}.sku must be unique.`);
    else skus.add(skuKey);
    if (!name) errors.push(`${path}.name must include non-empty fa and en values.`);
    if (variant !== undefined && typeof variant !== "string") {
      errors.push(`${path}.variant must be a string when provided.`);
    }
    if (archived !== undefined && typeof archived !== "boolean") {
      errors.push(`${path}.archived must be boolean when provided.`);
    }
    if (!category) errors.push(`${path}.category is invalid.`);
    if (!unit) errors.push(`${path}.unit must include non-empty fa and en values.`);
    if (typeof returnable !== "boolean") errors.push(`${path}.returnable must be boolean.`);
    if (!Number.isSafeInteger(onHand) || Number(onHand) < 0) {
      errors.push(`${path}.onHand must be a non-negative integer.`);
    }
    if (!Number.isSafeInteger(lowStockThreshold) || Number(lowStockThreshold) < 0) {
      errors.push(`${path}.lowStockThreshold must be a non-negative integer.`);
    }
    if (!isValidTimestamp(updatedAt)) errors.push(`${path}.updatedAt must be a valid date.`);

    if (
      id &&
      sku &&
      name &&
      category &&
      unit &&
      typeof returnable === "boolean" &&
      Number.isSafeInteger(onHand) &&
      Number(onHand) >= 0 &&
      Number.isSafeInteger(lowStockThreshold) &&
      Number(lowStockThreshold) >= 0 &&
      isValidTimestamp(updatedAt) &&
      (variant === undefined || typeof variant === "string") &&
      (archived === undefined || typeof archived === "boolean")
    ) {
      items.push({
        id,
        sku,
        name,
        ...(typeof variant === "string" && variant.trim() ? { variant: variant.trim() } : {}),
        category,
        unit,
        returnable,
        onHand: Number(onHand),
        lowStockThreshold: Number(lowStockThreshold),
        ...(archived === true ? { archived: true } : {}),
        updatedAt: new Date(updatedAt).toISOString(),
      });
    }
  });

  return errors.length > 0 ? { valid: false, errors } : { valid: true, items };
}

export function upsertInventoryItems(
  existing: readonly InventoryItem[],
  incoming: readonly InventoryItem[],
): InventoryItem[] {
  const output: InventoryItem[] = [];

  const apply = (source: InventoryItem) => {
    const item = cloneInventoryItem(source);
    const skuKey = normalizedSku(item.sku);
    const matchingIndexes: number[] = [];
    output.forEach((candidate, index) => {
      if (candidate.id === item.id || normalizedSku(candidate.sku) === skuKey) {
        matchingIndexes.push(index);
      }
    });

    if (matchingIndexes.length === 0) {
      output.push(item);
      return;
    }

    const [first, ...duplicates] = matchingIndexes;
    output[first] = item;
    for (const index of duplicates.reverse()) output.splice(index, 1);
  };

  existing.forEach(apply);
  incoming.forEach(apply);
  return output;
}

function findHeaderIndexes(headers: readonly unknown[]): Partial<Record<HeaderField, number>> {
  const normalizedHeaders = headers.map(normalizeLookup);
  const indexes: Partial<Record<HeaderField, number>> = {};
  (Object.keys(HEADER_ALIASES) as HeaderField[]).forEach((field) => {
    const aliases = new Set(HEADER_ALIASES[field].map(normalizeLookup));
    const index = normalizedHeaders.findIndex((header) => aliases.has(header));
    if (index >= 0) indexes[field] = index;
  });
  return indexes;
}

function readCell(row: readonly unknown[], indexes: Partial<Record<HeaderField, number>>, field: HeaderField) {
  const index = indexes[field];
  return index === undefined ? undefined : row[index];
}

function localizedValue(
  row: readonly unknown[],
  indexes: Partial<Record<HeaderField, number>>,
  genericField: "name" | "unit",
  faField: "nameFa" | "unitFa",
  enField: "nameEn" | "unitEn",
): LocalizedText | undefined {
  const generic = normalizeText(readCell(row, indexes, genericField));
  const fa = normalizeText(readCell(row, indexes, faField)) || generic;
  const en = normalizeText(readCell(row, indexes, enField)) || generic;
  if (!fa && !en) return undefined;
  return { fa: fa || en, en: en || fa };
}

function rowIsBlank(row: readonly unknown[]): boolean {
  return row.every((cell) => normalizeText(cell).length === 0);
}

function detectDelimiter(text: string): InventoryDelimiter {
  const counts: Record<InventoryDelimiter, number> = { ",": 0, "\t": 0, ";": 0 };
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') index += 1;
      else quoted = !quoted;
      continue;
    }
    if (!quoted && (character === "\r" || character === "\n")) break;
    if (!quoted && (character === "," || character === "\t" || character === ";")) {
      counts[character] += 1;
    }
  }
  const candidates: InventoryDelimiter[] = ["\t", ",", ";"];
  return candidates.reduce((best, candidate) =>
    counts[candidate] > counts[best] ? candidate : best,
  ",");
}

export function parseInventoryDelimitedText(
  text: string,
  delimiter?: InventoryDelimiter,
): unknown[][] {
  const input = text.replace(/^\uFEFF/, "");
  if (!input) return [];
  const separator = delimiter ?? detectDelimiter(input);
  const rows: unknown[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const finishField = () => {
    row.push(field);
    field = "";
  };
  const finishRow = () => {
    finishField();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (quoted || field.length === 0) {
        quoted = !quoted;
      } else {
        field += character;
      }
      continue;
    }
    if (!quoted && character === separator) {
      finishField();
      continue;
    }
    if (!quoted && (character === "\r" || character === "\n")) {
      finishRow();
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      continue;
    }
    if (quoted && character === "\r") {
      field += "\n";
      if (input[index + 1] === "\n") index += 1;
      continue;
    }
    field += character;
  }

  if (field.length > 0 || row.length > 0 || !/[\r\n]$/.test(input)) finishRow();
  return rows;
}

export function parseInventoryRows(
  rows: readonly (readonly unknown[])[],
  options: InventoryRowParseOptions = {},
): InventoryRowParseResult {
  if (rows.length === 0) {
    return { items: [], errors: [{ row: 1, message: "Inventory table is empty." }] };
  }

  const updatedAt = options.updatedAt ?? "1970-01-01T00:00:00.000Z";
  if (!isValidTimestamp(updatedAt)) {
    return { items: [], errors: [{ row: 1, field: "updatedAt", message: "updatedAt must be a valid date." }] };
  }

  const indexes = findHeaderIndexes(rows[0]);
  const errors: InventoryRowError[] = [];
  const missingHeaders: string[] = [];
  if (indexes.sku === undefined) missingHeaders.push("SKU/code");
  if (indexes.name === undefined && indexes.nameFa === undefined && indexes.nameEn === undefined) {
    missingHeaders.push("name");
  }
  if (indexes.category === undefined) missingHeaders.push("category");
  if (indexes.unit === undefined && indexes.unitFa === undefined && indexes.unitEn === undefined) {
    missingHeaders.push("unit");
  }
  if (indexes.onHand === undefined) missingHeaders.push("quantity/on hand");
  if (indexes.returnable === undefined) missingHeaders.push("returnable");
  if (missingHeaders.length > 0) {
    return {
      items: [],
      errors: [{ row: 1, message: `Missing required columns: ${missingHeaders.join(", ")}.` }],
    };
  }

  let items: InventoryItem[] = [];
  rows.slice(1).forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 2;
    if (rowIsBlank(row)) return;

    const sku = normalizeText(readCell(row, indexes, "sku"));
    const id = makeInventorySlug(sku);
    const name = localizedValue(row, indexes, "name", "nameFa", "nameEn");
    const unit = localizedValue(row, indexes, "unit", "unitFa", "unitEn");
    const category = parseCategory(readCell(row, indexes, "category"));
    const onHand = parseNonNegativeInteger(readCell(row, indexes, "onHand"));
    const returnable = parseReturnable(readCell(row, indexes, "returnable"));
    const thresholdCell = readCell(row, indexes, "lowStockThreshold");
    const lowStockThreshold =
      indexes.lowStockThreshold === undefined || normalizeText(thresholdCell) === ""
        ? 0
        : parseNonNegativeInteger(thresholdCell);
    const rowErrors: InventoryRowError[] = [];

    if (!sku) rowErrors.push({ row: rowNumber, field: "sku", message: "SKU/code is required." });
    else if (!id) rowErrors.push({ row: rowNumber, field: "sku", message: "SKU/code cannot form a safe ID." });
    if (!name) rowErrors.push({ row: rowNumber, field: "name", message: "Name is required." });
    if (!category) {
      rowErrors.push({ row: rowNumber, field: "category", message: "Category is not recognized." });
    }
    if (!unit) rowErrors.push({ row: rowNumber, field: "unit", message: "Unit is required." });
    if (onHand === undefined) {
      rowErrors.push({ row: rowNumber, field: "onHand", message: "On-hand quantity must be a non-negative integer." });
    }
    if (returnable === undefined) {
      rowErrors.push({ row: rowNumber, field: "returnable", message: "Returnable must be yes/no or true/false." });
    }
    if (lowStockThreshold === undefined) {
      rowErrors.push({
        row: rowNumber,
        field: "lowStockThreshold",
        message: "Low-stock threshold must be a non-negative integer.",
      });
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      return;
    }

    const variant = normalizeText(readCell(row, indexes, "variant"));
    const item: InventoryItem = {
      id,
      sku,
      name: name as LocalizedText,
      ...(variant ? { variant } : {}),
      category: category as EquipmentCategory,
      unit: unit as LocalizedText,
      returnable: returnable as boolean,
      onHand: onHand as number,
      lowStockThreshold: lowStockThreshold as number,
      updatedAt: new Date(updatedAt).toISOString(),
    };
    items = upsertInventoryItems(items, [item]);
  });

  return { items, errors };
}

function equipmentLinesForItem(item: InventoryItem, halls: readonly Hall[]): InventoryEquipmentLine[] {
  const keys = new Set([normalizeLookup(item.id), normalizeLookup(item.sku)]);
  return halls
    .flatMap((hall) => hall.booths)
    .flatMap((booth) => booth.equipment as InventoryEquipmentLine[])
    .filter((line) => keys.has(normalizeLookup(line.catalogItemId)));
}

function assertLineCount(value: number, label: string, maximum?: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || (maximum !== undefined && value > maximum)) {
    throw new RangeError(`${label} must be a non-negative integer${maximum === undefined ? "" : ` no greater than ${maximum}`}.`);
  }
}

export function calculateInventoryItemTotals(
  item: InventoryItem,
  halls: readonly Hall[],
): InventoryItemTotals {
  assertLineCount(item.onHand, "Inventory on-hand quantity");
  let assigned = 0;
  let outstanding = 0;
  let missing = 0;

  for (const line of equipmentLinesForItem(item, halls)) {
    assertLineCount(line.quantity, `Equipment quantity for ${line.id}`);

    if (!line.returnable) {
      assigned += line.quantity;
      outstanding += line.quantity;
      continue;
    }

    const terminalCollection = line.stage === "collected" || line.stage === "issue";
    let collected = 0;
    if (terminalCollection) {
      collected =
        line.collectedQuantity === undefined
          ? line.stage === "collected"
            ? line.quantity
            : 0
          : line.collectedQuantity;
      assertLineCount(collected, `Collected quantity for ${line.id}`, line.quantity);
    }

    const lineOutstanding = line.quantity - collected;
    assigned += lineOutstanding;
    outstanding += lineOutstanding;
    if (terminalCollection && line.collectedQuantity !== undefined) missing += lineOutstanding;
  }

  missing += Math.max(0, outstanding - item.onHand);

  return {
    itemId: item.id,
    sku: item.sku,
    onHand: item.onHand,
    assigned,
    outstanding,
    missing,
    available: Math.max(0, item.onHand - outstanding),
  };
}

export function deriveInventoryTotals(
  items: readonly InventoryItem[],
  halls: readonly Hall[],
): InventoryItemTotals[] {
  return items.map((item) => calculateInventoryItemTotals(item, halls));
}
