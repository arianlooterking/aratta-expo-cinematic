import type { Metadata } from "next";
import { Suspense } from "react";
import { Tasks } from "@/components/portal/tasks/Tasks";

export const metadata: Metadata = { title: "Aratta Staff · Tasks" };

export default function TasksPage() {
  return (
    <Suspense>
      <Tasks />
    </Suspense>
  );
}
