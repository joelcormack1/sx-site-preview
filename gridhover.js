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

  function attach(cfg) {
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

    cfg.tiles.forEach(tile => {
      ensureLoop(tile);
      tile.el.addEventListener('mouseenter', () => enter(tile));
      tile.el.addEventListener('mouseleave', () => leave(tile));
    });

    window.addEventListener('scroll', () => {
      if (active && Math.abs(window.scrollY - startScrollY) > 40) {
        lock = true;
        const t = active;
        leave(t);
      }
    }, { passive: true });
    window.addEventListener('mousemove', () => { lock = false; }, { passive: true });
  }

  window.SXGrid = { attach: attach };
})();
