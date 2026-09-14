"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

type StaffErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function StaffError({ reset }: StaffErrorProps) {
  const params = useParams<{ lang?: string }>();
  const locale = params.lang === "en" ? "en" : "fa";
  const copy =
    locale === "fa"
      ? {
          eyebrow: "پورتال کارکنان / Staff portal",
          title: "بارگذاری فضای عملیات ممکن نشد",
          body: "فضای عملیات بارگذاری نشد. دوباره تلاش کنید یا به وب‌سایت فارسی برگردید.",
          retry: "تلاش دوباره",
          back: "بازگشت به سایت",
        }
      : {
          eyebrow: "Staff portal / Operations prototype",
          title: "The operations workspace could not be loaded",
          body: "Try loading the route again, or return to the English public website.",
          retry: "Try again",
          back: "Back to site",
        };
  return (
    <main
      className="grid min-h-screen place-items-center bg-[#f2f4f0] px-5 py-12 text-[#10231b]"
      dir={locale === "fa" ? "rtl" : "ltr"}
      lang={locale}
    >
      <section
        className="w-full max-w-xl rounded-3xl border border-black/8 bg-white p-7 shadow-[0_24px_80px_rgba(16,35,27,0.12)] sm:p-10"
        role="alert"
      >
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-xl text-amber-900">
          !
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-[#8b6b26]">
          {copy.eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          {copy.title}
        </h1>
        <p className="mt-3 leading-7 text-black/58">
          {copy.body}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="min-h-11 rounded-xl bg-[#10231b] px-5 py-3 font-bold text-white transition hover:bg-[#1b3b2e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b6b26]"
          >
            {copy.retry}
          </button>
          <Link
            href={"/" + locale}
            className="min-h-11 rounded-xl border border-black/12 px-5 py-3 text-center font-bold transition hover:bg-black/[0.035] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b6b26]"
          >
            {copy.back}
          </Link>
        </div>
      </section>
    </main>
  );
}
