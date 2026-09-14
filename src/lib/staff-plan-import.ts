import {
  clonePortalState,
  detachTasksFromMissingBooths,
} from "./staff-portal.ts";
import type {
  Booth,
  BoothStatus,
  Hall,
  HallFeature,
  HallFeatureKind,
  PortalState,
} from "./staff-portal.ts";

export type PlanReconstruction = {
  booths: Booth[];
  features: HallFeature[];
  warnings: string[];
  confidence?: number;
  sourceSummary?: string;
};

export type PlanApplyMode = "merge" | "replace";
export type PlanReconstructionApplyMode = PlanApplyMode;

export type ApplicablePlanValidationResult =
  | { valid: true; errors: [] }
  | { valid: false; errors: string[] };

export type ApplyPlanReconstructionOptions = {
  hallId: string;
  plan: PlanReconstruction;
  mode: PlanApplyMode;
};

type ParsePlanOptions = {
  hall: Pick<Hall, "id" | "width" | "height" | "physicalWidth" | "physicalHeight">;
  updatedAt: string;
  sourceName?: string;
};

const headerAliases = {
  type: ["type", "record type", "نوع", "نوع رکورد"],
  code: ["code", "booth", "booth code", "stand", "غرفه", "کد غرفه"],
  label: ["label", "name", "title", "نام", "عنوان", "برچسب"],
  kind: ["kind", "feature", "feature type", "سازه", "نوع سازه"],
  x: ["x", "x m", "left", "x متر", "فاصله افقی"],
  y: ["y", "y m", "top", "y متر", "فاصله عمودی"],
  width: ["width", "width m", "w", "عرض", "عرض متر"],
  height: ["height", "depth", "height m", "depth m", "h", "ارتفاع", "عمق", "طول", "عمق متر"],
  area: ["area", "area m2", "sqm", "m2", "مساحت", "متر مربع"],
  rotation: ["rotation", "angle", "زاویه", "چرخش"],
  unit: ["unit", "units", "واحد"],
  company: ["company", "exhibitor", "شرکت", "غرفه دار"],
  owner: ["owner", "staff", "مسئول", "کارشناس"],
  zone: ["zone", "hall zone", "ناحیه", "زون"],
  status: ["status", "state", "وضعیت"],
  notes: ["notes", "description", "یادداشت", "توضیحات"],
} as const;

type HeaderKey = keyof typeof headerAliases;
type ColumnMap = Partial<Record<HeaderKey, number>>;

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("en")
    .replace(/[²^]/g, "2")
    .replace(/[\s_-]+/g, " ")
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک");
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const normalized = value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[٬,]/g, "")
    .replace(/٫/g, ".")
    .replace(/[^\d.+-]/g, "");
  if (!/[0-9]/.test(normalized)) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function findHeader(rows: readonly (readonly unknown[])[]): { rowIndex: number; columns: ColumnMap } | null {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 12); rowIndex += 1) {
    const columns: ColumnMap = {};
    rows[rowIndex].forEach((cell, columnIndex) => {
      const value = normalize(cell);
      (Object.keys(headerAliases) as HeaderKey[]).forEach((key) => {
        if (columns[key] === undefined && headerAliases[key].some((alias) => normalize(alias) === value)) columns[key] = columnIndex;
      });
    });
    if (columns.code !== undefined || (columns.type !== undefined && (columns.width !== undefined || columns.area !== undefined))) return { rowIndex, columns };
  }
  return null;
}

function at(row: readonly unknown[], columns: ColumnMap, key: HeaderKey): unknown {
  const index = columns[key];
  return index === undefined ? undefined : row[index];
}

function statusValue(value: unknown): BoothStatus {
  const text = normalize(value);
  if (/paid|تسویه|پرداخت/.test(text)) return "paid";
  if (/confirm|قطعی|تایید/.test(text)) return "confirmed";
  if (/reserve|رزرو/.test(text)) return "reserved";
  if (/attention|issue|مشکل|توجه/.test(text)) return "attention";
  if (/block|مسدود/.test(text)) return "blocked";
  return "available";
}

function featureKind(value: unknown): HallFeatureKind | null {
  const text = normalize(value);
  if (/column|ستون/.test(text)) return "column";
  if (/door|درب/.test(text)) return "door";
  if (/aisle|corridor|راهرو/.test(text)) return "aisle";
  if (/loading|بارگیری/.test(text)) return "loading";
  if (/utility|تاسیسات|برق|آب/.test(text)) return "utility";
  if (/entrance|entry|ورودی/.test(text)) return "entrance";
  if (/wall|دیوار/.test(text)) return "wall";
  if (/label|text|برچسب/.test(text)) return "label";
  if (/zone|service|ناحیه|فضا/.test(text)) return "zone";
  return null;
}

function slug(value: string): string {
  return value.toLocaleLowerCase("en").replace(/[^a-z0-9\u0600-\u06ff]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

function canonicalBoothCode(value: string): string {
  return value
    .trim()
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .toLocaleUpperCase("en")
    .replace(/[\s_-]+/g, "-");
}

function uniqueId(preferredId: string, usedIds: Set<string>): string {
  let candidate = preferredId;
  let suffix = 2;
  while (usedIds.has(candidate)) {
    candidate = `${preferredId}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

function metersToCanvas(value: number, axis: "x" | "y", hall: ParsePlanOptions["hall"]): number {
  return value * (axis === "x" ? hall.width / hall.physicalWidth : hall.height / hall.physicalHeight);
}

function fitGeometry(
  row: readonly unknown[],
  columns: ColumnMap,
  index: number,
  hall: ParsePlanOptions["hall"],
  warnings: string[],
): { x: number; y: number; width: number; height: number; area: number } | null {
  const unit = normalize(at(row, columns, "unit"));
  const useCanvasUnits = /canvas|pixel|px|نقشه/.test(unit);
  let width = numberValue(at(row, columns, "width"));
  let height = numberValue(at(row, columns, "height"));
  const suppliedArea = numberValue(at(row, columns, "area"));
  const hasWidth = width !== undefined && width > 0;
  const hasHeight = height !== undefined && height > 0;
  const hasArea = suppliedArea !== undefined && suppliedArea > 0;
  if (hasArea && (!hasWidth || !hasHeight)) {
    if (hasWidth && width !== undefined) {
      height = suppliedArea / width;
    } else if (hasHeight && height !== undefined) {
      width = suppliedArea / height;
    } else {
      const defaultWidthToDepthRatio = 1.5;
      width = Math.sqrt(suppliedArea * defaultWidthToDepthRatio);
      height = suppliedArea / width;
    }
  }
  if (width === undefined || width <= 0 || height === undefined || height <= 0) {
    warnings.push(`Row ${index + 1}: width/depth or a positive area is required.`);
    return null;
  }
  let x = numberValue(at(row, columns, "x"));
  let y = numberValue(at(row, columns, "y"));
  if (x === undefined || y === undefined) {
    const gap = 1;
    const columnsCount = Math.max(1, Math.floor(hall.physicalWidth / Math.max(width + gap, 3)));
    if (x === undefined) x = gap + (index % columnsCount) * (width + gap);
    if (y === undefined) y = gap + Math.floor(index / columnsCount) * (height + gap);
  }
  const geometry = useCanvasUnits
    ? { x, y, width, height }
    : { x: metersToCanvas(x, "x", hall), y: metersToCanvas(y, "y", hall), width: metersToCanvas(width, "x", hall), height: metersToCanvas(height, "y", hall) };
  if (geometry.x < 0 || geometry.y < 0 || geometry.x + geometry.width > hall.width || geometry.y + geometry.height > hall.height) {
    warnings.push(`Row ${index + 1}: geometry exceeds the active hall and was skipped.`);
    return null;
  }
  const metricWidth = useCanvasUnits ? width * (hall.physicalWidth / hall.width) : width;
  const metricHeight = useCanvasUnits ? height * (hall.physicalHeight / hall.height) : height;
  const computedArea = metricWidth * metricHeight;
  if (
    hasArea
    && hasWidth
    && hasHeight
    && suppliedArea !== undefined
    && Math.abs(suppliedArea - computedArea) / Math.max(suppliedArea, computedArea) > 0.02
  ) {
    warnings.push(`Row ${index + 1}: supplied area did not match width/depth; geometry was used.`);
  }
  return { ...geometry, area: computedArea };
}

export function parsePlanRows(rows: readonly (readonly unknown[])[], options: ParsePlanOptions): PlanReconstruction {
  const header = findHeader(rows);
  if (!header) return { booths: [], features: [], warnings: ["No booth/feature header row was found."] };
  const warnings: string[] = [];
  const booths: Booth[] = [];
  const features: HallFeature[] = [];
  const codes = new Set<string>();
  const reservedCodes = new Set(
    rows
      .slice(header.rowIndex + 1)
      .map((row) => String(at(row, header.columns, "code") ?? "").trim())
      .filter(Boolean)
      .map(canonicalBoothCode),
  );
  const usedIds = new Set<string>();
  let generatedBoothNumber = 1;
  rows.slice(header.rowIndex + 1).forEach((row, relativeIndex) => {
    const rowIndex = header.rowIndex + relativeIndex + 1;
    if (!row.some((cell) => String(cell ?? "").trim())) return;
    let code = String(at(row, header.columns, "code") ?? "").trim();
    const rawKind = at(row, header.columns, "kind") ?? at(row, header.columns, "type");
    const kind = featureKind(rawKind);
    const recordType = normalize(at(row, header.columns, "type"));
    const explicitlyFeature = /feature|structure|object|سازه/.test(recordType);
    const explicitlyBooth = /booth|stand|غرفه/.test(recordType);
    const isFeature = explicitlyFeature || (Boolean(kind) && !explicitlyBooth);
    const geometry = fitGeometry(row, header.columns, rowIndex, options.hall, warnings);
    if (!geometry) return;
    if (isFeature) {
      if (!kind) {
        warnings.push(`Row ${rowIndex + 1}: feature kind is missing or unsupported.`);
        return;
      }
      const label = String(at(row, header.columns, "label") ?? code ?? rawKind ?? kind).trim() || kind;
      features.push({ id: uniqueId(`${options.hall.id}-import-${kind}-${slug(label)}`, usedIds), kind, x: geometry.x, y: geometry.y, width: geometry.width, height: geometry.height, label: { fa: label, en: label }, rotation: numberValue(at(row, header.columns, "rotation")) ?? 0 });
      return;
    }
    if (!code) {
      do {
        code = `AI-${String(generatedBoothNumber).padStart(3, "0")}`;
        generatedBoothNumber += 1;
      } while (codes.has(canonicalBoothCode(code)) || reservedCodes.has(canonicalBoothCode(code)));
      warnings.push(`Row ${rowIndex + 1}: booth code was missing; generated ${code}.`);
    }
    const canonicalCode = canonicalBoothCode(code);
    if (codes.has(canonicalCode)) { warnings.push(`Row ${rowIndex + 1}: duplicate booth code ${code} was skipped.`); return; }
    codes.add(canonicalCode);
    booths.push({ id: uniqueId(`${options.hall.id}-import-booth-${slug(code)}`, usedIds), code, x: geometry.x, y: geometry.y, width: geometry.width, height: geometry.height, area: Math.round(geometry.area * 100) / 100, status: statusValue(at(row, header.columns, "status")), company: String(at(row, header.columns, "company") ?? "").trim() || null, owner: String(at(row, header.columns, "owner") ?? "").trim(), notes: String(at(row, header.columns, "notes") ?? "").trim(), equipment: [], zone: String(at(row, header.columns, "zone") ?? "Imported").trim() || "Imported", updatedAt: options.updatedAt });
  });
  return { booths, features, warnings, sourceSummary: options.sourceName ? `Imported from ${options.sourceName}` : undefined };
}

export function normalizeVisionPlan(value: unknown, options: ParsePlanOptions): PlanReconstruction {
  if (!value || typeof value !== "object") throw new TypeError("The reconstruction response is not an object.");
  const record = value as Record<string, unknown>;
  const rows = Array.isArray(record.items) ? record.items : [];
  const table: unknown[][] = [["type", "code", "label", "kind", "x m", "y m", "width m", "depth m", "area m2", "rotation", "company", "zone", "notes"]];
  rows.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;
    table.push([row.type, row.code, row.label, row.kind, row.x, row.y, row.width, row.height, row.area, row.rotation, row.company, row.zone, row.notes]);
  });
  const parsed = parsePlanRows(table, options);
  const warnings = [...parsed.warnings];
  const rawConfidence = numberValue(record.confidence);
  let confidence: number | undefined;
  if (record.confidence !== undefined && rawConfidence === undefined) {
    warnings.push("The reconstruction confidence was invalid and was ignored.");
  } else if (rawConfidence !== undefined) {
    confidence = Math.min(1, Math.max(0, rawConfidence));
    if (confidence !== rawConfidence) warnings.push("The reconstruction confidence was outside 0–1 and was clamped.");
  }
  return { ...parsed, warnings, confidence, sourceSummary: typeof record.summary === "string" ? record.summary : parsed.sourceSummary };
}

export function validateApplicablePlan(plan: PlanReconstruction): ApplicablePlanValidationResult {
  const errors: string[] = [];
  if (!plan || !Array.isArray(plan.booths) || !Array.isArray(plan.features)) {
    return { valid: false, errors: ["The reconstruction plan is malformed."] };
  }
  if (plan.booths.length === 0) errors.push("The reconstruction must contain at least one editable booth.");

  const ids = new Set<string>();
  const codes = new Set<string>();
  const validateGeometry = (item: Pick<Booth, "id" | "x" | "y" | "width" | "height">, label: string) => {
    if (!item.id.trim()) errors.push(`${label} has no stable ID.`);
    if (ids.has(item.id)) errors.push(`${label} reuses ID ${item.id}.`);
    ids.add(item.id);
    if (![item.x, item.y, item.width, item.height].every(Number.isFinite) || item.x < 0 || item.y < 0 || item.width <= 0 || item.height <= 0) {
      errors.push(`${label} has invalid geometry.`);
    }
  };

  plan.booths.forEach((booth, index) => {
    validateGeometry(booth, `Booth ${index + 1}`);
    const canonicalCode = canonicalBoothCode(booth.code);
    if (!canonicalCode) errors.push(`Booth ${index + 1} has no code.`);
    if (codes.has(canonicalCode)) errors.push(`Booth code ${booth.code} is duplicated.`);
    codes.add(canonicalCode);
    if (!Number.isFinite(booth.area) || booth.area <= 0) errors.push(`Booth ${booth.code || index + 1} has an invalid area.`);
  });
  plan.features.forEach((feature, index) => validateGeometry(feature, `Feature ${index + 1}`));
  if (plan.confidence !== undefined && (!Number.isFinite(plan.confidence) || plan.confidence < 0 || plan.confidence > 1)) {
    errors.push("The reconstruction confidence must be between 0 and 1.");
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true, errors: [] };
}

function featureMatchKey(feature: HallFeature): string {
  return `${feature.kind}:${normalize(feature.label.en || feature.label.fa)}`;
}

export function applyPlanReconstruction(
  state: PortalState,
  { hallId, plan, mode }: ApplyPlanReconstructionOptions,
): PortalState {
  const validation = validateApplicablePlan(plan);
  if (!validation.valid) throw new TypeError(validation.errors.join("\n"));
  if (mode !== "merge" && mode !== "replace") throw new TypeError("Plan application mode must be merge or replace.");

  const next = clonePortalState(state);
  const hallIndex = next.halls.findIndex((hall) => hall.id === hallId);
  if (hallIndex < 0) throw new TypeError(`Hall ${hallId} does not exist.`);
  const hall = next.halls[hallIndex];
  const importedBooths = structuredClone(plan.booths);
  const importedFeatures = structuredClone(plan.features);

  if (mode === "merge") {
    const existingBoothsByCode = new Map(hall.booths.map((booth) => [canonicalBoothCode(booth.code), booth]));
    const usedBoothIds = new Set(next.halls.flatMap((item) => item.booths.map((booth) => booth.id)));
    const mergedBooths = [...hall.booths];
    importedBooths.forEach((incoming) => {
      const existing = existingBoothsByCode.get(canonicalBoothCode(incoming.code));
      if (existing) {
        const index = mergedBooths.findIndex((booth) => booth.id === existing.id);
        mergedBooths[index] = {
          ...incoming,
          id: existing.id,
          code: existing.code,
          status: existing.status,
          company: existing.company,
          owner: existing.owner,
          notes: existing.notes,
          equipment: structuredClone(existing.equipment),
        };
        return;
      }
      incoming.id = uniqueId(incoming.id, usedBoothIds);
      mergedBooths.push(incoming);
    });

    const existingFeaturesByKey = new Map(hall.features.map((feature) => [featureMatchKey(feature), feature]));
    const usedFeatureIds = new Set(next.halls.flatMap((item) => item.features.map((feature) => feature.id)));
    const mergedFeatures = [...hall.features];
    importedFeatures.forEach((incoming) => {
      const existing = existingFeaturesByKey.get(featureMatchKey(incoming));
      if (existing) {
        const index = mergedFeatures.findIndex((feature) => feature.id === existing.id);
        mergedFeatures[index] = { ...incoming, id: existing.id };
        return;
      }
      incoming.id = uniqueId(incoming.id, usedFeatureIds);
      mergedFeatures.push(incoming);
    });
    next.halls[hallIndex] = { ...hall, booths: mergedBooths, features: mergedFeatures };
  } else {
    const boothIdsOutsideHall = new Set(next.halls.filter((item) => item.id !== hallId).flatMap((item) => item.booths.map((booth) => booth.id)));
    importedBooths.forEach((booth) => { booth.id = uniqueId(booth.id, boothIdsOutsideHall); });
    const featureIdsOutsideHall = new Set(next.halls.filter((item) => item.id !== hallId).flatMap((item) => item.features.map((feature) => feature.id)));
    importedFeatures.forEach((feature) => { feature.id = uniqueId(feature.id, featureIdsOutsideHall); });
    next.halls[hallIndex] = { ...hall, booths: importedBooths, features: importedFeatures };
    const validBoothIds = next.halls.flatMap((item) => item.booths.map((booth) => booth.id));
    next.tasks = detachTasksFromMissingBooths(next.tasks, validBoothIds);
  }

  return next;
}
