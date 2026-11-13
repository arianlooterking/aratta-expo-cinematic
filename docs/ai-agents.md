# AI agents in the staff portal

Claude, ChatGPT, Grok or any assistant can work in the portal with an agent key.
An agent either **acts for one person** (it has that person's rights and every
change carries "Claude از طرف سارا") or is **its own teammate** (admins only).

## Setup (once)

1. Apply `supabase/migrations/20261112090000_ai_agents.sql`.
2. Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel (Production and Preview). The
   agent endpoints run server-side with it; it never reaches the browser.
3. Redeploy.

## Making a key

Portal → **دستیارهای هوشمند / AI agents** → **New agent key**. Pick the
assistant, who it works for, what it may do (read, tasks, sales, operations,
chat), whether it asks before sensitive changes, and how long the key lasts.
The key is shown once; only its SHA-256 hash is stored. Revoke it on the same page.

## Connecting

- MCP (Claude, ChatGPT developer mode, Grok remote MCP, Claude Code):
  `https://<site>/api/agent/mcp` with header `Authorization: Bearer aratta_…`.
  Claude Code: `claude mcp add --transport http aratta https://<site>/api/agent/mcp --header "Authorization: Bearer aratta_…"`
- REST: `GET /api/agent` lists the tools; `POST /api/agent` with
  `{ "tool": "create_task", "arguments": { "title": "…" } }` runs one.

## Tools

`whoami`, `list_exhibitions`, `list_booths`, `search_companies`, `list_deals`,
`list_tasks`, `list_problems`, `list_team`, `create_task`, `update_task`,
`comment_task`, `log_activity`, `move_deal`, `raise_problem`,
`resolve_problem`, `set_booth_status`, `read_chat`, `post_chat`.
Definitions live in `src/lib/agents/tools.ts`; execution in `src/lib/agents/run.ts`.

## Safety

- Writes need the acting person to be at least a member; viewers' agents only read.
- Winning or losing a sales file and changing a booth's status wait in the
  approval list on the agents page until the person (or an admin) approves.
- Every write is logged in `ai_agent_actions` with its arguments and result.
- Agents never see direct messages or private channels, and cannot delete anything.

The older chat-only endpoint `/api/chat/agent` with `CHAT_AGENT_TOKENS` keeps working.
