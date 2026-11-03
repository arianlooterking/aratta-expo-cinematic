"use client";

import { useMemo } from "react";
import { daysOverdue } from "@/lib/portal/finance";
import { dueFollowUps } from "@/lib/portal/metrics";
import { useExhibition } from "./ExhibitionProvider";
import { useNow, usePortal } from "./PortalProvider";

/** The day's to-do counts for the signed-in person: follow-ups, their tasks, overdue invoices. */
export function useToday() {
  const { user, can } = usePortal();
  const x = useExhibition();
  const now = useNow();
  return useMemo(() => {
    if (!now) return { followUps: 0, myTasksDue: 0, myOpenTasks: 0, overdueInvoices: 0, overdueAmount: 0 };
    const today = new Date(now);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const followUps = dueFollowUps(x.deals, today).length;
    const mine = x.tasks.filter((t) => t.assignee_id === user.id && t.status !== "done" && t.status !== "cancelled");
    const myTasksDue = mine.filter((t) => t.due_at && new Date(t.due_at) <= end).length;
    let overdueInvoices = 0;
    let overdueAmount = 0;
    if (can.finance) {
      for (const i of x.invoices) {
        if (i.status !== "issued" && i.status !== "registered") continue;
        const balance = x.invoiceTotalsById.get(i.id)?.balance ?? 0;
        if (balance > 0 && daysOverdue(i, today) > 0) {
          overdueInvoices += 1;
          overdueAmount += balance;
        }
      }
    }
    return { followUps, myTasksDue, myOpenTasks: mine.length, overdueInvoices, overdueAmount };
  }, [now, x.deals, x.tasks, x.invoices, x.invoiceTotalsById, user.id, can.finance]);
}
