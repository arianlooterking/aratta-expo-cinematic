import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { bearerToken, parseAgentTokens, readAgentPost, type ChatAgent } from "@/lib/chat-agent";
import type { Database } from "@/lib/platform/database.types";
import { getSupabaseConfig } from "@/lib/supabase/config";

// AI agents post into (and read) the team's open channels with their own token.
// They never see direct messages or private channels.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function authenticate(request: Request): ChatAgent | null {
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return null;
  return parseAgentTokens(process.env.CHAT_AGENT_TOKENS).find((a) => same(a.token, token)) ?? null;
}

function admin() {
  const config = getSupabaseConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !key) return null;
  return createClient<Database>(config.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const json = (status: number, body: unknown) => NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });

/** Post a message: { "channel": "alerts", "text": "...", "link": "/staff/map" }. */
export async function POST(request: Request) {
  const agent = authenticate(request);
  if (!agent) return json(401, { error: "unknown agent token" });
  const db = admin();
  if (!db) return json(503, { error: "team chat is not connected to the database yet" });
  const post = readAgentPost(await request.json().catch(() => null));
  if ("error" in post) return json(400, post);
  const { data, error } = await db.rpc("chat_post_as_bot", {
    p_channel: post.channel,
    p_bot: agent.name,
    p_body: post.text,
    p_kind: post.kind,
    p_link: post.link,
  });
  if (error) return json(400, { error: error.message });
  return json(201, { id: data, agent: agent.name });
}

/** Read the latest messages of an open channel: ?channel=general&limit=30 */
export async function GET(request: Request) {
  const agent = authenticate(request);
  if (!agent) return json(401, { error: "unknown agent token" });
  const db = admin();
  if (!db) return json(503, { error: "team chat is not connected to the database yet" });
  const url = new URL(request.url);
  const slug = url.searchParams.get("channel") ?? "general";
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 30));
  const isId = /^[0-9a-f-]{36}$/i.test(slug);
  if (!isId && !/^[a-z0-9-]{1,40}$/.test(slug)) return json(400, { error: "channel must be a slug or an id" });
  const { data: channel } = await db
    .from("chat_channels")
    .select("id, slug, name, topic")
    .eq("kind", "channel")
    .eq("is_private", false)
    .is("archived_at", null)
    .eq(isId ? "id" : "slug", slug)
    .maybeSingle();
  if (!channel) return json(404, { error: "no open channel by that name" });
  const { data: rows, error } = await db
    .from("chat_messages")
    .select("id, author_id, bot_name, kind, body, created_at")
    .eq("channel_id", channel.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return json(500, { error: error.message });
  const ids = [...new Set((rows ?? []).map((r) => r.author_id).filter((id): id is string => Boolean(id)))];
  const { data: staff } = ids.length ? await db.from("staff_members").select("id, display_name, email").in("id", ids) : { data: [] };
  const names = new Map((staff ?? []).map((s) => [s.id, s.display_name ?? s.email]));
  return json(200, {
    channel,
    messages: (rows ?? []).reverse().map((r) => ({
      id: r.id,
      from: r.bot_name ?? names.get(r.author_id ?? "") ?? "همکار",
      bot: !r.author_id,
      kind: r.kind,
      text: r.body,
      at: r.created_at,
    })),
  });
}
