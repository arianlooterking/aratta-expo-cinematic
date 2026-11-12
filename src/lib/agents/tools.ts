// The work an AI agent can do in the portal, described once for the MCP
// server, the REST endpoint, the agents page and the tests.
// Plain data and checks only: running a tool lives in run.ts (server only).

export type AgentScope = "read" | "tasks" | "sales" | "operations" | "chat";
export type AgentProvider = "claude" | "chatgpt" | "grok" | "other";

export const AGENT_SCOPES: AgentScope[] = ["read", "tasks", "sales", "operations", "chat"];
export const AGENT_PROVIDERS: AgentProvider[] = ["claude", "chatgpt", "grok", "other"];

export const SCOPE_LABELS: Record<AgentScope, { fa: string; en: string; hintFa: string; hintEn: string }> = {
  read: { fa: "خواندن", en: "Read", hintFa: "نمایشگاه‌ها، غرفه‌ها، شرکت‌ها، پرونده‌های فروش، کارها و مشکلات را می‌بیند.", hintEn: "Sees exhibitions, booths, companies, sales files, tasks and problems." },
  tasks: { fa: "کارها", en: "Tasks", hintFa: "کار می‌سازد، وضعیت را عوض می‌کند و یادداشت می‌گذارد.", hintEn: "Creates tasks, changes their status and comments." },
  sales: { fa: "فروش", en: "Sales", hintFa: "تماس و پیگیری ثبت می‌کند و مرحلهٔ پرونده را جلو می‌برد.", hintEn: "Logs calls and follow-ups and moves sales files along." },
  operations: { fa: "اجرا", en: "Operations", hintFa: "مشکل غرفه را گزارش یا حل می‌کند و وضعیت غرفه را پیشنهاد می‌دهد.", hintEn: "Raises and resolves booth problems and proposes booth status." },
  chat: { fa: "گفتگو", en: "Chat", hintFa: "در کانال‌های باز تیم می‌خواند و پیام می‌گذارد.", hintEn: "Reads and posts in the team's open channels." },
};

type JsonSchema = {
  type: "object";
  properties: Record<string, { type: string; description: string; enum?: readonly string[]; items?: { type: string } }>;
  required?: string[];
  additionalProperties: false;
};

export type AgentTool = {
  name: string;
  scope: AgentScope;
  /** Writes something. Read tools never do. */
  writes: boolean;
  /** Waits for a person when the agent's "ask first" switch is on (default). */
  approval?: (input: Record<string, unknown>) => boolean;
  title: { fa: string; en: string };
  description: string;
  input: JsonSchema;
};

const TASK_STATUS = ["todo", "in_progress", "blocked", "done", "cancelled"] as const;
const TASK_PRIORITY = ["low", "normal", "high", "urgent"] as const;
const DEAL_STAGE = ["lead", "contacted", "qualified", "proposal", "negotiation", "won", "lost"] as const;
const ACTIVITY_KIND = ["call", "sms", "email", "meeting", "message", "visit", "note"] as const;
const PROBLEM_STEP = ["furniture_list", "build", "power", "delivery", "handover", "collection", "clearance", "payment", "other"] as const;
const BOOTH_STATUS = ["available", "held", "reserved", "contracted", "paid", "blocked"] as const;

const str = (description: string) => ({ type: "string", description });
const int = (description: string) => ({ type: "integer", description });
const oneOf = (values: readonly string[], description: string) => ({ type: "string", description, enum: values });
const schema = (properties: JsonSchema["properties"], required: string[] = []): JsonSchema => ({ type: "object", properties, required, additionalProperties: false });

export const AGENT_TOOLS: AgentTool[] = [
  {
    name: "whoami",
    scope: "read",
    writes: false,
    title: { fa: "من کیستم", en: "Who am I" },
    description: "Who this agent is, whom it acts for, what it may do, and today's date. Call this first.",
    input: schema({}),
  },
  {
    name: "list_exhibitions",
    scope: "read",
    writes: false,
    title: { fa: "فهرست نمایشگاه‌ها", en: "List exhibitions" },
    description: "Exhibitions with their dates, venue and status. Other tools take an exhibition_id from here; without one they use the nearest active exhibition.",
    input: schema({ include_archived: { type: "boolean", description: "Also list archived exhibitions." } }),
  },
  {
    name: "list_booths",
    scope: "read",
    writes: false,
    title: { fa: "فهرست غرفه‌ها", en: "List booths" },
    description: "Booths of an exhibition: code, hall, area, status, company, open problems.",
    input: schema({ exhibition_id: str("Exhibition id."), status: oneOf(BOOTH_STATUS, "Only booths with this status."), limit: int("Up to 200, default 100.") }),
  },
  {
    name: "search_companies",
    scope: "read",
    writes: false,
    title: { fa: "جستجوی شرکت", en: "Search companies" },
    description: "Find companies by Persian or English name, phone or email.",
    input: schema({ query: str("Part of a name, phone or email."), limit: int("Up to 50, default 20.") }, ["query"]),
  },
  {
    name: "list_deals",
    scope: "read",
    writes: false,
    title: { fa: "پرونده‌های فروش", en: "Sales files" },
    description: "Sales files (deals) of an exhibition with company, stage, owner, next follow-up.",
    input: schema({ exhibition_id: str("Exhibition id."), stage: oneOf(DEAL_STAGE, "Only this stage."), mine: { type: "boolean", description: "Only files owned by the person this agent acts for." }, due: { type: "boolean", description: "Only files whose follow-up is due today or overdue." }, limit: int("Up to 200, default 50.") }),
  },
  {
    name: "list_tasks",
    scope: "read",
    writes: false,
    title: { fa: "فهرست کارها", en: "List tasks" },
    description: "Tasks with status, priority, assignee and due date.",
    input: schema({ mine: { type: "boolean", description: "Only tasks assigned to the person this agent acts for." }, status: oneOf(TASK_STATUS, "Only this status."), limit: int("Up to 200, default 50.") }),
  },
  {
    name: "list_problems",
    scope: "read",
    writes: false,
    title: { fa: "مشکلات باز", en: "Open problems" },
    description: "Booth problems that are still open (red on the map).",
    input: schema({ exhibition_id: str("Exhibition id.") }),
  },
  {
    name: "list_team",
    scope: "read",
    writes: false,
    title: { fa: "اعضای تیم", en: "Team" },
    description: "Active staff with name, email, job title and departments, to assign work.",
    input: schema({}),
  },
  {
    name: "create_task",
    scope: "tasks",
    writes: true,
    title: { fa: "ساخت کار", en: "Create task" },
    description: "Create a task. The person this agent acts for is its creator.",
    input: schema(
      {
        title: str("Short title, in Persian unless told otherwise."),
        description: str("Details."),
        assignee_email: str("Email of the colleague who should do it. Defaults to the person this agent acts for."),
        priority: oneOf(TASK_PRIORITY, "Default normal."),
        due_at: str("ISO date or date-time."),
        exhibition_id: str("Exhibition id."),
        booth_code: str("Booth code, e.g. A-12, to link the task to a booth."),
      },
      ["title"],
    ),
  },
  {
    name: "update_task",
    scope: "tasks",
    writes: true,
    title: { fa: "به‌روزرسانی کار", en: "Update task" },
    description: "Change a task's status, priority or due date.",
    input: schema({ task_id: str("Task id."), status: oneOf(TASK_STATUS, "New status."), priority: oneOf(TASK_PRIORITY, "New priority."), due_at: str("New ISO due date.") }, ["task_id"]),
  },
  {
    name: "comment_task",
    scope: "tasks",
    writes: true,
    title: { fa: "یادداشت روی کار", en: "Comment on task" },
    description: "Add a comment to a task.",
    input: schema({ task_id: str("Task id."), body: str("The comment.") }, ["task_id", "body"]),
  },
  {
    name: "log_activity",
    scope: "sales",
    writes: true,
    title: { fa: "ثبت تماس یا پیگیری", en: "Log activity" },
    description: "Record a call, message, meeting or note on a company (and its sales file), optionally with the next follow-up date.",
    input: schema(
      {
        company_id: str("Company id."),
        deal_id: str("Sales file id."),
        kind: oneOf(ACTIVITY_KIND, "What happened."),
        summary: str("One line."),
        body: str("Details."),
        next_follow_up_at: str("ISO date for the next follow-up; also set on the sales file."),
      },
      ["company_id", "kind", "summary"],
    ),
  },
  {
    name: "move_deal",
    scope: "sales",
    writes: true,
    approval: (input) => input.stage === "won" || input.stage === "lost",
    title: { fa: "جابه‌جایی پرونده فروش", en: "Move sales file" },
    description: "Move a sales file to another stage. Won and lost wait for a person's approval unless the agent's owner turned that off.",
    input: schema({ deal_id: str("Sales file id."), stage: oneOf(DEAL_STAGE, "New stage."), lost_reason: str("Why it was lost.") }, ["deal_id", "stage"]),
  },
  {
    name: "raise_problem",
    scope: "operations",
    writes: true,
    title: { fa: "گزارش مشکل غرفه", en: "Raise booth problem" },
    description: "Flag a problem on a booth (turns it red on the map and notifies the booth's managers).",
    input: schema({ booth_code: str("Booth code, e.g. A-12."), exhibition_id: str("Exhibition id."), step: oneOf(PROBLEM_STEP, "Which work step."), note: str("What is wrong.") }, ["booth_code", "step", "note"]),
  },
  {
    name: "resolve_problem",
    scope: "operations",
    writes: true,
    title: { fa: "حل مشکل", en: "Resolve problem" },
    description: "Mark a booth problem as solved.",
    input: schema({ problem_id: str("Problem id."), resolution: str("What was done.") }, ["problem_id"]),
  },
  {
    name: "set_booth_status",
    scope: "operations",
    writes: true,
    approval: () => true,
    title: { fa: "تغییر وضعیت غرفه", en: "Set booth status" },
    description: "Change a booth's sales status. Always waits for a person's approval unless the agent's owner turned that off.",
    input: schema({ booth_code: str("Booth code."), exhibition_id: str("Exhibition id."), status: oneOf(BOOTH_STATUS, "New status.") }, ["booth_code", "status"]),
  },
  {
    name: "read_chat",
    scope: "chat",
    writes: false,
    title: { fa: "خواندن گفتگو", en: "Read chat" },
    description: "Latest messages of an open team channel (general, sales, operations, alerts).",
    input: schema({ channel: str("Channel slug, default general."), limit: int("Up to 100, default 30.") }),
  },
  {
    name: "post_chat",
    scope: "chat",
    writes: true,
    title: { fa: "پیام در گفتگو", en: "Post in chat" },
    description: "Post a message in an open team channel. It shows the agent's name.",
    input: schema({ channel: str("Channel slug, default general."), text: str("The message.") }, ["text"]),
  },
];

export const toolByName = new Map(AGENT_TOOLS.map((tool) => [tool.name, tool]));

/** Tools an agent with these scopes may use. Everyone gets whoami. */
export function toolsFor(scopes: readonly string[]) {
  return AGENT_TOOLS.filter((tool) => tool.name === "whoami" || scopes.includes(tool.scope));
}

/** Check arguments against a tool's schema. Returns a clean copy or an error. */
export function checkInput(tool: AgentTool, raw: unknown): { ok: true; input: Record<string, unknown> } | { ok: false; error: string } {
  const value = raw ?? {};
  if (typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "arguments must be an object" };
  const input: Record<string, unknown> = {};
  for (const [key, given] of Object.entries(value as Record<string, unknown>)) {
    const spec = tool.input.properties[key];
    if (!spec) return { ok: false, error: `unknown argument "${key}"` };
    if (given === null || given === undefined || given === "") continue;
    if (spec.type === "string") {
      if (typeof given !== "string") return { ok: false, error: `"${key}" must be text` };
      const text = given.trim();
      if (text.length > 4000) return { ok: false, error: `"${key}" is longer than 4000 characters` };
      if (spec.enum && !spec.enum.includes(text)) return { ok: false, error: `"${key}" must be one of ${spec.enum.join(", ")}` };
      input[key] = text;
    } else if (spec.type === "integer") {
      const n = typeof given === "string" ? Number(given) : given;
      if (typeof n !== "number" || !Number.isInteger(n) || n < 0) return { ok: false, error: `"${key}" must be a whole number` };
      input[key] = n;
    } else if (spec.type === "boolean") {
      if (typeof given !== "boolean") return { ok: false, error: `"${key}" must be true or false` };
      input[key] = given;
    }
  }
  for (const key of tool.input.required ?? []) {
    if (input[key] === undefined) return { ok: false, error: `"${key}" is required` };
  }
  for (const key of ["due_at", "next_follow_up_at"]) {
    if (typeof input[key] === "string" && Number.isNaN(Date.parse(input[key] as string))) return { ok: false, error: `"${key}" must be an ISO date` };
  }
  return { ok: true, input };
}

/** Whether a call must wait for a person. */
export function needsApproval(tool: AgentTool, input: Record<string, unknown>, agentAsksFirst: boolean) {
  return agentAsksFirst && Boolean(tool.approval?.(input));
}

/** "Claude for Sara" or "Grok" — how the team sees the agent's work. */
export function agentSignature(agentName: string, actingForName: string | null, lang: "fa" | "en" = "fa") {
  if (!actingForName) return agentName;
  return lang === "fa" ? `${agentName} از طرف ${actingForName}` : `${agentName} for ${actingForName}`;
}

/** A new agent key: 40 random url-safe characters with a readable prefix. */
export function newAgentToken(random: (bytes: Uint8Array) => Uint8Array) {
  const bytes = random(new Uint8Array(30));
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let body = "";
  for (const byte of bytes) body += alphabet[byte & 63];
  return `aratta_${body}`;
}

export function tokenHint(token: string) {
  return token.slice(-6);
}

export function isAgentToken(token: string) {
  return /^aratta_[A-Za-z0-9_-]{30}$/.test(token);
}
