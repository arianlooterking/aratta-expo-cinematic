"use client";

import { Check, CircleDashed, Minus, ShieldCheck } from "lucide-react";
import { roleDescriptions, roleLabels } from "@/lib/platform/labels";
import { num } from "@/lib/portal/format";
import { CAPABILITIES, ROLE_ORDER } from "@/lib/portal/team";
import { useExhibition } from "../ExhibitionProvider";
import { usePortal } from "../PortalProvider";
import { AvatarStack } from "../people";
import { Card } from "../ui";
import { roleIcon } from "./shared";

export function RolesMatrix() {
  const { lang, user, mode } = usePortal();
  const fa = lang === "fa";
  const x = useExhibition();
  const people = (role: string) => x.staff.filter((s) => s.role === role && s.status !== "suspended").map((s) => s.id);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {ROLE_ORDER.map((role) => {
          const Icon = roleIcon[role];
          const ids = people(role);
          return (
            <Card key={role} className={user.role === role ? "border-p-brand p-4" : "p-4"}>
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-xl bg-p-brand-soft text-p-brand">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="text-sm font-semibold">{roleLabels[role][lang]}</span>
                {user.role === role ? <span className="ms-auto text-[11px] text-p-brand">{fa ? "نقش شما" : "Your role"}</span> : null}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-p-ink-3">{roleDescriptions[role][lang]}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-p-ink-2">
                {ids.length ? <AvatarStack ids={ids} size={24} max={4} /> : null}
                {fa ? `${num(lang, ids.length)} نفر` : `${ids.length} ${ids.length === 1 ? "person" : "people"}`}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-p-line bg-p-surface-2 text-xs text-p-ink-3">
                <th className="px-4 py-2.5 text-start font-medium">{fa ? "کار" : "Can"}</th>
                {ROLE_ORDER.map((r) => (
                  <th key={r} className="px-3 py-2.5 text-center font-medium">
                    {roleLabels[r][lang]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-p-line">
              {CAPABILITIES.map((c) => (
                <tr key={c.key}>
                  <td className="px-4 py-2.5">
                    <span className="block">{c.label[lang]}</span>
                    {c.note ? <span className="block text-[11px] text-p-ink-3">{c.note[lang]}</span> : null}
                  </td>
                  {ROLE_ORDER.map((r) => {
                    const a = c.access(r);
                    return (
                      <td key={r} className="px-3 py-2.5 text-center">
                        {a === "yes" ? (
                          <Check className="mx-auto size-4 text-p-ok" aria-label={fa ? "بله" : "Yes"} />
                        ) : a === "some" ? (
                          <CircleDashed className="mx-auto size-4 text-p-warn" aria-label={fa ? "با شرط" : "Sometimes"} />
                        ) : (
                          <Minus className="mx-auto size-4 text-p-ink-3/60" aria-label={fa ? "خیر" : "No"} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="flex gap-3 p-4">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-p-brand" aria-hidden />
        <div className="space-y-1.5 text-sm text-p-ink-2">
          <p className="font-semibold text-p-ink">{fa ? "قانون های ثابت" : "Rules that always hold"}</p>
          <ul className="list-disc space-y-1 ps-5 text-[13px]">
            <li>{fa ? "هیچ کس نقش یا وضعیت خودش را تغییر نمی دهد و دسترسی خودش را حذف نمی کند." : "Nobody changes their own role or status, or removes their own access."}</li>
            <li>{fa ? "فقط مالک می تواند مالک تازه تعیین کند یا مالک دیگری را تغییر دهد." : "Only an owner can make someone an owner or change another owner."}</li>
            <li>{fa ? "همیشه دست کم یک مالک فعال باقی می ماند." : "There is always at least one active owner."}</li>
            <li>{fa ? "ورود با ایمیلی است که دعوت شده و گذرواژه خود همکار. مدیر سامانه گذرواژه شروع می دهد و هر کس همان اول آن را عوض می کند." : "Sign-in is the invited email and the colleague's own password. An admin hands out a starting password, and each person replaces it straight away."}</li>
            <li>
              {mode === "live"
                ? fa
                  ? "این قانون ها در خود پایگاه داده اعمال می شوند، نه فقط در صفحه."
                  : "These rules are enforced by the database itself, not only on screen."
                : fa
                  ? "در حالت نمایشی همین قانون ها در مرورگر اجرا می شوند."
                  : "In the demo the same rules run in the browser."}
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
