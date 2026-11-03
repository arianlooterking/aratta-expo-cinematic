import type { Metadata } from "next";
import { Suspense } from "react";
import { NewInvoice } from "@/components/portal/accounting/InvoiceEditor";

export const metadata: Metadata = { title: "Aratta Staff · New invoice" };

export default function NewInvoicePage() {
  return (
    <Suspense>
      <NewInvoice />
    </Suspense>
  );
}
