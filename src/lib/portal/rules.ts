// The database derives some fields in triggers (supabase/migrations). The demo
// store runs the same rules in the browser so both modes behave alike.
// Keep these in step with the SQL.

type BoothLike = {
  width: number;
  depth: number;
  area_m2: number;
  area_is_manual: boolean;
  code: string;
  deal_id: string | null;
  status: "available" | "held" | "reserved" | "contracted" | "paid" | "blocked";
  hall_id: string;
  exhibition_id: string;
};

export function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/** booth_before_write + booth_sync_status */
export function deriveBooth<B extends BoothLike>(booth: B, hallExhibition: (hallId: string) => string | undefined): B {
  const next = { ...booth };
  next.exhibition_id = hallExhibition(next.hall_id) ?? next.exhibition_id;
  if (!next.area_is_manual) next.area_m2 = round2(next.width * next.depth);
  next.code = next.code.trim();
  if (next.deal_id && (next.status === "available" || next.status === "held")) next.status = "reserved";
  else if (!next.deal_id && (next.status === "reserved" || next.status === "contracted" || next.status === "paid")) {
    next.status = "available";
  }
  return next;
}

type OrderLike = {
  booth_id: string | null;
  deal_id: string | null;
  exhibition_id: string;
  stage: "requested" | "reserved" | "prepared" | "delivered" | "collected" | "issue" | "cancelled";
  quantity: number;
  delivered_qty: number;
  collected_qty: number;
  damaged_qty: number;
  delivered_at: string | null;
  collected_at: string | null;
};

/** equipment_order_before_write */
export function deriveOrder<O extends OrderLike>(
  order: O,
  booth: (id: string) => { exhibition_id: string; deal_id: string | null } | undefined,
  now = new Date().toISOString(),
): O {
  const next = { ...order };
  if (next.booth_id) {
    const b = booth(next.booth_id);
    if (b) {
      next.exhibition_id = b.exhibition_id;
      next.deal_id = next.deal_id ?? b.deal_id;
    }
  }
  if (next.stage === "delivered" && !next.delivered_at) {
    next.delivered_at = now;
    if (next.delivered_qty === 0) next.delivered_qty = next.quantity;
  }
  if (next.stage === "collected" && !next.collected_at) {
    next.collected_at = now;
    if (next.collected_qty === 0) next.collected_qty = next.delivered_qty - next.damaged_qty;
  }
  return next;
}
