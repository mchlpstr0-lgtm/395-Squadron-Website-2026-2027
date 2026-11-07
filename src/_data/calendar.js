// Builds the squadron calendar from src/_data/events.yaml.
// Every page can use `calendar.events` (sorted, enriched) and `calendar.categories`.
import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import { TZ, zonedToUtc, addDays, formatDate, formatTimeRange, escapeHtml } from "../_lib/dates.js";

const load = (file) => yaml.load(readFileSync(new URL(file, import.meta.url), "utf8"));

const ymd = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v) : undefined);
const hm = (v) => {
  if (v === undefined || v === null || v === "") return undefined;
  // YAML may read 18:15 as a sexagesimal number (1095) – accept both forms.
  if (typeof v === "number") return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
  const m = String(v).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) throw new Error(`Bad time "${v}" in events.yaml – use 24-hour "HH:MM"`);
  return `${m[1].padStart(2, "0")}:${m[2]}`;
};
const slug = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Escape text and turn bare URLs into links.
const inline = (s) =>
  escapeHtml(s).replace(/https?:\/\/[^\s<)]+/g, (u) => `<a href="${u}" rel="noopener">${u.length > 48 ? u.slice(0, 45) + "…" : u}</a>`);

export default function () {
  const raw = load("./events.yaml") || [];
  const categories = load("./categories.yaml") || {};
  const locations = load("./locations.yaml") || {};
  const seen = new Set();

  const events = raw.map((e, i) => {
    const date = ymd(e.date);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`events.yaml entry #${i + 1} ("${e.title}") needs a date like 2026-11-03`);
    const endDate = ymd(e.endDate);
    const start = hm(e.start);
    const end = hm(e.end);
    const allDay = !start;
    const lastDay = endDate || date;

    const startUtc = allDay ? zonedToUtc(date, "00:00", TZ) : zonedToUtc(date, start, TZ);
    const endUtc = allDay
      ? zonedToUtc(addDays(lastDay, 1), "00:00", TZ)
      : end
        ? zonedToUtc(lastDay, end, TZ)
        : new Date(startUtc.getTime() + 60 * 60 * 1000);

    let location;
    if (e.location) {
      const known = locations[e.location];
      location = known ? { key: e.location, ...known } : { name: String(e.location) };
      const q = location.address ? `${location.name}, ${location.address}` : `${location.name}, Edmonton, AB`;
      location.mapsUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
    }

    const cat = categories[e.category] || categories.other || { label: "Other", color: "#5b6b8c" };

    let id = `${date}-${slug(e.title)}`;
    while (seen.has(id)) id += "-2";
    seen.add(id);

    let whenLabel;
    if (endDate && endDate !== date) {
      whenLabel = allDay
        ? `${formatDate(date, "weekdayShort")} – ${formatDate(endDate, "weekdayShort")}`
        : `${formatDate(date, "weekdayShort")}, ${formatTimeRange({ start })} – ${formatDate(endDate, "weekdayShort")}${end ? ", " + formatTimeRange({ start: end }) : ""}`;
    } else {
      whenLabel = formatTimeRange({ start, end });
    }

    const notes = [].concat(e.notes || []).map(String);
    const lines = [
      e.who && `<strong>Who:</strong> ${inline(e.who)}`,
      e.dress && `<strong>Dress:</strong> ${inline(e.dress)}`,
      e.bring && `<strong>Bring:</strong> ${inline(e.bring)}`,
      ...notes.map(inline),
      e.link && `<a href="${escapeHtml(e.link.url)}" rel="noopener">${escapeHtml(e.link.text || e.link.url)}</a>`,
    ].filter(Boolean);

    return {
      id,
      title: String(e.title),
      date,
      endDate: endDate && endDate !== date ? endDate : undefined,
      start,
      end,
      allDay,
      startUtc: startUtc.toISOString(),
      endUtc: endUtc.toISOString(),
      dateLabel: endDate && endDate !== date
        ? `${formatDate(date, "weekdayShort")} – ${formatDate(endDate, "weekdayShort")}, ${formatDate(endDate, "long").slice(-4)}`
        : formatDate(date, "weekdayLong"),
      whenLabel,
      location,
      category: e.category || "other",
      categoryLabel: cat.label,
      categoryColor: cat.color,
      who: e.who,
      dress: e.dress,
      bring: e.bring,
      notes,
      link: e.link,
      cancelled: Boolean(e.cancelled),
      lines,
      updated: ymd(e.updated),
    };
  });

  events.sort((a, b) => a.startUtc.localeCompare(b.startUtc) || a.title.localeCompare(b.title));

  // Only list categories that are actually used (plus their colours) for filters.
  const used = [...new Set(events.map((e) => e.category))];
  const categoryList = Object.entries(categories)
    .filter(([key]) => used.includes(key))
    .map(([key, v]) => ({ key, ...v }));

  return { timeZone: TZ, events, categories: categoryList, locations };
}
