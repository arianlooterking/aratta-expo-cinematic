"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { AGE_BUCKETS, linesTotal, type AgeBucket } from "@/lib/portal/finance";
import { money, num, percent, sep } from "@/lib/portal/format";
import { ageBucketLabel, invoiceKindLabel, invoiceStatusLabel } from "@/lib/portal/labels";
import type { Invoice, InvoiceLine } from "@/lib/portal/types";
import { useExhibition } from "../ExhibitionProvider";
import { usePortal } from "../PortalProvider";
import { Pill } from "../ui";

const statusTone = { draft: "neutral", issued: "info", registered: "ok", cancelled: "danger" } as const;

export function InvoiceStatusPill({ status }: { status: Invoice["status"] }) {
  const { lang } = usePortal();
  return <Pill tone={statusTone[status]}>{invoiceStatusLabel[status][lang]}</Pill>;
}

/** "Proforma #1209", or "Proforma (draft)" before it has a number. Numbers stay left to right. */
export function invoiceTitle(i: Pick<Invoice, "kind" | "number">, lang: "fa" | "en") {
  const kind = invoiceKindLabel[i.kind][lang];
  return i.number ? `${kind} #⁦${i.number}⁩` : `${kind} ${lang === "fa" ? "(بدون شماره)" : "(no number yet)"}`;
}

/** Lines grouped by invoice, in their saved order. */
export function useLinesByInvoice() {
  const x = useExhibition();
  return useMemo(() => {
    const map = new Map<string, InvoiceLine[]>();
    for (const l of x.lines) {
      const list = map.get(l.invoice_id) ?? [];
      list.push(l);
      map.set(l.invoice_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
    return map;
  }, [x.lines]);
}

/**
 * Money of one invoice for display. Cancelled invoices are left out of the live totals
 * (they owe nothing), so their face value is worked out from their lines.
 */
export function useInvoiceMoney() {
  const x = useExhibition();
  const lines = useLinesByInvoice();
  return useMemo(
    () => (i: Invoice) => {
      const t = x.invoiceTotalsById.get(i.id);
      if (t) return t;
      const face = linesTotal(lines.get(i.id) ?? [], i.vat_rate);
      return { subtotal: face.subtotal, vat: face.vat, total: face.total, paid: 0, balance: 0 };
    },
    [x.invoiceTotalsById, lines],
  );
}

export const AGE_COLOR: Record<AgeBucket, string> = {
  current: "var(--age-0)",
  d30: "var(--age-1)",
  d60: "var(--age-2)",
  d90: "var(--age-3)",
  older: "var(--age-4)",
};

/**
 * Receivables by age as one thin segmented bar, with the bucket list beside it carrying the
 * figures. One hue from light (not yet due) to dark (over 90 days).
 */
export function AgeingBar({ buckets, currency }: { buckets: Record<AgeBucket, number>; currency: string }) {
  const { lang } = usePortal();
  const total = AGE_BUCKETS.reduce((s, b) => s + buckets[b], 0);
  const parts = AGE_BUCKETS.filter((b) => buckets[b] > 0);
  const label = AGE_BUCKETS.map((b) => `${ageBucketLabel[b][lang]}: ${money(lang, buckets[b], currency)}`).join("، ");
  return (
    <div className="grid gap-3">
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-p-sunken" role="img" aria-label={label}>
        {parts.map((b) => (
          <span
            key={b}
            className="h-full first:rounded-s-full last:rounded-e-full"
            style={{ width: `${(buckets[b] / total) * 100}%`, background: AGE_COLOR[b] }}
            title={`${ageBucketLabel[b][lang]}${sep(lang)}${money(lang, buckets[b], currency)}${sep(lang)}${percent(lang, buckets[b] / total)}`}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
        {AGE_BUCKETS.map((b) => (
          <li key={b} className={cn("min-w-0", !buckets[b] && "opacity-60")}>
            <span className="flex items-center gap-1.5 text-xs text-p-ink-3">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: AGE_COLOR[b] }} aria-hidden />
              {ageBucketLabel[b][lang]}
            </span>
            <span className="tabular block truncate text-sm font-semibold" title={money(lang, buckets[b], currency)}>
              {num(lang, buckets[b])}
            </span>
            <span className="text-[11px] text-p-ink-3">{total ? percent(lang, buckets[b] / total) : "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
