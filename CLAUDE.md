# P&Co — Claude Instructions

## Project
Single-file React site (`index.html`). All components, themes, and data live in that one file. You edit `index.html` directly — it is the source of truth.

## Build & Deploy
JSX is written directly in `index.html` but **pre-compiled by CI**, not in the browser:
- `build.js` runs via `node build.js` — it compiles the JSX with Babel and writes a `dist/` folder
- GitHub Actions (`.github/workflows/deploy.yml`) runs `build.js` on every push to `master` and deploys `dist/` to GitHub Pages
- **Never edit `dist/`** — it is generated and not tracked in git

For local preview, the raw `index.html` still works in the browser via `npx serve .` (see `.claude/launch.json`). The Mondriaan theme is lazy-loaded and compiled at runtime in dev, but pre-compiled in the build.

## Theme Work
Before designing or modifying any theme, read **[THEMES.md](THEMES.md)** — it contains the canonical rules for theme structure, taglines, color tokens, the Editions modal, and the Mondriaan paint-in animation.

## Mondriaan Theme Internals
The Mondriaan theme lives in a `<script type="text/plain" id="mondriaan-src">` blob inside `index.html`. It is compiled by Babel at runtime in dev and pre-compiled by `build.js` in CI. Key constants used throughout:

```js
const M_LINE   = 6           // grid gap / border width (px)
const M_BLACK  = '#0a0a0a'
const M_RED    = '#d72027'
const M_BLUE   = '#1d4ed8'
const M_YELLOW = '#fcc60b'
const M_WHITE  = '#ffffff'
const M_DISPLAY = 'Archivo Black, sans-serif'
const M_SANS    = 'Space Grotesk, sans-serif'
const M_MONO    = 'Space Mono, monospace'
```

## PR Workflow
- Always check PR state before pushing (`gh pr list --state open`)
- If the previous PR is already merged, create a **fresh branch from master** — never reuse a merged branch
- Resolve merge conflicts by keeping the HEAD version unless the incoming change is intentional

## Build Output
`build.js` copies these to `dist/` alongside the compiled HTML:
`screenshots/`, `assets/`, `social-card.png`, `social-card.svg`, `CNAME`, `themes/`, `favicon.ico`
