import type { Metadata } from "next";
import { Suspense } from "react";
import { MapWorkspace } from "@/components/portal/map/MapWorkspace";

export const metadata: Metadata = { title: "Aratta Staff · Hall map" };

export default function MapPage() {
  return (
    <Suspense>
      <MapWorkspace />
    </Suspense>
  );
}
