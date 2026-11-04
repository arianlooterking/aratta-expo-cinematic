import type { Metadata } from "next";
import { Upcoming } from "@/components/portal/Upcoming";

export const metadata: Metadata = { title: "Aratta Staff · Upcoming" };

export default function UpcomingPage() {
  return <Upcoming />;
}
