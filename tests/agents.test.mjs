import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  AGENT_TOOLS,
  agentSignature,
  checkInput,
  isAgentToken,
  needsApproval,
  newAgentToken,
  tokenHint,
  toolByName,
  toolsFor,
} from "../src/lib/agents/tools.ts";

const migration = await readFile(new URL("../supabase/migrations/20261112090000_ai_agents.sql", import.meta.url), "utf8");
const mcp = await readFile(new URL("../src/app/api/agent/mcp/route.ts", import.meta.url), "utf8");
const run = await readFile(new URL("../src/lib/agents/run.ts", import.meta.url), "utf8");

test("every tool has a unique name, a scope and a closed input schema", () => {
  const names = AGENT_TOOLS.map((t) => t.name);
  assert.equal(new Set(names).size, names.length);
  for (const tool of AGENT_TOOLS) {
    assert.ok(["read", "tasks", "sales", "operations", "chat"].includes(tool.scope), tool.name);
    assert.equal(tool.input.type, "object");
    assert.equal(tool.input.additionalProperties, false);
    for (const key of tool.input.required ?? []) assert.ok(tool.input.properties[key], `${tool.name}.${key}`);
    assert.ok(tool.title.fa && tool.title.en && tool.description);
    if (tool.scope === "read") assert.equal(tool.writes, false, tool.name);
  }
});

test("scopes decide which tools an agent sees", () => {
  const readOnly = toolsFor(["read"]).map((t) => t.name);
  assert.ok(readOnly.includes("list_tasks"));
  assert.ok(!readOnly.includes("create_task"));
  assert.ok(!readOnly.includes("post_chat"));
  const chatOnly = toolsFor(["chat"]).map((t) => t.name);
  assert.deepEqual(chatOnly.sort(), ["post_chat", "read_chat", "whoami"]);
  assert.ok(toolsFor([]).some((t) => t.name === "whoami"));
});

test("arguments are checked against the schema", () => {
  const create = toolByName.get("create_task");
  assert.deepEqual(checkInput(create, { title: "  تماس با شرکت  " }), { ok: true, input: { title: "تماس با شرکت" } });
  assert.equal(checkInput(create, {}).ok, false);
  assert.match(checkInput(create, { title: "x", owner: "me" }).error, /unknown argument/);
  assert.match(checkInput(create, { title: "x", priority: "asap" }).error, /must be one of/);
  assert.match(checkInput(create, { title: "x", due_at: "tomorrow-ish" }).error, /ISO date/);
  assert.equal(checkInput(toolByName.get("list_tasks"), { limit: "20" }).input.limit, 20);
  assert.equal(checkInput(toolByName.get("list_tasks"), { mine: "yes" }).ok, false);
});

test("sensitive changes wait for a person unless the owner turned that off", () => {
  const move = toolByName.get("move_deal");
  assert.equal(needsApproval(move, { stage: "won" }, true), true);
  assert.equal(needsApproval(move, { stage: "lost" }, true), true);
  assert.equal(needsApproval(move, { stage: "proposal" }, true), false);
  assert.equal(needsApproval(move, { stage: "won" }, false), false);
  assert.equal(needsApproval(toolByName.get("set_booth_status"), { status: "paid" }, true), true);
  assert.equal(needsApproval(toolByName.get("create_task"), { title: "x" }, true), false);
});

test("agent keys look alike, are long, and only a hint is kept", () => {
  let seed = 7;
  const token = newAgentToken((bytes) => bytes.map(() => (seed = (seed * 33 + 11) % 256)));
  assert.ok(isAgentToken(token));
  assert.equal(token.length, 37);
  assert.equal(tokenHint(token), token.slice(-6));
  assert.equal(isAgentToken("Bearer nope"), false);
});

test("the team sees whose behalf an agent worked on", () => {
  assert.equal(agentSignature("Claude", "سارا"), "Claude از طرف سارا");
  assert.equal(agentSignature("Grok", "Sara", "en"), "Grok for Sara");
  assert.equal(agentSignature("Grok", null), "Grok");
});

test("database keeps only key hashes, limits scopes and protects rows", () => {
  assert.match(migration, /token_hash text not null unique check \(token_hash ~ '\^\[0-9a-f\]\{64\}\$'\)/);
  assert.match(migration, /scopes <@ array\['read', 'tasks', 'sales', 'operations', 'chat'\]/);
  assert.match(migration, /alter table public\.ai_agents enable row level security/);
  assert.match(migration, /alter table public\.ai_agent_actions enable row level security/);
  assert.match(migration, /acts_for = public\.current_staff_id\(\)/);
  assert.doesNotMatch(migration, /token text/);
});

test("MCP server speaks JSON-RPC and every write is logged", () => {
  for (const method of ["initialize", "tools/list", "tools/call", "ping"]) assert.match(mcp, new RegExp(`"${method}"`));
  assert.match(mcp, /protocolVersion/);
  assert.match(mcp, /www-authenticate/);
  assert.match(run, /status: "pending"/);
  assert.match(run, /status: "done"/);
  assert.match(run, /status: "failed"/);
  assert.match(run, /the person this agent works for can only view/);
});
