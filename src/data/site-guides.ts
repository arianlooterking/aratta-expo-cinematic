// Exhibitor guidance shared by the landing page and the inner pages:
// the participation journey, frequent questions and the quick actions.
// Persian and English stay in content parity.

import type { Lang } from "@/lib/lang";

type Text = { fa: string; en: string };

export type JourneyStep = { kicker: Text; title: Text; body: Text };
export type FaqItem = { q: Text; a: Text };
export type QuickAction = { id: "booth" | "forms" | "equipment" | "contact"; href: string; title: Text; body: Text };

export const journey: JourneyStep[] = [
  {
    kicker: { fa: "انتخاب", en: "Choose" },
    title: { fa: "رویداد مناسب را انتخاب کنید", en: "Pick the right event" },
    body: {
      fa: "تقویم پیش رو را ببینید و برای رویدادهایی که هنوز تاریخ ندارند درخواست اطلاع رسانی بفرستید.",
      en: "Check the upcoming calendar and ask to be notified for events that have no dates yet.",
    },
  },
  {
    kicker: { fa: "درخواست", en: "Request" },
    title: { fa: "درخواست غرفه بدهید", en: "Request a booth" },
    body: {
      fa: "نوع غرفه، متراژ و موقعیت دلخواه را مشخص کنید. کارشناس فروش با فضای موجود و شرایط تماس می‌گیرد.",
      en: "Tell us the booth type, size and preferred position. A sales advisor replies with available space and terms.",
    },
  },
  {
    kicker: { fa: "قرارداد", en: "Contract" },
    title: { fa: "قرارداد و جانمایی روی نقشه", en: "Contract and floor plan" },
    body: {
      fa: "پس از تایید قرارداد و شرایط پرداخت، کد غرفه روی نقشه سالن به نام شرکت شما ثبت می‌شود.",
      en: "Once the contract and payment terms are agreed, your booth code is placed on the hall plan under your company.",
    },
  },
  {
    kicker: { fa: "آماده‌سازی", en: "Prepare" },
    title: { fa: "طراحی غرفه و سفارش خدمات", en: "Design and services" },
    body: {
      fa: "غرفه پیش ساخته یا غرفه‌سازی اختصاصی، کف‌سازی، مبلمان، برق و تجهیزات را پیش از غرفه‌سازی سفارش دهید.",
      en: "Choose a shell scheme or a custom build, and order flooring, furniture, power and equipment before build-up.",
    },
  },
  {
    kicker: { fa: "غرفه‌سازی", en: "Build-up" },
    title: { fa: "تحویل غرفه و تجهیزات", en: "Booth and equipment handover" },
    body: {
      fa: "در روزهای غرفه‌سازی، غرفه و اقلام اجاره‌ای تحویل می‌شوند و سازندگان با مجوز ساخت کار می‌کنند.",
      en: "During build-up your booth and rented items are handed over, and contractors work under a build permit.",
    },
  },
  {
    kicker: { fa: "برگزاری", en: "Show" },
    title: { fa: "روزهای نمایشگاه و جمع آوری", en: "Show days and strike" },
    body: {
      fa: "پشتیبانی سالن در روزهای نمایشگاه کنار شماست و پس از پایان، تجهیزات جمع آوری و غرفه تخلیه می‌شود.",
      en: "On-floor support is with you on show days; afterwards equipment is collected and the booth is cleared.",
    },
  },
];

export const faq: FaqItem[] = [
  {
    q: { fa: "چطور غرفه رزرو کنم؟", en: "How do I book a booth?" },
    a: {
      fa: "درخواست غرفه را در صفحه ثبت نام کامل کنید یا فرم رسمی را دانلود کنید. سایت فقط پیش‌نویس ایمیل می‌سازد؛ رزرو قطعی پس از قرارداد با دفتر اَرَتَ انجام می‌شود.",
      en: "Complete the booth request on the registration page or download the official form. The website only prepares an email draft; a booking is confirmed once you sign a contract with the Aratta office.",
    },
  },
  {
    q: { fa: "نمایشگاه بعدی چه زمانی برگزار می‌شود؟", en: "When is the next exhibition?" },
    a: {
      fa: "تاریخ‌ها پس از اعلام رسمی در تقویم همین صفحه منتشر می‌شوند. دهمین نمایشگاه معدن کرمان تا اطلاع بعدی به تعویق افتاده است. با دکمه «خبرم کنید» در جریان قرار بگیرید.",
      en: "Dates appear in the calendar on this page once they are officially announced. The 10th Kerman mining exhibition is postponed until further notice. Use “Notify me” to hear first.",
    },
  },
  {
    q: { fa: "می‌توانم غرفه را خودم بسازم؟", en: "Can I build my own booth?" },
    a: {
      fa: "بله. با انتخاب فضای خام، سازنده شما پیش از غرفه‌سازی مجوز ساخت و ضمانت تخلیه را به برگزارکننده ارائه می‌کند. اگر بخواهید، تیم اَرَتَ هم غرفه را طراحی و اجرا می‌کند.",
      en: "Yes. With raw space, your contractor gives the organiser a build permit and a clearance guarantee before build-up. If you prefer, the Aratta team can design and build it for you.",
    },
  },
  {
    q: { fa: "مبلمان و تجهیزات اجاره می‌دهید؟", en: "Can I rent furniture and equipment?" },
    a: {
      fa: "بله. فهرست اقلام را در صفحه اجاره تجهیزات انتخاب کنید. اقلام پیش از افتتاح در غرفه تحویل و پس از پایان نمایشگاه جمع آوری می‌شوند.",
      en: "Yes. Pick items on the equipment rental page. They are delivered to your booth before opening and collected after the show.",
    },
  },
  {
    q: { fa: "پرداخت آنلاین است؟", en: "Do I pay online?" },
    a: {
      fa: "خیر. پرداخت فقط پس از قرارداد و با هماهنگی دفتر اَرَتَ انجام می‌شود. این سایت هرگز اطلاعات کارت یا پرداخت از شما نمی‌خواهد.",
      en: "No. Payment is arranged with the Aratta office after the contract. This website never asks for card or payment details.",
    },
  },
  {
    q: { fa: "چه مدارکی لازم است؟", en: "Which documents do I need?" },
    a: {
      fa: "مشخصات شرکت، فرم رسمی مشارکت و برای غرفه‌سازی اختصاصی، طرح غرفه. کارشناس فروش فهرست کامل را برای هر رویداد ارسال می‌کند.",
      en: "Your company details, the official participation form and, for a custom build, the booth design. Your sales advisor sends the full list for each event.",
    },
  },
];

export const quickActions: QuickAction[] = [
  {
    id: "booth",
    href: "/registration#booth-request",
    title: { fa: "درخواست غرفه", en: "Request a booth" },
    body: { fa: "نوع، متراژ و خدمات را در سه قدم مشخص کنید.", en: "Type, size and services in three steps." },
  },
  {
    id: "forms",
    href: "/forms",
    title: { fa: "فرم‌ها و فایل‌ها", en: "Forms and files" },
    body: { fa: "فرم رسمی، فهرست مشارکت‌کنندگان و لیست تجهیزات.", en: "Official form, participant list and equipment list." },
  },
  {
    id: "equipment",
    href: "/equipment#equipment-request",
    title: { fa: "اجاره تجهیزات", en: "Rent equipment" },
    body: { fa: "مبلمان، تلویزیون، برق و پذیرایی برای غرفه.", en: "Furniture, screens, power and refreshments." },
  },
  {
    id: "contact",
    href: "/contact",
    title: { fa: "گفتگو با ما", en: "Talk to us" },
    body: { fa: "تماس مستقیم با دفتر کرمان.", en: "Reach the Kerman office directly." },
  },
];

export const t = (lang: Lang, text: Text) => text[lang];
