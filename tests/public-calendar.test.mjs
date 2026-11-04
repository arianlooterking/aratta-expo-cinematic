import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calendarStatus,
  dateRange,
  daysToOpen,
  fromWebsiteRows,
  googleCalendarHref,
  interestMailto,
  mergeCalendar,
  toCards,
  toIcs,
} from "../src/lib/public-calendar.ts";
import { getExhibitionSeries } from "../src/data/exhibition-series.ts";
import { boothRequestDraft, equipmentRequestDraft, validateContact } from "../src/lib/public-requests.ts";

const now = new Date("2026-11-03T10:00:00Z");
const row = (over = {}) => ({
  id: "1",
  slug: "kimex-10",
  name_fa: "دهمین نمایشگاه معدن",
  name_en: "10th Kerman Mining Exhibition",
  edition: 10,
  year_label: null,
  venue_fa: "محل دائمی",
  venue_en: "Kerman Fairground",
  city_fa: "کرمان",
  city_en: "Kerman",
  starts_on: "2027-05-10",
  ends_on: "2027-05-13",
  status: "selling",
  color: "#c8a25a",
  registration_open: true,
  website_summary_fa: null,
  website_summary_en: "Mining and machinery.",
  ...over,
});

test("series never carry invented dates and the postponed one says so", () => {
  for (const lang of ["fa", "en"]) {
    const series = getExhibitionSeries(lang);
    assert.equal(series.length, 3);
    for (const s of series) {
      assert.equal(s.startsOn, null);
      assert.ok(s.lastEdition);
      assert.ok(s.sourceHref?.startsWith(`/${lang}/`));
    }
    const kimex = series.find((s) => s.key === "kimex");
    assert.equal(calendarStatus(kimex, now), "postponed");
    assert.ok(kimex.notice);
    assert.equal(calendarStatus(series[1], now), "dates-tba");
  }
});

test("calendar status follows the dates and the inquiry switch", () => {
  const base = { startsOn: "2027-05-10", endsOn: "2027-05-13", registrationOpen: false };
  assert.equal(calendarStatus(base, now), "scheduled");
  assert.equal(calendarStatus({ ...base, registrationOpen: true }, now), "registration-open");
  assert.equal(calendarStatus(base, new Date("2027-05-11T08:00:00Z")), "live");
  assert.equal(calendarStatus(base, new Date("2027-05-14T08:00:00Z")), "past");
  assert.equal(daysToOpen("2026-11-10", now), 7);
});

test("website rows become calendar entries; past and archived ones are dropped", () => {
  const rows = [row(), row({ slug: "old", starts_on: "2026-01-01", ends_on: "2026-01-04" }), row({ slug: "arch", status: "archived" }), row({ slug: null })];
  const en = fromWebsiteRows(rows, "en", now);
  assert.deepEqual(en.map((e) => e.key), ["kimex-10"]);
  assert.equal(en[0].name, "10th Kerman Mining Exhibition");
  assert.equal(en[0].summary, "Mining and machinery.");
  const fa = fromWebsiteRows(rows, "fa", now);
  assert.equal(fa[0].name, "دهمین نمایشگاه معدن");
  assert.equal(fa[0].city, "کرمان");
});

test("merged calendar puts dated live listings first, then the series", () => {
  const live = fromWebsiteRows([row({ slug: "b", starts_on: "2027-06-01", ends_on: "2027-06-02" }), row({ slug: "a" })], "en", now);
  const merged = mergeCalendar(live, getExhibitionSeries("en"));
  assert.deepEqual(merged.slice(0, 2).map((e) => e.key), ["a", "b"]);
  assert.equal(merged.length, 5);
});

test("calendar files and links are valid all-day events", () => {
  const [e] = fromWebsiteRows([row()], "en", now);
  const ics = toIcs(e, "https://example.test/en/exhibitions", now);
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /DTSTART;VALUE=DATE:20270510/);
  assert.match(ics, /DTEND;VALUE=DATE:20270514/);
  assert.match(ics, /\r\n/);
  assert.match(googleCalendarHref(e), /dates=20270510%2F20270514/);
  assert.equal(toIcs(getExhibitionSeries("en")[0], "x"), null);
});

test("interest emails go to the office and depend on the status", () => {
  const [open] = fromWebsiteRows([row()], "en", now);
  assert.match(interestMailto("en", open, now), /^mailto:info@arattaexpo\.ir\?subject=Booth%20inquiry/);
  const tba = getExhibitionSeries("fa")[1];
  assert.match(decodeURIComponent(interestMailto("fa", tba, now)), /اطلاع از زمان برگزاری/);
});

test("date ranges read naturally in both languages", () => {
  assert.equal(dateRange("en", "2027-05-10", "2027-05-13"), "10–13 May 2027");
  assert.match(dateRange("fa", "2027-05-10", "2027-05-13"), /اردیبهشت ۱۴۰۶/);
});

test("cards hide past entries and carry everything the page needs", () => {
  const items = mergeCalendar(fromWebsiteRows([row()], "en", now), getExhibitionSeries("en"));
  const cards = toCards(items, "en", "https://example.test/en/exhibitions", now);
  assert.equal(cards[0].status, "registration-open");
  assert.equal(cards[0].daysToOpen, 188);
  assert.ok(cards[0].icsHref.startsWith("data:text/calendar"));
  assert.equal(cards[1].icsHref, null);
});

test("booth and equipment drafts are honest email drafts", () => {
  const contact = { name: "Sara Ahmadi", company: "Pars Mining", email: "sara@pars.test", phone: "09120000000" };
  assert.deepEqual(validateContact(contact), []);
  assert.deepEqual(validateContact({ ...contact, email: "nope", phone: "12" }), ["email", "phone"]);
  const booth = boothRequestDraft("en", { ...contact, exhibition: "KIMEX", sector: "Machinery", boothType: "shell", area: 24, position: "corner", extras: ["furniture", "power"], notes: "" });
  assert.match(booth.mailto, /^mailto:info@arattaexpo\.ir\?subject=Booth%20request/);
  assert.match(booth.body, /Shell scheme/);
  assert.match(booth.body, /24 m²/);
  assert.match(booth.body, /not a confirmed booth allocation/);
  const fa = boothRequestDraft("fa", { ...contact, exhibition: "KIMEX", sector: "", boothType: "space", area: 18, position: "any", extras: [], notes: "" });
  assert.match(fa.body, /۱۸ متر مربع/);
  const eq = equipmentRequestDraft("en", { ...contact, exhibition: "KIMEX", booth: "A12", deliveryDay: "", notes: "", lines: [{ id: "tv-55", label: "55-inch TV", qty: 2 }, { id: "x", label: "Chair", qty: 0 }] });
  assert.equal(eq.pieces, 2);
  assert.match(eq.body, /- 55-inch TV: 2/);
  assert.doesNotMatch(eq.body, /Chair/);
});
