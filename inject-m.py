#!/usr/bin/env python3
"""Build site/m.html from site/m-src.html (2026-09-08).

The mobile app must never drift from the desktop build, so every piece of
shared truth is lifted from the desktop pages at build time and spliced
into the %%PLACEHOLDER%% slots in m-src.html:

  %%HP%%     experiential.html  const COPY       (how-we-make-it-happen copy)
  %%TST%%    services.html      const PEOPLE     (testimonials)
  %%STEPS%%  services.html      const STEPS      (the stepper's pillar items)
  %%LOOPS%%  index.html         const WORK_LOOPS (home tile loops)
  %%CSW%%    case-studies.html  const WORKS      (the case-studies ledger)
  %%CSS%%    case-studies.html  const SLUGS      (tile -> work page)
  %%CSL%%    case-studies.html  const LOOPS      (case-studies tile loops)
  %%CV%%     about.html         const COPY       (core-values copy)
  %%TEAM%%   about.html         const TEAM       (Meet the core team roster)
  %%INDEX%%  menu.js            const INDEX      (menu search index)
  %%S%% %%I%% %%X%% %%N2%% %%N6%% %%RR%% %%RM%% %%W%%
             brand letter SVGs + the footer wordmark, carried in
             site/m-brand.json (extracted once from the built m.html; the
             letters are static brand assets, not page copy)

Usage: python3 inject-m.py [--check]   (--check only reports, no write)
Exit non-zero if any placeholder is left unfilled.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, 'site')
SRC = os.path.join(SITE, 'm-src.html')
OUT = os.path.join(SITE, 'm.html')
BRAND = os.path.join(SITE, 'm-brand.json')


def read(name):
    with open(os.path.join(SITE, name), encoding='utf-8') as f:
        return f.read()


def block(text, name, opener):
    """Return the JS literal assigned in `const <name> = <opener>...;`
    (first occurrence), balanced by bracket depth, strings respected."""
    m = re.search(r'\bconst\s+' + re.escape(name) + r'\s*=\s*' + re.escape(opener), text)
    if not m:
        raise SystemExit(f'inject-m: const {name} not found')
    i = m.end() - 1
    depth = 0; q = None; esc = False
    close = {'[': ']', '{': '}'}
    j = i
    while j < len(text):
        c = text[j]
        if q:
            if esc: esc = False
            elif c == '\\': esc = True
            elif c == q: q = None
        else:
            if c in ('"', "'", '`'): q = c
            elif c in '[{': depth += 1
            elif c in ']}':
                depth -= 1
                if depth == 0:
                    return text[i:j + 1]
        j += 1
    raise SystemExit(f'inject-m: const {name} never closes')


def main():
    check = '--check' in sys.argv
    src = read('m-src.html')
    if not os.path.exists(BRAND):
        # first run: harvest the brand SVGs from the existing built m.html
        built = read('m.html')
        lsvg = block(built, 'LSVG', '{')
        parts = {}
        for k in ['s', 'i', 'x', 'n2', 'n6', 'rr', 'rm']:
            mm = re.search(r'\b' + k + r':`(.*?)`', lsvg, re.S)
            if not mm: raise SystemExit(f'inject-m: LSVG.{k} missing in m.html')
            parts[k.upper()] = mm.group(1)
        mw = re.search(r'const SVG_W = `(.*?)`;', built, re.S)
        if not mw: raise SystemExit('inject-m: SVG_W missing in m.html')
        parts['W'] = mw.group(1)
        with open(BRAND, 'w', encoding='utf-8') as f:
            json.dump(parts, f)
        print('inject-m: harvested brand SVGs ->', os.path.relpath(BRAND, HERE))
    brand = json.load(open(BRAND, encoding='utf-8'))

    fills = {
        'HP': block(read('experiential.html'), 'COPY', '['),
        'TST': block(read('services.html'), 'PEOPLE', '['),
        'STEPS': block(read('services.html'), 'STEPS', '['),
        'LOOPS': block(read('index.html'), 'WORK_LOOPS', '{'),
        'CSW': block(read('case-studies.html'), 'WORKS', '['),
        'CSS': block(read('case-studies.html'), 'SLUGS', '{'),
        'CSL': block(read('case-studies.html'), 'LOOPS', '{'),
        'CV': block(read('about.html'), 'COPY', '['),
        'TEAM': block(read('about.html'), 'TEAM', '['),
        'INDEX': block(read('menu.js'), 'INDEX', '['),
    }
    fills.update(brand)

    out = src
    for k, v in fills.items():
        out = out.replace('%%' + k + '%%', v)
    left = sorted(set(re.findall(r'%%[A-Z0-9]+%%', out)))
    if left:
        raise SystemExit('inject-m: unfilled placeholders ' + ', '.join(left))
    if check:
        print('inject-m: OK (check only),', len(out), 'bytes'); return
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(out)
    print(f'inject-m: wrote {os.path.relpath(OUT, HERE)} ({len(out)} bytes) from '
          + ', '.join(f'{k}={len(v)}' for k, v in fills.items() if k not in brand))


if __name__ == '__main__':
    main()
