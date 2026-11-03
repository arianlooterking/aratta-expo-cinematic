import type { Metadata } from "next";
import { Handover } from "@/components/portal/Handover";

export const metadata: Metadata = { title: "Aratta Staff · Handover" };

export default function HandoverPage() {
  return <Handover />;
}
