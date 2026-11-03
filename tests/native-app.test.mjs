import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isAppUserAgent,
  langFromPath,
  nativeRedirectTo,
  notificationPath,
  parseAuthReturn,
  signInPathFor,
} from "../src/lib/native/links.ts";

test("app redirect keeps a safe next path", () => {
  assert.equal(nativeRedirectTo("/en/staff/crm"), "ir.arattaexpo.staff://auth/callback?next=%2Fen%2Fstaff%2Fcrm");
  assert.equal(nativeRedirectTo("https://evil.example"), "ir.arattaexpo.staff://auth/callback?next=%2Ffa%2Fstaff");
  assert.equal(nativeRedirectTo("//evil.example"), "ir.arattaexpo.staff://auth/callback?next=%2Ffa%2Fstaff");
});

test("sign-in deep link with a code", () => {
  assert.deepEqual(parseAuthReturn("ir.arattaexpo.staff://auth/callback?next=%2Fen%2Fstaff%2Ftasks&code=abc123"), {
    kind: "code",
    code: "abc123",
    next: "/en/staff/tasks",
  });
  assert.deepEqual(parseAuthReturn("ir.arattaexpo.staff:///auth/callback?code=xyz"), {
    kind: "code",
    code: "xyz",
    next: "/fa/staff",
  });
});

test("sign-in deep link with an error, and unsafe next", () => {
  assert.deepEqual(
    parseAuthReturn("ir.arattaexpo.staff://auth/callback?next=https://evil.example#error=access_denied&error_description=Cancelled"),
    { kind: "error", next: "/fa/staff", message: "Cancelled" },
  );
});

test("other links are ignored", () => {
  assert.equal(parseAuthReturn(null), null);
  assert.equal(parseAuthReturn("not a url"), null);
  assert.equal(parseAuthReturn("https://aratta-expo-cinematic.vercel.app/auth/callback?code=1"), null);
  assert.equal(parseAuthReturn("ir.arattaexpo.staff://tasks/1?code=1"), null);
  assert.equal(parseAuthReturn("otherapp://auth/callback?code=1"), null);
});

test("notification links open in the current language", () => {
  assert.equal(notificationPath("fa", "/staff/tasks/42"), "/fa/staff/tasks/42");
  assert.equal(notificationPath("en", "/staff/tasks/42"), "/en/staff/tasks/42");
  assert.equal(notificationPath("en", "/fa/staff/crm/1"), "/fa/staff/crm/1");
  assert.equal(notificationPath("fa", "https://evil.example/staff"), "/fa/staff");
  assert.equal(notificationPath("fa", "//evil.example/staff"), "/fa/staff");
  assert.equal(notificationPath("fa", "/admin"), "/fa/staff");
  assert.equal(notificationPath("fa", undefined), "/fa/staff");
  assert.equal(notificationPath("en", "/staffing"), "/en/staff");
});

test("small helpers", () => {
  assert.equal(isAppUserAgent("Mozilla/5.0 ... ArattaStaffApp/1"), true);
  assert.equal(isAppUserAgent("Mozilla/5.0 Safari"), false);
  assert.equal(isAppUserAgent(null), false);
  assert.equal(signInPathFor("/en/staff/crm"), "/en/staff/sign-in");
  assert.equal(signInPathFor("/fa/staff"), "/fa/staff/sign-in");
  assert.equal(langFromPath("/en/staff"), "en");
  assert.equal(langFromPath("/fa/staff"), "fa");
});
