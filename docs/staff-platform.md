# Aratta staff platform: foundation

This is the shared backend for the staff portal: one live database for
exhibitions, hall plans, booths, the sales pipeline, invoices and payments,
equipment hand-over, contractor permits, guest travel and team tasks.

| Piece | Where |
| --- | --- |
| Database schema, permissions, live updates, storage | `supabase/migrations/*.sql` |
| Permission and workflow tests (plain Postgres) | `supabase/tests/`, `npm run test:db` |
| Sign-in (Google, Apple) | `/[lang]/staff/sign-in`, `/auth/callback`, `src/proxy.ts` |
| Team and access management | `/[lang]/staff/team` |
| Typed client, session, live hooks | `src/lib/supabase/*`, `src/lib/platform/*` |
| Workbook importer | `scripts/workbook/`, `npm run import:workbook` |

Without Supabase settings the portal keeps working as the existing local,
browser-only demo. Once the two public variables are set, every staff page
requires an invited, active account.

## What the database holds

- **Exhibitions → halls → booths and plan features.** Geometry is in metres.
  Booth area follows the drawing unless a contract area is typed in
  (`area_is_manual`). Assigning a deal reserves the booth automatically.
- **Companies, contacts and deals.** One deal per company per exhibition, with
  stages `lead → contacted → qualified → proposal → negotiation → won/lost`.
  Logging a call or meeting updates "last contact" and the next follow-up, and
  every stage change is written to the history.
- **Invoices, lines and payments.** Lines are per service (space, booth build,
  flooring, partition, equipment, sponsorship) with discounts. VAT is per
  invoice. `invoice_totals` and `deal_balances` give the total, paid and
  balance. Status `registered` means the invoice was submitted to the tax
  system (ارسال سامانه). Payments are voided, not deleted.
- **Inventory and equipment orders.** Each order moves through
  requested → reserved → prepared → delivered → collected (or issue).
  `inventory_allocation` shows what is promised and what is still out at booths.
  Sales can record a company's furniture on its deal before it has a booth
  (`booth_id` empty); when the company gets a booth the lines move onto it,
  and if the booth goes to someone else, lines that never went out go back to
  the company. `deals.furniture_confirmed_at` marks the list as agreed.
- **Booth work steps.** `booths.steps` holds the steps ticked on the floor
  (`build`, `power`, `handover`, `clearance`) with who and when. Together with
  the furniture list, delivery and collection (worked out from the equipment
  lines) they make the booth's progress, shown on the map's "Work" layer.
- **Problems.** One tap on any step, furniture line or company raises a row in
  `problems` (step, optional note, optional assignee). The booth is red on
  every map layer until someone marks it resolved. Booth managers, the deal's
  salesperson and the assignee are notified; whoever raised it hears when it
  is fixed.
- **Build permits** for booth-builders with their clearance guarantee,
  insurance and documents. **Guest travel** covers flights and hotels.
- **Tasks with comments.** Assigning a task, changing its status or commenting
  notifies the right colleague (`notifications`, live in the app).
- **Audit log.** Every insert, update and delete records who changed what.

## Roles

| Role | Can |
| --- | --- |
| owner | everything, including other owners |
| admin | invite, change and remove staff |
| manager | create exhibitions, delete records, read the audit log |
| member | daily work: CRM, map, equipment, tasks. Members in **sales** or **finance** can also issue invoices and record payments |
| viewer | read only |

People can't change their own role, only owners can touch owner accounts, and
the last active owner can't be removed.

## Setting it up

1. **Create the Supabase project** and apply the migrations in order. With the
   Supabase CLI: `supabase link` then `supabase db push`. You can also paste
   each file into the SQL editor.
2. **Add the first owner.** In the SQL editor:
   `insert into public.staff_members (email, role, departments) values ('you@example.com', 'owner', '{executive}');`
   After that, owners and admins invite everyone else from **Team and access**.
3. **Turn on Google sign-in.** In Google Cloud, create an OAuth client of type
   "Web application", add `https://<project>.supabase.co/auth/v1/callback` as an
   authorised redirect URI, then paste the client ID and secret into Supabase
   → Authentication → Providers → Google.
4. **Turn on Apple sign-in.** In Apple Developer, create a Services ID with
   Sign in with Apple, use the same Supabase callback URL, create a key, and
   enter the Services ID, Team ID, Key ID and key in Supabase → Providers →
   Apple. Staff should choose "Share My Email" so the address matches their
   invite. Otherwise invite the private relay address instead.
5. **URL configuration.** In Supabase → Authentication → URL Configuration, set
   the Site URL to the production domain and add
   `https://<domain>/auth/callback` (plus `http://localhost:3000/auth/callback`
   for development) to the redirect allow-list.
6. **Environment variables.** Set `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel (see `.env.example`).

## Importing the Excel workbook

The importer reads Aratta's "CRM of Exhibitions" workbook: hall drawings
(merged cells become booths, fill colours become sales status), proforma
invoices, booth-build and flooring sales, equipment rental sheets, CRM
follow-up columns per salesperson, clearance guarantees, flight lists and
contact lists.

```bash
# 1. Guess what every sheet is. Review imports/plan.json by hand.
npm run import:workbook -- plan "CRM of Exhibitions.xlsx"

# 2. See exactly what would be imported, with warnings.
npm run import:workbook -- preview "CRM of Exhibitions.xlsx" --plan imports/plan.json

# 3. Write it. Safe to repeat: every row has an import key and updates in place.
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
  npm run import:workbook -- apply "CRM of Exhibitions.xlsx" --plan imports/plan.json
```

Before applying, set these in the plan:

- `exhibitions[]`: fix slugs and names, and give sheets marked `-unknown` a year.
- `sheets[].exhibition`: assign sheets the importer couldn't place (the flight
  list, guarantees and the general CRM). Set `kind` to `skip` to leave a sheet out.
- `salespeople`: map each name to that person's staff email so deals and
  follow-ups get the right owner. Unmapped names are kept in the notes.
- `currency` (default `IRR`) and `vatRate` (default `0.1`).

The workbook contains personal phone numbers. `imports/` and `*.xlsx` are
git-ignored. Keep both off shared drives and out of the repository.

## Tests

```bash
npm test                                            # unit tests incl. importer and live merge
PGHOST=… PGPORT=… PGUSER=postgres npm run test:db   # migrations + permission tests on local Postgres
```

## If Supabase cloud is unreachable from Iran

The schema is standard Postgres, and Supabase is open source. If reaching the
hosted service from Iran becomes a problem, the same stack can run self-hosted
(Docker) on an Iranian provider. The importer also writes straight to Postgres
with `--database-url`.
