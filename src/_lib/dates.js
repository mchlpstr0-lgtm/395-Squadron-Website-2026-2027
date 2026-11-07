// Small, dependency-free date helpers shared by the build and the data files.
// Dates written as "YYYY-MM-DD" are treated as calendar dates (no time-zone shift).

export const TZ = "America/Edmonton";

const FORMATS = {
  long: { year: "numeric", month: "long", day: "numeric" }, // November 3, 2026
  monthYear: { year: "numeric", month: "long" }, // November 2026
  weekdayLong: { weekday: "long", year: "numeric", month: "long", day: "numeric" },
  weekdayShort: { weekday: "short", month: "short", day: "numeric" }, // Tue, Nov 3
  short: { month: "short", day: "numeric" }, // Nov 3
  dow: { weekday: "short" },
  day: { day: "numeric" },
  mon: { month: "short" },
  month: { month: "long" },
};

export function toDate(value) {
  if (value instanceof Date) return value;
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + "T00:00:00Z");
  return new Date(s);
}

export function formatDate(value, fmt = "long") {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const opts = FORMATS[fmt] || FORMATS.long;
  return new Intl.DateTimeFormat("en-CA", { ...opts, timeZone: "UTC" }).format(d).replace(/\./g, "");
}

// "18:15" -> "6:15 pm"
export function formatTime(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
}

export function formatTimeRange(ev) {
  if (!ev.start) return "All day";
  if (!ev.end) return formatTime(ev.start);
  const a = formatTime(ev.start);
  const b = formatTime(ev.end);
  // "6:15 pm – 9:15 pm" -> "6:15 – 9:15 pm" when both share am/pm
  if (a.slice(-2) === b.slice(-2)) return `${a.slice(0, -3)} – ${b}`;
  return `${a} – ${b}`;
}

// Offset (minutes) of a time zone from UTC at a given instant.
function tzOffsetMinutes(utcMs, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (asUtc - utcMs) / 60000;
}

// Local wall-clock time in `timeZone` -> UTC Date (handles daylight saving).
export function zonedToUtc(dateStr, timeStr = "00:00", timeZone = TZ) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let utc = guess - tzOffsetMinutes(guess, timeZone) * 60000;
  utc = guess - tzOffsetMinutes(utc, timeZone) * 60000; // second pass for DST edges
  return new Date(utc);
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
