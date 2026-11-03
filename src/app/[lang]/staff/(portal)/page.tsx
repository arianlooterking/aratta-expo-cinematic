import type { Metadata } from "next";
import { Overview } from "@/components/portal/Overview";

export const metadata: Metadata = { title: "Aratta Staff · Overview" };

export default function OverviewPage() {
  return <Overview />;
}
