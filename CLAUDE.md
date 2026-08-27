# P&Co — Claude Instructions

## Project
Single-file React site (`index.html`). All components, themes, and data live in that one file. You edit `index.html` directly — it is the source of truth.

## Build & Deploy
JSX is written directly in `index.html` but **pre-compiled by CI**, not in the browser:
- `build.js` runs via `node build.js` — it compiles the JSX with Babel and writes a `dist/` folder
- GitHub Actions (`.github/workflows/deploy.yml`) runs `build.js` on every push to `master` and deploys `dist/` to GitHub Pages
- **Never edit `dist/`** — it is generated and not tracked in git

For local preview, the raw `index.html` still works in the browser via `npx serve .` (see `.claude/launch.json`). The Mondriaan theme is lazy-loaded and compiled at runtime in dev, but pre-compiled in the build.

## Content (projects & tools)
Projects and tools are **driven by Sanity** — it's the single source of truth. The site fetches from Sanity at load (`loadSanityContent()` in `index.html`) and overwrites the inline `PROJECTS` / `TOOL_CATEGORIES` arrays in place. Those inline arrays are what the page paints *before* that fetch resolves (`loadSanityContent()` runs in an effect), and what it keeps if Sanity is unreachable — so they can't just be deleted, or the first frame has no projects.

**They are regenerated from Sanity by `build.js` on every deploy** (`tools/sanity-snapshot.js`), so the shipped copy is never more than one deploy stale and nobody hand-syncs it. The copy committed in `index.html` only affects local `npx serve .`. Either way: **edit content in Sanity Studio**, not the arrays or any CSV. See **[studio/README.md](studio/README.md)** for how to run/use the Studio.

## Theme Work
Before designing or modifying any theme, read **[THEMES.md](THEMES.md)** — it contains the canonical rules for theme structure, taglines, color tokens, the Editions modal, and the Mondriaan paint-in animation.

## Mondriaan Theme Internals
The Mondriaan theme lives in a `<script type="text/plain" id="mondriaan-src">` blob inside `index.html`. It is compiled by Babel at runtime in dev and pre-compiled by `build.js` in CI. Key constants used throughout:

```js
const M_LINE   = 6           // grid gap / border width on subpages (px)
const M_PLINE  = 10          // painted line width on the home canvas (px)
const M_BLACK  = '#0a0a0a'   // text + subpage borders
const M_INK    = '#141210'   // painted line black (home canvas)
const M_LINEN  = '#efece3'   // raw-canvas page ground
const M_RED    = '#d72027'
const M_BLUE   = '#1d4ed8'
const M_YELLOW = '#fcc60b'
const M_WHITE  = '#f6f3ea'   // painted white — warm, never pure
const M_W      = ['#faf7ef', '#f1eee3', '#f6f3ea', '#edeadf'] // broken whites, one per plane
const M_DISPLAY = 'Archivo Black, sans-serif'
const M_SANS    = 'Space Grotesk, sans-serif'
const M_MONO    = 'Space Mono, monospace'
```

Every desktop page renders as a full-bleed painting (see THEMES.md "Mondriaan
Home Painting" and "Painted subpages"): SVG turbulence filters wobble every
plane edge, brush-streak masks add directional paint, and a fixed grain +
linen overlay covers the whole edition. Home is a single viewport-filling
canvas with no footer; the other pages stack `MPaintedHeader` and an
`MSectionCanvas` composition. The painted `MFooter` renders only on the
contact page. Mobile keeps the classic bordered layouts.

## PR Workflow
- Always check PR state before pushing (`gh pr list --state open`)
- If the previous PR is already merged, create a **fresh branch from master** — never reuse a merged branch
- Resolve merge conflicts by keeping the HEAD version unless the incoming change is intentional

## Build Output
`build.js` copies these to `dist/` alongside the compiled HTML:
`screenshots/`, `footage/`, `social-card.png`, `CNAME`, `themes/`, `robots.txt`, `sitemap.xml`, `google*.html`

It also regenerates `footage/manifest.json` from the contents of `footage/` before
copying, so the Grain edition always sees the photographs that are actually there.

Before compiling, it bakes the current Sanity content into the `PROJECTS` /
`TOOL_CATEGORIES` arrays. See `tools/sanity-snapshot.js`. That step lifts the queries
and mappers straight out of `index.html` (between the `SANITY-SHARED` markers) and runs
them in Node, so there is no second copy of the mapping to drift. It is non-fatal: if
Sanity is unreachable the build logs it and ships the arrays as committed. Run
`node tools/sanity-snapshot.js` to see exactly what a deploy would bake in.
**`footage/` is copied selectively** — only the files the manifest names, plus the
manifest itself. The folder is a working directory (HEIC originals, colour masters,
the shooting guide) and none of that can be requested by the page.

Run `npm run footage` after adding a photo locally. It converts any HEIC to JPEG
(Windows HEIF codec), re-encodes every JPEG/PNG as a grayscale WebP (ffmpeg — the Grain
planes render `grayscale(1)`, so shipping colour is bytes thrown away), and rewrites
the manifest, which prefers the best format per slot. Both steps no-op with a note when
their tool is missing, so CI is unaffected. See [footage/README.md](footage/README.md).
