import { NextResponse } from "next/server";
import { bearerToken } from "@/lib/chat-agent";
import { AgentError, authenticateAgent, callTool, listTools } from "@/lib/agents/run";

// Plain REST for agents that do not speak MCP (e.g. a Grok or ChatGPT action):
//   GET  /api/agent                → who am I + the tools I may use
//   POST /api/agent { tool, arguments } → run one tool
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (status: number, body: unknown) => NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });

export async function GET(request: Request) {
  try {
    const ctx = await authenticateAgent(bearerToken(request.headers.get("authorization")));
    return json(200, {
      agent: ctx.signature,
      tools: listTools(ctx).map((t) => ({ name: t.name, description: t.description, writes: t.writes, may_need_approval: Boolean(t.approval), input: t.input })),
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await authenticateAgent(bearerToken(request.headers.get("authorization")));
    const body = (await request.json().catch(() => null)) as { tool?: unknown; arguments?: unknown } | null;
    if (!body || typeof body.tool !== "string") return json(400, { error: 'Send JSON: { "tool": "list_tasks", "arguments": {} }' });
    const result = await callTool(ctx, body.tool, body.arguments);
    return json(200, { ok: true, result });
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown) {
  if (error instanceof AgentError) return json(error.status, { error: error.message });
  return json(500, { error: error instanceof Error ? error.message : String(error) });
}
