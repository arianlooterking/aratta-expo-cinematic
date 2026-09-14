import { test } from "node:test";
import assert from "node:assert/strict";
import { legacyRedirectRules, legacyRedirectUrl } from "../src/lib/legacy-redirects.ts";

test("every imported old path resolves to a same-origin ASCII-safe redirect", () => {
  for (const rule of legacyRedirectRules) {
    for (const path of [rule.source, rule.source === "/" ? "/" : rule.source + "/"]) {
      const target = legacyRedirectUrl(new URL(path, "https://arattaexpo.ir"));
      assert.equal(target.pathname, rule.destination);
      assert.equal(target.origin,"https://arattaexpo.ir");
      assert.doesNotThrow(()=>Response.redirect(target.href,308));
    }
  }
});

test("unknown Persian slash paths normalize without a non-ASCII Location header", () => {
  const target=legacyRedirectUrl(new URL("https://arattaexpo.ir/آرشیو-دیگر/?q=test"));
  assert.equal(target.search,"?q=test");
  assert.equal(decodeURIComponent(target.pathname),"/آرشیو-دیگر");
  assert.doesNotThrow(()=>Response.redirect(target.href,308));
});

test("current routes and malformed encodings are left for the app router", () => {
  for(const path of ["/fa/archive/5713","/fa/staff","/bad%zz"]) assert.equal(legacyRedirectUrl(new URL(path,"https://arattaexpo.ir")),null);
});
