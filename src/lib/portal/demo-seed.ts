// Sample data for the demo portal. Every company, person and number here is
// made up. Dates are relative to today so the demo always looks current:
// one show is being built this week, one just ended (collection under way),
// and one is still selling space months ahead.
import type { DemoSnapshot } from "./demo-store";
import type { AnyRow } from "./store";

export const DEMO_STAFF_ID = "00000000-0000-4000-8000-000000000001";

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function uuid(n: number) {
  return `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
}

function day(offset: number, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function at(offsetDays: number, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const COMPANIES: Array<[string, string, string]> = [
  ["کاوشگران زرین دشت", "Zarrin Dasht Explorers", "اکتشاف معدن"],
  ["ماشین سازان نگین کویر", "Negin Kavir Machinery", "ماشین آلات معدنی"],
  ["مس آرای پارسه", "Parseh Copper Works", "مس و فرآوری"],
  ["سنگ آهن افق نو", "Ofogh No Iron Ore", "سنگ آهن"],
  ["حفاری ژرفای آرتا", "Arta Deep Drilling", "حفاری"],
  ["نوآوران فرآوری لوت", "Lut Processing Innovators", "فرآوری مواد"],
  ["صنایع نسوز ستاره سیرجان", "Setareh Refractories", "نسوز"],
  ["تجهیزات ایمنی پیشگام", "Pishgam Safety Gear", "ایمنی معدن"],
  ["لجستیک بارآوران جنوب", "Southern Haulage Logistics", "حمل و نقل"],
  ["فناوری داده معدن آسا", "Asa Mining Data", "نرم افزار و پایش"],
  ["کوره صنعت مهر", "Mehr Furnace Industries", "ذوب و ریخته گری"],
  ["پمپ و شیرآلات بهاران", "Baharan Pumps & Valves", "پمپ و شیرآلات"],
  ["زغال سنگ کوهبنان نمونه", "Kuhbanan Coal (Sample)", "زغال سنگ"],
  ["آزمایشگاه کانی پژوه", "Kani Pajouh Labs", "آزمایشگاه"],
  ["سازه های فلزی پولاد آرین", "Pulad Arian Structures", "سازه فلزی"],
  ["مهندسی مشاور کانسار", "Kansar Consulting Engineers", "مشاوره"],
  ["تایر و قطعات سنگین راهوار", "Rahvar Heavy Parts", "قطعات یدکی"],
  ["انرژی خورشیدی کویر روشن", "Kavir Roshan Solar", "انرژی"],
  ["نوار نقاله صنعت پارس", "Pars Conveyor Systems", "نوار نقاله"],
  ["روانکاران صنعتی آپادانا", "Apadana Industrial Lubricants", "روانکار"],
  ["ابزار دقیق سنجش گستر", "Sanjesh Gostar Instruments", "ابزار دقیق"],
  ["کمپرسور هوای ارس", "Aras Air Compressors", "کمپرسور"],
  ["فیلتر صنعتی پاکان", "Pakan Industrial Filters", "فیلتر و غبارگیر"],
  ["سیمان و گچ دشت نمونه", "Dasht Cement (Sample)", "مصالح"],
  ["بیمه حامی صنعت", "Hami Industry Insurance", "بیمه"],
  ["بانک سرمایه معدن نمونه", "Mining Capital Bank (Sample)", "مالی"],
  ["آموزش فنی پویندگان", "Pouyandegan Technical Training", "آموزش"],
  ["رباتیک صنعتی آینده", "Ayandeh Industrial Robotics", "اتوماسیون"],
  ["لوله و اتصالات کرمان نمونه", "Kerman Pipes (Sample)", "لوله"],
  ["خدمات انفجار ایمن سپهر", "Sepehr Blasting Services", "خدمات انفجار"],
  ["کانی های غیرفلزی رخشان", "Rakhshan Industrial Minerals", "کانی غیرفلزی"],
  ["جرثقیل و بالابر توانا", "Tavana Cranes & Hoists", "بالابر"],
  ["رنگ صنعتی سپیدار", "Sepidar Industrial Coatings", "پوشش صنعتی"],
  ["مخابرات زیرزمینی پیوند", "Peyvand Underground Comms", "ارتباطات"],
  ["آب و فاضلاب صنعتی زلال", "Zolal Industrial Water", "آب صنعتی"],
  ["فرش و کفپوش صنعتی آرام", "Aram Industrial Flooring", "کفپوش"],
  ["چاپ و تبلیغات نقش جهان نمونه", "Naqsh Print (Sample)", "تبلیغات"],
  ["دانش بنیان کان آرا", "Kan Ara Technologies", "فناوری"],
  ["صنایع غذایی باغ سبز نمونه", "Bagh Sabz Foods (Sample)", "صنایع غذایی"],
  ["پسته خندان رفسنجان نمونه", "Khandan Pistachio (Sample)", "کشاورزی"],
  ["خرمای نخلستان بم نمونه", "Bam Date Groves (Sample)", "کشاورزی"],
  ["ماشین کشاورزی سبزدشت", "Sabzdasht Farm Machinery", "ماشین کشاورزی"],
  ["آبیاری قطره ای باران", "Baran Drip Irrigation", "آبیاری"],
  ["گلخانه هوشمند نوین", "Novin Smart Greenhouse", "گلخانه"],
  ["بسته بندی پارس پک نمونه", "ParsPack Packaging (Sample)", "بسته بندی"],
  ["مصالح ساختمانی بنا", "Bana Building Materials", "مصالح"],
  ["پنجره و نما آریا", "Aria Windows & Facades", "نما"],
  ["آسانسور فراز نمونه", "Faraz Elevators (Sample)", "آسانسور"],
];

const FIRST = ["سارا", "رضا", "مریم", "علی", "نرگس", "حمید", "الهام", "مهدی", "زهرا", "امیر", "فاطمه", "کاوه"];
const LAST = ["کریمی", "رحمانی", "نجفی", "صادقی", "مرادی", "حسینی", "شریفی", "یزدانی", "رستمی", "بهرامی"];

const ITEMS: Array<[string, string, string, string, number, number, boolean]> = [
  // sku, fa, en, category, on hand, daily rental, returnable
  ["chair", "صندلی", "Chair", "furniture", 320, 350_000, true],
  ["table", "میز جلسه", "Meeting table", "furniture", 90, 900_000, true],
  ["counter", "کانتر پذیرش", "Reception counter", "furniture", 45, 2_500_000, true],
  ["sofa", "مبل راحتی", "Lounge sofa", "furniture", 18, 3_000_000, true],
  ["shelf", "قفسه نمایش", "Display shelf", "furniture", 30, 1_200_000, true],
  ["fridge", "یخچال", "Fridge", "appliance", 10, 2_000_000, true],
  ["tv", "تلویزیون ۵۵ اینچ", "55\" TV", "av", 12, 6_000_000, true],
  ["spot", "پروژکتور", "Spotlight", "lighting", 240, 250_000, true],
  ["socket", "سه راهی برق", "Power strip", "electrical", 100, 150_000, true],
  ["bin", "سطل زباله", "Waste bin", "other", 70, 80_000, true],
  ["fan", "پنکه ایستاده", "Standing fan", "cooling", 25, 700_000, true],
  ["fascia", "تابلو سردر", "Fascia sign", "signage", 999, 1_500_000, false],
];

type HallSpec = {
  name_fa: string;
  name_en: string;
  width: number;
  depth: number;
  booths: Array<{ code: string; x: number; y: number; w: number; d: number; sides?: number }>;
  features: Array<{ kind: string; x: number; y: number; w: number; d: number; fa?: string; en?: string }>;
};

function row(prefix: string, startX: number, y: number, count: number, w: number, d: number, startNo = 1, sides = 1) {
  return Array.from({ length: count }, (_, i) => ({
    code: `${prefix}${String(startNo + i).padStart(2, "0")}`,
    x: startX + i * w,
    y,
    w,
    d,
    sides,
  }));
}

const HALL_A: HallSpec = {
  name_fa: "سالن خلیج فارس",
  name_en: "Persian Gulf Hall",
  width: 60,
  depth: 36,
  booths: [
    ...row("A", 3, 0.5, 9, 6, 4),
    ...row("B", 6, 8, 3, 7, 6, 1, 2),
    ...row("B", 6, 14, 3, 7, 6, 4, 2),
    ...row("B", 33, 8, 3, 7, 6, 7, 2),
    ...row("B", 33, 14, 3, 7, 6, 10, 2),
    ...row("C", 6, 23.5, 3, 7, 6, 1, 2),
    ...row("C", 33, 23.5, 3, 7, 6, 4, 2),
    ...row("D", 2, 31, 3, 6, 4.5),
    ...row("D", 40, 31, 3, 6, 4.5, 4),
  ],
  features: [
    { kind: "aisle", x: 1, y: 4.5, w: 58, d: 3.5, fa: "راهروی شمالی", en: "North aisle" },
    { kind: "aisle", x: 1, y: 20, w: 58, d: 3.5, fa: "راهروی اصلی", en: "Main aisle" },
    { kind: "aisle", x: 27, y: 8, w: 6, d: 12, fa: "راهروی میانی", en: "Centre aisle" },
    { kind: "entrance", x: 26, y: 35, w: 8, d: 1, fa: "ورودی اصلی", en: "Main entrance" },
    { kind: "service", x: 21, y: 31, w: 4.5, d: 4.5, fa: "دفتر اجرایی", en: "Ops office" },
    { kind: "loading", x: 58.6, y: 10, w: 1.4, d: 7, fa: "بارانداز", en: "Loading dock" },
    { kind: "column", x: 14.7, y: 21.4, w: 0.6, d: 0.6 },
    { kind: "column", x: 44.7, y: 21.4, w: 0.6, d: 0.6 },
    { kind: "utility", x: 58.8, y: 34.8, w: 1, d: 1, fa: "برق", en: "Power" },
    { kind: "door", x: 0, y: 26, w: 0.6, d: 3, fa: "خروج اضطراری", en: "Emergency exit" },
  ],
};

const HALL_B: HallSpec = {
  name_fa: "سالن کویر",
  name_en: "Kavir Hall",
  width: 40,
  depth: 24,
  booths: [
    ...row("K", 2, 0.5, 6, 6, 4),
    ...row("K", 7, 8, 3, 5, 5, 7, 3),
    ...row("K", 23, 8, 2, 5, 5, 10, 3),
    ...row("K", 2, 19.5, 2, 6, 4, 12),
    ...row("K", 26, 19.5, 2, 6, 4, 14),
  ],
  features: [
    { kind: "aisle", x: 1, y: 4.5, w: 38, d: 3.5, fa: "راهرو", en: "Aisle" },
    { kind: "aisle", x: 1, y: 14, w: 38, d: 5, fa: "راهروی اصلی", en: "Main aisle" },
    { kind: "entrance", x: 16, y: 23, w: 7, d: 1, fa: "ورودی", en: "Entrance" },
    { kind: "stage", x: 15, y: 19.5, w: 9, d: 3, fa: "سن سخنرانی", en: "Talks stage" },
    { kind: "column", x: 19.7, y: 10.2, w: 0.6, d: 0.6 },
    { kind: "utility", x: 38.8, y: 22.8, w: 1, d: 1, fa: "برق", en: "Power" },
  ],
};

type ExhibitionSpec = {
  slug: string;
  name_fa: string;
  name_en: string;
  status: string;
  /** Days from today. */
  build: number;
  start: number;
  end: number;
  strike: number;
  halls: HallSpec[];
  /** Share of booths sold. */
  sold: number;
  /** Which companies (index range) exhibit. */
  companies: [number, number];
  phase: "selling" | "build" | "strike";
  rate: number;
  color: string;
};

const EXHIBITIONS: ExhibitionSpec[] = [
  {
    slug: "kerman-mining-demo",
    name_fa: "نمایشگاه معدن و صنایع معدنی کرمان",
    name_en: "Kerman Mining & Mineral Industries Expo",
    status: "build",
    build: -2,
    start: 2,
    end: 5,
    strike: 6,
    halls: [HALL_A, HALL_B],
    sold: 0.78,
    companies: [0, 38],
    phase: "build",
    rate: 45_000_000,
    color: "#c8a25a",
  },
  {
    slug: "kerman-construction-demo",
    name_fa: "نمایشگاه صنعت ساختمان کرمان",
    name_en: "Kerman Construction Expo",
    status: "strike",
    build: -12,
    start: -8,
    end: -2,
    strike: 1,
    halls: [HALL_A],
    sold: 0.88,
    companies: [14, 48],
    phase: "strike",
    rate: 38_000_000,
    color: "#5b8def",
  },
  {
    slug: "kerman-agrofood-demo",
    name_fa: "نمایشگاه کشاورزی و صنایع غذایی کرمان",
    name_en: "Kerman Agriculture & Food Expo",
    status: "selling",
    build: 118,
    start: 122,
    end: 125,
    strike: 126,
    halls: [HALL_A],
    sold: 0.34,
    companies: [24, 48],
    phase: "selling",
    rate: 32_000_000,
    color: "#3fa66a",
  },
];

export function demoSeed(): DemoSnapshot {
  const random = rng(1405);
  const pickOne = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
  let next = 100;
  const id = () => uuid(next++);
  const now = new Date().toISOString();
  const stamps = { created_at: now, updated_at: now };
  const out: Required<DemoSnapshot> = {
    exhibitions: [],
    halls: [],
    hall_features: [],
    booths: [],
    companies: [],
    contacts: [],
    deals: [],
    activities: [],
    invoices: [],
    invoice_lines: [],
    payments: [],
    inventory_items: [],
    equipment_orders: [],
    tasks: [],
    problems: [],
    staff_members: [],
    teams: [],
    notifications: [],
  };
  const push = (table: keyof DemoSnapshot, r: Record<string, unknown>) => {
    out[table].push(r as AnyRow);
    return r as AnyRow;
  };

  const staffSkills: string[][] = [
    ["مذاکره", "انگلیسی"],
    ["فروش فضا", "انگلیسی"],
    ["فروش فضا", "معدن و صنایع"],
    ["حسابداری", "مالیات"],
    ["رانندگی", "لجستیک"],
    ["برنامه ریزی"],
    ["انبارداری"],
    ["حسابداری"],
  ];
  // [name, role, departments, job title, picture]
  const staffNames: Array<[string, string, string[], string, number]> = [
    ["شما (مدیر نمونه)", "owner", ["executive"], "مدیرعامل", 2],
    ["سارا کریمی", "member", ["sales"], "کارشناس فروش", 1],
    ["رضا نجفی", "member", ["sales"], "کارشناس فروش", 9],
    ["مریم صادقی", "manager", ["finance"], "مدیر مالی", 6],
    ["کاوه رستمی", "member", ["logistics", "operations"], "مسئول تدارکات", 8],
    ["نگار احمدی", "member", ["operations"], "دستیار مدیرعامل", 3],
    ["امید باقری", "member", ["logistics"], "انباردار", 11],
    ["الهام شریفی", "member", ["finance"], "حسابدار", 10],
  ];
  const staff = staffNames.map(([name, role, departments, title, picture], i) =>
    push("staff_members", {
      ...stamps,
      id: i === 0 ? DEMO_STAFF_ID : id(),
      user_id: null,
      email: `demo${i}@example.com`,
      display_name: name,
      job_title: title,
      role,
      departments,
      status: "active",
      phone: null,
      avatar_url: `preset:${picture}`,
      locale: "fa",
      invited_by: null,
      last_seen_at: null,
      bio: null,
      start_date: `${2019 + (i % 6)}-0${1 + (i % 9)}-15`,
      skills: staffSkills[i] ?? [],
    }),
  );
  // Someone invited who has not signed in yet.
  push("staff_members", {
    ...stamps,
    id: id(),
    user_id: null,
    email: "new.colleague@example.com",
    display_name: null,
    job_title: "کارشناس فروش",
    role: "member",
    departments: ["sales"],
    status: "invited",
    phone: null,
    avatar_url: "preset:13",
    locale: "fa",
    invited_by: DEMO_STAFF_ID,
    last_seen_at: null,
    bio: null,
    start_date: null,
    skills: [],
  });
  const teamRows: Array<[string, string, string, number, number[], string]> = [
    ["مدیریت", "Management", "#2f3e46", 0, [0, 5], "تصمیم های اصلی، قراردادها و هماهنگی کل نمایشگاه"],
    ["فروش", "Sales", "#0e5d4c", 1, [1, 2], "فروش فضا، پیگیری مشتریان و پیش فاکتورها"],
    ["مالی", "Finance", "#b07a1e", 3, [3, 7], "فاکتورها، دریافت ها و مانده حساب ها"],
    ["تحویل و تجهیزات", "Handover crew", "#2364a8", 4, [4, 6, 5], "تحویل مبلمان و تجهیزات به غرفه ها و جمع آوری پس از نمایشگاه"],
  ];
  teamRows.forEach(([fa, en, color, lead, members, description], i) =>
    push("teams", {
      ...stamps,
      id: id(),
      name_fa: fa,
      name_en: en,
      description,
      color,
      lead_id: staff[lead].id,
      member_ids: [staff[lead].id, ...members.filter((m) => m !== lead).map((m) => staff[m].id)],
      exhibition_id: null,
      sort_order: i,
      archived_at: null,
      created_by: DEMO_STAFF_ID,
    }),
  );
  const sellers = [staff[1], staff[2]];

  const companies = COMPANIES.map(([fa, en, sector], i) => {
    const c = push("companies", {
      ...stamps,
      id: id(),
      kind: i === 24 || i === 25 ? "sponsor" : "exhibitor",
      name_fa: fa,
      name_en: en,
      legal_name: null,
      national_id: null,
      economic_code: null,
      sector,
      city: pickOne(["کرمان", "سیرجان", "رفسنجان", "تهران", "یزد", "بم"]),
      address: null,
      website: null,
      phone: `034-3000-${String(1000 + i).slice(-4)}`,
      email: null,
      owner_id: sellers[i % 2].id,
      priority: i % 7 === 0 ? "high" : "normal",
      tags: [],
      notes: null,
      import_key: null,
      archived_at: null,
    });
    push("contacts", {
      ...stamps,
      id: id(),
      company_id: c.id,
      full_name: `${pickOne(FIRST)} ${pickOne(LAST)}`,
      job_title: pickOne(["مدیر بازرگانی", "مدیر روابط عمومی", "مسئول نمایشگاه", "مدیر فروش"]),
      phone: `0913-555-${String(100 + i).padStart(4, "0")}`,
      phone_alt: null,
      email: null,
      is_primary: true,
      notes: null,
      import_key: null,
    });
    return c;
  });
  const contactOf = (companyId: string) => out.contacts.find((c) => c.company_id === companyId)!;

  const items = ITEMS.map(([sku, fa, en, category, onHand, rate, returnable]) =>
    push("inventory_items", {
      ...stamps,
      id: id(),
      sku,
      item_code: null,
      name_fa: fa,
      name_en: en,
      category,
      unit_fa: "عدد",
      unit_en: "pcs",
      returnable,
      on_hand: onHand,
      low_stock_threshold: Math.round(onHand * 0.1),
      rental_rate: rate,
      notes: null,
      archived_at: null,
    }),
  );
  const item = (sku: string) => items.find((i) => i.sku === sku)!;

  let invoiceNo = 1201;
  for (const spec of EXHIBITIONS) {
    const exhibition = push("exhibitions", {
      ...stamps,
      id: id(),
      slug: spec.slug,
      name_fa: spec.name_fa,
      name_en: spec.name_en,
      edition: null,
      year_label: "۱۴۰۵",
      venue_fa: "محل دائمی نمایشگاه های بین المللی کرمان",
      venue_en: "Kerman International Fairground",
      city_fa: "کرمان",
      city_en: "Kerman",
      starts_on: day(spec.start),
      ends_on: day(spec.end),
      build_starts_on: day(spec.build),
      strike_ends_on: day(spec.strike),
      status: spec.status,
      color: spec.color,
      currency: "IRR",
      vat_rate: 0.1,
      space_rate: spec.rate,
      booth_build_rate: 18_000_000,
      notes: null,
      website_listed: spec.status === "selling",
      registration_open: spec.status === "selling",
      website_summary_fa: null,
      website_summary_en: null,
      venue_plan_path: null,
      import_key: null,
      created_by: DEMO_STAFF_ID,
    });

    const pool = companies.slice(spec.companies[0], spec.companies[1]);
    let poolIndex = 0;
    const booths: AnyRow[] = [];
    spec.halls.forEach((hs, hallIndex) => {
      const hall = push("halls", {
        ...stamps,
        id: id(),
        exhibition_id: exhibition.id,
        name_fa: hs.name_fa,
        name_en: hs.name_en,
        width_m: hs.width,
        depth_m: hs.depth,
        grid_m: 1,
        background_path: null,
        background_opacity: 0.35,
        sort_order: hallIndex,
        import_key: null,
      });
      for (const f of hs.features) {
        push("hall_features", {
          ...stamps,
          id: id(),
          hall_id: hall.id,
          exhibition_id: exhibition.id,
          kind: f.kind,
          label_fa: f.fa ?? null,
          label_en: f.en ?? null,
          x: f.x,
          y: f.y,
          width: f.w,
          depth: f.d,
          rotation: 0,
          polygon: null,
          style: {},
          import_key: null,
        });
      }
      for (const b of hs.booths) {
        booths.push(
          push("booths", {
            ...stamps,
            id: id(),
            hall_id: hall.id,
            exhibition_id: exhibition.id,
            code: b.code,
            x: b.x,
            y: b.y,
            width: b.w,
            depth: b.d,
            rotation: 0,
            polygon: null,
            area_m2: b.w * b.d,
            area_is_manual: false,
            open_sides: b.sides ?? 1,
            zone: null,
            status: "available",
            price_override: null,
            notes: null,
            import_key: null,
            deal_id: null,
            manager_ids: [],
          }),
        );
      }
    });

    // Sell booths in a believable pattern: front rows and islands first.
    const order = [...booths].sort((a, b) => random() - 0.5 + (Number(a.y) - Number(b.y)) * 0.01);
    const soldCount = Math.round(booths.length * spec.sold);
    order.forEach((booth, index) => {
      if (index >= soldCount) {
        if (index === soldCount) booth.status = "held";
        if (index === booths.length - 1) booth.status = "blocked";
        return;
      }
      const company = pool[poolIndex++ % pool.length];
      let deal = out.deals.find((d) => d.exhibition_id === exhibition.id && d.company_id === company.id);
      const r = random();
      if (!deal) {
        const stage = spec.phase === "selling" ? (r < 0.5 ? "won" : r < 0.8 ? "negotiation" : "proposal") : r < 0.9 ? "won" : "negotiation";
        deal = push("deals", {
          ...stamps,
          id: id(),
          exhibition_id: exhibition.id,
          company_id: company.id,
          contact_id: contactOf(company.id).id,
          owner_id: company.owner_id,
          stage,
          source: pickOne(["تماس تلفنی", "دوره قبل", "معرفی", "وبسایت"]),
          expected_area_m2: booth.area_m2,
          probability: null,
          estimated_value: null,
          next_follow_up_at: stage === "won" ? null : at(Math.floor(random() * 6) - 2, 11),
          last_contact_at: at(-Math.floor(random() * 10) - 1, 12),
          lost_reason: null,
          sponsorship_tier: null,
          notes: null,
          stage_changed_at: at(-Math.floor(random() * 20) - 3),
          won_at: stage === "won" ? at(-Math.floor(random() * 20) - 3) : null,
          import_key: null,
        });
      }
      booth.deal_id = deal.id;
      booth.status = deal.stage === "won" ? "contracted" : "reserved";
      // The seller looks after the booth; signed booths also get someone from logistics.
      // Key accounts are followed by the director as well.
      booth.manager_ids = [
        deal.owner_id ?? sellers[0].id,
        ...(deal.stage === "won" ? [random() < 0.6 ? staff[4].id : staff[6].id] : []),
        ...(random() < 0.2 ? [staff[0].id] : []),
      ];

      if (deal.stage === "won") {
        const invoice = push("invoices", {
          ...stamps,
          id: id(),
          exhibition_id: exhibition.id,
          company_id: company.id,
          deal_id: deal.id,
          kind: "proforma",
          number: String(invoiceNo++),
          status: random() < 0.6 ? "registered" : "issued",
          official: true,
          issued_on: day(-Math.floor(random() * 30) - 5),
          due_on: day(spec.start - 7),
          currency: "IRR",
          vat_rate: 0.1,
          notes: null,
          import_key: null,
          created_by: staff[3].id,
        });
        push("invoice_lines", {
          ...stamps,
          id: id(),
          invoice_id: invoice.id,
          service: "space",
          description: `اجاره فضای غرفه ${booth.code}`,
          booth_id: booth.id,
          quantity: booth.area_m2,
          unit: "m2",
          unit_price: spec.rate,
          discount: random() < 0.2 ? Math.round(Number(booth.area_m2) * spec.rate * 0.1) : 0,
          sort_order: 0,
          import_key: null,
        });
        if (random() < 0.45) {
          push("invoice_lines", {
            ...stamps,
            id: id(),
            invoice_id: invoice.id,
            service: "booth_build",
            description: "غرفه سازی پیش ساخته",
            booth_id: booth.id,
            quantity: booth.area_m2,
            unit: "m2",
            unit_price: 18_000_000,
            discount: 0,
            sort_order: 1,
            import_key: null,
          });
        }
        const lines = out.invoice_lines.filter((l) => l.invoice_id === invoice.id);
        const subtotal = lines.reduce((s, l) => s + Math.round(Number(l.quantity) * Number(l.unit_price)) - Number(l.discount), 0);
        const total = subtotal + Math.round(subtotal * 0.1);
        const share = spec.phase === "strike" ? (random() < 0.85 ? 1 : 0.7) : random() < 0.45 ? 1 : random() < 0.7 ? 0.5 : random() < 0.85 ? 0.3 : 0;
        if (share > 0) {
          const first = share === 1 && random() < 0.5 ? total : Math.round(total * Math.min(share, 0.5));
          push("payments", {
            ...stamps,
            id: id(),
            company_id: company.id,
            deal_id: deal.id,
            invoice_id: invoice.id,
            amount: first,
            currency: "IRR",
            paid_on: day(-Math.floor(random() * 20) - 2),
            method: "bank_transfer",
            reference: null,
            notes: null,
            recorded_by: staff[3].id,
            voided_at: null,
            void_reason: null,
            import_key: null,
          });
          const rest = Math.round(total * share) - first;
          if (rest > 0) {
            push("payments", {
              ...stamps,
              id: id(),
              company_id: company.id,
              deal_id: deal.id,
              invoice_id: invoice.id,
              amount: rest,
              currency: "IRR",
              paid_on: day(-Math.floor(random() * 5)),
              method: "pos",
              reference: null,
              notes: null,
              recorded_by: staff[3].id,
              voided_at: null,
              void_reason: null,
              import_key: null,
            });
          }
          if (share === 1 && spec.phase !== "selling") booth.status = "paid";
        }

        // Furniture and equipment for most contracted booths.
        if (random() < 0.8) {
          const kit: Array<[string, number]> = [
            ["chair", 2 + Math.floor(random() * 4)],
            ["table", 1],
            ["spot", Math.max(2, Math.round(Number(booth.area_m2) / 6))],
            ["socket", 1],
          ];
          if (random() < 0.6) kit.push(["counter", 1]);
          if (random() < 0.25) kit.push(["tv", 1]);
          if (random() < 0.2) kit.push(["fridge", 1]);
          if (random() < 0.2) kit.push(["sofa", 1]);
          if (random() < 0.3) kit.push(["fascia", 1]);
          // One crew drops off a booth's kit together, and one picks it up.
          const crews = [[staff[4].id, staff[6].id], [staff[6].id], [staff[4].id, staff[6].id, staff[5].id], [staff[4].id]];
          const deliveryCrew = pickOne(crews);
          const collectCrew = pickOne(crews);
          const deliveryMinute = Math.floor(random() * 50);
          const collectMinute = Math.floor(random() * 50);
          for (const [sku, qty] of kit) {
            const it = item(sku);
            let stage = "requested";
            let delivered = 0;
            let collected = 0;
            let damaged = 0;
            const s = random();
            if (spec.phase === "build") stage = s < 0.45 ? "delivered" : s < 0.7 ? "prepared" : s < 0.85 ? "reserved" : s < 0.95 ? "requested" : "issue";
            if (spec.phase === "strike") {
              stage = !it.returnable ? "delivered" : s < 0.55 ? "collected" : s < 0.95 ? "delivered" : "issue";
            }
            if (stage === "delivered" || stage === "collected" || stage === "issue") delivered = stage === "issue" && spec.phase === "build" ? 0 : qty;
            if (stage === "collected") collected = qty;
            if (stage === "issue" && spec.phase === "strike") {
              damaged = 1;
              collected = qty - 1;
            }
            // A line with trouble is a problem on the booth; the line itself keeps its real stage.
            const trouble = stage === "issue";
            if (trouble) stage = spec.phase === "strike" ? "delivered" : "reserved";
            const lineId = id();
            if (trouble) {
              push("problems", {
                ...stamps,
                id: id(),
                exhibition_id: exhibition.id,
                booth_id: booth.id,
                deal_id: deal.id,
                order_id: lineId,
                step: spec.phase === "strike" ? "collection" : "delivery",
                note: spec.phase === "strike" ? `یک ${it.name_fa} آسیب دیده` : `${it.name_fa} در انبار کم است`,
                raised_by: pickOne([staff[4].id, staff[6].id]),
                raised_at: at(-1, 11, Math.floor(random() * 50)),
                assignee_id: null,
                resolved_at: null,
                resolved_by: null,
                resolution: null,
              });
            }
            push("equipment_orders", {
              ...stamps,
              id: lineId,
              exhibition_id: exhibition.id,
              booth_id: booth.id,
              deal_id: deal.id,
              item_id: it.id,
              quantity: qty,
              unit_price: it.rental_rate,
              stage,
              delivered_qty: delivered,
              collected_qty: collected,
              damaged_qty: damaged,
              delivery_due_at: at(spec.start - 1, 9),
              pickup_due_at: at(spec.end + 1, 16),
              delivered_at: delivered ? at(Math.min(spec.start - 1, -1), 10, deliveryMinute) : null,
              collected_at: collected ? at(-1, 15, collectMinute) : null,
              handled_by: staff[4].id,
              delivered_by: delivered ? deliveryCrew : [],
              collected_by: collected ? collectCrew : [],
              notes: null,
              import_key: null,
            });
          }
          // Sales agreed the list with the company a while ago.
          deal.furniture_confirmed_at = at(-12 - Math.floor(random() * 10), 11);
          deal.furniture_confirmed_by = deal.owner_id;
        }

        // Steps ticked on the floor so far.
        const steps: Record<string, { at: string; by: string }> = {};
        const tick = (key: string, day: number, who: string) => (steps[key] = { at: at(day, 9 + Math.floor(random() * 8), Math.floor(random() * 50)), by: who });
        if (spec.phase === "build") {
          if (random() < 0.7) tick("build", -1, staff[5].id);
          if (steps.build && random() < 0.6) tick("power", -1, staff[4].id);
        } else if (spec.phase === "strike") {
          tick("build", spec.start - 2, staff[5].id);
          tick("power", spec.start - 2, staff[4].id);
          tick("handover", spec.start - 1, staff[5].id);
          if (random() < 0.4) tick("clearance", -1, staff[6].id);
        }
        booth.steps = steps;
      }
    });

    // Extra pipeline: companies talking to us without a booth yet.
    if (spec.phase === "selling") {
      for (const company of companies.slice(0, 10)) {
        if (out.deals.some((d) => d.exhibition_id === exhibition.id && d.company_id === company.id)) continue;
        const stage = pickOne(["lead", "contacted", "qualified", "proposal"]);
        push("deals", {
          ...stamps,
          id: id(),
          exhibition_id: exhibition.id,
          company_id: company.id,
          contact_id: contactOf(company.id).id,
          owner_id: company.owner_id,
          stage,
          source: "دوره قبل",
          expected_area_m2: pickOne([24, 36, 42]),
          probability: null,
          estimated_value: null,
          next_follow_up_at: at(Math.floor(random() * 8) - 3, 10),
          last_contact_at: stage === "lead" ? null : at(-Math.floor(random() * 12) - 1),
          lost_reason: null,
          sponsorship_tier: null,
          notes: null,
          stage_changed_at: at(-Math.floor(random() * 15) - 1),
          won_at: null,
          import_key: null,
        });
      }
    }

    // A handful of conversations so follow-ups have history.
    for (const deal of out.deals.filter((d) => d.exhibition_id === exhibition.id).slice(0, 8)) {
      push("activities", {
        id: id(),
        company_id: deal.company_id,
        deal_id: deal.id,
        contact_id: deal.contact_id,
        kind: pickOne(["call", "meeting", "message"]),
        summary: pickOne(["پیگیری پیش فاکتور", "هماهنگی نقشه غرفه", "درخواست تخفیف", "ارسال قرارداد"]),
        body: null,
        outcome: null,
        occurred_at: at(-Math.floor(random() * 6) - 1, 12),
        next_follow_up_at: deal.next_follow_up_at,
        author_id: deal.owner_id,
        import_key: null,
        created_at: now,
      });
    }

    if (spec.phase === "build") {
      const tasks: Array<[string, string, number, string, number]> = [
        ["تحویل کانترها به سالن خلیج فارس", "in_progress", 4, "high", 0],
        ["هماهنگی برق اضطراری با سالن کویر", "todo", 4, "urgent", 1],
        ["ارسال یادآوری پرداخت به غرفه های مانده دار", "todo", 3, "high", 0],
        ["چاپ کارت ورود غرفه داران", "todo", 0, "normal", 1],
        ["بازدید ایمنی سازه غرفه های جزیره ای", "todo", 4, "high", 2],
        ["تایید نهایی نقشه سالن با مدیریت سایت", "done", 1, "normal", -2],
      ];
      for (const [title, status, who, priority, due] of tasks) {
        push("tasks", {
          ...stamps,
          id: id(),
          exhibition_id: exhibition.id,
          title,
          description: null,
          status,
          priority,
          assignee_id: staff[who].id,
          created_by: DEMO_STAFF_ID,
          due_at: at(due, 17),
          started_at: status === "in_progress" ? at(-1) : null,
          completed_at: status === "done" ? at(-1) : null,
          booth_id: null,
          deal_id: null,
          company_id: null,
          checklist: [],
          sort_order: 0,
        });
      }
    }
  }

  const notes: Array<[string, string, number]> = [
    ["کار جدید: هماهنگی برق اضطراری با سالن کویر", "task_assigned", -0.1],
    ["پرداخت ثبت شد: فاکتور ۱۲۰۴", "payment", -0.4],
    ["مریم صادقی روی «ارسال یادآوری پرداخت» نظر داد", "task_comment", -1],
  ];
  for (const [title, kind, offset] of notes) {
    push("notifications", {
      id: id(),
      recipient_id: DEMO_STAFF_ID,
      actor_id: staff[3].id,
      kind,
      title,
      body: null,
      link: null,
      entity_type: null,
      entity_id: null,
      read_at: null,
      created_at: new Date(Date.now() + offset * 86_400_000).toISOString(),
    });
  }

  return out;
}
