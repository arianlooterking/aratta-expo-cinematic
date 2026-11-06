import type { Metadata } from "next";
import { Suspense } from "react";
import { Team } from "@/components/portal/team/Team";

export const metadata: Metadata = { title: "Aratta Staff · Team" };

export default function TeamPage() {
  return (
    <Suspense>
      <Team />
    </Suspense>
  );
}
