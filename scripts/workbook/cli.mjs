#!/usr/bin/env node
// Aratta workbook importer.
//
//   node scripts/workbook/cli.mjs plan    <workbook.xlsx> [--out imports/plan.json] [--year 1405]
//   node scripts/workbook/cli.mjs preview <workbook.xlsx> --plan imports/plan.json [--out imports/preview.json]
//   node scripts/workbook/cli.mjs apply   <workbook.xlsx> --plan imports/plan.json [--database-url postgres://…]
//
// "plan" guesses what each sheet is; review and edit the JSON. "preview"
// shows exactly what would be imported, with warnings. "apply" writes it to
// Supabase (needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) and can be run
// again safely: every row carries an import key, so re-runs update in place.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import ExcelJS from "exceljs";
import { buildDataset, summarise } from "./build.mjs";
import { proposePlan } from "./plan.mjs";

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

async function write(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, (_k, v) => (v instanceof Set ? [...v] : v instanceof Map ? [...v.values()] : v), 2)}\n`);
}

async function main() {
  const [command, file] = process.argv.slice(2);
  if (!command || !file || !["plan", "preview", "apply"].includes(command)) {
    console.error("Usage: cli.mjs <plan|preview|apply> <workbook.xlsx> [--plan plan.json] [--out file.json]");
    process.exit(2);
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);

  if (command === "plan") {
    const plan = proposePlan(workbook, { defaultYear: arg("year") });
    const out = arg("out", "imports/plan.json");
    await write(out, plan);
    const kinds = {};
    for (const s of plan.sheets) kinds[s.kind] = (kinds[s.kind] ?? 0) + 1;
    console.log(`Wrote ${out}: ${plan.sheets.length} sheets`, kinds);
    console.log(`Exhibitions guessed: ${plan.exhibitions.map((e) => e.slug).join(", ")}`);
    console.log(`Salespeople found: ${Object.keys(plan.salespeople).join(", ")}`);
    return;
  }

  const planPath = arg("plan");
  if (!planPath) throw new Error("--plan is required");
  const plan = JSON.parse(await readFile(planPath, "utf8"));
  const dataset = buildDataset(workbook, plan);
  const summary = summarise(dataset);

  if (command === "preview") {
    const out = arg("out", "imports/preview.json");
    const rest = { ...dataset };
    delete rest.plan;
    await write(out, { summary, ...rest });
    console.log(`Wrote ${out}`);
    console.log(summary);
    return;
  }

  const { applyDataset } = await import("./apply.mjs");
  const result = await applyDataset(dataset, {
    databaseUrl: arg("database-url"),
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  });
  console.log(summary);
  console.log("Applied:", result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
