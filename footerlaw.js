/* SIXTWENTYSIX — THE FOOTER LAW (2026-08-21, per Joel).
   The black footer sits stuck to the very bottom of EVERY page:
   - if the page's content runs past one screen, the footer is flush at the
     page's end (content end = footer top, page bottom = footer bottom);
   - if the page is SHORTER than one screen, the page stretches to exactly
     one viewport and the footer pins to the bottom edge — never a white
     void below it.
   Pages keep running their own layouts (density toggles, elastic fits);
   this law re-asserts itself after any of them touch the page or footer,
   and on resize. Writes only when values differ, so it cannot loop. */
(function () {
  if (location.search.includes('reveal=1')) return; // captures stay at design geometry
  const FOOT_H = 349;
  /* Anti-ratchet (bug hunt 8/21): reading the page height back includes our
     own previous stretch, so the page could only ever grow. Remember the
     NATURAL height — any height we did not write ourselves — and stretch
     from that, so shrinking the viewport shrinks the page again. */
  let naturalH = null, writtenH = null;
  function apply() {
    const pg = document.getElementById('page');
    const foot = document.querySelector('.footer');
    if (!pg || !foot) return;
    const vh = Math.ceil(window.innerHeight);
    const pageH = parseFloat(getComputedStyle(pg).height) || 0;
    if (writtenH === null || Math.abs(pageH - writtenH) > 0.5) naturalH = pageH;
    /* Joel 8/22: the footer must never be visible at rest — short pages
       stretch to a full viewport PLUS the footer, so the black band always
       starts just below the fold and takes one scroll to reach. */
    const wantH = Math.max(naturalH, vh + FOOT_H);
    if (Math.abs(pageH - wantH) > 0.5) pg.style.height = wantH + 'px';
    writtenH = wantH;
    /* nesting-safe (8/21): some pages keep the footer inside a shifted
       container (services' #below), so style.top is NOT page-relative.
       Measure where the footer actually renders and correct by the delta. */
    const curPageTop = foot.getBoundingClientRect().top - pg.getBoundingClientRect().top;
    const wantPageTop = wantH - FOOT_H;
    if (Math.abs(curPageTop - wantPageTop) > 0.5) {
      const curStyleTop = parseFloat(getComputedStyle(foot).top) || 0;
      foot.style.top = (curStyleTop + (wantPageTop - curPageTop)) + 'px';
    }
  }
  function arm() {
    const pg = document.getElementById('page');
    const foot = document.querySelector('.footer');
    if (!pg || !foot) return;
    apply();
    /* THE NEWSLETTER FIELD (Joel 8/25): Subscribe must capture the
       reader's OWN email, not just open a blank mail. Clicking Subscribe
       swaps in an inline field; submitting opens the signup mail with
       their address filled in. Lives here so every page's footer gets it. */
    const sub = foot.querySelector('a[href*="subject=Newsletter"]');
    if (sub) sub.addEventListener('click', (e) => {
      e.preventDefault();
      if (foot.querySelector('.nl-inline')) return;
      const box = document.createElement('span');
      box.className = 'nl-inline';
      box.innerHTML = '<input type="email" placeholder="your email" style="width:118px; background:transparent; border:0; border-bottom:1px solid rgba(255,255,255,0.45); color:#fff; font:inherit; outline:none; padding:0 0 2px;">' +
        '<span style="cursor:pointer; margin-left:8px;">-&gt;</span>';
      sub.replaceWith(box);
      const inp = box.querySelector('input');
      const go = () => { if (inp.value && inp.checkValidity()) location.href =
        'mailto:hello@sixtwentysix.co?subject=Newsletter%20Signup&body=' +
        encodeURIComponent('Please subscribe ' + inp.value + ' to the newsletter.'); };
      box.querySelector('span').addEventListener('click', go);
      inp.addEventListener('keydown', (k) => { if (k.key === 'Enter') go(); });
      inp.focus();
    });
    window.addEventListener('resize', apply);
    /* THE FOOTER ANIMATION (8/21, recreated from live sixtwentysix.co):
       the giant SIX26 wordmark rises up out of the footer's bottom mask as
       the footer scrolls into view — scroll-scrubbed with an ease-out, so
       the damped site scroll carries it. The .footer's own overflow:hidden
       is the mask. */
    const mark = foot.querySelector('.foot-mark');
    if (mark) {
      const drive = () => {
        const r = foot.getBoundingClientRect();
        const vh2 = window.innerHeight;
        const p = Math.max(0, Math.min(1, (vh2 - r.top) / FOOT_H));
        /* the mark lives in the footer's LOWER half — keyed naively, the
           rise was ~90% finished before its area was even on screen (Joel:
           "i don't see it"). Hold until the footer is a third in, then play
           the whole rise across the visible stretch, landing exactly at
           the page bottom. */
        /* 9/15 (Joel, iPad vertical: "if you are at the bottom, even if you
           haven't scrolled all the way but you can see the footer, add it"):
           the mark is fully up once the footer is 60% on screen, not only at
           the very last pixel — a flick that settles with the footer in view
           shows the whole SIX26 */
        const pp = Math.max(0, Math.min(1, (p - 0.15) / 0.45));
        const e = pp * pp * (3 - 2 * pp);
        mark.style.transform = 'translateY(' + ((1 - e) * 100).toFixed(2) + '%)';
      };
      window.addEventListener('scroll', drive, { passive: true });
      window.addEventListener('resize', drive);
      drive();
    }
    const mo = new MutationObserver(() => requestAnimationFrame(apply));
    mo.observe(pg, { attributes: true, attributeFilter: ['style'] });
    mo.observe(foot, { attributes: true, attributeFilter: ['style'] });
    /* 9/14 (Joel: "when you reload and scroll down without toggling a
       different grid view on the home page, the footer does not appear"):
       the home's #below slides to its new seat on a 0.45s transform
       transition, and this law measured the footer MID-slide — so it
       corrected against a position that then kept moving, and the footer
       ended a whole grid's height past the page's end (or above it).
       Any transition that moves a box re-seats the footer once it lands. */
    pg.addEventListener('transitionend', e => {
      if (/^(transform|top|height)$/.test(e.propertyName)) requestAnimationFrame(apply);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arm);
  else arm();
})();

/* ---- HANDOFF ART (9/3, Joel: "the video lands immediately? maybe just
   click on it and then the thumbnail"): any click that opens a work page
   stashes the clicked tile's artwork, so case-study.html can paint it in
   the same instant instead of a black beat while the CMS + player load.
   Lives here because this file is on all 10 pages. */
(function () {
  document.addEventListener('click', function (e) {
    const a = e.target.closest && e.target.closest('a[href*="case-study.html?work="]');
    if (!a) return;
    const img = a.querySelector('img');
    try {
      sessionStorage.setItem('sx-cs-art', JSON.stringify({
        src: (img && (img.currentSrc || img.src)) || '',
        t: Date.now()
      }));
    } catch (err) {}
  }, true);
  /* THE CURTAIN (9/14, Joel: "the whole page flashes before it switches"):
     any click on a site link tells the shell (view.html) what is coming so
     it can cover the blank beat between documents — black with the clicked
     tile's art on the way into a work or a director, white to a light page.
     A modified click (new tab) or an external / mail link says nothing. */
  /* 9/14 (second pass, Joel: "when i click on any thumbnail now on the ipad
     its going full screen and glitching"): this used to run in the CAPTURE
     phase, i.e. BEFORE the grid's own click law had decided that a first
     tap only previews — so the preview tap raised the curtain with the
     tile's art over the whole screen, and nothing navigated under it until
     the failsafe dropped it. It now listens on the window in the BUBBLE
     phase, last of all: a tap the tile laws swallowed (preventDefault /
     stopPropagation) never reaches it, and only a click that will really
     navigate raises the curtain. */
  window.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || window.parent === window) return;
    const href = a.getAttribute('href') || '';
    if (!/^[a-z-]+\.html(\?|#|$)/i.test(href)) return;
    const img = a.querySelector('img');
    /* a work opens on its film's frame: the tapped tile's art as a 16:9 band
       at the top of a white curtain (the hero's exact crop, 9/14); a director
       page opens dark */
    const band = /case-study\.html\?work=/.test(href);
    const dark = /director\.html/.test(href);
    try {
      window.parent.postMessage({ sx: 'curtain', dark: dark, band: band, art: band ? ((img && (img.currentSrc || img.src)) || '') : '' }, '*');
    } catch (err) {}
  });
})();


/* ---- AUTOPLAY KICK (9/14, Joel: "there is a play button and it asks you to
   play the sizzle reel, that cant happen. It needs to autoplay"). Every reel
   on the site is muted + inline + autoplay, which is the only autoplay iOS
   allows — but iPadOS still parks a play glyph on a video it decided not to
   start (a tab opened in the background, Low Power Mode, a first load with
   no gesture yet). The first touch, click, key or scroll re-issues play() on
   every autoplay video that is still paused, and the visibility change back
   to the tab does the same. Lives here because this file is on all pages. */
(function () {
  function kick() {
    document.querySelectorAll('video[autoplay]').forEach(function (v) {
      if (!v.paused) return;
      v.muted = true;
      v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    });
  }
  ['touchstart', 'pointerdown', 'keydown', 'scroll', 'wheel'].forEach(function (ev) {
    window.addEventListener(ev, kick, { passive: true, capture: true });
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  window.addEventListener('pageshow', kick);
  window.addEventListener('load', function () { setTimeout(kick, 400); });
})();
