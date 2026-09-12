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

  /* THE ONE INTENT PATH (9/12). Every input pushes scroll intent through
     here, so the entrance zone, the direction flag, the auto-glide release
     and the rAF tick (and therefore every cap and speed limit above) apply
     to touch and wheel by construction. They cannot drift apart again. */
  function push(dy) {
    if (!animating) { current = window.scrollY; }
    var z = window.SX_WHEEL_ZONE;
    if (z && current < z.until) {
      var zk = Math.max(0, Math.min(1, (z.until - current) / (z.taper || 250)));
      dy *= 1 + ((z.mult || 2) - 1) * zk;
    }
    window.SX_WHEEL_DIR = dy < 0 ? -1 : 1; // the header morph reads intent
    if (window.SX_SCROLL_DRIVE != null && dy < 0) window.SX_SCROLL_DRIVE = null; // fighting up releases the glide
    wanted = Math.max(0, Math.min(max(), wanted + dy)); // the tick derives target from this every frame
    if (!animating) {
      animating = true;
      last = performance.now();
      requestAnimationFrame(tick);
    }
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
       still feel soft"): a page may declare an entrance zone where scroll
       intent counts for more — the homepage sets {until: CONTENT_OFFSET,
       mult: 2} so two firm gestures carry the whole intro. Applied inside
       push(), along with the damper, which is untouched: the glide feels
       exactly as soft, and the boost tapers over the last `taper` px so the
       hand-feel never steps. */
    push(dy); // wheelMultiplier 1
  }, { passive: false });

  /* ===================== TOUCH (2026-09-12) =====================
     Jake's iPad (Magic Keyboard, but he also taps the screen). view.html serves the desktop canvas to anything wider
     than a phone, but every cap, glide and speed limit above lived in the
     WHEEL handler alone, and a finger fires no wheel event. Measured on an
     emulated iPad against the same page: touch moved 280px per frame
     (~16,800 px/s) where the wheel engine holds 32-36px per frame
     (~2,100 px/s). That is an eight-fold overspeed on every scroll-scrubbed
     animation on the site — the 9/4 "it shrinks and flashes" morph bug,
     never fixed on touch because the fix (SX_SCROLL_MAXV) lives in here.
     Touch now pushes through the same push() as the wheel, so the intro,
     the morph, the reel and the stepper run at their designed pace.

     Escape hatch: ?nativescroll=1 hands scrolling back to the browser
     untouched, for when the engine misbehaves on a real device. */
  /* WHICH HAND IS ON THE WHEEL (9/12 pm, Jake: "can we have it work off a
     trackpad as if its a laptop, i have the ipad with the keyboard and
     trackpad. thats what i was using"). The morning's pass gated everything
     on matchMedia('(pointer: coarse)'), which is wrong for exactly that
     setup: iPadOS reports a coarse PRIMARY pointer even with a Magic
     Keyboard attached, so the device tells you nothing about what the hand
     is actually doing. The EVENT does. A trackpad reports pointerType
     'mouse' and fires wheel events; a finger reports 'touch'. Tracked live,
     so the same iPad switches between the two mid-session. */
  window.SXInput = { mode: 'mouse' };
  var mark = function (m) { return function () { window.SXInput.mode = m; }; };
  window.addEventListener('touchstart', mark('touch'), { passive: true, capture: true });
  window.addEventListener('wheel', mark('mouse'), { passive: true, capture: true });
  window.addEventListener('pointerdown', function (e) {
    window.SXInput.mode = e.pointerType === 'touch' ? 'touch' : 'mouse';
  }, { passive: true, capture: true });
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'touch') window.SXInput.mode = 'mouse';
  }, { passive: true, capture: true });

  /* A touchscreen device INSTALLS the touch transport, but the transport
     only ever engages on a real touchstart — a trackpad never fires one, so
     on Jake's iPad the wheel path below runs exactly as it does on a
     laptop, and the finger path is there for when he taps the screen. */
  var COARSE = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  if (COARSE && location.search.indexOf('nativescroll=1') === -1) {
    /* Regions that scroll THEMSELVES keep the browser's own touch handling:
       the menu's search results and the director bio box. Everything else
       belongs to the engine. */
    var NATIVE_SEL = '#menu-results, .h-about.scroll';
    var st = document.createElement('style');
    st.textContent = 'html { touch-action: pinch-zoom; }' +
                     NATIVE_SEL + ' { touch-action: auto; }';
    /* set only once the listeners below are live — with pan disabled and no
       handler, the page could not scroll at all */
    var inNative = function (t) {
      return !!(t && t.closest && t.closest(NATIVE_SEL));
    };

    var tY = 0, tT = 0, tV = 0, riding = false, hovered = null;

    window.addEventListener('touchstart', function (e) {
      riding = e.touches.length === 1 && !inNative(e.target);
      if (!riding) return;
      tY = e.touches[0].clientY;
      tT = performance.now();
      tV = 0;
      /* a finger down takes the page back from any fling or auto-glide:
         drop banked intent so the touch starts from where the page IS */
      wanted = animating ? current : window.scrollY;
      window.SX_SCROLL_DRIVE = null;
    }, { passive: true });

    window.addEventListener('touchmove', function (e) {
      if (!riding || e.touches.length !== 1) return;
      if (inNative(e.target)) return;
      if (window.SX_SCROLL_LOCKED) { e.preventDefault(); return; } // menu open
      e.preventDefault();
      var y = e.touches[0].clientY;
      var now = performance.now();
      var dy = tY - y;                       // finger up = page down
      var dt = Math.max(1, now - tT);
      /* clientY inside the frame is already in 1728-canvas units (view.html
         scales the whole iframe), so the finger tracks the content 1:1 and
         what is under it stays under it. No multiplier, unlike the wheel. */
      var inst = dy / dt * 1000;
      tV = tV ? tV * 0.4 + inst * 0.6 : inst;  // smoothed, for the release
      tY = y; tT = now;
      push(dy);
    }, { passive: false });

    window.addEventListener('touchend', function () {
      if (!riding) return;
      riding = false;
      if (window.SX_SCROLL_LOCKED) return;
      /* Fling. The damper settles an offset of v/DECAY, so handing it
         v/DECAY reproduces the release velocity exactly and then eases out
         into the landing — the same curve a wheel flick rides. Capped, and
         still subject to every SX_SCROLL_* limit inside the tick. */
      if (performance.now() - tT < 100 && Math.abs(tV) > 200) {
        push(Math.max(-4200, Math.min(4200, tV)) / DECAY);
      }
    }, { passive: true });

    window.addEventListener('touchcancel', function () { riding = false; }, { passive: true });

    /* STUCK HOVER RELEASE (site-wide). Tapping anything on a touch screen
       fires mouseover/mouseenter and then NEVER fires mouseleave, so every
       hover state OUTSIDE the grid engine latches on: the creatives and
       director ledger rows stay lit with their siblings dimmed, the
       experiential cards stay dimmed, the press and testimonial rails stay
       paused, the director hero keeps its preview class, the homepage tile
       keeps playing. That is a dozen handlers across six pages; rather than
       edit each one, hand the browser's debt back on the next touch — which
       includes the touch that begins a scroll, so swiping away clears it
       too. An over-eager release heals itself, because the browser re-fires
       mouseenter on whatever the finger actually landed on. */
    document.addEventListener('mouseover', function (e) { hovered = e.target; }, true);
    window.addEventListener('touchstart', function (e) {
      var old = hovered, tgt = e.target;
      if (!old || old === tgt || old.nodeType !== 1) return;
      hovered = null;
      old.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      for (var n = old; n && n.nodeType === 1; n = n.parentElement) {
        if (n.contains(tgt)) break;  // the hover legitimately continues here
        n.dispatchEvent(new MouseEvent('mouseleave'));
      }
    }, { passive: true });

    (document.head || document.documentElement).appendChild(st);
  }

  /* Outside input (keyboard, anchor jumps, scripts) resets the baseline so
     the next wheel starts from wherever the page really is. */
  window.addEventListener('scroll', function () {
    if (!animating) { target = window.scrollY; wanted = window.scrollY; current = window.scrollY; }
  }, { passive: true });
})();
