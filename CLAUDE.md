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
Projects and tools are **driven by `content/projects.csv` and `content/tools.csv`** — they are the source of truth. `build.js` reads them at build time and regenerates the `PROJECTS` / `TOOL_CATEGORIES` arrays in `index.html` between the `/* CONTENT:*:START */` markers. The inline arrays are only a dev/preview snapshot (the build overwrites them). **To change projects or tools, edit the CSVs**, not the arrays. See **[CONTENT.md](CONTENT.md)** for the column reference.

## Theme Work
Before designing or modifying any theme, read **[THEMES.md](THEMES.md)** — it contains the canonical rules for theme structure, taglines, color tokens, the Editions modal, and the Mondriaan paint-in animation.
