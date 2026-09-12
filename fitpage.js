/* SIXTWENTYSIX — one-screen page fitter (2026-08-20).
   Joel: "every page needs to be able to change where it can fit top to
   bottom on any scale." One-screen pages (careers, contact) call
   SXFit(designHeight, footerHeight) and their blocks redistribute
   proportionally to the REAL viewport height: the footer pins to the bottom
   of one screen, everything above keeps its relative rhythm, and it re-fits
   live on resize. Below 900px of viewport the design floor holds and the
   page scrolls instead of crushing the type. */
window.SXFit = function (designH, footerH) {
  if (location.search.includes('reveal=1')) return; // captures stay at design geometry
  const pg = document.getElementById('page');
  if (!pg) return;
  const els = [...pg.querySelectorAll(':scope > *')]
    .filter(el => {
      const cs = getComputedStyle(el);
      return cs.position === 'absolute' && !isNaN(parseFloat(cs.top));
    })
    .map(el => ({
      el,
      t: parseFloat(getComputedStyle(el).top),
      foot: el.classList.contains('footer'),
    }));
  function fit() {
    /* NEVER COMPRESS (8/21 fix): blocks are fixed-height text, so scaling
       their tops down on a short window crashes them into each other (the
       careers/contact overlap). The design layout is the FLOOR — we only
       distribute EXTRA space when the window is taller than the design;
       shorter windows keep design spacing and simply scroll, with the
       footer law pinning the footer under the content. */
    const vh = Math.max(designH, window.innerHeight);
    const den = footerH ? designH - footerH : designH;
    const num = footerH ? vh - footerH : vh;
    els.forEach(o => {
      o.el.style.top = (o.foot ? vh - footerH : Math.round(o.t * num / den)) + 'px';
    });
    pg.style.height = vh + 'px';
  }
  fit();
  window.addEventListener('resize', fit);
  /* 9/11: pages that rebuild a block AFTER load (careers reads its roles
     from the CMS) can move a design seat and re-fit without double-scaling:
     SXFit.move(el, newDesignTop) rewrites the captured design top for that
     element, SXFit.refit() re-runs the distribution. */
  window.SXFit.move = function (el, designTop) {
    const o = els.find(x => x.el === el);
    if (o) o.t = designTop;
  };
  window.SXFit.refit = fit;
  window.SXFit.designTop = function (el) {
    const o = els.find(x => x.el === el);
    return o ? o.t : NaN;
  };
};
