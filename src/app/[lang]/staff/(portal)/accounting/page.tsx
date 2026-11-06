import type { Metadata } from "next";
import { Suspense } from "react";
import { Accounting } from "@/components/portal/accounting/Accounting";

export const metadata: Metadata = { title: "Aratta Staff · Accounting" };

export default function AccountingPage() {
  return (
    <Suspense>
      <Accounting />
    </Suspense>
  );
}
