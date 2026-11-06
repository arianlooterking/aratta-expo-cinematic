import type { Database, Enums, Tables, TablesInsert, TablesUpdate } from "@/lib/platform/database.types";

/** Tables the portal reads and writes through the store. */
export type PortalTable =
  | "exhibitions"
  | "halls"
  | "hall_features"
  | "booths"
  | "companies"
  | "contacts"
  | "deals"
  | "activities"
  | "invoices"
  | "invoice_lines"
  | "payments"
  | "inventory_items"
  | "equipment_orders"
  | "tasks"
  | "problems"
  | "staff_members"
  | "notifications";

export type Row<T extends PortalTable> = Tables<T>;
export type Insert<T extends PortalTable> = TablesInsert<T>;
export type Patch<T extends PortalTable> = TablesUpdate<T>;

export type Exhibition = Row<"exhibitions">;
export type Hall = Row<"halls">;
export type HallFeature = Row<"hall_features">;
export type Booth = Row<"booths">;
export type Company = Row<"companies">;
export type Contact = Row<"contacts">;
export type Deal = Row<"deals">;
export type Activity = Row<"activities">;
export type Invoice = Row<"invoices">;
export type InvoiceLine = Row<"invoice_lines">;
export type Payment = Row<"payments">;
export type InventoryItem = Row<"inventory_items">;
export type EquipmentOrder = Row<"equipment_orders">;
export type Task = Row<"tasks">;
export type Problem = Row<"problems">;
export type StaffMember = Row<"staff_members">;
export type Notification = Row<"notifications">;

export type BoothStatus = Enums<"booth_status">;
export type DealStage = Enums<"deal_stage">;
export type EquipmentStage = Enums<"equipment_stage">;
export type FeatureKind = Enums<"feature_kind">;
export type ProblemStep = Enums<"problem_step">;
export type ExhibitionStatus = Enums<"exhibition_status">;
export type Currency = Enums<"currency_code">;
export type StaffRole = Enums<"staff_role">;
export type Department = Enums<"department">;

export type { Database };

/** One equality filter, applied to the query and to the live subscription. */
export type Filter<T extends PortalTable> = { column: keyof Row<T> & string; value: string };

export type CollectionStatus = "loading" | "live" | "offline" | "error";

export type CollectionState<R> = {
  rows: readonly R[];
  status: CollectionStatus;
  error: string | null;
};

export type MutationResult<R> = { ok: true; row: R | null } | { ok: false; error: string };
