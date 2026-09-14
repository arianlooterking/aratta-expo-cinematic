export default function StaffLoading() {
  return (
    <main
      className="min-h-screen bg-[#f2f4f0] text-[#10231b]"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">
        در حال آماده سازی پورتال کارکنان — Preparing the staff portal
      </span>

      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-e border-black/8 bg-[#10231b] p-6 lg:block">
          <div className="h-10 w-36 animate-pulse rounded-lg bg-white/12 motion-reduce:animate-none" />
          <div className="mt-10 space-y-3">
            {Array.from({ length: 7 }, (_, index) => (
              <div
                key={index}
                className="h-11 animate-pulse rounded-xl bg-white/[0.07] motion-reduce:animate-none"
              />
            ))}
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="border-b border-black/8 bg-white/75 px-5 py-5 backdrop-blur-xl sm:px-8">
            <div className="mx-auto flex max-w-[96rem] items-center justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b6b26]">
                  مرکز عملیات / Operations center
                </p>
                <div className="mt-2 h-8 w-56 animate-pulse rounded-lg bg-black/10 motion-reduce:animate-none" />
              </div>
              <div className="h-10 w-28 animate-pulse rounded-full bg-black/8 motion-reduce:animate-none" />
            </div>
          </header>

          <div className="mx-auto max-w-[96rem] p-5 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="rounded-2xl border border-black/8 bg-white p-5">
                  <div className="h-3 w-24 animate-pulse rounded bg-black/10 motion-reduce:animate-none" />
                  <div className="mt-5 h-9 w-16 animate-pulse rounded bg-[#8b6b26]/20 motion-reduce:animate-none" />
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.7fr)]">
              <div className="min-h-[28rem] rounded-2xl border border-black/8 bg-white p-5">
                <div className="h-5 w-48 animate-pulse rounded bg-black/10 motion-reduce:animate-none" />
                <div className="mt-6 grid h-[22rem] place-items-center rounded-xl border border-dashed border-black/10 bg-[#f7f8f5]">
                  <div className="h-16 w-16 animate-pulse rounded-full bg-[#8b6b26]/15 motion-reduce:animate-none" />
                </div>
              </div>
              <div className="min-h-[28rem] rounded-2xl border border-black/8 bg-white p-5">
                <div className="h-5 w-40 animate-pulse rounded bg-black/10 motion-reduce:animate-none" />
                <div className="mt-6 space-y-4">
                  {Array.from({ length: 5 }, (_, index) => (
                    <div key={index} className="flex items-center gap-3 border-b border-black/6 pb-4">
                      <div className="h-9 w-9 animate-pulse rounded-full bg-black/8 motion-reduce:animate-none" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-4/5 animate-pulse rounded bg-black/10 motion-reduce:animate-none" />
                        <div className="h-2.5 w-2/5 animate-pulse rounded bg-black/6 motion-reduce:animate-none" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
