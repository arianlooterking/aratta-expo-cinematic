import assert from "node:assert/strict";
import { test } from "node:test";

import { DemoStore } from "../src/lib/portal/demo-store.ts";
import { DEMO_STAFF_ID, demoSeed } from "../src/lib/portal/demo-seed.ts";
import { deriveTeam, staffChangeError } from "../src/lib/portal/rules.ts";
import { collectionKey } from "../src/lib/portal/store.ts";
import {
  CAPABILITIES,
  canEditProfile,
  canEditTeam,
  canManageAccess,
  changedFields,
  grantableRoles,
  listDiff,
  normalizePhone,
  parseSkills,
  workloadFor,
} from "../src/lib/portal/team.ts";

async function rows(store, table) {
  store.subscribe(table, null, () => {});
  await new Promise((resolve) => setTimeout(resolve, 5));
  return store.getSnapshot(collectionKey(table, null)).rows;
}

const person = (id, role, extra = {}) => ({ id, role, status: "active", email: `${id}@x.test`, user_id: `u-${id}`, ...extra });

test("a team keeps its lead first and drops repeats and strangers", () => {
  const known = (id) => ["a", "b", "c"].includes(id);
  const t = deriveTeam({ name_fa: "  فروش ", lead_id: "b", member_ids: ["a", "b", "a", "zz", "c"] }, known);
  assert.equal(t.name_fa, "فروش");
  assert.deepEqual(t.member_ids, ["b", "a", "c"]);
  assert.equal(deriveTeam({ name_fa: "x", lead_id: "zz", member_ids: [] }, known).lead_id, null);
});

test("staff guards match the database", () => {
  const owner = person("o", "owner");
  const admin = person("ad", "admin");
  const member = person("m", "member");
  const all = [owner, admin, member];
  assert.equal(staffChangeError(member, member, { ...member, role: "admin" }, all), "not-permitted");
  assert.equal(staffChangeError(admin, admin, { ...admin, role: "owner" }, all), "self-role");
  assert.equal(staffChangeError(admin, null, person("n", "owner"), all), "owner-only");
  assert.equal(staffChangeError(admin, owner, { ...owner, role: "manager" }, all), "owner-only");
  assert.equal(staffChangeError(admin, member, { ...member, role: "manager" }, all), null);
  assert.equal(staffChangeError(admin, member, { ...member, email: "new@x.test" }, all), "email-locked");
  assert.equal(staffChangeError(admin, { ...member, user_id: null }, { ...member, user_id: null, email: "new@x.test" }, all), null);
  assert.equal(staffChangeError(owner, owner, null, all), "self-remove");
  const second = person("o2", "owner");
  assert.equal(staffChangeError(second, owner, { ...owner, status: "suspended" }, [...all, second]), null);
  assert.equal(staffChangeError(second, owner, { ...owner, status: "suspended" }, [owner, { ...second, status: "suspended" }]), "last-owner");
});

test("who may change what on the team screens", () => {
  assert.deepEqual(grantableRoles("admin"), ["admin", "manager", "member", "viewer"]);
  assert.deepEqual(grantableRoles("manager"), []);
  assert.equal(canManageAccess({ id: "a", role: "admin" }, { id: "a", role: "admin" }), false, "not yourself");
  assert.equal(canManageAccess({ id: "a", role: "admin" }, { id: "o", role: "owner" }), false);
  assert.equal(canManageAccess({ id: "o", role: "owner" }, { id: "o2", role: "owner" }), true);
  assert.equal(canEditProfile({ id: "m", role: "member" }, { id: "m", role: "member" }), true, "your own details");
  assert.equal(canEditProfile({ id: "m", role: "member" }, { id: "x", role: "member" }), false);
  assert.equal(canEditTeam({ id: "m", role: "member" }, { lead_id: "m" }), true, "a lead edits their team");
  assert.equal(canEditTeam({ id: "m", role: "member" }, { lead_id: "x" }), false);
  assert.equal(canEditTeam({ id: "v", role: "viewer" }, { lead_id: "v" }), false);
  assert.equal(canEditTeam({ id: "mg", role: "manager" }, null), true);
  const finance = CAPABILITIES.find((c) => c.key === "finance");
  assert.equal(finance.access("member"), "some");
  assert.equal(finance.access("viewer"), "no");
});

test("workload counts open, overdue and handled work", () => {
  const now = Date.parse("2026-11-03T12:00:00Z");
  const w = workloadFor(
    "s",
    {
      booths: [{ manager_ids: ["s"] }, { manager_ids: ["x", "s"] }, { manager_ids: [] }],
      tasks: [
        { assignee_id: "s", status: "todo", due_at: "2026-11-01T00:00:00Z" },
        { assignee_id: "s", status: "done", due_at: "2026-11-01T00:00:00Z" },
        { assignee_id: "s", status: "in_progress", due_at: null },
      ],
      deals: [{ owner_id: "s", stage: "won" }, { owner_id: "s", stage: "proposal" }, { owner_id: "s", stage: "lost" }],
      orders: [{ delivered_by: ["s"], collected_by: [] }, { delivered_by: [], collected_by: ["s"] }, { delivered_by: ["x"], collected_by: [] }],
    },
    now,
  );
  assert.deepEqual(w, { booths: 2, openTasks: 2, overdueTasks: 1, openDeals: 1, wonDeals: 1, handovers: 2 });
});

test("history lines skip noise and list who joined", () => {
  const lines = changedFields({ role: { from: "member", to: "manager" }, updated_at: { from: 1, to: 2 }, last_seen_at: { from: null, to: "x" } });
  assert.deepEqual(lines, [{ field: "role", from: "member", to: "manager" }]);
  assert.deepEqual(listDiff(["a", "b"], ["b", "c"]), { added: ["c"], removed: ["a"] });
});

test("skills and phone numbers are cleaned", () => {
  assert.deepEqual(parseSkills("مذاکره، انگلیسی, مذاکره ,\n"), ["مذاکره", "انگلیسی"]);
  assert.equal(normalizePhone("+98 912 123 4567"), "09121234567");
  assert.equal(normalizePhone("۰۹۱۲۱۲۳۴۵۶۷"), "09121234567");
  assert.equal(normalizePhone("034-3222 1111"), "034-3222 1111");
});

test("demo store: teams, guards, removal and history", async () => {
  const store = new DemoStore(demoSeed);
  const staff = await rows(store, "staff_members");
  const teams = await rows(store, "teams");
  assert.ok(teams.length >= 3, "sample teams");
  assert.ok(staff.some((s) => s.status === "invited"), "a sample invite");

  const me = staff.find((s) => s.id === DEMO_STAFF_ID);
  const denied = await store.update("staff_members", me.id, { role: "admin" });
  assert.deepEqual(denied, { ok: false, error: "self-role" });

  const dup = await store.insert("staff_members", { id: crypto.randomUUID(), email: staff[1].email.toUpperCase() });
  assert.equal(dup.ok, false);

  const team = teams.find((t) => t.member_ids.length >= 2);
  const leaving = team.member_ids.find((id) => id !== team.lead_id && id !== DEMO_STAFF_ID);
  const removed = await store.remove("staff_members", leaving);
  assert.equal(removed.ok, true);
  const after = (await rows(store, "teams")).find((t) => t.id === team.id);
  assert.ok(!after.member_ids.includes(leaving), "removed colleague leaves the team");

  const edited = await store.updateMyProfile(me.id, { bio: "  ", job_title: "مدیر", skills: ["a", " a ", "b"] });
  assert.equal(edited.ok, true);
  assert.equal(edited.row.bio, null);
  assert.deepEqual(edited.row.skills, ["a", "b"]);

  const history = await store.history({ tables: ["staff_members", "teams"] });
  assert.ok(history.ok);
  assert.equal(history.entries[0].table_name, "staff_members");
  assert.equal(history.entries[0].action, "update");
  assert.ok(history.entries.some((e) => e.action === "delete" && e.row_id === leaving));
  const mine = await store.history({ tables: ["staff_members"], rowId: me.id });
  assert.ok(mine.entries.every((e) => e.row_id === me.id));
});
