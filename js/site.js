/* Glyph — site behaviour. No dependencies except the vendored Lenis (js/lenis.min.js). */
(() => {
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (location.search.includes("og")) document.documentElement.classList.add("og");
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!still && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const el = id.length > 1 && $(id);
      if (!el) return;
      e.preventDefault();
      let target = el;
      if (id === "#join") {
        const r = el.getBoundingClientRect();
        if (r.top >= 80 && r.bottom <= innerHeight) { $("#email")?.focus({ preventScroll: true }); return; }
        const j2 = $("#join2");
        if (j2 && r.bottom < 0 && j2.getBoundingClientRect().top < innerHeight * 2.5) target = j2;
      }
      if (lenis) lenis.scrollTo(target, { offset: id === "#join" ? -140 : -80, duration: 1.4 });
      else target.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" });
      if (id === "#join") setTimeout(() => $("input[type=email]", target)?.focus({ preventScroll: true }), 900);
    });
  });

  /* ---------- nav ---------- */
  const nav = $("#nav"), darkBlock = $(".stance");
  const onScroll = () => {
    nav.classList.toggle("is-scrolled", (window.scrollY || 0) > 40);
    if (darkBlock) { const r = darkBlock.getBoundingClientRect(); nav.classList.toggle("on-dark", r.top < 64 && r.bottom > 64); }
  };
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ---------- hero: paper first, then the nib arrives and lays its ink once ---------- */
  const nib = $("#nibVideo"), media = $(".hero-media");
  if (nib && media) {
    const og = document.documentElement.classList.contains("og");
    // The video itself is the base layer, so the writing is never cross-faded into or out of.
    // The end-frame still only rises on top when the video cannot play (reduced motion, blocked
    // autoplay, OG capture) — that is the one case where a composed hold is better than frame 0.
    const showStill = () => media.classList.add("is-fallback");
    if (still || og) showStill();
    else {
      nib.preload = "auto";
      let live = false;
      const start = () => nib.play().then(() => { live = true; }).catch(showStill);
      nib.addEventListener("playing", () => { live = true; }, { once: true });
      if (nib.readyState >= 3) setTimeout(start, 400);
      else nib.addEventListener("canplaythrough", () => setTimeout(start, 400), { once: true });
      setTimeout(() => { if (!live) showStill(); }, 3500);
      nib.addEventListener("ended", () => nib.pause());
    }
  }

  /* ---------- scroll reveal ---------- */
  const rvObs = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add("in"); rvObs.unobserve(en.target); }
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".rv").forEach(el => { rvObs.observe(el); el.addEventListener("transitionend", () => { if (el.classList.contains("in")) el.classList.add("rv-done"); }, { once: true }); });
  $$("[data-stagger]").forEach(parent => {
    $$(":scope > *", parent).forEach((c, i) => { c.classList.add("rv"); c.style.setProperty("--d", (Math.min(i, 5) * 0.06) + "s"); rvObs.observe(c); });
  });
  const wm = $(".wordmark");
  if (wm) { const o = new IntersectionObserver((e) => e.forEach(x => x.isIntersecting && wm.classList.add("in")), { threshold: 0.2 }); o.observe(wm); }

  /* ---------- the film: plays muted when in view, one tap for sound ---------- */
  const card = $("#filmcard"), film = $("#film"), soundBtn = $("#soundBtn"), playBtn = $("#playBtn"), bar = $("#filmbar");
  if (card && film) {
    let loaded = false;
    const saveData = !!(navigator.connection && navigator.connection.saveData);
    const small = matchMedia("(max-width: 800px)").matches || saveData;
    const src = $("source", film);
    if (src && small && src.dataset.small) src.src = src.dataset.small;
    const load = () => { if (!loaded) { loaded = true; film.load(); } };
    const START = 18.6;
    film.addEventListener("loadedmetadata", () => { try { if (film.currentTime < 0.5) film.currentTime = START; } catch (_) {} }, { once: true });
    const near = new IntersectionObserver((e) => { if (e[0].isIntersecting) { if (!still) load(); near.disconnect(); } }, { rootMargin: "600px 0px" });
    near.observe(card);
    const vis = new IntersectionObserver((e) => {
      const on = e[0].intersectionRatio >= 0.35;
      if (on && !still && !saveData) { load(); film.play().catch(() => {}); } else film.pause();
    }, { threshold: [0, 0.35, 0.6] });
    vis.observe(card);
    const syncPlay = () => { const p = film.paused; card.classList.toggle("is-playing", !p); if (playBtn) { playBtn.textContent = p ? "Play" : "Pause"; playBtn.setAttribute("aria-label", p ? "Play the film" : "Pause the film"); } };
    film.addEventListener("play", syncPlay); film.addEventListener("pause", syncPlay);
    if (playBtn) playBtn.addEventListener("click", (e) => { e.stopPropagation(); load(); film.paused ? film.play().catch(() => {}) : film.pause(); });
    film.addEventListener("timeupdate", () => { if (bar && film.duration) bar.style.width = (film.currentTime / film.duration * 100) + "%"; });
    const setSound = (on) => { film.muted = !on; soundBtn.textContent = on ? "Sound off" : "Sound on"; soundBtn.setAttribute("aria-pressed", on ? "true" : "false"); };
    soundBtn.addEventListener("click", (e) => { e.stopPropagation(); load(); setSound(film.muted); if (film.paused) film.play().catch(() => {}); });
    card.addEventListener("click", () => { load(); if (film.muted) { setSound(true); film.play().catch(() => {}); return; } film.paused ? film.play() : film.pause(); });
  }

  /* ---------- how it works: the line draws as you scroll, numbers light in turn ---------- */
  const steps = $("#steps");
  if (steps) {
    const items = $$(".step", steps);
    const tick = () => {
      const r = steps.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.7 - r.top) / r.height));
      steps.style.setProperty("--p", p.toFixed(3));
      items.forEach(li => { if (li.getBoundingClientRect().top < vh * 0.7) li.classList.add("on"); });
    };
    window.addEventListener("scroll", tick, { passive: true }); window.addEventListener("resize", tick); tick();
  }

  /* ---------- object plate: a few pixels of parallax, nothing more ---------- */
  const plate = $("#plateImg");
  if (plate && !still) {
    const tick = () => {
      const r = plate.parentElement.getBoundingClientRect();
      const mid = r.top + r.height / 2 - window.innerHeight / 2;
      plate.style.setProperty("--py", Math.max(-12, Math.min(12, mid * -0.015)).toFixed(1) + "px");
    };
    window.addEventListener("scroll", tick, { passive: true }); tick();
  }

  /* ---------- email capture (Google Sheets via Apps Script), with the liquid success ---------- */
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx7xuVthOQU0OkO4v6tBCBwHKzJ2E1brT7l3C3pMkXKQ4K1vIaApcCMsipndh6_mJ2Q/exec";
  const setupJoin = (join) => {
    const form = $("form", join), emailEl = $("input[type=email]", join), btn = $(".joinbtn", join);
    const msg = $(".msg", join.parentElement) || $(".msg", join);
    const gooA = $(".goo-a", join), gooB = $(".goo-b", join), doneRow = $(".done", join), doneText = $(".donetext", join);
    let merging = false;
    const place = (shape, el) => { shape.style.left = el.offsetLeft + "px"; shape.style.top = el.offsetTop + "px"; shape.style.width = el.offsetWidth + "px"; shape.style.height = el.offsetHeight + "px"; };
    const sync = () => { if (!merging) { place(gooA, emailEl); place(gooB, btn); } };
    const ro = new ResizeObserver(sync); ro.observe(emailEl); ro.observe(btn); ro.observe(join);
    window.addEventListener("resize", sync); sync();
    document.fonts && document.fonts.ready.then(sync);

    async function celebrate() {
      merging = true; ro.disconnect();
      const size = 52, cx = (join.clientWidth - size) / 2, cy = (join.clientHeight - size) / 2;
      doneRow.hidden = false;
      doneRow.style.setProperty("--shift", ((doneText.offsetWidth + 14) / 2) + "px");
      join.classList.add("is-merging");
      if (still) { join.classList.add("is-done", "is-drawn", "is-moved"); return; }
      await nextFrame();
      for (const s of [gooA, gooB]) { s.style.left = cx + "px"; s.style.top = cy + "px"; s.style.width = size + "px"; s.style.height = size + "px"; }
      await wait(640); join.classList.add("is-done");
      await wait(80); join.classList.add("is-drawn");
      await wait(620); join.classList.add("is-moved");
    }
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = emailEl.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { if (msg) { msg.textContent = "Please enter a valid email."; msg.className = "msg err"; } return; }
      btn.disabled = true; btn.textContent = "Joining…";
      try {
        await fetch(SCRIPT_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" }, body: "email=" + encodeURIComponent(email) });
        if (msg) { msg.textContent = ""; msg.className = "msg"; }
        celebrate();
      } catch (err) {
        if (msg) { msg.textContent = "Something went wrong — try again in a moment."; msg.className = "msg err"; }
        btn.disabled = false; btn.textContent = "Join the waitlist";
      }
    });
  };
  $$(".join").forEach(setupJoin);
})();
