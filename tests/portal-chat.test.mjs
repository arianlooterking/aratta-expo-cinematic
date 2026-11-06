import assert from "node:assert/strict";
import { test } from "node:test";

import {
  afterChatMessage,
  attachmentsOf,
  chatPreview,
  dmKey,
  dmPartner,
  findMentions,
  groupMessages,
  mentionQuery,
  splitBody,
  storageName,
  unreadTotals,
} from "../src/lib/portal/chat.ts";

const people = [
  { id: "a", name: "سارا کریمی" },
  { id: "b", name: "سارا" },
  { id: "c", name: "کاوه رستمی" },
];

test("a pair of colleagues has one direct conversation", () => {
  assert.equal(dmKey("b", "a"), "a:b");
  assert.equal(dmKey("a", "b"), "a:b");
  assert.equal(dmPartner({ dm_key: "a:b" }, "a"), "b");
  assert.equal(dmPartner({ dm_key: "a:b" }, "b"), "a");
  assert.equal(dmPartner({ dm_key: null }, "a"), null);
});

test("mentions match full names first and survive editing", () => {
  assert.deepEqual(findMentions("سلام @سارا کریمی و @کاوه رستمی", people).sort(), ["a", "c"]);
  assert.deepEqual(findMentions("فقط @سارا بیاید", people), ["b"]);
  assert.deepEqual(findMentions("بدون نام", people), []);
});

test("message text splits into mentions, links and plain text", () => {
  const parts = splitBody("ببین @کاوه رستمی https://arattaexpo.ir/fa، ممنون", people);
  assert.deepEqual(
    parts.map((p) => p.kind),
    ["text", "mention", "text", "link", "text", "text"],
  );
  assert.equal(parts[1].id, "c");
  assert.equal(parts[3].value, "https://arattaexpo.ir/fa");
});

test("the @ word before the cursor drives the mention picker", () => {
  assert.deepEqual(mentionQuery("سلام @کا", 8), { query: "کا", start: 5 });
  assert.equal(mentionQuery("ایمیل a@b", 9), null);
  assert.deepEqual(mentionQuery("@", 1), { query: "", start: 0 });
});

test("previews fall back to the first file name", () => {
  assert.equal(chatPreview("  سلام\n\nدنیا ", []), "سلام دنیا");
  assert.equal(chatPreview("", [{ path: "x", name: "plan.pdf", type: "application/pdf", size: 1 }]), "📎 plan.pdf");
  assert.deepEqual(attachmentsOf([{ path: "p", name: "n", type: "t", size: 1 }, null, 3]).length, 1);
});

test("messages group by day and fold runs from one sender", () => {
  const at = (h, m) => new Date(2026, 10, 6, h, m).toISOString();
  const rows = [
    { id: "1", author_id: "a", bot_name: null, kind: "text", created_at: at(9, 0) },
    { id: "2", author_id: "a", bot_name: null, kind: "text", created_at: at(9, 2) },
    { id: "3", author_id: "a", bot_name: null, kind: "text", created_at: at(9, 30) },
    { id: "4", author_id: null, bot_name: "Grok", kind: "alert", created_at: at(9, 31) },
    { id: "5", author_id: "c", bot_name: null, kind: "text", created_at: new Date(2026, 10, 7, 8, 0).toISOString() },
  ];
  const days = groupMessages(rows);
  assert.equal(days.length, 2);
  assert.deepEqual(days[0].runs.map((r) => r.messages.map((m) => m.id)), [["1", "2"], ["3"], ["4"]]);
  assert.equal(days[1].runs[0].author, "c");
});

test("badges skip muted chats unless you were mentioned", () => {
  const totals = unreadTotals([
    { unread_count: 3, mention_count: 0, muted: false },
    { unread_count: 9, mention_count: 1, muted: true },
  ]);
  assert.deepEqual(totals, { unread: 3, mentions: 1, badge: 4 });
});

test("a new message counts as unread and notifies like the database does", () => {
  const channel = { id: "ch", kind: "channel", name: "فروش", dm_key: null, is_private: false };
  const members = [
    { id: "m1", channel_id: "ch", staff_id: "a", unread_count: 0, mention_count: 0, muted: false },
    { id: "m2", channel_id: "ch", staff_id: "c", unread_count: 2, mention_count: 0, muted: false },
    { id: "m3", channel_id: "ch", staff_id: "b", unread_count: 0, mention_count: 0, muted: true },
  ];
  const message = { id: "x", channel_id: "ch", author_id: "a", bot_name: null, kind: "text", body: "@کاوه رستمی سلام", mentions: ["c", "b"], attachments: [], created_at: "" };
  const { counters, notices } = afterChatMessage(message, channel, members, "سارا");
  assert.deepEqual(counters, [
    { id: "m2", unread_count: 3, mention_count: 1 },
    { id: "m3", unread_count: 1, mention_count: 1 },
  ]);
  assert.deepEqual(notices.map((n) => [n.recipient_id, n.kind, n.title]), [["c", "chat.mention", "سارا در #فروش"]]);

  const dm = { id: "d", kind: "direct", name: null, dm_key: "a:c", is_private: false };
  const dmMembers = [
    { id: "d1", channel_id: "d", staff_id: "a", unread_count: 0, mention_count: 0, muted: false },
    { id: "d2", channel_id: "d", staff_id: "c", unread_count: 0, mention_count: 0, muted: false },
  ];
  const direct = afterChatMessage({ ...message, channel_id: "d", mentions: [] }, dm, dmMembers, "سارا");
  assert.deepEqual(direct.notices.map((n) => [n.recipient_id, n.kind, n.link]), [["c", "chat.direct", "/staff/chat?c=d"]]);
});

test("uploaded files get a plain storage name", () => {
  assert.equal(storageName("نقشه سالن.PDF"), "file.pdf");
  assert.equal(storageName("noext"), "file");
});

import { bearerToken, parseAgentTokens, readAgentPost } from "../src/lib/chat-agent.ts";

test("agent tokens name the agent and must be long", () => {
  const agents = parseAgentTokens("Grok=abcdefghijklmnopqrstuvwxyz12,\nChatGPT=short, broken");
  assert.deepEqual(agents, [{ name: "Grok", token: "abcdefghijklmnopqrstuvwxyz12" }]);
  assert.equal(bearerToken("Bearer abc"), "abc");
  assert.equal(bearerToken("Basic abc"), null);
});

test("agent posts are checked before they reach the database", () => {
  assert.deepEqual(readAgentPost({ text: " سلام " }), { channel: "alerts", text: "سلام", link: null, kind: "alert" });
  assert.equal(readAgentPost({ channel: "general", text: "x", link: "https://evil.example" }).link, null);
  assert.equal(readAgentPost({ channel: "general", text: "x", link: "/staff/map?b=1" }).link, "/staff/map?b=1");
  assert.ok("error" in readAgentPost({ channel: "bad name", text: "x" }));
  assert.ok("error" in readAgentPost({ text: "" }));
});
