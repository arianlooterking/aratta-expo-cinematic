import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
const archive = JSON.parse(
  await readFile(
    new URL("../src/data/legacy-content.json", import.meta.url),
    "utf8",
  ),
);

test("the migration preserves all 50 public articles, 15 real pages and 3 exhibition books", () => {
  assert.equal(archive.entries.length, 68);
  assert.equal(archive.entries.filter((e) => !["page", "catalogue"].includes(e.kind)).length, 50);
  assert.equal(archive.entries.filter((e) => e.kind === "catalogue").length, 3);
  assert.equal(new Set(archive.entries.map((e) => e.id)).size, 68);
  assert.deepEqual(archive.failures, []);
  assert.ok(
    archive.entries
      .find((e) => e.id === 5807)
      .paragraphs.some((p) => p.includes("تعویق")),
  );
  assert.ok(
    !archive.entries.some((e) => e.id === 2856),
    "Theme lorem-ipsum page is not imported",
  );
});

test("book listings retain covers without fake purchases and builder sections remain readable", () => {
  for (const entry of archive.entries.filter(e => e.kind === "catalogue")) {
    assert.ok(entry.images.length > 0);
    assert.doesNotMatch(entry.paragraphs.join("\n"), /افزودن به سبد|تومان|نظرات/);
    assert.ok(entry.links.every(link => !/add-to-cart|checkout/.test(link.href)));
  }
  assert.ok(archive.entries.find(e => e.id === 5713).paragraphs.length > 5);
});

test("imported images and documents have local non-empty copies with correct signatures", async () => {
  for (const asset of archive.assets) {
    assert.match(
      asset.src,
      /^\/legacy-media\/[a-f0-9]+\.(jpg|jpeg|png|webp|gif|pdf|mp4|mp3|xlsx?|docx?|zip)$/,
    );
    const url = new URL(`../public${asset.src}`, import.meta.url);
    assert.equal((await stat(url)).size, asset.bytes);
    assert.ok(asset.bytes > 0);
    if (asset.src.endsWith(".pdf"))
      assert.equal((await readFile(url)).subarray(0, 5).toString(), "%PDF-");
  }
});

test("archive paths and content are safe data and do not execute source HTML or plugins", () => {
  const localAssets = new Set(archive.assets.map((a) => a.src));
  for (const entry of archive.entries) {
    assert.ok(archive.pathMap[entry.legacyPath]);
    assert.match(archive.pathMap[entry.legacyPath], /^\/fa(?:\/|$)/);
    assert.ok(entry.paragraphs.every((p) => typeof p === "string"));
    assert.ok(entry.images.every((image) => localAssets.has(image.src)));
    assert.ok(
      entry.links.every((link) => /^(\/|https?:|mailto:|tel:)/.test(link.href)),
    );
    assert.doesNotMatch(
      entry.paragraphs.join("\n"),
      /<script|document\.getElementById|\[vc_|\[contact-form/i,
    );
  }
});

test("full original gallery and exhibition reports retain all their photograph sets", () => {
  for (const id of [4720, 4718, 4714])
    assert.ok(archive.entries.find((e) => e.id === id).images.length >= 13);
  assert.ok(archive.entries.find((e) => e.id === 2920).images.length >= 45);
  assert.ok(archive.assets.filter((a) => a.src.endsWith(".pdf")).length >= 5);
});

test("video reports preserve Aparat destinations without legacy executable embeds", () => {
  for (const id of [5145, 5140, 5129]) {
    const entry = archive.entries.find((item) => item.id === id);
    assert.ok(
      entry.links.some((link) =>
        /^https:\/\/www\.aparat\.com\/v\/[a-zA-Z0-9]+$/.test(link.href),
      ),
    );
  }
});
