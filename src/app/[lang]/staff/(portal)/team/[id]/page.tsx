import type { Metadata } from "next";
import { StaffProfile } from "@/components/portal/team/StaffProfile";

export const metadata: Metadata = { title: "Aratta Staff · Colleague" };

export default async function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StaffProfile id={id} />;
}
