// Turns the reviewed plan + workbook into one normalised, de-duplicated
// dataset. Nothing here talks to the database; see apply.mjs for that.
import { parseHallMap } from "./hall-map.mjs";
import {
  cellText,
  companyKey,
  extractPhones,
  normalizeText,
  parseAmount,
  parseJalaliDate,
  stripPhones,
} from "./normalize.mjs";
import { columnOf, dataRows, readHeader } from "./tables.mjs";

const STAGES = ["lead", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];
const BOOTH_CODE_IN_TEXT = /\(\s*([A-Za-z]{1,3}\s?\d{1,3}[A-Za-z]?)\s*\)|(?:^|\s)([A-Za-z]{1,2}\d{1,3})$/;

/**
 * One invoice line from a row's area, unit price and billed total. The billed
 * total (with VAT, after discount) wins: a lower total becomes a discount, a
 * total that doesn't fit area x unit price becomes a lump-sum line.
 */
export function invoiceLine(service, area, unitPrice, totalWithVat, subtotal, vat) {
  const billed = totalWithVat ? totalWithVat / (1 + vat) : subtotal;
  if (area && unitPrice) {
    const listPrice = area * unitPrice;
    if (!billed || Math.abs(billed - listPrice) <= listPrice * 0.02) {
      return { service, quantity: area, unit: "m2", unit_price: Math.round(unitPrice) };
    }
    if (billed < listPrice) {
      return {
        service,
        quantity: area,
        unit: "m2",
        unit_price: Math.round(unitPrice),
        discount: Math.round(listPrice - billed),
      };
    }
  }
  if (billed && billed > 0) return { service, quantity: 1, unit: "lump", unit_price: Math.round(billed) };
  return null;
}

const TOTAL_ROW = /^(جمع|جمع کل|مجموع|کل|total|sum)$/i;

export function stageFromStatus(text) {
  const t = normalizeText(text);
  if (!t) return null;
  if (/نمی\s?کن|انصراف|عدم|کنسل|لغو|منصرف/.test(t)) return "lost";
  if (/قطعی|پیش\s?پرداخت|واریز شد|تسویه|قرارداد/.test(t)) return "won";
  if (/ارسال|پیش\s?فاکتور|پروپوزال/.test(t)) return "proposal";
  if (/مذاکره|پیگیری/.test(t)) return "negotiation";
  if (/رزرو/.test(t)) return "negotiation";
  return null;
}

function slugify(text) {
  return normalizeText(text).toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, "-").replace(/^-|-$/g, "");
}

export function createDataset(plan) {
  return {
    plan,
    exhibitions: new Map(plan.exhibitions.map((e) => [e.slug, e])),
    companies: new Map(),
    contacts: new Map(),
    deals: new Map(),
    halls: [],
    invoices: [],
    items: new Map(),
    orders: [],
    permits: [],
    guests: [],
    activities: [],
    warnings: [],
  };
}

function warn(ds, sheet, row, message) {
  ds.warnings.push({ sheet, row, message });
}

function upsertCompany(ds, rawName, extra = {}) {
  const name = normalizeText(rawName);
  const key = companyKey(name);
  if (!key || key.length < 2 || /^\d+$/.test(key)) return null;
  const existing = ds.companies.get(key);
  if (existing) {
    if (extra.kind === "contractor" && existing.kind === "exhibitor") existing.kind = "contractor";
    if (extra.sector && !existing.sector) existing.sector = extra.sector;
    for (const p of extra.phones ?? []) existing.phones.add(p);
    return existing;
  }
  const company = {
    key,
    name_fa: name.replace(/‌/g, "‌"),
    kind: extra.kind ?? "exhibitor",
    sector: extra.sector ?? null,
    phones: new Set(extra.phones ?? []),
  };
  ds.companies.set(key, company);
  return company;
}

function upsertContact(ds, company, rawName, phones, jobTitle = null) {
  const name = stripPhones(rawName) || null;
  if (!name && !phones.length) return null;
  const key = `${company.key}|${phones[0] ?? companyKey(name)}`;
  const existing = ds.contacts.get(key);
  if (existing) {
    existing.full_name = existing.full_name ?? name;
    if (!existing.phone_alt && phones[1]) existing.phone_alt = phones[1];
    return existing;
  }
  const contact = {
    key,
    companyKey: company.key,
    full_name: name ?? phones[0],
    phone: phones[0] ?? null,
    phone_alt: phones[1] ?? null,
    job_title: jobTitle,
  };
  ds.contacts.set(key, contact);
  return contact;
}

function upsertDeal(ds, exhibition, company, { stage = "lead", owner = null, note = null } = {}) {
  const key = `${exhibition}|${company.key}`;
  let deal = ds.deals.get(key);
  if (!deal) {
    deal = { key, exhibition, companyKey: company.key, stage: "lead", owner: null, notes: [] };
    ds.deals.set(key, deal);
  }
  // "lost" only wins over early stages; any sale beats a lost marker.
  const rank = (s) => (s === "lost" ? 0.5 : STAGES.indexOf(s));
  if (stage && rank(stage) > rank(deal.stage)) deal.stage = stage;
  if (owner && !deal.owner) deal.owner = owner;
  if (note && !deal.notes.includes(note)) deal.notes.push(note);
  return deal;
}

function exhibitionYear(ds, slug) {
  const year = Number(ds.exhibitions.get(slug)?.year_label);
  return Number.isFinite(year) ? year : undefined;
}

function rowPeople(header, row) {
  const people = [];
  for (const c of header.columns.values()) {
    if (c.role !== "person") continue;
    const text = row.text(c.col);
    if (text) people.push({ person: c.person, text });
  }
  return people;
}

/** Owner = the salesperson whose column is filled for this row. */
function rowOwner(header, row) {
  return rowPeople(header, row)[0]?.person ?? null;
}

function sheetHall(ds, sheet) {
  return normalizeText(sheet.hall ?? "") || null;
}

// --- Sheet readers -----------------------------------------------------------

function readHallMap(ds, ws, sheet) {
  const parsed = parseHallMap(ws);
  for (const message of parsed.warnings) warn(ds, sheet.sheet, null, message);
  const hall = {
    key: `${sheet.exhibition}|${slugify(sheet.hall ?? sheet.sheet)}`,
    exhibition: sheet.exhibition,
    name_fa: sheet.hall ?? parsed.title ?? sheet.sheet,
    width: parsed.width,
    depth: parsed.depth,
    title: parsed.title,
    sheet: sheet.sheet,
    booths: parsed.booths,
    features: parsed.features,
  };
  if (ds.halls.some((h) => h.key === hall.key)) {
    warn(ds, sheet.sheet, null, `Hall ${hall.name_fa} already imported for ${sheet.exhibition}; kept the first sheet`);
    return;
  }
  ds.halls.push(hall);
  for (const booth of hall.booths) {
    if (!booth.company) continue;
    const company = upsertCompany(ds, booth.company);
    if (!company) continue;
    booth.companyKey = company.key;
    upsertDeal(ds, sheet.exhibition, company, {
      stage: booth.status === "contracted" ? "won" : "negotiation",
    });
  }
}

function readFinancialSheet(ds, ws, sheet, service) {
  const header = readHeader(ws);
  if (!header) return warn(ds, sheet.sheet, null, "No header row found");
  const col = (role, nth = 0) => columnOf(header, role, nth);
  const vat = ds.plan.vatRate ?? 0.1;
  let hallHint = sheetHall(ds, sheet);

  for (const row of dataRows(ws, header)) {
    const rawCompany = row.text(col("company"));
    if (!rawCompany || TOTAL_ROW.test(rawCompany)) continue;
    const numbers = ["area", "unitPrice", "subtotal", "total", "collected", "buildTotal"]
      .map((r) => parseAmount(row.value(col(r))))
      .filter((n) => n !== null && n > 0);
    if (/^سالن\s/.test(rawCompany) && numbers.length === 0) {
      hallHint = rawCompany;
      continue;
    }
    const codeMatch = rawCompany.match(BOOTH_CODE_IN_TEXT);
    const boothCode = codeMatch ? (codeMatch[1] ?? codeMatch[2]).replace(/\s/g, "").toUpperCase() : null;
    const companyName = codeMatch ? normalizeText(rawCompany.replace(codeMatch[0], " ")) : rawCompany;
    const phones = [col("phone"), col("phone", 1), col("contact")].flatMap((c) => extractPhones(row.value(c)));
    const company = upsertCompany(ds, companyName, {
      sector: row.text(col("sector")) || null,
      phones,
    });
    if (!company) {
      warn(ds, sheet.sheet, row.rowNumber, `Skipped row with unreadable company "${rawCompany}"`);
      continue;
    }
    const contactText = row.text(col("contact")) || row.text(col("phone"));
    if (contactText || phones.length) upsertContact(ds, company, contactText, phones);

    const statusText = [row.text(col("status")), row.text(col("invoiceStatus"))].filter(Boolean).join(" · ");
    const owner = rowOwner(header, row);
    for (const p of rowPeople(header, row)) {
      if (p.text === p.person) continue;
      ds.activities.push({
        key: `${sheet.sheet}|${row.rowNumber}|${p.person}`,
        exhibition: sheet.exhibition,
        companyKey: company.key,
        author: p.person,
        summary: p.text,
        occurred_at: parseJalaliDate(p.text, exhibitionYear(ds, sheet.exhibition)),
      });
    }

    const area = parseAmount(row.value(col("area")));
    const subtotal = parseAmount(row.value(col("subtotal")));
    const total = parseAmount(row.value(col("total")));
    const lines = [];
    const space = invoiceLine(service, area, parseAmount(row.value(col("unitPrice"))), total, subtotal, vat);
    if (space) lines.push(space);
    const buildLine = invoiceLine(
      "booth_build",
      area,
      parseAmount(row.value(col("buildUnit"))),
      parseAmount(row.value(col("buildTotal"))),
      null,
      vat,
    );
    if (buildLine) lines.push(buildLine);
    const sponsorship = parseAmount(row.value(col("sponsorship")));
    if (sponsorship) lines.push({ service: "sponsorship", quantity: 1, unit: "lump", unit_price: Math.round(sponsorship) });

    const collected = [col("collected"), col("collected", 1)]
      .map((c) => parseAmount(row.value(c)))
      .filter((n) => n && n > 0)
      .reduce((a, b) => a + b, 0);

    const stage = lines.length ? "won" : (stageFromStatus(statusText) ?? (owner ? "contacted" : "lead"));
    const notes = [row.text(col("notes")), row.text(col("buildStatus"))].filter(Boolean).join(" · ") || null;
    upsertDeal(ds, sheet.exhibition, company, { stage, owner, note: notes });

    if (lines.length) {
      ds.invoices.push({
        key: `${sheet.sheet}|${row.rowNumber}`,
        exhibition: sheet.exhibition,
        companyKey: company.key,
        boothCode,
        hallHint,
        status: /سامانه/.test(statusText) ? "registered" : "issued",
        official: true,
        lines,
        collected,
        expectedTotal: (total ?? 0) + (parseAmount(row.value(col("buildTotal"))) ?? 0) || null,
        notes: [statusText, notes].filter(Boolean).join(" · ") || null,
      });
    }
  }
}

function readEquipmentMatrix(ds, ws, sheet) {
  const header = readHeader(ws);
  if (!header) return warn(ds, sheet.sheet, null, "No header row found");
  const companyCol = columnOf(header, "company");
  const financial = new Set(["total", "collected", "balance", "status", "notes", "subtotal"]);
  const columns = [...header.columns.values()].sort((a, b) => a.col - b.col);
  const firstMoney = columns.find((c) => c.col > companyCol && financial.has(c.role))?.col ?? Infinity;
  const itemCols = columns.filter((c) => c.col > companyCol && c.col < firstMoney && c.label);

  for (const c of itemCols) {
    const code = c.label.match(/\(\s*(\d+)\s*\)/)?.[1] ?? null;
    const name = normalizeText(c.label.replace(/\(\s*\d+\s*\)/, ""));
    c.sku = code ? `item-${code}` : `item-${slugify(name)}`;
    if (!ds.items.has(c.sku)) {
      ds.items.set(c.sku, { sku: c.sku, item_code: code, name_fa: name || c.label, category: guessCategory(name) });
    }
  }

  const totalCol = columnOf(header, "total");
  const paidCol = columnOf(header, "collected");
  for (const row of dataRows(ws, header)) {
    const company = upsertCompany(ds, row.text(companyCol));
    if (!company) continue;
    let any = false;
    for (const c of itemCols) {
      const qty = parseAmount(row.value(c.col));
      if (!qty || qty <= 0) continue;
      any = true;
      ds.orders.push({
        key: `${sheet.sheet}|${row.rowNumber}|${c.sku}`,
        exhibition: sheet.exhibition,
        companyKey: company.key,
        sku: c.sku,
        quantity: Math.round(qty),
      });
    }
    if (!any) continue;
    upsertDeal(ds, sheet.exhibition, company, { stage: "won" });
    const total = parseAmount(row.value(totalCol));
    let officialText = "";
    ws.getRow(row.rowNumber).eachCell((cell) => {
      const text = cellText(cell.value);
      if (/رسمی/.test(text)) officialText = text;
    });
    const official = !/غیر/.test(officialText);
    if (total) {
      const vat = official ? (ds.plan.vatRate ?? 0.1) : 0;
      ds.invoices.push({
        key: `${sheet.sheet}|${row.rowNumber}`,
        exhibition: sheet.exhibition,
        companyKey: company.key,
        boothCode: null,
        hallHint: null,
        status: "issued",
        official,
        vatRate: vat,
        lines: [{ service: "equipment", quantity: 1, unit: "lump", unit_price: Math.round(total / (1 + vat)) }],
        collected: parseAmount(row.value(paidCol)) ?? 0,
        expectedTotal: total,
        notes: officialText || null,
      });
    }
  }
}

function guessCategory(name) {
  if (/تلویزیون|پایه|lcd|led|ویدئو|اسپیکر|صوت/.test(name)) return "av";
  if (/یخچال|کتری|قهوه|چای|آبسرد/.test(name)) return "appliance";
  if (/کولر|پنکه|فن|اسپلیت/.test(name)) return "cooling";
  if (/چراغ|نور|پروژکتور|لامپ/.test(name)) return "lighting";
  if (/پریز|برق|سیم|کابل/.test(name)) return "electrical";
  if (/میز|صندلی|مبل|کانتر|ویترین|قفسه|استند|سطل/.test(name)) return "furniture";
  return "other";
}

function readEquipmentList(ds, ws, sheet) {
  const header = readHeader(ws);
  if (!header) return warn(ds, sheet.sheet, null, "No header row found");
  const col = (role) => columnOf(header, role);
  for (const row of dataRows(ws, header)) {
    const company = upsertCompany(ds, row.text(col("company")));
    if (!company) continue;
    const phones = extractPhones(row.value(col("contact")));
    if (row.text(col("contact"))) upsertContact(ds, company, row.text(col("contact")), phones);
    const list = row.text(col("equipmentList"));
    const parts = [
      list && `تجهیزات: ${list}`,
      row.text(col("hall")) && `سالن: ${row.text(col("hall"))}`,
      row.text(col("contract")) && `قرارداد: ${row.text(col("contract"))}`,
      row.text(col("notes")),
    ].filter(Boolean);
    upsertDeal(ds, sheet.exhibition, company, { stage: "won", note: parts.join(" · ") || null });
    const total = parseAmount(row.value(col("total")));
    if (total) {
      ds.invoices.push({
        key: `${sheet.sheet}|${row.rowNumber}`,
        exhibition: sheet.exhibition,
        companyKey: company.key,
        boothCode: row.text(col("booth")) || null,
        hallHint: row.text(col("hall")) || null,
        status: "issued",
        official: true,
        lines: [{ service: "equipment", quantity: 1, unit: "lump", unit_price: Math.round(total / (1 + (ds.plan.vatRate ?? 0.1))) }],
        collected: parseAmount(row.value(col("collected"))) ?? 0,
        expectedTotal: total,
        notes: list || null,
      });
    }
  }
}

function readCrm(ds, ws, sheet) {
  // Same columns as the invoice sheets but usually without money.
  readFinancialSheet(ds, ws, sheet, "space");
}

function readContacts(ds, ws, sheet) {
  const header = readHeader(ws);
  if (!header) return warn(ds, sheet.sheet, null, "No header row found");
  const col = (role, nth = 0) => columnOf(header, role, nth);
  for (const row of dataRows(ws, header)) {
    const company = upsertCompany(ds, row.text(col("company")));
    if (!company) continue;
    const phones = [col("phone"), col("phone", 1), col("contact")].flatMap((c) => extractPhones(row.value(c)));
    const names = normalizeText(stripPhones(row.value(col("contact"))));
    if (names || phones.length) upsertContact(ds, company, names, phones);
    if (sheet.exhibition) {
      upsertDeal(ds, sheet.exhibition, company, { stage: stageFromStatus(row.text(col("status"))) ?? "lead" });
    }
  }
}

function readGuarantees(ds, ws, sheet) {
  const header = readHeader(ws);
  if (!header) return warn(ds, sheet.sheet, null, "No header row found");
  const col = (role) => columnOf(header, role);
  for (const row of dataRows(ws, header)) {
    const raw = row.text(col("company"));
    if (!raw) continue;
    const [name, ...contactParts] = raw.split(/\s[-_–]\s|\s?_\s?/);
    const contractor = upsertCompany(ds, name, { kind: "contractor" });
    if (!contractor) continue;
    const contactName = normalizeText(contactParts.join(" "));
    if (contactName) upsertContact(ds, contractor, contactName, extractPhones(raw));
    const docs = row.text(col("documents"));
    ds.permits.push({
      key: `${sheet.sheet}|${row.rowNumber}`,
      exhibition: sheet.exhibition,
      contractorKey: contractor.key,
      booth_codes: row.text(col("booth")) ? [row.text(col("booth"))] : [],
      built_area_m2: parseAmount(row.value(col("builtArea"))),
      guarantee_amount: parseAmount(row.value(col("guarantee"))),
      guarantee_method: row.text(col("guaranteeMethod")) || null,
      permit_fee: parseAmount(row.value(col("permitFee"))),
      permit_paid: Boolean(parseAmount(row.value(col("permitPaid")))),
      equipment_paid: Boolean(parseAmount(row.value(col("equipmentPaid")))),
      documents_received: Boolean(docs) && !/ندارد|نیست|خیر/.test(docs),
      notes: docs || null,
    });
  }
}

function readGuests(ds, ws, sheet) {
  const header = readHeader(ws);
  if (!header) return warn(ds, sheet.sheet, null, "No header row found");
  const col = (role) => columnOf(header, role);
  const year = exhibitionYear(ds, sheet.exhibition);
  let lastCompany = null;
  for (const row of dataRows(ws, header)) {
    const fullName = row.text(col("contact"));
    if (!fullName) continue;
    const companyText = row.text(col("company"));
    const company = companyText ? upsertCompany(ds, companyText) : lastCompany;
    lastCompany = company;
    const arrivalText = row.text(col("arrival"));
    const departureText = row.text(col("departure"));
    ds.guests.push({
      key: `${sheet.sheet}|${row.rowNumber}`,
      exhibition: sheet.exhibition,
      companyKey: company?.key ?? null,
      full_name: fullName,
      phone: extractPhones(row.value(col("phone")))[0] ?? null,
      arrival_at: parseJalaliDate(arrivalText, year),
      departure_at: parseJalaliDate(departureText, year),
      airline: row.text(col("airline")) || null,
      hotel: row.text(col("hotel")) || null,
      notes: [arrivalText && `ورود: ${arrivalText}`, departureText && `خروج: ${departureText}`].filter(Boolean).join(" · ") || null,
    });
  }
}

const READERS = {
  hall_map: readHallMap,
  invoices: (ds, ws, sheet) => readFinancialSheet(ds, ws, sheet, "space"),
  booth_build: (ds, ws, sheet) => readFinancialSheet(ds, ws, sheet, "booth_build"),
  equipment_matrix: readEquipmentMatrix,
  equipment_list: readEquipmentList,
  crm: readCrm,
  contacts: readContacts,
  guarantees: readGuarantees,
  guests: readGuests,
};

/** Link invoices and equipment orders to booths by code within an exhibition. */
function linkBooths(ds) {
  const byExhibition = new Map();
  for (const hall of ds.halls) {
    for (const booth of hall.booths) {
      const key = `${hall.exhibition}|${booth.code}`;
      const list = byExhibition.get(key) ?? [];
      list.push({ hall, booth });
      byExhibition.set(key, list);
    }
  }
  for (const invoice of ds.invoices) {
    if (!invoice.boothCode) continue;
    const matches = byExhibition.get(`${invoice.exhibition}|${invoice.boothCode}`) ?? [];
    const pick =
      matches.length === 1
        ? matches[0]
        : matches.find((m) => invoice.hallHint && normalizeText(m.hall.name_fa).includes(normalizeText(invoice.hallHint).replace(/^سالن\s*/, "")));
    if (!pick) {
      if (matches.length > 1) warn(ds, invoice.key, null, `Booth ${invoice.boothCode} exists in several halls`);
      continue;
    }
    invoice.boothKey = `${pick.hall.key}|${pick.booth.code}`;
    if (!pick.booth.companyKey) pick.booth.companyKey = invoice.companyKey;
  }
}

/**
 * @param {import("exceljs").Workbook} workbook
 * @param {ReturnType<import("./plan.mjs").proposePlan>} plan
 */
export function buildDataset(workbook, plan) {
  const ds = createDataset(plan);
  for (const sheet of plan.sheets) {
    if (sheet.kind === "skip") continue;
    const ws = workbook.getWorksheet(sheet.sheet);
    if (!ws) {
      warn(ds, sheet.sheet, null, "Sheet listed in the plan is missing from the workbook");
      continue;
    }
    if (!sheet.exhibition && sheet.kind !== "contacts") {
      warn(ds, sheet.sheet, null, "No exhibition set in the plan; sheet skipped");
      continue;
    }
    if (sheet.exhibition && !ds.exhibitions.has(sheet.exhibition)) {
      warn(ds, sheet.sheet, null, `Exhibition ${sheet.exhibition} is not listed in plan.exhibitions; sheet skipped`);
      continue;
    }
    const reader = READERS[sheet.kind];
    if (!reader) {
      warn(ds, sheet.sheet, null, `Unknown kind ${sheet.kind}`);
      continue;
    }
    reader(ds, ws, sheet);
  }
  linkBooths(ds);
  return ds;
}

export function summarise(ds) {
  const stageCounts = {};
  for (const d of ds.deals.values()) stageCounts[d.stage] = (stageCounts[d.stage] ?? 0) + 1;
  return {
    exhibitions: ds.exhibitions.size,
    halls: ds.halls.length,
    booths: ds.halls.reduce((n, h) => n + h.booths.length, 0),
    planFeatures: ds.halls.reduce((n, h) => n + h.features.length, 0),
    companies: ds.companies.size,
    contractors: [...ds.companies.values()].filter((c) => c.kind === "contractor").length,
    contacts: ds.contacts.size,
    deals: ds.deals.size,
    dealsByStage: stageCounts,
    invoices: ds.invoices.length,
    invoicesLinkedToBooths: ds.invoices.filter((i) => i.boothKey).length,
    activities: ds.activities.length,
    inventoryItems: ds.items.size,
    equipmentOrders: ds.orders.length,
    buildPermits: ds.permits.length,
    guests: ds.guests.length,
    warnings: ds.warnings.length,
  };
}

export { cellText };
