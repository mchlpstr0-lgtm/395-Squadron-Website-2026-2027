import yaml from "js-yaml";
import { EleventyHtmlBasePlugin } from "@11ty/eleventy";
import { formatDate, formatTimeRange, escapeHtml } from "./src/_lib/dates.js";
import { icon } from "./src/_lib/icons.js";

export default function (eleventyConfig) {
  // ---- Data: allow YAML data files (events, training, etc.) ----
  eleventyConfig.addDataExtension("yaml,yml", (contents) => yaml.load(contents));

  // ---- Static files copied as-is ----
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/s": "s" }); // keeps old /s/<file>.pdf links working
  eleventyConfig.addPassthroughCopy({ "src/assets/img/brand/favicon-32.png": "favicon.png" });
  eleventyConfig.addWatchTarget("src/assets/");

  // ---- Lets the site live in a sub-folder (e.g. GitHub Pages project sites) ----
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);

  // ---- Markdown: turn bare URLs / emails in announcements into links ----
  eleventyConfig.amendLibrary("md", (md) => md.set({ linkify: true }));

  // ---- Collections ----
  eleventyConfig.addCollection("posts", (api) =>
    api.getFilteredByGlob("src/announcements/posts/*.md").sort((a, b) => b.date - a.date)
  );

  // ---- Filters ----
  eleventyConfig.addFilter("date", (value, fmt = "long") => formatDate(value, fmt));
  eleventyConfig.addFilter("isoDate", (value) => new Date(value).toISOString());
  eleventyConfig.addFilter("timeRange", (ev) => formatTimeRange(ev));
  eleventyConfig.addFilter("json", (value) => JSON.stringify(value).replace(/</g, "\\u003c"));
  eleventyConfig.addFilter("limit", (arr, n) => (arr || []).slice(0, n));
  eleventyConfig.addFilter("absoluteUrl", (path, base) => new URL(path, base).href);
  eleventyConfig.addFilter("excerpt", (html, length = 220) => {
    const text = String(html || "")
      .replace(/<(script|style)[\s\S]*?<\/\1>/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.length > length ? text.slice(0, length).replace(/\s+\S*$/, "") + "…" : text;
  });
  // Short summary for announcement cards/feeds: front-matter `summary`, or the
  // post text minus the standard contact/absence boilerplate.
  eleventyConfig.addFilter("postSummary", (post, length = 220) => {
    if (post?.data?.summary) return post.data.summary;
    const text = String(post?.content || "")
      .replace(/<(script|style)[\s\S]*?<\/\1>/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&#160;/g, " ")
      .replace(/\s+/g, " ")
      .replace(/395 Edmonton “Griffon” Royal Canadian Air Cadet Squadron/gi, "")
      .replace(/EMAIL THE SQUADRON:\s*\S+/gi, "")
      .replace(/SQUADRON PHONE NUMBER:\s*[\d-]+/gi, "")
      .replace(/The schedule for all activities is in the calendar[^.]*\.\s*Click on events[^.]*\./gi, "")
      .replace(/Report an Absence or Leaving the Program:.*?regular training hours\./gi, "")
      .replace(/^[\s.,]+/, "")
      .trim();
    return text.length > length ? text.slice(0, length).replace(/\s+\S*$/, "") + "…" : text;
  });
  eleventyConfig.addFilter("eventsInMonth", (events, month) =>
    (events || []).filter((e) => e.date.startsWith(month) || (e.endDate && e.endDate.startsWith(month) && !e.date.startsWith(month)))
  );
  eleventyConfig.addFilter("upcoming", (events, now = Date.now()) =>
    (events || []).filter((e) => Date.parse(e.endUtc) >= now)
  );
  eleventyConfig.addFilter("groupByMonth", (events) => {
    const groups = new Map();
    for (const e of events || []) {
      const key = e.date.slice(0, 7);
      if (!groups.has(key)) groups.set(key, { key, label: formatDate(key + "-01", "monthYear"), events: [] });
      groups.get(key).events.push(e);
    }
    return [...groups.values()];
  });
  eleventyConfig.addFilter("mapsUrl", (q) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q));

  // ---- Shortcodes ----
  // Year for the copyright line.
  eleventyConfig.addShortcode("year", () => String(new Date().getFullYear()));
  // {% icon "mail" %} – inline SVG icon
  eleventyConfig.addShortcode("icon", (name, cls) => icon(name, cls));

  // {% monthSchedule "2026-11" %} inside an announcement renders that month's
  // events straight from src/_data/events.yaml, so the calendar and the
  // announcement can never disagree. Output is kept on one line so Markdown
  // treats it as a single HTML block.
  eleventyConfig.addShortcode("monthSchedule", function (month) {
    const events = (this.ctx?.calendar?.events || []).filter((e) => e.date.startsWith(month));
    if (!events.length) {
      return `<p class="schedule-empty">No events have been posted for ${escapeHtml(formatDate(month + "-01", "monthYear"))} yet. Check the <a href="/calendar/">calendar</a> for updates.</p>`;
    }
    const items = events
      .map((e) => {
        const loc = e.location ? ` <span class="sched-loc">· ${escapeHtml(e.location.name)}</span>` : "";
        const details = (e.lines || []).map((l) => `<li>${l}</li>`).join("");
        return `<li class="sched-item" style="--cat:${e.categoryColor}"><div class="sched-date"><span class="sched-dow">${formatDate(e.date, "dow")}</span><span class="sched-day">${formatDate(e.date, "day")}</span><span class="sched-mon">${formatDate(e.date, "mon")}</span></div><div class="sched-body"><h3 class="sched-title"><a href="/calendar/#${e.id}">${escapeHtml(e.title)}</a></h3><p class="sched-meta"><span class="sched-when">${escapeHtml(e.whenLabel)}</span>${loc}</p>${details ? `<ul class="sched-lines">${details}</ul>` : ""}</div></li>`;
      })
      .join("");
    return `<div class="schedule"><h2 class="schedule-heading">${escapeHtml(formatDate(month + "-01", "monthYear"))} schedule</h2><ol class="sched-list">${items}</ol><p class="schedule-foot"><a class="btn btn-ghost btn-sm" href="/calendar/?m=${month}">Open in calendar</a> <a class="btn btn-ghost btn-sm" href="/calendar.ics">Subscribe to the calendar</a></p></div>`;
  });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    pathPrefix: process.env.PATH_PREFIX || "/",
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html", "11ty.js"],
  };
}
