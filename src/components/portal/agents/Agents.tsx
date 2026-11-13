"use client";

import { Bot, Check, Copy, KeyRound, Plug, ShieldCheck, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { AGENT_PROVIDERS, AGENT_SCOPES, AGENT_TOOLS, SCOPE_LABELS, newAgentToken, tokenHint, type AgentProvider, type AgentScope } from "@/lib/agents/tools";
import type { Database } from "@/lib/platform/database.types";
import { date } from "@/lib/portal/format";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { PageHeader } from "../crm/shared";
import { usePortal } from "../PortalProvider";
import { Button, Card, Empty, Field, Input, Pill, Segmented, Select, Skeleton } from "../ui";

type AgentRow = Database["public"]["Tables"]["ai_agents"]["Row"];
type ActionRow = Database["public"]["Tables"]["ai_agent_actions"]["Row"];
type StaffLite = { id: string; display_name: string | null; email: string };

const PROVIDER_NAMES: Record<AgentProvider, string> = { claude: "Claude", chatgpt: "ChatGPT", grok: "Grok", other: "Agent" };

async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * AI agents that work in the portal: give Claude, ChatGPT or Grok a key, choose
 * whom it acts for and what it may touch, then follow everything it does and
 * approve the sensitive changes it asks for.
 */
export function Agents() {
  const { lang, mode, user, can, toast } = usePortal();
  const fa = lang === "fa";
  const live = mode === "live";
  const [agents, setAgents] = useState<AgentRow[] | null>(live ? null : []);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [staff, setStaff] = useState<StaffLite[]>([]);
  const [view, setView] = useState<"pending" | "all">("pending");
  const [creating, setCreating] = useState(false);
  const [freshKey, setFreshKey] = useState<{ name: string; token: string } | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);

  const load = useCallback(async () => {
    const db = getBrowserSupabase();
    if (!db) return;
    const [a, b, c] = await Promise.all([
      db.from("ai_agents").select("*").order("created_at", { ascending: false }),
      db.from("ai_agent_actions").select("*").order("created_at", { ascending: false }).limit(150),
      db.from("staff_members").select("id, display_name, email").eq("status", "active").order("display_name"),
    ]);
    setAgents(a.data ?? []);
    setActions(b.data ?? []);
    setStaff(c.data ?? []);
  }, []);

  useEffect(() => {
    if (!live) return;
    const db = getBrowserSupabase();
    if (!db) return;
    const first = window.setTimeout(load, 0);
    const channel = db
      .channel("ai-agents")
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_agent_actions" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_agents" }, () => void load())
      .subscribe();
    return () => {
      window.clearTimeout(first);
      void db.removeChannel(channel);
    };
  }, [live, load]);

  const staffName = useMemo(() => new Map(staff.map((s) => [s.id, s.display_name ?? s.email])), [staff]);
  const agentById = useMemo(() => new Map((agents ?? []).map((a) => [a.id, a])), [agents]);
  const pending = actions.filter((a) => a.status === "pending");
  const shownActions = view === "pending" ? pending : actions;
  const site = typeof window === "undefined" ? "" : window.location.origin;
  const mcpUrl = `${site}/api/agent/mcp`;

  const decide = async (id: string, decision: "approve" | "reject") => {
    setDeciding(id);
    try {
      const res = await fetch("/api/agent/approve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, decision }) });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) toast(body.error ?? (fa ? "انجام نشد" : "Could not do that"), "error");
      else toast(decision === "approve" ? (fa ? "تأیید و انجام شد" : "Approved and done") : fa ? "رد شد" : "Rejected", "info");
      await load();
    } finally {
      setDeciding(null);
    }
  };

  const revoke = async (agent: AgentRow) => {
    const db = getBrowserSupabase();
    if (!db) return;
    if (!window.confirm(fa ? `کلید «${agent.name}» باطل شود؟ این عامل دیگر دسترسی ندارد.` : `Revoke “${agent.name}”? It will lose access at once.`)) return;
    const { error } = await db.from("ai_agents").update({ revoked_at: new Date().toISOString() }).eq("id", agent.id);
    if (error) toast(error.message, "error");
    await load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-5 sm:px-6 lg:py-7">
      <PageHeader
        eyebrow={fa ? "تیم و سازمان" : "Team and setup"}
        title={fa ? "دستیارهای هوشمند" : "AI agents"}
        hint={
          fa
            ? "به Claude، ChatGPT یا Grok کلید بدهید تا از طرف شما یا به‌عنوان یک هم‌تیمی کار کنند: کار بسازند، پیگیری ثبت کنند، مشکل غرفه گزارش دهند و در گفتگو پیام بگذارند. همه‌چیز با نام عامل ثبت می‌شود."
            : "Give Claude, ChatGPT or Grok a key so it can work for you or as a teammate: create tasks, log follow-ups, raise booth problems and post in chat. Everything it does carries its name."
        }
        actions={
          live && can.edit ? (
            <Button tone="primary" icon={<KeyRound className="size-4" />} onClick={() => setCreating(true)}>
              {fa ? "کلید تازه" : "New agent key"}
            </Button>
          ) : null
        }
      />

      {!live ? (
        <Card className="border-p-gold/30 bg-p-gold-soft/40 p-4 text-sm leading-7">
          {fa
            ? "این نسخهٔ نمایشی است. وقتی پورتال به پایگاه داده وصل شود (و SUPABASE_SERVICE_ROLE_KEY روی سرور تنظیم شود) می‌توانید این‌جا کلید بسازید."
            : "This is the demo. Once the portal is connected to its database (and SUPABASE_SERVICE_ROLE_KEY is set on the server) you can create keys here."}
        </Card>
      ) : null}

      {freshKey ? <FreshKey name={freshKey.name} token={freshKey.token} mcpUrl={mcpUrl} onClose={() => setFreshKey(null)} /> : null}

      {creating ? (
        <NewAgent
          staff={staff}
          onCancel={() => setCreating(false)}
          onCreated={async (name, token) => {
            setCreating(false);
            setFreshKey({ name, token });
            await load();
          }}
        />
      ) : null}

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold">{fa ? "درخواست‌ها و کارهای عامل‌ها" : "Agent requests and work"}</h2>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "pending", label: `${fa ? "منتظر تأیید" : "Waiting"} · ${pending.length}` },
              { value: "all", label: fa ? "همه" : "All" },
            ]}
          />
        </div>
        <Card className="divide-y divide-p-line">
          {agents === null ? (
            <div className="p-4"><Skeleton className="h-16" /></div>
          ) : shownActions.length === 0 ? (
            <Empty icon={<ShieldCheck className="size-6" />} title={view === "pending" ? (fa ? "چیزی منتظر تأیید نیست" : "Nothing is waiting") : fa ? "هنوز کاری ثبت نشده" : "No agent work yet"} hint={fa ? "تغییرات حساس (برنده یا باخته کردن پرونده، تغییر وضعیت غرفه) پیش از انجام این‌جا می‌آیند." : "Sensitive changes (winning or losing a file, booth status) wait here before they happen."} />
          ) : (
            shownActions.map((action) => {
              const agent = agentById.get(action.agent_id);
              const who = agent ? `${agent.name}${action.acting_for ? (fa ? ` از طرف ${staffName.get(action.acting_for) ?? ""}` : ` for ${staffName.get(action.acting_for) ?? ""}`) : ""}` : "—";
              return (
                <div key={action.id} className="flex flex-col gap-2 p-3.5 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      <Bot className="size-4 text-p-brand" aria-hidden="true" />
                      <span>{who}</span>
                      <StatusPill status={action.status} fa={fa} />
                    </div>
                    <p dir="ltr" className="mt-1 truncate text-start font-mono text-xs text-p-ink-3">{action.summary}</p>
                    {action.error ? <p className="mt-1 text-xs text-p-danger">{action.error}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-p-ink-3">{date(lang, action.created_at, "short")}</span>
                    {action.status === "pending" && (can.admin || action.acting_for === user.id) ? (
                      <>
                        <Button size="sm" tone="primary" icon={<Check className="size-4" />} disabled={deciding === action.id} onClick={() => decide(action.id, "approve")}>
                          {fa ? "تأیید" : "Approve"}
                        </Button>
                        <Button size="sm" tone="ghost" icon={<X className="size-4" />} disabled={deciding === action.id} onClick={() => decide(action.id, "reject")}>
                          {fa ? "رد" : "Reject"}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="text-[15px] font-semibold">{fa ? "کلیدهای فعال" : "Agent keys"}</h2>
        <Card className="divide-y divide-p-line">
          {agents === null ? (
            <div className="p-4"><Skeleton className="h-16" /></div>
          ) : agents.length === 0 ? (
            <Empty icon={<Bot className="size-6" />} title={fa ? "هنوز عاملی وصل نشده" : "No agents yet"} hint={fa ? "یک کلید بسازید و آن را در Claude، ChatGPT یا Grok وارد کنید." : "Create a key and add it to Claude, ChatGPT or Grok."} />
          ) : (
            agents.map((agent) => (
              <div key={agent.id} className={cn("flex flex-col gap-2 p-3.5 sm:flex-row sm:items-center", agent.revoked_at && "opacity-55")}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    <span className="grid size-8 place-items-center rounded-full bg-p-brand-soft text-p-brand"><Bot className="size-4" /></span>
                    <span>{agent.name}</span>
                    <Pill>{PROVIDER_NAMES[agent.provider]}</Pill>
                    {agent.revoked_at ? <Pill tone="danger">{fa ? "باطل" : "Revoked"}</Pill> : null}
                  </div>
                  <p className="mt-1 text-xs text-p-ink-3">
                    {agent.acts_for ? (fa ? `از طرف ${staffName.get(agent.acts_for) ?? ""}` : `Acts for ${staffName.get(agent.acts_for) ?? ""}`) : fa ? "هم‌تیمی مستقل" : "Its own teammate"}
                    {" · "}
                    {agent.scopes.map((s) => (fa ? SCOPE_LABELS[s as AgentScope]?.fa : SCOPE_LABELS[s as AgentScope]?.en) ?? s).join(fa ? "، " : ", ")}
                    {" · "}
                    {agent.needs_approval ? (fa ? "تغییرات حساس با تأیید" : "asks before sensitive changes") : fa ? "بدون تأیید" : "no approval"}
                    {" · …"}
                    <span dir="ltr" className="font-mono">{agent.token_hint}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-p-ink-3">
                  <span>{agent.last_used_at ? `${fa ? "آخرین استفاده" : "Last used"} ${date(lang, agent.last_used_at, "short")}` : fa ? "هنوز استفاده نشده" : "Not used yet"}</span>
                  {!agent.revoked_at ? (
                    <Button size="sm" tone="ghost" icon={<Trash2 className="size-4" />} onClick={() => revoke(agent)}>
                      {fa ? "باطل کردن" : "Revoke"}
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </Card>
      </section>

      <ConnectGuide mcpUrl={mcpUrl} />
    </div>
  );
}

function StatusPill({ status, fa }: { status: ActionRow["status"]; fa: boolean }) {
  const map = {
    pending: { tone: "warn", fa: "منتظر تأیید", en: "Waiting" },
    approved: { tone: "ok", fa: "تأیید شد", en: "Approved" },
    done: { tone: "ok", fa: "انجام شد", en: "Done" },
    rejected: { tone: "neutral", fa: "رد شد", en: "Rejected" },
    failed: { tone: "danger", fa: "خطا", en: "Failed" },
  } as const;
  const item = map[status];
  return <Pill tone={item.tone}>{fa ? item.fa : item.en}</Pill>;
}

function NewAgent({ staff, onCancel, onCreated }: { staff: StaffLite[]; onCancel: () => void; onCreated: (name: string, token: string) => void }) {
  const { lang, user, can, toast } = usePortal();
  const fa = lang === "fa";
  const [provider, setProvider] = useState<AgentProvider>("claude");
  const [name, setName] = useState("Claude");
  const [actsFor, setActsFor] = useState<string>(user.id);
  const [scopes, setScopes] = useState<AgentScope[]>(["read", "tasks", "chat"]);
  const [ask, setAsk] = useState(true);
  const [days, setDays] = useState("90");
  const [busy, setBusy] = useState(false);

  const toggle = (scope: AgentScope) => setScopes((s) => (s.includes(scope) ? s.filter((x) => x !== scope) : [...s, scope]));

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <h2 className="text-[15px] font-semibold">{fa ? "کلید تازه برای یک عامل" : "A new agent key"}</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={fa ? "دستیار" : "Assistant"}>
          <Select
            value={provider}
            onChange={(e) => {
              const next = e.target.value as AgentProvider;
              setProvider(next);
              if (!name || Object.values(PROVIDER_NAMES).includes(name)) setName(PROVIDER_NAMES[next]);
            }}
          >
            {AGENT_PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {PROVIDER_NAMES[p]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={fa ? "نامی که تیم می‌بیند" : "Name the team sees"}>
          <Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={fa ? "از طرف" : "Works for"}>
          <Select value={actsFor} onChange={(e) => setActsFor(e.target.value)} disabled={!can.admin}>
            <option value={user.id}>{fa ? "خودم" : "Me"}</option>
            {can.admin
              ? staff
                  .filter((s) => s.id !== user.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.display_name ?? s.email}
                    </option>
                  ))
              : null}
            {can.admin ? <option value="">{fa ? "هم‌تیمی مستقل (بدون شخص)" : "Its own teammate (no person)"}</option> : null}
          </Select>
        </Field>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">{fa ? "چه کارهایی مجاز است" : "What it may do"}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {AGENT_SCOPES.map((scope) => (
            <label key={scope} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition", scopes.includes(scope) ? "border-p-brand bg-p-brand-soft/50" : "border-p-line hover:bg-p-sunken")}>
              <input type="checkbox" className="mt-1 accent-[var(--p-brand)]" checked={scopes.includes(scope)} onChange={() => toggle(scope)} />
              <span>
                <span className="font-semibold">{fa ? SCOPE_LABELS[scope].fa : SCOPE_LABELS[scope].en}</span>
                <span className="mt-0.5 block text-xs leading-5 text-p-ink-3">{fa ? SCOPE_LABELS[scope].hintFa : SCOPE_LABELS[scope].hintEn}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-start gap-3 rounded-xl border border-p-line p-3 text-sm">
          <input type="checkbox" className="mt-1 accent-[var(--p-brand)]" checked={ask} onChange={(e) => setAsk(e.target.checked)} />
          <span>
            <span className="font-semibold">{fa ? "پیش از تغییرات حساس بپرسد" : "Ask before sensitive changes"}</span>
            <span className="mt-0.5 block text-xs leading-5 text-p-ink-3">{fa ? "برنده یا باخته کردن پرونده و تغییر وضعیت غرفه منتظر تأیید شما می‌ماند." : "Winning or losing a sales file and booth status changes wait for you."}</span>
          </span>
        </label>
        <Field label={fa ? "اعتبار کلید" : "Key valid for"}>
          <Select value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="30">{fa ? "۳۰ روز" : "30 days"}</option>
            <option value="90">{fa ? "۹۰ روز" : "90 days"}</option>
            <option value="365">{fa ? "یک سال" : "One year"}</option>
            <option value="0">{fa ? "بدون تاریخ پایان" : "No end date"}</option>
          </Select>
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button tone="ghost" onClick={onCancel}>
          {fa ? "انصراف" : "Cancel"}
        </Button>
        <Button
          tone="primary"
          icon={<KeyRound className="size-4" />}
          disabled={busy || !name.trim() || scopes.length === 0}
          onClick={async () => {
            const db = getBrowserSupabase();
            if (!db) return;
            setBusy(true);
            try {
              const token = newAgentToken((bytes) => crypto.getRandomValues(bytes));
              const { error } = await db.from("ai_agents").insert({
                name: name.trim(),
                provider,
                acts_for: actsFor || null,
                scopes,
                needs_approval: ask,
                token_hash: await sha256(token),
                token_hint: tokenHint(token),
                expires_at: days === "0" ? null : new Date(Date.now() + Number(days) * 864e5).toISOString(),
              });
              if (error) toast(error.message, "error");
              else onCreated(name.trim(), token);
            } finally {
              setBusy(false);
            }
          }}
        >
          {fa ? "ساخت کلید" : "Create key"}
        </Button>
      </div>
    </Card>
  );
}

function CopyLine({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-p-ink-3">{label}</p>
      <div className="flex items-center gap-2 rounded-lg border border-p-line bg-p-sunken p-2">
        <code dir="ltr" className="min-w-0 flex-1 truncate text-start text-xs">{value}</code>
        <Button
          size="sm"
          tone="ghost"
          icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          onClick={async () => {
            await navigator.clipboard?.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "✓" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

function FreshKey({ name, token, mcpUrl, onClose }: { name: string; token: string; mcpUrl: string; onClose: () => void }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  return (
    <Card className="space-y-3 border-p-ok/40 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">{fa ? `کلید «${name}» ساخته شد` : `Key for “${name}” created`}</h2>
          <p className="mt-1 text-sm text-p-ink-3">{fa ? "این کلید فقط همین یک بار نمایش داده می‌شود. آن را همین حالا در دستیار وارد کنید." : "This key is shown only once. Add it to the assistant now."}</p>
        </div>
        <Button size="sm" tone="ghost" onClick={onClose}>
          {fa ? "بستن" : "Close"}
        </Button>
      </div>
      <CopyLine label={fa ? "کلید" : "Key"} value={token} />
      <CopyLine label={fa ? "نشانی MCP" : "MCP server URL"} value={mcpUrl} />
    </Card>
  );
}

function ConnectGuide({ mcpUrl }: { mcpUrl: string }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  const restUrl = mcpUrl.replace(/\/mcp$/, "");
  const steps = [
    {
      title: "Claude",
      fa: "در Claude به Settings → Connectors → Add custom connector بروید، نشانی MCP را وارد کنید و کلید را در بخش Authorization به شکل Bearer بگذارید. در Claude Code: claude mcp add --transport http aratta <URL> --header \"Authorization: Bearer <KEY>\"",
      en: "In Claude open Settings → Connectors → Add custom connector, paste the MCP URL and add the key as a Bearer authorization header. In Claude Code: claude mcp add --transport http aratta <URL> --header \"Authorization: Bearer <KEY>\"",
    },
    {
      title: "ChatGPT",
      fa: "در ChatGPT (حالت توسعه‌دهنده) یک کانکتور MCP با همین نشانی بسازید و کلید را به‌عنوان Bearer token بدهید. یا در یک GPT سفارشی، Action بسازید که به نشانی REST زیر درخواست بفرستد.",
      en: "In ChatGPT (developer mode) add an MCP connector with this URL and the key as a Bearer token. Or build a custom GPT Action that calls the REST URL below.",
    },
    {
      title: "Grok",
      fa: "در API گروک، این سرور را به‌عنوان remote MCP tool با server_url و هدر Authorization معرفی کنید، یا از نشانی REST استفاده کنید.",
      en: "In the Grok API, add this server as a remote MCP tool with server_url and an Authorization header, or call the REST URL.",
    },
  ];
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold">
        <Plug className="size-4 text-p-brand" aria-hidden="true" />
        {fa ? "اتصال دستیارها" : "Connect an assistant"}
      </h2>
      <Card className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <CopyLine label={fa ? "نشانی MCP" : "MCP server URL"} value={mcpUrl} />
          <CopyLine label={fa ? "نشانی REST" : "REST URL"} value={restUrl} />
        </div>
        <ol className="space-y-3 text-sm leading-7">
          {steps.map((step) => (
            <li key={step.title}>
              <span className="font-semibold">{step.title}: </span>
              <span className="text-p-ink-2">{fa ? step.fa : step.en}</span>
            </li>
          ))}
        </ol>
        <details className="rounded-xl border border-p-line p-3 text-sm">
          <summary className="cursor-pointer font-medium">{fa ? `ابزارهایی که عامل‌ها دارند (${AGENT_TOOLS.length})` : `Tools agents get (${AGENT_TOOLS.length})`}</summary>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {AGENT_TOOLS.map((tool) => (
              <li key={tool.name} className="rounded-lg bg-p-sunken p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{fa ? tool.title.fa : tool.title.en}</span>
                  <span className="text-[11px] text-p-ink-3">{fa ? SCOPE_LABELS[tool.scope].fa : SCOPE_LABELS[tool.scope].en}</span>
                </div>
                <code dir="ltr" className="mt-1 block text-start text-[11px] text-p-ink-3">{tool.name}</code>
              </li>
            ))}
          </ul>
        </details>
      </Card>
    </section>
  );
}
