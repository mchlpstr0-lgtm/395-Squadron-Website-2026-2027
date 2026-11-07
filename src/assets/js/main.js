/* 395 Squadron – site-wide behaviour. No dependencies. */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const BASE = document.documentElement.dataset.base || "";
  const withBase = (u) => (u && u.startsWith("/") && !u.startsWith("//") ? BASE + u : u);

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    let el = $(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-visible"), 2600);
  }
  window.SQN = { toast };

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (err) { /* ignore */ }
      ta.remove();
      return ok;
    }
  }
  window.SQN.copyText = copyText;

  /* ---------- Theme toggle ---------- */
  const root = document.documentElement;
  function effectiveTheme() {
    const set = root.getAttribute("data-theme");
    if (set === "light" || set === "dark") return set;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  $$("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = effectiveTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) { /* private mode */ }
      toast(next === "dark" ? "Dark theme on" : "Light theme on");
    });
  });

  /* ---------- Navigation ---------- */
  const navToggle = $("[data-nav-toggle]");
  const nav = $("[data-nav]");
  function setNav(open) {
    if (!navToggle || !nav) return;
    navToggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
  }
  if (navToggle) navToggle.addEventListener("click", () => setNav(navToggle.getAttribute("aria-expanded") !== "true"));

  $$("[data-submenu-toggle]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = btn.getAttribute("aria-expanded") !== "true";
      $$("[data-submenu-toggle]").forEach((b) => b !== btn && b.setAttribute("aria-expanded", "false"));
      btn.setAttribute("aria-expanded", String(open));
    });
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".has-children")) $$("[data-submenu-toggle]").forEach((b) => b.setAttribute("aria-expanded", "false"));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const openSub = $$("[data-submenu-toggle]").find((b) => b.getAttribute("aria-expanded") === "true");
    if (openSub) { openSub.setAttribute("aria-expanded", "false"); openSub.focus(); return; }
    if (nav && nav.classList.contains("is-open")) { setNav(false); navToggle.focus(); }
  });
  // Close the mobile menu after following an in-page link.
  if (nav) nav.addEventListener("click", (e) => { if (e.target.closest("a")) setNav(false); });
  window.addEventListener("resize", () => { if (window.innerWidth > 1180) setNav(false); });

  /* ---------- Site alert expiry ---------- */
  $$("[data-alert][data-expires]").forEach((el) => {
    const exp = Date.parse(el.dataset.expires + "T23:59:59");
    if (exp && Date.now() > exp) el.hidden = true;
  });

  /* ---------- Upcoming events: hide ones that already finished ---------- */
  $$("[data-upcoming]").forEach((list) => {
    const max = parseInt(list.dataset.max || "4", 10);
    const now = Date.now();
    let shown = 0;
    $$("li[data-end]", list).forEach((li) => {
      const done = Date.parse(li.dataset.end) < now;
      const show = !done && shown < max;
      li.hidden = !show;
      if (show) shown++;
    });
    const wrap = list.parentElement;
    const empty = wrap && $("[data-upcoming-empty]", wrap);
    if (empty) empty.hidden = shown > 0;
  });

  /* ---------- Hero carousel ---------- */
  $$("[data-carousel]").forEach((hero) => {
    const slides = $$(".hero-slide", hero);
    const dots = $$("[data-slide-to]", hero);
    const pauseBtn = $("[data-carousel-pause]", hero);
    if (slides.length < 2) return;
    let i = 0;
    let timer = null;
    let paused = reduceMotion;
    const go = (n) => {
      slides[i].classList.remove("is-active");
      slides[i].setAttribute("aria-hidden", "true");
      dots[i] && dots[i].removeAttribute("aria-current");
      i = (n + slides.length) % slides.length;
      slides[i].classList.add("is-active");
      slides[i].removeAttribute("aria-hidden");
      dots[i] && dots[i].setAttribute("aria-current", "true");
    };
    const start = () => { stop(); if (!paused) timer = setInterval(() => go(i + 1), 6500); };
    const stop = () => { clearInterval(timer); timer = null; };
    dots.forEach((d) => d.addEventListener("click", () => { go(parseInt(d.dataset.slideTo, 10)); start(); }));
    if (pauseBtn) {
      const sync = () => {
        hero.classList.toggle("is-paused", paused);
        pauseBtn.setAttribute("aria-label", paused ? "Play slideshow" : "Pause slideshow");
      };
      pauseBtn.addEventListener("click", () => { paused = !paused; sync(); paused ? stop() : start(); });
      sync();
    }
    hero.addEventListener("mouseenter", stop);
    hero.addEventListener("mouseleave", start);
    hero.addEventListener("focusin", stop);
    hero.addEventListener("focusout", start);
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    start();
  });

  /* ---------- Print & share ---------- */
  $$("[data-print]").forEach((b) => b.addEventListener("click", () => window.print()));
  $$("[data-share]").forEach((b) =>
    b.addEventListener("click", async () => {
      const data = { title: b.dataset.shareTitle || document.title, url: location.href };
      if (navigator.share) {
        try { await navigator.share(data); return; } catch (e) { if (e && e.name === "AbortError") return; }
      }
      toast((await copyText(location.href)) ? "Link copied to clipboard" : "Copy the address from your browser bar");
    })
  );

  /* ---------- Copy buttons: <button data-copy="#input-id"> ---------- */
  $$("[data-copy]").forEach((b) =>
    b.addEventListener("click", async () => {
      const src = $(b.dataset.copy);
      const text = src ? (src.value !== undefined ? src.value : src.textContent) : b.dataset.copyText || "";
      toast((await copyText(text)) ? "Copied!" : "Couldn’t copy – please select and copy manually");
    })
  );

  /* ---------- Lazy YouTube embeds ---------- */
  $$("[data-youtube]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const id = btn.dataset.youtube;
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
      iframe.title = btn.getAttribute("aria-label") || "YouTube video";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      btn.replaceWith(iframe);
      iframe.focus();
    })
  );

  /* ---------- Lightbox gallery ---------- */
  $$("[data-gallery]").forEach((gallery) => {
    const items = $$("[data-full]", gallery);
    if (!items.length || typeof HTMLDialogElement === "undefined") return;
    const dlg = document.createElement("dialog");
    dlg.className = "lightbox";
    dlg.setAttribute("aria-label", "Photo viewer");
    dlg.innerHTML =
      '<div class="lightbox-inner">' +
      '<p class="lightbox-count" aria-live="polite"></p>' +
      '<figure style="margin:0;display:grid;place-items:center"><img alt=""><figcaption class="lightbox-caption"></figcaption></figure>' +
      '<button type="button" class="lightbox-btn lightbox-close" aria-label="Close">✕</button>' +
      '<button type="button" class="lightbox-btn lightbox-prev" aria-label="Previous photo">‹</button>' +
      '<button type="button" class="lightbox-btn lightbox-next" aria-label="Next photo">›</button>' +
      "</div>";
    document.body.appendChild(dlg);
    const img = $("img", dlg);
    const cap = $(".lightbox-caption", dlg);
    const count = $(".lightbox-count", dlg);
    let idx = 0;
    let opener = null;
    const show = (n) => {
      idx = (n + items.length) % items.length;
      const it = items[idx];
      img.src = withBase(it.dataset.full);
      img.alt = it.dataset.caption || "";
      cap.textContent = it.dataset.caption || "";
      count.textContent = `${idx + 1} / ${items.length}`;
      // Preload neighbours for snappy navigation.
      [idx + 1, idx - 1].forEach((k) => { const n2 = items[(k + items.length) % items.length]; const p = new Image(); p.src = withBase(n2.dataset.full); });
    };
    items.forEach((it, n) => it.addEventListener("click", () => { opener = it; show(n); dlg.showModal(); }));
    $(".lightbox-close", dlg).addEventListener("click", () => dlg.close());
    $(".lightbox-prev", dlg).addEventListener("click", () => show(idx - 1));
    $(".lightbox-next", dlg).addEventListener("click", () => show(idx + 1));
    dlg.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
    dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.classList.contains("lightbox-inner")) dlg.close(); });
    dlg.addEventListener("close", () => { img.removeAttribute("src"); opener && opener.focus(); });
    let x0 = null;
    dlg.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  });
})();
