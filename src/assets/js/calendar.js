/* 395 Squadron – interactive calendar (month grid + list, filters, event details). */
(function () {
  "use strict";
  const root = document.querySelector("[data-calendar]");
  const dataEl = document.getElementById("calendar-data");
  if (!root || !dataEl) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const BASE = document.documentElement.dataset.base || "";
  const events = JSON.parse(dataEl.textContent);
  const viewRoot = $("[data-cal-view-root]", root);
  const title = $("[data-cal-title]", root);
  const toolbar = $("[data-cal-toolbar]", root);
  const filtersEl = $("[data-cal-filters]", root);
  const dialog = $("[data-event-dialog]");
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const FILTER_KEY = "sqn-cal-hidden";
  const VIEW_KEY = "sqn-cal-view";

  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const todayYmd = (() => {
    // "Today" in Edmonton, regardless of the viewer's own time zone.
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    } catch (e) {
      const d = new Date();
      return ymd(d.getFullYear(), d.getMonth(), d.getDate());
    }
  })();
  const now = Date.now();
  const addDays = (s, n) => {
    const d = new Date(s + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const eventDays = (e) => {
    const days = [];
    for (let d = e.date; d <= (e.endDate || e.date); d = addDays(d, 1)) days.push(d);
    return days;
  };

  /* ---------- State ---------- */
  let hidden = new Set();
  try { hidden = new Set(JSON.parse(localStorage.getItem(FILTER_KEY) || "[]")); } catch (e) { /* ignore */ }
  let view;
  try { view = localStorage.getItem(VIEW_KEY); } catch (e) { /* ignore */ }
  if (view !== "month" && view !== "list") view = window.matchMedia("(max-width: 760px)").matches ? "list" : "month";

  const params = new URLSearchParams(location.search);
  let cursor; // { y, m }
  const fromParam = params.get("m");
  if (fromParam && /^\d{4}-\d{2}$/.test(fromParam)) {
    cursor = { y: +fromParam.slice(0, 4), m: +fromParam.slice(5, 7) - 1 };
  } else {
    // Show the current month, unless nothing is posted for it yet but something is coming up.
    const t = { y: +todayYmd.slice(0, 4), m: +todayYmd.slice(5, 7) - 1 };
    const key = `${t.y}-${pad(t.m + 1)}`;
    const hasThisMonth = events.some((e) => e.date.startsWith(key));
    const next = events.find((e) => Date.parse(e.endUtc) >= now);
    cursor = !hasThisMonth && next ? { y: +next.date.slice(0, 4), m: +next.date.slice(5, 7) - 1 } : t;
  }

  const visible = () => events.filter((e) => !hidden.has(e.category));

  /* ---------- Rendering ---------- */
  function render() {
    title.textContent = `${MONTHS[cursor.m]} ${cursor.y}`;
    $$("[data-cal-view]", root).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.calView === view)));
    $$(".cal-filter", root).forEach((b) => b.setAttribute("aria-pressed", String(!hidden.has(b.dataset.cat))));
    viewRoot.innerHTML = view === "month" ? monthHtml() : listHtml();
    const u = new URL(location.href);
    u.searchParams.set("m", `${cursor.y}-${pad(cursor.m + 1)}`);
    history.replaceState(history.state, "", u.pathname + u.search + location.hash);
  }

  function monthHtml() {
    const first = new Date(Date.UTC(cursor.y, cursor.m, 1));
    const startOffset = first.getUTCDay();
    const daysInMonth = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
    const cells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    const startYmd = addDays(ymd(cursor.y, cursor.m, 1), -startOffset);
    const byDay = new Map();
    for (const e of visible()) for (const d of eventDays(e)) { if (!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(e); }

    let html = `<div class="cal-grid" role="grid" aria-label="${MONTHS[cursor.m]} ${cursor.y}">`;
    html += DOW.map((d) => `<div class="cal-dow" role="columnheader">${d}</div>`).join("");
    for (let i = 0; i < cells; i++) {
      const d = addDays(startYmd, i);
      const inMonth = +d.slice(5, 7) - 1 === cursor.m;
      const list = (byDay.get(d) || []).slice().sort((a, b) => a.startUtc.localeCompare(b.startUtc));
      const cls = ["cal-cell", inMonth ? "" : "is-outside", d === todayYmd ? "is-today" : "", list.length ? "has-events" : ""].join(" ");
      const label = new Date(d + "T12:00:00Z").toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
      html += `<div class="${cls}" role="gridcell" data-day="${d}" aria-label="${label}${list.length ? `, ${list.length} event${list.length > 1 ? "s" : ""}` : ""}">`;
      html += `<span class="cal-daynum">${+d.slice(8)}</span><div class="cal-dots">`;
      list.slice(0, 3).forEach((e) => {
        const t = e.allDay ? "" : `<span class="t">${shortTime(e, d)}</span>`;
        html += `<button type="button" class="cal-event${e.cancelled ? " is-cancelled" : ""}" style="--cat:${e.categoryColor}" data-event="${e.id}" title="${esc(e.title)}">${t}${esc(e.title)}</button>`;
      });
      html += `</div>`;
      if (list.length > 3) html += `<button type="button" class="cal-more" data-more="${d}">+${list.length - 3} more</button>`;
      html += `</div>`;
    }
    html += `</div>`;
    if (!visible().some((e) => e.date.startsWith(`${cursor.y}-${pad(cursor.m + 1)}`))) {
      html += `<p class="cal-empty" style="margin-top:1rem">Nothing posted for ${MONTHS[cursor.m]} yet. Check back soon or read the latest <a href="${BASE}/announcements/">announcements</a>.</p>`;
    }
    return html;
  }

  function shortTime(e, day) {
    if (e.endDate && day !== e.date) return day === e.endDate && e.end ? `→${fmt12(e.end)}` : "";
    return e.start ? fmt12(e.start) : "";
  }
  function fmt12(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    const h12 = h % 12 || 12;
    return `${h12}${m ? ":" + pad(m) : ""}${h < 12 ? "a" : "p"}`;
  }

  function listHtml() {
    const key = `${cursor.y}-${pad(cursor.m + 1)}`;
    const list = visible().filter((e) => eventDays(e).some((d) => d.startsWith(key)));
    if (!list.length) {
      return `<p class="cal-empty">Nothing posted for ${MONTHS[cursor.m]} ${cursor.y}${hidden.size ? " (some event types are hidden by the filters above)" : ""}.</p>`;
    }
    const days = new Map();
    for (const e of list) {
      const d = e.date.startsWith(key) ? e.date : `${key}-01`;
      if (!days.has(d)) days.set(d, []);
      days.get(d).push(e);
    }
    let html = `<div class="cal-month">`;
    for (const [d, evs] of [...days.entries()].sort()) {
      const dt = new Date(d + "T12:00:00Z");
      html += `<div class="agenda-day" id="day-${d}"><div class="agenda-date${d === todayYmd ? " is-today" : ""}"><span class="d">${dt.getUTCDate()}</span><span class="w">${dt.toLocaleDateString("en-CA", { weekday: "long", timeZone: "UTC" })}</span></div><div class="agenda-events">`;
      for (const e of evs) {
        const past = Date.parse(e.endUtc) < now;
        html += `<article class="agenda-event${past ? " is-past" : ""}${e.cancelled ? " is-cancelled" : ""}" id="${e.id}" style="--cat:${e.categoryColor}">
          <span class="cat-tag">${esc(e.categoryLabel)}${past ? " · past" : ""}</span>
          <h3><button type="button" data-event="${e.id}">${esc(e.title)}${e.cancelled ? " – CANCELLED" : ""}</button></h3>
          <p class="agenda-meta"><span>${esc(e.whenLabel)}</span>${e.location ? `<span><a href="${esc(e.location.mapsUrl)}" rel="noopener">${esc(e.location.name)}</a></span>` : ""}</p>
          ${e.lines.length ? `<ul class="agenda-lines">${e.lines.map((l) => `<li>${l}</li>`).join("")}</ul>` : ""}
        </article>`;
      }
      html += `</div></div>`;
    }
    return html + `</div>`;
  }

  /* ---------- Event dialog ---------- */
  const icsStamp = (iso) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const icsEsc = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
  const plainDetails = (e) =>
    [e.who && `Who: ${e.who}`, e.dress && `Dress: ${e.dress}`, e.bring && `Bring: ${e.bring}`, ...e.notes, e.link && `${e.link.text || "Link"}: ${e.link.url}`]
      .filter(Boolean)
      .join("\n");
  const eventUrl = (e) => `${location.origin}${BASE}/calendar/#${e.id}`;
  const locText = (e) => (e.location ? (e.location.address ? `${e.location.name}, ${e.location.address}` : e.location.name) : "");

  function googleUrl(e) {
    const dates = e.allDay
      ? `${e.date.replace(/-/g, "")}/${addDays(e.endDate || e.date, 1).replace(/-/g, "")}`
      : `${icsStamp(e.startUtc)}/${icsStamp(e.endUtc)}`;
    const p = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates, details: `${plainDetails(e)}\n\n${eventUrl(e)}`, location: locText(e), ctz: "America/Edmonton" });
    return `https://calendar.google.com/calendar/render?${p}`;
  }

  function downloadIcs(e) {
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//395 Squadron RCAC//Event//EN", "METHOD:PUBLISH", "BEGIN:VEVENT",
      `UID:${e.id}@395squadron`, `DTSTAMP:${icsStamp(new Date().toISOString())}`,
      ...(e.allDay
        ? [`DTSTART;VALUE=DATE:${e.date.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${addDays(e.endDate || e.date, 1).replace(/-/g, "")}`]
        : [`DTSTART:${icsStamp(e.startUtc)}`, `DTEND:${icsStamp(e.endUtc)}`]),
      `SUMMARY:${icsEsc(e.title)}`,
      e.location ? `LOCATION:${icsEsc(locText(e))}` : null,
      `DESCRIPTION:${icsEsc(plainDetails(e) + "\n\n" + eventUrl(e))}`,
      `URL:${eventUrl(e)}`, "END:VEVENT", "END:VCALENDAR",
    ].filter(Boolean);
    const blob = new Blob([lines.join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${e.id}.ics`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  let current = null;
  let opener = null;
  function openEvent(id, from) {
    const e = events.find((x) => x.id === id);
    if (!e || !dialog || typeof dialog.showModal !== "function") return false;
    current = e;
    opener = from || null;
    dialog.style.setProperty("--cat", e.categoryColor);
    $("[data-ev-cat]", dialog).textContent = e.categoryLabel + (e.cancelled ? " · CANCELLED" : "");
    $("[data-ev-cat]", dialog).style.setProperty("--cat", e.categoryColor);
    $("[data-ev-title]", dialog).textContent = e.title;
    $("[data-ev-date]", dialog).textContent = e.dateLabel;
    $("[data-ev-time]", dialog).textContent = e.whenLabel;
    const locRow = $("[data-ev-loc-row]", dialog);
    locRow.hidden = !e.location;
    if (e.location) {
      $("[data-ev-loc]", dialog).innerHTML = `<a href="${esc(e.location.mapsUrl)}" rel="noopener" target="_blank">${esc(e.location.name)}</a>${e.location.address ? `<br><small>${esc(e.location.address)}</small>` : ""}`;
    }
    $("[data-ev-lines]", dialog).innerHTML = e.lines.map((l) => `<li>${l}</li>`).join("");
    $("[data-ev-google]", dialog).href = googleUrl(e);
    if (location.hash !== "#" + e.id) history.replaceState(history.state, "", location.pathname + location.search + "#" + e.id);
    dialog.showModal();
    return true;
  }
  if (dialog) {
    $("[data-ev-close]", dialog).addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (ev) => { if (ev.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => {
      history.replaceState(history.state, "", location.pathname + location.search);
      if (opener && document.contains(opener)) opener.focus();
    });
    $("[data-ev-ics]", dialog).addEventListener("click", () => current && downloadIcs(current));
    $("[data-ev-copy]", dialog).addEventListener("click", async () => {
      if (!current) return;
      const ok = await window.SQN.copyText(eventUrl(current));
      window.SQN.toast(ok ? "Event link copied" : "Couldn’t copy the link");
    });
  }

  /* ---------- Events ---------- */
  viewRoot.addEventListener("click", (ev) => {
    const evBtn = ev.target.closest("[data-event]");
    if (evBtn) { openEvent(evBtn.dataset.event, evBtn); return; }
    const more = ev.target.closest("[data-more]");
    const cell = ev.target.closest(".cal-cell.has-events");
    const day = more ? more.dataset.more : cell && window.matchMedia("(max-width: 760px)").matches ? cell.dataset.day : null;
    if (day) {
      view = "list";
      render();
      const target = document.getElementById("day-" + day);
      if (target) { target.scrollIntoView({ block: "start" }); target.querySelector("button")?.focus({ preventScroll: true }); }
    }
  });
  $("[data-cal-prev]", root).addEventListener("click", () => { cursor = cursor.m === 0 ? { y: cursor.y - 1, m: 11 } : { y: cursor.y, m: cursor.m - 1 }; render(); });
  $("[data-cal-next]", root).addEventListener("click", () => { cursor = cursor.m === 11 ? { y: cursor.y + 1, m: 0 } : { y: cursor.y, m: cursor.m + 1 }; render(); });
  $("[data-cal-today]", root).addEventListener("click", () => { cursor = { y: +todayYmd.slice(0, 4), m: +todayYmd.slice(5, 7) - 1 }; render(); });
  $$("[data-cal-view]", root).forEach((b) =>
    b.addEventListener("click", () => {
      view = b.dataset.calView;
      try { localStorage.setItem(VIEW_KEY, view); } catch (e) { /* ignore */ }
      render();
    })
  );
  $$(".cal-filter", root).forEach((b) =>
    b.addEventListener("click", () => {
      const c = b.dataset.cat;
      hidden.has(c) ? hidden.delete(c) : hidden.add(c);
      if (hidden.size === $$(".cal-filter", root).length) hidden.clear(); // never hide everything
      try { localStorage.setItem(FILTER_KEY, JSON.stringify([...hidden])); } catch (e) { /* ignore */ }
      render();
    })
  );
  document.addEventListener("keydown", (ev) => {
    if (dialog && dialog.open) return;
    if (ev.target.closest("input, textarea, select")) return;
    if (ev.key === "ArrowLeft" && ev.altKey) $("[data-cal-prev]", root).click();
    if (ev.key === "ArrowRight" && ev.altKey) $("[data-cal-next]", root).click();
  });

  /* ---------- Subscribe links: use the address the site is actually served from ---------- */
  const feed = `${location.origin}${BASE}/calendar.ics`;
  if (location.protocol.startsWith("http")) {
    const urlInput = document.querySelector("[data-ics-url]");
    if (urlInput) urlInput.value = feed;
    const webcal = feed.replace(/^https?:/, "webcal:");
    const w = document.querySelector('[data-sub="webcal"]');
    const g = document.querySelector('[data-sub="google"]');
    if (w) w.href = webcal;
    if (g) g.href = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`;
  }

  /* ---------- Start ---------- */
  toolbar.hidden = false;
  filtersEl.hidden = !$$(".cal-filter", root).length;
  const hashId = decodeURIComponent(location.hash.slice(1));
  const target = hashId && events.find((e) => e.id === hashId);
  if (target) cursor = { y: +target.date.slice(0, 4), m: +target.date.slice(5, 7) - 1 };
  render();
  if (target) openEvent(target.id);
  window.addEventListener("hashchange", () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const e = events.find((x) => x.id === id);
    if (e) { cursor = { y: +e.date.slice(0, 4), m: +e.date.slice(5, 7) - 1 }; render(); openEvent(e.id); }
  });
})();
