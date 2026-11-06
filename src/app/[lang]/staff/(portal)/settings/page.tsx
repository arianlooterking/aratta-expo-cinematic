import type { Metadata } from "next";
import { ExhibitionSettings } from "@/components/portal/settings/ExhibitionSettings";

export const metadata: Metadata = { title: "Aratta Staff · Settings" };

export default function SettingsPage() {
  return <ExhibitionSettings />;
}
