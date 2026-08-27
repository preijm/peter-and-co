# Peter & Co.

Personal portfolio and project hub — [peterandco.nl](https://peterandco.nl)

A single self-contained HTML file. All components, themes, and layout live in `index.html`. React and Babel run in-browser locally; JSX is pre-compiled by CI for production. Flip between four named themes at runtime. Project and tool content is managed in [Sanity](https://sanity.io) and fetched live at load.

---

## Themes

The site ships with six named, versioned themes switchable at runtime:

| Theme | Style |
|---|---|
| **Ink** `v1` | Dark · minimal · no noise |
| **Broadside** `v1` | Light · oversized · one statement |
| **Mondriaan** `v1` | Primary colours · geometric · De Stijl |
| **Volt** `v1` | Dark · minimal · systems |
| **Grain** `v1` | Cinematic · achromatic · full-bleed |
| **Prism** `v1` | Light · colour · depth |

Only **Ink** now uses the default layout and component set. The other five are full takeovers — each owns its own top-level component and every pixel of the page (see [THEMES.md](THEMES.md) for the rules governing theme structure, tokens, and each takeover's internals). Broadside was called Chalk until it became a takeover; its `chalk-v1` id was retired, not aliased.

Projects have per-theme accent colours defined in their data — a `resolveAccent(project, themeId)` helper picks the right one at render time.

---

## Content: Sanity is the source of truth

Projects and tools are **not** hardcoded — they're managed in a [Sanity Studio](studio/) and fetched live when the site loads (`loadSanityContent()` in `index.html`). The `PROJECTS` / `TOOL_CATEGORIES` arrays inline in `index.html` are only a **frozen fallback snapshot**, used if Sanity is ever unreachable, so the site never fully breaks — they are not kept in sync automatically and shouldn't be hand-edited for routine content changes.

**To add or change a project or tool, edit it in Sanity Studio** — see [studio/README.md](studio/README.md) for setup and day-to-day use.

---

## Stack

- React 18 (UMD via unpkg, no bundler)
- Babel Standalone (JSX transpiled in-browser in dev; pre-compiled by `build.js` for production)
- Sanity (headless CMS — projects, tools)
- DM Serif Display + JetBrains Mono (Ink/Broadside)
- Archivo Black + Space Grotesk + Space Mono (Mondriaan)
- Geist + Geist Mono (Volt)
- GSAP + ScrollTrigger, Three.js (Volt — lazy-loaded only when the theme activates)
- Formspree (contact form)
- Counterscale (self-hosted analytics, on Cloudflare Workers)
- Cloudflare (DNS/redirects)
- GitHub Pages

---

## Build & deploy

CI runs on every push to `master`:

```
npm ci → node build.js → dist/ → GitHub Pages
```

`build.js` compiles the JSX with Babel and writes `dist/`. It also copies static assets (`screenshots/`, `social-card.png`, `CNAME`, `themes/`, `robots.txt`, `sitemap.xml`, `google*.html`, `footprint.json`) and stamps `sitemap.xml`'s `lastmod` on every build. **Never edit `dist/`** — it is generated and not tracked in git.

---

## Build footprint

Project pages show a "build footprint" rule — prompts, active hours, and tokens generated — measured from local Claude Code session logs.

```bash
npm run footprint
```

On PowerShell, use `npm.cmd run footprint` — the default execution policy refuses to load npm's `.ps1` wrapper. `node tools/footprint/extract.js --json footprint.json --only milk-me-not,folio` works from any shell.

That regenerates `footprint.json`, which is committed and copied to `dist/`. CI cannot produce it: the session logs only exist on the machine that did the work, so it is generated locally and checked in. Re-run it whenever you want the numbers refreshed, then commit.

Three things are worth knowing before touching it:

- **Every figure is a floor, not a total.** Only Claude Code records per-message token counts; work done in other tools is invisible. Each project's caveat line is generated from its coverage data, so it cannot drift out of sync with the numbers beside it.
- **`--only` is a publish allowlist**, and it gates both published files. Without it the command refuses to write, because `footprint.json` is served from the site and `tools/footprint/archive.json` is committed to a public repo — naming a project publicly has to be deliberate.
- **`tools/footprint/archive.local.json` is the durable record and is gitignored.** Claude Code deletes session logs after `cleanupPeriodDays` (default 30), so this file is the only lasting copy of anything already cleaned up. It is not backed up by pushing.

Full methodology, the emission factors, and why there is no tree metric: [tools/footprint/README.md](tools/footprint/README.md).

---

## Run locally

```bash
npx serve .
```

Open the served URL (see `.claude/launch.json` for the configured port). Mondriaan and Volt are lazy-loaded and compiled at runtime in dev; both are pre-compiled in the production build.

---

## Architecture

Everything lives in `index.html`. The file is structured in layers:

```
THEMES            — named theme objects (colors, fonts, id)
PROJECTS          — fallback project data (title, stack, accent, etc.)
TOOL_CATEGORIES   — fallback tools data shared across all themes
resolveAccent()   — picks per-theme accent color for a project
loadSanityContent() — fetches live content, overwrites PROJECTS / TOOL_CATEGORIES
Components        — Ink first, then one blob per takeover edition
App               — routes between pages, switches renderer based on theme
```

### Default-layout components (Ink)

| Component | What it does |
|---|---|
| `ThemeProvider` | Theme context, edition modal state |
| `SiteHeader` | Responsive logo + nav |
| `Hero` | Homepage headline and CTA |
| `ProjectCard` | Card in the featured grid |
| `ProjectStrip` | Row-based list of all projects |
| `ProjectGrid` | Card grid (featured or full) |
| `ProjectDetail` | Full project page — screenshot, before/after slider, or live embedded preview |
| `BeforeAfterSlider` | Drag-to-reveal comparison for redesign case studies |
| `LivePreview` | Scaled, interactive iframe embed of a project's live site |
| `About` | Bio, photo, background |
| `Tools` | Tool list, row-aligned across categories |
| `Contact` | Formspree-backed contact form |
| `Footer` | Links + edition label |

### Mondriaan components

Lives in a `<script type="text/plain" id="mondriaan-src">` blob.

| Component | What it does |
|---|---|
| `MHomeComposition` | Mondriaan-grid homepage with animated paint-in |
| `MWorkTable` | Full-width table of all projects |
| `MMiniProjectCard` | Compact card used in homepage grid |
| `MProjectCard` | Full card for work page |
| `MProjectDetail` | De Stijl project detail view |
| `MAbout` | Geometric bio layout |
| `MTools` | Row-aligned tools grid (reads from `TOOL_CATEGORIES`) |
| `MContact` | Formspree form with Mondriaan styling |
| `MHeader` / `MFooter` | Mondriaan nav and footer |

### Volt components

Lives in a `<script type="text/plain" id="volt-src">` blob. A dark, restrained one-pager — see [THEMES.md](THEMES.md) for the full design description.

| Component | What it does |
|---|---|
| `VoltApp` | Top-level takeover — mounts hero, work, background, contact |
| `VHero` | Headline + intro, with the interactive terminal |
| `VTerminal` | Real command-line (`help`, `projects`, `open <n>`, `contact`, …) in the hero |
| `VWork` / `VRow` | Project list with ghost index numbers |
| `VBackground` | Bio blurb + `~/about.cfg` facts block |
| `VContact` | Contact CTA + footer |
| `VParticles` | Scroll-reactive Three.js point field backdrop (lazy-loaded) |

---

## Other files

| File / folder | Purpose |
|---|---|
| `build.js` | Compiles JSX + bundles `dist/` for production |
| `studio/` | Sanity Studio — the content admin (see [studio/README.md](studio/README.md)) |
| `tools/footprint/` | Build-footprint extractor (see [its README](tools/footprint/README.md)) |
| `footprint.json` | Generated build-footprint data, served from the site |
| `THEMES.md` | Canonical rules for theme structure, tokens, and the Mondriaan/Volt internals |
| `themes/` | Per-theme favicon SVG assets |
| `screenshots/` | Static project screenshots copied to `dist/` |
| `social-card.png` | OG/Twitter share image (1200×630) |
| `CNAME` | GitHub Pages custom domain |
