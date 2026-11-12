import "server-only";
import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/platform/database.types";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { agentSignature, checkInput, isAgentToken, needsApproval, toolByName, toolsFor, type AgentScope } from "./tools";

// Runs agent tools against the database with the service key. Every check a
// person would meet in the portal is repeated here: the acting person must be
// active, writes need at least member rights, and scopes limit the tools.

type Db = SupabaseClient<Database>;
type Agent = Database["public"]["Tables"]["ai_agents"]["Row"];
type Staff = Pick<Database["public"]["Tables"]["staff_members"]["Row"], "id" | "display_name" | "email" | "role" | "status" | "departments">;

export type AgentContext = {
  db: Db;
  agent: Agent;
  actingFor: Staff | null;
  signature: string;
  scopes: AgentScope[];
};

export class AgentError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const rank = { owner: 5, admin: 4, manager: 3, member: 2, viewer: 1 } as const;

export function serviceDb(): Db | null {
  const config = getSupabaseConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !key) return null;
  return createClient<Database>(config.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Who is calling: the agent behind a Bearer key, and the person it acts for. */
export async function authenticateAgent(token: string | null): Promise<AgentContext> {
  if (!token || !isAgentToken(token)) throw new AgentError("unknown agent key", 401);
  const db = serviceDb();
  if (!db) throw new AgentError("the portal is not connected to its database yet", 503);
  const { data: agent } = await db.from("ai_agents").select("*").eq("token_hash", hashToken(token)).maybeSingle();
  if (!agent || agent.revoked_at) throw new AgentError("unknown or revoked agent key", 401);
  if (agent.expires_at && Date.parse(agent.expires_at) < Date.now()) throw new AgentError("this agent key has expired", 401);
  let actingFor: Staff | null = null;
  if (agent.acts_for) {
    const { data } = await db.from("staff_members").select("id, display_name, email, role, status, departments").eq("id", agent.acts_for).maybeSingle();
    if (!data || data.status !== "active") throw new AgentError("the person this agent works for is no longer active", 403);
    actingFor = data;
  }
  void db.from("ai_agents").update({ last_used_at: new Date().toISOString() }).eq("id", agent.id).then(() => undefined);
  return {
    db,
    agent,
    actingFor,
    signature: agentSignature(agent.name, actingFor ? actingFor.display_name ?? actingFor.email : null),
    scopes: agent.scopes.filter((s): s is AgentScope => ["read", "tasks", "sales", "operations", "chat"].includes(s)),
  };
}

export function listTools(ctx: AgentContext) {
  return toolsFor(ctx.scopes);
}

const canWrite = (ctx: AgentContext) => !ctx.actingFor || rank[ctx.actingFor.role] >= rank.member;
const canManage = (ctx: AgentContext) => Boolean(ctx.actingFor && rank[ctx.actingFor.role] >= rank.manager);

/** Run one tool call. Sensitive writes are queued for approval instead. */
export async function callTool(ctx: AgentContext, name: string, rawInput: unknown) {
  const tool = toolByName.get(name);
  if (!tool || !toolsFor(ctx.scopes).includes(tool)) throw new AgentError(`this agent cannot use "${name}"`, 403);
  const checked = checkInput(tool, rawInput);
  if (!checked.ok) throw new AgentError(checked.error);
  const input = checked.input;
  if (tool.writes && !canWrite(ctx)) throw new AgentError("the person this agent works for can only view", 403);

  if (tool.writes && needsApproval(tool, input, ctx.agent.needs_approval)) {
    const summary = describe(name, input);
    const { data, error } = await ctx.db
      .from("ai_agent_actions")
      .insert({ agent_id: ctx.agent.id, acting_for: ctx.actingFor?.id ?? null, tool: name, summary, input: input as Json, status: "pending" })
      .select("id")
      .single();
    if (error) throw new AgentError(error.message, 500);
    return { status: "waiting_for_approval", action_id: data.id, message: `Queued for a person to approve in the portal (Agents page): ${summary}` };
  }

  try {
    const result = await execute(ctx, name, input);
    if (tool.writes) {
      await ctx.db.from("ai_agent_actions").insert({ agent_id: ctx.agent.id, acting_for: ctx.actingFor?.id ?? null, tool: name, summary: describe(name, input), input: input as Json, status: "done", result: result as Json });
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (tool.writes) {
      await ctx.db.from("ai_agent_actions").insert({ agent_id: ctx.agent.id, acting_for: ctx.actingFor?.id ?? null, tool: name, summary: describe(name, input), input: input as Json, status: "failed", error: message });
    }
    throw error instanceof AgentError ? error : new AgentError(message, 500);
  }
}

/** Run a call that a person approved. */
export async function runApproved(db: Db, actionId: string, decidedBy: string) {
  const { data: action } = await db.from("ai_agent_actions").select("*").eq("id", actionId).maybeSingle();
  if (!action || action.status !== "pending") throw new AgentError("this request was already decided", 409);
  const { data: agent } = await db.from("ai_agents").select("*").eq("id", action.agent_id).maybeSingle();
  if (!agent || agent.revoked_at) throw new AgentError("the agent was removed", 409);
  let actingFor: Staff | null = null;
  if (agent.acts_for) {
    const { data } = await db.from("staff_members").select("id, display_name, email, role, status, departments").eq("id", agent.acts_for).maybeSingle();
    actingFor = data ?? null;
  }
  const ctx: AgentContext = { db, agent, actingFor, signature: agentSignature(agent.name, actingFor?.display_name ?? null), scopes: agent.scopes as AgentScope[] };
  const now = new Date().toISOString();
  try {
    const result = await execute(ctx, action.tool, action.input as Record<string, unknown>);
    await db.from("ai_agent_actions").update({ status: "approved", result: result as Json, decided_by: decidedBy, decided_at: now }).eq("id", actionId);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.from("ai_agent_actions").update({ status: "failed", error: message, decided_by: decidedBy, decided_at: now }).eq("id", actionId);
    throw new AgentError(message);
  }
}

function describe(name: string, input: Record<string, unknown>) {
  const bits = Object.entries(input)
    .filter(([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    .map(([k, v]) => `${k}=${String(v).slice(0, 80)}`)
    .join(", ");
  return `${name}(${bits})`.slice(0, 400);
}

// ------------------------------------------------------------------ tools

async function currentExhibition(ctx: AgentContext, id?: unknown) {
  if (typeof id === "string") {
    const { data } = await ctx.db.from("exhibitions").select("id, name_fa, name_en, status").eq("id", id).maybeSingle();
    if (!data) throw new AgentError("no exhibition with that id");
    return data;
  }
  const { data } = await ctx.db
    .from("exhibitions")
    .select("id, name_fa, name_en, status, starts_on")
    .not("status", "in", "(closed,archived)")
    .order("starts_on", { ascending: true, nullsFirst: false })
    .limit(1);
  if (!data?.length) throw new AgentError("there is no active exhibition; pass exhibition_id");
  return data[0];
}

async function boothByCode(ctx: AgentContext, code: string, exhibitionId?: unknown) {
  const exhibition = await currentExhibition(ctx, exhibitionId);
  const { data } = await ctx.db.from("booths").select("id, code, status, deal_id, exhibition_id").eq("exhibition_id", exhibition.id).ilike("code", code).maybeSingle();
  if (!data) throw new AgentError(`no booth "${code}" in ${exhibition.name_en ?? exhibition.name_fa}`);
  return data;
}

async function staffByEmail(ctx: AgentContext, email: string) {
  const { data } = await ctx.db.from("staff_members").select("id, display_name, email, status").ilike("email", email).maybeSingle();
  if (!data || data.status !== "active") throw new AgentError(`no active colleague with email ${email}`);
  return data;
}

const limitOf = (input: Record<string, unknown>, fallback: number, max: number) => Math.min(max, Math.max(1, (input.limit as number) || fallback));
const day = () => new Date().toISOString().slice(0, 10);

async function execute(ctx: AgentContext, name: string, input: Record<string, unknown>): Promise<unknown> {
  const db = ctx.db;
  const me = ctx.actingFor?.id ?? null;
  const fail = (error: { message: string } | null) => {
    if (error) throw new AgentError(error.message);
  };

  switch (name) {
    case "whoami":
      return {
        agent: ctx.agent.name,
        provider: ctx.agent.provider,
        acts_for: ctx.actingFor ? { id: ctx.actingFor.id, name: ctx.actingFor.display_name, email: ctx.actingFor.email, role: ctx.actingFor.role } : null,
        signed_as: ctx.signature,
        scopes: ctx.scopes,
        asks_before_sensitive_changes: ctx.agent.needs_approval,
        today: day(),
        notes: "Persian is the team's working language. Dates are stored in ISO (Gregorian); the portal shows them in the Persian calendar.",
      };

    case "list_exhibitions": {
      let query = db.from("exhibitions").select("id, name_fa, name_en, edition, status, venue_fa, venue_en, starts_on, ends_on, build_starts_on, strike_ends_on").order("starts_on", { ascending: false, nullsFirst: true });
      if (!input.include_archived) query = query.neq("status", "archived");
      const { data, error } = await query.limit(50);
      fail(error);
      return { exhibitions: data };
    }

    case "list_booths": {
      const exhibition = await currentExhibition(ctx, input.exhibition_id);
      let query = db.from("booths").select("id, code, area_m2, status, zone, deal_id, hall_id").eq("exhibition_id", exhibition.id).order("code");
      if (input.status) query = query.eq("status", input.status as Database["public"]["Enums"]["booth_status"]);
      const { data: booths, error } = await query.limit(limitOf(input, 100, 200));
      fail(error);
      const dealIds = [...new Set((booths ?? []).map((b) => b.deal_id).filter(Boolean))] as string[];
      const { data: deals } = dealIds.length ? await db.from("deals").select("id, company_id").in("id", dealIds) : { data: [] };
      const companyIds = [...new Set((deals ?? []).map((d) => d.company_id))];
      const { data: companies } = companyIds.length ? await db.from("companies").select("id, name_fa, name_en").in("id", companyIds) : { data: [] };
      const { data: problems } = await db.from("problems").select("booth_id").eq("exhibition_id", exhibition.id).is("resolved_at", null);
      const companyOfDeal = new Map((deals ?? []).map((d) => [d.id, (companies ?? []).find((c) => c.id === d.company_id)]));
      const open = new Map<string, number>();
      for (const p of problems ?? []) if (p.booth_id) open.set(p.booth_id, (open.get(p.booth_id) ?? 0) + 1);
      return {
        exhibition: exhibition.name_en ?? exhibition.name_fa,
        booths: (booths ?? []).map((b) => ({ ...b, company: b.deal_id ? companyOfDeal.get(b.deal_id)?.name_fa ?? null : null, open_problems: open.get(b.id) ?? 0 })),
      };
    }

    case "search_companies": {
      const q = String(input.query).replace(/[%,()]/g, " ").trim();
      const { data, error } = await db
        .from("companies")
        .select("id, name_fa, name_en, sector, city, phone, email, owner_id")
        .is("archived_at", null)
        .or(`name_fa.ilike.%${q}%,name_en.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(limitOf(input, 20, 50));
      fail(error);
      return { companies: data };
    }

    case "list_deals": {
      const exhibition = await currentExhibition(ctx, input.exhibition_id);
      let query = db.from("deals").select("id, company_id, stage, owner_id, expected_area_m2, estimated_value, next_follow_up_at, last_contact_at, notes").eq("exhibition_id", exhibition.id);
      if (input.stage) query = query.eq("stage", input.stage as Database["public"]["Enums"]["deal_stage"]);
      if (input.mine) query = me ? query.eq("owner_id", me) : query.is("owner_id", null);
      if (input.due) query = query.lte("next_follow_up_at", new Date(Date.now() + 864e5).toISOString().slice(0, 10)).not("stage", "in", "(won,lost)");
      const { data: deals, error } = await query.order("next_follow_up_at", { ascending: true, nullsFirst: false }).limit(limitOf(input, 50, 200));
      fail(error);
      const ids = [...new Set((deals ?? []).map((d) => d.company_id))];
      const { data: companies } = ids.length ? await db.from("companies").select("id, name_fa, name_en").in("id", ids) : { data: [] };
      const names = new Map((companies ?? []).map((c) => [c.id, c.name_fa]));
      return { exhibition: exhibition.name_en ?? exhibition.name_fa, deals: (deals ?? []).map((d) => ({ ...d, company: names.get(d.company_id) ?? null })) };
    }

    case "list_tasks": {
      let query = db.from("tasks").select("id, title, status, priority, assignee_id, due_at, booth_id, deal_id, exhibition_id");
      if (input.mine) query = me ? query.eq("assignee_id", me) : query.is("assignee_id", null);
      if (input.status) query = query.eq("status", input.status as Database["public"]["Enums"]["task_status"]);
      else query = query.not("status", "in", "(done,cancelled)");
      const { data, error } = await query.order("due_at", { ascending: true, nullsFirst: false }).limit(limitOf(input, 50, 200));
      fail(error);
      return { tasks: data };
    }

    case "list_problems": {
      const exhibition = await currentExhibition(ctx, input.exhibition_id);
      const { data, error } = await db.from("problems").select("id, booth_id, step, note, raised_at, assignee_id").eq("exhibition_id", exhibition.id).is("resolved_at", null).order("raised_at", { ascending: false });
      fail(error);
      const boothIds = [...new Set((data ?? []).map((p) => p.booth_id).filter(Boolean))] as string[];
      const { data: booths } = boothIds.length ? await db.from("booths").select("id, code").in("id", boothIds) : { data: [] };
      const codes = new Map((booths ?? []).map((b) => [b.id, b.code]));
      return { problems: (data ?? []).map((p) => ({ ...p, booth_code: p.booth_id ? codes.get(p.booth_id) ?? null : null })) };
    }

    case "list_team": {
      const { data, error } = await db.from("staff_members").select("id, display_name, email, job_title, role, departments").eq("status", "active").order("display_name");
      fail(error);
      return { team: data };
    }

    case "create_task": {
      const assignee = input.assignee_email ? await staffByEmail(ctx, input.assignee_email as string) : null;
      const booth = input.booth_code ? await boothByCode(ctx, input.booth_code as string, input.exhibition_id) : null;
      const exhibitionId = booth?.exhibition_id ?? (input.exhibition_id ? (await currentExhibition(ctx, input.exhibition_id)).id : null);
      const description = [input.description, `— ${ctx.signature}`].filter(Boolean).join("\n\n");
      const { data, error } = await db
        .from("tasks")
        .insert({
          title: input.title as string,
          description,
          priority: (input.priority as Database["public"]["Enums"]["task_priority"]) ?? "normal",
          due_at: (input.due_at as string) ?? null,
          assignee_id: assignee?.id ?? me,
          created_by: me,
          exhibition_id: exhibitionId,
          booth_id: booth?.id ?? null,
        })
        .select("id, title, status, assignee_id, due_at")
        .single();
      fail(error);
      return { task: data, link: `/staff/tasks/${data!.id}` };
    }

    case "update_task": {
      const patch: Database["public"]["Tables"]["tasks"]["Update"] = {};
      if (input.status) patch.status = input.status as Database["public"]["Enums"]["task_status"];
      if (input.priority) patch.priority = input.priority as Database["public"]["Enums"]["task_priority"];
      if (input.due_at) patch.due_at = input.due_at as string;
      if (!Object.keys(patch).length) throw new AgentError("nothing to change");
      const { data, error } = await db.from("tasks").update(patch).eq("id", input.task_id as string).select("id, title, status, priority, due_at").maybeSingle();
      fail(error);
      if (!data) throw new AgentError("no task with that id");
      return { task: data };
    }

    case "comment_task": {
      const { data, error } = await db
        .from("task_comments")
        .insert({ task_id: input.task_id as string, author_id: me, body: `${input.body as string}\n\n— ${ctx.signature}` })
        .select("id")
        .single();
      fail(error);
      return { comment_id: data!.id };
    }

    case "log_activity": {
      const { data, error } = await db
        .from("activities")
        .insert({
          company_id: input.company_id as string,
          deal_id: (input.deal_id as string) ?? null,
          kind: input.kind as Database["public"]["Enums"]["activity_kind"],
          summary: input.summary as string,
          body: [input.body, `— ${ctx.signature}`].filter(Boolean).join("\n\n"),
          next_follow_up_at: (input.next_follow_up_at as string) ?? null,
          author_id: me,
        })
        .select("id")
        .single();
      fail(error);
      if (input.deal_id) {
        await db
          .from("deals")
          .update({ last_contact_at: new Date().toISOString(), ...(input.next_follow_up_at ? { next_follow_up_at: input.next_follow_up_at as string } : {}) })
          .eq("id", input.deal_id as string);
      }
      return { activity_id: data!.id };
    }

    case "move_deal": {
      const stage = input.stage as Database["public"]["Enums"]["deal_stage"];
      const { data, error } = await db
        .from("deals")
        .update({ stage, ...(stage === "lost" ? { lost_reason: (input.lost_reason as string) ?? null } : {}) })
        .eq("id", input.deal_id as string)
        .select("id, stage, company_id")
        .maybeSingle();
      fail(error);
      if (!data) throw new AgentError("no sales file with that id");
      await db.from("activities").insert({ company_id: data.company_id, deal_id: data.id, kind: "system", summary: `${ctx.signature}: stage → ${stage}`, author_id: me });
      return { deal: data };
    }

    case "raise_problem": {
      const booth = await boothByCode(ctx, input.booth_code as string, input.exhibition_id);
      const { data, error } = await db
        .from("problems")
        .insert({ exhibition_id: booth.exhibition_id, booth_id: booth.id, step: input.step as Database["public"]["Enums"]["problem_step"], note: `${input.note as string} — ${ctx.signature}`, raised_by: me })
        .select("id")
        .single();
      fail(error);
      return { problem_id: data!.id, booth: booth.code, link: "/staff/problems" };
    }

    case "resolve_problem": {
      const { data, error } = await db
        .from("problems")
        .update({ resolved_at: new Date().toISOString(), resolved_by: me, resolution: [input.resolution, `— ${ctx.signature}`].filter(Boolean).join(" ") })
        .eq("id", input.problem_id as string)
        .is("resolved_at", null)
        .select("id")
        .maybeSingle();
      fail(error);
      if (!data) throw new AgentError("no open problem with that id");
      return { resolved: data.id };
    }

    case "set_booth_status": {
      if (ctx.actingFor && !canManage(ctx) && ["contracted", "paid", "blocked"].includes(input.status as string)) {
        throw new AgentError("only a manager can set a booth to contracted, paid or blocked", 403);
      }
      const booth = await boothByCode(ctx, input.booth_code as string, input.exhibition_id);
      const { data, error } = await db.from("booths").update({ status: input.status as Database["public"]["Enums"]["booth_status"] }).eq("id", booth.id).select("id, code, status").single();
      fail(error);
      return { booth: data };
    }

    case "read_chat": {
      const slug = (input.channel as string) ?? "general";
      const { data: channel } = await db.from("chat_channels").select("id, slug, name").eq("kind", "channel").eq("is_private", false).is("archived_at", null).eq("slug", slug).maybeSingle();
      if (!channel) throw new AgentError("no open channel by that name");
      const { data: rows, error } = await db.from("chat_messages").select("id, author_id, bot_name, body, created_at").eq("channel_id", channel.id).is("deleted_at", null).order("created_at", { ascending: false }).limit(limitOf(input, 30, 100));
      fail(error);
      const ids = [...new Set((rows ?? []).map((r) => r.author_id).filter(Boolean))] as string[];
      const { data: staff } = ids.length ? await db.from("staff_members").select("id, display_name, email").in("id", ids) : { data: [] };
      const names = new Map((staff ?? []).map((s) => [s.id, s.display_name ?? s.email]));
      return { channel: channel.slug, messages: (rows ?? []).reverse().map((r) => ({ from: r.bot_name ?? names.get(r.author_id ?? "") ?? "", text: r.body, at: r.created_at })) };
    }

    case "post_chat": {
      const { data, error } = await db.rpc("chat_post_as_bot", { p_channel: (input.channel as string) ?? "general", p_bot: ctx.signature, p_body: input.text as string, p_kind: "text" });
      fail(error);
      return { message_id: data };
    }
  }
  throw new AgentError(`unknown tool ${name}`, 404);
}
