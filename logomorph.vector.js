/* SIXTWENTYSIX — the real logo morph, v2 (2026-08-19).
   Built from Joel's three "LOGO REDACTED" keyframes:
   - 505:3208  K0: full SIX26, every letter its own vector (1:1 header scale)
   - 506:3223  K1: I / 2 / 6 gone; S, X and (R) HOLD their big positions
   - 506:3231  K2: the compact SX arrangement (same S+X glyphs, ~0.46 scale)
   So the choreography is: phase one, the middle letters collapse and fade in
   place while S / X / (R) stand still; phase two, the three survivors travel
   and scale into the compact header mark. Pure lerp, no crossfade.

   Coordinates are header-space: x relative to the logo's left edge (page
   x63), y absolute within the header (big cap top y52, compact y43 — the
   interior header box). Callers place the container at left:63, top:0.

   API:
     SXLogo.build(container) -> render(q)   q: 0 = big, 1 = compact
     SXLogo.attachHeader(container)         full interior-header driver:
       renders the letters, drives cities + hamburger + header band height
       from scroll (big at top of page, compact by 260px), and exposes
       window.SX_MORPH_Q for the menu. The homepage drives itself instead
       (its container carries data-selfdriven). reveal=1 captures pin q=1 on
       interior pages so they match their compact-header frames. */
(function () {
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = t => Math.max(0, Math.min(1, t));

  /* movers: big -> mid (X and the (R) close ranks against the S at FULL
     size, forming a big SX(R)) -> compact (the assembled mark shrinks).
     mid = the compact arrangement scaled up 1/0.4625, anchored on the S.
     Faders collapse in place (K1). Choreography per Joel 8/20: letters go
     away, it TURNS INTO SX, then it shrinks. */
  const LETTERS = [
    { id: 's', src: 'letter-s', big: [0,     52,   140.8, 107.9], mid: [0,     52,   140.8, 107.9], compact: [0,   43.05, 64.7, 49.9] },
    { id: 'i', src: 'letter-i', big: [148.4, 53.8, 39.6,  104.2], fade: true },
    { id: 'x', src: 'letter-x', big: [184.8, 53.8, 154.7, 104.2], mid: [134.1, 53.8, 154.7, 104.2], compact: [62,  43.9,  71,   48.2] },
    { id: '2', src: 'letter-2', big: [334.1, 51.8, 133.8, 106.1], fade: true },
    { id: '6', src: 'letter-6', big: [474,   51.8, 140,   108.2], fade: true },
    { id: 'r', src: null,       big: [608.5, 51,   28.6,  18.7 ], mid: [287.6, 51.9, 28.6,  18.7 ], compact: [133, 43,    13,   8.6 ] },
  ];

  /* NARROW BIG (Joel 8/24): the full-size word is scaled to 420px wide and
     re-seated at cap top y70 (vertically centered in the unchanged 185px
     band). Its right edge lands at page x483, clearing the cities' one and
     only x seat (504) — LA/NY never slide horizontally again, they only
     ride up and down. The compact SX/SIX26 is untouched (KS below adapts).
     Restore the original 637px-wide state with BIG_W = 637.1, BIG_TOP = 52. */
  const BIG_W = 420, BIG_TOP = 70, BIGS = BIG_W / 637.1;
  LETTERS.forEach(L => ['big', 'mid'].forEach(k => {
    const g = L[k];
    if (g) L[k] = [g[0] * BIGS, BIG_TOP + (g[1] - 52) * BIGS, g[2] * BIGS, g[3] * BIGS];
  }));

  function build(container) {
    container.innerHTML = '';        // idempotent: rebuilds replace, never stack
    container.style.position = 'absolute';
    const els = LETTERS.map(L => {
      const el = document.createElement('span');
      el.style.cssText = 'position:absolute; display:block;';
      if (L.id === 'r') {
        el.innerHTML =
          '<img src="assets/letter-r-ring.svg" alt="" style="position:absolute; inset:0; width:100%; height:100%;">' +
          '<img src="assets/letter-r-mark.svg" alt="" style="position:absolute; left:25.5%; top:24%; width:51.7%; height:51.3%;">';
      } else {
        el.innerHTML = `<img src="assets/${L.src}.svg" alt="" style="display:block; width:100%; height:100%;">`;
      }
      container.appendChild(el);
      return el;
    });
    const smooth = t => t * t * (3 - 2 * t); // eased sub-curves: no jolt
    /* THE UP PATH (Joel 8/22): the reverse is NOT the forward played
       backwards. Going home, the SX turns into a COMPACT SIX26 first —
       I/2/6 fade in at small scale while the X and (R) slide over to make
       room — and only THEN does the assembled little word grow to full
       size. Symmetric law both ways: transform at your current size,
       then change size. t: 0 = compact SX, 1 = big SIX26. */
    const KS = 49.9 / LETTERS[0].big[3]; // compact scale factor (S height ratio, tracks NARROW BIG)
    /* Joel 8/23 (final): the small word HUGS the compact corner (x0, y43)
       the entire time it forms — no reseating, no jump — and the grow then
       expands down-and-right from that same corner. The 9px difference to
       the big cap-line is absorbed inside the growth itself, where the eye
       can't read it against 58px of expansion. */
    const cw = (g) => [g[0] * KS, 43.05 + (g[1] - LETTERS[0].big[1]) * KS, g[2] * KS, g[3] * KS];
    function renderUp(t) {
      t = clamp01(t);
      const ta = smooth(clamp01(t / 0.55));        // A: SX -> small SIX26
      const tb = smooth(clamp01((t - 0.55) / 0.45)); // B: the little word grows
      LETTERS.forEach((L, i) => {
        const el = els[i];
        const small = cw(L.big);
        if (L.fade) {
          const x = lerp(small[0], L.big[0], tb);
          const y = lerp(small[1], L.big[1], tb);
          const w = lerp(small[2], L.big[2], tb);
          const h = lerp(small[3], L.big[3], tb);
          el.style.left = x + 'px'; el.style.top = y + 'px';
          el.style.width = w + 'px'; el.style.height = h + 'px';
          el.style.transition = 'none';
          el.style.opacity = String(ta);            // fades IN at small size
        } else {
          const seat = L.compact;
          const x = lerp(lerp(seat[0], small[0], ta), L.big[0], tb);
          const y = lerp(lerp(seat[1], small[1], ta), L.big[1], tb);
          const w = lerp(lerp(seat[2], small[2], ta), L.big[2], tb);
          const h = lerp(lerp(seat[3], small[3], ta), L.big[3], tb);
          el.style.left = x + 'px'; el.style.top = y + 'px';
          el.style.width = w + 'px'; el.style.height = h + 'px';
          el.style.transition = 'none';
          el.style.opacity = '1';
        }
      });
    }
    const r = function render(q) {
      q = clamp01(q);
      /* THREE BEATS, STRICTLY SEQUENTIAL (Joel 9/3: "the sx should only
         shrink after the x slides into the s, and then the r appears
         after" — supersedes the 8/24 diagonal, which slid and shrank at
         the same time):
         1: q 0.00-0.30  I/2/6 FADE, full size (quintic, Joel 8/20 soft)
         2: q 0.30-0.65  the X GLIDES left into the S at FULL size (big ->
                         mid seats), forming the big SX
         3: q 0.65-1.00  the assembled SX SHRINKS to the compact seat
         (r): appears only after the shrink locks — unchanged below. */
      const q5 = t => t * t * t * (t * (t * 6 - 15) + 10);
      const ta = clamp01(q / 0.30);
      const ka = q5(ta);                        // fade band
      const kg = q5(clamp01((q - 0.30) / 0.35)); // glide band (big -> mid)
      const ks = q5(clamp01((q - 0.65) / 0.35)); // shrink band (mid -> compact)
      const km = ks; // legacy name: downstream reads km as "how shrunk"
      /* fadeOverride (Joel 8/23): when the page drives the I/2/6 as a
         one-shot PLAY instead of a scrub, it sets r.fadeOverride (1 =
         visible). Geometry still follows q; only their opacity is owned
         by the play. */
      const fo = typeof r.fadeOverride === 'number' ? r.fadeOverride : null;
      LETTERS.forEach((L, i) => {
        const el = els[i];
        if (L.fade) {
          /* per Joel: no shrinking — the letters hold their size and simply
             fade to zero before anything moves */
          el.style.left   = L.big[0] + 'px';
          el.style.top    = L.big[1] + 'px';
          el.style.width  = L.big[2] + 'px';
          el.style.height = L.big[3] + 'px';
          el.style.opacity = String(fo !== null ? fo : 1 - ka);
        } else if (L.id === 'r') {
          /* Joel 8/20: the (R) never slides — it vanishes with the letters,
             and only AFTER the SX has shrunk and locked in place does it
             fade back in at its compact seat (CSS handles the late fade so
             no extra frames are needed once the morph settles). */
          const out = fo !== null ? fo : 1 - ka; // gone with I/2/6 (or with their play)
          const locked = q >= 0.995;          // SX is small and seated
          const g = km < 0.5 ? L.big : L.compact;
          el.style.left = g[0] + 'px'; el.style.top = g[1] + 'px';
          el.style.width = g[2] + 'px'; el.style.height = g[3] + 'px';
          if (locked) {
            el.style.transition = 'opacity 0.35s ease 0.12s';
            el.style.opacity = '1';
          } else {
            el.style.transition = 'none';
            el.style.opacity = String(out);
          }
        } else {
          /* beat 2 slides big -> mid at full size, beat 3 shrinks mid ->
             compact; ks only starts once kg has landed, so the hand-off
             seat is exactly the assembled big SX */
          const x = lerp(lerp(L.big[0], L.mid[0], kg), L.compact[0], ks);
          const y = lerp(lerp(L.big[1], L.mid[1], kg), L.compact[1], ks);
          const w = lerp(lerp(L.big[2], L.mid[2], kg), L.compact[2], ks);
          const h = lerp(lerp(L.big[3], L.mid[3], kg), L.compact[3], ks);
          el.style.left = x + 'px'; el.style.top = y + 'px';
          el.style.width = w + 'px'; el.style.height = h + 'px';
          el.style.opacity = '1';
        }
      });
    };
    r.up = renderUp;
    return r;
  }

  /* Interior-header driver: big at the top of every page, compact by 260px.
     The white band grows/shrinks with it; cities and the hamburger ride
     between their big-header and compact-header stations. */
  function attachHeader(container) {
    const render = build(container);
    const hdr = container.closest('.hdr') || document.querySelector('.hdr');
    const cities = hdr ? hdr.querySelectorAll('.nav-sm') : [];
    const burger = hdr ? hdr.querySelector('.hdr-menu') : null;
    const la = cities[0], ny = cities[1];

    if (location.search.includes('reveal=1')) { render(1); return; } // frames show compact

    function paint(p) {
      render(p);
      if (hdr) hdr.style.height = Math.round(lerp(210, 118, p)) + 'px';
      if (la) { la.style.left = '745px'; la.style.top = Math.round(lerp(111, 43, p)) + 'px'; }
      if (ny) { ny.style.left = '745px'; ny.style.top = Math.round(lerp(136, 68, p)) + 'px'; }
      if (burger) burger.style.top = Math.round(lerp(121, 44, p)) + 'px';
      window.SX_MORPH_Q = p;
    }
    /* Damped: the header eases toward the scroll target every frame, so the
       morph ALWAYS animates — no snapping on jumps, restores, or fast wheels. */
    let target = clamp01(window.scrollY / 260), disp = target, anim = false, last = 0;
    paint(disp);
    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000) || 1 / 60;
      last = now;
      disp += (target - disp) * (1 - Math.exp(-12 * dt));
      if (Math.abs(target - disp) < 0.002) { disp = target; anim = false; }
      paint(disp);
      if (anim) requestAnimationFrame(tick);
    }
    window.addEventListener('scroll', () => {
      target = clamp01(window.scrollY / 260);
      if (!anim) { anim = true; last = performance.now(); requestAnimationFrame(tick); }
    }, { passive: true });
  }

  /* dark-hero headers paint white chrome — the letters follow */
  const css = document.createElement('style');
  css.textContent = '.hdr.dark #lettermark { filter: invert(1); }' +
                    'body.menu-open .hdr #lettermark { filter: none; }';
  document.head.appendChild(css);

  /* Interior pages: static compact header (Joel reverted big-at-top,
     8/19 pm). The letters render pinned at q=1 — pixel-identical to the old
     SX composite — and the menu still morphs them big when it opens. */
  document.addEventListener('DOMContentLoaded', () => {
    const lm = document.getElementById('lettermark');
    if (!lm || lm.dataset.selfdriven) return;
    const render = build(lm);
    render(1);
    /* Joel 8/20: hitting the small SX to go home GROWS the mark back into
       SIX26 (header band swelling with it) before the page turns — smooth,
       not a hard cut. Reverse of the scroll morph, 600ms ease-out. */
    const link = lm.closest('a');
    const target = link || lm;
    target.style.cursor = 'pointer';
    /* 8/24 (via prod): the hit area hugs the drawn compact mark instead of
       the legacy 639x161 frame — the oversized transparent home link was
       swallowing clicks meant for links seated inside its old box
       (director.html's "Back to Directors" at y151; case-study's back). */
    target.style.width = '150px';
    target.style.height = '104px';
    let leaving = false;
    target.addEventListener('click', e => {
      e.preventDefault();
      if (leaving) return;
      leaving = true;
      const href = (link && link.getAttribute('href')) || 'index.html';
      /* Joel 8/22 (torched and rebuilt): NO morph, NO choreography. The
         header's white simply draws all the way down, erasing chrome and
         page alike as its edge passes, and the swap happens behind full
         white. Home fades its SIX26 in from zero on the other side. */
      const sheet = document.createElement('div');
      sheet.style.cssText = 'position:fixed; left:50%; margin-left:-864px; width:1728px; top:0; height:0; background:#fff; z-index:60; pointer-events:none;';
      document.body.appendChild(sheet);
      let navved = false;
      const go = () => {
        if (navved) return;
        navved = true;
        try { sessionStorage.setItem('sx_wipe', String(Date.now())); } catch (e) {}
        location.href = href;
      };
      requestAnimationFrame(() => {
        sheet.style.transition = 'height 0.8s cubic-bezier(0.45, 0, 0.2, 1)';
        sheet.style.height = window.innerHeight + 'px';
      });
      sheet.addEventListener('transitionend', () => setTimeout(go, 60), { once: true });
      setTimeout(go, 1400);               // safety: never strand the click
    });
  });

  window.SXLogo = { build: build, attachHeader: attachHeader, LETTERS: LETTERS };
})();
