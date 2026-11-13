import { NextResponse } from "next/server";
import { bearerToken } from "@/lib/chat-agent";
import { AgentError, authenticateAgent, callTool, listTools } from "@/lib/agents/run";

// Model Context Protocol server (Streamable HTTP, JSON responses) so Claude,
// ChatGPT, Grok or any MCP client can work in the portal with an agent key:
//   URL     https://<site>/api/agent/mcp
//   Header  Authorization: Bearer aratta_...
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROTOCOL = "2025-06-18";
const SUPPORTED = new Set(["2024-11-05", "2025-03-26", "2025-06-18"]);

type RpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

const headers = { "cache-control": "no-store", "mcp-protocol-version": PROTOCOL };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
const ok = (id: RpcRequest["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const err = (id: RpcRequest["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

const INSTRUCTIONS =
  "You are working in the Aratta Expo staff portal (Kerman, Iran) for the person shown by whoami. " +
  "The team works in Persian; write task titles, notes and chat messages in Persian unless asked otherwise. " +
  "Call whoami first. Read before you write, never invent ids, and tell the person what you changed. " +
  "Some changes wait for a person's approval; say so when a tool answers waiting_for_approval.";

async function handle(message: RpcRequest, token: string | null) {
  if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") return err(null, -32600, "invalid request");
  const isNotification = message.id === undefined;
  switch (message.method) {
    case "initialize": {
      const asked = String(message.params?.protocolVersion ?? PROTOCOL);
      return ok(message.id, {
        protocolVersion: SUPPORTED.has(asked) ? asked : PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "aratta-portal", title: "Aratta Expo staff portal", version: "1.0.0" },
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return ok(message.id, {});
    case "tools/list": {
      const ctx = await authenticateAgent(token);
      return ok(message.id, {
        tools: listTools(ctx).map((tool) => ({
          name: tool.name,
          title: tool.title.en,
          description: tool.approval ? `${tool.description} (may wait for approval)` : tool.description,
          inputSchema: tool.input,
          annotations: { readOnlyHint: !tool.writes, destructiveHint: false, openWorldHint: false },
        })),
      });
    }
    case "tools/call": {
      const ctx = await authenticateAgent(token);
      const name = String(message.params?.name ?? "");
      try {
        const result = await callTool(ctx, name, message.params?.arguments);
        return ok(message.id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result, isError: false });
      } catch (error) {
        const text = error instanceof Error ? error.message : String(error);
        return ok(message.id, { content: [{ type: "text", text }], isError: true });
      }
    }
    default:
      if (isNotification) return null;
      return err(message.id, -32601, `method ${message.method} not found`);
  }
}

export async function POST(request: Request) {
  const token = bearerToken(request.headers.get("authorization"));
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply(err(null, -32700, "parse error"), 400);
  }
  try {
    if (Array.isArray(body)) {
      const out = (await Promise.all(body.map((m) => handle(m as RpcRequest, token)))).filter(Boolean);
      return out.length ? reply(out) : new Response(null, { status: 202, headers });
    }
    const out = await handle(body as RpcRequest, token);
    return out ? reply(out) : new Response(null, { status: 202, headers });
  } catch (error) {
    if (error instanceof AgentError && error.status === 401) {
      return NextResponse.json(err((body as RpcRequest)?.id, -32001, error.message), { status: 401, headers: { ...headers, "www-authenticate": 'Bearer realm="aratta-portal"' } });
    }
    const message = error instanceof Error ? error.message : String(error);
    return reply(err((body as RpcRequest)?.id, -32000, message), error instanceof AgentError ? error.status : 500);
  }
}

/** This server does not push messages; clients that open a stream are told so. */
export async function GET() {
  return new Response("This MCP server answers POST requests only.", { status: 405, headers: { ...headers, allow: "POST" } });
}

export async function DELETE() {
  return new Response(null, { status: 204, headers });
}
