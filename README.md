# Peter & Co.

Personal portfolio and project hub — [peterandco.nl](https://peterandco.nl)

A single self-contained HTML file. All components, themes, and data live in `index.html`. React and Babel run in-browser locally; JSX is pre-compiled by CI for production. Flip between three named themes at runtime.

---

## Themes

The site ships with three named, versioned themes switchable at runtime:

| Theme | Style |
|---|---|
| **Ink** `v1` | Dark · minimal · editorial |
| **Chalk** `v1` | Light · open · breathing room |
| **Mondriaan** `v1` | Primary colours · geometric · bold |

Each theme has its own full-page layout variants for Work, Tools, About, and Contact. Projects have per-theme accent colours defined in their data — a `resolveAccent(project, themeId)` helper picks the right one at render time.

---

## Stack

- React 18 (UMD via unpkg, no bundler)
- Babel Standalone (JSX transpiled in-browser)
- DM Serif Display + JetBrains Mono (Ink/Chalk)
- Archivo Black + Space Grotesk + Space Mono (Mondriaan)
- Formspree (contact form)
- Counterscale (self-hosted analytics)
- GitHub Pages

---

## Build & deploy

CI runs on every push to `master`:

```
npm ci → node build.js → dist/ → GitHub Pages
```

`build.js` compiles the JSX with Babel and writes `dist/`. It also copies static assets (`screenshots/`, `assets/`, `social-card.png`, `CNAME`, `themes/`). **Never edit `dist/`** — it is generated and not tracked in git.

---

## Run locally

```bash
npx serve .
```

Open [localhost:3456](http://localhost:3456). The Mondriaan theme is lazy-loaded and compiled at runtime in dev; it is pre-compiled in the production build.

---

## Architecture

Everything lives in `index.html`. The file is structured in layers:

```
THEMES          — named theme objects (colors, fonts, id)
PROJECTS        — project data (title, stack, accent, etc.)
TOOL_CATEGORIES — tools data shared across all themes
resolveAccent() — picks per-theme accent color for a project
Components      — Ink/Chalk variants first, Mondriaan variants below
App             — routes between pages, switches renderer based on theme
```

### Ink / Chalk components

| Component | What it does |
|---|---|
| `ThemeProvider` | Theme context, edition modal state |
| `SiteHeader` | Responsive logo + nav |
| `Hero` | Homepage headline and CTA |
| `ProjectCard` | Card in the featured grid |
| `ProjectStrip` | Row-based list of all projects |
| `ProjectGrid` | Card grid (featured or full) |
| `ProjectDetail` | Full project page |
| `About` | Bio, photo, background |
| `Tools` | Tool list, row-aligned across categories |
| `Contact` | Formspree-backed contact form |
| `Footer` | Links + edition label |

### Mondriaan components

| Component | What it does |
|---|---|
| `MHomeComposition` | Mondrian-grid homepage with animated paint-in |
| `MWorkTable` | Full-width table of all projects |
| `MMiniProjectCard` | Compact card used in homepage grid |
| `MProjectCard` | Full card for work page |
| `MProjectDetail` | De Stijl project detail view |
| `MAbout` | Geometric bio layout |
| `MTools` | Row-aligned tools grid (reads from `TOOL_CATEGORIES`) |
| `MContact` | Formspree form with Mondriaan styling |
| `MHeader` / `MFooter` | Mondriaan nav and footer |

---

## Adding content

Projects and tools are plain JS objects — edit the `PROJECTS` array and `TOOL_CATEGORIES` array near the top of `index.html`.

**Project fields:** `id`, `featured`, `title`, `description`, `tags`, `year`, `url`, `href`, `accent`, `tagline`, `detail`, `role`, `stack`, `screenshot`, `livePreview`

- `screenshot` — path to a static image shown in the project card (e.g. `screenshots/peterandco.png`)
- `livePreview: true` — renders an interactive scaled iframe of `href` instead of a screenshot; hover to preview, click to interact, Escape or EXIT button to exit

**Accent colour format:**
```js
accent: { default: '#22c55e', 'mondriaan-v1': '#fcc60b' }
```
Add a new key when adding a new theme.

---

## Other files

| File | Purpose |
|---|---|
| `build.js` | Compiles JSX + bundles dist/ for production |
| `THEMES.md` | Canonical rules for theme structure, tokens, and Mondriaan animation |
| `themes/` | Per-theme favicon SVG assets |
| `screenshots/` | Static project screenshots copied to dist/ |
| `social-card.png` | OG/Twitter share image (1200×630) |
| `CNAME` | GitHub Pages custom domain |
