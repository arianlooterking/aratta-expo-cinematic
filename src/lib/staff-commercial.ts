export type LeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type CommercialCurrency = "IRT" | "USD" | "EUR";
export type InteractionKind = "call" | "email" | "meeting" | "note";
export type CompanyLifecycle = "prospect" | "active" | "returning" | "dormant" | "archived";
export type CompanyPriority = "low" | "normal" | "high" | "strategic";
export type ParticipationStatus =
  | "prospect"
  | "negotiating"
  | "contracted"
  | "confirmed"
  | "completed"
  | "cancelled";
export type StaffAccessRole = "owner" | "admin" | "manager" | "member" | "viewer";
export type StaffDepartment =
  | "executive"
  | "sales"
  | "operations"
  | "finance"
  | "logistics"
  | "marketing"
  | "compliance";
export type StaffStatus = "active" | "away" | "invited" | "inactive";
export type AssignmentPermission = "lead" | "edit" | "comment" | "view";

export type LeadInteraction = {
  id: string;
  kind: InteractionKind;
  occurredAt: string;
  owner: string;
  summary: string;
};

export type CompanyContact = {
  id: string;
  name: string;
  title: string;
  phone: string;
  email: string;
  preferredChannel: "phone" | "email" | "messaging" | "meeting";
  preferredLanguage: "fa" | "en" | "ar" | "other";
  consentStatus: "unknown" | "granted" | "declined";
  primary: boolean;
};

export type CompanyParticipation = {
  id: string;
  exhibitionId: string;
  leadId?: string;
  boothId?: string;
  status: ParticipationStatus;
  expectedArea: number;
  requestedServices: string[];
  ownerIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type CrmActivity = {
  id: string;
  kind: InteractionKind | "stage" | "assignment" | "participation";
  ownerId: string;
  summary: string;
  occurredAt: string;
  leadId?: string;
  exhibitionId?: string;
};

export type CrmCompany = {
  id: string;
  name: string;
  legalName: string;
  industry: string;
  country: string;
  city: string;
  website: string;
  lifecycle: CompanyLifecycle;
  priority: CompanyPriority;
  tags: string[];
  ownerIds: string[];
  contacts: CompanyContact[];
  participations: CompanyParticipation[];
  activities: CrmActivity[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffUser = {
  id: string;
  displayName: string;
  title: string;
  accessRole: StaffAccessRole;
  departments: StaffDepartment[];
  managerId?: string;
  status: StaffStatus;
  languages: Array<"fa" | "en" | "ar" | "tr">;
  email: string;
  phone: string;
  workloadCapacity: number;
  createdAt: string;
  updatedAt: string;
};

export type StaffAssignment = {
  staffUserId: string;
  role: StaffDepartment;
  permission: AssignmentPermission;
  responsibility: string;
};

export type SalesLead = {
  id: string;
  companyId: string;
  exhibitionId: string;
  company: string;
  contactName: string;
  contactChannel: string;
  source: string;
  stage: LeadStage;
  owner: string;
  ownerId: string;
  collaborators: StaffAssignment[];
  priority: CompanyPriority;
  probability: number;
  requestedServices: string[];
  preferredChannel: CompanyContact["preferredChannel"];
  consentStatus: CompanyContact["consentStatus"];
  quotedAmount: number;
  currency: CommercialCurrency;
  expectedArea: number;
  nextActionAt: string;
  notes: string;
  interactions: LeadInteraction[];
  createdAt: string;
  updatedAt: string;
};

export type PaymentEntry = {
  id: string;
  amount: number;
  paidAt: string;
  method: "bank" | "cash" | "card" | "other";
  reference: string;
  note: string;
  recordedBy: string;
  status: "recorded" | "voided";
};

export type CommercialCommunication = {
  id: string;
  kind: InteractionKind;
  occurredAt: string;
  owner: string;
  summary: string;
};

export type CommercialAccount = {
  id: string;
  exhibitionId: string;
  boothId?: string;
  company: string;
  contractValue: number;
  currency: CommercialCurrency;
  dueDate: string;
  exceptionApproved: boolean;
  exceptionReason: string;
  exceptionApprovedBy?: string;
  payments: PaymentEntry[];
  communications: CommercialCommunication[];
  updatedAt: string;
};

export type CommercialAccountTotals = {
  paid: number;
  outstanding: number;
  percentPaid: number;
};

export type HandoverDecision = {
  status: "eligible" | "exception" | "blocked";
  overdue: boolean;
  totals: CommercialAccountTotals;
};

export const leadStages: readonly LeadStage[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

export const commercialCurrencies: readonly CommercialCurrency[] = ["IRT", "USD", "EUR"];
export const interactionKinds: readonly InteractionKind[] = ["call", "email", "meeting", "note"];
export const companyLifecycles: readonly CompanyLifecycle[] = ["prospect", "active", "returning", "dormant", "archived"];
export const companyPriorities: readonly CompanyPriority[] = ["low", "normal", "high", "strategic"];
export const participationStatuses: readonly ParticipationStatus[] = ["prospect", "negotiating", "contracted", "confirmed", "completed", "cancelled"];
export const staffAccessRoles: readonly StaffAccessRole[] = ["owner", "admin", "manager", "member", "viewer"];
export const staffDepartments: readonly StaffDepartment[] = ["executive", "sales", "operations", "finance", "logistics", "marketing", "compliance"];
export const staffStatuses: readonly StaffStatus[] = ["active", "away", "invited", "inactive"];

export function calculateCommercialAccount(account: CommercialAccount): CommercialAccountTotals {
  const paid = account.payments
    .filter((payment) => payment.status === "recorded")
    .reduce((total, payment) => total + payment.amount, 0);
  const outstanding = Math.max(0, account.contractValue - paid);
  const percentPaid = account.contractValue > 0
    ? Math.min(100, Math.round((paid / account.contractValue) * 100))
    : 0;
  return { paid, outstanding, percentPaid };
}

export function getHandoverDecision(
  account: CommercialAccount,
  asOf: string | number | Date = new Date(),
): HandoverDecision {
  const totals = calculateCommercialAccount(account);
  const instant = asOf instanceof Date ? asOf : new Date(asOf);
  if (!Number.isFinite(instant.getTime())) throw new RangeError("A valid handover date is required.");
  const due = new Date(`${account.dueDate}T23:59:59.999Z`);
  const overdue = totals.outstanding > 0 && instant.getTime() > due.getTime();
  if (totals.outstanding <= 0) return { status: "eligible", overdue, totals };
  if (account.exceptionApproved) return { status: "exception", overdue, totals };
  return { status: "blocked", overdue, totals };
}

export function getDefaultPaymentDueDate(exhibitionStartDate: string): string {
  const start = new Date(`${exhibitionStartDate}T00:00:00.000Z`);
  if (!Number.isFinite(start.getTime())) throw new RangeError("A valid exhibition start date is required.");
  start.setUTCDate(start.getUTCDate() - 1);
  return start.toISOString().slice(0, 10);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function validateCommercialRecords(
  leadsValue: unknown,
  accountsValue: unknown,
  exhibitionIds: ReadonlySet<string>,
  boothExhibitions: ReadonlyMap<string, string>,
): string[] {
  const errors: string[] = [];
  if (!Array.isArray(leadsValue)) errors.push("leads must be an array.");
  if (!Array.isArray(accountsValue)) errors.push("commercialAccounts must be an array.");

  if (Array.isArray(leadsValue)) {
    const ids = new Set<string>();
    leadsValue.forEach((value, index) => {
      const path = `leads[${index}]`;
      if (!isRecord(value)) return errors.push(`${path} must be an object.`);
      if (!isNonEmptyString(value.id)) errors.push(`${path}.id is required.`);
      else if (ids.has(value.id)) errors.push(`${path}.id must be unique.`);
      else ids.add(value.id);
      if (!isNonEmptyString(value.exhibitionId) || !exhibitionIds.has(value.exhibitionId)) {
        errors.push(`${path}.exhibitionId must reference an existing exhibition.`);
      }
      for (const key of ["company", "source", "owner", "contactName", "contactChannel"] as const) {
        if (typeof value[key] !== "string") errors.push(`${path}.${key} must be a string.`);
      }
      if (!isNonEmptyString(value.company)) errors.push(`${path}.company is required.`);
      if (!isNonEmptyString(value.companyId)) errors.push(`${path}.companyId is required.`);
      if (!isNonEmptyString(value.ownerId)) errors.push(`${path}.ownerId is required.`);
      if (!companyPriorities.includes(value.priority as CompanyPriority)) errors.push(`${path}.priority is invalid.`);
      if (typeof value.probability !== "number" || !Number.isFinite(value.probability) || value.probability < 0 || value.probability > 100) {
        errors.push(`${path}.probability must be between 0 and 100.`);
      }
      if (!Array.isArray(value.requestedServices) || value.requestedServices.some((item) => typeof item !== "string")) {
        errors.push(`${path}.requestedServices must be a string array.`);
      }
      if (!Array.isArray(value.collaborators)) errors.push(`${path}.collaborators must be an array.`);
      if (!["phone", "email", "messaging", "meeting"].includes(String(value.preferredChannel))) {
        errors.push(`${path}.preferredChannel is invalid.`);
      }
      if (!["unknown", "granted", "declined"].includes(String(value.consentStatus))) {
        errors.push(`${path}.consentStatus is invalid.`);
      }
      if (!leadStages.includes(value.stage as LeadStage)) errors.push(`${path}.stage is invalid.`);
      if (!commercialCurrencies.includes(value.currency as CommercialCurrency)) errors.push(`${path}.currency is invalid.`);
      if (!isNonNegativeNumber(value.quotedAmount)) errors.push(`${path}.quotedAmount must be non-negative.`);
      if (!isNonNegativeNumber(value.expectedArea)) errors.push(`${path}.expectedArea must be non-negative.`);
      if (!isDate(value.nextActionAt)) errors.push(`${path}.nextActionAt must be a valid date.`);
      if (!isDate(value.createdAt)) errors.push(`${path}.createdAt must be a valid date.`);
      if (!isDate(value.updatedAt)) errors.push(`${path}.updatedAt must be a valid date.`);
      if (typeof value.notes !== "string") errors.push(`${path}.notes must be a string.`);
      if (!Array.isArray(value.interactions)) errors.push(`${path}.interactions must be an array.`);
      else validateInteractions(value.interactions, `${path}.interactions`, errors);
    });
  }

  if (Array.isArray(accountsValue)) {
    const ids = new Set<string>();
    const paymentIds = new Set<string>();
    accountsValue.forEach((value, index) => {
      const path = `commercialAccounts[${index}]`;
      if (!isRecord(value)) return errors.push(`${path} must be an object.`);
      if (!isNonEmptyString(value.id)) errors.push(`${path}.id is required.`);
      else if (ids.has(value.id)) errors.push(`${path}.id must be unique.`);
      else ids.add(value.id);
      if (!isNonEmptyString(value.exhibitionId) || !exhibitionIds.has(value.exhibitionId)) {
        errors.push(`${path}.exhibitionId must reference an existing exhibition.`);
      }
      if (value.boothId !== undefined) {
        if (!isNonEmptyString(value.boothId) || !boothExhibitions.has(value.boothId)) {
          errors.push(`${path}.boothId must reference an existing booth.`);
        } else if (boothExhibitions.get(value.boothId) !== value.exhibitionId) {
          errors.push(`${path}.boothId must belong to the account exhibition.`);
        }
      }
      if (!isNonEmptyString(value.company)) errors.push(`${path}.company is required.`);
      if (typeof value.contractValue !== "number" || !Number.isFinite(value.contractValue) || value.contractValue <= 0) {
        errors.push(`${path}.contractValue must be positive.`);
      }
      if (!commercialCurrencies.includes(value.currency as CommercialCurrency)) errors.push(`${path}.currency is invalid.`);
      if (!isDate(value.dueDate)) errors.push(`${path}.dueDate must be a valid date.`);
      if (typeof value.exceptionApproved !== "boolean") errors.push(`${path}.exceptionApproved must be boolean.`);
      if (typeof value.exceptionReason !== "string") errors.push(`${path}.exceptionReason must be a string.`);
      if (value.exceptionApproved && !isNonEmptyString(value.exceptionReason)) {
        errors.push(`${path}.exceptionReason is required for an approved exception.`);
      }
      if (value.exceptionApproved && !isNonEmptyString(value.exceptionApprovedBy)) {
        errors.push(`${path}.exceptionApprovedBy is required for an approved exception.`);
      }
      if (!isDate(value.updatedAt)) errors.push(`${path}.updatedAt must be a valid date.`);
      if (!Array.isArray(value.payments)) errors.push(`${path}.payments must be an array.`);
      else value.payments.forEach((payment, paymentIndex) => {
        const paymentPath = `${path}.payments[${paymentIndex}]`;
        if (!isRecord(payment)) return errors.push(`${paymentPath} must be an object.`);
        if (!isNonEmptyString(payment.id)) errors.push(`${paymentPath}.id is required.`);
        else if (paymentIds.has(payment.id)) errors.push(`${paymentPath}.id must be globally unique.`);
        else paymentIds.add(payment.id);
        if (typeof payment.amount !== "number" || !Number.isFinite(payment.amount) || payment.amount <= 0) {
          errors.push(`${paymentPath}.amount must be positive.`);
        }
        if (!isDate(payment.paidAt)) errors.push(`${paymentPath}.paidAt must be a valid date.`);
        if (!["bank", "cash", "card", "other"].includes(String(payment.method))) errors.push(`${paymentPath}.method is invalid.`);
        if (!["recorded", "voided"].includes(String(payment.status))) errors.push(`${paymentPath}.status is invalid.`);
        for (const key of ["reference", "note", "recordedBy"] as const) {
          if (typeof payment[key] !== "string") errors.push(`${paymentPath}.${key} must be a string.`);
        }
        if (!isNonEmptyString(payment.recordedBy)) errors.push(`${paymentPath}.recordedBy is required.`);
      });
      if (!Array.isArray(value.communications)) errors.push(`${path}.communications must be an array.`);
      else validateInteractions(value.communications, `${path}.communications`, errors);
    });
  }
  return errors;
}

export function validateCrmDirectoryRecords(
  companiesValue: unknown,
  staffUsersValue: unknown,
  leadsValue: unknown,
  exhibitionIds: ReadonlySet<string>,
): string[] {
  const errors: string[] = [];
  if (!Array.isArray(companiesValue)) errors.push("companies must be an array.");
  if (!Array.isArray(staffUsersValue)) errors.push("staffUsers must be an array.");
  if (!Array.isArray(companiesValue) || !Array.isArray(staffUsersValue)) return errors;

  const staffIds = new Set<string>();
  const managers = new Map<string, string>();
  let ownerCount = 0;
  staffUsersValue.forEach((value, index) => {
    const path = `staffUsers[${index}]`;
    if (!isRecord(value)) return errors.push(`${path} must be an object.`);
    if (!isNonEmptyString(value.id)) errors.push(`${path}.id is required.`);
    else if (staffIds.has(value.id)) errors.push(`${path}.id must be unique.`);
    else staffIds.add(value.id);
    for (const key of ["displayName", "title", "email", "phone"] as const) {
      if (typeof value[key] !== "string") errors.push(`${path}.${key} must be a string.`);
    }
    if (!isNonEmptyString(value.displayName)) errors.push(`${path}.displayName is required.`);
    if (!staffAccessRoles.includes(value.accessRole as StaffAccessRole)) errors.push(`${path}.accessRole is invalid.`);
    else if (value.accessRole === "owner") ownerCount += 1;
    if (!staffStatuses.includes(value.status as StaffStatus)) errors.push(`${path}.status is invalid.`);
    if (!Array.isArray(value.departments) || value.departments.length === 0 || value.departments.some((item) => !staffDepartments.includes(item as StaffDepartment))) {
      errors.push(`${path}.departments must contain valid departments.`);
    }
    if (!Array.isArray(value.languages) || value.languages.length === 0 || value.languages.some((item) => !["fa", "en", "ar", "tr"].includes(String(item)))) {
      errors.push(`${path}.languages must contain supported languages.`);
    }
    if (typeof value.workloadCapacity !== "number" || !Number.isFinite(value.workloadCapacity) || value.workloadCapacity < 0 || value.workloadCapacity > 100) {
      errors.push(`${path}.workloadCapacity must be between 0 and 100.`);
    }
    if (!isDate(value.createdAt) || !isDate(value.updatedAt)) errors.push(`${path} timestamps must be valid dates.`);
    if (isNonEmptyString(value.managerId) && isNonEmptyString(value.id)) managers.set(value.id, value.managerId);
  });
  if (ownerCount < 1) errors.push("staffUsers must contain at least one owner.");
  managers.forEach((managerId, staffId) => {
    if (!staffIds.has(managerId)) errors.push(`Staff ${staffId} managerId must reference an existing staff user.`);
    if (managerId === staffId) errors.push(`Staff ${staffId} cannot manage themselves.`);
    const visited = new Set([staffId]);
    let cursor: string | undefined = managerId;
    while (cursor) {
      if (visited.has(cursor)) {
        errors.push(`Staff hierarchy contains a cycle involving ${staffId}.`);
        break;
      }
      visited.add(cursor);
      cursor = managers.get(cursor);
    }
  });

  const companyIds = new Set<string>();
  const contactIds = new Set<string>();
  const participationIds = new Set<string>();
  const activityIds = new Set<string>();
  companiesValue.forEach((value, index) => {
    const path = `companies[${index}]`;
    if (!isRecord(value)) return errors.push(`${path} must be an object.`);
    if (!isNonEmptyString(value.id)) errors.push(`${path}.id is required.`);
    else if (companyIds.has(value.id)) errors.push(`${path}.id must be unique.`);
    else companyIds.add(value.id);
    for (const key of ["name", "legalName", "industry", "country", "city", "website", "notes"] as const) {
      if (typeof value[key] !== "string") errors.push(`${path}.${key} must be a string.`);
    }
    if (!isNonEmptyString(value.name)) errors.push(`${path}.name is required.`);
    if (!companyLifecycles.includes(value.lifecycle as CompanyLifecycle)) errors.push(`${path}.lifecycle is invalid.`);
    if (!companyPriorities.includes(value.priority as CompanyPriority)) errors.push(`${path}.priority is invalid.`);
    if (!Array.isArray(value.tags) || value.tags.some((item) => typeof item !== "string")) errors.push(`${path}.tags must be a string array.`);
    if (!Array.isArray(value.ownerIds) || value.ownerIds.some((item) => !staffIds.has(String(item)))) errors.push(`${path}.ownerIds must reference staff users.`);
    if (!isDate(value.createdAt) || !isDate(value.updatedAt)) errors.push(`${path} timestamps must be valid dates.`);

    if (!Array.isArray(value.contacts)) errors.push(`${path}.contacts must be an array.`);
    else value.contacts.forEach((contact, contactIndex) => {
      const contactPath = `${path}.contacts[${contactIndex}]`;
      if (!isRecord(contact)) return errors.push(`${contactPath} must be an object.`);
      if (!isNonEmptyString(contact.id)) errors.push(`${contactPath}.id is required.`);
      else if (contactIds.has(contact.id)) errors.push(`${contactPath}.id must be globally unique.`);
      else contactIds.add(contact.id);
      for (const key of ["name", "title", "phone", "email"] as const) if (typeof contact[key] !== "string") errors.push(`${contactPath}.${key} must be a string.`);
      if (!["phone", "email", "messaging", "meeting"].includes(String(contact.preferredChannel))) errors.push(`${contactPath}.preferredChannel is invalid.`);
      if (!["fa", "en", "ar", "other"].includes(String(contact.preferredLanguage))) errors.push(`${contactPath}.preferredLanguage is invalid.`);
      if (!["unknown", "granted", "declined"].includes(String(contact.consentStatus))) errors.push(`${contactPath}.consentStatus is invalid.`);
      if (typeof contact.primary !== "boolean") errors.push(`${contactPath}.primary must be boolean.`);
    });

    if (!Array.isArray(value.participations)) errors.push(`${path}.participations must be an array.`);
    else value.participations.forEach((participation, participationIndex) => {
      const participationPath = `${path}.participations[${participationIndex}]`;
      if (!isRecord(participation)) return errors.push(`${participationPath} must be an object.`);
      if (!isNonEmptyString(participation.id)) errors.push(`${participationPath}.id is required.`);
      else if (participationIds.has(participation.id)) errors.push(`${participationPath}.id must be globally unique.`);
      else participationIds.add(participation.id);
      if (!isNonEmptyString(participation.exhibitionId) || !exhibitionIds.has(participation.exhibitionId)) errors.push(`${participationPath}.exhibitionId must reference an exhibition.`);
      if (!participationStatuses.includes(participation.status as ParticipationStatus)) errors.push(`${participationPath}.status is invalid.`);
      if (!isNonNegativeNumber(participation.expectedArea)) errors.push(`${participationPath}.expectedArea must be non-negative.`);
      if (!Array.isArray(participation.requestedServices) || participation.requestedServices.some((item) => typeof item !== "string")) errors.push(`${participationPath}.requestedServices must be a string array.`);
      if (!Array.isArray(participation.ownerIds) || participation.ownerIds.some((item) => !staffIds.has(String(item)))) errors.push(`${participationPath}.ownerIds must reference staff users.`);
      if (!isDate(participation.createdAt) || !isDate(participation.updatedAt)) errors.push(`${participationPath} timestamps must be valid dates.`);
    });

    if (!Array.isArray(value.activities)) errors.push(`${path}.activities must be an array.`);
    else value.activities.forEach((activity, activityIndex) => {
      const activityPath = `${path}.activities[${activityIndex}]`;
      if (!isRecord(activity)) return errors.push(`${activityPath} must be an object.`);
      if (!isNonEmptyString(activity.id)) errors.push(`${activityPath}.id is required.`);
      else if (activityIds.has(activity.id)) errors.push(`${activityPath}.id must be globally unique.`);
      else activityIds.add(activity.id);
      if (![...interactionKinds, "stage", "assignment", "participation"].includes(activity.kind as InteractionKind)) errors.push(`${activityPath}.kind is invalid.`);
      if (!isNonEmptyString(activity.ownerId) || !staffIds.has(activity.ownerId)) errors.push(`${activityPath}.ownerId must reference a staff user.`);
      if (!isNonEmptyString(activity.summary)) errors.push(`${activityPath}.summary is required.`);
      if (!isDate(activity.occurredAt)) errors.push(`${activityPath}.occurredAt must be valid.`);
    });
  });

  if (Array.isArray(leadsValue)) {
    leadsValue.forEach((lead, index) => {
      if (!isRecord(lead)) return;
      if (!isNonEmptyString(lead.companyId) || !companyIds.has(lead.companyId)) errors.push(`leads[${index}].companyId must reference a company.`);
      if (!isNonEmptyString(lead.ownerId) || !staffIds.has(lead.ownerId)) errors.push(`leads[${index}].ownerId must reference a staff user.`);
      if (Array.isArray(lead.collaborators)) lead.collaborators.forEach((assignment, assignmentIndex) => {
        if (!isRecord(assignment) || !isNonEmptyString(assignment.staffUserId) || !staffIds.has(assignment.staffUserId)) errors.push(`leads[${index}].collaborators[${assignmentIndex}] must reference a staff user.`);
      });
    });
  }
  return errors;
}

function validateInteractions(value: unknown[], path: string, errors: string[]) {
  const ids = new Set<string>();
  value.forEach((interaction, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(interaction)) return errors.push(`${itemPath} must be an object.`);
    if (!isNonEmptyString(interaction.id)) errors.push(`${itemPath}.id is required.`);
    else if (ids.has(interaction.id)) errors.push(`${itemPath}.id must be unique.`);
    else ids.add(interaction.id);
    if (!interactionKinds.includes(interaction.kind as InteractionKind)) errors.push(`${itemPath}.kind is invalid.`);
    if (!isDate(interaction.occurredAt)) errors.push(`${itemPath}.occurredAt must be a valid date.`);
    if (!isNonEmptyString(interaction.owner)) errors.push(`${itemPath}.owner is required.`);
    if (!isNonEmptyString(interaction.summary)) errors.push(`${itemPath}.summary is required.`);
  });
}
