"use client";

import { useMemo, useState } from "react";
import { pick } from "@/lib/portal/format";
import { companyKindLabel, companyPriorityLabel } from "@/lib/portal/labels";
import { newId } from "@/lib/portal/store";
import type { Company } from "@/lib/portal/types";
import { useExhibition } from "../ExhibitionProvider";
import { usePortal } from "../PortalProvider";
import { normalizeSearch } from "../SearchPalette";
import { Button, Field, Input, Select, Sheet, Textarea } from "../ui";

const KINDS = Object.keys(companyKindLabel) as Array<keyof typeof companyKindLabel>;
const PRIORITIES = Object.keys(companyPriorityLabel) as Array<keyof typeof companyPriorityLabel>;

/** Create or edit a company. A new company can get its first contact person in the same step. */
export function CompanyForm({
  open,
  onClose,
  company,
  initialName,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  company?: Company | null;
  initialName?: string;
  onSaved?: (company: Company) => void;
}) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  return (
    <Sheet
      open={open}
      onClose={onClose}
      closeLabel={fa ? "بستن" : "Close"}
      title={company ? (fa ? "ویرایش شرکت" : "Edit company") : fa ? "شرکت جدید" : "New company"}
      wide
    >
      {open ? <CompanyFormBody company={company ?? null} initialName={initialName} onClose={onClose} onSaved={onSaved} /> : null}
    </Sheet>
  );
}

/** The form itself, for flows that show it inside their own sheet (e.g. a new sales file). */
export function CompanyFormBody({
  company,
  initialName,
  onClose,
  onSaved,
}: {
  company: Company | null;
  initialName?: string;
  onClose: () => void;
  onSaved?: (company: Company) => void;
}) {
  const { lang, store, toast, user } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const [name, setName] = useState(company?.name_fa ?? initialName ?? "");
  const [busy, setBusy] = useState(false);

  const similar = useMemo(() => {
    const q = normalizeSearch(name);
    if (q.length < 2) return [];
    return x.companies.filter((c) => c.id !== company?.id && normalizeSearch(`${c.name_fa} ${c.name_en ?? ""}`).includes(q)).slice(0, 3);
  }, [name, x.companies, company?.id]);

  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const get = (k: string) => String(f.get(k) ?? "").trim() || null;
        const nameFa = get("name_fa");
        if (!nameFa) return;
        setBusy(true);
        const fields = {
          name_fa: nameFa,
          name_en: get("name_en"),
          kind: (get("kind") ?? "exhibitor") as Company["kind"],
          priority: get("priority") ?? "normal",
          sector: get("sector"),
          city: get("city"),
          phone: get("phone"),
          email: get("email"),
          website: get("website"),
          address: get("address"),
          legal_name: get("legal_name"),
          national_id: get("national_id"),
          economic_code: get("economic_code"),
          owner_id: get("owner_id"),
          tags: (get("tags") ?? "")
            .split(/[،,]/)
            .map((t) => t.trim())
            .filter(Boolean),
          notes: get("notes"),
        };
        const res = company ? await store.update("companies", company.id, fields) : await store.insert("companies", { id: newId(), ...fields, owner_id: fields.owner_id ?? user.id });
        if (res.ok && res.row && !company) {
          const contactName = get("contact_name");
          const contactPhone = get("contact_phone");
          if (contactName || contactPhone) {
            await store.insert("contacts", {
              id: newId(),
              company_id: res.row.id,
              full_name: contactName ?? (fa ? "مسئول هماهنگی" : "Main contact"),
              phone: contactPhone,
              job_title: get("contact_title"),
              is_primary: true,
            });
          }
        }
        setBusy(false);
        if (res.ok && res.row) {
          toast(company ? (fa ? "ذخیره شد" : "Saved") : fa ? "شرکت ثبت شد" : "Company added");
          onSaved?.(res.row);
          onClose();
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={fa ? "نام شرکت (فارسی) *" : "Company name (Persian) *"}>
          <Input name="name_fa" dir="rtl" required value={name} onChange={(e) => setName(e.target.value)} autoFocus autoComplete="organization" />
        </Field>
        <Field label={fa ? "نام انگلیسی" : "Name in English"}>
          <Input name="name_en" dir="ltr" defaultValue={company?.name_en ?? ""} />
        </Field>
      </div>
      {similar.length ? (
        <div className="rounded-xl bg-p-warn-soft px-3 py-2 text-xs text-p-warn">
          <p className="font-semibold">{fa ? "شرکت های مشابه ثبت شده:" : "Similar companies already exist:"}</p>
          <p className="mt-0.5">{similar.map((c) => pick(lang, c.name_fa, c.name_en)).join(fa ? "، " : ", ")}</p>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label={fa ? "نوع" : "Type"}>
          <Select name="kind" defaultValue={company?.kind ?? "exhibitor"}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {companyKindLabel[k][lang]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={fa ? "اهمیت" : "Priority"}>
          <Select name="priority" defaultValue={company?.priority ?? "normal"}>
            {PRIORITIES.map((k) => (
              <option key={k} value={k}>
                {companyPriorityLabel[k][lang]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={fa ? "کارشناس مسئول" : "Account owner"} className="col-span-2 sm:col-span-1">
          <Select name="owner_id" defaultValue={company?.owner_id ?? user.id}>
            <option value="">{fa ? "بدون مسئول" : "Nobody yet"}</option>
            {x.staff
              .filter((s) => s.status !== "suspended")
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name ?? s.email}
                </option>
              ))}
          </Select>
        </Field>
        <Field label={fa ? "حوزه کاری" : "Sector"}>
          <Input name="sector" defaultValue={company?.sector ?? ""} />
        </Field>
        <Field label={fa ? "شهر" : "City"}>
          <Input name="city" defaultValue={company?.city ?? (company ? "" : fa ? "کرمان" : "Kerman")} />
        </Field>
        <Field label={fa ? "تلفن" : "Phone"}>
          <Input name="phone" dir="ltr" inputMode="tel" defaultValue={company?.phone ?? ""} />
        </Field>
        <Field label={fa ? "ایمیل" : "Email"}>
          <Input name="email" dir="ltr" type="email" defaultValue={company?.email ?? ""} />
        </Field>
        <Field label={fa ? "وب سایت" : "Website"} className="col-span-2 sm:col-span-2">
          <Input name="website" dir="ltr" inputMode="url" defaultValue={company?.website ?? ""} />
        </Field>
      </div>
      <Field label={fa ? "نشانی" : "Address"}>
        <Input name="address" defaultValue={company?.address ?? ""} />
      </Field>
      <details className="rounded-2xl border border-p-line p-3" open={Boolean(company?.legal_name || company?.national_id || company?.economic_code)}>
        <summary className="cursor-pointer text-[13px] font-semibold text-p-ink-2">{fa ? "مشخصات رسمی برای فاکتور" : "Official details for invoices"}</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label={fa ? "نام ثبتی" : "Registered name"}>
            <Input name="legal_name" defaultValue={company?.legal_name ?? ""} />
          </Field>
          <Field label={fa ? "شناسه ملی" : "National ID"}>
            <Input name="national_id" dir="ltr" inputMode="numeric" defaultValue={company?.national_id ?? ""} />
          </Field>
          <Field label={fa ? "کد اقتصادی" : "Economic code"}>
            <Input name="economic_code" dir="ltr" inputMode="numeric" defaultValue={company?.economic_code ?? ""} />
          </Field>
        </div>
      </details>
      {!company ? (
        <fieldset className="grid gap-3 rounded-2xl border border-p-line p-3 sm:grid-cols-3">
          <legend className="px-1 text-xs font-semibold text-p-ink-3">{fa ? "فرد رابط (اختیاری)" : "Contact person (optional)"}</legend>
          <Field label={fa ? "نام و نام خانوادگی" : "Full name"}>
            <Input name="contact_name" autoComplete="name" />
          </Field>
          <Field label={fa ? "موبایل" : "Mobile"}>
            <Input name="contact_phone" dir="ltr" inputMode="tel" />
          </Field>
          <Field label={fa ? "سمت" : "Job title"}>
            <Input name="contact_title" />
          </Field>
        </fieldset>
      ) : null}
      <Field label={fa ? "برچسب ها" : "Tags"} hint={fa ? "با ویرگول جدا کنید" : "Separate with commas"}>
        <Input name="tags" defaultValue={company?.tags.join(fa ? "، " : ", ") ?? ""} />
      </Field>
      <Field label={fa ? "یادداشت" : "Notes"}>
        <Textarea name="notes" defaultValue={company?.notes ?? ""} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button tone="ghost" onClick={onClose}>
          {fa ? "انصراف" : "Cancel"}
        </Button>
        <Button tone="primary" type="submit" disabled={busy}>
          {company ? (fa ? "ذخیره" : "Save") : fa ? "ثبت شرکت" : "Add company"}
        </Button>
      </div>
    </form>
  );
}
