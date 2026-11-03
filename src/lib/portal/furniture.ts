/**
 * Rules for a booth's furniture and equipment list. Pure, so the panel and the tests share them.
 */

export type OrderLine = {
  id: string;
  item_id: string;
  quantity: number;
  stage: "requested" | "reserved" | "prepared" | "delivered" | "collected" | "issue" | "cancelled";
  delivered_qty: number;
  collected_qty: number;
  damaged_qty: number;
};

export type StockItem = { id: string; sku: string; on_hand: number; archived_at?: string | null };

const ACTIVE = new Set<OrderLine["stage"]>(["requested", "reserved", "prepared", "delivered", "issue"]);

/** The lowest a line's quantity can go: what is already out at the booth, and never below one. */
export function minQuantity(o: OrderLine) {
  return Math.max(1, o.delivered_qty);
}

/** Whether the quantity can still be changed. Collected or cancelled lines are history. */
export function quantityEditable(o: OrderLine) {
  return o.stage !== "collected" && o.stage !== "cancelled";
}

/**
 * The patch for a new quantity, or null when nothing should change.
 * Raising a delivered line sends it back to "requested" so the extra pieces get delivered.
 */
export function quantityPatch(o: OrderLine, next: number): { quantity: number; stage?: OrderLine["stage"] } | null {
  if (!quantityEditable(o)) return null;
  const q = Math.max(minQuantity(o), Math.floor(next));
  if (q === o.quantity) return null;
  if (o.stage === "delivered" && q > o.delivered_qty) return { quantity: q, stage: "requested" };
  if (o.stage === "requested" && o.delivered_qty > 0 && q === o.delivered_qty) return { quantity: q, stage: "delivered" };
  return { quantity: q };
}

/** A line can be deleted outright only while nothing has gone out to the booth. */
export function removable(o: OrderLine) {
  return o.delivered_qty === 0 && o.stage !== "collected";
}

/** Pieces of an item still free in the store room, after every active line in the exhibition. */
export function stockLeft(item: StockItem, orders: readonly OrderLine[]) {
  let out = 0;
  for (const o of orders) {
    if (o.item_id !== item.id || !ACTIVE.has(o.stage)) continue;
    out += Math.max(0, o.quantity - o.collected_qty);
  }
  return item.on_hand - out;
}

export type KitLine = { item_id: string; quantity: number };

/**
 * Merges a kit into a booth's list: existing active lines are topped up, new items become new lines.
 * Returns the updates and inserts to make.
 */
export function mergeKit(existing: readonly OrderLine[], kit: readonly KitLine[]) {
  const updates: Array<{ id: string; quantity: number; stage?: OrderLine["stage"] }> = [];
  const inserts: KitLine[] = [];
  const pending = new Map<string, number>();
  for (const k of kit) {
    if (k.quantity <= 0) continue;
    pending.set(k.item_id, (pending.get(k.item_id) ?? 0) + Math.floor(k.quantity));
  }
  for (const [item_id, quantity] of pending) {
    const line = existing.find((o) => o.item_id === item_id && quantityEditable(o));
    if (line) {
      const patch = quantityPatch(line, line.quantity + quantity);
      if (patch) updates.push({ id: line.id, ...patch });
    } else inserts.push({ item_id, quantity });
  }
  return { updates, inserts };
}

/** A sensible starting kit for a booth of this size, using the items the store room has. */
export function standardKit(area: number, items: readonly StockItem[]): KitLine[] {
  const bySku = new Map(items.filter((i) => !i.archived_at).map((i) => [i.sku, i.id]));
  const want: Array<[string, number]> = [
    ["table", area >= 24 ? 2 : 1],
    ["chair", area >= 24 ? 4 : 2],
    ["spot", Math.max(2, Math.round(area / 6))],
    ["socket", 1],
    ["bin", 1],
  ];
  if (area >= 12) want.push(["counter", 1]);
  return want.filter(([sku]) => bySku.has(sku)).map(([sku, quantity]) => ({ item_id: bySku.get(sku)!, quantity }));
}

/** The kit of another booth, ready to copy: only lines still in play. */
export function kitOf(orders: readonly OrderLine[]): KitLine[] {
  return orders.filter((o) => o.stage !== "cancelled").map((o) => ({ item_id: o.item_id, quantity: o.quantity }));
}

/** What the next handover step for a line is: take it to the booth, bring it back, or nothing. */
export function nextEquipmentStep(o: Pick<OrderLine, "stage" | "delivered_qty">, returnable: boolean): "deliver" | "collect" | null {
  if (o.stage === "cancelled" || o.stage === "collected") return null;
  if (o.stage === "delivered" || (o.stage === "issue" && o.delivered_qty > 0)) return returnable ? "collect" : null;
  return "deliver";
}

/** The patch that records a delivery or a collection of the whole line. */
export function equipmentPatch(o: Pick<OrderLine, "quantity" | "delivered_qty" | "damaged_qty">, step: "deliver" | "collect") {
  const now = new Date().toISOString();
  if (step === "deliver") return { stage: "delivered" as const, delivered_qty: o.quantity, delivered_at: now };
  return { stage: "collected" as const, collected_qty: Math.max(0, o.delivered_qty - o.damaged_qty), collected_at: now };
}
