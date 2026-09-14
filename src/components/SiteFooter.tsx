import Link from "next/link";
import type { SiteContent } from "@/data/aratta-content";
export function SiteFooter({ content }: { content: SiteContent }) {
  return (
    <footer className="border-t border-white/10 py-10">
      <div className="section-shell">
        <nav
          aria-label={
            content.lang === "fa" ? "پیوندهای پایین صفحه" : "Footer navigation"
          }
          className="mb-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/75"
        >
          {["about", "exhibitions", "forms", "news", "gallery", "contact"].map(
            (id) => (
              <Link
                key={id}
                className="min-h-11 py-3 hover:text-[var(--gold)]"
                href={`/${content.lang}/${id}`}
              >
                {content.nav.find((n) => n.id === id)?.label}
              </Link>
            ),
          )}
          <Link
            className="min-h-11 py-3 hover:text-[var(--gold)]"
            href={`/${content.lang}/archive`}
          >
            {content.lang === "fa" ? "آرشیو کامل" : "Complete archive"}
          </Link>
        </nav>
        <div className="flex flex-col gap-4 text-sm text-white/50 md:flex-row md:justify-between">
          <p>{content.footer.copyright}</p>
          <p className="font-latin">{content.footer.credit}</p>
        </div>
      </div>
    </footer>
  );
}
