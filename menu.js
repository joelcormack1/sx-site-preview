/* SIXTWENTYSIX — menu overlay v4: the header GROWS into the menu.
   Per Joel (8/19): no sheet sliding in from off-screen. Clicking MENU makes
   the header's logo re-animate from wherever it is (small SX mid-page, big
   SIX26 at the top of home) back up to the full SIX26 wordmark, while the
   white header space grows DOWNWARD into the 665px menu (Figma 497:3135).
   Everything runs at 1000ms ease-out; the page cannot scroll behind it.
   Mechanics: a fixed white panel starts at the header's current height with
   a logo layer cloned onto the page logo's exact box, then both animate to
   the menu geometry. Close reverses the same path. */
(function () {
  const EXPLORE = [
    ['Creatives', 'creatives.html'],
    ['Case Studies', 'case-studies.html'],
    ['Experiential', 'experiential.html'],
    ['Services', 'services.html'],
    ['About', 'about.html'],
  ];
  const CONNECT = [
    ['Contact', 'contact.html'], /* Contact above Careers (Joel 8/24) */
    ['Careers', 'careers.html'],
  ];

  const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  const EASE = '1.15s cubic-bezier(0.33, 1, 0.68, 1)'; // Joel 8/21: matches the scroll morph's full tempo

  const style = document.createElement('style');
  style.textContent = `
    #menu-overlay { position: fixed; inset: 0; z-index: 60; pointer-events: none; visibility: hidden; }
    #menu-overlay.shown { visibility: visible; }
    #menu-overlay.open { pointer-events: auto; }
    /* the page behind DARKENS while the menu is open (Joel 8/20 — a dark
       scrim, not a white washout) */
    #menu-overlay .menu-catch {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.5); opacity: 0;
      transition: opacity ${EASE};
    }
    #menu-overlay.open .menu-catch { opacity: 1; }
    /* the white space that grows down out of the header */
    #menu-overlay .menu-sheet {
      position: absolute; left: 50%; top: 0; width: 1728px; margin-left: -864px;
      height: 118px; background: #fff; overflow: hidden;
      transition: height ${EASE}, box-shadow ${EASE};
      font-family: ${FONT};
    }
    #menu-overlay.open .menu-sheet { height: 645px; box-shadow: 0 18px 40px rgba(0,0,0,0.10); }

    /* the one logo — the real letter morph (logomorph.js), tweened on q */
    .menu-logomorph {
      position: absolute; display: block; left: 63px; top: 0;
      width: 639px; height: 161px;
      transition: top ${EASE};
    }

    /* menu content reveals as the space opens */
    .menu-content { opacity: 0; transition: opacity 0.5s ease; }
    #menu-overlay.open .menu-content { opacity: 1; transition-delay: 0.18s; }

    .menu-city {
      /* Joel 8/22: the cities RIDE the open/close like the logo does —
         they live outside .menu-content (no fade-out hole) and tween
         between the header's live seats and the menu rows. 8/24: x is
         the header's seat (504 everywhere now) — vertical travel only. */
      position: absolute; left: 504px;
      font-size: 16px; line-height: 25px; letter-spacing: 0.48px;
      color: #000; white-space: nowrap;
      transition: top ${EASE}, left 0.45s cubic-bezier(0.33, 1, 0.68, 1);
    }
    .menu-label {
      /* 9/3: block lifted 20px (224 -> 204) — Joel: 40 was too tight, this splits it */
      position: absolute; top: 204px;
      font-weight: 400; font-size: 18px; line-height: 21.5px;
      letter-spacing: -0.72px; color: #000; white-space: nowrap;
    }
    .menu-link {
      position: absolute; display: block;
      font-weight: 500; font-size: 29px; line-height: 35.4px;
      letter-spacing: -0.87px; color: #000; white-space: nowrap;
      text-decoration: none; cursor: pointer;
      transition: opacity 0.25s ease;
    }
    .menu-link:hover { opacity: 0.5; }
    .menu-link.dim { opacity: 0.18; pointer-events: none; }
    .menu-link.here { opacity: 0.35; }

    #menu-search {
      position: absolute; left: 1140px; top: 204px; width: 519px;
      border: 0; outline: none; background: transparent;
      font-family: ${FONT};
      font-weight: 400; font-size: 22px; line-height: 26.2px;
      letter-spacing: -0.88px; color: #000;
    }
    #menu-search::placeholder { color: #a4a4a4; }
    .menu-searchrule {
      position: absolute; left: 1144.5px; top: 245px; width: 514px; height: 0;
      border-top: 1px solid #a4a4a4;
    }
    /* Joel 8/22: REAL search — results render under the rule.
       9/3: capped ABOVE the Linkedin/Instagram row (foot y570) and scrolls
       inside itself — long two-line news titles were piling into the links.
       smoothscroll.js lets the wheel through for this element while the
       menu holds the page locked. */
    #menu-results {
      position: absolute; left: 1144.5px; top: 261px; width: 514px;
      max-height: 285px; overflow-y: auto; overscroll-behavior: contain;
      scrollbar-width: thin; scrollbar-color: #d8d8d8 transparent;
    }
    .menu-hit {
      display: block; padding: 9px 2px; cursor: pointer; text-decoration: none;
      transition: opacity 0.2s ease;
    }
    .menu-hit:hover { opacity: 0.5; }
    .menu-hit .mh-t {
      font-weight: 500; font-size: 19px; line-height: 23px;
      letter-spacing: -0.4px; color: #000;
    }
    .menu-hit .mh-s {
      font-weight: 400; font-size: 12.5px; line-height: 16px;
      letter-spacing: 0.2px; color: #a4a4a4; text-transform: uppercase;
    }
    .menu-foot {
      position: absolute; top: 570px;
      font-weight: 400; font-size: 17px; line-height: 20.3px;
      letter-spacing: -0.17px; color: #000; white-space: nowrap;
      text-decoration: none;
    }
    a.menu-foot:hover { opacity: 0.6; }

    /* Joel 8/21: the X and the hamburger are the SAME object in the SAME
       spot — three 33x2 lines seated exactly on the header's hamburger
       (x1648, lines at y56/64/72). Opening spins the whole cluster 180deg
       while the outer lines rotate into an X and the middle one dissolves;
       closing plays it in reverse. Top is staged from the page's real
       hamburger at open time (the homepage's rides its header morph). */
    .menu-x {
      /* PINNED (Joel 8/21): fixed at the exact viewport spot of the
         hamburger at click time — it can never slide while animating.
         Only its three lines transition (the X rotation). */
      position: fixed; left: 1648px; top: 56px; width: 33px; height: 18px;
      background: none; border: 0; padding: 0; cursor: pointer;
      transition: opacity 0.25s ease;
    }
    /* Joel 8/21: the X is formed by the TWO outer lines rotating — no extra
       spin of the whole cluster (to bring the spin back, add a
       transform: rotate(180deg) rule for #menu-overlay.open .menu-x). */
    .menu-x:hover { opacity: 0.55; }
    .menu-x i {
      position: absolute; left: 0; width: 33px; height: 2px; display: block;
      background: #000; border-radius: 2px;
      transition: transform 0.55s cubic-bezier(0.65, 0, 0.35, 1), opacity 0.22s ease;
    }
    .menu-x i:nth-child(1) { top: 0; }
    .menu-x i:nth-child(2) { top: 8px; }
    .menu-x i:nth-child(3) { top: 16px; }
    /* Joel 8/21 — the middle line waits its turn:
       OPENING: it vanishes first, THEN the outer lines rotate into the X.
       CLOSING: the outer lines re-stack first, THEN it fades back in. */
    .menu-x i:nth-child(2) { transition: opacity 0.22s ease 0.42s, transform 0.4s ease-out 0.42s; }
    #menu-overlay.open .menu-x i:nth-child(1) { transform: translateY(8px) rotate(45deg); transition: transform 0.55s cubic-bezier(0.65, 0, 0.35, 1) 0.2s; }
    #menu-overlay.open .menu-x i:nth-child(2) { opacity: 0; transform: scaleX(0.15); transition: opacity 0.18s ease 0s, transform 0.18s ease 0s; }
    #menu-overlay.open .menu-x i:nth-child(3) { transform: translateY(-8px) rotate(-45deg); transition: transform 0.55s cubic-bezier(0.65, 0, 0.35, 1) 0.2s; }

    /* Joel 8/22: the tagline had no menu copy, so it POPPED in at handoff.
       The sheet carries its own copy — it fades out as the menu grows and
       fades back in as it collapses, landing on the header's exact state. */
    .menu-tagline {
      /* 8/24: seated at 91 to match the header tagline's bottom-aligned seat */
      position: absolute; left: 1140px; top: 91px; width: 374px;
      font-weight: 500; font-size: 22px; line-height: 25px;
      letter-spacing: -0.66px; color: #000;
      opacity: 0; transition: opacity 0.45s ease;
    }

    /* the page's own header hands off to the panel the moment it opens */
    body.menu-open .hdr { opacity: 0 !important; pointer-events: none; }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'menu-overlay';

  const here = (location.pathname.split('/').pop() || 'index.html');
  const linkHtml = (arr, x, cls) => arr.map(([label, href], i) =>
    `<a class="menu-link ${cls}${href === here ? ' here' : ''}" data-label="${label.toLowerCase()}"
        href="${href}" style="left:${x}px; top:${204 + i * 60}px;">${label}</a>`).join('');

  overlay.innerHTML = `
    <div class="menu-catch" data-close></div>
    <div class="menu-sheet">
      <a class="menu-logomorph" href="index.html" aria-label="SIX26"></a>
      <p class="menu-city" style="top:43px;">LOS ANGELES, CA</p>
      <p class="menu-city" style="top:68px;">NEW YORK, NY</p>
      <p class="menu-tagline"></p>
      <div class="menu-content">
        <p class="menu-label" style="left:63px;">Explore</p>
        ${linkHtml(EXPLORE, 222, 'mx')}
        <p class="menu-label" style="left:554px;">Connect</p>
        ${linkHtml(CONNECT, 785, 'mc')}
        <input id="menu-search" type="text" placeholder="Search" autocomplete="off">
        <div class="menu-searchrule"></div>
        <div id="menu-results"></div>
        <a class="menu-foot" style="left:63px;" href="mailto:hello@sixtwentysix.co">hello@sixtwentysix.co</a>
        <a class="menu-foot" style="left:554px; width:463px;" href="https://www.google.com/maps/search/?api=1&query=5976+Washington+Blvd,+Culver+City,+CA+90232" target="_blank" rel="noopener">5976 Washington Blvd, Culver City, CA 90232.</a>
        <p class="menu-foot" style="left:1144px;"><a class="menu-foot" style="position:static;" href="https://www.linkedin.com/company/sixtwentysix/" target="_blank" rel="noopener">Linkedin</a>&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;<a class="menu-foot" style="position:static;" href="https://www.instagram.com/sixtwentysixco/" target="_blank" rel="noopener">Instagram</a></p>
      </div>
      <button class="menu-x" data-close title="Close menu" aria-label="Close menu"><i></i><i></i><i></i></button>
    </div>`;
  document.body.appendChild(overlay);

  const sheet = overlay.querySelector('.menu-sheet');
  const morph = overlay.querySelector('.menu-logomorph');
  const menuX = overlay.querySelector('.menu-x');
  const menuCities = overlay.querySelectorAll('.menu-city');
  const menuTagline = overlay.querySelector('.menu-tagline');
  const pageTagline = document.querySelector('.hdr-tagline');
  if (pageTagline) menuTagline.textContent = pageTagline.textContent;
  const taglineNow = () => pageTagline ? (parseFloat(pageTagline.style.opacity || '1') || 0) : 0;
  /* seat the menu's LA/NY exactly on the page header's cities (no snap) */
  function seatCitiesOnHeader(instant) {
    const pc = document.querySelectorAll('.hdr .nav-sm');
    if (pc.length < 2) return;
    const sr = sheet.getBoundingClientRect();
    menuCities.forEach((el, i) => {
      const r = pc[i].getBoundingClientRect();
      if (instant) el.style.transition = 'none';
      el.style.left = Math.round(r.left - sr.left) + 'px';
      el.style.top = Math.round(r.top - sr.top) + 'px';
    });
  }
  let hamTop = null;
  /* Joel 8/24: THE MENU'S WORD NEVER GROWS. Opening folds the SX out into
     the COMPACT-SCALE SIX26 — renderUp phase A only (I/2/6 fade in at
     small size while the X and (R) slide over to make room) — and STOPS
     there. No phase-B growth. Closing folds it back to the SX. If the menu
     opens where the word is already big (top of home), it simply stays as
     it is. u is renderUp's clock: 0 = compact SX, 0.55 = small SIX26
     fully formed, 1 = big. */
  const renderLetters = window.SXLogo ? SXLogo.build(morph) : null;
  const U_OPEN = 0.55;
  let u = 0, startU = 0, qRaf = null;
  function applyU() { if (renderLetters) renderLetters.up(u); }
  function tweenU(to) {
    /* u runs at 1.0/s — phase A lands in the same ~0.55s it takes on the
       homepage's up path, so the fold feels identical through either door */
    cancelAnimationFrame(qRaf);
    let last = performance.now();
    const step = now => {
      const dt = Math.min(0.05, (now - last) / 1000) || 1 / 60;
      last = now;
      u = to > u ? Math.min(to, u + 1.0 * dt) : Math.max(to, u - 1.0 * dt);
      applyU();
      if (u !== to) qRaf = requestAnimationFrame(step);
    };
    qRaf = requestAnimationFrame(step);
  }
  let startGeom = null;   // header metrics when we opened
  let closeTimer = null;

  /* Where is the page's logo right now? (Compact SX on interior pages,
     morphing SIX26/SX on the homepage.) Coordinates relative to the sheet. */
  function readHeaderState() {
    const sheetRect = sheet.getBoundingClientRect();
    const hdr = document.querySelector('.hdr');
    const candidates = ['#marksx', '#mark6', '.hdr-logo'];
    let el = null;
    for (const sel of candidates) {
      const c = document.querySelector(sel);
      if (c && parseFloat(getComputedStyle(c).opacity) > 0.5) { el = c; break; }
    }
    if (!el) el = document.querySelector('.hdr-logo') || hdr;
    const r = el.getBoundingClientRect();
    const bg = document.querySelector('.hdr-bg');
    const hdrH = bg ? bg.getBoundingClientRect().height
                    : (hdr ? hdr.getBoundingClientRect().height : 118);
    return {
      left: r.left - sheetRect.left, top: r.top - sheetRect.top,
      width: r.width, height: r.height,
      hdrH: Math.max(60, Math.round(hdrH)),
      isBig: r.width > 400, // already the big SIX26 (homepage, top of page)
    };
  }

  function open() {
    if (overlay.classList.contains('open')) return;
    clearTimeout(closeTimer);
    startGeom = readHeaderState();
    /* Stage the panel on the current header, letters at the page's exact
       morph state (homepage exposes its scroll progress; interiors are 1).
       q 0=big..1=SX maps onto renderUp's clock as u = 1-q. */
    const startQ = (typeof window.SX_MORPH_Q === 'number') ? window.SX_MORPH_Q : 1;
    startU = Math.max(0, Math.min(1, 1 - startQ));
    u = startU;
    morph.style.transition = 'none';
    morph.style.top = (window.SX_MORPH_TOPOFF || 0) + 'px';
    applyU();
    sheet.style.transition = 'none';
    sheet.style.height = startGeom.hdrH + 'px';
    /* seat the X at the hamburger's EXACT viewport spot at click time —
       fixed positioning, so no layout or animation can move it (Joel 8/21:
       click low, it stays low; click high, it stays high) */
    const ham = document.querySelector('.hdr-menu .l');
    if (ham) {
      const hr = ham.getBoundingClientRect();
      hamTop = Math.round(hr.top);
      menuX.style.left = Math.round(hr.left) + 'px';
      menuX.style.top = hamTop + 'px';
    }
    seatCitiesOnHeader(true); // cities start where the header's are
    menuTagline.style.transition = 'none';
    menuTagline.style.transitionDelay = '0s';
    menuTagline.style.opacity = String(taglineNow());
    overlay.classList.add('shown');
    document.body.classList.add('menu-open');
    void sheet.offsetHeight; // commit the start frame
    /* Grow: white space extends down, the letters morph back to full size. */
    sheet.style.transition = '';
    sheet.style.height = '';
    overlay.classList.add('open'); // the X is fixed-pinned; nothing to restore
    morph.style.transition = '';
    morph.style.top = '0px';
    /* Joel 8/24 (via prod, "menu too low / rides down unnecessarily"):
       the cities don't travel AT ALL — they hold the exact seats the page
       header had them in while the sheet grows past. The old 111/136
       big-menu rows predate the bottom-aligned header datum. */
    menuCities.forEach(el => { el.style.transition = ''; });
    menuTagline.style.transition = '';
    menuTagline.style.opacity = '0';   // fades away as the menu grows
    tweenU(Math.max(U_OPEN, startU)); // fold out to the small SIX26 — never bigger
    window.SX_SCROLL_LOCKED = true;
    document.documentElement.style.overflow = 'hidden';
    const s = document.getElementById('menu-search');
    s.value = '';
    filter('');
    /* type-to-search immediately — without focus the search read as dead
       (Joel 8/20) */
    setTimeout(() => s.focus(), 250);
  }

  function close() {
    if (!overlay.classList.contains('open')) return;
    overlay.classList.remove('open');
    /* Joel 8/22: the sheet's ease-out collapsed FAST and its edge cut the
       letter morph off mid-play. Closing runs on an in-out curve timed to
       the letters' full banded tween (~1.2s) — same speed, no clipping. */
    sheet.style.transition = 'height 1.2s cubic-bezier(0.65, 0, 0.35, 1), box-shadow 1.2s cubic-bezier(0.65, 0, 0.35, 1)';
    /* Shrink the white space back up and morph the letters home. */
    sheet.style.height = startGeom.hdrH + 'px';
    morph.style.top = (window.SX_MORPH_TOPOFF || 0) + 'px';
    seatCitiesOnHeader(false); // ride home to the header's exact seats
    menuTagline.style.transitionDelay = '0.55s';
    menuTagline.style.opacity = String(taglineNow()); // fades in as it collapses
    tweenU(startU);
    window.SX_SCROLL_LOCKED = false;
    document.documentElement.style.overflow = '';
    closeTimer = setTimeout(() => {
      overlay.classList.remove('shown');
      document.body.classList.remove('menu-open');
      sheet.style.transition = ''; // back to the open curve for next time
      sheet.style.height = '';
      menuX.style.left = '';
      menuX.style.top = '';
    }, 1260);
  }

  /* REAL SEARCH (Joel 8/22): a site-wide index — pages, directors, and
     capabilities — searched live. Matching menu links still light up, hits
     render under the rule, Enter opens the top hit. (Index is the future
     WordPress seam: swap for a live query when the CMS lands.) */
  const INDEX = [
    ['Home', 'Page', 'index.html'],
    ['Creatives', 'Page', 'creatives.html'],
    ['Case Studies', 'Page', 'case-studies.html'],
    ['Experiential', 'Page', 'experiential.html'],
    ['Services', 'Page', 'services.html'],
    ['About', 'Page', 'about.html'],
    ['Careers', 'Page', 'careers.html'],
    ['Contact', 'Page', 'contact.html'],
    ['Evan Bourque', 'Director', 'director.html?who=evan-bourque', 'https://api.sixtwentysix.co/wp-content/uploads/2026/08/Backyard0-1.jpg'],
    ['Gianluigi Carella', 'Director', 'director.html?who=gianluigi-carella', 'https://api.sixtwentysix.co/wp-content/uploads/2025/08/subzero_muzm-thumbnail.png'],
    ['Ivan Jurado', 'Director', 'director.html?who=ivan-jurado', 'https://api.sixtwentysix.co/wp-content/uploads/2026/02/Ivan-Jurado-Director-Reel.00_00_00_00.Still002.png'],
    ['Jimmy Tatro', 'Director', 'director.html?who=jimmy-tatro', 'https://api.sixtwentysix.co/wp-content/uploads/2026/06/JIMMY_REEL.png'],
    ['Julia Pitch', 'Director', 'director.html?who=julia-pitch', 'https://api.sixtwentysix.co/wp-content/uploads/2026/07/JULIA_Crocs-Obsessed0.jpg'],
    ['Kate Adams', 'Director', 'director.html?who=kate-adams', 'https://api.sixtwentysix.co/wp-content/uploads/2024/06/230324_02_STILL1_HERO_0378_V2.jpg'],
    ['Luke Orlando', 'Director', 'director.html?who=luke-orlando', 'https://api.sixtwentysix.co/wp-content/uploads/2026/03/LUKE-ORLANDO.00_00_00_00.Still004-1.png'],
    ['Marysia Makowska', 'Director', 'director.html?who=marysia-makowska', 'https://api.sixtwentysix.co/wp-content/uploads/2025/04/PEPSI-TEXT-FROM-GMA-THUMB-1-1.jpg'],
    ['Michael J. Murphy', 'Director', 'director.html?who=michael-j-murphy', 'https://api.sixtwentysix.co/wp-content/uploads/2025/12/Michael-J.-Murphy_Reel_251203.00_00_00_00.Still003-1.jpg'],
    ['Miles & AJ', 'Director Duo', 'director.html?who=miles-aj', 'https://api.sixtwentysix.co/wp-content/uploads/2026/03/First-Class-Credit-Karma_Web-Loop.00_00_00_00.Still003.jpg'],
    ['Nolan Goff', 'Director', 'director.html?who=nolan-goff', 'https://api.sixtwentysix.co/wp-content/uploads/2025/04/PACIFICO-THUMB-2A.jpg'],
    ['Plummer/Strauss', 'Director Duo', 'director.html?who=plummer-strauss', 'https://api.sixtwentysix.co/wp-content/uploads/2026/04/study-god.00_00_00_00.Still002.png'],
    ['Savannah O\u2019Leary', 'Director', 'director.html?who=savannah-oleary', 'https://api.sixtwentysix.co/wp-content/uploads/2026/01/award-win.png'],
    ['Sharon Chetrit', 'Director', 'director.html?who=sharon-chetrit', 'https://api.sixtwentysix.co/wp-content/uploads/2026/07/Sharon-still0.jpg'],
    ['Tom Morris', 'Director', 'director.html?who=tom-morris', 'https://api.sixtwentysix.co/wp-content/uploads/2025/10/thumb-12.jpg'],
    ['Commercial', 'Production', 'services.html'],
    ['Social', 'Production', 'services.html'],
    ['Music Videos', 'Production', 'services.html'],
    ['Branded Content', 'Production', 'services.html'],
    ['Editorial', 'Post', 'services.html'],
    ['VFX', 'Post', 'services.html'],
    ['Unreal Engine', 'Post', 'services.html'],
    ['Animation', 'Post', 'services.html'],
    ['Color', 'Post', 'services.html'],
    ['Music & Sound', 'Post', 'services.html'],
    ['Motion Graphics', 'Post', 'services.html'],
    ['Research & Strategy', 'Creative', 'services.html'],
    ['Concepting', 'Creative', 'services.html'],
    ['Scripting', 'Creative', 'services.html'],
    ['Event Production', 'Experiential', 'experiential.html'],
    ['Event Capture', 'Experiential', 'experiential.html'],
    ['Livestream', 'Experiential', 'experiential.html'],
    ['Fabrication', 'Experiential', 'experiential.html'],
    ['Experiential Campaigns', 'Experiential', 'experiential.html'],
    ['Live Events', 'Experiential', 'experiential.html'],
    ['Activations & Installations', 'Experiential', 'experiential.html'],
  ];
  /* THE WORDPRESS SEAM, filled (Joel 8/24: "an in depth directory of
     everything ever"): on first search the whole CMS joins the index —
     every work (375+, opening its real page) and every press article
     (opening the real story). One fetch per page load, only when used. */
  let wpLoaded = false, wpLoading = false;
  function loadWpIndex() {
    if (wpLoaded || wpLoading) return;
    wpLoading = true;
    const gql = q => fetch('https://api.sixtwentysix.co/graphql', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q })
    }).then(r => r.json());
    const jobs = [];
    /* all works, cursor-paginated */
    jobs.push((async () => {
      let cursor = null;
      for (let i = 0; i < 6; i++) {
        const after = cursor ? ', after: ' + JSON.stringify(cursor) : '';
        const d = await gql('{ caseStudies(first: 100' + after + ') { pageInfo { hasNextPage endCursor } nodes { slug title featuredImage { node { sourceUrl } } } } }');
        const cs = d.data && d.data.caseStudies;
        if (!cs) break;
        cs.nodes.forEach(n => { if (n.title) INDEX.push([n.title.replace(/&amp;/g, '&'), 'Work', 'case-study.html?work=' + n.slug,
          (n.featuredImage && n.featuredImage.node && n.featuredImage.node.sourceUrl) || '']); });
        if (!cs.pageInfo.hasNextPage) break;
        cursor = cs.pageInfo.endCursor;
      }
    })());
    /* every press article -> the real story */
    jobs.push(gql('{ posts(first: 100) { nodes { title news { linkUrl } featuredImage { node { sourceUrl } } } } }').then(d => {
      ((d.data && d.data.posts && d.data.posts.nodes) || []).forEach(n => {
        if (n.title && n.news && n.news.linkUrl) INDEX.push([n.title.replace(/&amp;/g, '&'), 'News', n.news.linkUrl,
          (n.featuredImage && n.featuredImage.node && n.featuredImage.node.sourceUrl) || '']);
      });
    }));
    Promise.allSettled(jobs).then(() => { wpLoaded = true; filter(search.value); });
  }

  /* the outbound half of the Back-to-the-exact-spot law: any click into a
     work page remembers this page + scroll seat (document-level, so tiles
     built later are covered too) */
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href*="case-study.html"]');
    if (!a) return;
    try {
      /* 9/3: the query rides along (minus the cache stamp) — director.html
         is per-director now, so a bare 'director.html' would return to the
         default director instead of the one you were on */
      const sp = new URLSearchParams(location.search);
      sp.delete('r');
      const q = sp.toString();
      sessionStorage.setItem('sx-return', JSON.stringify({
        page: (location.pathname.split('/').pop() || 'index.html') + (q ? '?' + q : ''),
        y: window.scrollY
      }));
    } catch (err) {}
  }, true);

  const links = [...overlay.querySelectorAll('.menu-link')];
  const resultsEl = overlay.querySelector('#menu-results');
  let topHit = null;
  const escHtml = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function filter(q) {
    q = q.trim().toLowerCase();
    links.forEach(l => l.classList.toggle('dim', !!q && !l.dataset.label.includes(q)));
    topHit = null;
    if (!q) { resultsEl.innerHTML = ''; return; }
    loadWpIndex();
    const hits = INDEX.filter(r => r[0].toLowerCase().includes(q)).slice(0, 10);
    topHit = hits.length ? hits[0][2] : null;
    resultsEl.innerHTML = hits.map(r => {
      const ext = /^https?:/.test(r[2]);
      return `<a class="menu-hit" href="${escHtml(r[2])}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}${r[3] ? ' data-thumb="' + escHtml(r[3]) + '"' : ''}><span class="mh-t">${escHtml(r[0])}</span>&nbsp;&nbsp;<span class="mh-s">${escHtml(r[1])}</span></a>`;
    }).join('') + (wpLoaded || !q ? '' : '<p class="menu-hit" style="opacity:0.4; pointer-events:none;">searching everything\u2026</p>');
  }
  /* 9/3 (Joel): hovering a search result shows THAT thing's thumbnail on
     the menu's left side — a 16:9 preview fading in over the dimmed link
     columns (directors = reel poster, works + news = their WP still). */
  const prev = document.createElement('div');
  prev.id = 'menu-preview';
  prev.style.cssText = 'position:absolute; left:63px; top:204px; width:480px; height:270px;' +
    ' overflow:hidden; opacity:0; transition:opacity 0.35s ease; pointer-events:none; z-index:2; background:#000;';
  prev.innerHTML = '<img style="width:100%; height:100%; object-fit:cover; display:block;" alt="">';
  overlay.querySelector('.menu-sheet').appendChild(prev);
  const prevImg = prev.querySelector('img');
  const sheetEl = overlay.querySelector('.menu-sheet');
  const pvStyle = document.createElement('style');
  /* 9/3 Joel: while the thumbnail is up, the menu's other copy goes away
     (labels + links fade to nothing; the contact foot row stays per the
     always-see-the-links law) */
  pvStyle.textContent = '#menu-overlay .menu-sheet.pv-on .menu-label,' +
    ' #menu-overlay .menu-sheet.pv-on .menu-link { opacity: 0 !important; pointer-events: none; }';
  document.head.appendChild(pvStyle);
  const showPrev = on => {
    prev.style.opacity = on ? '1' : '0';
    sheetEl.classList.toggle('pv-on', on);
  };
  resultsEl.addEventListener('mouseover', e => {
    const hit = e.target.closest && e.target.closest('.menu-hit');
    if (!hit) return;
    if (hit.dataset.thumb) {
      if (prevImg.getAttribute('src') !== hit.dataset.thumb) prevImg.src = hit.dataset.thumb;
      showPrev(true);
    } else showPrev(false);
  });
  resultsEl.addEventListener('mouseleave', () => showPrev(false));

  const search = overlay.querySelector('#menu-search');
  search.addEventListener('input', () => { filter(search.value); showPrev(false); });
  search.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      if (topHit) { location.href = topHit; return; }
      const hit = links.find(l => !l.classList.contains('dim'));
      if (hit) location.href = hit.getAttribute('href');
    }
    if (e.key === 'Escape') close();
  });

  overlay.querySelectorAll('[data-close]').forEach(el =>
    el.addEventListener('click', close));
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });

  document.querySelectorAll('.hdr-menu').forEach(btn =>
    btn.addEventListener('click', open));
})();
