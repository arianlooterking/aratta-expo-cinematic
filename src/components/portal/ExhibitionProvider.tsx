"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { dealBalances, invoiceTotals, type Balance, type InvoiceTotal } from "@/lib/portal/money";
import { defaultExhibition, exhibitionPhase, summariseEquipment, type EquipmentSummary, type Phase } from "@/lib/portal/metrics";
import type {
  Booth,
  CollectionStatus,
  Company,
  Deal,
  EquipmentOrder,
  Exhibition,
  Hall,
  HallFeature,
  InventoryItem,
  Invoice,
  InvoiceLine,
  Payment,
  StaffMember,
  Task,
} from "@/lib/portal/types";
import { useCollection, usePersistentState } from "./PortalProvider";

export type ExhibitionData = {
  exhibitions: Exhibition[];
  exhibition: Exhibition | null;
  selectExhibition: (id: string) => void;
  phase: Phase;
  status: CollectionStatus;
  ready: boolean;
  halls: Hall[];
  booths: Booth[];
  features: HallFeature[];
  deals: Deal[];
  dealById: Map<string, Deal>;
  boothsByDeal: Map<string, Booth[]>;
  companies: Company[];
  companyById: Map<string, Company>;
  invoices: Invoice[];
  invoiceTotalsById: Map<string, InvoiceTotal>;
  /** Invoice lines of this exhibition's invoices. */
  lines: InvoiceLine[];
  balanceByDeal: Map<string, Balance>;
  payments: Payment[];
  orders: EquipmentOrder[];
  ordersByBooth: Map<string, EquipmentOrder[]>;
  equipmentByBooth: Map<string, EquipmentSummary>;
  items: InventoryItem[];
  itemById: Map<string, InventoryItem>;
  tasks: Task[];
  staff: StaffMember[];
  staffById: Map<string, StaffMember>;
};

const ExhibitionContext = createContext<ExhibitionData | null>(null);

function byId<T extends { id: string }>(rows: readonly T[]) {
  return new Map(rows.map((r) => [r.id, r]));
}

function group<T, K>(rows: readonly T[], key: (row: T) => K | null | undefined) {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    if (k == null) continue;
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  return map;
}

function worst(...statuses: CollectionStatus[]): CollectionStatus {
  if (statuses.includes("error")) return "error";
  if (statuses.includes("loading")) return "loading";
  if (statuses.includes("offline")) return "offline";
  return "live";
}

export function ExhibitionProvider({ children }: { children: ReactNode }) {
  const exhibitionsState = useCollection("exhibitions");
  const [storedId, setStoredId] = usePersistentState<string>("aratta.portal.exhibition", "");

  const exhibitions = useMemo(
    () =>
      [...exhibitionsState.rows].sort((a, b) => (b.starts_on ?? "").localeCompare(a.starts_on ?? "")),
    [exhibitionsState.rows],
  );
  const exhibition = useMemo(
    () => exhibitions.find((e) => e.id === storedId) ?? defaultExhibition(exhibitions),
    [exhibitions, storedId],
  );
  const filter = exhibition ? { column: "exhibition_id" as const, value: exhibition.id } : null;

  const halls = useCollection("halls", filter, Boolean(exhibition));
  const booths = useCollection("booths", filter, Boolean(exhibition));
  const features = useCollection("hall_features", filter, Boolean(exhibition));
  const deals = useCollection("deals", filter, Boolean(exhibition));
  const invoices = useCollection("invoices", filter, Boolean(exhibition));
  const orders = useCollection("equipment_orders", filter, Boolean(exhibition));
  const tasks = useCollection("tasks", filter, Boolean(exhibition));
  // Small shared tables, loaded whole.
  const companies = useCollection("companies");
  const lines = useCollection("invoice_lines");
  const payments = useCollection("payments");
  const items = useCollection("inventory_items");
  const staff = useCollection("staff_members");

  const value = useMemo<ExhibitionData>(() => {
    const invoiceRows = invoices.rows as Invoice[];
    const invoiceIds = new Set(invoiceRows.map((i) => i.id));
    const dealRows = deals.rows as Deal[];
    const dealIds = new Set(dealRows.map((d) => d.id));
    const paymentRows = (payments.rows as Payment[]).filter(
      (p) => (p.invoice_id && invoiceIds.has(p.invoice_id)) || (p.deal_id && dealIds.has(p.deal_id)),
    );
    const lineRows = lines.rows.filter((l) => invoiceIds.has(l.invoice_id));
    const totals = invoiceTotals(invoiceRows, lineRows, paymentRows);
    const balances = dealBalances(invoiceRows, totals, paymentRows);
    const itemRows = items.rows as InventoryItem[];
    const itemById = byId(itemRows);
    const orderRows = orders.rows as EquipmentOrder[];
    const ordersByBooth = group(orderRows, (o) => o.booth_id);
    const equipmentByBooth = new Map<string, EquipmentSummary>();
    for (const [boothId, list] of ordersByBooth) {
      equipmentByBooth.set(boothId, summariseEquipment(list, (id) => itemById.get(id)?.returnable ?? true));
    }
    const boothRows = booths.rows as Booth[];
    const staffRows = staff.rows as StaffMember[];
    const status = exhibition
      ? worst(halls.status, booths.status, deals.status, companies.status, orders.status)
      : exhibitionsState.status;
    return {
      exhibitions,
      exhibition,
      selectExhibition: setStoredId,
      phase: exhibition ? exhibitionPhase(exhibition) : "planning",
      status,
      ready: exhibitionsState.status !== "loading" && (!exhibition || status !== "loading"),
      halls: [...halls.rows].sort((a, b) => a.sort_order - b.sort_order || a.name_fa.localeCompare(b.name_fa)),
      booths: boothRows,
      features: features.rows as HallFeature[],
      deals: dealRows,
      dealById: byId(dealRows),
      boothsByDeal: group(boothRows, (b) => b.deal_id),
      companies: companies.rows as Company[],
      companyById: byId(companies.rows as Company[]),
      invoices: invoiceRows,
      invoiceTotalsById: totals,
      lines: lineRows as InvoiceLine[],
      balanceByDeal: balances,
      payments: paymentRows,
      orders: orderRows,
      ordersByBooth,
      equipmentByBooth,
      items: itemRows,
      itemById,
      tasks: tasks.rows as Task[],
      staff: staffRows,
      staffById: byId(staffRows),
    };
  }, [
    exhibitions,
    exhibition,
    setStoredId,
    exhibitionsState.status,
    halls,
    booths,
    features,
    deals,
    invoices,
    orders,
    tasks,
    companies,
    lines,
    payments,
    items,
    staff,
  ]);

  return <ExhibitionContext.Provider value={value}>{children}</ExhibitionContext.Provider>;
}

export function useExhibition() {
  const value = useContext(ExhibitionContext);
  if (!value) throw new Error("useExhibition must be used inside ExhibitionProvider");
  return value;
}
