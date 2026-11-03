// Sends a push notification to a colleague's phones when the portal creates a
// row in public.notifications (task assigned, status changed, new comment...).
//
// Wiring (see docs/mobile-apps.md):
//   Supabase → Database → Webhooks → on INSERT into public.notifications →
//   HTTP POST to this function with header `x-push-secret: <PUSH_WEBHOOK_SECRET>`.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   PUSH_WEBHOOK_SECRET        shared with the webhook
//   FCM_SERVICE_ACCOUNT        Firebase service account JSON (Android)
//   APNS_KEY_P8, APNS_KEY_ID, APNS_TEAM_ID   Apple push key (iOS)
//   APNS_BUNDLE_ID             optional, defaults to ir.arattaexpo.staff
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
//
// Either platform can be left unconfigured; its phones are simply skipped.

import { createClient } from "npm:@supabase/supabase-js@2";

type NotificationRow = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  entity_type: string | null;
  entity_id: string | null;
};

type Device = { id: string; token: string; platform: "ios" | "android" };
type Message = { title: string; body: string; data: Record<string, string>; threadId: string };
type SendResult = "sent" | "invalid" | "skipped" | "failed";

const env = (key: string) => Deno.env.get(key)?.trim() || undefined;

const kindTitles: Record<string, { fa: string; en: string }> = {
  "task.assigned": { fa: "کار تازه برای شما", en: "New task for you" },
  "task.status": { fa: "وضعیت کار تغییر کرد", en: "Task status changed" },
  "task.comment": { fa: "نظر تازه روی کار", en: "New comment on a task" },
};

const statusLabels: Record<string, { fa: string; en: string }> = {
  todo: { fa: "انجام نشده", en: "To do" },
  in_progress: { fa: "در حال انجام", en: "In progress" },
  blocked: { fa: "متوقف", en: "Blocked" },
  done: { fa: "انجام شد", en: "Done" },
  cancelled: { fa: "لغو شد", en: "Cancelled" },
};

function compose(n: NotificationRow, locale: "fa" | "en", actorName: string | null): Message {
  const heading = kindTitles[n.kind]?.[locale];
  let detail = n.body ?? "";
  if (n.kind === "task.status") detail = statusLabels[detail]?.[locale] ?? detail;
  const by = actorName ? ` · ${actorName}` : "";
  const title = heading ? `${heading}${by}` : n.title;
  const body = heading ? [n.title, detail].filter(Boolean).join(" — ") : detail;
  return {
    title: title.slice(0, 120),
    body: body.slice(0, 400),
    threadId: n.entity_id ?? n.kind,
    data: {
      notificationId: n.id,
      kind: n.kind,
      link: n.link ?? "",
      entityType: n.entity_type ?? "",
      entityId: n.entity_id ?? "",
    },
  };
}

// --- Signing helpers (WebCrypto) --------------------------------------------

const encoder = new TextEncoder();

function base64url(input: ArrayBuffer | Uint8Array | string) {
  const bytes = typeof input === "string" ? encoder.encode(input) : new Uint8Array(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToDer(pem: string) {
  const clean = pem.replace(/-----[^-]+-----/g, "").replace(/\\n/g, "").replace(/\s+/g, "");
  return Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
}

async function signJwt(header: object, claims: object, key: CryptoKey, algorithm: AlgorithmIdentifier | EcdsaParams) {
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signature = await crypto.subtle.sign(algorithm, key, encoder.encode(unsigned));
  return `${unsigned}.${base64url(signature)}`;
}

// --- Android: Firebase Cloud Messaging (HTTP v1) ------------------------------

type ServiceAccount = { project_id: string; client_email: string; private_key: string };
let fcmToken: { value: string; expires: number } | null = null;

function serviceAccount(): ServiceAccount | null {
  const raw = env("FCM_SERVICE_ACCOUNT");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    console.error("FCM_SERVICE_ACCOUNT is not valid JSON");
    return null;
  }
}

async function fcmAccessToken(account: ServiceAccount) {
  if (fcmToken && fcmToken.expires > Date.now() + 60_000) return fcmToken.value;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const now = Math.floor(Date.now() / 1000);
  const assertion = await signJwt(
    { alg: "RS256", typ: "JWT" },
    {
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    key,
    { name: "RSASSA-PKCS1-v1_5" },
  );
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error(`FCM auth failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  fcmToken = { value: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return fcmToken.value;
}

async function sendAndroid(device: Device, message: Message): Promise<SendResult> {
  const account = serviceAccount();
  if (!account) return "skipped";
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${await fcmAccessToken(account)}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token: device.token,
        notification: { title: message.title, body: message.body },
        data: message.data,
        android: {
          priority: "high",
          notification: { channel_id: "aratta-updates", tag: message.threadId, icon: "ic_stat_aratta", color: "#A9822F" },
        },
      },
    }),
  });
  if (res.ok) return "sent";
  const text = await res.text();
  if (res.status === 404 || /UNREGISTERED|registration-token-not-registered/i.test(text)) return "invalid";
  if (res.status === 400 && /INVALID_ARGUMENT/.test(text) && /token/i.test(text)) return "invalid";
  console.error(`FCM ${res.status}: ${text}`);
  return "failed";
}

// --- iOS: Apple Push Notification service --------------------------------------

let apnsJwt: { value: string; issued: number } | null = null;

async function apnsAuthToken() {
  const p8 = env("APNS_KEY_P8");
  const keyId = env("APNS_KEY_ID");
  const teamId = env("APNS_TEAM_ID");
  if (!p8 || !keyId || !teamId) return null;
  // Apple accepts a token for an hour and rejects refreshing it too often.
  if (apnsJwt && Date.now() - apnsJwt.issued < 40 * 60_000) return apnsJwt.value;
  const key = await crypto.subtle.importKey("pkcs8", pemToDer(p8), { name: "ECDSA", namedCurve: "P-256" }, false, [
    "sign",
  ]);
  const value = await signJwt(
    { alg: "ES256", kid: keyId },
    { iss: teamId, iat: Math.floor(Date.now() / 1000) },
    key,
    { name: "ECDSA", hash: "SHA-256" },
  );
  apnsJwt = { value, issued: Date.now() };
  return value;
}

async function sendIos(device: Device, message: Message): Promise<SendResult> {
  const auth = await apnsAuthToken();
  if (!auth) return "skipped";
  const payload = JSON.stringify({
    aps: { alert: { title: message.title, body: message.body }, sound: "default", "thread-id": message.threadId },
    ...message.data,
  });
  const headers = {
    authorization: `bearer ${auth}`,
    "apns-topic": env("APNS_BUNDLE_ID") ?? "ir.arattaexpo.staff",
    "apns-push-type": "alert",
    "apns-priority": "10",
    "content-type": "application/json",
  };
  // TestFlight and App Store builds use production; builds run from Xcode use the sandbox.
  for (const host of ["api.push.apple.com", "api.sandbox.push.apple.com"]) {
    const res = await fetch(`https://${host}/3/device/${device.token}`, { method: "POST", headers, body: payload });
    if (res.ok) return "sent";
    const text = await res.text();
    if (res.status === 400 && /BadDeviceToken/.test(text)) continue; // try the other environment
    if (res.status === 410 || /Unregistered|DeviceTokenNotForTopic/.test(text)) return "invalid";
    console.error(`APNs ${host} ${res.status}: ${text}`);
    return "failed";
  }
  return "invalid";
}

// --- Handler -----------------------------------------------------------------

Deno.serve(async (req) => {
  const secret = env("PUSH_WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-push-secret") !== secret) {
    return new Response("forbidden", { status: 403 });
  }
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const payload = (await req.json().catch(() => null)) as
    | { type?: string; table?: string; schema?: string; record?: NotificationRow }
    | null;
  const n = payload?.record;
  if (!n || payload?.type !== "INSERT" || payload?.table !== "notifications") {
    return Response.json({ skipped: "not a new notification" });
  }

  const supabase = createClient(env("SUPABASE_URL")!, env("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const [{ data: devices, error }, { data: people }] = await Promise.all([
    supabase.from("push_devices").select("id, token, platform").eq("staff_id", n.recipient_id),
    supabase
      .from("staff_members")
      .select("id, locale, display_name, email, status")
      .in("id", [n.recipient_id, n.actor_id].filter(Boolean) as string[]),
  ]);
  if (error) return new Response(error.message, { status: 500 });

  const recipient = people?.find((p) => p.id === n.recipient_id);
  if (!devices?.length || !recipient || recipient.status !== "active") {
    return Response.json({ sent: 0 });
  }
  const actor = people?.find((p) => p.id === n.actor_id);
  const locale = recipient.locale === "en" ? "en" : "fa";
  const message = compose(n, locale, actor?.display_name || actor?.email?.split("@")[0] || null);

  const results = await Promise.all(
    (devices as Device[]).map(async (device) => {
      try {
        return { device, result: device.platform === "ios" ? await sendIos(device, message) : await sendAndroid(device, message) };
      } catch (err) {
        console.error(err);
        return { device, result: "failed" as SendResult };
      }
    }),
  );

  const invalid = results.filter((r) => r.result === "invalid").map((r) => r.device.id);
  if (invalid.length) await supabase.from("push_devices").delete().in("id", invalid);

  const count = (kind: SendResult) => results.filter((r) => r.result === kind).length;
  return Response.json({ sent: count("sent"), removed: invalid.length, skipped: count("skipped"), failed: count("failed") });
});
