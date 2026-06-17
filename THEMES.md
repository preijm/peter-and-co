# Theme Design Guidelines

## Theme Object Structure
Every theme must define these fields in the `THEMES` array inside `index.html`:

```js
{
  id:       'name-v1',          // kebab-case, format: {name}-v{n}
  name:     'Name',             // display name
  version:  'v1',
  tagline:  'word · word · word', // exactly 3 keywords — see rule below
  fonts:    { serif, mono },    // minimum; display+sans allowed for stylised themes
  googleFonts: '...',           // full URL
  colors:   { ...tokens },      // full set — see token table below
}
```

Themes that fully replace the page layout also set `mondriaan: true`.

---

## Tagline Rule
**Exactly 3 keywords separated by ` · `** — no more, no less.

| Theme      | Tagline                          |
|------------|----------------------------------|
| Ink        | `dark · minimal · no noise`      |
| Chalk      | `light · open · breathing room`  |
| Mondriaan  | `primary · geometric · De Stijl` |
| Volt       | `dark · minimal · systems`       |

---

## Color Tokens (all required)
| Token          | Purpose                          |
|----------------|----------------------------------|
| `bg`           | Page background                  |
| `bgDark`       | Slightly darker bg (sections)    |
| `bgInput`      | Form / input background          |
| `surface`      | Card / surface background        |
| `border`       | Default border                   |
| `borderSubtle` | Secondary / faint border         |
| `text`         | Primary text                     |
| `textMuted`    | Secondary text                   |
| `textDim`      | Tertiary text                    |
| `textFaint`    | Very faint text                  |
| `textGhost`    | Ghost / placeholder text         |
| `btnBg`        | Primary button background        |
| `btnText`      | Primary button text color        |

---

## ThemeSwatch Component
Every theme needs a swatch in `ThemeSwatch` — `aspectRatio: '16/9'`, `width: '100%'` — that gives a readable visual impression of the theme at a glance. Shown in the Editions modal.

---

## Editions Modal Rules
- Cards sit in a `repeat(3, 1fr)` grid with `alignItems: 'stretch'`.
- Each card button uses `display: flex, flexDirection: column` so all cards are the same height regardless of content.
- Tagline text uses `whiteSpace: nowrap` to prevent wrapping.

---

## Full-Reimagining Themes (`mondriaan: true`)
Themes that set `mondriaan: true` bypass the default layout and render their own top-level component. They own every pixel. Each such theme also sets:
- `srcId` — id of the `<script type="text/plain">` blob holding its component code (lazy-compiled by Babel in dev, pre-compiled by `build.js`).
- `appGlobal` — name of the global component `AppShell` mounts (e.g. `MondriaanApp`, `VoltApp`).
- `mobileOptimized: true` — opt the theme into the mobile Editions list (Mondriaan is desktop-only and omits it).

### Volt (v1) — minimal "design + code + systems" landing
A dark, restrained one-pager in the spirit of premium studio sites (e.g. Ouro Labs). Warm near-black (`#0c0c0a`), a single electric-lime accent (`#d4f932`) used sparingly, and a two-family type system: **Geist** (sans, headings + body) + **Geist Mono** (labels, terminal touches). Light terminal flavor: a `whoami` hero prompt with a blinking caret, `// section` mono labels, a `~/about.cfg` facts block, and an `origin.log` footer line. Sections — hero → selected work → background → contact — flow over the backdrop. The backdrop layers a faint CSS radial bloom under a **scroll-reactive Three.js point field** (`three@0.149` UMD, lazy-loaded on activation): the camera travels into the field and it rotates as scroll progresses, near-monochrome with a few lime motes, additive-blended, fixed at `z-index:-1` behind all content. GSAP + ScrollTrigger (also lazy-loaded) drive **subtle fade-up reveals only** (`.v-fade` on load, `.v-reveal`/`.v-row` on scroll). All motion — Three.js field included — is gated behind `!prefers-reduced-motion` (the point field is skipped entirely when reduced, leaving just the CSS bloom) and the render loop pauses when the tab is hidden.

### Mondriaan Home Grid (v1)
```
gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.7fr) minmax(0, 0.5fr) 80px'
gridTemplateRows:    '480px 70px 110px 90px'
gap / border:        M_LINE = 6px solid #0a0a0a
```

Cell layout:
| Area | Column | Row | Content |
|------|--------|-----|---------|
| Hero text | 1 / 4 | 1 | White — headline copy |
| Red accent | 4 | 1 | Solid red |
| Work label | 1 / 4 | 2 | White — "Selected Work" label |
| Yellow accent | 4 | 2 | Solid yellow |
| Project 1 (red) | 1 | 3 / 5 | Tall red card |
| Black square | 2 | 3 | Solid black |
| Project 2 (blue) | 3 | 3 | Blue card |
| Project 3 (yellow) compact | 2 / 4 | 4 | Wide yellow compact card |
| White block | 4 | 3 / 5 | Solid white |

### Paint-In Animation
When the home page mounts, each block sweeps in using CSS `clip-path` animations — the feeling of fresh paint being applied.

Keyframes (global CSS):
```css
@keyframes m-paint-r { from{clip-path:inset(0 100% 0 0)} to{clip-path:inset(0 0 0 0)} }
@keyframes m-paint-d { from{clip-path:inset(0 0 100% 0)} to{clip-path:inset(0 0 0 0)} }
@keyframes m-paint-u { from{clip-path:inset(100% 0 0 0)} to{clip-path:inset(0 0 0 0)} }
@keyframes m-paint-l { from{clip-path:inset(0 0 0 100%)} to{clip-path:inset(0 0 0 0)} }
```

Rules:
- Default duration: ~900ms per block
- Easing: `cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- Blocks are staggered with `animationDelay`; last block lands around 2.2s
- **No flash or sheen after** — blocks settle cleanly with no outro effect
- No brush texture overlay — plain flat colour only

### Mondriaan Colours
```js
M_RED    = '#d72027'
M_BLUE   = '#1d4ed8'
M_YELLOW = '#fcc60b'
M_BLACK  = '#0a0a0a'
M_WHITE  = '#ffffff'
```

### Typography
```js
M_DISPLAY = "'Archivo Black', 'Helvetica Neue', sans-serif"
M_SANS    = "'Space Grotesk', 'Helvetica Neue', sans-serif"
M_MONO    = "'Space Mono', 'JetBrains Mono', monospace"
```
