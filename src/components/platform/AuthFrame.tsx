import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import type { Lang } from "@/lib/lang";
import { getBrandAssets } from "@/lib/brand-assets";

const copy = {
  fa: {
    eyebrow: "پورتال کارکنان",
    title: "مرکز عملیات نمایشگاهی اَرَتَ",
    lead: "نقشه سالن ها، فروش غرفه، پیش فاکتور و وصول، تجهیزات و تحویل، و کارهای تیم؛ همه در یک فضای مشترک و زنده.",
    highlights: ["تغییرات هم زمان برای همه همکاران", "دسترسی بر اساس نقش", "ثبت کامل تاریخچه تغییرات"],
  },
  en: {
    eyebrow: "Staff portal",
    title: "Aratta Exhibition Operations",
    lead: "Hall plans, booth sales, invoices and collections, equipment hand-over and team tasks in one shared, live workspace.",
    highlights: ["Live updates for every colleague", "Role-based access", "Full change history"],
  },
} as const;

/** The page around the sign-in and password cards: brand on one side, the card on the other. */
export function AuthFrame({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const t = copy[lang];
  const brand = getBrandAssets(lang);
  return (
    <main className="min-h-dvh bg-[#071713] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-[#e8f4ed]">
      <div className="mx-auto grid min-h-dvh max-w-6xl content-center items-center gap-8 px-4 py-8 sm:gap-10 sm:px-8 sm:py-10 lg:grid-cols-[1.1fr_minmax(0,28rem)] lg:gap-16">
        <section className="space-y-6 sm:space-y-8">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <Image src={brand.tab} alt="" width={40} height={40} className="h-10 w-10 object-contain" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-wide text-[#e3bd77]">ARATTA EXPO</p>
              <p className="text-xs text-[#b5c9bf]">{t.eyebrow}</p>
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-bold leading-snug text-white sm:text-4xl">{t.title}</h1>
            <p className="max-w-xl text-base text-[#b5c9bf] sm:text-lg">{t.lead}</p>
          </div>
          <ul className="hidden gap-3 sm:grid sm:grid-cols-3">
            {t.highlights.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[#d6e5dd]"
              >
                <ShieldCheck aria-hidden className="h-4 w-4 shrink-0 text-[#e3bd77]" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[1.75rem] bg-[#fbfbf7] p-6 text-[#10211d] shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-8">
          {children}
        </section>
      </div>
    </main>
  );
}

const fieldClass =
  "h-12 w-full rounded-xl border border-[#10211d]/15 bg-white px-3.5 text-base text-[#10211d] shadow-sm outline-none transition placeholder:text-[#9aa5a0] focus:border-[#198ba0] focus:ring-2 focus:ring-[#198ba0]/25 disabled:opacity-60";

/** A labelled input on the light sign-in card. 16px text so phones don't zoom on focus. */
export function AuthField({
  label,
  hint,
  trailing,
  ...input
}: { label: string; hint?: string; trailing?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {/* Same direction as the input, so the trailing button and its padding land on the same side. */}
      <span className="relative block" dir={input.dir}>
        <input {...input} className={trailing ? `${fieldClass} pe-12` : fieldClass} />
        {trailing ? <span className="absolute inset-y-0 end-1.5 flex items-center">{trailing}</span> : null}
      </span>
      {hint ? <span className="block text-xs leading-relaxed text-[#65726d]">{hint}</span> : null}
    </label>
  );
}

export const authPrimaryButton =
  "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0e5d4c] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b4c3e] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#198ba0]";
