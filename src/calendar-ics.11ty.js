// Generates /calendar.ics – an iCalendar feed people can subscribe to from
// Google Calendar, Apple Calendar or Outlook. It updates whenever the site does.
const esc = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
const stamp = (iso) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const dateOnly = (ymd) => ymd.replace(/-/g, "");
const nextDay = (ymd) => {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
};
// RFC 5545: lines longer than 75 octets are folded.
const fold = (line) => {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts = [];
  let cur = "";
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch, "utf8") > (parts.length ? 74 : 75)) {
      parts.push(cur);
      cur = "";
    }
    cur += ch;
  }
  parts.push(cur);
  return parts.join("\r\n ");
};

export default class {
  data() {
    return { permalink: "/calendar.ics", eleventyExcludeFromCollections: true };
  }
  render({ calendar, site, build }) {
    const host = new URL(site.url).hostname;
    const now = stamp(build.time);
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//395 Squadron RCAC//Squadron Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${esc(site.shortName + " Air Cadets")}`,
      `X-WR-CALDESC:${esc("Training and activity schedule for " + site.name)}`,
      `X-WR-TIMEZONE:${calendar.timeZone}`,
      "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
      "X-PUBLISHED-TTL:PT6H",
    ];
    for (const e of calendar.events) {
      const desc = [
        e.who && `Who: ${e.who}`,
        e.dress && `Dress: ${e.dress}`,
        e.bring && `Bring: ${e.bring}`,
        ...e.notes,
        e.link && `${e.link.text || "Link"}: ${e.link.url}`,
        `Details: ${new URL("/calendar/#" + e.id, site.url).href}`,
      ].filter(Boolean).join("\n");
      lines.push("BEGIN:VEVENT", `UID:${e.id}@${host}`, `DTSTAMP:${now}`);
      if (e.allDay) {
        lines.push(`DTSTART;VALUE=DATE:${dateOnly(e.date)}`, `DTEND;VALUE=DATE:${nextDay(e.endDate || e.date)}`);
      } else {
        lines.push(`DTSTART:${stamp(e.startUtc)}`, `DTEND:${stamp(e.endUtc)}`);
      }
      lines.push(`SUMMARY:${esc((e.cancelled ? "CANCELLED: " : "") + e.title)}`);
      if (e.location) lines.push(`LOCATION:${esc(e.location.address ? `${e.location.name}, ${e.location.address}` : e.location.name)}`);
      lines.push(`DESCRIPTION:${esc(desc)}`, `CATEGORIES:${esc(e.categoryLabel)}`, `URL:${new URL("/calendar/#" + e.id, site.url).href}`);
      if (e.cancelled) lines.push("STATUS:CANCELLED");
      lines.push("END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    return lines.map(fold).join("\r\n") + "\r\n";
  }
}
