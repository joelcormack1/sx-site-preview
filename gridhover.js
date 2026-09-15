/* SIXTWENTYSIX — THE grid hover engine (2026-08-20).
   One implementation of the hover law for every grid on the site, ending the
   era of four hand-copied versions drifting apart (Joel: "home is great,
   other pages are totally different — why?" This file is why-not-anymore.)

   THE LAW (from the homepage, made global):
   - ONE scale intent: 1.3475, every tile, every density.
   - NEVER overlap another rectangle: the engine reads the real positions of
     all tiles in the grid at hover time, finds the tightest column/row gaps,
     and trims the scale so the enlarged box cannot touch a neighbor —
     including edge columns, whose entire growth lands on one side.
   - Anchoring: first row grows down, last row grows up, middle rows from
     center; horizontal growth is centered, clamped to the grid bounds.
   - Labels ride: each tile's caps re-seat under the enlarged box, lit; all
     other tiles and caps dim via the ghost class (never to 0%).
   - Timing lives in CSS (0.7s ease-in-out on the tiles/caps).
   - A real scroll (>40px) exits the hover; the tile under the cursor cannot
     re-enter until the mouse moves.

   Usage (per page, after tiles exist):
     SXGrid.attach({
       tiles: [{ el, caps: [{ el, gap }, ...] }, ...],
       ghost: { el: document.body, cls: 'ghost' },   // container + class
       bounds: { left, right },                       // horizontal rail
       scale: 1.3475, margin: 14, labelBand: 58,
       onEnter(tile), onLeave(tile)                   // page-specific extras
     })
   Geometry is read live from each tile's inline left/top/width/height, so
   relayouts (density toggles) need no re-attach. */
(function () {
  const SCALE = 1.3475, MARGIN = 14, LABEL_BAND = 58;
  /* A trackpad gets the full desktop hover law even on an iPad; a finger
     never does. Decided per event from pointerType, never from the device
     (see the note in smoothscroll.js). */
  const POINTER = 'onpointerenter' in window;
  const fromTouch = e => e && e.pointerType === 'touch';

  /* THE LOOP LAW (Joel 8/24): every work tile on the site plays its own
     spot on hover, the way the homepage does. Any tile attached with a
     data-loop attribute gets a muted <video> laid over its still; enter()
     fades it in and plays, leave() pauses. preload="none" keeps the page
     from downloading two dozen videos up front. The homepage builds its
     own video markup (it is the reference implementation); the engine
     drives play/pause for that too, so behavior can never drift. */
  const LOOP_CSS = `
    .sxloop { position:absolute; inset:0; width:100%; height:100%;
              object-fit:cover; opacity:0; transition:opacity 0.3s ease;
              pointer-events:none; }
    .is-hover .sxloop, *:hover > .sxloop { opacity:1; }`;
  let loopCssIn = false;
  function ensureLoop(tile) {
    if (!tile.el.dataset.loop || tile.el.querySelector('video')) return;
    if (!loopCssIn) {
      const st = document.createElement('style');
      st.textContent = LOOP_CSS;
      document.head.appendChild(st);
      loopCssIn = true;
    }
    const v = document.createElement('video');
    v.className = 'sxloop';
    v.loop = true; v.muted = true; v.playsInline = true; v.preload = 'none';
    v.src = tile.el.dataset.loop;
    tile.el.appendChild(v);
  }

  function rectOf(el) {
    return {
      x: parseFloat(el.style.left), y: parseFloat(el.style.top),
      w: parseFloat(el.style.width), h: parseFloat(el.style.height),
    };
  }

  /* 9/14 (Joel, iPad: "when you click on a thumbnail, sometimes other
     thumbnails do not lower in opacity, typically 1 or 2 per click"): the
     scroll reveal (.fd.seen) hands every tile a staggered transition-delay
     (--fd, up to a third of a second per column) and the ghost dim
     inherited it, so the last column dimmed late or, under a quick second
     tap, not visibly at all. The dim is immediate on every grid. */
  const GHOST_CSS = `
    .ghost .work-thumb:not(.is-hover), .ghost .g-tile:not(.is-hover), .ghost .cs-tile:not(.is-hover),
    .ghost .wtitle:not(.is-hover), .ghost .wdir:not(.is-hover), .ghost .g-cap:not(.is-hover),
    .ghost .cs-tcap:not(.is-hover) { transition-delay: 0s !important; }`;
  let ghostCssIn = false;
  function attach(cfg) {
    if (!ghostCssIn) {
      ghostCssIn = true;
      const gs = document.createElement('style');
      gs.textContent = GHOST_CSS;
      document.head.appendChild(gs);
    }
    const scale = cfg.scale || SCALE;
    const margin = cfg.margin || MARGIN;
    const band = cfg.labelBand || LABEL_BAND;
    let lock = false, active = null, startScrollY = 0;

    function grid() {
      const rs = cfg.tiles.map(t => ({ t, r: rectOf(t.el) })).filter(o => !isNaN(o.r.x));
      const xs = [...new Set(rs.map(o => Math.round(o.r.x)))].sort((a, b) => a - b);
      // cluster row tops (frames jitter rows by a few px)
      const ys = [];
      rs.map(o => o.r.y).sort((a, b) => a - b).forEach(y => {
        if (!ys.length || y - ys[ys.length - 1][0] > 30) ys.push([y]);
        else ys[ys.length - 1].push(y);
      });
      const rows = ys.map(g => g[0]);
      let gapX = Infinity, gapY = Infinity;
      for (let i = 1; i < xs.length; i++) {
        const wLeft = Math.max(...rs.filter(o => Math.round(o.r.x) === xs[i - 1]).map(o => o.r.w));
        gapX = Math.min(gapX, xs[i] - xs[i - 1] - wLeft);
      }
      for (let i = 1; i < rows.length; i++) {
        const hAbove = Math.max(...rs.filter(o => Math.abs(o.r.y - rows[i - 1]) <= 30).map(o => o.r.h));
        gapY = Math.min(gapY, rows[i] - rows[i - 1] - hAbove);
      }
      return { rs, xs, rows, gapX, gapY };
    }

    function enter(tile) {
      if (lock) return;
      const g = grid();
      const me = g.rs.find(o => o.t === tile);
      if (!me) return;
      const { x, y, w, h } = me.r;
      tile.base = { x, y, w, h,
        caps: (tile.caps || []).map(c => ({ left: c.el.style.left, top: c.el.style.top })) };
      active = tile;
      startScrollY = window.scrollY;

      /* THE LAW: fit the scale to the tile's OWN adjacent gaps (8/21).
         Frames carry uneven column gaps (e.g. 156 vs 134); the old global-
         min clamp made the leftover clearance differ per side. Growing into
         each tile's actual gaps and centering BETWEEN its real neighbors
         makes the breathing room read identical everywhere. */
      /* FIX (8/23, served copy only): gaps must come from SAME-ROW
         neighbors. The global xs column list breaks the moment a short
         last row is centered (the 8/22 centering law seats its lone tile
         at x639, which reads as a phantom column and drives the middle
         tile's gapL to -421 => scale clamps to 1 and the seat slides to
         926.5 instead of growing). Same-row neighbors make every branch
         below (edge / interior / lone) come out right by construction. */
      const myRowTop = g.rows.find(r => Math.abs(r - y) <= 30);
      const rowTiles = g.rs
        .filter(o => Math.abs(o.r.y - myRowTop) <= 30)
        .sort((a, b) => a.r.x - b.r.x);
      const myIdx = rowTiles.findIndex(o => o.t === tile);
      const leftN = myIdx > 0 ? rowTiles[myIdx - 1].r : null;
      const rightN = myIdx >= 0 && myIdx < rowTiles.length - 1 ? rowTiles[myIdx + 1].r : null;
      const gapL = leftN ? x - (leftN.x + leftN.w) : null;
      const gapR = rightN ? rightN.x - (x + w) : null;
      let f = scale;
      if (gapL === null && gapR !== null)      f = Math.min(f, 1 + Math.max(0, gapR - margin) / w);
      else if (gapR === null && gapL !== null) f = Math.min(f, 1 + Math.max(0, gapL - margin) / w);
      else if (gapL !== null && gapR !== null) f = Math.min(f, 1 + Math.max(0, gapL + gapR - 2 * margin) / w);
      if (g.rows.length > 1 && isFinite(g.gapY)) {
        f = Math.min(f, 1 + Math.max(0, g.gapY - band) / h);
      }
      f = Math.min(f, (cfg.bounds.right - cfg.bounds.left) / w); // never wider than the rail
      const ew = w * f, eh = h * f;

      // anchoring
      const rowIdx = g.rows.findIndex(r => Math.abs(r - y) <= 30);
      let et;
      if (g.rows.length === 1 || rowIdx === 0) et = y;
      else if (rowIdx === g.rows.length - 1)   et = y + h - eh;
      else                                     et = y + (h - eh) / 2;
      let el;
      if (gapL === null && gapR !== null)      el = x;                 // left edge: grow right only
      else if (gapR === null && gapL !== null) el = x + w - ew;        // right edge: grow left only
      else if (gapL !== null && gapR !== null)                          // interior: center between neighbors
        el = (x - gapL) + (gapL + w + gapR - ew) / 2;
      else                                      el = x + (w - ew) / 2; // single column
      el = Math.max(cfg.bounds.left, Math.min(cfg.bounds.right - ew, el));

      if (cfg.ghost) cfg.ghost.el.classList.add(cfg.ghost.cls);
      tile.el.classList.add('is-hover');
      Object.assign(tile.el.style, { left: el + 'px', top: et + 'px', width: ew + 'px', height: eh + 'px' });
      /* remember exactly what WE wrote so leave() can tell if a relayout
         rewrote the tile mid-hover. Read the values BACK from the style
         object — the browser re-serializes long floats, and comparing
         against our own strings made every leave look "touched", which
         left tiles stuck enlarged (the 8/21 scroll-hover bug). */
      const w1 = tile.el.style;
      tile.applied = { left: w1.left, top: w1.top, width: w1.width, height: w1.height };
      (tile.caps || []).forEach(c => {
        c.el.classList.add('is-hover');
        Object.assign(c.el.style, { left: el + 'px', top: (et + eh + c.gap) + 'px' });
      });
      const v = tile.el.querySelector('video');
      if (v) v.play().catch(() => {});
      if (cfg.onEnter) cfg.onEnter(tile);
    }

    function leave(tile) {
      if (active === tile) active = null;
      if (cfg.ghost) cfg.ghost.el.classList.remove(cfg.ghost.cls);
      tile.el.classList.remove('is-hover');
      const b = tile.base, a = tile.applied, st = tile.el.style;
      /* if the tile's geometry is no longer what the engine set, an external
         relayout (density toggle) repositioned it mid-hover — that layout
         owns the tile now; restoring the remembered base would strand it at
         the OLD grid's position (the 8/20 stray-tile glitch) */
      const untouched = !a || (st.left === a.left && st.top === a.top &&
                               st.width === a.width && st.height === a.height);
      if (b && untouched) {
        Object.assign(st, { left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px' });
        (tile.caps || []).forEach((c, i) => {
          c.el.classList.remove('is-hover');
          if (b.caps && b.caps[i]) Object.assign(c.el.style, { left: b.caps[i].left, top: b.caps[i].top });
        });
      } else {
        (tile.caps || []).forEach(c => c.el.classList.remove('is-hover'));
      }
      const v = tile.el.querySelector('video');
      if (v) v.pause();
      if (cfg.onLeave) cfg.onLeave(tile);
    }

    /* TOUCH (9/12). There is no hover on a finger, and pretending otherwise
       is what broke Jake's iPad: a tap fires mouseenter, so the tile grew
       to 851px and ghosted the whole grid, and mouseleave never came. Worse,
       the scroll-exit below then set lock = true, which only ever clears on
       mousemove — so after one tap and one scroll, NO tile previewed again
       for the rest of the page. Verified: tap 1 grows, scroll, tap 3 does
       nothing, inject a mousemove and it works again.

       So a FINGER no longer gets the grow/ghost choreography and a tap is
       just a tap, while a trackpad or mouse gets the law untouched — on the
       same iPad, switching freely. For the finger the loop law still holds
       in the only way touch allows: the tile nearest the middle of the
       screen plays its own spot, one at a time, so the page still moves
       without asking an iPad to decode a dozen videos at once. */
    cfg.tiles.forEach(tile => {
      ensureLoop(tile);
      if (POINTER) {
        tile.el.addEventListener('pointerenter', e => { if (!fromTouch(e)) enter(tile); });
        tile.el.addEventListener('pointerleave', e => { if (!fromTouch(e)) leave(tile); });
      } else {
        tile.el.addEventListener('mouseenter', () => enter(tile));
        tile.el.addEventListener('mouseleave', () => leave(tile));
      }
    });

    /* PRESS AND HOLD (9/14, Joel: "on the iPad or any touch screen, if you
       press and hold on an image it will play the loop animation as hover on
       the computer, and then when you click on it again it will take you to
       the site itself"). A finger held still on a tile for 260ms gets the
       full hover law — grow, ghost the rest, play its loop — and that press
       does NOT open the work. The next tap on the held tile opens it; a tap
       elsewhere, a scroll, or a hold on another tile releases it. The
       finger's long-press callout (save image / open link) is suppressed so
       the hold reads as a preview, not a menu. */
    if (POINTER) {
      if (!attach.holdCss) {
        attach.holdCss = true;
        const st = document.createElement('style');
        st.textContent = '.sx-holdable { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }';
        document.head.appendChild(st);
      }
      let held = null;      /* the tile currently previewing from a hold */
      let timer = null, press = null;
      const release = () => {
        if (held) { const h = held; held = null; leave(h); }
      };
      /* THE SWITCH (9/14, Joel: "when you click on one thumbnail then click
         on another, for about half a second all of the opacity goes back to
         100% before fading again"): moving the preview from one tile to
         another used to release the first at pointerdown and light the
         second at click — two events, a tap delay apart, so the ghost
         dropped between them and every tile faded up and back down. The
         hand-off now happens in ONE synchronous step (leave, then enter, in
         the same task): the ghost class is removed and put back before the
         browser ever paints, so the rest of the grid never brightens. */
      const switchTo = tile => {
        if (held && held !== tile) { const h = held; held = null; leave(h); }
        lock = false;
        enter(tile);
        held = tile;
      };
      const onATile = target => cfg.tiles.some(t => t.el.contains(target));
      const cancelPress = () => { clearTimeout(timer); timer = null; press = null; };
      cfg.tiles.forEach(tile => {
        tile.el.classList.add('sx-holdable');
        tile.el.addEventListener('contextmenu', e => { if (window.SXInput && window.SXInput.mode === 'touch') e.preventDefault(); });
        tile.el.addEventListener('pointerdown', e => {
          if (!fromTouch(e)) return;
          cancelPress();
          /* 9/14: a finger that landed to stop the page mid-glide (Joel:
             "loops still sometimes play when you scroll") gets no hold
             timer and its click is swallowed below */
          if (window.SXInput && window.SXInput.stopper) { press = { tile, stopper: true }; return; }
          press = { tile, x: e.clientX, y: e.clientY, fired: false };
          timer = setTimeout(() => {
            if (!press || press.tile !== tile) return;
            press.fired = true;
            switchTo(tile);
          }, 260);
        });
        tile.el.addEventListener('pointermove', e => {
          if (!fromTouch(e) || !press || press.tile !== tile) return;
          if (Math.abs(e.clientX - press.x) > 10 || Math.abs(e.clientY - press.y) > 10) cancelPress();
        });
        tile.el.addEventListener('pointerup', e => { if (fromTouch(e)) { clearTimeout(timer); timer = null; } });
        tile.el.addEventListener('pointercancel', () => cancelPress());
        /* the click that ends the hold is not a click on the work */
        tile.el.addEventListener('click', e => {
          if (((window.SXInput && window.SXInput.mode) || 'mouse') !== 'touch') return;
          if (press && press.tile === tile && press.stopper) {
            e.preventDefault(); e.stopPropagation();
            press = null;
            return;
          }
          if (press && press.tile === tile && press.fired) {
            e.preventDefault(); e.stopPropagation();
            press = null;
            return;
          }
          press = null;
          /* a plain tap on a tile that is NOT being held: on a touch screen
             the first tap previews (same as the hold), the second opens */
          if (held !== tile) {
            e.preventDefault(); e.stopPropagation();
            switchTo(tile);
          }
        }, true);
      });
      /* a tap anywhere else, or a real scroll, ends the preview */
      document.addEventListener('pointerdown', e => {
        if (!fromTouch(e) || !held) return;
        /* a finger landing on ANOTHER tile of this grid is a switch, handled
           in one step by that tile's own tap; only a tap elsewhere lets go */
        if (!held.el.contains(e.target) && !onATile(e.target)) release();
      }, true);
      window.addEventListener('scroll', () => {
        if (held && Math.abs(window.scrollY - startScrollY) > 40) release();
      }, { passive: true });
    }
    touchLoops(cfg.tiles); // idle unless the last input was a real finger

    window.addEventListener('scroll', () => {
      if (active && Math.abs(window.scrollY - startScrollY) > 40) {
        lock = true;
        const t = active;
        leave(t);
      }
    }, { passive: true });
    /* the scroll-exit lock releases on any real pointer movement. It used to
       listen for mousemove alone, which a finger never sends — that is what
       left the whole grid dead after one tap and one scroll. */
    window.addEventListener('mousemove', () => { lock = false; }, { passive: true });
    window.addEventListener('pointermove', e => { if (!fromTouch(e)) lock = false; }, { passive: true });
  }

  /* One loop at a time, on the tile closest to the middle of the viewport.
     Re-evaluated on scroll (rAF-throttled) and re-registrable, since the
     density toggles rebuild their tiles and call attach again. */
  let touchSet = [], touchQueued = false, touchPlaying = null;
  function touchLoops(tiles) {
    /* 9/14 (Joel: "some of the thumbnails are playing their webloops
       without being clicked on, that needs to be fixed asap"): the 9/12
       centre-of-screen autoplay is retired. On a touch screen a loop plays
       only when the finger asks — a tap or a hold on that tile (the
       press-and-hold law above). Nothing plays on its own. */
    return;
    /* The homepage builds its own <video> markup inline (it is the reference
       implementation and carries no data-loop), so match on either. Missing
       this left the most important page on the site with no loops at all. */
    touchSet = tiles.filter(t => t.el.dataset.loop || t.el.querySelector('video'));
    if (!touchSet.length) return;
    if (!touchLoops.wired) {
      touchLoops.wired = true;
      /* the homepage reveals its loop with .work-thumb:hover video, which a
         finger can never satisfy honestly — give is-hover the same power */
      const st = document.createElement('style');
      st.textContent = '.work-thumb.is-hover video, .g-tile.is-hover video,' +
                       '.h-thumb.is-hover video { opacity: 1; }';
      document.head.appendChild(st);
      const queue = () => {
        if (touchQueued) return;
        touchQueued = true;
        requestAnimationFrame(() => { touchQueued = false; pickLoop(); });
      };
      window.addEventListener('scroll', queue, { passive: true });
      /* the stuck-hover release in smoothscroll.js pauses whatever a tap
         played; re-assert the centre tile once the finger lifts */
      window.addEventListener('touchend', queue, { passive: true });
    }
    pickLoop();
  }
  function pickLoop() {
    /* stands down the moment a trackpad or mouse takes over: hover owns the
       loops then, and two engines driving the same videos would fight */
    if (((window.SXInput && window.SXInput.mode) || 'mouse') !== 'touch') {
      if (touchPlaying) {
        touchPlaying.el.classList.remove('is-hover');
        const pv0 = touchPlaying.el.querySelector('video');
        if (pv0) pv0.pause();
        touchPlaying = null;
      }
      return;
    }
    const mid = window.innerHeight / 2;
    let best = null, bestD = Infinity;
    touchSet.forEach(t => {
      const r = t.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestD) { bestD = d; best = t; }
    });
    if (best === touchPlaying) {
      const v0 = best && best.el.querySelector('video');
      if (v0 && v0.paused) v0.play().catch(() => {}); // re-assert after a tap release
      return;
    }
    if (touchPlaying) {
      touchPlaying.el.classList.remove('is-hover');
      const pv = touchPlaying.el.querySelector('video');
      if (pv) pv.pause();
    }
    touchPlaying = best;
    if (!best) return;
    best.el.classList.add('is-hover');
    const v = best.el.querySelector('video');
    if (v) v.play().catch(() => {});
  }

  window.SXGrid = { attach: attach };
})();
