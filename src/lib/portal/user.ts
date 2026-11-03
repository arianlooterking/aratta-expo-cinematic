import { DEMO_STAFF_ID } from "./demo-seed.ts";
import type { Department, StaffRole } from "./types";

/** Who is using the portal, as the client needs it. */
export type PortalUser = {
  id: string;
  name: string;
  email: string | null;
  role: StaffRole;
  departments: Department[];
};

/** The signed-in person in demo mode: an owner, so every screen can be tried. */
export function demoUser(lang: "fa" | "en"): PortalUser {
  return {
    id: DEMO_STAFF_ID,
    name: lang === "fa" ? "شما (مدیر نمونه)" : "You (demo owner)",
    email: null,
    role: "owner",
    departments: ["executive"],
  };
}
