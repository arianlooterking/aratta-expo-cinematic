import type { Lang } from "@/lib/lang";
import { localizeSourceLink } from "@/lib/legacy-archive";

export type ExhibitionStatus = "archived";

export type Exhibition = {
  title: string;
  date: string;
  location: string;
  status: ExhibitionStatus;
  image: string;
  href: string;
  summary: string;
};

export type NewsItem = {
  date: string;
  title: string;
  body: string;
  href?: string;
};

export type RelatedNewsItem = NewsItem & {
  source: string;
  sector: string;
  image: string;
};

export type BlogPostStatus = "draft" | "published";

export type BlogPost = {
  slug: string;
  status: BlogPostStatus;
  featured: boolean;
  title: string;
  excerpt: string;
  body: string[];
  category: string;
  publishedAt: string;
  readTime: string;
  author: string;
  coverImage: string;
  coverAlt: string;
  seoTitle: string;
  seoDescription: string;
};

export type SiteContent = {
  lang: Lang;
  dir: "rtl" | "ltr";
  brand: string;
  nav: Array<{ id: string; label: string }>;
  hero: {
    title: string;
    subtitle: string;
    primary: string;
    secondary: string;
    stages: Array<{ label: string; title: string; body: string }>;
    metrics: Array<{ value: string; label: string }>;
  };
  exhibitions: {
    kicker: string;
    title: string;
    note: string;
    items: Exhibition[];
  };
  services: {
    kicker: string;
    title: string;
    items: Array<{ title: string; body: string }>;
  };
  registration: {
    kicker: string;
    title: string;
    body: string;
    formTitle: string;
    fields: {
      name: string;
      company: string;
      email: string;
      phone: string;
      interest: string;
      message: string;
      submit: string;
      success: string;
      error: string;
      honeypot: string;
    };
    downloads: Array<{
      label: string;
      href: string;
      sourceHref: string;
      type: string;
      fileName: string;
      size: string;
      category: "form" | "participants" | "equipment";
      description: string;
    }>;
  };
  gallery: {
    kicker: string;
    title: string;
    items: Array<{ src: string; alt: string; caption: string }>;
  };
  news: {
    kicker: string;
    title: string;
    items: NewsItem[];
    relatedKicker: string;
    relatedTitle: string;
    relatedBody: string;
    relatedItems: RelatedNewsItem[];
  };
  blog: {
    kicker: string;
    title: string;
    body: string;
    emptyLabel: string;
    readMoreLabel: string;
    allPostsLabel: string;
    featuredLabel: string;
    posts: BlogPost[];
  };
  about: {
    kicker: string;
    title: string;
    body: string;
    proof: Array<string>;
  };
  contact: {
    kicker: string;
    title: string;
    addressLabel: string;
    address: string;
    emailLabel: string;
    phoneLabel: string;
    mapLabel: string;
    phones: string[];
    placeName: string;
    plusCode: string;
    mapsUrl: string;
    directionsUrl: string;
    mapEmbedUrl: string;
  };
  footer: {
    copyright: string;
    credit: string;
  };
};

const officialLinks = {
  kimex: "https://arattaexpo.ir/wp-content/uploads/2025/07/kimex-2025-v7.pdf",
  participants:
    "https://arattaexpo.ir/wp-content/uploads/2025/07/%D9%84%DB%8C%D8%B3%D8%AA-%D9%85%D8%B4%D8%A7%D8%B1%DA%A9%D8%AA-%DA%A9%D9%86%D9%86%D8%AF%DA%AF%D8%A7%D9%86-kimex2025-V7.pdf",
  equipment:
    "https://arattaexpo.ir/wp-content/uploads/2023/12/%D8%AA%D8%AC%D9%87%DB%8C%D8%B2%D8%A7%D8%AA-scaled.jpg",
};

const localFiles = {
  kimex: "/downloads/kimex-2025-participation-form.pdf",
  participants: "/downloads/kimex-2025-participants-list.pdf",
  equipment: "/downloads/aratta-expo-equipment-list.jpg",
};

const officeMap = {
  plusCode: "8322+PQ5",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=8322%2BPQ5%2C%20Kerman%2C%20Kerman%20Province%2C%20Iran",
  directionsUrl:
    "https://www.google.com/maps/dir/?api=1&destination=8322%2BPQ5%2C%20Kerman%2C%20Kerman%20Province%2C%20Iran",
  embedUrl:
    "https://maps.google.com/maps?hl=fa&q=8322%2BPQ5%2C%20Kerman%2C%20Kerman%20Province%2C%20Iran&z=16&output=embed",
};

const faExhibitions: Exhibition[] = [
  {
    title:
      "نهمین نمایشگاه بین‌المللی معدن، صنایع معدنی، ماشین‌آلات راه‌سازی و تجهیزات وابسته",
    date: "۱۲ تا ۱۵ مرداد ۱۴۰۴",
    location: "کرمان",
    status: "archived",
    image: "/archive-covers/mining-machinery-archive.webp",
    href: "https://arattaexpo.ir/%d9%86%d9%87%d9%85%db%8c%d9%86-%d9%86%d9%85%d8%a7%db%8c%d8%b4%da%af%d8%a7%d9%87-%d8%a8%db%8c%d9%86-%d8%a7%d9%84%d9%85%d9%84%d9%84%db%8c-%d9%85%d8%b9%d8%af%d9%86%d8%8c-%d8%b5%d9%86%d8%a7%db%8c%d8%b9/",
    summary:
      "رویداد رسمی حوزه معدن و ماشین‌آلات که بر اساس تاریخ منتشرشده اکنون به عنوان آرشیو نمایش داده می‌شود.",
  },
  {
    title:
      "پنجمین نمایشگاه زنجیره تامین فولاد، مس، انرژی، فلزات آهنی و غیرآهنی و تجهیزات وابسته",
    date: "۸ تا ۱۱ بهمن ۱۴۰۳",
    location: "کرمان",
    status: "archived",
    image: "/archive-covers/steel-copper-energy-archive.webp",
    href: "https://arattaexpo.ir/%d9%be%d9%86%d8%ac%d9%85%db%8c%d9%86-%d9%86%d9%85%d8%a7%db%8c%d8%b4%da%af%d8%a7%d9%87-%d8%b2%d9%86%d8%ac%db%8c%d8%b1%d9%87-%d8%aa%d8%a7%d9%85%db%8c%d9%86-%d9%81%d9%88%d9%84%d8%a7%d8%af%d8%8c-%d9%85/",
    summary:
      "نمایشگاه تخصصی زنجیره فولاد و مس با تمرکز بر تامین، تجهیزات، انرژی و شبکه‌سازی صنعتی.",
  },
  {
    title: "دومین نمایشگاه نهضت تولید در معدن، صنایع معدنی و زنجیره فولاد و مس",
    date: "۱۹ تا ۲۲ آبان ۱۴۰۳",
    location: "سیرجان",
    status: "archived",
    image: "/archive-covers/mineral-production-archive.webp",
    href: "https://arattaexpo.ir/%d8%af%d9%88%d9%85%db%8c%d9%86-%d9%86%d9%85%d8%a7%db%8c%d8%b4%da%af%d8%a7%d9%87-%d9%86%d9%87%d8%b6%d8%aa-%d8%aa%d9%88%d9%84%db%8c%d8%af-%d8%af%d8%b1-%d9%85%d8%b9%d8%af%d9%86%d8%8c-%d8%b5%d9%86%d8%a7/",
    summary:
      "رویداد معدنی سیرجان با حضور فعالان فولاد، مس و صنایع معدنی منطقه.",
  },
];

const enExhibitions: Exhibition[] = [
  {
    title:
      "9th International Exhibition of Mining, Mineral Industries, Road Machinery and Related Equipment",
    date: "August 3-6, 2025",
    location: "Kerman",
    status: "archived",
    image: "/archive-covers/mining-machinery-archive.webp",
    href: faExhibitions[0].href,
    summary:
      "Official mining and machinery event shown as archive because the published date has already passed.",
  },
  {
    title:
      "5th Steel, Copper, Energy, Ferrous and Non-Ferrous Metals Supply Chain Exhibition",
    date: "January 27-30, 2025",
    location: "Kerman",
    status: "archived",
    image: "/archive-covers/steel-copper-energy-archive.webp",
    href: faExhibitions[1].href,
    summary:
      "Specialized supply-chain event for steel, copper, energy, equipment, and industrial networking.",
  },
  {
    title:
      "2nd Production Movement Exhibition for Mining, Mineral Industries, Steel and Copper",
    date: "November 9-12, 2024",
    location: "Sirjan",
    status: "archived",
    image: "/archive-covers/mineral-production-archive.webp",
    href: faExhibitions[2].href,
    summary:
      "Sirjan mining event connecting steel, copper, mineral-industry operators and regional partners.",
  },
];

const fa: SiteContent = {
  lang: "fa",
  dir: "rtl",
  brand: "شرکت توسعه تجارت اَرَتَ",
  nav: [
    { id: "home", label: "خانه" },
    { id: "about", label: "درباره ما" },
    { id: "exhibitions", label: "نمایشگاه‌ها" },
    { id: "registration", label: "ثبت نام" },
    { id: "forms", label: "فرم‌ها" },
    { id: "equipment", label: "اجاره تجهیزات" },
    { id: "participants", label: "مشارکت‌کنندگان" },
    { id: "news", label: "اخبار" },
    { id: "industry-news", label: "اخبار مرتبط" },
    { id: "blog", label: "مجله اَرَتَ" },
    { id: "gallery", label: "گالری" },
    { id: "contact", label: "تماس" },
  ],
  hero: {
    title: "نمایشگاه‌های صنعت و معدن",
    subtitle:
      "رویدادهای حرفه‌ای برای معرفی توانمندی‌ها، توسعه ارتباطات و شکل‌گیری همکاری‌های تجاری.",
    primary: "ثبت درخواست",
    secondary: "مشاهده نمایشگاه‌ها",
    stages: [
      {
        label: "مرحله ۰۱",
        title: "آغاز از صحنه خالص",
        body: "نور محیط، خطوط کف و جایگاه اولیه، سالن را به نقطه شروع یک تجربه نمایشگاهی دقیق تبدیل می‌کند.",
      },
      {
        label: "مرحله ۰۲",
        title: "نقشه فنی و مسیر حرکت",
        body: "شبکه نور، مسیر بازدیدکننده و محدوده‌های اجرایی، جانمایی غرفه را به یک نقشه قابل اجرا تبدیل می‌کنند.",
      },
      {
        label: "مرحله ۰۳",
        title: "ورود اجرا و متریال",
        body: "تیم نصب، تجهیزات، پنل‌ها و زیرساخت‌ها وارد سالن می‌شوند تا طرح از تصویر به ساخت نزدیک شود.",
      },
      {
        label: "مرحله ۰۴",
        title: "شکل گیری معماری غرفه",
        body: "ستون‌ها، شیشه، قاب‌های فلزی و نورهای خطی، حجم اصلی غرفه را با هویت صنعتی می‌سازند.",
      },
      {
        label: "مرحله ۰۵",
        title: "هویت برند و روایت صنعتی",
        body: "تابلوهای دو زبانه، نمایشگرهای معدن و فولاد و مسیر خدمات، پیام اَرَتَ را در صحنه فعال می‌کنند.",
      },
      {
        label: "مرحله ۰۶",
        title: "فضای آماده مذاکره",
        body: "پذیرش، جلسه، فرم‌های رسمی و مسیر تماس، تجربه نهایی را برای مشارکت‌کننده و بازدیدکننده کامل می‌کنند.",
      },
    ],
    metrics: [
      { value: "۱۰۰+", label: "غرفه در SIMEX 2020" },
      { value: "۸۰", label: "شرکت در SICE 2023" },
      { value: "۸,۰۰۰", label: "مترمربع فضای SIMEX 2020" },
      { value: "۶", label: "کشور حاضر در SIMEX 2020" },
    ],
  },
  exhibitions: {
    kicker: "Archive / نمایشگاه‌ها",
    title: "رویدادهای تخصصی اَرَتَ",
    note:
      "رویدادهای منتشرشده در این صفحه برگزار شده‌اند یا تاریخ اعلام شده آنها گذشته است. برای دریافت تقویم جدید، با دفتر اَرَتَ تماس بگیرید.",
    items: faExhibitions,
  },
  services: {
    kicker: "خدمات نمایشگاهی",
    title: "از برنامه‌ریزی رویداد تا حضور حرفه‌ای در نمایشگاه",
    items: [
      {
        title: "طراحی و سازماندهی رویداد",
        body: "ساختار سالن، نقشه مشارکت، زمان‌بندی، ارتباط با حامیان و مسیرهای عملیاتی در یک تجربه قابل پیگیری.",
      },
      {
        title: "ثبت نام و فرم‌های رسمی",
        body: "دسترسی روشن به فرم شرکت، فهرست مشارکت‌کنندگان و کانال امن برای درخواست غرفه یا پیگیری اطلاعات.",
      },
      {
        title: "اجاره تجهیزات و پشتیبانی اجرا",
        body: "نمایش لیست تجهیزات، نیازسنجی غرفه، هماهنگی لجستیک و آماده‌سازی فضای نمایشگاهی.",
      },
      {
        title: "رسانه، اخبار و گالری",
        body: "آرشیو رویدادها، تصاویر، خبرها و محتوای قابل استفاده برای معرفی حرفه‌ای هر نمایشگاه.",
      },
    ],
  },
  registration: {
    kicker: "Registration",
    title: "آغاز فرآیند حضور در نمایشگاه",
    body:
      "فرم‌های رسمی را دانلود کنید یا اطلاعات درخواست غرفه را آماده سازید. درخواست شما به صورت پیش‌نویس ایمیل آماده می‌شود و پس از ارسال، تیم اَرَتَ ادامه فرآیند را هماهنگ می‌کند.",
    formTitle: "پیش‌نویس درخواست غرفه",
    fields: {
      name: "نام و نام خانوادگی",
      company: "نام شرکت",
      email: "ایمیل کاری",
      phone: "شماره تماس",
      interest: "موضوع درخواست",
      message: "شرح درخواست",
      submit: "ساخت پیش‌نویس ایمیل",
      success: "درخواست باز کردن برنامه ایمیل انجام شد. اگر باز نشد، متن درخواست را کپی کنید و به info@arattaexpo.ir بفرستید. پیامی خودکار ارسال نشده است.",
      error: "نام، ایمیل معتبر و شرح درخواست با حداقل ۱۲ نویسه را وارد کنید.",
      honeypot: "این فیلد را خالی بگذارید",
    },
    downloads: [
      {
        label: "فرم شرکت در نمایشگاه KIMEX 2025",
        href: localFiles.kimex,
        sourceHref: officialLinks.kimex,
        type: "PDF",
        fileName: "kimex-2025-participation-form.pdf",
        size: "1.0 MB",
        category: "form",
        description:
          "فرم رسمی شرکت در نمایشگاه KIMEX 2025، آماده دانلود مستقیم از نسخه محلی سایت.",
      },
      {
        label: "فهرست مشارکت‌کنندگان KIMEX 2025",
        href: localFiles.participants,
        sourceHref: officialLinks.participants,
        type: "PDF",
        fileName: "kimex-2025-participants-list.pdf",
        size: "1.8 MB",
        category: "participants",
        description:
          "فهرست رسمی مشارکت‌کنندگان منتشرشده برای KIMEX 2025 با وضعیت آرشیوی.",
      },
      {
        label: "لیست تجهیزات نمایشگاه",
        href: localFiles.equipment,
        sourceHref: officialLinks.equipment,
        type: "JPG",
        fileName: "aratta-expo-equipment-list.jpg",
        size: "447 KB",
        category: "equipment",
        description:
          "تصویر رسمی لیست تجهیزات برای بررسی نیازهای اجرایی غرفه و هماهنگی اجاره.",
      },
    ],
  },
  gallery: {
    kicker: "Gallery",
    title: "تصویر واقعی از کف نمایشگاه",
    items: [
      { src: "/gallery/simex-2019-01.jpg", alt: "نمایشگاه سیمکس ۲۰۱۹", caption: "سیمکس ۲۰۱۹" },
      { src: "/gallery/expo-floor-01.jpg", alt: "سالن نمایشگاه", caption: "کف نمایشگاه" },
      { src: "/gallery/simex-2019-02.jpg", alt: "بازدیدکنندگان نمایشگاه", caption: "تعامل صنعتی" },
      { src: "/gallery/expo-floor-02.jpg", alt: "غرفه‌های نمایشگاهی", caption: "مسیر بازدید" },
      { src: "/gallery/simex-2020-01.jpg", alt: "نمایشگاه سیمکس ۲۰۲۰", caption: "سیمکس ۲۰۲۰" },
      { src: "/gallery/simex-2020-02.jpg", alt: "نشست نمایشگاهی", caption: "شبکه‌سازی" },
      { src: "/gallery/archive-03.jpg", alt: "آرشیو نمایشگاه اَرَتَ", caption: "آرشیو رویداد" },
      { src: "/gallery/archive-04.jpg", alt: "نمای سالن و بازدیدکنندگان", caption: "بازدید تخصصی" },
      { src: "/gallery/archive-05.jpg", alt: "تصویر نمایشگاه صنعتی", caption: "صنعت و معدن" },
      { src: "/gallery/archive-06.jpg", alt: "گزارش تصویری نمایشگاه", caption: "گزارش تصویری" },
    ],
  },
  news: {
    kicker: "Newsroom",
    title: "آخرین خبرهای رسمی در قالب آرشیو",
    items: [
      {
        date: "۱۲ مه ۲۰۲۵",
        title: "نهمین نمایشگاه بین‌المللی معدن، صنایع معدنی و ماشین‌آلات وابسته",
        body: "اطلاعیه و مدارک منتشرشده برای رویداد کرمان، همراه با یادداشت تعلیق موقت نمایشگاه‌های تجاری در زمان انتشار.",
        href: faExhibitions[0].href,
      },
      {
        date: "۱۵ دسامبر ۲۰۲۴",
        title: "پنجمین نمایشگاه زنجیره تامین فولاد، مس، انرژی و تجهیزات وابسته",
        body: "خبر رسمی رویداد زنجیره تامین با مسیر مستقیم به ثبت درخواست و فرم‌های نمایشگاه.",
        href: "https://arattaexpo.ir/%d9%be%d9%86%d8%ac%d9%85%db%8c%d9%86-%d9%86%d9%85%d8%a7%db%8c%d8%b4%da%af%d8%a7%d9%87-%d8%b2%d9%86%d8%ac%db%8c%d8%b1%d9%87-%d8%aa%d8%a7%d9%85%db%8c%d9%86-%d9%81%d9%88%d9%84%d8%a7%d8%af%d8%8c-%d9%85/",
      },
      {
        date: "۵ سپتامبر ۲۰۲۴",
        title: "دومین نمایشگاه نهضت تولید در معدن و زنجیره فولاد و مس",
        body: "سیرجان میزبان فعالان معدنی، فولاد، مس و شرکت‌های صنعتی منطقه بود.",
        href: "https://arattaexpo.ir/%d8%af%d9%88%d9%85%db%8c%d9%86-%d9%86%d9%85%d8%a7%db%8c%d8%b4%da%af%d8%a7%d9%87-%d9%86%d9%87%d8%b6%d8%aa-%d8%aa%d9%88%d9%84%db%8c%d8%af-%d8%af%d8%b1-%d9%85%d8%b9%d8%af%d9%86%d8%8c-%d8%b5%d9%86%d8%a7/",
      },
      {
        date: "۷ ژانویه ۲۰۲۴",
        title: "هشتمین نمایشگاه بین‌المللی معدن و تجهیزات وابسته کرمان",
        body: "گزارش رویداد تخصصی معدن، ماشین‌آلات، راه‌سازی و تجهیزات وابسته در کرمان.",
        href: "https://arattaexpo.ir/%d9%87%d8%b4%d8%aa%d9%85%db%8c%d9%86-%d9%86%d9%85%d8%a7%db%8c%d8%b4%da%af%d8%a7%d9%87-%d8%a8%db%8c%d9%86-%d8%a7%d9%84%d9%85%d9%84%d9%84%db%8c-%d9%85%d8%b9%d8%af%d9%86%d8%8c-%d8%b5%d9%86%d8%a7%db%8c/",
      },
      {
        date: "۲۲ سپتامبر ۲۰۲۰",
        title: "ویدئو - بازدید و گفتگوی نمایشگاهی",
        body: "گفتگو و گزارش ویدئویی از فضای نمایشگاه و فعالان صنعتی حاضر در رویداد.",
        href: "https://arattaexpo.ir/video-%d8%b5%d8%ad%d8%a8%d8%aa-%d9%87%d8%a7%db%8c-%d9%85%d9%87%d9%86%d8%af%d8%b3-%d8%a7%db%8c%d9%85%d8%a7%d9%86-%d8%b9%d8%aa%db%8c%d9%82%db%8c-%d9%85%d8%af%db%8c%d8%b1-%d9%85%d8%ac%d8%aa%d9%85%d8%b9/",
      },
    ],
    relatedKicker: "Industry Signals",
    relatedTitle: "اخبار مرتبط با معدن، فولاد، مس و زنجیره تامین",
    relatedBody:
      "گزارش‌ها، گفتگوها و مطالب آموزشی مرتبط با بازارهای معدن، فولاد، مس و زنجیره تامین؛ هر مطلب با تاریخ، حوزه و لینک منبع نمایش داده می‌شود.",
    relatedItems: [
      {
        date: "۴ ژانویه ۲۰۲۴",
        title: "پایان چهارمین نمایشگاه زنجیره تامین فولاد، مس، انرژی و تجهیزات وابسته",
        body:
          "گزارش رسمی از حضور فعالان زنجیره تامین در کرمان؛ برای نمایش ارتباط رویدادهای اَرَتَ با تامین، انرژی، فولاد و مس در بخش اخبار مرتبط.",
        href: "https://arattaexpo.ir/%d9%be%d8%a7%db%8c%d8%a7%d9%86-%da%86%d9%87%d8%a7%d8%b1%d9%85%db%8c%d9%86-%d9%86%d9%85%d8%a7%db%8c%d8%b4%da%af%d8%a7%d9%87-%d8%b2%d9%86%d8%ac%db%8c%d8%b1%d9%87-%d8%aa%d8%a7%d9%85%db%8c%d9%86-%d9%81/",
        source: "arattaexpo.ir",
        sector: "فولاد، مس و انرژی",
        image: "/official-archive/steel-supply-news-2024.jpg",
      },
      {
        date: "۷ ژانویه ۲۰۲۴",
        title: "کارگاه آموزشی راهبردهای نوآورانه در بازاریابی و فروش",
        body:
          "موضوع مکمل برای مشارکت‌کنندگان و غرفه داران؛ تمرکز بر آماده‌سازی تجاری، فروش نمایشگاهی و ارتباط موثر با مخاطبان صنعتی.",
        href: "https://arattaexpo.ir/%da%a9%d8%a7%d8%b1%da%af%d8%a7%d9%87-%d8%a2%d9%85%d9%88%d8%b2%d8%b4%db%8c-%d8%b1%d8%a7%d9%87-%d8%a8%d8%b1%d8%af%d9%87%d8%a7%db%8c-%d9%86%d9%88%d8%a2%d9%88%d8%b1%d8%a7%d9%86%d9%87-%d8%af%d8%b1-%d8%a8/",
        source: "arattaexpo.ir",
        sector: "بازاریابی نمایشگاهی",
        image: "/gallery/archive-05.jpg",
      },
      {
        date: "۲۲ سپتامبر ۲۰۲۰",
        title: "گفتگو و محتوای ویدئویی از فضای نمایشگاهی",
        body:
          "آرشیو ویدئویی برای تکمیل روایت رسانه‌ای اَرَتَ و استفاده در صفحه اخبار مرتبط، بدون ادعای تازه بودن رویداد.",
        href: "https://arattaexpo.ir/video-%d8%b5%d8%ad%d8%a8%d8%aa-%d9%87%d8%a7%db%8c-%d9%85%d9%87%d9%86%d8%af%d8%b3-%d8%a7%db%8c%d9%85%d8%a7%d9%86-%d8%b9%d8%aa%db%8c%d9%82%db%8c-%d9%85%d8%af%db%8c%d8%b1-%d9%85%d8%ac%d8%aa%d9%85%d8%b9/",
        source: "arattaexpo.ir",
        sector: "رسانه و گزارش تصویری",
        image: "/gallery/archive-06.jpg",
      },
    ],
  },
  blog: {
    kicker: "Aratta Journal / مجله اَرَتَ",
    title: "راهنمای عملی برای ساخت و مدیریت نمایشگاه",
    body:
      "مقاله‌های کوتاه و اجرایی برای تیم‌های برگزارکننده، غرفه‌داران و مدیران عملیات؛ از برنامه‌ریزی سالن تا تحویل تجهیزات و پیگیری تجاری.",
    emptyLabel: "هنوز مقاله منتشرشده‌ای وجود ندارد.",
    readMoreLabel: "مطالعه مقاله",
    allPostsLabel: "مشاهده همه مقاله‌ها",
    featuredLabel: "پیشنهاد سردبیر",
    posts: [
      {
        slug: "exhibition-booth-readiness-checklist",
        status: "published",
        featured: true,
        title: "چک‌لیست آماده‌سازی غرفه پیش از باز شدن درهای نمایشگاه",
        excerpt:
          "یک مسیر روشن برای کنترل سازه، برق، تجهیزات، مدارک و مسئول تحویل؛ پیش از آن‌که بازدیدکنندگان وارد سالن شوند.",
        body: [
          "آماده بودن غرفه فقط به پایان ساخت سازه محدود نمی‌شود. مسئول سالن باید بتواند در یک نگاه وضعیت برق، نور، تجهیزات درخواستی، علائم ایمنی و دسترسی غرفه‌دار را بررسی کند.",
          "کنترل را از موارد ثابت آغاز کنید: شماره غرفه، ابعاد نهایی، محل در و ستون، مسیر عبور و ظرفیت برق. هر مغایرت باید همان لحظه ثبت شود تا به یک پیام شفاهی گم‌شدنی تبدیل نشود.",
          "در مرحله تجهیزات، تعداد تحویل‌شده را با درخواست مقایسه کنید. اگر هشت صندلی ثبت شده اما هفت عدد در محل وجود دارد، کسری باید با وضعیت هشدار، مسئول پیگیری و زمان اقدام بعدی مشخص شود.",
          "پیش از تحویل غرفه، وضعیت مالی و استثناهای تاییدشده را نیز بررسی کنید. دسترسی نباید فقط بر اساس حافظه افراد یا پیام‌های پراکنده انجام شود.",
          "در پایان، یک بازبینی کوتاه با نام مسئول، ساعت کنترل و عکس مرجع ثبت کنید. این سابقه در زمان جمع‌آوری تجهیزات و حل اختلاف‌ها بسیار ارزشمند است.",
        ],
        category: "راهنمای اجرا",
        publishedAt: "۱۵ ژوئیه ۲۰۲۶",
        readTime: "۷ دقیقه",
        author: "تیم عملیات اَرَتَ",
        coverImage: "/hero-v6/desktop/stage-06.webp",
        coverAlt: "غرفه نمایشگاهی تکمیل‌شده و آماده بهره‌برداری",
        seoTitle: "چک‌لیست آماده‌سازی غرفه نمایشگاهی | مجله اَرَتَ",
        seoDescription:
          "چک‌لیست عملی کنترل سازه، تجهیزات، برق، تحویل و وضعیت مالی غرفه پیش از آغاز نمایشگاه.",
      },
      {
        slug: "equipment-logistics-without-shortages",
        status: "published",
        featured: true,
        title: "چطور تجهیزات نمایشگاه را بدون کسری و دوباره‌کاری مدیریت کنیم؟",
        excerpt:
          "از موجودی اکسل تا تخصیص غرفه، تحویل و جمع‌آوری؛ روشی ساده برای اینکه صندلی، تلویزیون و تجهیزات در مسیر گم نشوند.",
        body: [
          "موجودی نمایشگاه باید یک منبع واحد و قابل اعتماد داشته باشد. نام تجهیز، مدل، اندازه، تعداد کل، تعداد تخصیص‌یافته و تعداد باقی‌مانده حداقل اطلاعات لازم هستند.",
          "هر تجهیز را با یک نام و کد ثابت ثبت کنید. تلویزیون ۳۵ اینچ و ۵۵ اینچ دو قلم مستقل‌اند و نباید فقط با عنوان عمومی تلویزیون گزارش شوند.",
          "زمان تخصیص، سامانه باید بلافاصله موجودی باقی‌مانده را محاسبه کند. اگر درخواست جدید از ظرفیت واقعی عبور می‌کند، هشدار باید پیش از وعده دادن به غرفه‌دار نمایش داده شود.",
          "تحویل و جمع‌آوری دو رویداد جدا هستند. تعداد جمع‌آوری‌شده را مستقل ثبت کنید تا کسری، خرابی یا جابه‌جایی به غرفه دیگر قابل پیگیری باشد.",
          "در پایان هر شیفت، اقلام دارای کسری، اقلام آماده تحویل و اقلام جمع‌آوری‌نشده را در یک صف اقدام کوتاه به تیم بعدی تحویل دهید.",
        ],
        category: "تجهیزات و لجستیک",
        publishedAt: "۱۰ ژوئیه ۲۰۲۶",
        readTime: "۶ دقیقه",
        author: "تیم لجستیک اَرَتَ",
        coverImage: "/gallery/expo-floor-02.jpg",
        coverAlt: "مسیر غرفه‌ها و تجهیزات در سالن نمایشگاه",
        seoTitle: "مدیریت تجهیزات و موجودی نمایشگاه | مجله اَرَتَ",
        seoDescription:
          "راهنمای عملی کنترل موجودی، تخصیص، تحویل و جمع‌آوری تجهیزات غرفه‌های نمایشگاهی.",
      },
      {
        slug: "from-lead-to-booth-handover",
        status: "published",
        featured: false,
        title: "از اولین تماس تا تحویل غرفه؛ یک مسیر واحد برای فروش و عملیات",
        excerpt:
          "چگونه سرنخ، مذاکره، قرارداد، پرداخت و تحویل غرفه را به یک جریان قابل پیگیری تبدیل کنیم.",
        body: [
          "فرآیند نمایشگاه ماه‌ها پیش از ساخت سالن آغاز می‌شود. هر شرکت بالقوه باید با مسئول پیگیری، مرحله فروش، آخرین تماس و اقدام بعدی مشخص ثبت شود.",
          "پس از توافق اولیه، اطلاعات تجاری باید به عملیات متصل شود: متراژ غرفه، سالن، تجهیزات درخواستی، مبلغ قرارداد و برنامه پرداخت.",
          "پرداخت ناقص معمولاً مانع تحویل غرفه است، اما استثناها باید با دلیل مکتوب و تایید مسئول مجاز ثبت شوند. استثنای شفاهی قابل اتکا نیست.",
          "وقتی فروش و عملیات از یک پرونده مشترک استفاده کنند، تیم سالن می‌داند چه چیزی وعده داده شده و تیم مالی می‌بیند تحویل در چه مرحله‌ای قرار دارد.",
          "پس از نمایشگاه نیز همان پرونده برای جمع‌آوری تجهیزات، ثبت رضایت، پیگیری فرصت بعدی و برنامه‌ریزی رویداد آینده استفاده می‌شود.",
        ],
        category: "فروش و CRM",
        publishedAt: "۵ ژوئیه ۲۰۲۶",
        readTime: "۵ دقیقه",
        author: "تیم تجاری اَرَتَ",
        coverImage: "/gallery/simex-2020-01.jpg",
        coverAlt: "گفت‌وگوی تجاری در فضای نمایشگاهی",
        seoTitle: "مسیر فروش تا تحویل غرفه نمایشگاهی | مجله اَرَتَ",
        seoDescription:
          "راهنمای اتصال سرنخ، مذاکره، پرداخت، تخصیص و تحویل غرفه در یک جریان کاری نمایشگاهی.",
      },
    ],
  },
  about: {
    kicker: "About Aratta",
    title: "زیرساخت قابل اعتماد برای رویدادهای تخصصی صنعتی",
    body:
      "شرکت توسعه تجارت اَرَتَ برگزارکننده رویدادهای تخصصی در حوزه معدن، صنایع معدنی، فولاد، مس و زنجیره تامین است؛ بستری برای معرفی توانمندی‌ها، ارتباط تامین‌کنندگان با صنایع و شکل گیری همکاری‌های تجاری.",
    proof: ["معدن و صنایع معدنی", "فولاد و مس", "ماشین‌آلات و تجهیزات", "رسانه و مشارکت"],
  },
  contact: {
    kicker: "Contact",
    title: "تماس مستقیم با دفتر کرمان",
    addressLabel: "آدرس دفتر",
    address: "کرمان، بلوار جهاد، نبش کوچه ۴۳، ساختمان بانک پارسیان",
    emailLabel: "ایمیل",
    phoneLabel: "تلفن",
    mapLabel: "محدوده دفتر کرمان",
    phones: ["034-91305910", "034-91015910"],
    placeName: "شرکت توسعه تجارت اَرَتَ",
    plusCode: officeMap.plusCode,
    mapsUrl: officeMap.mapsUrl,
    directionsUrl: officeMap.directionsUrl,
    mapEmbedUrl: officeMap.embedUrl,
  },
  footer: {
    copyright: "کلیه محتوای این وبسایت متعلق به شرکت توسعه تجارت اَرَتَ است.",
    credit: "Aratta Expo — Exhibition, Trade Fair & Event",
  },
};

const en: SiteContent = {
  lang: "en",
  dir: "ltr",
  brand: "Aratta Expo",
  nav: [
    { id: "home", label: "Home" },
    { id: "about", label: "About" },
    { id: "exhibitions", label: "Exhibitions" },
    { id: "registration", label: "Registration" },
    { id: "forms", label: "Forms" },
    { id: "equipment", label: "Equipment" },
    { id: "participants", label: "Participants" },
    { id: "news", label: "News" },
    { id: "industry-news", label: "Related News" },
    { id: "blog", label: "Blog" },
    { id: "gallery", label: "Gallery" },
    { id: "contact", label: "Contact" },
  ],
  hero: {
    title: "Industry & mining exhibitions",
    subtitle:
      "Professional events designed to connect capabilities, decision-makers and commercial opportunities.",
    primary: "Register Interest",
    secondary: "View Exhibitions",
    stages: [
      {
        label: "Stage 01",
        title: "From blank hall to intent",
        body: "Ambient light, floor lines, and the first footprint turn the empty venue into a precise starting point.",
      },
      {
        label: "Stage 02",
        title: "Technical plan and visitor flow",
        body: "Grid lines, circulation paths, and operating zones translate the booth concept into an executable plan.",
      },
      {
        label: "Stage 03",
        title: "Execution team and materials",
        body: "Install crews, equipment, panels, and infrastructure enter the hall as the design moves from image to build.",
      },
      {
        label: "Stage 04",
        title: "Architecture takes shape",
        body: "Columns, glass, metal frames, and linear lighting define the booth volume with industrial clarity.",
      },
      {
        label: "Stage 05",
        title: "Brand identity and industry story",
        body: "Bilingual signage, mining and steel media, and service pathways bring Aratta's message into the space.",
      },
      {
        label: "Stage 06",
        title: "Ready for business conversations",
        body: "Reception, meetings, official forms, and contact paths complete the experience for participants and visitors.",
      },
    ],
    metrics: [
      { value: "100+", label: "booths at SIMEX 2020" },
      { value: "80", label: "companies at SICE 2023" },
      { value: "8,000", label: "sqm at SIMEX 2020" },
      { value: "6", label: "countries at SIMEX 2020" },
    ],
  },
  exhibitions: {
    kicker: "Archive / Exhibitions",
    title: "Aratta's specialized events",
    note:
      "The events shown here have concluded or their published dates have passed. Contact the Aratta office for the next confirmed calendar.",
    items: enExhibitions,
  },
  services: {
    kicker: "Exhibition Services",
    title: "From event planning to a professional exhibition presence",
    items: [
      {
        title: "Event organization",
        body: "Hall structure, participation maps, schedules, sponsor coordination, and operational paths in one clear experience.",
      },
      {
        title: "Registration and official forms",
        body: "Clear access to participation forms, participant lists, and a safe inquiry path for booth requests.",
      },
      {
        title: "Equipment rental and show support",
        body: "Equipment list visibility, booth needs discovery, logistics coordination, and exhibition-floor readiness.",
      },
      {
        title: "Media, news, and gallery",
        body: "Event archives, photography, news, and reusable content for professional exhibition communication.",
      },
    ],
  },
  registration: {
    kicker: "Registration",
    title: "Start your exhibition participation inquiry",
    body:
      "Download the official documents or prepare a structured booth inquiry. Your request opens as an email draft, and the Aratta team coordinates the next steps after you send it.",
    formTitle: "Booth inquiry draft",
    fields: {
      name: "Full name",
      company: "Company",
      email: "Work email",
      phone: "Phone",
      interest: "Inquiry topic",
      message: "Request details",
      submit: "Create email draft",
      success: "Your email app was requested. If it did not open, copy the inquiry and email info@arattaexpo.ir. No message has been sent automatically.",
      error: "Enter your name, a valid email and at least 12 characters of request details.",
      honeypot: "Leave this field empty",
    },
    downloads: [
      {
        label: "KIMEX 2025 participation form",
        href: localFiles.kimex,
        sourceHref: officialLinks.kimex,
        type: "PDF",
        fileName: "kimex-2025-participation-form.pdf",
        size: "1.0 MB",
        category: "form",
        description:
          "Official KIMEX 2025 participation form, available as a direct download.",
      },
      {
        label: "KIMEX 2025 participant list",
        href: localFiles.participants,
        sourceHref: officialLinks.participants,
        type: "PDF",
        fileName: "kimex-2025-participants-list.pdf",
        size: "1.8 MB",
        category: "participants",
        description:
          "Published KIMEX 2025 participant list, shown with archive context.",
      },
      {
        label: "Exhibition equipment list",
        href: localFiles.equipment,
        sourceHref: officialLinks.equipment,
        type: "JPG",
        fileName: "aratta-expo-equipment-list.jpg",
        size: "447 KB",
        category: "equipment",
        description:
          "Official equipment list image for booth requirements and rental coordination.",
      },
    ],
  },
  gallery: {
    kicker: "Gallery",
    title: "Real moments from the exhibition floor",
    items: [
      { src: "/gallery/simex-2019-01.jpg", alt: "SIMEX 2019 exhibition", caption: "SIMEX 2019" },
      { src: "/gallery/expo-floor-01.jpg", alt: "Exhibition hall", caption: "Exhibition floor" },
      { src: "/gallery/simex-2019-02.jpg", alt: "Exhibition visitors", caption: "Industrial meetings" },
      { src: "/gallery/expo-floor-02.jpg", alt: "Exhibition booths", caption: "Visitor route" },
      { src: "/gallery/simex-2020-01.jpg", alt: "SIMEX 2020 exhibition", caption: "SIMEX 2020" },
      { src: "/gallery/simex-2020-02.jpg", alt: "Exhibition session", caption: "Networking" },
      { src: "/gallery/archive-03.jpg", alt: "Aratta exhibition archive", caption: "Event archive" },
      { src: "/gallery/archive-04.jpg", alt: "Hall and exhibition visitors", caption: "Trade visitors" },
      { src: "/gallery/archive-05.jpg", alt: "Industrial exhibition photo", caption: "Industry floor" },
      { src: "/gallery/archive-06.jpg", alt: "Exhibition photo report", caption: "Photo report" },
    ],
  },
  news: {
    kicker: "Newsroom",
    title: "Official updates presented as an archive",
    items: [
      {
        date: "May 12, 2025",
        title: "9th international mining, mineral industries, and machinery exhibition",
        body: "Published notice and participation documents for the Kerman event, including the temporary trade-event suspension announced at the time.",
        href: enExhibitions[0].href,
      },
      {
        date: "December 15, 2024",
        title: "5th steel, copper, energy, and equipment supply chain exhibition",
        body: "Official event update with direct paths to inquiry and exhibition form downloads.",
        href: "https://arattaexpo.ir/%d9%be%d9%86%d8%ac%d9%85%db%8c%d9%86-%d9%86%d9%85%d8%a7%db%8c%d8%b4%da%af%d8%a7%d9%87-%d8%b2%d9%86%d8%ac%db%8c%d8%b1%d9%87-%d8%aa%d8%a7%d9%85%db%8c%d9%86-%d9%81%d9%88%d9%84%d8%a7%d8%af%d8%8c-%d9%85/",
      },
      {
        date: "September 5, 2024",
        title: "2nd production movement exhibition for mining, steel, and copper",
        body: "Sirjan hosted mining, steel, copper, and regional industrial operators.",
        href: "https://arattaexpo.ir/%d8%af%d9%88%d9%85%db%8c%d9%86-%d9%86%d9%85%d8%a7%db%8c%d8%b4%da%af%d8%a7%d9%87-%d9%86%d9%87%d8%b6%d8%aa-%d8%aa%d9%88%d9%84%db%8c%d8%af-%d8%af%d8%b1-%d9%85%d8%b9%d8%af%d9%86%d8%8c-%d8%b5%d9%86%d8%a7/",
      },
      {
        date: "January 7, 2024",
        title: "8th international exhibition of mining and related equipment in Kerman",
        body: "A specialized mining, road machinery, and related equipment event in Kerman.",
        href: "https://arattaexpo.ir/%d9%87%d8%b4%d8%aa%d9%85%db%8c%d9%86-%d9%86%d9%85%d8%a7%db%8c%d8%b4%da%af%d8%a7%d9%87-%d8%a8%db%8c%d9%86-%d8%a7%d9%84%d9%85%d9%84%d9%84%db%8c-%d9%85%d8%b9%d8%af%d9%86%d8%8c-%d8%b5%d9%86%d8%a7%db%8c/",
      },
      {
        date: "September 22, 2020",
        title: "Video - exhibition visit and interview",
        body: "Video interview and field coverage featuring industrial leaders and the exhibition environment.",
        href: "https://arattaexpo.ir/video-%d8%b5%d8%ad%d8%a8%d8%aa-%d9%87%d8%a7%db%8c-%d9%85%d9%87%d9%86%d8%af%d8%b3-%d8%a7%db%8c%d9%85%d8%a7%d9%86-%d8%b9%d8%aa%db%8c%d9%82%db%8c-%d9%85%d8%af%db%8c%d8%b1-%d9%85%d8%ac%d8%aa%d9%85%d8%b9/",
      },
    ],
    relatedKicker: "Industry Signals",
    relatedTitle: "Related news for mining, steel, copper, and supply-chain markets",
    relatedBody:
      "Reports, interviews, and practical insights for mining, steel, copper, and supply-chain markets, with a visible date, sector, and source link for every item.",
    relatedItems: [
      {
        date: "January 4, 2024",
        title: "4th steel, copper, energy, and equipment supply-chain exhibition concluded",
        body:
          "Official archive context connecting Aratta's program to supply-chain, energy, steel, and copper operators in Kerman.",
        href: "https://arattaexpo.ir/%d9%be%d8%a7%db%8c%d8%a7%d9%86-%da%86%d9%87%d8%a7%d8%b1%d9%85%db%8c%d9%86-%d9%86%d9%85%d8%a7%db%8c%d8%b4%da%af%d8%a7%d9%87-%d8%b2%d9%86%d8%ac%db%8c%d8%b1%d9%87-%d8%aa%d8%a7%d9%85%db%8c%d9%86-%d9%81/",
        source: "arattaexpo.ir",
        sector: "Steel, copper, and energy",
        image: "/official-archive/steel-supply-news-2024.jpg",
      },
      {
        date: "January 7, 2024",
        title: "Training workshop on innovative marketing and sales strategies",
        body:
          "Useful adjacent content for exhibitors preparing sales teams, booth conversations, and professional trade-show follow-up.",
        href: "https://arattaexpo.ir/%da%a9%d8%a7%d8%b1%da%af%d8%a7%d9%87-%d8%a2%d9%85%d9%88%d8%b2%d8%b4%db%8c-%d8%b1%d8%a7%d9%87-%d8%a8%d8%b1%d8%af%d9%87%d8%a7%db%8c-%d9%86%d9%88%d8%a2%d9%88%d8%b1%d8%a7%d9%86%d9%87-%d8%af%d8%b1-%d8%a8/",
        source: "arattaexpo.ir",
        sector: "Exhibition marketing",
        image: "/gallery/archive-05.jpg",
      },
      {
        date: "September 22, 2020",
        title: "Exhibition interview and video media archive",
        body:
          "Media archive entry that supports Aratta's story without falsely presenting old coverage as current news.",
        href: "https://arattaexpo.ir/video-%d8%b5%d8%ad%d8%a8%d8%aa-%d9%87%d8%a7%db%8c-%d9%85%d9%87%d9%86%d8%af%d8%b3-%d8%a7%db%8c%d9%85%d8%a7%d9%86-%d8%b9%d8%aa%db%8c%d9%82%db%8c-%d9%85%d8%af%db%8c%d8%b1-%d9%85%d8%ac%d8%aa%d9%85%d8%b9/",
        source: "arattaexpo.ir",
        sector: "Media and photo reports",
        image: "/gallery/archive-06.jpg",
      },
    ],
  },
  blog: {
    kicker: "Aratta Journal",
    title: "Practical guidance for building and operating exhibitions",
    body:
      "Short, field-ready articles for organizers, exhibitors, and operations teams—from hall planning to equipment handover and commercial follow-up.",
    emptyLabel: "No articles have been published yet.",
    readMoreLabel: "Read article",
    allPostsLabel: "View all articles",
    featuredLabel: "Editor’s pick",
    posts: [
      {
        slug: "exhibition-booth-readiness-checklist",
        status: "published",
        featured: true,
        title: "The booth-readiness checklist before exhibition doors open",
        excerpt:
          "A clear control path for structure, power, equipment, documents, and handover ownership before visitors enter the hall.",
        body: [
          "A booth is not ready simply because construction has finished. The hall lead must be able to verify power, lighting, requested equipment, safety signs, and exhibitor access in one short review.",
          "Begin with fixed facts: booth number, final dimensions, doors and columns, circulation clearance, and electrical capacity. Record every mismatch immediately so it does not disappear into a verbal message.",
          "For equipment, compare the delivered count with the request. If eight chairs were assigned but only seven are present, record the shortage, owner, and next action as a visible exception.",
          "Before handover, review payment status and any approved exception. Access decisions should never depend on individual memory or scattered messages.",
          "Close the check with the responsible person, inspection time, and a reference photo. That record becomes valuable during collection and dispute resolution.",
        ],
        category: "Field operations",
        publishedAt: "July 15, 2026",
        readTime: "7 min read",
        author: "Aratta Operations Team",
        coverImage: "/hero-v6/desktop/stage-06.webp",
        coverAlt: "Completed exhibition booth ready for operation",
        seoTitle: "Exhibition booth readiness checklist | Aratta Journal",
        seoDescription:
          "A practical checklist for booth structure, equipment, power, handover, and payment controls before an exhibition opens.",
      },
      {
        slug: "equipment-logistics-without-shortages",
        status: "published",
        featured: true,
        title: "How to manage exhibition equipment without shortages or rework",
        excerpt:
          "From spreadsheet inventory to booth allocation, delivery, and collection—a simple system for keeping every item accountable.",
        body: [
          "Exhibition inventory needs one reliable source of truth. Item name, model, size, total quantity, allocated quantity, and remaining quantity are the minimum useful fields.",
          "Use a stable name and code for every material. A 35-inch television and a 55-inch television are separate items and should never be reported under one generic television label.",
          "When an item is assigned, remaining stock should update immediately. If a new request exceeds real capacity, the warning must appear before a promise is made to the exhibitor.",
          "Delivery and collection are separate events. Record the collected count independently so shortages, damage, and transfers between booths remain traceable.",
          "At the end of every shift, hand over a short action queue covering shortages, items ready for delivery, and equipment still waiting for collection.",
        ],
        category: "Equipment and logistics",
        publishedAt: "July 10, 2026",
        readTime: "6 min read",
        author: "Aratta Logistics Team",
        coverImage: "/gallery/expo-floor-02.jpg",
        coverAlt: "Booth and equipment routes inside an exhibition hall",
        seoTitle: "Exhibition equipment and inventory management | Aratta Journal",
        seoDescription:
          "A practical guide to inventory, allocation, delivery, and collection for exhibition booth equipment.",
      },
      {
        slug: "from-lead-to-booth-handover",
        status: "published",
        featured: false,
        title: "From first lead to booth handover: one commercial and operations path",
        excerpt:
          "Connect leads, negotiations, contracts, payments, and booth handover in one traceable exhibition workflow.",
        body: [
          "Exhibition delivery starts months before hall construction. Every prospective company needs an owner, sales stage, latest contact, and clear next action.",
          "After initial agreement, commercial details must connect to operations: booth area, hall, requested equipment, contract value, and payment plan.",
          "An unpaid balance normally blocks handover, while exceptions require a written reason and approval from an authorized manager. Verbal exceptions are not auditable.",
          "When sales and operations share one account record, the hall team knows what was promised and finance can see how far delivery has progressed.",
          "After the exhibition, the same record supports equipment collection, satisfaction follow-up, the next opportunity, and planning for future events.",
        ],
        category: "Sales and CRM",
        publishedAt: "July 5, 2026",
        readTime: "5 min read",
        author: "Aratta Commercial Team",
        coverImage: "/gallery/simex-2020-01.jpg",
        coverAlt: "Commercial conversation on the exhibition floor",
        seoTitle: "From exhibition lead to booth handover | Aratta Journal",
        seoDescription:
          "A guide to connecting leads, negotiations, payments, booth allocation, and operational handover.",
      },
    ],
  },
  about: {
    kicker: "About Aratta",
    title: "Trusted infrastructure for specialized industrial events",
    body:
      "Aratta Trade Development Company organizes specialized events for mining, mineral industries, steel, copper, and supply chains—connecting industrial capabilities, suppliers, decision-makers, and new commercial opportunities.",
    proof: ["Mining industries", "Steel and copper", "Machinery and equipment", "Media and participation"],
  },
  contact: {
    kicker: "Contact",
    title: "Direct contact with the Kerman office",
    addressLabel: "Office address",
    address: "Kerman, Jahad Boulevard, corner of Alley 43, Parsian Bank Building",
    emailLabel: "Email",
    phoneLabel: "Phone",
    mapLabel: "Kerman office area",
    phones: ["034-91305910", "034-91015910"],
    placeName: "Aratta Trade Development Company",
    plusCode: officeMap.plusCode,
    mapsUrl: officeMap.mapsUrl,
    directionsUrl: officeMap.directionsUrl,
    mapEmbedUrl: officeMap.embedUrl,
  },
  footer: {
    copyright: "All website content belongs to Aratta Trade Development Company.",
    credit: "Aratta Expo — Exhibition, Trade Fair & Event",
  },
};

function connectArchive(content: SiteContent): SiteContent {
  const local = (href: string) => localizeSourceLink(href, content.lang);
  return {...content,
    exhibitions: {...content.exhibitions, items: content.exhibitions.items.map(item=>({...item,href:local(item.href)}))},
    news: {...content.news, items: content.news.items.map(item=>({...item,href:item.href?local(item.href):undefined})),relatedItems:content.news.relatedItems.map(item=>({...item,href:item.href?local(item.href):undefined}))},
    registration: {...content.registration, downloads:content.registration.downloads.map(item=>({...item,sourceHref:local(item.sourceHref)}))},
  };
}

export const contentByLang: Record<Lang, SiteContent> = { fa:connectArchive(fa), en:connectArchive(en) };

export function getContent(lang: Lang) {
  return contentByLang[lang];
}

export function getPublishedBlogPosts(lang: Lang) {
  return contentByLang[lang].blog.posts.filter((post) => post.status === "published");
}

export function getPublishedBlogPost(lang: Lang, slug: string) {
  return getPublishedBlogPosts(lang).find((post) => post.slug === slug);
}
