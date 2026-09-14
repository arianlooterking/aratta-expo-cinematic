export const PLAN_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
] as const;

export type PlanMimeType = (typeof PLAN_MIME_TYPES)[number];

const PLAN_MIME_TYPE_SET = new Set<string>(PLAN_MIME_TYPES);
const FEATURE_KINDS = new Set([
  "column",
  "door",
  "zone",
  "aisle",
  "loading",
  "utility",
  "entrance",
  "wall",
  "label",
]);

export type StructuredPlanItem = {
  type: "booth" | "feature";
  code: string | null;
  label: string | null;
  kind: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number | null;
  rotation: number;
  company: string | null;
  zone: string | null;
  notes: string | null;
};

export type StructuredPlan = {
  summary: string;
  confidence: number;
  items: StructuredPlanItem[];
};

function isEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(value);
}

export function normalizeAuthenticatedEmail(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return isEmail(normalized) ? normalized : null;
}

export function parseAllowedEmails(value: string | undefined): Set<string> | null {
  if (!value?.trim()) return null;
  const entries = value.split(",").map((entry) => entry.trim().toLowerCase());
  if (entries.some((entry) => !isEmail(entry))) return null;
  return new Set(entries);
}

export function isPlanMimeType(value: string): value is PlanMimeType {
  return PLAN_MIME_TYPE_SET.has(value);
}

function beginsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

export function matchesPlanFileSignature(bytes: Uint8Array, mimeType: PlanMimeType): boolean {
  switch (mimeType) {
    case "image/png":
      return beginsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/jpeg":
      return beginsWith(bytes, [0xff, 0xd8, 0xff]);
    case "image/webp":
      return bytes.length >= 12
        && beginsWith(bytes, [0x52, 0x49, 0x46, 0x46])
        && beginsWith(bytes.subarray(8), [0x57, 0x45, 0x42, 0x50]);
    case "application/pdf":
      return beginsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function getProviderResponseStatus(payload: unknown): string | null {
  const record = asRecord(payload);
  return record && typeof record.status === "string" ? record.status : null;
}

export function hasProviderRefusal(payload: unknown): boolean {
  const record = asRecord(payload);
  if (!record || !Array.isArray(record.output)) return false;
  return record.output.some((item) => {
    const outputItem = asRecord(item);
    if (!outputItem) return false;
    if (outputItem.type === "refusal") return true;
    if (!Array.isArray(outputItem.content)) return false;
    return outputItem.content.some((part) => asRecord(part)?.type === "refusal");
  });
}

export function extractProviderOutputText(payload: unknown): string | null {
  const record = asRecord(payload);
  if (!record) return null;
  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text;
  }
  if (!Array.isArray(record.output)) return null;
  for (const item of record.output) {
    const outputItem = asRecord(item);
    if (!outputItem || !Array.isArray(outputItem.content)) continue;
    for (const part of outputItem.content) {
      const contentPart = asRecord(part);
      if (contentPart?.type === "output_text" && typeof contentPart.text === "string" && contentPart.text.trim()) {
        return contentPart.text;
      }
    }
  }
  return null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableString(value: unknown, maxLength: number): value is string | null {
  return value === null || (typeof value === "string" && value.length <= maxLength);
}

export function normalizeStructuredPlan(value: unknown): StructuredPlan | null {
  const record = asRecord(value);
  if (!record || typeof record.summary !== "string" || record.summary.length > 4_000) return null;
  if (!isFiniteNumber(record.confidence) || record.confidence < 0 || record.confidence > 1) return null;
  if (!Array.isArray(record.items) || record.items.length === 0 || record.items.length > 300) return null;

  const items: StructuredPlanItem[] = [];
  for (const rawItem of record.items) {
    const item = asRecord(rawItem);
    if (!item || (item.type !== "booth" && item.type !== "feature")) return null;
    if (!isNullableString(item.code, 120) || !isNullableString(item.label, 300)) return null;
    if (item.kind !== null && (typeof item.kind !== "string" || !FEATURE_KINDS.has(item.kind))) return null;
    if (!isFiniteNumber(item.x) || item.x < 0 || !isFiniteNumber(item.y) || item.y < 0) return null;
    if (!isFiniteNumber(item.width) || item.width <= 0 || !isFiniteNumber(item.height) || item.height <= 0) return null;
    if (item.area !== null && (!isFiniteNumber(item.area) || item.area < 0)) return null;
    if (!isFiniteNumber(item.rotation)) return null;
    if (!isNullableString(item.company, 500) || !isNullableString(item.zone, 200) || !isNullableString(item.notes, 1_500)) return null;

    items.push({
      type: item.type,
      code: item.code,
      label: item.label,
      kind: item.kind,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      area: item.area,
      rotation: item.type === "booth" ? 0 : item.rotation,
      company: item.company,
      zone: item.zone,
      notes: item.notes,
    });
  }

  return {
    summary: record.summary,
    confidence: record.confidence,
    items,
  };
}
