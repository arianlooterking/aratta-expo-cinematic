import type { Metadata } from "next";
import { Problems } from "@/components/portal/Problems";

export const metadata: Metadata = { title: "Aratta Staff · Problems" };

export default function ProblemsPage() {
  return <Problems />;
}
