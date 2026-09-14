import type { Metadata } from "next";
import { DocumentShell, getRootMetadata } from "@/components/DocumentShell";
import "../globals.css";

export const metadata: Metadata = getRootMetadata("fa");

export default function DefaultLayout({ children }: { children: React.ReactNode }) {
  return <DocumentShell lang="fa">{children}</DocumentShell>;
}
