# SIXTWENTYSIX website prototype (2026 redesign)

The design prototype of the sixtwentysix.co redesign, built by Joel Cormack (Aug to Sep 2026)
as static HTML/CSS/JS from the Figma file "Final Website Options". It is the reference for
look, motion and behaviour. It is not the production codebase.

Live preview: https://joelcormack1.github.io/sx-site-preview/view.html?p=index.html
Figma: https://www.figma.com/design/5WhzL7oOxqyuepi0yLHyiN/Final-Website-Options
(desktop pages plus the "Full Site Mobile" page)

## Run it locally

Serve this folder with any static file server, then open
`http://localhost:<port>/view.html?p=index.html`. Python's built-in `http.server` has no
Range support, so the local mp4 reels may not scrub with it; `npx serve .` works.

## How it fits together

**A 1728 canvas and a shell.** Every desktop page is laid out on a fixed 1728px-wide canvas
(the Figma frame). `view.html` is the shell: it loads the page in an iframe, scales it to the
window width, keeps the header chrome optically constant, adds a `?r=` cache stamp, and paints
the curtain between page swaps (pages post `{sx:'curtain' | 'hold' | 'ready'}` messages up to
it). Opening a page directly redirects into the shell; add `?flat=1` to a page URL to bypass
that while testing.

**Pages.** `index.html` (home), `case-studies.html`, `case-study.html?work=<slug>` (a work),
`creatives.html`, `director.html?who=<slug>`, `experiential.html`, `services.html`,
`about.html`, `careers.html`, `contact.html`. `m.html` is the phone build (below).
`lab.html` is the home-entrance lab (dev only). `probe.html`, `template.html` and
`director-bio-alt.html` are scratch and not linked from anywhere.

**Shared engines, loaded by the pages.**
- `smoothscroll.js`: damped wheel scroll, the finger damper and fling, the snap zones that the
  pinned steppers register (`SX_SNAP` / `SX_SNAPS`), slow zones, speed caps (`SX_SCROLL_MAXV`).
- `gridhover.js` (`SXGrid.attach`): the tile law. Hover grows a tile, ghosts the rest of the grid
  to 15% and plays the tile's loop; on touch the first tap previews and the second opens.
- `footerlaw.js`: the footer pin law and the SIX26 rise, the curtain and handoff messages to the shell.
- `logomorph.js`: the SX / SIX26 header. Joel's film as 73 alpha WebP frames in `assets/sxanim`,
  drawn on a canvas and scrubbed by scroll. `logomorph.vector.js` is the older vector morph, unused.
- `menu.js`: the menu overlay and its search over the whole WordPress catalogue.
- `fitpage.js`: the one-screen pages (careers, contact).
- `directors.js`: `window.SX_DIRECTORS`, all 15 director pages harvested from the live site
  (bio, awards, reel, the works with stills and loops).
- `hoverlaw.js` and `takeover.js` are retired no-ops and can be deleted.

**Content.** The live site's headless WordPress (WPGraphQL at
`https://api.sixtwentysix.co/graphql`, public, read-only) feeds the home grid, the work pages,
creatives, the careers roles and the search index; images are hotlinked from it; loops and reels
are the live site's Vimeo CDN files. What the CMS does not hold is hardcoded in the page: the
case-studies ledger (`WORKS` in `case-studies.html`), the services steps and testimonials, the
about values and team, the experiential rows.

**Phone build.** `view.html` sends phones (coarse pointer, shorter side under 500px) to
`m.html`, a single-page hash-routed build from the Figma "Full Site Mobile" frames. It is
generated: `m-src.html` is the source and `inject-m.py` splices data blocks out of the desktop
pages into it (`%%STEPS%%` from `services.html`, and so on). Edit `m-src.html`, never `m.html`.
The script expects the project layout: it looks for a `site/` folder beside itself, so run it
from a parent folder that has this repo checked out as `site/`.

**Fonts.** HelveticaNeueCyr (Roman / Medium / Bold) and Azeret Mono in `fonts/`. Confirm the
licences before production.

**Deploy.** GitHub Pages from `main` of this repo. Pages caches for about ten minutes; the
shell's `?r=` stamp keeps the pages themselves fresh.

## Where it sits: current issues and production notes (2026-09-15)

1. **Responsive layout is the big one.** The fixed 1728 canvas scaled by the shell was the only
   way to keep the prototype 1:1 with the Figma. Production needs a real responsive layout:
   type and boxes stay at the design size, extra width goes to margins and columns, never to
   zoom, and no white gutters at any width.
2. **Content.** See above: half the copy is hardcoded because the CMS has nowhere to hold it.
   93 works on the live site have no copy at all in the CMS (Joel has the list as a CSV).
   Core values copy is placeholder except "Stay Curious"; the experiential offering copy is
   still pending from the studio.
3. **Loops and reels** are harvested Vimeo CDN files; production should read them from
   WordPress / Vimeo directly.
4. **The phone build** is a separate generated page, not a responsive version of the desktop pages.
5. **`prefers-reduced-motion` is ignored on purpose** (it silently disabled every animation
   during reviews). Needs a decision before launch.
6. **Touch feel.** The Services and Experiential steppers snap one step per swipe; the About
   values roll slowly. Not yet decided whether they should all roll.
7. **Hero reels** on home and the director pages are full bleed and crop by design; work films
   never crop (always the 16:9 frame).
8. **Open design decisions:** the menu word versus a listed nav; the hover takeover in black
   versus white; award years on the director pages.
9. **Older code review:** `BUG-HUNT-2026-08-21.md` is a review from August 21. Its top five
   and the reveal trio were fixed the same day; the rest were never re-audited and several
   sections have been rewritten since, so treat it as leads, not gospel.

Everything from the September iPad and phone testing rounds is fixed as of the 2026-09-15 build.
