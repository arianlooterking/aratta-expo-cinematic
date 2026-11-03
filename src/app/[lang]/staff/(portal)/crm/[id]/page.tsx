import type { Metadata } from "next";
import { CompanyDetail } from "@/components/portal/crm/CompanyDetail";

export const metadata: Metadata = { title: "Aratta Staff · Company" };

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CompanyDetail id={id} />;
}
