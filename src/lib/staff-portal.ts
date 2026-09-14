import {
  validateCrmDirectoryRecords,
  validateCommercialRecords,
  type CommercialAccount,
  type CrmCompany,
  type SalesLead,
  type StaffUser,
} from "./staff-commercial.ts";

export type PortalLocale = "fa" | "en";

export type LocalizedText = {
  fa: string;
  en: string;
};

export type BoothStatus =
  | "available"
  | "reserved"
  | "confirmed"
  | "paid"
  | "attention"
  | "blocked";

export type EquipmentStage =
  | "requested"
  | "preparing"
  | "staged"
  | "delivered"
  | "collected"
  | "issue";

export type EquipmentCategory =
  | "furniture"
  | "av"
  | "cooling"
  | "appliance"
  | "electrical"
  | "connectivity"
  | "support";

export type HallFeatureKind =
  | "column"
  | "door"
  | "zone"
  | "aisle"
  | "loading"
  | "utility"
  | "entrance"
  | "wall"
  | "label";

export type EquipmentLine = {
  id: string;
  catalogItemId: string;
  name: LocalizedText;
  quantity: number;
  collectedQuantity?: number;
  stage: EquipmentStage;
  stageBeforeIssue?: Exclude<EquipmentStage, "issue">;
  returnable: boolean;
  deliveryWindow: string;
  pickupWindow: string;
  notes: string;
  updatedAt: string;
};

export type Booth = {
  id: string;
  code: string;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
  status: BoothStatus;
  company: string | null;
  owner: string;
  notes: string;
  equipment: EquipmentLine[];
  zone: string;
  updatedAt: string;
};

export type HallFeature = {
  id: string;
  kind: HallFeatureKind;
  x: number;
  y: number;
  width: number;
  height: number;
  label: LocalizedText;
  rotation?: number;
};

export type Hall = {
  id: string;
  name: LocalizedText;
  width: number;
  height: number;
  physicalWidth: number;
  physicalHeight: number;
  unit: "m";
  booths: Booth[];
  features: HallFeature[];
};

export type ExhibitionStatus = "planning" | "build" | "live" | "strike" | "archived";

export type Exhibition = {
  id: string;
  name: LocalizedText;
  venue: LocalizedText;
  city: LocalizedText;
  startDate: string;
  endDate: string;
  status: ExhibitionStatus;
  hallIds: string[];
  notes: LocalizedText;
  color: string;
};

export type PortalTask = {
  id: string;
  title: LocalizedText;
  boothId?: string;
  owner: string;
  dueAt: string;
  status: "open" | "in-progress" | "done";
  priority: "high" | "medium" | "low";
  notes: string;
};

export type AuditEvent = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actor: string;
  summary: LocalizedText;
  timestamp: string;
};

export type CatalogItem = {
  id: string;
  name: LocalizedText;
  category: EquipmentCategory;
  returnable: boolean;
  unit: LocalizedText;
};

export type PortalState = {
  version: number;
  eventName: LocalizedText;
  eventStatus: "archived-template";
  activeExhibitionId: string;
  activeHallId: string;
  exhibitions: Exhibition[];
  halls: Hall[];
  companies: CrmCompany[];
  staffUsers: StaffUser[];
  leads: SalesLead[];
  commercialAccounts: CommercialAccount[];
  tasks: PortalTask[];
  audit: AuditEvent[];
  lastSavedAt: string;
};

export type PortalMetrics = {
  hallCount: number;
  boothCount: number;
  allocatableBoothCount: number;
  bookedBoothCount: number;
  occupancyPercent: number;
  boothStatuses: Record<BoothStatus, number>;
  equipmentLineCount: number;
  equipmentUnitCount: number;
  equipmentStages: Record<EquipmentStage, number>;
  openTaskCount: number;
  overdueTaskCount: number;
};

export type SnapshotValidationResult =
  | { valid: true; errors: []; value: PortalState }
  | { valid: false; errors: string[] };

export type CsvBoothImportError = {
  row: number;
  message: string;
};

export type CsvBoothImportResult = {
  booths: Booth[];
  errors: CsvBoothImportError[];
};

export type PublicBooth = Pick<
  Booth,
  "id" | "code" | "x" | "y" | "width" | "height" | "area" | "zone"
> & {
  occupancy: "available" | "occupied" | "unavailable";
};
export type PublicHall = Omit<Hall, "booths"> & { booths: PublicBooth[] };

const BOOTH_STATUSES: readonly BoothStatus[] = [
  "available",
  "reserved",
  "confirmed",
  "paid",
  "attention",
  "blocked",
];

export const equipmentStageOrder: readonly EquipmentStage[] = [
  "requested",
  "preparing",
  "staged",
  "delivered",
  "collected",
];

const EQUIPMENT_STAGES: readonly EquipmentStage[] = [...equipmentStageOrder, "issue"];
const HALL_FEATURE_KINDS: readonly HallFeatureKind[] = [
  "column",
  "door",
  "zone",
  "aisle",
  "loading",
  "utility",
  "entrance",
  "wall",
  "label",
];
const EXHIBITION_STATUSES: readonly ExhibitionStatus[] = [
  "planning",
  "build",
  "live",
  "strike",
  "archived",
];

const EN_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
const FA_MONTHS = [
  "ژانویه",
  "فوریه",
  "مارس",
  "آوریل",
  "مه",
  "ژوئن",
  "ژوئیه",
  "اوت",
  "سپتامبر",
  "اکتبر",
  "نوامبر",
  "دسامبر",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isLocalizedText(value: unknown): value is LocalizedText {
  return isRecord(value) && isNonEmptyString(value.fa) && isNonEmptyString(value.en);
}

function toPersianDigits(value: string): string {
  return value.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)] ?? digit);
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "record";
}

function makeDefaultStaffUsers(timestamp: string): StaffUser[] {
  const people = [
    ["staff-mina", "Mina Karimi", "Commercial director", "owner", ["executive", "sales"], undefined, 76],
    ["staff-reza", "Reza Ahmadi", "Senior account manager", "manager", ["sales"], "staff-mina", 68],
    ["staff-sara", "Sara Moradi", "Exhibition operations lead", "manager", ["operations"], "staff-mina", 82],
    ["staff-omid", "Omid Jalali", "Finance controller", "member", ["finance", "compliance"], "staff-mina", 57],
    ["staff-niloofar", "Niloofar Asadi", "Logistics coordinator", "member", ["logistics", "operations"], "staff-sara", 64],
  ] as const;
  return people.map(([id, displayName, title, accessRole, departments, managerId, workloadCapacity]) => ({
    id,
    displayName,
    title,
    accessRole,
    departments: [...departments],
    ...(managerId ? { managerId } : {}),
    status: "active",
    languages: displayName === "Mina Karimi" ? ["fa", "en"] : ["fa"],
    email: "",
    phone: "",
    workloadCapacity,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

function ownerIdForName(staffUsers: StaffUser[], owner: unknown): string {
  const normalized = typeof owner === "string" ? owner.trim().toLocaleLowerCase("en") : "";
  return staffUsers.find((staff) => staff.displayName.toLocaleLowerCase("en") === normalized)?.id ?? staffUsers[0]?.id ?? "staff-unassigned";
}

export function clonePortalState(state: PortalState): PortalState {
  return structuredClone(state);
}

export function upgradePortalSnapshot(input: unknown): unknown {
  if (!isRecord(input)) return input;
  const upgraded = structuredClone(input) as Record<string, unknown>;
  const hadExhibitions = Array.isArray(input.exhibitions);

  if (!Array.isArray(input.exhibitions)) {
    if (!Array.isArray(input.halls) || !isLocalizedText(input.eventName)) return input;
    const hallIds = input.halls
      .filter(isRecord)
      .map((hall) => hall.id)
      .filter(isNonEmptyString);
    const savedDate = isIsoDate(input.lastSavedAt)
      ? new Date(input.lastSavedAt).toISOString().slice(0, 10)
      : "1970-01-01";
    const activeHallId =
      isNonEmptyString(input.activeHallId) && hallIds.includes(input.activeHallId)
        ? input.activeHallId
        : hallIds[0] ?? "";
    const exhibitionId = `exhibition-migrated-${slugify(input.eventName.en)}`;

    upgraded.activeExhibitionId = exhibitionId;
    upgraded.activeHallId = activeHallId;
    upgraded.exhibitions = [
      {
        id: exhibitionId,
        name: structuredClone(input.eventName),
        venue: { fa: "محل ثبت نشده", en: "Venue not recorded" },
        city: { fa: "شهر ثبت نشده", en: "City not recorded" },
        startDate: savedDate,
        endDate: savedDate,
        status: "archived",
        hallIds,
        notes: {
          fa: "این رویداد از نسخه قبلی فضای کاری بازیابی شده است.",
          en: "This event was recovered from the previous workspace format.",
        },
        color: "#198ba0",
      },
    ];
  }
  if (!Array.isArray(input.leads)) upgraded.leads = [];
  if (!Array.isArray(input.commercialAccounts)) upgraded.commercialAccounts = [];
  const timestamp = isIsoDate(input.lastSavedAt) ? input.lastSavedAt : "1970-01-01T00:00:00.000Z";
  const staffUsers = Array.isArray(input.staffUsers)
    ? (structuredClone(input.staffUsers) as StaffUser[])
    : makeDefaultStaffUsers(timestamp);
  upgraded.staffUsers = staffUsers;

  const companies = hadExhibitions && Array.isArray(input.companies)
    ? (structuredClone(input.companies) as CrmCompany[])
    : [];
  const companyByName = new Map<string, CrmCompany>();
  companies.forEach((company) => companyByName.set(company.name.trim().toLocaleLowerCase("en"), company));
  const ensureCompany = (companyName: string, ownerId: string): CrmCompany => {
    const key = companyName.trim().toLocaleLowerCase("en");
    const existing = companyByName.get(key);
    if (existing) return existing;
    const company: CrmCompany = {
      id: `company-${slugify(companyName)}`,
      name: companyName,
      legalName: companyName,
      industry: "",
      country: "",
      city: "",
      website: "",
      lifecycle: "prospect",
      priority: "normal",
      tags: [],
      ownerIds: ownerId ? [ownerId] : [],
      contacts: [],
      participations: [],
      activities: [],
      notes: "",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    companyByName.set(key, company);
    companies.push(company);
    return company;
  };

  const leads = Array.isArray(upgraded.leads) ? upgraded.leads : [];
  leads.forEach((value) => {
    if (!isRecord(value) || !isNonEmptyString(value.company) || !isNonEmptyString(value.exhibitionId)) return;
    const ownerId = isNonEmptyString(value.ownerId) ? value.ownerId : ownerIdForName(staffUsers, value.owner);
    const company = isNonEmptyString(value.companyId)
      ? companies.find((item) => item.id === value.companyId) ?? ensureCompany(value.company, ownerId)
      : ensureCompany(value.company, ownerId);
    value.companyId = company.id;
    value.ownerId = ownerId;
    if (!Array.isArray(value.collaborators)) value.collaborators = [];
    if (!isNonEmptyString(value.priority)) value.priority = "normal";
    if (typeof value.probability !== "number" || !Number.isFinite(value.probability)) value.probability = 10;
    if (!Array.isArray(value.requestedServices)) value.requestedServices = [];
    if (!isNonEmptyString(value.preferredChannel)) value.preferredChannel = "phone";
    if (!isNonEmptyString(value.consentStatus)) value.consentStatus = "unknown";
    if (!company.ownerIds.includes(ownerId)) company.ownerIds.push(ownerId);
    if (isNonEmptyString(value.contactName) && !company.contacts.some((contact) => contact.name === value.contactName)) {
      company.contacts.push({
        id: `contact-${slugify(company.id)}-${company.contacts.length + 1}`,
        name: value.contactName,
        title: "",
        phone: "",
        email: "",
        preferredChannel: value.preferredChannel as "phone" | "email" | "messaging" | "meeting",
        preferredLanguage: "fa",
        consentStatus: value.consentStatus as "unknown" | "granted" | "declined",
        primary: company.contacts.length === 0,
      });
    }
    if (!company.participations.some((participation) => participation.leadId === value.id || participation.exhibitionId === value.exhibitionId)) {
      company.participations.push({
        id: `participation-${slugify(company.id)}-${slugify(value.exhibitionId)}`,
        exhibitionId: value.exhibitionId,
        leadId: isNonEmptyString(value.id) ? value.id : undefined,
        status: value.stage === "won" ? "confirmed" : value.stage === "lost" ? "cancelled" : "negotiating",
        expectedArea: isFiniteNumber(value.expectedArea) ? value.expectedArea : 0,
        requestedServices: Array.isArray(value.requestedServices) ? value.requestedServices.filter((item): item is string => typeof item === "string") : [],
        ownerIds: [ownerId],
        createdAt: isIsoDate(value.createdAt) ? value.createdAt : timestamp,
        updatedAt: isIsoDate(value.updatedAt) ? value.updatedAt : timestamp,
      });
    }
  });

  const accounts = Array.isArray(upgraded.commercialAccounts) ? upgraded.commercialAccounts : [];
  accounts.forEach((value) => {
    if (!isRecord(value) || !isNonEmptyString(value.company) || !isNonEmptyString(value.exhibitionId)) return;
    const ownerId = staffUsers.find((staff) => staff.departments.includes("finance"))?.id ?? staffUsers[0]?.id ?? "";
    const company = ensureCompany(value.company, ownerId);
    if (!company.participations.some((participation) => participation.exhibitionId === value.exhibitionId)) {
      company.participations.push({
        id: `participation-${slugify(company.id)}-${slugify(value.exhibitionId)}`,
        exhibitionId: value.exhibitionId,
        boothId: isNonEmptyString(value.boothId) ? value.boothId : undefined,
        status: "contracted",
        expectedArea: 0,
        requestedServices: [],
        ownerIds: ownerId ? [ownerId] : [],
        createdAt: timestamp,
        updatedAt: isIsoDate(value.updatedAt) ? value.updatedAt : timestamp,
      });
    }
  });
  upgraded.companies = companies;
  upgraded.version = Math.max(3, Number(input.version) || 1);
  return upgraded;
}

export function getActiveExhibition(state: PortalState): Exhibition | undefined {
  return (
    state.exhibitions.find((exhibition) => exhibition.id === state.activeExhibitionId) ??
    state.exhibitions[0]
  );
}

export function getExhibitionHalls(
  state: PortalState,
  exhibitionId = state.activeExhibitionId,
): Hall[] {
  const exhibition = state.exhibitions.find((item) => item.id === exhibitionId);
  if (!exhibition) return [];
  const hallIds = new Set(exhibition.hallIds);
  return state.halls.filter((hall) => hallIds.has(hall.id));
}

export function formatIstanbulDateTime(
  value: string | number | Date,
  locale: PortalLocale = "en",
): string {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new RangeError("A valid date is required.");
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const year = read("year");
  const monthIndex = Number(read("month")) - 1;
  const day = String(Number(read("day")));
  const time = `${read("hour")}:${read("minute")}`;

  if (locale === "fa") {
    const month = FA_MONTHS[monthIndex] ?? "";
    return toPersianDigits(`${day} ${month} ${year}، ${time} به وقت استانبول`);
  }

  const month = EN_MONTHS[monthIndex] ?? "";
  return `${day} ${month} ${year}, ${time} Istanbul`;
}

export const formatIstanbulDate = formatIstanbulDateTime;

export function getActiveHall(state: PortalState): Hall | undefined {
  return state.halls.find((hall) => hall.id === state.activeHallId);
}

export function findHallContainingBooth(
  state: PortalState,
  boothId: string,
): Hall | undefined {
  return state.halls.find((hall) => hall.booths.some((booth) => booth.id === boothId));
}

type HallGeometryScale = Pick<Hall, "width" | "height" | "physicalWidth" | "physicalHeight">;

export type MetricDimensions = {
  widthMeters: number;
  depthMeters: number;
  areaSquareMeters: number;
};

function assertPositiveGeometry(values: number[]) {
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new RangeError("Hall and item dimensions must be positive finite numbers.");
  }
}

export function calculateMetricDimensionsFromGeometry(
  hall: HallGeometryScale,
  width: number,
  height: number,
): MetricDimensions {
  assertPositiveGeometry([
    hall.width,
    hall.height,
    hall.physicalWidth,
    hall.physicalHeight,
    width,
    height,
  ]);
  const widthMeters = width * (hall.physicalWidth / hall.width);
  const depthMeters = height * (hall.physicalHeight / hall.height);
  return {
    widthMeters,
    depthMeters,
    areaSquareMeters: Math.round(widthMeters * depthMeters * 100) / 100,
  };
}

export function calculateGeometryFromMetricDimensions(
  hall: HallGeometryScale,
  widthMeters: number,
  depthMeters: number,
) {
  assertPositiveGeometry([
    hall.width,
    hall.height,
    hall.physicalWidth,
    hall.physicalHeight,
    widthMeters,
    depthMeters,
  ]);
  return {
    width: widthMeters * (hall.width / hall.physicalWidth),
    height: depthMeters * (hall.height / hall.physicalHeight),
  };
}

export function calculateDimensionsForTargetArea(
  areaSquareMeters: number,
  aspectRatio = 1,
) {
  assertPositiveGeometry([areaSquareMeters, aspectRatio]);
  const widthMeters = Math.sqrt(areaSquareMeters * aspectRatio);
  return {
    widthMeters,
    depthMeters: areaSquareMeters / widthMeters,
  };
}

export function parseMetricDimensionExpression(value: string) {
  const normalized = value
    .trim()
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replaceAll("٫", ".")
    .replaceAll("٬", "")
    .replace(/\s+/g, " ");
  const match = normalized.match(
    /^(\d+(?:[.,]\d+)?)\s*(?:x|×|\*|by|در)\s*(\d+(?:[.,]\d+)?)$/i,
  );
  if (!match) return null;
  const widthMeters = Number(match[1].replace(",", "."));
  const depthMeters = Number(match[2].replace(",", "."));
  if (![widthMeters, depthMeters].every((number) => Number.isFinite(number) && number > 0)) {
    return null;
  }
  return { widthMeters, depthMeters };
}

export function calculateBoothAreaFromGeometry(
  hall: HallGeometryScale,
  width: number,
  height: number,
): number {
  return calculateMetricDimensionsFromGeometry(hall, width, height).areaSquareMeters;
}

function countBy<T extends string>(values: readonly T[], keys: readonly T[]): Record<T, number> {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
  for (const value of values) counts[value] += 1;
  return counts;
}

export function calculatePortalMetrics(
  state: PortalState,
  referenceAt: string | number | Date = state.lastSavedAt,
): PortalMetrics {
  const booths = state.halls.flatMap((hall) => hall.booths);
  const equipment = booths.flatMap((booth) => booth.equipment);
  const boothStatuses = countBy(
    booths.map((booth) => booth.status),
    BOOTH_STATUSES,
  );
  const equipmentStages = countBy(
    equipment.map((line) => line.stage),
    EQUIPMENT_STAGES,
  );
  const allocatableBoothCount = booths.length - boothStatuses.blocked;
  const bookedBoothCount =
    boothStatuses.reserved + boothStatuses.confirmed + boothStatuses.paid;
  const referenceTime = new Date(referenceAt).getTime();
  if (!Number.isFinite(referenceTime)) throw new RangeError("A valid metrics reference date is required.");

  return {
    hallCount: state.halls.length,
    boothCount: booths.length,
    allocatableBoothCount,
    bookedBoothCount,
    occupancyPercent:
      allocatableBoothCount === 0
        ? 0
        : Math.round((bookedBoothCount / allocatableBoothCount) * 1_000) / 10,
    boothStatuses,
    equipmentLineCount: equipment.length,
    equipmentUnitCount: equipment.reduce((total, line) => total + line.quantity, 0),
    equipmentStages,
    openTaskCount: state.tasks.filter((task) => task.status !== "done").length,
    overdueTaskCount: state.tasks.filter(
      (task) => task.status !== "done" && Date.parse(task.dueAt) < referenceTime,
    ).length,
  };
}

export const getPortalMetrics = calculatePortalMetrics;

export function detachTasksFromMissingBooths(
  tasks: readonly PortalTask[],
  validBoothIds: Iterable<string>,
): PortalTask[] {
  const validIds = new Set(validBoothIds);
  return tasks.map((task) =>
    task.boothId && !validIds.has(task.boothId)
      ? { ...task, boothId: undefined }
      : { ...task },
  );
}

export function prependAuditEvent(
  events: readonly AuditEvent[],
  event: AuditEvent,
  limit = 120,
): AuditEvent[] {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("Audit history limit must be a positive integer.");
  }
  return [event, ...events].slice(0, limit);
}

export function advanceEquipmentStage(
  stage: EquipmentStage,
  steps = 1,
): EquipmentStage {
  if (!Number.isInteger(steps) || steps < 0) {
    throw new RangeError("Stage steps must be a non-negative integer.");
  }
  if (stage === "issue") return stage;
  const currentIndex = equipmentStageOrder.indexOf(stage);
  if (currentIndex < 0) throw new RangeError(`Unknown equipment stage: ${stage}`);
  return equipmentStageOrder[
    Math.min(currentIndex + steps, equipmentStageOrder.length - 1)
  ];
}

export function getNextEquipmentLineStage(
  line: Pick<EquipmentLine, "stage" | "returnable">,
): EquipmentStage {
  if (line.stage === "issue") return "issue";
  if (line.stage === "collected") return "collected";
  if (line.stage === "delivered") return line.returnable ? "collected" : "delivered";
  const currentIndex = equipmentStageOrder.indexOf(line.stage);
  if (currentIndex < 0) throw new RangeError(`Unknown equipment stage: ${line.stage}`);
  return equipmentStageOrder[Math.min(currentIndex + 1, equipmentStageOrder.indexOf("delivered"))];
}

function validateEquipmentLine(
  value: unknown,
  path: string,
  catalogIds: Set<string> | null,
  errors: string[],
) {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`);
    return;
  }
  if (!isNonEmptyString(value.id)) errors.push(`${path}.id is required.`);
  if (!isNonEmptyString(value.catalogItemId)) {
    errors.push(`${path}.catalogItemId is required.`);
  } else if (catalogIds && !catalogIds.has(value.catalogItemId)) {
    errors.push(`${path}.catalogItemId does not exist in the catalog.`);
  }
  if (!isLocalizedText(value.name)) errors.push(`${path}.name must include fa and en.`);
  if (!Number.isInteger(value.quantity) || Number(value.quantity) <= 0) {
    errors.push(`${path}.quantity must be a positive integer.`);
  }
  if (
    value.collectedQuantity !== undefined &&
    (!Number.isInteger(value.collectedQuantity) ||
      Number(value.collectedQuantity) < 0 ||
      (Number.isInteger(value.quantity) && Number(value.collectedQuantity) > Number(value.quantity)))
  ) {
    errors.push(`${path}.collectedQuantity must be an integer between zero and quantity.`);
  }
  if (!EQUIPMENT_STAGES.includes(value.stage as EquipmentStage)) {
    errors.push(`${path}.stage is invalid.`);
  }
  if (
    value.stageBeforeIssue !== undefined &&
    !equipmentStageOrder.includes(value.stageBeforeIssue as Exclude<EquipmentStage, "issue">)
  ) {
    errors.push(`${path}.stageBeforeIssue is invalid.`);
  }
  if (value.stage !== "issue" && value.stageBeforeIssue !== undefined) {
    errors.push(`${path}.stageBeforeIssue is only allowed while an issue is open.`);
  }
  if (typeof value.returnable !== "boolean") errors.push(`${path}.returnable must be boolean.`);
  if (typeof value.deliveryWindow !== "string") errors.push(`${path}.deliveryWindow must be a string.`);
  if (typeof value.pickupWindow !== "string") errors.push(`${path}.pickupWindow must be a string.`);
  if (typeof value.notes !== "string") errors.push(`${path}.notes must be a string.`);
  if (!isIsoDate(value.updatedAt)) errors.push(`${path}.updatedAt must be a valid date.`);
}

export function validatePortalSnapshot(
  input: unknown,
  catalog?: readonly CatalogItem[],
): SnapshotValidationResult {
  const errors: string[] = [];
  if (!isRecord(input)) return { valid: false, errors: ["Snapshot must be an object."] };

  if (!Number.isInteger(input.version) || Number(input.version) < 1) {
    errors.push("version must be a positive integer.");
  }
  if (!isLocalizedText(input.eventName)) errors.push("eventName must include fa and en.");
  if (input.eventStatus !== "archived-template") {
    errors.push("eventStatus must be archived-template.");
  }
  if (!isNonEmptyString(input.activeExhibitionId)) {
    errors.push("activeExhibitionId is required.");
  }
  if (!isNonEmptyString(input.activeHallId)) errors.push("activeHallId is required.");
  if (!isIsoDate(input.lastSavedAt)) errors.push("lastSavedAt must be a valid date.");
  if (!Array.isArray(input.exhibitions) || input.exhibitions.length === 0) {
    errors.push("exhibitions must be a non-empty array.");
  }
  if (!Array.isArray(input.halls)) errors.push("halls must be an array.");
  if (!Array.isArray(input.companies)) errors.push("companies must be an array.");
  if (!Array.isArray(input.staffUsers)) errors.push("staffUsers must be an array.");
  if (!Array.isArray(input.leads)) errors.push("leads must be an array.");
  if (!Array.isArray(input.commercialAccounts)) errors.push("commercialAccounts must be an array.");
  if (!Array.isArray(input.tasks)) errors.push("tasks must be an array.");
  if (!Array.isArray(input.audit)) errors.push("audit must be an array.");

  const catalogIds = catalog ? new Set(catalog.map((item) => item.id)) : null;
  const hallIds = new Set<string>();
  const boothIds = new Set<string>();
  const equipmentIds = new Set<string>();
  if (Array.isArray(input.halls)) {
    input.halls.forEach((hallValue, hallIndex) => {
      const path = `halls[${hallIndex}]`;
      if (!isRecord(hallValue)) {
        errors.push(`${path} must be an object.`);
        return;
      }
      if (!isNonEmptyString(hallValue.id)) errors.push(`${path}.id is required.`);
      else if (hallIds.has(hallValue.id)) errors.push(`${path}.id must be unique.`);
      else hallIds.add(hallValue.id);
      if (!isLocalizedText(hallValue.name)) errors.push(`${path}.name must include fa and en.`);
      for (const key of ["width", "height", "physicalWidth", "physicalHeight"] as const) {
        if (!isFiniteNumber(hallValue[key]) || Number(hallValue[key]) <= 0) {
          errors.push(`${path}.${key} must be positive.`);
        }
      }
      if (hallValue.unit !== "m") errors.push(`${path}.unit must be m.`);
      if (!Array.isArray(hallValue.booths)) errors.push(`${path}.booths must be an array.`);
      if (!Array.isArray(hallValue.features)) errors.push(`${path}.features must be an array.`);

      const boothCodes = new Set<string>();
      if (Array.isArray(hallValue.booths)) {
        hallValue.booths.forEach((boothValue, boothIndex) => {
          const boothPath = `${path}.booths[${boothIndex}]`;
          if (!isRecord(boothValue)) {
            errors.push(`${boothPath} must be an object.`);
            return;
          }
          if (!isNonEmptyString(boothValue.id)) errors.push(`${boothPath}.id is required.`);
          else if (boothIds.has(boothValue.id)) errors.push(`${boothPath}.id must be globally unique.`);
          else boothIds.add(boothValue.id);
          if (!isNonEmptyString(boothValue.code)) errors.push(`${boothPath}.code is required.`);
          else if (boothCodes.has(boothValue.code)) errors.push(`${boothPath}.code must be unique in its hall.`);
          else boothCodes.add(boothValue.code);
          for (const key of ["x", "y"] as const) {
            if (!isFiniteNumber(boothValue[key]) || Number(boothValue[key]) < 0) {
              errors.push(`${boothPath}.${key} cannot be negative.`);
            }
          }
          for (const key of ["width", "height", "area"] as const) {
            if (!isFiniteNumber(boothValue[key]) || Number(boothValue[key]) <= 0) {
              errors.push(`${boothPath}.${key} must be positive.`);
            }
          }
          if (
            isFiniteNumber(boothValue.x) &&
            isFiniteNumber(boothValue.width) &&
            isFiniteNumber(hallValue.width) &&
            boothValue.x + boothValue.width > hallValue.width
          ) errors.push(`${boothPath} exceeds the hall width.`);
          if (
            isFiniteNumber(boothValue.y) &&
            isFiniteNumber(boothValue.height) &&
            isFiniteNumber(hallValue.height) &&
            boothValue.y + boothValue.height > hallValue.height
          ) errors.push(`${boothPath} exceeds the hall height.`);
          if (!BOOTH_STATUSES.includes(boothValue.status as BoothStatus)) {
            errors.push(`${boothPath}.status is invalid.`);
          }
          if (boothValue.company !== null && typeof boothValue.company !== "string") {
            errors.push(`${boothPath}.company must be a string or null.`);
          }
          if (typeof boothValue.owner !== "string") errors.push(`${boothPath}.owner must be a string.`);
          if (typeof boothValue.notes !== "string") errors.push(`${boothPath}.notes must be a string.`);
          if (!isNonEmptyString(boothValue.zone)) errors.push(`${boothPath}.zone is required.`);
          if (!isIsoDate(boothValue.updatedAt)) errors.push(`${boothPath}.updatedAt must be a valid date.`);
          if (!Array.isArray(boothValue.equipment)) errors.push(`${boothPath}.equipment must be an array.`);
          else boothValue.equipment.forEach((line, lineIndex) => {
            const linePath = `${boothPath}.equipment[${lineIndex}]`;
            if (isRecord(line) && isNonEmptyString(line.id)) {
              if (equipmentIds.has(line.id)) errors.push(`${linePath}.id must be globally unique.`);
              else equipmentIds.add(line.id);
            }
            validateEquipmentLine(line, linePath, catalogIds, errors);
          });
        });
      }

      const featureIds = new Set<string>();
      if (Array.isArray(hallValue.features)) {
        hallValue.features.forEach((featureValue, featureIndex) => {
          const featurePath = `${path}.features[${featureIndex}]`;
          if (!isRecord(featureValue)) {
            errors.push(`${featurePath} must be an object.`);
            return;
          }
          if (!isNonEmptyString(featureValue.id)) errors.push(`${featurePath}.id is required.`);
          else if (featureIds.has(featureValue.id)) errors.push(`${featurePath}.id must be unique.`);
          else featureIds.add(featureValue.id);
          if (!HALL_FEATURE_KINDS.includes(featureValue.kind as HallFeatureKind)) {
            errors.push(`${featurePath}.kind is invalid.`);
          }
          for (const key of ["x", "y"] as const) {
            if (!isFiniteNumber(featureValue[key]) || Number(featureValue[key]) < 0) {
              errors.push(`${featurePath}.${key} must be non-negative.`);
            }
          }
          for (const key of ["width", "height"] as const) {
            if (!isFiniteNumber(featureValue[key]) || Number(featureValue[key]) <= 0) {
              errors.push(`${featurePath}.${key} must be positive.`);
            }
          }
          if (
            isFiniteNumber(featureValue.x) &&
            isFiniteNumber(featureValue.width) &&
            isFiniteNumber(hallValue.width) &&
            featureValue.x + featureValue.width > hallValue.width
          ) errors.push(`${featurePath} exceeds the hall width.`);
          if (
            isFiniteNumber(featureValue.y) &&
            isFiniteNumber(featureValue.height) &&
            isFiniteNumber(hallValue.height) &&
            featureValue.y + featureValue.height > hallValue.height
          ) errors.push(`${featurePath} exceeds the hall height.`);
          if (!isLocalizedText(featureValue.label)) errors.push(`${featurePath}.label must include fa and en.`);
          if (featureValue.rotation !== undefined && !isFiniteNumber(featureValue.rotation)) {
            errors.push(`${featurePath}.rotation must be finite.`);
          }
        });
      }
    });
  }

  const exhibitionIds = new Set<string>();
  const assignedHallIds = new Set<string>();
  const exhibitionHallIds = new Map<string, Set<string>>();
  if (Array.isArray(input.exhibitions)) {
    input.exhibitions.forEach((exhibitionValue, exhibitionIndex) => {
      const path = `exhibitions[${exhibitionIndex}]`;
      if (!isRecord(exhibitionValue)) {
        errors.push(`${path} must be an object.`);
        return;
      }
      if (!isNonEmptyString(exhibitionValue.id)) errors.push(`${path}.id is required.`);
      else if (exhibitionIds.has(exhibitionValue.id)) errors.push(`${path}.id must be unique.`);
      else exhibitionIds.add(exhibitionValue.id);
      if (!isLocalizedText(exhibitionValue.name)) errors.push(`${path}.name must include fa and en.`);
      if (!isLocalizedText(exhibitionValue.venue)) errors.push(`${path}.venue must include fa and en.`);
      if (!isLocalizedText(exhibitionValue.city)) errors.push(`${path}.city must include fa and en.`);
      if (!isLocalizedText(exhibitionValue.notes)) errors.push(`${path}.notes must include fa and en.`);
      if (!isIsoDate(exhibitionValue.startDate)) errors.push(`${path}.startDate must be a valid date.`);
      if (!isIsoDate(exhibitionValue.endDate)) errors.push(`${path}.endDate must be a valid date.`);
      if (
        isIsoDate(exhibitionValue.startDate) &&
        isIsoDate(exhibitionValue.endDate) &&
        new Date(exhibitionValue.endDate).getTime() < new Date(exhibitionValue.startDate).getTime()
      ) {
        errors.push(`${path}.endDate cannot be before startDate.`);
      }
      if (!EXHIBITION_STATUSES.includes(exhibitionValue.status as ExhibitionStatus)) {
        errors.push(`${path}.status is invalid.`);
      }
      if (!isNonEmptyString(exhibitionValue.color) || !/^#[0-9a-f]{6}$/i.test(exhibitionValue.color)) {
        errors.push(`${path}.color must be a six-digit hex color.`);
      }
      if (!Array.isArray(exhibitionValue.hallIds) || exhibitionValue.hallIds.length === 0) {
        errors.push(`${path}.hallIds must be a non-empty array.`);
        return;
      }
      const ownHallIds = new Set<string>();
      exhibitionValue.hallIds.forEach((hallId, hallIndex) => {
        const hallPath = `${path}.hallIds[${hallIndex}]`;
        if (!isNonEmptyString(hallId)) {
          errors.push(`${hallPath} must be a hall id.`);
          return;
        }
        if (ownHallIds.has(hallId)) errors.push(`${hallPath} must be unique in its exhibition.`);
        ownHallIds.add(hallId);
        if (!hallIds.has(hallId)) errors.push(`${hallPath} must reference an existing hall.`);
        if (assignedHallIds.has(hallId)) {
          errors.push(`${hallPath} cannot belong to more than one exhibition.`);
        }
        assignedHallIds.add(hallId);
      });
      if (isNonEmptyString(exhibitionValue.id)) {
        exhibitionHallIds.set(exhibitionValue.id, ownHallIds);
      }
    });
  }

  hallIds.forEach((hallId) => {
    if (!assignedHallIds.has(hallId)) {
      errors.push(`Hall ${hallId} must belong to an exhibition.`);
    }
  });

  if (
    isNonEmptyString(input.activeExhibitionId) &&
    !exhibitionIds.has(input.activeExhibitionId)
  ) {
    errors.push("activeExhibitionId must reference an existing exhibition.");
  }

  if (isNonEmptyString(input.activeHallId) && !hallIds.has(input.activeHallId)) {
    errors.push("activeHallId must reference an existing hall.");
  }
  if (
    isNonEmptyString(input.activeExhibitionId) &&
    isNonEmptyString(input.activeHallId) &&
    exhibitionIds.has(input.activeExhibitionId) &&
    !exhibitionHallIds.get(input.activeExhibitionId)?.has(input.activeHallId)
  ) {
    errors.push("activeHallId must belong to the active exhibition.");
  }

  const boothExhibitions = new Map<string, string>();
  if (Array.isArray(input.exhibitions) && Array.isArray(input.halls)) {
    const exhibitionValues = input.exhibitions;
    const hallValues = input.halls;
    exhibitionValues.forEach((exhibitionValue) => {
      if (!isRecord(exhibitionValue) || !isNonEmptyString(exhibitionValue.id) || !Array.isArray(exhibitionValue.hallIds)) return;
      const exhibitionId = exhibitionValue.id;
      const ownHallIds = new Set<string>(exhibitionValue.hallIds.filter(isNonEmptyString));
      hallValues.forEach((hallValue) => {
        if (!isRecord(hallValue) || !isNonEmptyString(hallValue.id) || !ownHallIds.has(hallValue.id) || !Array.isArray(hallValue.booths)) return;
        hallValue.booths.forEach((boothValue) => {
          if (isRecord(boothValue) && isNonEmptyString(boothValue.id)) {
            boothExhibitions.set(boothValue.id, exhibitionId);
          }
        });
      });
    });
  }
  errors.push(
    ...validateCommercialRecords(
      input.leads,
      input.commercialAccounts,
      exhibitionIds,
      boothExhibitions,
    ),
  );
  errors.push(
    ...validateCrmDirectoryRecords(
      input.companies,
      input.staffUsers,
      input.leads,
      exhibitionIds,
    ),
  );

  if (Array.isArray(input.tasks)) {
    const taskIds = new Set<string>();
    input.tasks.forEach((task, index) => {
      const path = `tasks[${index}]`;
      if (!isRecord(task)) return errors.push(`${path} must be an object.`);
      if (!isNonEmptyString(task.id)) errors.push(`${path}.id is required.`);
      else if (taskIds.has(task.id)) errors.push(`${path}.id must be unique.`);
      else taskIds.add(task.id);
      if (!isLocalizedText(task.title)) errors.push(`${path}.title must include fa and en.`);
      if (!isNonEmptyString(task.owner)) errors.push(`${path}.owner is required.`);
      if (!isIsoDate(task.dueAt)) errors.push(`${path}.dueAt must be a valid date.`);
      if (!["open", "in-progress", "done"].includes(String(task.status))) errors.push(`${path}.status is invalid.`);
      if (!["high", "medium", "low"].includes(String(task.priority))) errors.push(`${path}.priority is invalid.`);
      if (typeof task.notes !== "string") errors.push(`${path}.notes must be a string.`);
      if (task.boothId !== undefined && (!isNonEmptyString(task.boothId) || !boothIds.has(task.boothId))) {
        errors.push(`${path}.boothId must reference an existing booth.`);
      }
    });
  }

  if (Array.isArray(input.audit)) {
    const auditIds = new Set<string>();
    input.audit.forEach((event, index) => {
      const path = `audit[${index}]`;
      if (!isRecord(event)) return errors.push(`${path} must be an object.`);
      for (const key of ["id", "action", "entityType", "entityId", "actor"] as const) {
        if (!isNonEmptyString(event[key])) errors.push(`${path}.${key} is required.`);
      }
      if (isNonEmptyString(event.id)) {
        if (auditIds.has(event.id)) errors.push(`${path}.id must be unique.`);
        else auditIds.add(event.id);
      }
      if (!isLocalizedText(event.summary)) errors.push(`${path}.summary must include fa and en.`);
      if (!isIsoDate(event.timestamp)) errors.push(`${path}.timestamp must be a valid date.`);
    });
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, errors: [], value: input as PortalState };
}

function parseCsvRows(csv: string): { rows: string[][]; error?: string } {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"' && cell.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && csv[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (quoted) return { rows: [], error: "CSV contains an unclosed quoted cell." };
  row.push(cell);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return { rows };
}

function normalizeBoothStatus(value: string): BoothStatus | undefined {
  const normalized = value.trim().toLowerCase().replace(/[\s_]+/g, "-");
  return BOOTH_STATUSES.find((status) => status === normalized);
}

export function importBoothsFromCsv(
  csv: string,
  options: { idPrefix?: string; updatedAt?: string } = {},
): CsvBoothImportResult {
  const parsed = parseCsvRows(csv.replace(/^\uFEFF/, ""));
  if (parsed.error) return { booths: [], errors: [{ row: 1, message: parsed.error }] };
  if (parsed.rows.length === 0) return { booths: [], errors: [{ row: 1, message: "CSV is empty." }] };

  const headers = parsed.rows[0].map((header) => header.trim().toLowerCase());
  const requiredHeaders = ["code", "x", "y", "width", "height", "area"];
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    return {
      booths: [],
      errors: [{ row: 1, message: `Missing required columns: ${missingHeaders.join(", ")}.` }],
    };
  }

  const read = (cells: string[], name: string) => {
    const index = headers.indexOf(name);
    return index < 0 ? "" : (cells[index] ?? "").trim();
  };
  const updatedAt = options.updatedAt ?? "1970-01-01T00:00:00.000Z";
  if (!isIsoDate(updatedAt)) {
    return { booths: [], errors: [{ row: 1, message: "updatedAt must be a valid date." }] };
  }

  const booths: Booth[] = [];
  const errors: CsvBoothImportError[] = [];
  const codes = new Set<string>();
  parsed.rows.slice(1).forEach((cells, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const code = read(cells, "code");
    const numberFields = Object.fromEntries(
      ["x", "y", "width", "height", "area"].map((key) => [key, Number(read(cells, key))]),
    ) as Record<"x" | "y" | "width" | "height" | "area", number>;
    const rowErrors: string[] = [];
    if (!code) rowErrors.push("code is required");
    if (codes.has(code)) rowErrors.push("code is duplicated");
    for (const key of ["x", "y"] as const) {
      if (!Number.isFinite(numberFields[key]) || numberFields[key] < 0) rowErrors.push(`${key} must be non-negative`);
    }
    for (const key of ["width", "height", "area"] as const) {
      if (!Number.isFinite(numberFields[key]) || numberFields[key] <= 0) rowErrors.push(`${key} must be positive`);
    }
    const rawStatus = read(cells, "status");
    const status = rawStatus ? normalizeBoothStatus(rawStatus) : "available";
    if (!status) rowErrors.push("status is invalid");

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, message: `${rowErrors.join("; ")}.` });
      return;
    }

    codes.add(code);
    const companyFa = read(cells, "company_fa");
    const companyEn = read(cells, "company_en");
    const company = read(cells, "company");
    booths.push({
      id: `${options.idPrefix ?? "csv-booth"}-${slugify(code)}-${rowNumber}`,
      code,
      ...numberFields,
      status: status ?? "available",
      company: company || companyEn || companyFa || null,
      owner: read(cells, "owner"),
      notes: read(cells, "notes"),
      equipment: [],
      zone: read(cells, "zone") || "unassigned",
      updatedAt,
    });
  });

  return { booths, errors };
}

export const importBoothsCsv = importBoothsFromCsv;

export function exportPublicSafeHall(hall: Hall): PublicHall {
  return {
    id: hall.id,
    name: structuredClone(hall.name),
    width: hall.width,
    height: hall.height,
    physicalWidth: hall.physicalWidth,
    physicalHeight: hall.physicalHeight,
    unit: hall.unit,
    features: hall.features.map((feature) => ({
      id: feature.id,
      kind: feature.kind,
      x: feature.x,
      y: feature.y,
      width: feature.width,
      height: feature.height,
      label: structuredClone(feature.label),
      ...(feature.rotation === undefined ? {} : { rotation: feature.rotation }),
    })),
    booths: hall.booths.map((booth) => ({
      id: booth.id,
      code: booth.code,
      x: booth.x,
      y: booth.y,
      width: booth.width,
      height: booth.height,
      area: booth.area,
      occupancy:
        booth.status === "available"
          ? "available"
          : booth.status === "blocked"
            ? "unavailable"
            : "occupied",
      zone: booth.zone,
    })),
  };
}

export const exportPublicHall = exportPublicSafeHall;
export const makePublicHallExport = exportPublicSafeHall;

export const formatPortalDate = formatIstanbulDateTime;

export function parseBoothCsv(csv: string, _hall?: Hall) {
  void _hall;
  const result = importBoothsFromCsv(csv);
  return {
    booths: result.booths,
    warnings: result.errors.map((error) => `Row ${error.row}: ${error.message}`),
  };
}

export function createAuditEvent(input: Omit<AuditEvent, "id"> & { id?: string }): AuditEvent {
  for (const [name, value] of Object.entries({
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    actor: input.actor,
  })) {
    if (!isNonEmptyString(value)) throw new TypeError(`${name} is required.`);
  }
  if (!isLocalizedText(input.summary)) throw new TypeError("summary must include fa and en.");
  if (!isIsoDate(input.timestamp)) throw new RangeError("timestamp must be a valid date.");

  return {
    id:
      input.id ??
      `audit-${input.timestamp.replace(/\D/g, "").slice(0, 14)}-${slugify(input.entityType)}-${slugify(input.entityId)}-${slugify(input.action)}`,
    action: input.action.trim(),
    entityType: input.entityType.trim(),
    entityId: input.entityId.trim(),
    actor: input.actor.trim(),
    summary: structuredClone(input.summary),
    timestamp: new Date(input.timestamp).toISOString(),
  };
}
