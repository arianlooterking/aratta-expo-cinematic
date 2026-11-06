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

/** staff_ids_clean: first-come order, no blanks or repeats, only people we know. */
export function cleanStaffIds(ids: readonly (string | null | undefined)[] | null | undefined, known: (id: string) => boolean = () => true): string[] {
  const out: string[] = [];
  for (const id of ids ?? []) if (id && !out.includes(id) && known(id)) out.push(id);
  return out;
}

type HandoverLike = {
  stage: OrderLike["stage"];
  delivered_by: string[];
  collected_by: string[];
  handled_by: string | null;
};

/**
 * equipment_people_before_write: a delivery or collection saved with nobody named
 * is credited to whoever saved it.
 */
export function deriveHandoverPeople<O extends HandoverLike>(
  order: O,
  before: Pick<HandoverLike, "stage"> | undefined,
  me: string | null,
  known?: (id: string) => boolean,
): O {
  const next = { ...order, delivered_by: cleanStaffIds(order.delivered_by, known), collected_by: cleanStaffIds(order.collected_by, known) };
  if (me && next.stage === "delivered" && before?.stage !== "delivered" && next.delivered_by.length === 0) next.delivered_by = [me];
  if (me && next.stage === "collected" && before?.stage !== "collected" && next.collected_by.length === 0) next.collected_by = [me];
  if (me && !next.handled_by && (next.stage === "delivered" || next.stage === "collected")) next.handled_by = me;
  return next;
}

type ProblemLike = {
  exhibition_id: string;
  booth_id: string | null;
  deal_id: string | null;
  order_id: string | null;
  note: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution: string | null;
};

/** problem_before_write: fill in where the problem is from, tidy the text, stamp who resolved it. */
export function deriveProblem<P extends ProblemLike>(
  problem: P,
  before: Pick<ProblemLike, "resolved_at"> | undefined,
  lookup: {
    order: (id: string) => { booth_id: string | null; deal_id: string | null; exhibition_id: string } | undefined;
    booth: (id: string) => { exhibition_id: string; deal_id: string | null } | undefined;
    deal: (id: string) => { exhibition_id: string } | undefined;
  },
  me: string | null,
): P {
  const next = { ...problem };
  if (next.order_id && !next.booth_id) {
    const o = lookup.order(next.order_id);
    if (o) {
      next.booth_id = o.booth_id;
      next.deal_id = next.deal_id ?? o.deal_id;
      next.exhibition_id = o.exhibition_id;
    }
  }
  if (next.booth_id) {
    const b = lookup.booth(next.booth_id);
    if (b) {
      next.exhibition_id = b.exhibition_id;
      next.deal_id = next.deal_id ?? b.deal_id;
    }
  } else if (next.deal_id) {
    const d = lookup.deal(next.deal_id);
    if (d) next.exhibition_id = d.exhibition_id;
  }
  next.note = next.note?.trim() || null;
  next.resolution = next.resolution?.trim() || null;
  if (next.resolved_at && !before?.resolved_at) next.resolved_by = next.resolved_by ?? me;
  else if (!next.resolved_at) {
    next.resolved_by = null;
    next.resolution = null;
  }
  return next;
}

type CarryOrder = { id: string; booth_id: string | null; deal_id: string | null; exhibition_id: string; delivered_qty: number; stage: OrderLike["stage"] };

/**
 * booth_carry_furniture: when a booth changes hands, lines that never went out go back to the old
 * company, and the new company's waiting lines move onto the booth. Returns the changed lines.
 */
export function carryFurniture<O extends CarryOrder>(
  booth: { id: string; exhibition_id: string; deal_id: string | null },
  oldDealId: string | null,
  orders: readonly O[],
): O[] {
  const changed: O[] = [];
  if (oldDealId === booth.deal_id) return changed;
  for (const o of orders) {
    if (oldDealId && o.booth_id === booth.id && o.deal_id === oldDealId && o.delivered_qty === 0 && o.stage !== "collected" && o.stage !== "cancelled") {
      changed.push({ ...o, booth_id: null });
    } else if (booth.deal_id && o.deal_id === booth.deal_id && !o.booth_id && o.exhibition_id === booth.exhibition_id) {
      changed.push({ ...o, booth_id: booth.id });
    }
  }
  return changed;
}

type TeamLike = { name_fa: string; lead_id: string | null; member_ids: string[] };

/** team_before_write: known members only, no repeats, the lead first. */
export function deriveTeam<T extends TeamLike>(team: T, known?: (id: string) => boolean): T {
  const members = cleanStaffIds(team.member_ids, known);
  const lead = team.lead_id && (!known || known(team.lead_id)) ? team.lead_id : null;
  return {
    ...team,
    name_fa: team.name_fa.trim(),
    lead_id: lead,
    member_ids: lead ? [lead, ...members.filter((id) => id !== lead)] : members,
  };
}

type StaffLike = { id: string; role: "owner" | "admin" | "manager" | "member" | "viewer"; status: "invited" | "active" | "suspended"; email: string; user_id: string | null };

const roleRank = { owner: 5, admin: 4, manager: 3, member: 2, viewer: 1 } as const;

/**
 * guard_staff_change + guard_staff_email + the staff policies, as one check.
 * Returns why a change is refused, or null when it is allowed.
 */
export function staffChangeError(
  actor: Pick<StaffLike, "id" | "role"> | null | undefined,
  before: StaffLike | null,
  after: StaffLike | null,
  everyone: readonly StaffLike[],
): string | null {
  if (!actor) return "not-permitted";
  const isAdmin = roleRank[actor.role] >= roleRank.admin;
  const ownerActor = actor.role === "owner";
  if (!before && after) {
    if (!isAdmin) return "not-permitted";
    if (after.role === "owner" && !ownerActor) return "owner-only";
    return null;
  }
  if (!before) return null;
  if (!isAdmin) return "not-permitted";
  if (before.id === actor.id) {
    if (!after) return "self-remove";
    if (after.role !== before.role || after.status !== before.status) return "self-role";
  }
  if (before.role === "owner" && !ownerActor) return "owner-only";
  if (after && after.role === "owner" && before.role !== "owner" && !ownerActor) return "owner-only";
  if (after && after.email !== before.email && before.user_id) return "email-locked";
  if (before.role === "owner" && before.status === "active" && (!after || after.role !== "owner" || after.status !== "active")) {
    const others = everyone.filter((s) => s.id !== before.id && s.role === "owner" && s.status === "active");
    if (!others.length) return "last-owner";
  }
  return null;
}
