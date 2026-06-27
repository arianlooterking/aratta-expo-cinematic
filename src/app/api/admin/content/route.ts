import { contentByLang, type SiteContent } from "@/data/aratta-content";
import { isLang, type Lang } from "@/lib/lang";

export const dynamic = "force-dynamic";

type SavePayload = {
  lang?: string;
  content?: SiteContent;
  changeSummary?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function adminConfig() {
  return {
    hasWriteToken: Boolean(process.env.ADMIN_WRITE_TOKEN),
    hasWebhook: Boolean(process.env.ADMIN_CONTENT_WEBHOOK_URL),
    hasWebhookToken: Boolean(process.env.ADMIN_CONTENT_WEBHOOK_TOKEN),
  };
}

function validateContent(lang: Lang, content: SiteContent) {
  const errors: string[] = [];

  if (content.lang !== lang) errors.push("Content language does not match the requested language.");
  if (!Array.isArray(content.nav) || content.nav.length < 8) errors.push("Navigation is incomplete.");
  if (!content.hero?.title || !content.hero?.subtitle) errors.push("Hero title and subtitle are required.");
  if (!Array.isArray(content.exhibitions?.items)) errors.push("Exhibitions must be an array.");
  if (!Array.isArray(content.news?.items)) errors.push("Official news must be an array.");
  if (!Array.isArray(content.news?.relatedItems)) errors.push("Related news must be an array.");
  if (!content.contact?.address || !content.contact?.mapEmbedUrl) errors.push("Contact address and map embed URL are required.");
  if (!Array.isArray(content.registration?.downloads)) errors.push("Downloads must be an array.");

  return errors;
}

export async function GET() {
  const config = adminConfig();
  return jsonResponse({
    configured: config.hasWriteToken && config.hasWebhook,
    config,
    languages: Object.keys(contentByLang),
    requirements: [
      "ADMIN_WRITE_TOKEN: server-side passkey required to accept publish requests.",
      "ADMIN_CONTENT_WEBHOOK_URL: secure backend, GitHub action, CMS, or deploy workflow endpoint that persists content.",
      "ADMIN_CONTENT_WEBHOOK_TOKEN: optional bearer token sent to the webhook.",
    ],
  });
}

export async function POST(request: Request) {
  const config = adminConfig();

  if (!config.hasWriteToken || !config.hasWebhook) {
    return jsonResponse(
      {
        ok: false,
        code: "ADMIN_BACKEND_NOT_CONFIGURED",
        message:
          "Admin write backend is not configured. Drafts can be edited and exported, but production content is not changed until ADMIN_WRITE_TOKEN and ADMIN_CONTENT_WEBHOOK_URL are set.",
      },
      501,
    );
  }

  const token = request.headers.get("x-admin-token");
  if (!token || token !== process.env.ADMIN_WRITE_TOKEN) {
    return jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Invalid admin token." }, 401);
  }

  let payload: SavePayload;
  try {
    payload = (await request.json()) as SavePayload;
  } catch {
    return jsonResponse({ ok: false, code: "INVALID_JSON", message: "Request body must be valid JSON." }, 400);
  }

  if (!payload.lang || !isLang(payload.lang) || !payload.content) {
    return jsonResponse({ ok: false, code: "INVALID_PAYLOAD", message: "Payload must include lang and content." }, 400);
  }

  const errors = validateContent(payload.lang, payload.content);
  if (errors.length > 0) {
    return jsonResponse({ ok: false, code: "VALIDATION_FAILED", errors }, 422);
  }

  const webhookResponse = await fetch(process.env.ADMIN_CONTENT_WEBHOOK_URL as string, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.ADMIN_CONTENT_WEBHOOK_TOKEN
        ? { Authorization: `Bearer ${process.env.ADMIN_CONTENT_WEBHOOK_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({
      lang: payload.lang,
      content: payload.content,
      changeSummary: payload.changeSummary ?? "Admin content update",
      submittedAt: new Date().toISOString(),
    }),
  });

  if (!webhookResponse.ok) {
    return jsonResponse(
      {
        ok: false,
        code: "WEBHOOK_FAILED",
        message: `Webhook returned ${webhookResponse.status}. Production content was not confirmed as changed.`,
      },
      502,
    );
  }

  return jsonResponse({ ok: true, message: "Content update was accepted by the configured backend." });
}
