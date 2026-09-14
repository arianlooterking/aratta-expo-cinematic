import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentShell, getRootMetadata } from "@/components/DocumentShell";
import { isLang, languages } from "@/lib/lang";
import "../globals.css";

type LanguageLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return languages.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LanguageLayoutProps): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? getRootMetadata(lang) : {};
}

export default async function LanguageLayout({
  children,
  params,
}: LanguageLayoutProps) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return <DocumentShell lang={lang}>{children}</DocumentShell>;
}
