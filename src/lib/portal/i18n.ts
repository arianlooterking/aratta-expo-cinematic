import type { Lang } from "@/lib/lang";
import type { BoothStatus, DealStage, EquipmentStage, ExhibitionStatus, FeatureKind } from "./types";

type L = Record<Lang, string>;

export const boothStatusLabel: Record<BoothStatus, L> = {
  available: { fa: "آزاد", en: "Available" },
  held: { fa: "نگه داشته", en: "On hold" },
  reserved: { fa: "رزرو", en: "Reserved" },
  contracted: { fa: "قرارداد", en: "Contracted" },
  paid: { fa: "تسویه", en: "Paid" },
  blocked: { fa: "غیرقابل فروش", en: "Blocked" },
};

export const dealStageLabel: Record<DealStage, L> = {
  lead: { fa: "سرنخ", en: "Lead" },
  contacted: { fa: "تماس گرفته شد", en: "Contacted" },
  qualified: { fa: "علاقه مند", en: "Qualified" },
  proposal: { fa: "پیش فاکتور", en: "Proposal" },
  negotiation: { fa: "مذاکره", en: "Negotiation" },
  won: { fa: "قطعی", en: "Won" },
  lost: { fa: "از دست رفته", en: "Lost" },
};

export const equipmentStageLabel: Record<EquipmentStage, L> = {
  requested: { fa: "درخواست", en: "Requested" },
  reserved: { fa: "رزرو انبار", en: "Reserved" },
  prepared: { fa: "آماده ارسال", en: "Ready" },
  delivered: { fa: "تحویل شد", en: "Delivered" },
  collected: { fa: "جمع آوری شد", en: "Collected" },
  issue: { fa: "مشکل", en: "Issue" },
  cancelled: { fa: "لغو", en: "Cancelled" },
};

export const exhibitionStatusLabel: Record<ExhibitionStatus, L> = {
  planning: { fa: "برنامه ریزی", en: "Planning" },
  selling: { fa: "فروش غرفه", en: "Selling" },
  build: { fa: "غرفه سازی", en: "Build-up" },
  live: { fa: "در حال برگزاری", en: "Open" },
  strike: { fa: "جمع آوری", en: "Teardown" },
  closed: { fa: "بسته شده", en: "Closed" },
  archived: { fa: "بایگانی", en: "Archived" },
};

export const featureLabel: Record<FeatureKind, L> = {
  column: { fa: "ستون", en: "Column" },
  wall: { fa: "دیوار", en: "Wall" },
  door: { fa: "در", en: "Door" },
  entrance: { fa: "ورودی", en: "Entrance" },
  loading: { fa: "بارانداز", en: "Loading" },
  aisle: { fa: "راهرو", en: "Aisle" },
  zone: { fa: "محدوده", en: "Zone" },
  stage: { fa: "سن", en: "Stage" },
  service: { fa: "خدمات", en: "Service" },
  utility: { fa: "تاسیسات", en: "Utility" },
  label: { fa: "برچسب", en: "Label" },
};

const strings = {
  overview: { fa: "نمای کلی", en: "Overview" },
  map: { fa: "نقشه سالن", en: "Hall map" },
  handover: { fa: "تحویل و جمع آوری", en: "Handover" },
  team: { fa: "تیم و دسترسی", en: "Team" },
  classic: { fa: "پورتال قدیمی", en: "Old portal" },
  comingSoon: { fa: "به زودی", en: "Soon" },
  pipeline: { fa: "فروش و پیگیری", en: "Sales pipeline" },
  finance: { fa: "مالی", en: "Finance" },
  tasks: { fa: "کارها", en: "Tasks" },
  search: { fa: "جستجوی غرفه یا شرکت", en: "Search booths or companies" },
  notifications: { fa: "اعلان ها", en: "Notifications" },
  noNotifications: { fa: "اعلان تازه ای نیست", en: "You're all caught up" },
  markAllRead: { fa: "همه خوانده شد", en: "Mark all read" },
  signOut: { fa: "خروج", en: "Sign out" },
  demoBanner: {
    fa: "حالت نمایشی: داده ها نمونه اند و فقط در همین مرورگر ذخیره می شوند.",
    en: "Demo mode: sample data, saved only in this browser.",
  },
  resetDemo: { fa: "شروع دوباره نمونه", en: "Reset demo" },
  live: { fa: "زنده", en: "Live" },
  offline: { fa: "قطع اتصال", en: "Offline" },
  loading: { fa: "در حال بارگیری", en: "Loading" },
  exhibition: { fa: "نمایشگاه", en: "Exhibition" },
  allExhibitions: { fa: "همه نمایشگاه ها", en: "All exhibitions" },
  noExhibition: { fa: "هنوز نمایشگاهی ثبت نشده", en: "No exhibitions yet" },
  theme: { fa: "پوسته", en: "Theme" },
  language: { fa: "English", en: "فارسی" },
  saveFailed: { fa: "ذخیره نشد", en: "Not saved" },
  notPermitted: { fa: "اجازه این تغییر را ندارید", en: "You don't have permission for that" },
  offlineError: { fa: "اتصال برقرار نیست. دوباره تلاش کنید.", en: "No connection. Try again." },
  duplicate: { fa: "این مورد تکراری است", en: "That already exists" },
  undo: { fa: "واگرد", en: "Undo" },
  redo: { fa: "انجام دوباره", en: "Redo" },
  close: { fa: "بستن", en: "Close" },
  cancel: { fa: "انصراف", en: "Cancel" },
  save: { fa: "ذخیره", en: "Save" },
  delete: { fa: "حذف", en: "Delete" },
  edit: { fa: "ویرایش", en: "Edit" },
  done: { fa: "تمام", en: "Done" },
  add: { fa: "افزودن", en: "Add" },
  more: { fa: "بیشتر", en: "More" },
  menu: { fa: "منو", en: "Menu" },
} satisfies Record<string, L>;

export type StringKey = keyof typeof strings;

export function t(lang: Lang, key: StringKey) {
  return strings[key][lang];
}

export function l(lang: Lang, label: L) {
  return label[lang];
}
