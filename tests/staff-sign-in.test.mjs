import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { DemoStore } from "../src/lib/portal/demo-store.ts";
import { demoSeed } from "../src/lib/portal/demo-seed.ts";
import { passwordChangeProblem, signInProblem, signInProviders } from "../src/lib/platform/sign-in.ts";
import { newStartingPassword, passwordProblem, signInDetails } from "../src/lib/portal/team.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Google and Apple buttons stay hidden until they are listed", () => {
  assert.deepEqual(signInProviders(undefined), []);
  assert.deepEqual(signInProviders(""), []);
  assert.deepEqual(signInProviders("google"), ["google"]);
  assert.deepEqual(signInProviders(" Apple , GOOGLE "), ["google", "apple"]);
  assert.deepEqual(signInProviders("github,password"), [], "unknown names are ignored");
});

test("sign-in failures are explained without saying which part was wrong", () => {
  assert.equal(signInProblem({ code: "invalid_credentials", status: 400 }), "credentials");
  assert.equal(signInProblem({ message: "Invalid login credentials" }), "credentials");
  assert.equal(signInProblem({ code: "email_not_confirmed" }), "credentials", "no hint that the account exists");
  assert.equal(signInProblem({ status: 429, code: "over_request_rate_limit" }), "too-many");
  assert.equal(signInProblem({ name: "AuthRetryableFetchError", message: "Failed to fetch" }), "offline");
  assert.equal(signInProblem(new TypeError("Failed to fetch")), "offline");
  assert.equal(signInProblem(null), "unknown");
});

test("a failed password change says what to fix", () => {
  assert.equal(passwordChangeProblem({ code: "same_password" }), "same");
  assert.equal(passwordChangeProblem({ message: "New password should be different from the old password." }), "same");
  assert.equal(passwordChangeProblem({ code: "weak_password" }), "weak");
  assert.equal(passwordChangeProblem({ message: "Auth session missing!" }), "session");
  assert.equal(passwordChangeProblem({ name: "AuthRetryableFetchError" }), "offline");
  assert.equal(passwordChangeProblem({}), "unknown");
});

test("starting passwords are random, readable and long enough", () => {
  const seen = new Set();
  for (let i = 0; i < 200; i += 1) {
    const password = newStartingPassword();
    assert.match(password, /^[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}$/, "three groups, no 0/o/1/l/i");
    assert.equal(passwordProblem(password), null);
    seen.add(password);
  }
  assert.equal(seen.size, 200, "no repeats");
  // Bytes that would skew the choice are thrown away, not wrapped around.
  let call = 0;
  const skewed = newStartingPassword((n) => new Uint8Array(n).fill(call++ === 0 ? 255 : 0));
  assert.equal(skewed, "aaaa-aaaa-aaaa");
});

test("password rules match the database", async () => {
  assert.equal(passwordProblem("1234567"), "short");
  assert.equal(passwordProblem("12345678"), null);
  assert.equal(passwordProblem("گذرواژه"), "short", "counted in characters");
  assert.equal(passwordProblem("x".repeat(72)), null);
  assert.equal(passwordProblem("x".repeat(73)), "long");
  assert.equal(passwordProblem("گ".repeat(40)), "long", "bcrypt reads 72 bytes");
  const sql = await read("../supabase/migrations/20261112120000_password_sign_in.sql");
  assert.match(sql, /length\(p_password\) < 8 or octet_length\(p_password\) > 72/);
  assert.match(sql, /revoke execute on function public\.staff_account_set_password\(text, text\) from public, anon, authenticated/);
  assert.match(sql, /revoke execute on function public\.staff_set_password\(uuid, text\) from public, anon/);
});

test("sign-in details carry the link, the email and the password in both languages", () => {
  const fa = signInDetails("fa", "https://x.test/fa/staff/sign-in", "sara@x.test", "abcd-efgh-jkmn");
  const en = signInDetails("en", "https://x.test/en/staff/sign-in", "sara@x.test", "abcd-efgh-jkmn");
  for (const text of [fa, en]) {
    assert.ok(text.includes("sara@x.test"));
    assert.ok(text.includes("abcd-efgh-jkmn"));
    assert.ok(text.includes("/staff/sign-in"));
  }
  assert.ok(fa.includes("اَرَتَ"));
  assert.ok(en.includes("Aratta"));
});

test("the demo accepts a starting password without storing anything", async () => {
  const store = new DemoStore(demoSeed);
  const someone = demoSeed().staff_members[1];
  assert.deepEqual(await store.setStaffPassword(someone.id, "abcd-efgh-jkmn"), { ok: true });
  assert.equal((await store.setStaffPassword(someone.id, "short")).ok, false);
  assert.equal((await store.setStaffPassword("nobody", "abcd-efgh-jkmn")).ok, false);
});

test("the sign-in screen leads with email and password, in Persian and English", async () => {
  const panel = await read("../src/components/platform/SignInPanel.tsx");
  assert.match(panel, /signInWithPassword\(\{ email, password \}\)/);
  assert.match(panel, /autoComplete="username"/);
  assert.match(panel, /autoComplete="current-password"/);
  assert.match(panel, /ایمیل یا گذرواژه درست نیست/);
  assert.match(panel, /That email or password isn’t right/);
  assert.match(panel, /providers\.length \?/, "Google and Apple only when configured");
  const page = await read("../src/app/[lang]/staff/sign-in/page.tsx");
  assert.match(page, /signInProviders\(process\.env\.NEXT_PUBLIC_SIGN_IN_PROVIDERS\)/);
});

test("a starting password has to be replaced before the portal opens", async () => {
  const layout = await read("../src/app/[lang]/staff/(portal)/layout.tsx");
  assert.match(layout, /session\.mustChangePassword\) redirect\(`\/\$\{lang\}\/staff\/password`\)/);
  const session = await read("../src/lib/platform/session.ts");
  assert.match(session, /mustChangePassword: Boolean\(user\.app_metadata\?\.must_change_password\)/);
  const panel = await read("../src/components/platform/PasswordPanel.tsx");
  assert.match(panel, /auth\.updateUser\(\{ password \}\)/);
  assert.match(panel, /rpc\("password_change_pending"\)/);
  assert.match(panel, /autoComplete="new-password"/);
});
