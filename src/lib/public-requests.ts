// Booth and equipment request drafts for the public website.
// Nothing here talks to a server: each builder only produces the text of an
// email the visitor reviews and sends to the office themselves.

export type RequestLang = "fa" | "en";

export const OFFICE_EMAIL = "info@arattaexpo.ir";

export type Contact = { name: string; company: string; email: string; phone: string };

export type BoothType = "space" | "shell" | "custom" | "unsure";
export type BoothPosition = "any" | "corner" | "island" | "aisle";
export type BoothExtra = "flooring" | "partition" | "furniture" | "power" | "lighting" | "av" | "internet" | "storage" | "design";

export type BoothRequest = Contact & {
  exhibition: string;
  sector: string;
  boothType: BoothType;
  area: number;
  position: BoothPosition;
  extras: BoothExtra[];
  notes: string;
};

export type EquipmentLine = { id: string; label: string; qty: number };

export type EquipmentRequest = Contact & {
  exhibition: string;
  booth: string;
  lines: EquipmentLine[];
  deliveryDay: string;
  notes: string;
};

export const boothTypeLabels: Record<BoothType, { fa: string; en: string; hint: { fa: string; en: string } }> = {
  space: { fa: "فضای خام", en: "Raw space", hint: { fa: "فقط زمین؛ غرفه را خودتان یا سازنده شما می‌سازد.", en: "Floor only; you or your builder build the stand." } },
  shell: { fa: "غرفه پیش ساخته", en: "Shell scheme", hint: { fa: "دیواره، کف پوش، نور و تابلو نام آماده.", en: "Walls, carpet, lighting and a name board ready." } },
  custom: { fa: "غرفه‌سازی اختصاصی", en: "Custom build", hint: { fa: "طراحی و ساخت غرفه توسط تیم اَرَتَ.", en: "Designed and built for you by the Aratta team." } },
  unsure: { fa: "هنوز نمی‌دانم", en: "Not sure yet", hint: { fa: "کارشناس فروش با شما مشورت می‌کند.", en: "A sales advisor will help you choose." } },
};

export const positionLabels: Record<BoothPosition, { fa: string; en: string }> = {
  any: { fa: "فرقی ندارد", en: "No preference" },
  corner: { fa: "نبش (دو بر باز)", en: "Corner (two open sides)" },
  island: { fa: "جزیره (چهار بر باز)", en: "Island (four open sides)" },
  aisle: { fa: "کنار راهروی اصلی", en: "On the main aisle" },
};

export const extraLabels: Record<BoothExtra, { fa: string; en: string }> = {
  flooring: { fa: "کف‌سازی", en: "Flooring" },
  partition: { fa: "پارتیشن", en: "Partitions" },
  furniture: { fa: "مبلمان", en: "Furniture" },
  power: { fa: "برق اضافه", en: "Extra power" },
  lighting: { fa: "نورپردازی", en: "Lighting" },
  av: { fa: "تلویزیون و صوت", en: "Screens and sound" },
  internet: { fa: "اینترنت", en: "Internet" },
  storage: { fa: "انبار کوچک", en: "Storage room" },
  design: { fa: "طراحی گرافیک غرفه", en: "Booth graphics" },
};

export const AREA_PRESETS = [9, 12, 18, 24, 36, 54, 72];

export function validateContact(c: Contact): Array<keyof Contact> {
  const bad: Array<keyof Contact> = [];
  if (c.name.trim().length < 2) bad.push("name");
  if (!/^\S+@\S+\.\S+$/.test(c.email.trim())) bad.push("email");
  if (c.phone.replace(/[^\d۰-۹+]/g, "").length < 7) bad.push("phone");
  return bad;
}

const faDigits = (n: number) => n.toLocaleString("fa-IR");
const n = (lang: RequestLang, v: number) => (lang === "fa" ? faDigits(v) : String(v));

function contactLines(lang: RequestLang, c: Contact) {
  return lang === "fa"
    ? [`نام: ${c.name}`, `شرکت: ${c.company || "-"}`, `ایمیل: ${c.email}`, `تلفن: ${c.phone}`]
    : [`Name: ${c.name}`, `Company: ${c.company || "-"}`, `Email: ${c.email}`, `Phone: ${c.phone}`];
}

export function boothRequestDraft(lang: RequestLang, r: BoothRequest) {
  const fa = lang === "fa";
  const extras = r.extras.map((e) => extraLabels[e][lang]).join(fa ? "، " : ", ") || "-";
  const subject = fa ? `درخواست غرفه - ${r.exhibition} - ${r.company || r.name}` : `Booth request - ${r.exhibition} - ${r.company || r.name}`;
  const body = (
    fa
      ? [
          `نمایشگاه: ${r.exhibition}`,
          `حوزه فعالیت: ${r.sector || "-"}`,
          `نوع غرفه: ${boothTypeLabels[r.boothType].fa}`,
          `متراژ تقریبی: ${n(lang, r.area)} متر مربع`,
          `موقعیت دلخواه: ${positionLabels[r.position].fa}`,
          `خدمات مورد نیاز: ${extras}`,
          "",
          ...contactLines(lang, r),
          "",
          `توضیحات: ${r.notes || "-"}`,
          "",
          "این یک درخواست اولیه است و به معنی تخصیص یا رزرو قطعی غرفه نیست.",
        ]
      : [
          `Exhibition: ${r.exhibition}`,
          `Sector: ${r.sector || "-"}`,
          `Booth type: ${boothTypeLabels[r.boothType].en}`,
          `Approximate area: ${r.area} m²`,
          `Preferred position: ${positionLabels[r.position].en}`,
          `Services needed: ${extras}`,
          "",
          ...contactLines(lang, r),
          "",
          `Notes: ${r.notes || "-"}`,
          "",
          "This is a first request, not a confirmed booth allocation or reservation.",
        ]
  ).join("\n");
  return { subject, body, mailto: mailto(subject, body) };
}

export function equipmentRequestDraft(lang: RequestLang, r: EquipmentRequest) {
  const fa = lang === "fa";
  const lines = r.lines.filter((l) => l.qty > 0);
  const subject = fa
    ? `درخواست تجهیزات غرفه - ${r.booth || r.company || r.name}`
    : `Booth equipment request - ${r.booth || r.company || r.name}`;
  const body = (
    fa
      ? [
          `نمایشگاه: ${r.exhibition}`,
          `کد یا شماره غرفه: ${r.booth || "-"}`,
          `روز تحویل دلخواه: ${r.deliveryDay || "-"}`,
          "",
          "اقلام:",
          ...(lines.length ? lines.map((l) => `- ${l.label}: ${n(lang, l.qty)}`) : ["-"]),
          "",
          ...contactLines(lang, r),
          "",
          `توضیحات: ${r.notes || "-"}`,
          "",
          "لطفا موجودی، هزینه و زمان تحویل را تایید کنید.",
        ]
      : [
          `Exhibition: ${r.exhibition}`,
          `Booth code: ${r.booth || "-"}`,
          `Preferred delivery day: ${r.deliveryDay || "-"}`,
          "",
          "Items:",
          ...(lines.length ? lines.map((l) => `- ${l.label}: ${l.qty}`) : ["-"]),
          "",
          ...contactLines(lang, r),
          "",
          `Notes: ${r.notes || "-"}`,
          "",
          "Please confirm availability, cost and delivery time.",
        ]
  ).join("\n");
  return { subject, body, mailto: mailto(subject, body), pieces: lines.reduce((s, l) => s + l.qty, 0) };
}

export function mailto(subject: string, body: string) {
  return `mailto:${OFFICE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
