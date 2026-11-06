import type { Viewport } from "next";
import { headers } from "next/headers";
import { NativeBridge } from "@/components/native/NativeBridge";
import { isAppUserAgent } from "@/lib/native/links";

/**
 * Staff pages fill the whole screen, under the notch and home indicator, and
 * pad themselves with the safe-area insets. Inside the iOS / Android app the
 * page itself doesn't zoom (the hall map has its own pinch zoom) and text
 * fields don't trigger the browser's zoom-on-focus.
 */
export async function generateViewport(): Promise<Viewport> {
  const inApp = isAppUserAgent((await headers()).get("user-agent"));
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    ...(inApp ? { maximumScale: 1, userScalable: false } : {}),
  };
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <NativeBridge />
    </>
  );
}
