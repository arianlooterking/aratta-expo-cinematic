/** Persian and English names for CRM, finance and task values. */
type L = { fa: string; en: string };

export const companyKindLabel: Record<"exhibitor" | "contractor" | "supplier" | "sponsor" | "partner", L> = {
  exhibitor: { fa: "مشارکت کننده", en: "Exhibitor" },
  sponsor: { fa: "حامی", en: "Sponsor" },
  contractor: { fa: "پیمانکار", en: "Contractor" },
  supplier: { fa: "تامین کننده", en: "Supplier" },
  partner: { fa: "همکار", en: "Partner" },
};

export const companyPriorityLabel: Record<"low" | "normal" | "high" | "strategic", L> = {
  low: { fa: "کم", en: "Low" },
  normal: { fa: "عادی", en: "Normal" },
  high: { fa: "مهم", en: "High" },
  strategic: { fa: "راهبردی", en: "Key account" },
};

export const activityKindLabel: Record<"call" | "sms" | "email" | "meeting" | "message" | "visit" | "note" | "system", L> = {
  call: { fa: "تماس تلفنی", en: "Call" },
  sms: { fa: "پیامک", en: "SMS" },
  email: { fa: "ایمیل", en: "Email" },
  meeting: { fa: "جلسه", en: "Meeting" },
  message: { fa: "پیام", en: "Message" },
  visit: { fa: "بازدید", en: "Visit" },
  note: { fa: "یادداشت", en: "Note" },
  system: { fa: "سیستم", en: "System" },
};

export const paymentMethodLabel: Record<"bank_transfer" | "pos" | "cash" | "cheque" | "other", L> = {
  bank_transfer: { fa: "واریز بانکی", en: "Bank transfer" },
  pos: { fa: "کارت خوان", en: "Card (POS)" },
  cash: { fa: "نقد", en: "Cash" },
  cheque: { fa: "چک", en: "Cheque" },
  other: { fa: "سایر", en: "Other" },
};

export const invoiceStatusLabel: Record<"draft" | "issued" | "registered" | "cancelled", L> = {
  draft: { fa: "پیش نویس", en: "Draft" },
  issued: { fa: "صادر شده", en: "Issued" },
  registered: { fa: "ثبت در سامانه", en: "Filed" },
  cancelled: { fa: "باطل", en: "Cancelled" },
};

export const invoiceKindLabel: Record<"proforma" | "final", L> = {
  proforma: { fa: "پیش فاکتور", en: "Proforma" },
  final: { fa: "فاکتور", en: "Invoice" },
};

export const serviceKindLabel: Record<"space" | "booth_build" | "flooring" | "partition" | "equipment" | "sponsorship" | "other", L> = {
  space: { fa: "اجاره فضا", en: "Space rental" },
  booth_build: { fa: "ساخت غرفه", en: "Booth build" },
  flooring: { fa: "کفپوش", en: "Flooring" },
  partition: { fa: "پارتیشن", en: "Partitions" },
  equipment: { fa: "تجهیزات", en: "Equipment" },
  sponsorship: { fa: "حمایت", en: "Sponsorship" },
  other: { fa: "سایر", en: "Other" },
};

export const unitLabel: Record<"m2" | "unit" | "day" | "set" | "lump", L> = {
  m2: { fa: "متر مربع", en: "m²" },
  unit: { fa: "عدد", en: "unit" },
  day: { fa: "روز", en: "day" },
  set: { fa: "دست", en: "set" },
  lump: { fa: "مقطوع", en: "lump sum" },
};

export const taskStatusLabel: Record<"todo" | "in_progress" | "blocked" | "done" | "cancelled", L> = {
  todo: { fa: "انجام نشده", en: "To do" },
  in_progress: { fa: "در حال انجام", en: "In progress" },
  blocked: { fa: "متوقف", en: "Blocked" },
  done: { fa: "انجام شد", en: "Done" },
  cancelled: { fa: "لغو", en: "Cancelled" },
};

export const taskPriorityLabel: Record<"low" | "normal" | "high" | "urgent", L> = {
  low: { fa: "کم", en: "Low" },
  normal: { fa: "عادی", en: "Normal" },
  high: { fa: "مهم", en: "High" },
  urgent: { fa: "فوری", en: "Urgent" },
};

export const dueGroupLabel: Record<"overdue" | "today" | "week" | "later" | "none", L> = {
  overdue: { fa: "عقب افتاده", en: "Overdue" },
  today: { fa: "امروز", en: "Today" },
  week: { fa: "این هفته", en: "This week" },
  later: { fa: "بعداً", en: "Later" },
  none: { fa: "بدون تاریخ", en: "No date" },
};

export const ageBucketLabel: Record<"current" | "d30" | "d60" | "d90" | "older", L> = {
  current: { fa: "سررسید نشده", en: "Not yet due" },
  d30: { fa: "۱ تا ۳۰ روز", en: "1–30 days" },
  d60: { fa: "۳۱ تا ۶۰ روز", en: "31–60 days" },
  d90: { fa: "۶۱ تا ۹۰ روز", en: "61–90 days" },
  older: { fa: "بیش از ۹۰ روز", en: "Over 90 days" },
};
