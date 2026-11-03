// Generic reader for the list-style sheets (CRM, invoices, equipment, travel).
// Each sheet has one or two header rows; columns are recognised by keywords.
import { cellText, cellValue, normalizeText } from "./normalize.mjs";

export const ROLE_PATTERNS = [
  ["company", /^(?:اسم|نام)?\s*شرکت(?:\s*ها)?$|^اسم شرکت|^نام شرکت|^اسامی شرکت/],
  ["contact", /رابط|مدیر مربوطه|نام و نام خانوادگی|اسامی اشخاص|اسم رابط/],
  ["phone", /تلفن|شماره تماس|^شماره/],
  ["sector", /حوزه|حوضه/],
  ["invoiceStatus", /وضعیت فاکتور/],
  ["buildStatus", /وضعیت غرفه سازی/],
  ["status", /^وضعیت$/],
  ["builtArea", /متراژ غرفه سازی/],
  ["area", /متراژ/],
  ["buildUnit", /واحد غرفه سازی/],
  ["buildTotal", /فاکتور غرفه سازی/],
  ["unitPrice", /^واحد$|مبلغ واحد|^فی$|فی واحد/],
  ["subtotal", /قبل از ارزش|بدون مالیات|بدون ارزش افزوده/],
  ["guarantee", /مبلغ ضمانت/],
  ["guaranteeMethod", /نحوه ضمانت/],
  ["permitFee", /مبلغ مجوز/],
  ["permitPaid", /واریزی مجوز/],
  ["equipmentPaid", /واریزی تجهیزات/],
  ["documents", /مدارک|بیمه/],
  ["total", /مبلغ فاکتور|با مالیات|مبلغ کل|^جمع|^مبلغ$/],
  ["collected", /وصول|پرداختی|واریز/],
  ["balance", /مانده/],
  ["sponsorship", /اسپانسر/],
  ["arrival", /ورود/],
  ["departure", /خروج/],
  ["airline", /ایرلاین|هواپیمایی/],
  ["hotel", /هتل/],
  ["equipmentList", /لیست تجهیزات/],
  ["contract", /قرارداد/],
  ["hall", /^سالن$/],
  ["booth", /^غرفه(?: ها)?$/],
  ["notes", /توضیحات/],
  ["row", /^ردیف$/],
  ["date", /^تاریخ$/],
  ["finance", /^مالی$/],
];

export function roleFor(label) {
  const text = normalizeText(label);
  if (!text) return null;
  for (const [role, re] of ROLE_PATTERNS) if (re.test(text)) return role;
  return null;
}

const NOT_PEOPLE = /^(ایمیل|فاکتور|آدرس|سایت|وبسایت|توضیحات|مالی|جمع|کل|تعداد|وضعیت|نتیجه|پیگیری|مبلغ|سالن|غرفه)$/;

/** Persian single-word labels that are not field names: salesperson columns. */
export function looksLikePersonName(label) {
  const text = normalizeText(label);
  return Boolean(text) && !roleFor(text) && !NOT_PEOPLE.test(text) &&/^[؀-ۿ]{2,12}$/.test(text);
}

function rowCells(ws, rowNumber) {
  const cells = new Map();
  ws.getRow(rowNumber).eachCell({ includeEmpty: false }, (cell, col) => {
    const text = cellText(cell.value);
    if (text) cells.set(col, text);
  });
  return cells;
}

/**
 * Finds the header row (the one naming the company column) in the first rows
 * and describes every column: its role, its own label and the label above it.
 */
export function readHeader(ws, scanRows = 8) {
  let best = null;
  for (let r = 1; r <= Math.min(scanRows, ws.rowCount); r++) {
    const cells = rowCells(ws, r);
    let score = 0;
    let hasCompany = false;
    for (const text of cells.values()) {
      const role = roleFor(text);
      if (role) score += 1;
      if (role === "company") hasCompany = true;
    }
    if (hasCompany && (!best || score > best.score)) best = { row: r, score, cells };
  }
  if (!best) return null;

  // Two-row headers sometimes name the company on the top row and the real
  // field names on the row below ("اسم شرکت / مالی" over "متراژ / واحد").
  const below = rowCells(ws, best.row + 1);
  const roleHits = (cells) => [...cells.values()].filter((t) => roleFor(t) && roleFor(t) !== "company").length;
  if (roleHits(below) > roleHits(best.cells) && roleHits(below) >= 3) {
    const merged = new Map(below);
    for (const [col, text] of best.cells) if (roleFor(text) === "company") merged.set(col, text);
    best = { row: best.row + 1, score: roleHits(below), cells: merged };
  }

  const above = best.row > 1 ? rowCells(ws, best.row - 1) : new Map();
  const columns = new Map();
  const maxCol = Math.max(...best.cells.keys(), ...above.keys(), 0);
  for (let col = 1; col <= maxCol; col++) {
    const label = best.cells.get(col) ?? "";
    const upper = above.get(col) ?? "";
    let role = roleFor(label);
    let person = null;
    if ((!role || role === "date") && looksLikePersonName(upper)) {
      role = "person";
      person = upper;
    } else if (!role && looksLikePersonName(label)) {
      role = "person";
      person = label;
    } else if (!role && roleFor(upper)) {
      role = roleFor(upper);
    } else if (!role && /\(\s*\d+\s*\)/.test(label)) {
      role = "item";
    }
    if (role === "date" && roleFor(upper)) role = roleFor(upper);
    if (!label && !upper) continue;
    columns.set(col, { col, role, label, upper, person });
  }
  return { row: best.row, columns };
}

/** First column with a role, optionally the n-th occurrence. */
export function columnOf(header, role, nth = 0) {
  const matches = [...header.columns.values()].filter((c) => c.role === role);
  return matches[nth]?.col ?? null;
}

/** Data rows below the header, as { rowNumber, get(col), text(col) }. */
export function* dataRows(ws, header) {
  for (let r = header.row + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!row.hasValues) continue;
    yield {
      rowNumber: r,
      value: (col) => (col ? cellValue(row.getCell(col).value) : null),
      text: (col) => (col ? cellText(row.getCell(col).value) : ""),
    };
  }
}
