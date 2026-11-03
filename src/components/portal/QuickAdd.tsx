"use client";

import { Building2, HandCoins, ListTodo, PhoneCall, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { ActivityForm } from "./crm/ActivityForm";
import { CompanyForm } from "./crm/CompanyForm";
import { PaymentForm } from "./accounting/PaymentForm";
import { TaskForm } from "./tasks/TaskForm";
import { usePortal } from "./PortalProvider";
import { IconButton, Kbd, MenuItem, Popover } from "./ui";

type Kind = "company" | "call" | "payment" | "task";

/** One button to add the everyday records from any page. */
export function QuickAdd({ variant }: { variant: "sidebar" | "icon" }) {
  const { lang, can } = usePortal();
  const fa = lang === "fa";
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState<Kind | null>(null);
  const choose = (k: Kind) => {
    setMenu(false);
    setOpen(k);
  };
  if (!can.edit) return null;
  return (
    <div className="relative">
      {variant === "sidebar" ? (
        <button
          type="button"
          data-tour="quick-add"
          onClick={() => setMenu((m) => !m)}
          aria-expanded={menu}
          className="flex h-10 w-full items-center gap-2.5 rounded-xl bg-[#e3bd77] px-3 text-sm font-semibold text-[#0b1d18] transition-[filter] hover:brightness-105"
        >
          <Plus className="size-[18px]" />
          <span className="flex-1 text-start">{fa ? "ثبت سریع" : "Quick add"}</span>
          <span className="text-[11px] font-medium opacity-70">N</span>
        </button>
      ) : (
        <IconButton label={fa ? "ثبت سریع" : "Quick add"} data-tour="quick-add" onClick={() => setMenu((m) => !m)} active={menu}>
          <Plus className="size-5" />
        </IconButton>
      )}
      <Popover open={menu} onClose={() => setMenu(false)} align={variant === "sidebar" ? "start" : "end"} className={cn(variant === "sidebar" && "w-full")}>
        <MenuItem icon={<Building2 className="size-4" />} onClick={() => choose("company")} hint={<Kbd>C</Kbd>}>
          {fa ? "شرکت جدید" : "New company"}
        </MenuItem>
        <MenuItem icon={<PhoneCall className="size-4" />} onClick={() => choose("call")} hint={<Kbd>L</Kbd>}>
          {fa ? "ثبت تماس یا گفتگو" : "Log a call"}
        </MenuItem>
        {can.finance ? (
          <MenuItem icon={<HandCoins className="size-4" />} onClick={() => choose("payment")} hint={<Kbd>P</Kbd>}>
            {fa ? "ثبت دریافتی" : "Record a payment"}
          </MenuItem>
        ) : null}
        <MenuItem icon={<ListTodo className="size-4" />} onClick={() => choose("task")} hint={<Kbd>T</Kbd>}>
          {fa ? "کار جدید" : "New task"}
        </MenuItem>
      </Popover>
      {variant === "sidebar" ? <QuickKeys onOpen={setOpen} /> : null}
      <CompanyForm open={open === "company"} onClose={() => setOpen(null)} />
      <ActivityForm open={open === "call"} onClose={() => setOpen(null)} />
      {can.finance ? <PaymentForm open={open === "payment"} onClose={() => setOpen(null)} /> : null}
      <TaskForm open={open === "task"} onClose={() => setOpen(null)} />
    </div>
  );
}

/** N then C/L/P/T opens a form, outside text fields. */
function QuickKeys({ onOpen }: { onOpen: (k: Kind) => void }) {
  const { can } = usePortal();
  useQuickKeys(onOpen, can.finance);
  return null;
}

function useQuickKeys(onOpen: (k: Kind) => void, finance: boolean) {
  const armed = useRef(0);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (t && (t.closest("input, textarea, select, [contenteditable]") || t.closest("[role=dialog]")))) return;
      const k = e.key.toLowerCase();
      if (k === "n") {
        armed.current = Date.now();
        return;
      }
      if (Date.now() - armed.current > 1500) return;
      const map: Record<string, Kind> = { c: "company", l: "call", t: "task", ...(finance ? { p: "payment" as const } : {}) };
      if (map[k]) {
        // Capture phase, so the map's own tool keys don't also fire.
        e.preventDefault();
        e.stopImmediatePropagation();
        armed.current = 0;
        onOpen(map[k]);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onOpen, finance]);
}
