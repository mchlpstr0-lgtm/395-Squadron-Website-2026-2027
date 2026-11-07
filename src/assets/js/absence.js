/* Absence report helper – builds an email / text message for the squadron.
   Nothing is sent from the website; the buttons open the user's own apps. */
(function () {
  "use strict";
  const form = document.querySelector("[data-absence-form]");
  if (!form) return;
  const EMAIL = "395air@cadets.gc.ca";
  const PHONE = "+17806199756";
  const STORE = "sqn-absence-cadet";
  const $ = (s) => form.querySelector(s);
  const preview = $("[data-absence-preview]");
  const emailBtn = $("[data-absence-email]");
  const smsBtn = $("[data-absence-sms]");
  const copyBtn = $("[data-absence-copy]");
  const errorEl = $("[data-absence-error]");
  const f = form.elements;

  // Default the date to the next Tuesday (parade night).
  const toYmd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (!f.date.value) {
    const d = new Date();
    const add = (2 - d.getDay() + 7) % 7; // 2 = Tuesday
    d.setDate(d.getDate() + add);
    f.date.value = toYmd(d);
  }

  // Restore remembered cadet details.
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || "null");
    if (saved) {
      f.rank.value = saved.rank || "";
      f.first.value = saved.first || "";
      f.last.value = saved.last || "";
      f.remember.checked = true;
    }
  } catch (e) { /* ignore */ }

  const pretty = (ymd) => {
    if (!ymd) return "";
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  };
  const short = (ymd) => {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  };

  function missing() {
    const req = [["rank", "rank"], ["first", "first name"], ["last", "last name"], ["date", "date"]];
    return req.filter(([k]) => !String(f[k].value).trim()).map(([, label]) => label);
  }

  function build() {
    const rank = f.rank.value.trim();
    const first = f.first.value.trim();
    const last = f.last.value.trim();
    const date = f.date.value;
    const until = f.until.value && f.until.value > date ? f.until.value : "";
    const when = until ? `${pretty(date)} to ${pretty(until)}` : pretty(date);
    const lines = [
      "Absence report – 395 Squadron",
      "",
      `Rank: ${rank || "—"}`,
      `Name: ${first || "—"} ${last || ""}`.trim(),
      `Date absent: ${when || "—"}`,
    ];
    if (f.activity.value) lines.push(`Activity: ${f.activity.value}`);
    if (f.note.value.trim()) lines.push(`Note: ${f.note.value.trim()}`);
    if (f.from.value.trim()) lines.push("", `Reported by: ${f.from.value.trim()}`);
    const body = lines.join("\n");
    const subject = `Absence – ${rank} ${last}, ${first} – ${date ? short(date) : ""}${until ? " to " + short(until) : ""}`;
    // SMS: a shorter one-liner.
    const sms = `Absence: ${rank} ${first} ${last} – ${when}${f.activity.value ? " (" + f.activity.value + ")" : ""}${f.note.value.trim() ? ". " + f.note.value.trim() : ""}`;
    return { body, subject, sms };
  }

  function update() {
    const { body, subject, sms } = build();
    preview.textContent = body;
    emailBtn.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    // "?&body=" works on both iOS and Android messaging apps.
    smsBtn.href = `sms:${PHONE}?&body=${encodeURIComponent(sms)}`;
    try {
      if (f.remember.checked) localStorage.setItem(STORE, JSON.stringify({ rank: f.rank.value, first: f.first.value, last: f.last.value }));
      else localStorage.removeItem(STORE);
    } catch (e) { /* ignore */ }
  }

  function guard(e) {
    const miss = missing();
    ["rank", "first", "last", "date"].forEach((k) => f[k].setAttribute("aria-invalid", String(!String(f[k].value).trim())));
    if (miss.length) {
      e && e.preventDefault();
      errorEl.textContent = `Please add the cadet’s ${miss.join(", ")} – the squadron needs these to record the absence.`;
      errorEl.hidden = false;
      f[["rank", "first", "last", "date"].find((k) => !String(f[k].value).trim())].focus();
      return false;
    }
    errorEl.hidden = true;
    return true;
  }

  form.addEventListener("input", () => { update(); if (!errorEl.hidden) guard(); });
  form.addEventListener("change", update);
  form.addEventListener("submit", (e) => e.preventDefault());
  emailBtn.addEventListener("click", guard);
  smsBtn.addEventListener("click", guard);
  copyBtn.addEventListener("click", async () => {
    if (!guard()) return;
    const ok = await window.SQN.copyText(build().body);
    window.SQN.toast(ok ? "Message copied – paste it into an email or text" : "Couldn’t copy – please select the message and copy it");
  });
  update();
})();
