/* SIXTWENTYSIX — the "Latest and Greatest" hover law, copied 1:1 from the
   LIVE sixtwentysix.co (2026-08-19).

   What the live site does on a work tile hover (decoded from its Next.js
   bundle + stylesheet):
   - 8 corner bars (.border-animation__bar): one horizontal + one vertical
     anchored at each corner, 3.5vw long, 1px thick, currentColor, scale 0.
     On enter every bar scales to 100% — GSAP duration .3s power1.inOut,
     all together. On leave the timeline REVERSES.
   - The tile's preview video fades in (autoAlpha .3s, overlapped -0.1s into
     the bars) and starts playing; CSS crossfade 500ms at scale(1.01).
     Reverses + pauses on leave.
   - No sibling dimming, no tile enlargement, no custom cursor.

   Per Joel (8/19): the Figma ghost/enlarge choreography STAYS — brackets
   layer on top of it. LIVE_HOVER=false leaves the page handlers running;
   the brackets are attached and animated here regardless, and they ride the
   enlarging tile since they're children of it. Tiles are auto-detected — current
   selectors: .work-thumb (home / case studies / experiential), .g-tile and
   .h-thumb (director) — including ones recreated by later relayouts. A tile
   with data-video="<src>" gets the real video-preview behavior. */
(function () {
  window.LIVE_HOVER = false;
  /* Per Joel (8/19 am): corner brackets read as "weird ticks" on the enlarging
     tiles — disabled. Set BRACKETS = true to bring them back (they still
     drive video previews on any tile with data-video). */
  var BRACKETS = false;
  if (!BRACKETS) return;
  if (location.search.includes('reveal=1')) return;

  var SEL = '.work-thumb, .g-tile, .h-thumb';
  var LEN = '60px';          /* 3.5vw of the 1728 canvas */
  var EASE = 'cubic-bezier(0.45, 0, 0.55, 1)'; /* power1.inOut */

  var style = document.createElement('style');
  style.textContent = '' +
    '.bkt { position: absolute; inset: 0; pointer-events: none; color: #fff; z-index: 5; }' +
    '.bkt i { position: absolute; background: currentColor; display: block;' +
    '  transition: transform 0.3s ' + EASE + '; }' +
    '.bkt .h { height: 1px; width: ' + LEN + '; transform: scaleX(0); }' +
    '.bkt .v { width: 1px; height: ' + LEN + '; transform: scaleY(0); }' +
    '.bkt .tl { top: 0; left: 0; transform-origin: left; }' +
    '.bkt .lt { top: 0; left: 0; transform-origin: top; }' +
    '.bkt .tr { top: 0; right: 0; transform-origin: right; }' +
    '.bkt .rt { top: 0; right: 0; transform-origin: top; }' +
    '.bkt .bl { bottom: 0; left: 0; transform-origin: left; }' +
    '.bkt .lb { bottom: 0; left: 0; transform-origin: bottom; }' +
    '.bkt .br { bottom: 0; right: 0; transform-origin: right; }' +
    '.bkt .rb { bottom: 0; right: 0; transform-origin: bottom; }' +
    '.bkt.on i { transform: none; }' +
    '.hovvid { position: absolute; inset: 0; width: 100%; height: 100%;' +
    '  object-fit: cover; opacity: 0; transform: scale(1.01);' +
    '  transition: opacity 0.5s ease; pointer-events: none; }' +
    '.hovvid.on { opacity: 1; }';
  document.head.appendChild(style);

  function attach(el) {
    if (el.querySelector(':scope > .bkt')) return;
    var cs = getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';
    var bkt = document.createElement('span');
    bkt.className = 'bkt';
    bkt.innerHTML = '<i class="h tl"></i><i class="v lt"></i>' +
                    '<i class="h tr"></i><i class="v rt"></i>' +
                    '<i class="h bl"></i><i class="v lb"></i>' +
                    '<i class="h br"></i><i class="v rb"></i>';
    el.appendChild(bkt);

    var vid = null;
    if (el.dataset.video) {
      vid = document.createElement('video');
      vid.className = 'hovvid';
      vid.src = el.dataset.video;
      vid.muted = true; vid.loop = true; vid.playsInline = true;
      vid.preload = 'metadata';
      el.appendChild(vid);
    }

    el.addEventListener('mouseenter', function () {
      bkt.classList.add('on');
      if (vid) { vid.classList.add('on'); vid.play().catch(function () {}); }
    });
    el.addEventListener('mouseleave', function () {
      bkt.classList.remove('on');
      if (vid) { vid.classList.remove('on'); vid.pause(); }
    });
  }

  function scan(root) {
    (root.querySelectorAll ? root.querySelectorAll(SEL) : []).forEach(attach);
  }

  document.addEventListener('DOMContentLoaded', function () {
    scan(document);
    /* Relayouts (grid view toggles) recreate tiles — re-attach as they land. */
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1) return;
          if (n.matches && n.matches(SEL)) attach(n);
          else if (n.querySelectorAll) scan(n);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  });
})();
