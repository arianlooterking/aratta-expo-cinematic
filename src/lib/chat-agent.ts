// Settings for AI agents (Grok, ChatGPT, Claude...) that post into team chat.
// CHAT_AGENT_TOKENS lists "Name=token" pairs separated by commas or new lines.
// The name is what the team sees on the message; an agent cannot choose it.

export type ChatAgent = { name: string; token: string };

const MIN_TOKEN_LENGTH = 24;

export function parseAgentTokens(raw: string | undefined | null): ChatAgent[] {
  if (!raw) return [];
  const agents: ChatAgent[] = [];
  for (const entry of raw.split(/[,\n]/)) {
    const at = entry.indexOf("=");
    if (at <= 0) continue;
    const name = entry.slice(0, at).trim().slice(0, 60);
    const token = entry.slice(at + 1).trim();
    if (name && token.length >= MIN_TOKEN_LENGTH) agents.push({ name, token });
  }
  return agents;
}

export function bearerToken(header: string | null) {
  const match = /^Bearer\s+(\S+)$/i.exec(header?.trim() ?? "");
  return match ? match[1] : null;
}

export type AgentPost = { channel: string; text: string; link: string | null; kind: "alert" | "text" };

/** Check an agent's message. Channels are named by slug ("alerts") or id; links must stay inside the portal. */
export function readAgentPost(body: unknown): AgentPost | { error: string } {
  if (!body || typeof body !== "object") return { error: "Send JSON: { channel, text }" };
  const b = body as Record<string, unknown>;
  const channel = typeof b.channel === "string" && b.channel.trim() ? b.channel.trim() : "alerts";
  const text = typeof b.text === "string" ? b.text.trim() : "";
  if (!text) return { error: "text is required" };
  if (text.length > 4000) return { error: "text is longer than 4000 characters" };
  if (!/^[a-z0-9-]{1,40}$/.test(channel) && !/^[0-9a-f-]{36}$/i.test(channel)) return { error: "channel must be a slug or an id" };
  const link = typeof b.link === "string" && /^\/staff\/[\w\-/?=&%.]*$/.test(b.link) ? b.link : null;
  const kind = b.kind === "text" ? "text" : "alert";
  return { channel, text, link, kind };
}
