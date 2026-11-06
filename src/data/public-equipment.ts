// Rental items visitors can ask for from the equipment page. Names only:
// stock levels and prices stay in the staff portal, and the office confirms
// availability and cost by reply.

export type PublicEquipmentItem = { id: string; fa: string; en: string };
export type PublicEquipmentGroup = { id: string; fa: string; en: string; items: PublicEquipmentItem[] };

export const publicEquipment: PublicEquipmentGroup[] = [
  {
    id: "furniture",
    fa: "مبلمان",
    en: "Furniture",
    items: [
      { id: "chair-visitor", fa: "صندلی مهمان", en: "Visitor chair" },
      { id: "table-meeting", fa: "میز جلسه", en: "Meeting table" },
      { id: "sofa-lounge", fa: "مبل نمایشگاهی", en: "Lounge sofa" },
      { id: "counter-info", fa: "کانتر اطلاعات", en: "Information counter" },
      { id: "stool-bar", fa: "صندلی بار", en: "Bar stool" },
      { id: "stand-brochure", fa: "استند بروشور", en: "Brochure stand" },
    ],
  },
  {
    id: "screens",
    fa: "تلویزیون و نمایش",
    en: "Screens",
    items: [
      { id: "tv-35", fa: "تلویزیون ۳۵ اینچ", en: "35-inch TV" },
      { id: "tv-45", fa: "تلویزیون ۴۵ اینچ", en: "45-inch TV" },
      { id: "tv-55", fa: "تلویزیون ۵۵ اینچ", en: "55-inch TV" },
    ],
  },
  {
    id: "refreshments",
    fa: "پذیرایی",
    en: "Refreshments",
    items: [
      { id: "cooler-water", fa: "آبسردکن", en: "Water cooler" },
      { id: "fridge-undercounter", fa: "یخچال زیرکانتری", en: "Under-counter fridge" },
      { id: "kettle", fa: "کتری برقی و آب جوش", en: "Electric kettle / boiler" },
    ],
  },
  {
    id: "power",
    fa: "برق، نور و ارتباط",
    en: "Power, light and internet",
    items: [
      { id: "lighting-track", fa: "پک نور خطی غرفه", en: "Track-lighting kit" },
      { id: "power-distribution", fa: "توزیع برق غرفه", en: "Power distribution" },
      { id: "internet", fa: "اینترنت اختصاصی غرفه", en: "Dedicated booth internet" },
    ],
  },
];
