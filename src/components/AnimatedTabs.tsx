"use client";

import { motion } from "framer-motion";
import { Cpu, FileText, Handshake, Images } from "lucide-react";
import { useState } from "react";
import type { SiteContent } from "@/data/aratta-content";
import { cn } from "@/lib/cn";

const icons = [Handshake, FileText, Cpu, Images];

type AnimatedTabsProps = {
  content: SiteContent;
};

export function AnimatedTabs({ content }: AnimatedTabsProps) {
  const [active, setActive] = useState(0);
  const current = content.services.items[active];
  const Icon = icons[active] ?? Handshake;

  return (
    <section id="forms" className="py-24">
      <div className="section-shell">
        <div className="mb-10 max-w-3xl">
          <div className="section-kicker">{content.services.kicker}</div>
          <h2 className="mt-4 text-4xl font-black text-white sm:text-5xl">
            {content.services.title}
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.86fr_1.14fr]">
          <div className="grid gap-3">
            {content.services.items.map((item, index) => {
              const RowIcon = icons[index] ?? Handshake;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setActive(index)}
                  className={cn(
                    "group flex items-center gap-4 rounded-3xl border p-4 text-start transition",
                    active === index
                      ? "border-cyan-200/45 bg-cyan-200/10 text-white"
                      : "border-white/10 bg-white/[0.035] text-white/68 hover:border-white/20 hover:bg-white/[0.065]",
                  )}
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/12 bg-black/25 text-[var(--gold)]">
                    <RowIcon size={22} />
                  </span>
                  <span>
                    <span className="block font-bold">{item.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-white/52">
                      {item.body.slice(0, 92)}
                      {item.body.length > 92 ? "..." : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <motion.div
            key={current.title}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: "easeOut" }}
            className="industrial-card relative overflow-hidden rounded-[2rem] p-8"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(62,231,255,0.16),transparent_20rem),radial-gradient(circle_at_80%_60%,rgba(216,180,106,0.12),transparent_18rem)]" />
            <div className="relative">
              <div className="grid h-16 w-16 place-items-center rounded-3xl border border-white/15 bg-white/10 text-[var(--cyan)]">
                <Icon size={30} />
              </div>
              <h3 className="mt-8 text-3xl font-black text-white">{current.title}</h3>
              <p className="mt-4 max-w-2xl text-lg leading-9 text-white/70">{current.body}</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {["Brief", "Plan", "Operate"].map((label) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">
                      {label}
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-white/10">
                      <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[var(--cyan)] to-[var(--gold)]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
