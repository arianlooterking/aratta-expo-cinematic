# Aratta staff platform: foundation

This is the shared backend for the staff portal: one live database for
exhibitions, hall plans, booths, the sales pipeline, invoices and payments,
equipment hand-over, contractor permits, guest travel and team tasks.

| Piece | Where |
| --- | --- |
| Database schema, permissions, live updates, storage | `supabase/migrations/*.sql` |
| Permission and workflow tests (plain Postgres) | `supabase/tests/`, `npm run test:db` |
| Sign-in (email and password; Google and Apple optional) | `/[lang]/staff/sign-in`, `/[lang]/staff/password`, `/auth/callback`, `src/proxy.ts` |
| Team and staff: people, profiles, teams, roles, history | `/[lang]/staff/team`, `/[lang]/staff/team/[id]` |
| Exhibition settings (dates, venue, rates, VAT, status) | `/[lang]/staff/settings` |
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
- **Teams.** Named groups of staff (sales, finance, a hall's handover crew),
  permanent or for one exhibition, with a lead who is always listed first.
  Managers create and edit any team; a member who leads a team can change who
  is on it but not hand it over. Removing someone takes them off every team.
- **Staff profiles** carry job title, phone, departments, start date, an
  "about" note and skills. Anyone edits their own details through
  `update_my_profile`; admins edit everyone else's. A colleague's sign-in email
  is locked once they have signed in.
- **Audit log.** Every insert, update and delete records who changed what.
  Managers read it on the Team → History tab, on each profile and in settings.

## Signing in

Staff sign in with their email and a password. Nothing is emailed, so this
needs no email service and no Google or Apple setup.

- An owner or admin adds a colleague in **Team and staff → Invite colleague**.
  The form includes a **starting password** (generated, editable). After
  saving, the portal shows the sign-in link, the email and the password with
  one button to copy all three; the admin passes them on by any channel.
- The colleague signs in and is taken straight to **Choose your own
  password**. The portal stays closed until they do, so the starting password
  is only ever used once.
- Anyone changes their password later from the account menu → **Change
  password**. A forgotten password is replaced by an owner or admin from the
  colleague's page → **New password** (same rules as changing access: not for
  yourself, and only an owner for another owner).
- In the database this is `staff_set_password` (admins), `password_change_pending`
  (the first-sign-in step) and `staff_account_set_password` (not callable
  through the API; used for the first owner), all in
  `supabase/migrations/20261112120000_password_sign_in.sql`.

Google and Apple buttons appear on the sign-in screen only when
`NEXT_PUBLIC_SIGN_IN_PROVIDERS` lists them (`google`, `apple` or both), after
the provider is set up in Supabase (steps 3 and 4 below). An account that
first used Google can be given a password later and keeps both.

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
2. **Add the first owner.** In the SQL editor, with your own email and a
   starting password of at least 8 characters:
   `insert into public.staff_members (email, role, departments) values ('you@example.com', 'owner', '{executive}');`
   `select public.staff_account_set_password('you@example.com', 'a-starting-password');`
   Sign in with those and choose your own password. After that, owners and
   admins add everyone else from **Team and staff** (see "Signing in" above).
3. **Optional: turn on Google sign-in.** In Google Cloud, create an OAuth client of type
   "Web application", add `https://<project>.supabase.co/auth/v1/callback` as an
   authorised redirect URI, then paste the client ID and secret into Supabase
   → Authentication → Providers → Google.
4. **Optional: turn on Apple sign-in.** In Apple Developer, create a Services ID with
   Sign in with Apple, use the same Supabase callback URL, create a key, and
   enter the Services ID, Team ID, Key ID and key in Supabase → Providers →
   Apple. Staff should choose "Share My Email" so the address matches their
   invite. Otherwise invite the private relay address instead. Then set
   `NEXT_PUBLIC_SIGN_IN_PROVIDERS` (for example `google,apple`) so the buttons
   show.
5. **URL configuration** (only needed for Google and Apple). In Supabase → Authentication → URL Configuration, set
   the Site URL to the production domain and add
   `https://<domain>/auth/callback` (plus `http://localhost:3000/auth/callback`
   for development) to the redirect allow-list. For the iOS / Android apps also
   add `ir.arattaexpo.staff://auth/callback` (see `docs/mobile-apps.md`).
6. **Environment variables.** Set `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel (see `.env.example`).
   Add `ANTHROPIC_API_KEY` to let the new-exhibition form read halls out of an
   uploaded venue map.

## New exhibitions: Persian dates, venue map and halls

Every date field in the portal uses the Persian (shamsi) calendar picker in
`src/components/portal/DatePicker.tsx`; a toggle inside it switches to
Gregorian. Values are still stored as Gregorian `yyyy-mm-dd`, so nothing in
the database or reports changes. The conversion lives in `src/lib/jalali.ts`
and is tested day by day against the platform's own Persian calendar.

The new-exhibition form takes an optional venue map (photo, sketch, scan or
PDF, up to 10 MB). It is saved to the private `hall-plans` bucket under
`<exhibition id>/venue/` and linked in `exhibitions.venue_plan_path`. When
`ANTHROPIC_API_KEY` is set, `/api/staff/venue-halls` sends the file to Claude
and returns the halls it finds (names, sizes when the drawing gives them,
where each hall sits on the page, a rough booth count). Nothing is saved until
staff press Create: they can rename, resize, add or remove halls first. For
image maps, each hall's part of the image is cut out and set as that hall's
tracing background. Sizes the drawing doesn't give default to 60 × 36 m (or
follow the outline's shape when one side is known) and can be changed later
in hall settings.

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

## Upcoming exhibitions on the website

The landing page and the exhibitions page show an "upcoming" calendar.

- In the portal, **Upcoming work** (`/fa/staff/upcoming`) lists every
  exhibition with two switches for managers: **Show on website** and
  **Booth inquiries open**, plus an optional one-line intro per language.
- The website reads only the `website_exhibitions` view
  (`supabase/migrations/20261103090800_website_calendar.sql`) with the
  publishable key. It exposes listed, non-archived exhibitions and only their
  names, venue, city, dates, colour and the two switches. Prices, notes,
  booths and companies never leave the staff side.
- Pages refresh the calendar every ten minutes. Without Supabase settings, or
  if the request fails, the site shows Aratta's recurring series
  (`src/data/exhibition-series.ts`) as "dates to be announced", never with
  a made-up date.
- Every button on the public calendar, booth request and equipment request
  only prepares an email draft or a calendar file. Nothing is booked or paid
  through the website.

The same page gives staff one agenda across all exhibitions: milestones
(build-up, opening, last day, hall cleared), tasks, deal follow-ups,
equipment deliveries and pickups (merged per exhibition and day) and unpaid
invoices due (finance roles only). Overdue work is pinned on top, and the
"Add to my calendar" button exports the visible agenda as an `.ics` file.

## Team chat

`/fa/staff/chat` is a Slack-style chat inside the portal and the phone apps (the
apps load the same pages, so nothing extra is needed there).

- Channels everyone can read (#گفتگوی عمومی, #فروش, #اجرا و سالن, #هشدارها are
  made by the migration and every active colleague joins them), private channels
  for the people added, and direct messages between two colleagues. Managers
  cannot read other people's direct messages.
- @mentions, photos and files (stored in the private `documents` bucket under
  `chat/`), reply-to, edit and remove your own message (managers can remove any),
  mute a conversation, unread and @ badges on the menu and tab bar.
- Unread counts live on `chat_members`, so each device only listens to its own
  rows. Direct messages and @mentions create a `notifications` row, which the push
  function sends to phones.
- Booth problems (the red flag) post into #هشدارها automatically when the
  `problems` table exists.

### AI agents in the chat

Agents (Grok, ChatGPT, Claude…) can post into and read the open channels. They
never see direct messages or private channels.

1. Vercel env `SUPABASE_SERVICE_ROLE_KEY` (server only, never `NEXT_PUBLIC_`).
2. Vercel env `CHAT_AGENT_TOKENS`, one `Name=token` per agent, comma separated,
   each token at least 24 random characters, e.g.
   `Grok=…,ChatGPT=…`. The name is what the team sees on the message.
3. The agent calls:

```bash
# post (channel defaults to "alerts"; link must start with /staff/)
curl -X POST https://<site>/api/chat/agent \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"channel":"operations","text":"سه غرفه هنوز برق ندارند","link":"/staff/map"}'
# read the last 30 messages of a channel
curl "https://<site>/api/chat/agent?channel=general&limit=30" -H "Authorization: Bearer <token>"
```

Database-side, `chat_post_as_bot(channel, bot, text, …)` does the same and is only
callable by the service role and by triggers.

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
