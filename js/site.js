/* Glyph — site behaviour. No dependencies except the vendored Lenis (js/lenis.min.js). */
(() => {
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const narrow = matchMedia("(max-width: 800px)");
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

  /* ---------- one pass per frame ----------
     There used to be four separate scroll listeners — the nav, the steps rail, the hero's
     drift and the object plate — and each one measured the page and then wrote a style.
     The browser cannot batch that: a style write invalidates layout, so the next handler's
     getBoundingClientRect has to stop and lay the page out again. Four handlers meant
     several forced reflows every single scroll event, and Lenis delivers those at the
     refresh rate. Measured on a full-page scroll it was one forced layout per frame, and
     the tenth-percentile frame took 33ms — two vsyncs, which is exactly the stutter.

     So: one listener, coalesced into a single animation frame, that runs every measurement
     first and every mutation afterwards. Nothing about the page looks different. */
  const readers = [], writers = [];
  let queued = false, cached = false;
  const frame = () => {
    queued = false;
    const s = { vh: innerHeight, y: window.scrollY || 0, fresh: !cached };
    cached = true;
    for (const r of readers) r(s);          // measure, never mutate
    for (const w of writers) w(s);          // mutate, never measure
  };
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
  // Writing a style property that already holds this value still costs an invalidation.
  const setVar = (el, name, value, last) => {
    if (el[last] === value) return;
    el[last] = value;
    if (name === "opacity") el.style.opacity = value; else el.style.setProperty(name, value);
  };

  /* ---------- nav ---------- */
  const nav = $("#nav"), darkBlock = $(".stance");
  let navScrolled = false, navDark = false;
  readers.push((s) => {
    navScrolled = s.y > 40;
    if (darkBlock) { const r = darkBlock.getBoundingClientRect(); navDark = r.top < 64 && r.bottom > 64; }
  });
  writers.push(() => {
    nav.classList.toggle("is-scrolled", navScrolled);
    if (darkBlock) nav.classList.toggle("on-dark", navDark);
  });

  /* ---------- hero: paper first, then the nib arrives and never stops writing ---------- */
  const nib = $("#nibVideo"), media = $(".hero-media");
  if (nib && media) {
    const og = document.documentElement.classList.contains("og");
    // The video itself is the base layer, so the writing is never cross-faded into or out of.
    // The still only rises on top when the video cannot play (reduced motion, blocked autoplay,
    // OG capture). It is the loop's own first frame, which is also its last, so a viewer who
    // never gets the video sees exactly the picture a viewer who does would have paused on.
    const showStill = () => media.classList.add("is-fallback");
    const reveal = () => media.classList.add("is-ready");
    if (still || og) { showStill(); reveal(); }
    else {
      nib.preload = "auto";
      nib.addEventListener("loadeddata", reveal, { once: true });
      setTimeout(reveal, 2200);                       // never leave the hero covered
      let live = false;
      const start = () => nib.play().then(() => { live = true; }).catch(showStill);
      nib.addEventListener("playing", () => { live = true; }, { once: true });
      if (nib.readyState >= 3) setTimeout(start, 400);
      else nib.addEventListener("canplaythrough", () => setTimeout(start, 400), { once: true });
      setTimeout(() => { if (!live) showStill(); }, 3500);
    }
  }

  // Nothing stopped the hero loop once you had scrolled past it. Harmless at the stand-in's
  // size, much less so at the full render's. Resume only if it was genuinely playing, and
  // swallow a rejected resume rather than popping the fallback still over a working hero.
  if (nib && !still) {
    let played = false;
    nib.addEventListener("playing", () => { played = true; }, { once: true });
    new IntersectionObserver((e) => {
      if (e[0].isIntersecting) { if (played) nib.play().catch(() => {}); } else nib.pause();
    }, { threshold: 0 }).observe($(".hero"));
  }

  /* ---------- scroll reveal ---------- */
  const rvObs = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add("in"); rvObs.unobserve(en.target); }
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  // transitionend bubbles. The film card's play button and its progress bar both finish
  // transitions of their own well inside the card's one-second reveal, and the old listener
  // took any of them as the card's own and stripped the blur off mid-reveal. It was also
  // {once:true}, so a stolen event removed the listener for good — which makes the naive
  // "check the target" fix worse than the bug unless `once` goes too.
  const markDone = (el) => el.addEventListener("transitionend", (e) => {
    if (e.target !== el || e.propertyName !== "filter") return;
    if (el.classList.contains("in")) el.classList.add("rv-done");
  });
  $$(".rv").forEach(el => { rvObs.observe(el); markDone(el); });
  $$("[data-stagger]").forEach(parent => {
    // These only become .rv here, after the query above has already run, so they were
    // never given the listener and kept a filter on them for the life of the page.
    $$(":scope > *", parent).forEach((c, i) => { c.classList.add("rv"); c.style.setProperty("--d", (Math.min(i, 5) * 0.06) + "s"); rvObs.observe(c); markDone(c); });
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
    // With preload="none" the media load algorithm reaches idle and fetches nothing, so
    // this call was inert: the metadata, the seek to START and the first buffering all
    // landed at the moment the card came into view, mid-scroll. Ask for metadata first.
    const load = () => {
      if (loaded) return;
      loaded = true;
      if (film.preload === "none") film.preload = "metadata";
      film.load();
    };
    const START = 18.6;
    film.addEventListener("loadedmetadata", () => { try { if (film.currentTime < 0.5) film.currentTime = START; } catch (_) {} }, { once: true });
    const near = new IntersectionObserver((e) => {
      if (!e[0].isIntersecting) return;
      // The poster is fetched by the image loader regardless of preload, and it is a third
      // of the page's eager bytes for a frame nobody sees: the card is opaque black and the
      // video is clipped shut until it reveals. Attach it 600px of scroll ahead instead.
      if (!film.poster) film.poster = "video/film-poster.jpg";
      if (!still && !saveData) load();
      near.disconnect();
    }, { rootMargin: "600px 0px" });
    near.observe(card);
    const vis = new IntersectionObserver((e) => {
      const on = e[0].intersectionRatio >= 0.35;
      if (on && !still && !saveData) { load(); film.play().catch(() => {}); } else film.pause();
    }, { threshold: [0, 0.35, 0.6] });
    vis.observe(card);
    const syncPlay = () => { const p = film.paused; card.classList.toggle("is-playing", !p); if (playBtn) { playBtn.textContent = p ? "Play" : "Pause"; playBtn.setAttribute("aria-label", p ? "Play the film" : "Pause the film"); } };
    film.addEventListener("play", syncPlay); film.addEventListener("pause", syncPlay);
    if (playBtn) playBtn.addEventListener("click", (e) => { e.stopPropagation(); load(); film.paused ? film.play().catch(() => {}) : film.pause(); });
    film.addEventListener("timeupdate", () => { if (bar && film.duration) bar.style.transform = "scaleX(" + Math.min(1, film.currentTime / film.duration) + ")"; });
    const setSound = (on) => { film.muted = !on; soundBtn.textContent = on ? "Sound off" : "Sound on"; soundBtn.setAttribute("aria-pressed", on ? "true" : "false"); };
    soundBtn.addEventListener("click", (e) => { e.stopPropagation(); load(); setSound(film.muted); if (film.paused) film.play().catch(() => {}); });
    card.addEventListener("click", () => { load(); if (film.muted) { setSound(true); film.play().catch(() => {}); return; } film.paused ? film.play() : film.pause(); });
  }

  /* ---------- how it works: the line draws as you scroll, numbers light in turn ---------- */
  const steps = $("#steps");
  if (steps) {
    const items = $$(".step", steps);
    // Each item used to be measured on every scroll event. Their distance down the rail
    // does not change while you scroll, so it is measured once and reused, and an item
    // that has already lit is never measured again.
    let offsets = null, pending = items.slice(), p = null, top = 0, above = false;
    readers.push((s) => {
      if (narrow.matches) { p = null; return; }   // the rail itself is display:none here
      if (s.fresh) offsets = null;
      const r = steps.getBoundingClientRect();
      // The rail's own fill is always computed: the rect is read either way, and leaving it
      // at a stale value would park the ink line at the wrong length while off screen.
      p = Math.min(1, Math.max(0, (s.vh * 0.7 - r.top) / r.height));
      top = r.top;
      // What is worth skipping is the per-item measuring. Once the section is behind you
      // every step has been read, so light the rest and never measure an item again.
      if (r.bottom < -200) { above = true; return; }
      if (!offsets) offsets = items.map(li => li.getBoundingClientRect().top - r.top);
    });
    writers.push((s) => {
      if (above && pending.length) { pending.forEach(li => li.classList.add("on")); pending = []; }
      if (p === null) return;
      setVar(steps, "--p", p.toFixed(3), "_p");
      if (!pending.length || !offsets) return;
      pending = pending.filter(li => {
        if (top + offsets[items.indexOf(li)] < s.vh * 0.7) { li.classList.add("on"); return false; }
        return true;
      });
    });
  }

  /* ---------- the hero lets go as you leave it ---------- */
  const heroMedia = $(".hero-media"), heroCopy = $(".hero-copy"), heroSec = $(".hero");
  if (heroMedia && heroSec && !still) {
    // The hero's own height only changes when the window does, so it is measured once
    // rather than on every frame of the scroll that leaves it behind.
    let h = 0, p = 0, was = -1;
    readers.push((s) => {
      if (!h || s.fresh) h = heroSec.offsetHeight || s.vh;
      p = Math.min(1, Math.max(0, s.y / h));
    });
    writers.push(() => {
      if (p === 1 && was === 1) return;                 // past the hero: nothing left to do
      was = p;
      setVar(heroMedia, "--drift", (-10 - p * 5).toFixed(2) + "%", "_d");
      setVar(heroMedia, "opacity", (1 - p * 0.35).toFixed(3), "_o");
      if (heroCopy) setVar(heroCopy, "opacity", (1 - p * 1.15).toFixed(3), "_o");
    });
  }

  /* ---------- object plate: a few pixels of parallax, nothing more ---------- */
  const plate = $("#plateImg");
  if (plate && !still) {
    const box = plate.parentElement;
    let py = null;
    readers.push((s) => {
      if (narrow.matches) { py = null; return; }  // the CSS sets transform:none below 800px
      // No off-screen early return here. The rect has already been read by this point, so
      // skipping would save only the arithmetic, and setVar already drops the write when the
      // value has not moved. Computing always keeps the resting offset identical to before.
      const r = box.getBoundingClientRect();
      py = Math.max(-12, Math.min(12, (r.top + r.height / 2 - s.vh / 2) * -0.015));
    });
    writers.push(() => { if (py !== null) setVar(plate, "--py", py.toFixed(1) + "px", "_py"); });
  }

  // One listener for the lot, and one more pass whenever the window changes shape so the
  // cached measurements above are taken again.
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", () => { cached = false; schedule(); }, { passive: true });
  frame();

  /* ---------- email capture (Google Sheets via Apps Script), with the liquid success ---------- */
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx7xuVthOQU0OkO4v6tBCBwHKzJ2E1brT7l3C3pMkXKQ4K1vIaApcCMsipndh6_mJ2Q/exec";
  const setupJoin = (join) => {
    const form = $("form", join), emailEl = $("input[type=email]", join), btn = $(".joinbtn", join);
    const msg = $(".msg", join.parentElement) || $(".msg", join);
    const gooA = $(".goo-a", join), gooB = $(".goo-b", join), doneRow = $(".done", join), doneText = $(".donetext", join);
    let merging = false;
    // Measure both boxes, then place both. Interleaved, this was eight forced layouts.
    const box = (el) => ({ l: el.offsetLeft, t: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    const place = (shape, b) => { shape.style.left = b.l + "px"; shape.style.top = b.t + "px"; shape.style.width = b.w + "px"; shape.style.height = b.h + "px"; };
    const sync = () => { if (merging) return; const a = box(emailEl), b = box(btn); place(gooA, a); place(gooB, b); };
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
