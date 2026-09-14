/* SIXTWENTYSIX — the logo morph, v3 (2026-09-14): JOEL'S OWN FILM.
   Joel: "across the board can you replace this as the animation for the
   website" — SX ANIMATION.mp4 (1180x338, 2s at 60fps): SIX26 with the
   I/2/6 wiping away, the X gliding into the S while the assembled mark
   shrinks to the compact SX, the (R) returning. The film's 73 moving
   frames (the last 48 are a hold) live as alpha WebPs in assets/sxanim/
   (black ink, alpha from luminance, 538KB in all) and the header draws the
   frame its scroll asks for on a canvas — scrubbable, reversible at any
   pixel, exactly his frames. The vector morph this replaces (v2, built from
   the LOGO REDACTED keyframes) is kept as logomorph.vector.js.

   Geometry, measured from the frames (assets/sxanim/metrics.json, T[i] =
   S cap top, S bottom, ink right edge in film px):
   - the big word is 1142 film px wide -> the header's narrow big 420 (the
     8/24 law), so one film px = 0.3678 site px; the S's left edge (film
     x21) seats at the container's x0 (page x63)
   - the big S cap top seats at y70 (BIG_TOP), the compact S at y43.05 —
     the film's own upward drift is short of the header's, so the frame
     rides up by the difference across the shrink
   API as before: SXLogo.build(container) -> render(q) (q 0 = big, 1 =
   compact), render.up(t) (the reverse: frames backwards), plus
   render.shrinkAt(q) for the chrome that rides the shrink and
   render.warm() to preload. SXLogo.attachHeader unchanged. */
(function () {
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = t => Math.max(0, Math.min(1, t));
  const VW = 1180, VH = 338, X0 = 21;
  const T = [[127,322,1163],[127,322,1163],[127,322,1163],[127,322,1163],[127,322,1157],[127,322,1133],[127,322,1109],[127,322,1086],[127,322,1062],[127,322,1038],[127,322,1014],[127,322,990],[127,322,967],[127,322,943],[127,322,919],[127,322,895],[127,322,872],[127,322,848],[127,322,824],[127,322,800],[127,322,777],[127,322,753],[127,322,729],[127,322,705],[127,322,682],[127,322,658],[127,322,634],[127,322,610],[127,322,596],[127,322,596],[127,322,596],[127,322,596],[126,321,596],[126,321,595],[126,320,594],[126,320,592],[126,319,590],[125,317,587],[125,316,584],[124,314,580],[124,312,576],[123,309,571],[122,306,565],[121,303,558],[120,300,551],[119,296,543],[118,292,535],[117,288,526],[115,283,517],[114,279,508],[113,275,499],[112,271,490],[111,267,482],[110,263,475],[109,260,468],[108,257,462],[107,255,457],[106,252,452],[106,251,448],[105,249,445],[105,248,442],[105,247,440],[104,246,438],[104,245,437],[104,245,436],[104,244,435],[104,244,435],[104,244,435],[104,244,435],[104,244,435],[104,244,435],[104,244,435],[104,244,435]];
  const N = T.length;
  const BIG_W = 420, BIG_TOP = 70, COMPACT_TOP = 43.05;
  const K = BIG_W / (T[0][2] - X0);                 // film px -> site px
  const H0 = T[0][1] - T[0][0], H1 = T[N - 1][1] - T[N - 1][0];
  const frameOf = q => Math.round(clamp01(q) * (N - 1));
  const shrinkOf = i => clamp01((H0 - (T[i][1] - T[i][0])) / (H0 - H1));
  const src = i => 'assets/sxanim/f' + String(i).padStart(2, '0') + '.webp';
  const cache = [];
  function frame(i, onReady) {
    let im = cache[i];
    if (!im) { im = new Image(); im.decoding = 'async'; im.src = src(i); cache[i] = im; }
    if (im.complete && im.naturalWidth) return im;
    if (onReady) im.addEventListener('load', onReady, { once: true });
    return null;
  }
  function warm() { for (let i = 0; i < N; i++) frame(i); }

  /* LETTERS is kept for anyone who read the v2 seats; the film owns them now */
  const LETTERS = [];

  function build(container) {
    container.innerHTML = '';        // idempotent: rebuilds replace, never stack
    container.style.position = 'absolute';
    const cv = document.createElement('canvas');
    cv.width = VW; cv.height = VH;   // full film resolution, scaled down in CSS: crisp at any shell scale
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'SIXTWENTYSIX');
    cv.style.cssText = 'position:absolute; left:' + (-X0 * K).toFixed(2) + 'px; top:0; width:' +
      (VW * K).toFixed(2) + 'px; height:' + (VH * K).toFixed(2) + 'px; display:block; pointer-events:none;';
    container.appendChild(cv);
    const ctx = cv.getContext('2d');
    let drawn = -1, want = 0;
    const draw = () => {
      const im = frame(want, draw);
      if (!im || drawn === want) return;
      ctx.clearRect(0, 0, VW, VH);
      ctx.drawImage(im, 0, 0);
      drawn = want;
    };
    const r = function render(q) {
      q = clamp01(q);
      const i = frameOf(q);
      const s = shrinkOf(i);
      /* the S cap top: y70 big, y43.05 compact, riding the film's shrink */
      cv.style.top = (lerp(BIG_TOP, COMPACT_TOP, s) - T[i][0] * K).toFixed(2) + 'px';
      if (i !== want) { want = i; draw(); }
      else if (drawn !== i) draw();
      r.q = q; r.shrink = s;
    };
    r.up = t => r(1 - clamp01(t));
    r.shrinkAt = q => shrinkOf(frameOf(q));
    r.warm = warm;
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
    setTimeout(warm, 2500); // the rest of the film, for the menu and a warm cache on the way home
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

  window.SXLogo = { build: build, attachHeader: attachHeader, warm: warm, LETTERS: LETTERS };
})();
