"use client";

import { Mail, Send } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { SiteContent } from "@/data/aratta-content";

type InquiryFormProps = {
  content: SiteContent;
  compact?: boolean;
};

type FormState = {
  name: string;
  company: string;
  email: string;
  phone: string;
  interest: string;
  message: string;
  website: string;
};

const initialState: FormState = {
  name: "",
  company: "",
  email: "",
  phone: "",
  interest: "",
  message: "",
  website: "",
};

export function InquiryForm({ content, compact = false }: InquiryFormProps) {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const fields = content.registration.fields;

  const mailto = useMemo(() => {
    const subject = encodeURIComponent(
      content.lang === "fa"
        ? `درخواست غرفه - ${form.company || form.name}`
        : `Booth inquiry - ${form.company || form.name}`,
    );
    const body = encodeURIComponent(
      [
        `${fields.name}: ${form.name}`,
        `${fields.company}: ${form.company}`,
        `${fields.email}: ${form.email}`,
        `${fields.phone}: ${form.phone}`,
        `${fields.interest}: ${form.interest}`,
        "",
        `${fields.message}:`,
        form.message,
      ].join("\n"),
    );
    return `mailto:info@arattaexpo.ir?subject=${subject}&body=${body}`;
  }, [content.lang, fields, form]);

  function update(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const hasValidEmail = /\S+@\S+\.\S+/.test(form.email);
    if (form.website || !form.name.trim() || !hasValidEmail || form.message.trim().length < 12) {
      setStatus("error");
      return;
    }

    setStatus("success");
    window.location.href = mailto;
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <div className="sr-only">
        <label htmlFor="website">{fields.honeypot}</label>
        <input
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(event) => update("website", event.target.value)}
        />
      </div>

      <div className={compact ? "grid gap-4" : "grid gap-4 md:grid-cols-2"}>
        <Field
          label={fields.name}
          value={form.name}
          onChange={(value) => update("name", value)}
          autoComplete="name"
          required
        />
        <Field
          label={fields.company}
          value={form.company}
          onChange={(value) => update("company", value)}
          autoComplete="organization"
        />
        <Field
          label={fields.email}
          value={form.email}
          onChange={(value) => update("email", value)}
          type="email"
          autoComplete="email"
          required
        />
        <Field
          label={fields.phone}
          value={form.phone}
          onChange={(value) => update("phone", value)}
          type="tel"
          autoComplete="tel"
        />
      </div>

      <Field
        label={fields.interest}
        value={form.interest}
        onChange={(value) => update("interest", value)}
      />
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-white/82">{fields.message}</span>
        <textarea
          required
          minLength={12}
          rows={compact ? 4 : 5}
          value={form.message}
          onChange={(event) => update("message", event.target.value)}
          className="min-h-32 rounded-3xl border border-white/12 bg-black/28 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-200/60 focus:ring-4 focus:ring-cyan-200/10"
        />
      </label>

      <button
        type="submit"
        className="liquid-button inline-flex items-center justify-center gap-3 rounded-full px-6 py-3 font-bold text-white"
      >
        <Send size={18} />
        {fields.submit}
      </button>

      <div aria-live="polite" className="min-h-6">
        {status === "error" ? (
          <p className="text-sm text-[var(--danger)]">{fields.error}</p>
        ) : null}
        {status === "success" ? (
          <p className="inline-flex items-center gap-2 text-sm text-[var(--success)]">
            <Mail size={16} />
            {fields.success}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const id = label.replace(/\s+/g, "-").toLowerCase();

  return (
    <label htmlFor={id} className="grid gap-2">
      <span className="text-sm font-semibold text-white/82">{label}</span>
      <input
        id={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-full border border-white/12 bg-black/28 px-4 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-200/60 focus:ring-4 focus:ring-cyan-200/10"
      />
    </label>
  );
}
