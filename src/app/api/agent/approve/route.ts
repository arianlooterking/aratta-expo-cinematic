import { NextResponse } from "next/server";
import { AgentError, runApproved, serviceDb } from "@/lib/agents/run";
import { createServerSupabase } from "@/lib/supabase/server";

// A signed-in person approves or rejects a change an agent asked to make.
// Allowed: admins, and the person the agent works for.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (status: number, body: unknown) => NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });

export async function POST(request: Request) {
  const session = await createServerSupabase();
  const db = serviceDb();
  if (!session || !db) return json(503, { error: "the portal is not connected to its database yet" });
  const { data: auth } = await session.auth.getUser();
  if (!auth.user) return json(401, { error: "sign in first" });
  const { data: me } = await db.from("staff_members").select("id, role, status").eq("user_id", auth.user.id).maybeSingle();
  if (!me || me.status !== "active") return json(403, { error: "no active staff account" });

  const body = (await request.json().catch(() => null)) as { id?: unknown; decision?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const decision = body?.decision === "approve" ? "approve" : body?.decision === "reject" ? "reject" : null;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !decision) return json(400, { error: 'Send { "id": "...", "decision": "approve" | "reject" }' });

  const { data: action } = await db.from("ai_agent_actions").select("id, status, acting_for").eq("id", id).maybeSingle();
  if (!action) return json(404, { error: "no such request" });
  const isAdmin = me.role === "owner" || me.role === "admin";
  if (!isAdmin && action.acting_for !== me.id) return json(403, { error: "only an admin or the person the agent works for can decide" });
  if (action.status !== "pending") return json(409, { error: "this request was already decided" });

  if (decision === "reject") {
    await db.from("ai_agent_actions").update({ status: "rejected", decided_by: me.id, decided_at: new Date().toISOString() }).eq("id", id).eq("status", "pending");
    return json(200, { ok: true, status: "rejected" });
  }
  try {
    const result = await runApproved(db, id, me.id);
    return json(200, { ok: true, status: "approved", result });
  } catch (error) {
    return json(error instanceof AgentError ? error.status : 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
