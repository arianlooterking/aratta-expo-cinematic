-- Upcoming exhibitions on the public website.
--
-- Managers decide per exhibition whether it appears on the website and whether
-- booth inquiries are open. The website reads one narrow view with the
-- publishable (anon) key: only listed, not archived exhibitions, and only the
-- columns below. Prices, notes, booths and everything else stay staff-only.

alter table public.exhibitions
  add column website_listed boolean not null default false,
  add column registration_open boolean not null default false,
  add column website_summary_fa text,
  add column website_summary_en text;

-- Owned by the migration role, so it reads exhibitions without the staff RLS
-- policies. That is the point: it is the single public window, and it only
-- exposes what a manager chose to publish.
create view public.website_exhibitions as
  select
    id, slug, name_fa, name_en, edition, year_label,
    venue_fa, venue_en, city_fa, city_en,
    starts_on, ends_on, status, color, registration_open,
    website_summary_fa, website_summary_en, updated_at
  from public.exhibitions
  where website_listed and status <> 'archived';

comment on view public.website_exhibitions is
  'Public calendar: exhibitions a manager listed on the website. Read with the anon key.';

revoke all on public.website_exhibitions from public;
grant select on public.website_exhibitions to anon, authenticated;
