/* SIXTWENTYSIX — site-wide smooth scroll.
   Rebuilt 2026-08-19 to match the LIVE sixtwentysix.co exactly: the live site
   runs stock Lenis (react-lenis 0.0.47, no options) — per-frame damped lerp
   with lerp = 0.1 at 60fps, wheelMultiplier 1, driven by a rAF ticker. We
   reproduce Lenis's math (frame-rate-normalized exponential damping) on the
   real window scroll so sticky headers, morphs, fade-ins and steppers all
   keep working. Keyboard, scrollbar drags and programmatic scrolls stay
   native, same as before. */
(function () {
  if (location.search.includes('reveal=1')) return; // captures stay static
  /* Browser scroll anchoring fights a scripted scroll: when images lazy-load
     or boxes resize, Chrome silently re-seats scrollY (seen 8/23: the page
     drifted ~300px up on its own after the reel moment settled). The engine
     owns the scroll position — anchoring is off site-wide. */
  document.documentElement.style.overflowAnchor = 'none';
  var target = window.scrollY;
  var wanted = window.scrollY;  // the user's unclamped intent (8/21: the pace
                                // cap is re-applied EVERY FRAME from this, so
                                // the page rides a rising cap smoothly instead
                                // of lurching once per wheel event)
  var current = window.scrollY;
  var animating = false;
  var last = 0;
  /* Lenis: value = lerp(value, target, 1 - exp(-DECAY * dt)) where the decay
     constant reproduces lerp 0.1 per frame at 60fps: -ln(1 - 0.1) * 60. */
  var DECAY = 4.6; // Joel 8/21: slower, silkier tempo (was 6.3244 = Lenis lerp 0.1; this ~ lerp 0.074)

  function max() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function tick(now) {
    var dt = Math.min(0.05, (now - last) / 1000) || 1 / 60;
    last = now;
    var cap = window.SX_SCROLL_CAP;
    var pull = window.SX_SCROLL_PULL;
    if (pull != null) {
      /* reverse choreography: the animation DRAGS the page to the top in
         lockstep (Joel 8/21 — the grow IS the arrival) */
      wanted = Math.min(wanted, pull);
      target = wanted;
    } else if (cap != null) {
      /* NO banked intent (Joel 8/21: releasing a +200 bank slingshotted the
         page into the work section). While the play holds the page, extra
         wheeling is discarded — on release you continue at your real,
         current scroll speed only. */
      wanted = Math.min(wanted, cap);
      target = wanted;
    } else {
      target = Math.min(wanted, max());
    }
    /* SX_SCROLL_DRIVE (Joel 8/22, about reel): an AUTO-GLIDE destination —
       once set, the page carries ITSELF there on the damper ("you start to
       scroll and then boom, zoom, tada"). Cleared on arrival, or instantly
       by any upward wheel (the user can always take back the controls). */
    var drv = window.SX_SCROLL_DRIVE;
    if (drv != null && pull == null) {
      drv = Math.min(drv, max());
      /* calm glide (Joel 8/22): capped cruise speed — the damper snapping
         at a distant target spiked the start and read as a jolt. Now it
         cruises at ~850px/s and eases out into the landing. */
      var glide = 850 / DECAY;
      target = Math.min(drv, current + glide);
      wanted = target;
      if (Math.abs(current - drv) < 1) window.SX_SCROLL_DRIVE = null;
    }
    /* SX_SCROLL_MAXV (Joel 8/22, services stepper): a SPEED LIMIT in px/s,
       both directions. The damper chases an offset of maxv/DECAY, which
       yields a steady-state speed of ~maxv — the page keeps moving the
       whole time the user scrolls, it just can't rip through a section.
       Extra intent is discarded (no banking, no slingshot on release). */
    var mv = window.SX_SCROLL_MAXV;
    if (mv != null && pull == null) {
      var lim = mv / DECAY;
      if (target > current + lim) { target = current + lim; wanted = target; }
      else if (target < current - lim) { target = current - lim; wanted = target; }
    }
    current += (target - current) * (1 - Math.exp(-DECAY * dt));
    var pacing = (cap != null && wanted > target) || (pull != null && current > target) ||
                 (window.SX_SCROLL_DRIVE != null); // still riding: stay alive
    if (Math.abs(target - current) < 0.6 && !pacing) {
      current = target;
      animating = false;
    }
    window.scrollTo(0, Math.round(current));
    if (animating) requestAnimationFrame(tick);
  }

  window.addEventListener('wheel', function (e) {
    if (e.ctrlKey) return; // pinch-zoom
    if (window.SX_SCROLL_LOCKED) {
      /* menu open: the page stays locked, but a scrollable INSIDE the menu
         (the search results, 9/3) keeps its native wheel */
      if (e.target && e.target.closest && e.target.closest('#menu-results')) return;
      e.preventDefault(); return;
    }
    e.preventDefault();
    if (!animating) { current = window.scrollY; }
    /* Firefox physical mice fire line-mode deltas (deltaMode 1, ~3 lines per
       notch) — unnormalized, the page moved ~3px per notch while native
       scroll was suppressed (bug hunt 8/21). Same normalization as Lenis. */
    var dy = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
    dy *= 0.6; // Joel 8/21: whole-site scroll at a slower, deliberate tempo (was 1, then 0.75)
    /* SX_WHEEL_ZONE (9/3, Joel: "2 scrolls max to open the bottom part but
       still feel soft"): a page may declare an entrance zone where wheel
       intent counts for more — the homepage sets {until: CONTENT_OFFSET,
       mult: 2} so two firm gestures carry the whole intro. The DAMPER is
       untouched, so the glide feels exactly as soft; the boost tapers off
       over the last `taper` px so the hand-feel never steps. */
    var z = window.SX_WHEEL_ZONE;
    if (z && current < z.until) {
      var zk = Math.max(0, Math.min(1, (z.until - current) / (z.taper || 250)));
      dy *= 1 + ((z.mult || 2) - 1) * zk;
    }
    window.SX_WHEEL_DIR = dy < 0 ? -1 : 1; // the header morph reads intent
    if (window.SX_SCROLL_DRIVE != null && dy < 0) window.SX_SCROLL_DRIVE = null; // fighting up releases the glide
    wanted = Math.max(0, Math.min(max(), wanted + dy)); // wheelMultiplier 1; the tick derives target from this every frame
    if (!animating) {
      animating = true;
      last = performance.now();
      requestAnimationFrame(tick);
    }
  }, { passive: false });

  /* Outside input (keyboard, anchor jumps, scripts) resets the baseline so
     the next wheel starts from wherever the page really is. */
  window.addEventListener('scroll', function () {
    if (!animating) { target = window.scrollY; wanted = window.scrollY; current = window.scrollY; }
  }, { passive: true });
})();
