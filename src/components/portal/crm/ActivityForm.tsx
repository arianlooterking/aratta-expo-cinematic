"use client";

import { useState } from "react";
import { pick, sep } from "@/lib/portal/format";
import { activityKindLabel } from "@/lib/portal/labels";
import { newId } from "@/lib/portal/store";
import type { Company } from "@/lib/portal/types";
import { useExhibition } from "../ExhibitionProvider";
import { DateQuick, PickerField, dayToIso } from "../fields";
import { useCollection, usePortal } from "../PortalProvider";
import { Button, Field, Input, Segmented, Select, Sheet, Textarea } from "../ui";

const KINDS = ["call", "meeting", "message", "visit", "email", "note"] as const;

/** Log a call, meeting or note against a company and set the next follow-up. */
export function ActivityForm({ open, onClose, company }: { open: boolean; onClose: () => void; company?: Company | null }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  return (
    <Sheet open={open} onClose={onClose} closeLabel={fa ? "بستن" : "Close"} title={fa ? "ثبت تماس یا گفتگو" : "Log a conversation"}>
      {open ? <Body company={company ?? null} onClose={onClose} /> : null}
    </Sheet>
  );
}

function Body({ company: preset, onClose }: { company: Company | null; onClose: () => void }) {
  const { lang, store, toast, user } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const [company, setCompany] = useState<Company | null>(preset);
  const [kind, setKind] = useState<(typeof KINDS)[number]>("call");
  const [follow, setFollow] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const contacts = useCollection("contacts", company ? { column: "company_id", value: company.id } : null, Boolean(company));
  const deal = company ? (x.deals.find((d) => d.company_id === company.id && d.stage !== "lost") ?? null) : null;

  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!company) return;
        const f = new FormData(e.currentTarget);
        const summary = String(f.get("summary") ?? "").trim() || activityKindLabel[kind][lang];
        setBusy(true);
        const nextIso = dayToIso(follow);
        const res = await store.insert("activities", {
          id: newId(),
          company_id: company.id,
          deal_id: deal?.id ?? null,
          contact_id: String(f.get("contact_id") || "") || null,
          kind,
          summary,
          body: String(f.get("body") ?? "").trim() || null,
          outcome: String(f.get("outcome") ?? "").trim() || null,
          next_follow_up_at: nextIso,
          author_id: user.id,
        });
        // A follow-up date also goes on the deal, where the pipeline and reminders read it.
        if (res.ok && deal && nextIso) await store.update("deals", deal.id, { next_follow_up_at: nextIso });
        setBusy(false);
        if (res.ok) {
          toast(fa ? "ثبت شد" : "Logged");
          onClose();
        }
      }}
    >
      <Field label={fa ? "شرکت" : "Company"}>
        <PickerField
          value={company}
          items={x.companies}
          getKey={(c) => c.id}
          getLabel={(c) => pick(lang, c.name_fa, c.name_en)}
          getHint={(c) => c.city}
          onChange={setCompany}
          placeholder={fa ? "انتخاب شرکت" : "Choose a company"}
          emptyText={fa ? "شرکتی پیدا نشد" : "No company found"}
        />
      </Field>
      <Segmented
        size="sm"
        className="flex-wrap"
        value={kind}
        onChange={setKind}
        options={KINDS.map((k) => ({ value: k, label: activityKindLabel[k][lang] }))}
      />
      {contacts.rows.length ? (
        <Field label={fa ? "با چه کسی" : "With whom"}>
          <Select name="contact_id" defaultValue={contacts.rows.find((c) => c.is_primary)?.id ?? contacts.rows[0]?.id}>
            {contacts.rows.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
                {c.job_title ? `${sep(lang)}${c.job_title}` : ""}
              </option>
            ))}
            <option value="">{fa ? "نامشخص" : "Not recorded"}</option>
          </Select>
        </Field>
      ) : null}
      <Field label={fa ? "خلاصه" : "Summary"}>
        <Input name="summary" placeholder={fa ? "مثلاً: درخواست پیش فاکتور غرفه ۳۶ متری" : "e.g. Asked for a quote for a 36 m² booth"} />
      </Field>
      <Field label={fa ? "جزئیات" : "Details"}>
        <Textarea name="body" />
      </Field>
      <Field label={fa ? "نتیجه" : "Outcome"}>
        <Input name="outcome" placeholder={fa ? "مثلاً: منتظر تایید مدیرعامل" : "e.g. Waiting for the CEO's approval"} />
      </Field>
      <DateQuick label={fa ? "پیگیری بعدی" : "Next follow-up"} value={follow} onChange={setFollow} />
      {!deal && company ? (
        <p className="text-xs text-p-ink-3">{fa ? "این شرکت در نمایشگاه فعلی پرونده فروش ندارد؛ گفتگو فقط در تاریخچه شرکت ثبت می شود." : "This company has no deal in the current exhibition, so this only goes into its history."}</p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button tone="ghost" onClick={onClose}>
          {fa ? "انصراف" : "Cancel"}
        </Button>
        <Button tone="primary" type="submit" disabled={!company || busy}>
          {fa ? "ثبت" : "Log it"}
        </Button>
      </div>
    </form>
  );
}
