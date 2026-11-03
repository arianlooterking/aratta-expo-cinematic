// Writes a dataset from build.mjs into the platform database. Every row has a
// stable import_key, so running the import again updates rows in place
// instead of duplicating them. Works through Supabase (service role) or a
// direct Postgres connection (local testing, self-hosted deployments).
import { companyKey } from "./normalize.mjs";

const CHUNK = 400;

/** Last row wins when two rows share a conflict key (Postgres rejects both). */
function dedupe(rows, conflict) {
  const map = new Map();
  for (const row of rows) map.set(row[conflict], row);
  return [...map.values()];
}

function chunks(rows) {
  const out = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(rows.slice(i, i + CHUNK));
  return out;
}

/** Supabase writer: upsert through PostgREST with the service role key. */
export async function supabaseWriter({ url, serviceKey }) {
  if (!url || !serviceKey) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or pass --database-url)");
  }
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, serviceKey, { auth: { persistSession: false } });
  return {
    async upsert(table, rows, conflict) {
      const result = [];
      for (const part of chunks(dedupe(rows, conflict))) {
        const { data, error } = await client
          .from(table)
          .upsert(part, { onConflict: conflict })
          .select(`id, ${conflict}`);
        if (error) throw new Error(`${table}: ${error.message}`);
        result.push(...data);
      }
      return result;
    },
    async lookup(table, column, values) {
      const result = [];
      for (const part of chunks(values)) {
        const { data, error } = await client.from(table).select(`id, ${column}`).in(column, part);
        if (error) throw new Error(`${table}: ${error.message}`);
        result.push(...data);
      }
      return result;
    },
    async close() {},
  };
}

/** Direct Postgres writer (bypasses RLS; for local or self-hosted use). */
export async function postgresWriter(connectionString) {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString });
  await client.connect();
  return {
    async upsert(table, rows, conflict) {
      const result = [];
      for (const part of chunks(dedupe(rows, conflict))) {
        const columns = [...new Set(part.flatMap((r) => Object.keys(r)))];
        const values = [];
        const tuples = part.map((row) => {
          const slots = columns.map((c) => {
            values.push(row[c] === undefined ? null : row[c]);
            return `$${values.length}`;
          });
          return `(${slots.join(", ")})`;
        });
        const updates = columns.filter((c) => c !== conflict).map((c) => `"${c}" = excluded."${c}"`);
        const sql =
          `insert into public."${table}" (${columns.map((c) => `"${c}"`).join(", ")}) values ${tuples.join(", ")} ` +
          `on conflict ("${conflict}") do ${updates.length ? `update set ${updates.join(", ")}` : "nothing"} ` +
          `returning id, "${conflict}"`;
        const { rows: returned } = await client.query(sql, values);
        result.push(...returned);
      }
      return result;
    },
    async lookup(table, column, values) {
      if (!values.length) return [];
      const { rows } = await client.query(
        `select id, "${column}" from public."${table}" where "${column}" = any($1)`,
        [values],
      );
      return rows;
    },
    async close() {
      await client.end();
    },
  };
}

// Today is in Jalali year 1405 (Mar 2026 – Mar 2027).
function currentJalaliYear(now = new Date()) {
  const gy = now.getUTCFullYear();
  const beforeNowruz = now.getUTCMonth() < 2 || (now.getUTCMonth() === 2 && now.getUTCDate() < 21);
  return gy - 621 - (beforeNowruz ? 1 : 0);
}

function byKey(rows, column) {
  return new Map(rows.map((r) => [r[column], r.id]));
}

export async function applyDataset(ds, options = {}) {
  const writer = options.databaseUrl ? await postgresWriter(options.databaseUrl) : await supabaseWriter(options);
  const plan = ds.plan;
  const currency = plan.currency ?? "IRR";
  const vatRate = plan.vatRate ?? 0.1;
  const thisYear = currentJalaliYear();
  const importedAt = new Date().toISOString();
  const counts = {};
  const note = (table, n) => {
    counts[table] = (counts[table] ?? 0) + n;
  };

  try {
    // Staff mapping: salesperson name -> staff_members.id via email in the plan.
    const emails = Object.values(plan.salespeople ?? {}).filter(Boolean).map((e) => e.toLowerCase());
    const staffRows = emails.length ? await writer.lookup("staff_members", "email", emails) : [];
    const staffByEmail = byKey(staffRows, "email");
    const staffFor = (name) => {
      const email = plan.salespeople?.[name];
      return email ? (staffByEmail.get(email.toLowerCase()) ?? null) : null;
    };

    // Exhibitions
    const exhibitionRows = [...ds.exhibitions.values()].map((e) => {
      const year = Number(e.year_label);
      return {
        slug: e.slug,
        name_fa: e.name_fa,
        name_en: e.name_en ?? null,
        year_label: e.year_label ?? null,
        status: e.status ?? (Number.isFinite(year) && year < thisYear ? "archived" : "planning"),
        currency,
        vat_rate: vatRate,
        import_key: `exhibition:${e.slug}`,
      };
    });
    const exhibitionIds = byKey(await writer.upsert("exhibitions", exhibitionRows, "slug"), "slug");
    note("exhibitions", exhibitionRows.length);
    const archived = new Set(exhibitionRows.filter((e) => e.status === "archived").map((e) => e.slug));

    // Companies and contacts
    const companyRows = [...ds.companies.values()].map((c) => ({
      name_fa: c.name_fa,
      kind: c.kind,
      sector: c.sector,
      phone: [...c.phones][0] ?? null,
      import_key: `company:${c.key}`,
    }));
    const companyIds = byKey(await writer.upsert("companies", companyRows, "import_key"), "import_key");
    const companyId = (key) => companyIds.get(`company:${key}`) ?? null;
    note("companies", companyRows.length);

    const contactRows = [...ds.contacts.values()]
      .filter((c) => companyId(c.companyKey))
      .map((c) => ({
        company_id: companyId(c.companyKey),
        full_name: c.full_name,
        phone: c.phone,
        phone_alt: c.phone_alt,
        job_title: c.job_title,
        import_key: `contact:${c.key}`,
      }));
    await writer.upsert("contacts", contactRows, "import_key");
    note("contacts", contactRows.length);

    // Deals (one per company per exhibition)
    const dealRows = [...ds.deals.values()]
      .filter((d) => exhibitionIds.get(d.exhibition) && companyId(d.companyKey))
      .map((d) => {
        const ownerId = d.owner ? staffFor(d.owner) : null;
        const notes = [...d.notes];
        if (d.owner && !ownerId) notes.unshift(`کارشناس فروش: ${d.owner}`);
        return {
          exhibition_id: exhibitionIds.get(d.exhibition),
          company_id: companyId(d.companyKey),
          stage: d.stage,
          owner_id: ownerId,
          source: "workbook",
          notes: notes.join(" · ") || null,
          import_key: `deal:${d.key}`,
        };
      });
    const dealIds = byKey(await writer.upsert("deals", dealRows, "import_key"), "import_key");
    const dealId = (exhibition, key) => dealIds.get(`deal:${exhibition}|${key}`) ?? null;
    note("deals", dealRows.length);

    // Halls, plan features, booths
    const hallRows = ds.halls
      .filter((h) => exhibitionIds.get(h.exhibition))
      .map((h, i) => ({
        exhibition_id: exhibitionIds.get(h.exhibition),
        name_fa: h.name_fa,
        width_m: Math.max(1, h.width),
        depth_m: Math.max(1, h.depth),
        sort_order: i,
        import_key: `hall:${h.key}`,
      }));
    const hallIds = byKey(await writer.upsert("halls", hallRows, "import_key"), "import_key");
    note("halls", hallRows.length);

    const featureRows = [];
    const boothRows = [];
    for (const hall of ds.halls) {
      const hallId = hallIds.get(`hall:${hall.key}`);
      if (!hallId) continue;
      hall.features.forEach((f, i) => {
        featureRows.push({
          hall_id: hallId,
          kind: f.kind,
          label_fa: f.label,
          x: f.x,
          y: f.y,
          width: f.width,
          depth: f.depth,
          import_key: `feature:${hall.key}|${i}`,
        });
      });
      for (const b of hall.booths) {
        boothRows.push({
          hall_id: hallId,
          code: b.code,
          x: b.x,
          y: b.y,
          width: b.width,
          depth: b.depth,
          area_m2: b.area,
          area_is_manual: Boolean(b.areaFromLabel),
          status: b.status,
          deal_id: b.companyKey ? dealId(hall.exhibition, b.companyKey) : null,
          import_key: `booth:${hall.key}|${b.code}`,
        });
      }
    }
    await writer.upsert("hall_features", featureRows, "import_key");
    note("hall_features", featureRows.length);
    const boothIds = byKey(await writer.upsert("booths", boothRows, "import_key"), "import_key");
    note("booths", boothRows.length);

    // Invoices, lines, payments
    const invoices = ds.invoices.filter((i) => exhibitionIds.get(i.exhibition) && companyId(i.companyKey));
    const invoiceIds = byKey(
      await writer.upsert(
        "invoices",
        invoices.map((i) => ({
          exhibition_id: exhibitionIds.get(i.exhibition),
          company_id: companyId(i.companyKey),
          deal_id: dealId(i.exhibition, i.companyKey),
          kind: "proforma",
          status: i.status,
          official: i.official,
          vat_rate: i.vatRate ?? vatRate,
          currency,
          notes: i.notes,
          import_key: `invoice:${i.key}`,
        })),
        "import_key",
      ),
      "import_key",
    );
    note("invoices", invoices.length);

    const lineRows = [];
    const paymentRows = [];
    for (const i of invoices) {
      const invoiceId = invoiceIds.get(`invoice:${i.key}`);
      i.lines.forEach((line, n) => {
        lineRows.push({
          invoice_id: invoiceId,
          service: line.service,
          quantity: line.quantity,
          unit: line.unit,
          unit_price: line.unit_price,
          discount: line.discount ?? 0,
          booth_id: i.boothKey && line.service === "space" ? (boothIds.get(`booth:${i.boothKey}`) ?? null) : null,
          sort_order: n,
          import_key: `line:${i.key}|${n}`,
        });
      });
      if (i.collected > 0) {
        paymentRows.push({
          invoice_id: invoiceId,
          company_id: companyId(i.companyKey),
          amount: Math.round(i.collected),
          currency,
          method: "other",
          notes: "مبلغ وصول شده طبق فایل اکسل (تاریخ دقیق ثبت نشده)",
          import_key: `payment:${i.key}`,
        });
      }
    }
    await writer.upsert("invoice_lines", lineRows, "import_key");
    note("invoice_lines", lineRows.length);
    await writer.upsert("payments", paymentRows, "import_key");
    note("payments", paymentRows.length);

    // Equipment catalogue and per-company orders
    const itemRows = [...ds.items.values()].map((item) => ({
      sku: item.sku,
      item_code: item.item_code,
      name_fa: item.name_fa,
      category: item.category,
    }));
    const itemIds = byKey(await writer.upsert("inventory_items", itemRows, "sku"), "sku");
    note("inventory_items", itemRows.length);

    const orderRows = ds.orders
      .filter((o) => exhibitionIds.get(o.exhibition) && itemIds.get(o.sku))
      .map((o) => {
        const done = archived.has(o.exhibition);
        return {
          exhibition_id: exhibitionIds.get(o.exhibition),
          deal_id: dealId(o.exhibition, o.companyKey),
          item_id: itemIds.get(o.sku),
          quantity: o.quantity,
          stage: done ? "collected" : "reserved",
          delivered_qty: done ? o.quantity : 0,
          collected_qty: done ? o.quantity : 0,
          import_key: `order:${o.key}`,
        };
      });
    await writer.upsert("equipment_orders", orderRows, "import_key");
    note("equipment_orders", orderRows.length);

    // CRM follow-ups
    const activityRows = ds.activities
      .filter((a) => companyId(a.companyKey))
      .map((a) => {
        const authorId = staffFor(a.author);
        return {
          company_id: companyId(a.companyKey),
          deal_id: a.exhibition ? dealId(a.exhibition, a.companyKey) : null,
          kind: "note",
          summary: authorId ? a.summary : `${a.author}: ${a.summary}`,
          // The workbook rarely records when a follow-up happened.
          occurred_at: a.occurred_at ?? importedAt,
          author_id: authorId,
          import_key: `activity:${a.key}`,
        };
      });
    await writer.upsert("activities", activityRows, "import_key");
    note("activities", activityRows.length);

    // Contractor permits / clearance guarantees, guest travel
    const permitRows = ds.permits
      .filter((p) => exhibitionIds.get(p.exhibition) && companyId(p.contractorKey))
      .map((p) => ({
        exhibition_id: exhibitionIds.get(p.exhibition),
        contractor_id: companyId(p.contractorKey),
        booth_codes: p.booth_codes,
        built_area_m2: p.built_area_m2,
        guarantee_amount: p.guarantee_amount === null ? null : Math.round(p.guarantee_amount),
        guarantee_method: p.guarantee_method,
        permit_fee: p.permit_fee === null ? null : Math.round(p.permit_fee),
        permit_paid: p.permit_paid,
        equipment_paid: p.equipment_paid,
        documents_received: p.documents_received,
        notes: p.notes,
        import_key: `permit:${p.key}`,
      }));
    await writer.upsert("build_permits", permitRows, "import_key");
    note("build_permits", permitRows.length);

    const guestRows = ds.guests
      .filter((g) => exhibitionIds.get(g.exhibition))
      .map((g) => ({
        exhibition_id: exhibitionIds.get(g.exhibition),
        company_id: g.companyKey ? companyId(g.companyKey) : null,
        full_name: g.full_name,
        phone: g.phone,
        arrival_at: g.arrival_at,
        departure_at: g.departure_at,
        airline: g.airline,
        hotel: g.hotel,
        notes: g.notes,
        import_key: `guest:${g.key}`,
      }));
    await writer.upsert("guest_travel", guestRows, "import_key");
    note("guest_travel", guestRows.length);

    return counts;
  } finally {
    await writer.close();
  }
}

export { companyKey };
