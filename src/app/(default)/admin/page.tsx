import type { Metadata } from "next";
import { AdminPanel } from "@/components/AdminPanel";

export const metadata: Metadata = {
  title: "Aratta Admin | Content Operations",
  description: "Private content operations workspace for the Aratta Expo cinematic website.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminPanel />;
}
