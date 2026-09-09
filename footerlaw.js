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
        const pp = Math.max(0, Math.min(1, (p - 0.35) / 0.65));
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
})();
