import type { Metadata } from "next";
import { Suspense } from "react";
import { Pipeline } from "@/components/portal/crm/Pipeline";

export const metadata: Metadata = { title: "Aratta Staff · Pipeline" };

export default function PipelinePage() {
  return (
    <Suspense>
      <Pipeline />
    </Suspense>
  );
}
