import type { Lang } from "@/lib/lang";
import type { Enums } from "./database.types";

type Labels<T extends string> = Record<T, Record<Lang, string>>;

export const roleLabels: Labels<Enums<"staff_role">> = {
  owner: { fa: "مالک", en: "Owner" },
  admin: { fa: "مدیر سامانه", en: "Admin" },
  manager: { fa: "مدیر", en: "Manager" },
  member: { fa: "کارشناس", en: "Member" },
  viewer: { fa: "فقط مشاهده", en: "Viewer" },
};

export const roleDescriptions: Labels<Enums<"staff_role">> = {
  owner: { fa: "همه دسترسی ها، از جمله مدیریت مالکان", en: "Everything, including other owners" },
  admin: { fa: "مدیریت کارکنان و دسترسی ها", en: "Manages staff and access" },
  manager: { fa: "تعریف نمایشگاه، حذف رکوردها، تاریخچه تغییرات", en: "Sets up exhibitions, deletes records, reads history" },
  member: { fa: "کار روزانه: فروش، نقشه، تجهیزات، کارها", en: "Day-to-day sales, map, equipment and tasks" },
  viewer: { fa: "مشاهده بدون امکان ویرایش", en: "Read-only access" },
};

export const departmentLabels: Labels<Enums<"department">> = {
  executive: { fa: "مدیریت", en: "Executive" },
  sales: { fa: "فروش", en: "Sales" },
  operations: { fa: "اجرا", en: "Operations" },
  finance: { fa: "مالی", en: "Finance" },
  logistics: { fa: "تجهیزات و لجستیک", en: "Logistics" },
  marketing: { fa: "بازاریابی", en: "Marketing" },
};

export const staffStatusLabels: Labels<Enums<"staff_status">> = {
  invited: { fa: "دعوت شده", en: "Invited" },
  active: { fa: "فعال", en: "Active" },
  suspended: { fa: "متوقف", en: "Suspended" },
};
