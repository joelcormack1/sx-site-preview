/* SIXTWENTYSIX — shared hover takeover (2026-08-10).
   Joel's standing rule from the 8/10 review: anywhere there is a grid of work,
   hovering a tile must behave like the homepage — the rest of the page goes
   black, the tile enlarges (the reel would play there), everything else dims.

   Pages register their tiles via SXTakeover(config). The homepage keeps its own
   bespoke implementation (it predates this and carries extra header logic);
   this file serves case-studies, experiential and director.

   Growth follows the "box" rule from the same review: the first row grows
   DOWN, the last row grows UP, middle rows grow from center — tiles always
   expand toward the inside of the grid and never overlap a neighbor. */
(function () {
  const style = document.createElement('style');
  style.textContent = `
    /* Everything that changes color during a takeover TRANSITIONS there —
       the instant snap was the "jolt" Joel flagged on 8/10 (the homepage was
       smooth because its page already carried these transitions). */
    body, .page { transition: background 0.6s ease; }
    .hdr { transition: background 0.6s ease; }
    .footer { transition: background 0.6s ease; }
    .hdr .hdr-menu, .hdr .nav-sm, .hdr .hdr-search { transition: color 0.5s ease; }
    .hdr .hdr-logo img { transition: filter 0.6s ease; }
    .footer .foot-cta, .footer .foot-col { transition: color 0.5s ease; }
    .footer .foot-mark img { transition: filter 0.6s ease; }

    body.takeover, body.takeover .page { background: #000; }
    body.takeover .hdr { background: #000; }
    body.takeover .hdr .hdr-menu, body.takeover .hdr .nav-sm,
    body.takeover .hdr .hdr-search { color: #fff; }
    body.takeover .hdr .hdr-logo img { filter: invert(1); }
    body.takeover .footer { background: #fff; }
    body.takeover .footer .foot-cta, body.takeover .footer .foot-col { color: #000; }
    body.takeover .footer .foot-mark img { filter: brightness(0); }
    /* generic content dim: pages tag non-grid content with .tk-page so text
       fades out of the way during a takeover */
    .tk-page { transition: opacity 0.5s ease; }
    body.takeover .tk-page { opacity: 0.1; }

    .tk-tile {
      /* will-change keeps every tile pre-rasterized on its own layer, so the
         first hover does not stall while the browser builds 6+ blurred
         copies — the other half of the jolt. */
      will-change: opacity, filter;
      transition: left 0.55s cubic-bezier(0.4,0,0.2,1), top 0.55s cubic-bezier(0.4,0,0.2,1),
                  width 0.55s cubic-bezier(0.4,0,0.2,1), height 0.55s cubic-bezier(0.4,0,0.2,1),
                  transform 0.55s cubic-bezier(0.4,0,0.2,1),
                  opacity 0.5s ease, filter 0.5s ease, border-radius 0.5s ease, box-shadow 0.6s ease;
    }
    body.takeover .tk-tile { opacity: 0.17; filter: blur(3.75px); border-radius: 14px; }
    body.takeover .tk-tile.tk-on {
      opacity: 1; filter: none; z-index: 60;
      box-shadow: 0px 0px 103.7px 0px rgba(255,255,255,0.25);
    }
    .tk-cap { transition: opacity 0.35s ease; }
    body.takeover .tk-cap { opacity: 0; }
    .tk-label {
      position: absolute; height: 22px; display: flex; align-items: center;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-weight: 700; font-size: 18.52px; line-height: 24.737px;
      letter-spacing: -0.1852px; text-transform: uppercase; color: #fff;
      white-space: nowrap; opacity: 0; pointer-events: none; z-index: 61;
      transition: opacity 0.45s ease;
    }
    body.takeover .tk-label.tk-on { opacity: 1; transition: opacity 0.5s ease 0.12s; }
  `;
  document.head.appendChild(style);

  /* config = {
       tiles:   [{ el, label, rect: {x,y,w,h}, row, rows }],
       bounds:  { left, right },        // horizontal clamps (content edges)
       maxH(t), // max enlarged height for a tile (page supplies its gap math)
       maxW(t), // optional: max enlarged width (keep clear of neighbors)
       grow,    // optional growth factor (default 1.55)
       ratio,   // enlarged aspect (w/h); defaults to the tile's own
       topGuard // absolute y the hover may never rise above (e.g. under tabs)
     }
     Returns { relayout(tiles) } so pages can re-register after a re-grid. */
  window.SXTakeover = function (config) {
    let tiles = [];
    let active = null;
    const host = document.createElement('div');

    function bind(t) {
      /* The scroll-fade classes fight the hover: .fd.seen's transition list
         (with its stagger delays) outranks .tk-tile's, so the enlarge would
         wait out the delay and then crawl. Registered tiles drop the fade
         machinery — the takeover owns their motion. */
      t.el.classList.remove('fd', 'seen');
      t.el.style.removeProperty('--fd');
      t.el.classList.add('tk-tile');
      const lab = document.createElement('p');
      lab.className = 'tk-label';
      lab.textContent = t.label;
      t.el.parentNode.appendChild(lab);
      t.labEl = lab;

      t.el.addEventListener('mouseenter', () => enter(t));
      t.el.addEventListener('mouseleave', () => leave(t));
    }

    function enter(t) {
      if (scrollLock) return;
      document.body.classList.add('takeover');
      t.el.classList.add('tk-on');
      t.labEl.classList.add('tk-on');
      active = t;
      const r = t.rect;
      const R = config.ratio || (r.w / r.h);
      const maxH = config.maxH(t);
      let eh = Math.min(r.h * (config.grow || 1.55), maxH);
      // never taller than the viewport band below the header
      eh = Math.min(eh, window.innerHeight - 158 - 96);
      let ew = eh * R;
      // horizontal: stay inside the content edges, and optionally clear of
      // the neighboring tiles (Joel 8/10: case-studies grew into them)
      if (ew > config.bounds.right - config.bounds.left) {
        ew = config.bounds.right - config.bounds.left;
        eh = ew / R;
      }
      if (config.maxW) {
        const mw = config.maxW(t);
        if (ew > mw) { ew = mw; eh = ew / R; }
      }
      // vertical anchor by row: first row down, last row up, middle centered
      let et;
      if (t.rows === 1 || t.row === 0) et = r.y;
      else if (t.row === t.rows - 1)   et = r.y + r.h - eh;
      else                             et = r.y + (r.h - eh) / 2;
      // viewport clamp (translated into the tiles' local coordinate space)
      const oy = config.offsetY || 0;
      const vTop = Math.max(config.topGuard || 0, window.scrollY + 158 + 16 - oy);
      const vBot = window.scrollY + window.innerHeight - 56 - oy;
      et = Math.max(vTop, Math.min(vBot - eh, et));
      // hard rule: never cross into a neighboring row
      if (t.row === 0 && et + eh > r.y + maxH) eh = Math.max(r.h, r.y + maxH - et);
      if (t.row === t.rows - 1 && et < r.y + r.h - maxH) et = r.y + r.h - maxH;
      ew = eh * R;
      let el = r.x + r.w / 2 - ew / 2;
      el = Math.max(config.bounds.left, Math.min(config.bounds.right - ew, el));
      // Direct geometry animation: the transition interpolates from wherever
      // the tile currently is, so re-hovering mid-flight can never snap.
      Object.assign(t.el.style, {
        left: el + 'px', top: et + 'px', width: ew + 'px', height: eh + 'px'
      });
      Object.assign(t.labEl.style, { left: el + 'px', top: (et + eh + 14) + 'px' });
    }

    function leave(t) {
      document.body.classList.remove('takeover');
      t.el.classList.remove('tk-on');
      t.labEl.classList.remove('tk-on');
      active = null;
      const r = t.rect;
      Object.assign(t.el.style, {
        left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px'
      });
    }

    // Scrolling exits the takeover and LOCKS it until the mouse physically
    // moves — without the lock, the browser re-fires mouseenter on the tile
    // still under the cursor and the page strobes black/white while you
    // scroll through the grid.
    let scrollLock = false;
    window.addEventListener('scroll', () => {
      if (active) {
        scrollLock = true;
        leave(active);
      }
    }, { passive: true });
    window.addEventListener('mousemove', () => { scrollLock = false; }, { passive: true });

    function register(list) {
      tiles.forEach(t => { if (t.labEl) t.labEl.remove(); });
      tiles = list;
      tiles.forEach(bind);
    }
    register(config.tiles);

    return { relayout: register };
  };
})();
