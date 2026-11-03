import type { Metadata } from "next";
import { InvoiceEditor } from "@/components/portal/accounting/InvoiceEditor";

export const metadata: Metadata = { title: "Aratta Staff · Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoiceEditor id={id} />;
}
