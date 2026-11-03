// Invoice and balance maths, the same as the invoice_totals and deal_balances
// views, computed in the browser so the numbers stay live as rows change.

type LineLike = { invoice_id: string; quantity: number; unit_price: number; discount: number };
type InvoiceLike = { id: string; deal_id: string | null; company_id: string; status: string; vat_rate: number };
type PaymentLike = { invoice_id: string | null; deal_id: string | null; amount: number; voided_at: string | null };

export type InvoiceTotal = { subtotal: number; vat: number; total: number; paid: number; balance: number };
export type Balance = { invoiced: number; paid: number; balance: number };

export const ZERO_BALANCE: Balance = Object.freeze({ invoiced: 0, paid: 0, balance: 0 });

export function invoiceTotals(
  invoices: readonly InvoiceLike[],
  lines: readonly LineLike[],
  payments: readonly PaymentLike[],
): Map<string, InvoiceTotal> {
  const subtotal = new Map<string, number>();
  for (const line of lines) {
    const amount = Math.round(line.quantity * line.unit_price) - line.discount;
    subtotal.set(line.invoice_id, (subtotal.get(line.invoice_id) ?? 0) + amount);
  }
  const paid = new Map<string, number>();
  for (const p of payments) {
    if (p.voided_at || !p.invoice_id) continue;
    paid.set(p.invoice_id, (paid.get(p.invoice_id) ?? 0) + p.amount);
  }
  const result = new Map<string, InvoiceTotal>();
  for (const invoice of invoices) {
    if (invoice.status === "cancelled") continue;
    const sub = subtotal.get(invoice.id) ?? 0;
    const vat = Math.round(sub * invoice.vat_rate);
    const total = sub + vat;
    const got = paid.get(invoice.id) ?? 0;
    result.set(invoice.id, { subtotal: sub, vat, total, paid: got, balance: total - got });
  }
  return result;
}

/** Per deal: invoiced (non-cancelled totals), paid (all non-void payments on the deal), balance. */
export function dealBalances(
  invoices: readonly InvoiceLike[],
  totals: Map<string, InvoiceTotal>,
  payments: readonly PaymentLike[],
  invoiceDeal: (invoiceId: string) => string | null = (id) => invoices.find((i) => i.id === id)?.deal_id ?? null,
): Map<string, Balance> {
  const result = new Map<string, Balance>();
  const get = (dealId: string) => {
    let b = result.get(dealId);
    if (!b) {
      b = { invoiced: 0, paid: 0, balance: 0 };
      result.set(dealId, b);
    }
    return b;
  };
  for (const invoice of invoices) {
    const t = totals.get(invoice.id);
    if (!t || !invoice.deal_id) continue;
    get(invoice.deal_id).invoiced += t.total;
  }
  for (const p of payments) {
    if (p.voided_at) continue;
    const dealId = p.deal_id ?? (p.invoice_id ? invoiceDeal(p.invoice_id) : null);
    if (!dealId) continue;
    get(dealId).paid += p.amount;
  }
  for (const b of result.values()) b.balance = b.invoiced - b.paid;
  return result;
}

/** List price of a booth: the override, else area × the exhibition's space rate. */
export function boothListPrice(
  booth: { area_m2: number; price_override: number | null },
  spaceRate: number | null,
): number | null {
  if (booth.price_override != null) return booth.price_override;
  if (spaceRate == null) return null;
  return Math.round(booth.area_m2 * spaceRate);
}

/** Share of the invoiced amount that has been paid, 0..1, or null when nothing is invoiced. */
export function paidShare(balance: Balance | undefined): number | null {
  if (!balance || balance.invoiced <= 0) return null;
  return Math.max(0, Math.min(1, balance.paid / balance.invoiced));
}
