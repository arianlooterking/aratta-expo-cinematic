import type { Lang } from "@/lib/lang";

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
    items: Array<{ date: string; title: string; body: string; href?: string }>;
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
      "نهمین نمایشگاه بین المللی معدن، صنایع معدنی، ماشین آلات راه سازی و تجهیزات وابسته",
    date: "۱۲ تا ۱۵ مرداد ۱۴۰۴",
    location: "کرمان",
    status: "archived",
    image: "/official/kimex-2025-poster.jpg",
    href: "https://arattaexpo.ir/%d9%86%d9%87%d9%85%db%8c%d9%86-%d9%86%d9%85%d8%a7%db%8c%d8%b4%da%af%d8%a7%d9%87-%d8%a8%db%8c%d9%86-%d8%a7%d9%84%d9%85%d9%84%d9%84%db%8c-%d9%85%d8%b9%d8%af%d9%86%d8%8c-%d8%b5%d9%86%d8%a7%db%8c%d8%b9/",
    summary:
      "رویداد رسمی حوزه معدن و ماشین آلات که بر اساس تاریخ منتشرشده اکنون به عنوان آرشیو نمایش داده می شود.",
  },
  {
    title:
      "پنجمین نمایشگاه زنجیره تامین فولاد، مس، انرژی، فلزات آهنی و غیرآهنی و تجهیزات وابسته",
    date: "۸ تا ۱۱ بهمن ۱۴۰۳",
    location: "کرمان",
    status: "archived",
    image: "/official/steel-chain-poster.jpg",
    href: "https://arattaexpo.ir/%d9%be%d9%86%d8%ac%d9%85%db%8c%d9%86-%d9%86%d9%85%d8%a7%db%8c%d8%b4%da%af%d8%a7%d9%87-%d8%b2%d9%86%d8%ac%db%8c%d8%b1%d9%87-%d8%aa%d8%a7%d9%85%db%8c%d9%86-%d9%81%d9%88%d9%84%d8%a7%d8%af%d8%8c-%d9%85/",
    summary:
      "نمایشگاه تخصصی زنجیره فولاد و مس با تمرکز بر تامین، تجهیزات، انرژی و شبکه سازی صنعتی.",
  },
  {
    title: "دومین نمایشگاه نهضت تولید در معدن، صنایع معدنی و زنجیره فولاد و مس",
    date: "۱۹ تا ۲۲ آبان ۱۴۰۳",
    location: "سیرجان",
    status: "archived",
    image: "/official/mining-poster-2024.jpg",
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
    image: "/official/kimex-2025-poster.jpg",
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
    image: "/official/steel-chain-poster.jpg",
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
    image: "/official/mining-poster-2024.jpg",
    href: faExhibitions[2].href,
    summary:
      "Sirjan mining event connecting steel, copper, mineral-industry operators and regional partners.",
  },
];

const fa: SiteContent = {
  lang: "fa",
  dir: "rtl",
  brand: "شرکت توسعه تجارت اَرَت",
  nav: [
    { id: "home", label: "خانه" },
    { id: "about", label: "درباره ما" },
    { id: "exhibitions", label: "نمایشگاه ها" },
    { id: "registration", label: "ثبت نام" },
    { id: "forms", label: "فرم ها" },
    { id: "equipment", label: "اجاره تجهیزات" },
    { id: "participants", label: "مشارکت کنندگان" },
    { id: "news", label: "اخبار" },
    { id: "gallery", label: "گالری" },
    { id: "contact", label: "تماس" },
  ],
  hero: {
    title: "ساختن امروز، توسعه فردا",
    subtitle:
      "برگزارکننده تخصصی نمایشگاه های بین المللی صنایع معدنی، فلزات، فولاد و مس.",
    primary: "ثبت درخواست",
    secondary: "مشاهده نمایشگاه ها",
    stages: [
      {
        label: "مرحله ۰۱",
        title: "آغاز از صحنه خالص",
        body: "نور محیط، خطوط کف و جایگاه اولیه، سالن را به نقطه شروع یک تجربه نمایشگاهی دقیق تبدیل می کند.",
      },
      {
        label: "مرحله ۰۲",
        title: "نقشه فنی و مسیر حرکت",
        body: "شبکه نور، مسیر بازدیدکننده و محدوده های اجرایی، جانمایی غرفه را به یک نقشه قابل اجرا تبدیل می کنند.",
      },
      {
        label: "مرحله ۰۳",
        title: "ورود اجرا و متریال",
        body: "تیم نصب، تجهیزات، پنل ها و زیرساخت ها وارد سالن می شوند تا طرح از تصویر به ساخت نزدیک شود.",
      },
      {
        label: "مرحله ۰۴",
        title: "شکل گیری معماری غرفه",
        body: "ستون ها، شیشه، قاب های فلزی و نورهای خطی، حجم اصلی غرفه را با هویت صنعتی می سازند.",
      },
      {
        label: "مرحله ۰۵",
        title: "هویت برند و روایت صنعتی",
        body: "تابلوهای دو زبانه، نمایشگرهای معدن و فولاد و مسیر خدمات، پیام اَرَت را در صحنه فعال می کنند.",
      },
      {
        label: "مرحله ۰۶",
        title: "فضای آماده مذاکره",
        body: "پذیرش، جلسه، فرم های رسمی و مسیر تماس، تجربه نهایی را برای مشارکت کننده و بازدیدکننده کامل می کنند.",
      },
    ],
    metrics: [
      { value: "۱۵+", label: "سال تجربه حرفه ای" },
      { value: "۴۲+", label: "نمایشگاه بین المللی" },
      { value: "۲۸,۵۰۰+", label: "مشارکت کننده" },
      { value: "۳۵+", label: "کشور مشارکت کننده" },
    ],
  },
  exhibitions: {
    kicker: "Archive / نمایشگاه ها",
    title: "رویدادهای منتشرشده، با وضعیت واقعی",
    note:
      "تاریخ رویدادهای فعلی سایت رسمی قبل از امروز است؛ بنابراین تا دریافت تقویم تازه، همه به صورت آرشیو نمایش داده می شوند.",
    items: faExhibitions,
  },
  services: {
    kicker: "Operating System",
    title: "از برنامه ریزی نمایشگاه تا تجربه غرفه",
    items: [
      {
        title: "طراحی و سازماندهی رویداد",
        body: "ساختار سالن، نقشه مشارکت، زمان بندی، ارتباط با حامیان و مسیرهای عملیاتی در یک تجربه قابل پیگیری.",
      },
      {
        title: "ثبت نام و فرم های رسمی",
        body: "دسترسی روشن به فرم شرکت، فهرست مشارکت کنندگان و کانال امن برای درخواست غرفه یا پیگیری اطلاعات.",
      },
      {
        title: "اجاره تجهیزات و پشتیبانی اجرا",
        body: "نمایش لیست تجهیزات، نیازسنجی غرفه، هماهنگی لجستیک و آماده سازی فضای نمایشگاهی.",
      },
      {
        title: "رسانه، اخبار و گالری",
        body: "آرشیو رویدادها، تصاویر، خبرها و محتوای قابل استفاده برای معرفی حرفه ای هر نمایشگاه.",
      },
    ],
  },
  registration: {
    kicker: "Registration",
    title: "درخواست ثبت نام، بدون ادعای اتوماسیون جعلی",
    body:
      "این نسخه فرم رسمی و مسیر تماس را شفاف می کند. ارسال نهایی از طریق پیش نویس ایمیل انجام می شود تا بدون بک اند واقعی، هیچ ثبت نامی به صورت جعلی تایید نشود.",
    formTitle: "پیش نویس درخواست غرفه",
    fields: {
      name: "نام و نام خانوادگی",
      company: "نام شرکت",
      email: "ایمیل کاری",
      phone: "شماره تماس",
      interest: "موضوع درخواست",
      message: "شرح درخواست",
      submit: "ساخت پیش نویس ایمیل",
      success: "پیش نویس ایمیل باز شد. ارسال نهایی با شماست.",
      error: "نام، ایمیل معتبر و شرح درخواست را کامل کنید.",
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
        label: "فهرست مشارکت کنندگان KIMEX 2025",
        href: localFiles.participants,
        sourceHref: officialLinks.participants,
        type: "PDF",
        fileName: "kimex-2025-participants-list.pdf",
        size: "1.8 MB",
        category: "participants",
        description:
          "فهرست رسمی مشارکت کنندگان منتشرشده برای KIMEX 2025 با وضعیت آرشیوی.",
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
      { src: "/gallery/expo-floor-02.jpg", alt: "غرفه های نمایشگاهی", caption: "مسیر بازدید" },
      { src: "/gallery/simex-2020-01.jpg", alt: "نمایشگاه سیمکس ۲۰۲۰", caption: "سیمکس ۲۰۲۰" },
      { src: "/gallery/simex-2020-02.jpg", alt: "نشست نمایشگاهی", caption: "شبکه سازی" },
      { src: "/gallery/archive-03.jpg", alt: "آرشیو نمایشگاه اَرَت", caption: "آرشیو رویداد" },
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
        date: "۱۵ دسامبر ۲۰۲۴",
        title: "پنجمین نمایشگاه زنجیره تامین فولاد، مس، انرژی و تجهیزات وابسته",
        body: "خبر رسمی رویداد زنجیره تامین با مسیر مستقیم به ثبت درخواست و فرم های نمایشگاه.",
        href: "https://arattaexpo.ir/%d9%be%d9%86%d8%ac%d9%85%db%8c%d9%86-%d9%86%d9%85%d8%a7%db%8c%d8%b4%da%af%d8%a7%d9%87-%d8%b2%d9%86%d8%ac%db%8c%d8%b1%d9%87-%d8%aa%d8%a7%d9%85%db%8c%d9%86-%d9%81%d9%88%d9%84%d8%a7%d8%af%d8%8c-%d9%85/",
      },
      {
        date: "۵ سپتامبر ۲۰۲۴",
        title: "دومین نمایشگاه نهضت تولید در معدن و زنجیره فولاد و مس",
        body: "سیرجان میزبان فعالان معدنی، فولاد، مس و شرکت های صنعتی منطقه بود.",
        href: "https://arattaexpo.ir/%d8%af%d9%88%d9%85%db%8c%d9%86-%d9%86%d9%85%d8%a7%db%8c%d8%b4%da%af%d8%a7%d9%87-%d9%86%d9%87%d8%b6%d8%aa-%d8%aa%d9%88%d9%84%db%8c%d8%af-%d8%af%d8%b1-%d9%85%d8%b9%d8%af%d9%86%d8%8c-%d8%b5%d9%86%d8%a7/",
      },
      {
        date: "۷ ژانویه ۲۰۲۴",
        title: "هشتمین نمایشگاه بین المللی معدن و تجهیزات وابسته کرمان",
        body: "گزارش رویداد تخصصی معدن، ماشین آلات، راه سازی و تجهیزات وابسته در کرمان.",
        href: "https://arattaexpo.ir/%d9%87%d8%b4%d8%aa%d9%85%db%8c%d9%86-%d9%86%d9%85%d8%a7%db%8c%d8%b4%da%af%d8%a7%d9%87-%d8%a8%db%8c%d9%86-%d8%a7%d9%84%d9%85%d9%84%d9%84%db%8c-%d9%85%d8%b9%d8%af%d9%86%d8%8c-%d8%b5%d9%86%d8%a7%db%8c/",
      },
      {
        date: "۲۲ سپتامبر ۲۰۲۰",
        title: "ویدئو - بازدید و گفتگوی نمایشگاهی",
        body: "لینک رسمی محتوای ویدئویی منتشرشده در سایت قبلی اَرَت.",
        href: "https://arattaexpo.ir/video-%d8%b5%d8%ad%d8%a8%d8%aa-%d9%87%d8%a7%db%8c-%d9%85%d9%87%d9%86%d8%af%d8%b3-%d8%a7%db%8c%d9%85%d8%a7%d9%86-%d8%b9%d8%aa%db%8c%d9%82%db%8c-%d9%85%d8%af%db%8c%d8%b1-%d9%85%d8%ac%d8%aa%d9%85%d8%b9/",
      },
    ],
  },
  about: {
    kicker: "About Aratta",
    title: "زیرساخت قابل اعتماد برای رویدادهای تخصصی صنعتی",
    body:
      "شرکت توسعه تجارت اَرَت در حوزه برگزاری نمایشگاه های صنعتی و معدنی فعالیت می کند. این بازطراحی، محتوای فعلی را با زبان اجرایی روشن، تجربه بصری حرفه ای و مسیرهای تماس قابل اتکا بازسازی می کند.",
    proof: ["معدن و صنایع معدنی", "فولاد و مس", "ماشین آلات و تجهیزات", "رسانه و مشارکت"],
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
    placeName: "شرکت توسعه تجارت اَرَت",
    plusCode: officeMap.plusCode,
    mapsUrl: officeMap.mapsUrl,
    directionsUrl: officeMap.directionsUrl,
    mapEmbedUrl: officeMap.embedUrl,
  },
  footer: {
    copyright: "کلیه محتوای این وبسایت متعلق به شرکت توسعه تجارت اَرَت است.",
    credit: "نسخه سینمایی مستقل برای بازطراحی حرفه ای",
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
    { id: "gallery", label: "Gallery" },
    { id: "contact", label: "Contact" },
  ],
  hero: {
    title: "Build today. Empower tomorrow.",
    subtitle:
      "International exhibitions organizer for mining, metals, steel and copper industries.",
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
      { value: "15+", label: "years of experience" },
      { value: "42+", label: "international exhibitions" },
      { value: "28,500+", label: "participants" },
      { value: "35+", label: "participating countries" },
    ],
  },
  exhibitions: {
    kicker: "Archive / Exhibitions",
    title: "Published events with honest status",
    note:
      "The dates currently published on the official site are before today, so they are shown as archived until a fresh calendar is provided.",
    items: enExhibitions,
  },
  services: {
    kicker: "Operating System",
    title: "From exhibition planning to booth experience",
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
    title: "Inquiry-first registration without fake automation",
    body:
      "This version exposes official forms and creates a structured email draft. It does not pretend to complete registration without a configured production backend.",
    formTitle: "Booth inquiry draft",
    fields: {
      name: "Full name",
      company: "Company",
      email: "Work email",
      phone: "Phone",
      interest: "Inquiry topic",
      message: "Request details",
      submit: "Create email draft",
      success: "Email draft opened. Final sending remains under your control.",
      error: "Please complete your name, a valid email, and request details.",
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
          "Official KIMEX 2025 participation form, mirrored locally for direct download.",
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
        body: "Official video-post link from the previous Aratta website.",
        href: "https://arattaexpo.ir/video-%d8%b5%d8%ad%d8%a8%d8%aa-%d9%87%d8%a7%db%8c-%d9%85%d9%87%d9%86%d8%af%d8%b3-%d8%a7%db%8c%d9%85%d8%a7%d9%86-%d8%b9%d8%aa%db%8c%d9%82%db%8c-%d9%85%d8%af%db%8c%d8%b1-%d9%85%d8%ac%d8%aa%d9%85%d8%b9/",
      },
    ],
  },
  about: {
    kicker: "About Aratta",
    title: "Trusted infrastructure for specialized industrial events",
    body:
      "Aratta Trade Development Company organizes industrial and mining exhibitions. This redesign rebuilds the current public content with clearer operations language, premium visuals, and reliable contact paths.",
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
    credit: "Independent cinematic redesign build",
  },
};

export const contentByLang: Record<Lang, SiteContent> = { fa, en };

export function getContent(lang: Lang) {
  return contentByLang[lang];
}
