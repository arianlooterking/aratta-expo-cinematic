import assert from "node:assert/strict";
import { test } from "node:test";

import {
  extractProviderOutputText,
  hasProviderRefusal,
  matchesPlanFileSignature,
  normalizeAuthenticatedEmail,
  normalizeStructuredPlan,
  parseAllowedEmails,
} from "../src/lib/plan-reconstruction-api.ts";

test("AI reconstruction access normalizes exact emails and rejects broken allowlists", () => {
  assert.equal(normalizeAuthenticatedEmail("  Operator@Example.COM "), "operator@example.com");
  assert.equal(normalizeAuthenticatedEmail("not-an-email"), null);
  assert.deepEqual(
    [...parseAllowedEmails("owner@example.com, Ops@example.com")],
    ["owner@example.com", "ops@example.com"],
  );
  assert.equal(parseAllowedEmails(undefined), null);
  assert.equal(parseAllowedEmails("owner@example.com,"), null);
});

test("AI reconstruction validates declared file types against their magic signatures", () => {
  assert.equal(
    matchesPlanFileSignature(
      Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      "image/png",
    ),
    true,
  );
  assert.equal(
    matchesPlanFileSignature(
      Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]),
      "application/pdf",
    ),
    true,
  );
  assert.equal(
    matchesPlanFileSignature(
      Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]),
      "image/jpeg",
    ),
    false,
  );
});

test("AI reconstruction detects refusals and extracts only output text", () => {
  const successful = {
    status: "completed",
    output: [{
      type: "message",
      content: [{ type: "output_text", text: "{\"summary\":\"ok\"}" }],
    }],
  };
  const refused = {
    status: "completed",
    output: [{ type: "message", content: [{ type: "refusal", refusal: "No" }] }],
  };

  assert.equal(extractProviderOutputText(successful), "{\"summary\":\"ok\"}");
  assert.equal(hasProviderRefusal(successful), false);
  assert.equal(hasProviderRefusal(refused), true);
  assert.equal(extractProviderOutputText(refused), null);
});

test("AI reconstruction validates structured geometry and axis-aligns booths", () => {
  const plan = normalizeStructuredPlan({
    summary: "One booth and one door",
    confidence: 0.91,
    items: [
      {
        type: "booth",
        code: "A-101",
        label: null,
        kind: null,
        x: 1,
        y: 2,
        width: 4,
        height: 3,
        area: 12,
        rotation: 35,
        company: null,
        zone: "A",
        notes: null,
      },
      {
        type: "feature",
        code: null,
        label: "Door",
        kind: "door",
        x: 0,
        y: 5,
        width: 2,
        height: 0.3,
        area: 0.6,
        rotation: 90,
        company: null,
        zone: null,
        notes: null,
      },
    ],
  });

  assert.equal(plan?.items[0].rotation, 0);
  assert.equal(plan?.items[1].rotation, 90);
  assert.equal(normalizeStructuredPlan({ summary: "bad", confidence: 2, items: [] }), null);
});
