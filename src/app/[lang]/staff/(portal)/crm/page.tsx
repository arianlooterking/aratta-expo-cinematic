import type { Metadata } from "next";
import { Companies } from "@/components/portal/crm/Companies";

export const metadata: Metadata = { title: "Aratta Staff · Companies" };

export default function CompaniesPage() {
  return <Companies />;
}
