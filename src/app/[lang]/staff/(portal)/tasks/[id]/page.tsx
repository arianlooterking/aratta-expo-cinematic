import type { Metadata } from "next";
import { Suspense } from "react";
import { Tasks } from "@/components/portal/tasks/Tasks";

export const metadata: Metadata = { title: "Aratta Staff · Task" };

/** A task opened from a notification or link: the board with that task's sheet open. */
export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <Tasks openId={id} />
    </Suspense>
  );
}
