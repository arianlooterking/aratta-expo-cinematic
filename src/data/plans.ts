// Material for the public "Plans" page. Everything here comes from documents
// Aratta has already published; nothing is a live allocation or a price.
//
// - Halls: the KIMEX 2025 participants list (public/downloads/
//   kimex-2025-participants-list.pdf) prints, per hall, the stand codes it
//   used. Pages 2-5 of that PDF are rendered to public/plans/ for the viewer.
// - Rules quoted in the stand guide: the KIMEX 2025 participation form
//   (public/downloads/kimex-2025-participation-form.pdf), pages 3 and 4.
// No hall drawing or site plan has been published, so none is shown.

import type { Lang } from "../lib/lang.ts";

type Text = { fa: string; en: string };

export type PlanHall = {
  key: string;
  name: Text;
  /** Stand-code prefix and range as printed in the list. */
  prefix: string;
  first: number;
  last: number;
  /** Page of the participants list PDF that lists this hall. */
  page: number;
  image: string;
  width: number;
  height: number;
};

export const KIMEX_2025_LIST_PDF = "/downloads/kimex-2025-participants-list.pdf";
export const KIMEX_2025_FORM_PDF = "/downloads/kimex-2025-participation-form.pdf";

export const kimex2025Halls: PlanHall[] = [
  {
    key: "khajoo",
    name: { fa: "سالن خواجوی کرمانی", en: "Khajoo-ye Kermani hall" },
    prefix: "K",
    first: 1,
    last: 26,
    page: 2,
    image: "/plans/kimex-2025-participants-p2.webp",
    width: 1241,
    height: 1754,
  },
  {
    key: "bastani",
    name: { fa: "سالن باستانی پاریزی", en: "Bastani Parizi hall" },
    prefix: "B",
    first: 1,
    last: 13,
    page: 3,
    image: "/plans/kimex-2025-participants-p3.webp",
    width: 1241,
    height: 1754,
  },
  {
    key: "mes",
    name: { fa: "سالن شهدای مس", en: "Shohada-ye Mes hall" },
    prefix: "M",
    first: 1,
    last: 16,
    page: 4,
    image: "/plans/kimex-2025-participants-p4.webp",
    width: 1241,
    height: 1754,
  },
  {
    key: "open",
    name: { fa: "فضای باز", en: "Open-air area" },
    prefix: "H",
    first: 1,
    last: 8,
    page: 5,
    image: "/plans/kimex-2025-participants-p5.webp",
    width: 1241,
    height: 1754,
  },
];

export type StandKind = "inline" | "corner" | "peninsula" | "island";
export type StandBuild = "shell" | "space";

/** Which sides face an aisle, in drawing order: front, side, back, other side. */
export const standOpenSides: Record<StandKind, [boolean, boolean, boolean, boolean]> = {
  inline: [true, false, false, false],
  corner: [true, true, false, false],
  peninsula: [true, true, false, true],
  island: [true, true, true, true],
};

export const standKinds: Array<{ id: StandKind; name: Text; sides: Text; points: Text[] }> = [
  {
    id: "inline",
    name: { fa: "ردیفی", en: "Inline" },
    sides: { fa: "یک بر باز", en: "One open side" },
    points: [
      { fa: "فقط جلوی غرفه رو به راهرو است و سه طرف دیگر به غرفه‌های همسایه می‌رسد.", en: "Only the front faces the aisle; the other three sides meet neighbouring stands." },
      { fa: "بیشترین سطح دیوار برای گرافیک، قفسه و نمایش محصول.", en: "The most wall surface for graphics, shelving and products." },
      { fa: "بازدیدکننده از یک جهت وارد می‌شود؛ چیدمان را رو به راهرو طراحی کنید.", en: "Visitors arrive from one direction, so plan the layout towards the aisle." },
    ],
  },
  {
    id: "corner",
    name: { fa: "نبش", en: "Corner" },
    sides: { fa: "دو بر باز", en: "Two open sides" },
    points: [
      { fa: "در تقاطع دو راهرو؛ از دو مسیر دیده می‌شود.", en: "Sits where two aisles cross and is seen from both." },
      { fa: "دو دیوار برای گرافیک و انبار کوچک باقی می‌ماند.", en: "Two walls remain for graphics and a small store." },
      { fa: "پیشخوان را در گوشه باز بگذارید تا از هر دو راهرو در دسترس باشد.", en: "Put the counter at the open corner so it can be reached from both aisles." },
    ],
  },
  {
    id: "peninsula",
    name: { fa: "سه بر باز", en: "Peninsula" },
    sides: { fa: "سه بر باز", en: "Three open sides" },
    points: [
      { fa: "معمولا در انتهای یک ردیف غرفه، با یک دیوار پشتی مشترک.", en: "Usually at the end of a row of stands, with one shared back wall." },
      { fa: "دیوار پشتی جای اصلی لوگو و تصویر بزرگ است.", en: "The back wall is the natural place for the logo and a large image." },
      { fa: "از سه راهرو دیده می‌شود؛ مسیر حرکت داخل غرفه را باز نگه دارید.", en: "Seen from three aisles; keep a clear path through the stand." },
    ],
  },
  {
    id: "island",
    name: { fa: "جزیره", en: "Island" },
    sides: { fa: "چهار بر باز", en: "Four open sides" },
    points: [
      { fa: "از هر چهار طرف به راهرو می‌رسد و دیوار مشترکی ندارد.", en: "Faces aisles on all four sides with no shared wall." },
      { fa: "در فرم KIMEX 2025، غرفه جزیره (چهار طرف باز) به صورت فضای بدون تجهیزات ارائه شده بود.", en: "In the KIMEX 2025 form, island stands (four sides open) were offered as space without equipment." },
      { fa: "یعنی غرفه را خودتان یا سازنده‌تان طراحی و اجرا می‌کنید؛ تیم اَرَتَ هم می‌تواند آن را بسازد.", en: "So you or your builder design and build the stand; the Aratta team can build it too." },
    ],
  },
];

export const standBuilds: Array<{ id: StandBuild; name: Text; summary: Text; points: Text[] }> = [
  {
    id: "shell",
    name: { fa: "غرفه با تجهیزات پیش ساخته", en: "Equipped shell stand" },
    summary: { fa: "دیواره پارتیشنی، کف پوش، نور و تابلو نام آماده است.", en: "Partition walls, carpet, lighting and a name board are ready." },
    points: [
      { fa: "نام شرکت روی تابلو سردر غرفه دقیقا همان‌طور چاپ می‌شود که در فرم نوشته‌اید (فرم KIMEX 2025، بخش غرفه‌های پارتیشنی).", en: "The company name on the fascia board is printed exactly as you write it on the form (KIMEX 2025 form, partition stands page)." },
      { fa: "مبلمان، برق اضافه و تجهیزات بیشتر را از فهرست اجاره تجهیزات سفارش دهید.", en: "Order furniture, extra power and more equipment from the rental list." },
    ],
  },
  {
    id: "space",
    name: { fa: "فضای خام", en: "Bare space" },
    summary: { fa: "فقط زمین تحویل می‌شود؛ غرفه را شما یا سازنده‌تان می‌سازد.", en: "Only the floor is handed over; you or your builder build the stand." },
    points: [
      { fa: "در فرم KIMEX 2025، غرفه خودساز یا سازه و تزئینات ویژه نیازمند نقشه اجرایی و مجوز ساخت از مجری بود.", en: "In the KIMEX 2025 form, a self-built stand or special structure needed execution drawings and a build permit from the organiser." },
      { fa: "در همان فرم، غرفه‌های کمتر از ۳۰ متر مربع فقط با هماهنگی برگزارکننده می‌توانستند خودساز باشند.", en: "In the same form, stands under 30 m² could be self-built only in coordination with the organiser." },
    ],
  },
];

/** Stand sizes the guide draws, as width x depth in metres (the booth request presets). */
export const standSizes: Array<{ w: number; d: number }> = [
  { w: 3, d: 3 },
  { w: 4, d: 3 },
  { w: 6, d: 3 },
  { w: 6, d: 4 },
  { w: 6, d: 6 },
  { w: 9, d: 6 },
  { w: 12, d: 6 },
];

/** From the KIMEX 2025 form: hall space and open-air space started at 15 m². */
export const KIMEX_2025_MIN_AREA = 15;

export const t = (lang: Lang, text: Text) => text[lang];
