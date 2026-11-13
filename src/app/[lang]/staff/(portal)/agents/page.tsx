import type { Metadata } from "next";
import { Agents } from "@/components/portal/agents/Agents";

export const metadata: Metadata = { title: "Aratta Staff · AI agents" };

export default function AgentsPage() {
  return <Agents />;
}
