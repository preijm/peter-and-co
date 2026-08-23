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
| Grain      | `cinematic · achromatic · full-bleed` |

**Default edition.** A first-time visitor lands on **Volt** (`DEFAULT_THEME_ID` in
`index.html`). It leads because its terminal demonstrates the site's claim rather than
describing it, because it is composed rather than adapted from a named studio's system,
and because it works on mobile — Mondriaan, the most original of the five, is
desktop-only and so cannot be the default whatever its merits.

The value is a named constant rather than the array's first entry: the `THEMES` order is
the sequence the Editions modal presents, which is a separate decision from which
edition opens first. **It is duplicated in the parse-time font resolver in `<head>` as
`DEFAULT_ID`** and the two must move together — the resolver picks the face before React
boots, so a mismatch means the page opens in one edition's layout wearing another's
fonts, then reflows.

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

### Grain (v1) — cinematic, achromatic, full-bleed

Named for the film grain `RField` lays over every plane, photograph or not. Grain plus
`grayscale(1)` is what makes a stock still life, a phone snapshot and a 1992 film scan
read as one edition rather than five sources, so the name points at the mechanism doing
the work. It was called Reel first, which reads as short vertical phone video before it
reads as a film reel, and then Silver, which named a material the theme does not
actually contain.

A portfolio read as a film reel, built after Freytag Anderson's visual language
(reverse-engineered by refero.design into `DESIGN.md` / `tokens.json`; the studio does
not publish a design system, and the values below are transcribed into the theme).
The page is not a max-width container — it is a sequence
of edge-to-edge planes, one statement per screen, with all text pinned to the
**top-left viewport corner** like a title card.

**Palette — six neutrals, no chromatic accent, ever.**
```js
R_PAPER = '#fafafa'   // page canvas — off-white, never pure white
R_INK   = '#000000'   // text, hairline borders
R_CHAR  = '#1c1c1c'   // charcoal — intertitle surface
R_SOIL  = '#141109'   // midnight soil — deepest, warmest dark
R_ASH   = '#dcdcdc'   // hairline dividers only
R_DRIFT = '#c2b5ae'   // driftwood — the one non-achromatic hint; retired-tool strike
```

Driftwood is the **strike** on a retired tool, never its text — on paper it is 1.91:1,
which is invisible as type. Set it with the `textDecorationLine` / `textDecorationColor`
**longhands**, never the `textDecoration` shorthand: retired status differs between the
frozen fallback array and Sanity, so the value flips on the Sanity re-render, and React
then writes only the key that changed. Writing the shorthand resets
`text-decoration-color` to `currentColor` and silently drops driftwood from exactly the
tools Sanity retires.

**Type — one family, two weights.** Inter (the substitute the source system names for
FAVORIT), `ss01` + `tnum` on. **41px is the largest size on the entire page** —
hierarchy comes from weight and whitespace, never from scale or boldness. The display
step is a **fixed 41px at every viewport** — there is no responsive clamp, because the
scale has only three steps (15 / 17 / 41) and any intermediate size is off-system.
Tracking is the literal token value in px, not em, so it cannot drift with the size.

| Role    | Size | Line height | Tracking  | Weight |
|---------|------|-------------|-----------|--------|
| display | 41px | 1.18        | -0.9px    | 400    |
| body    | 17px | 1.7         | -0.02em   | 400    |
| caption | 15px | 1.4         | -0.022em  | 300    |

**Spacing.** Four constants carry the whole vertical rhythm; nothing else may invent
a number. `R_EDGE` = `clamp(20px, 3.4vw, 43px)` (the viewport-corner inset);
`R_CHROME` = `72px` (the clearance every full-bleed title block takes under the fixed
chrome — one value, not one per plane); `R_BREATH` = `clamp(90px, 20vw, 288px)` (the
cinematic intermission between acts — `20vw` so DESIGN.md's 288px actually lands at a
1440px desktop, not at 1800px); `R_HALF` = `clamp(48px, 10vw, 144px)` (exactly half a
breath, for the lighter pause inside an act). All four resolve to multiples of the 6px
base unit at their ends. Radius is 0 everywhere except the ghost pill, which is `300px`.

**Plane sequence.** hero → *statement* → intertitle (charcoal, three-column body) →
work intro (paper) → one plane per project → tools (paper) → contact (soil).

The statement plane is **media-gated**: it renders only when `footage/statement.*`
exists. A full viewport of empty dark under two lines of text is dead space rather
than a cinematic pause — the second act needs a second photograph to be worth a
screen, exactly as it is on the reference site.

**Media planes (`RField`).** Each plane resolves its media in three steps, falling
back cleanly so a half-filled footage folder still looks deliberate:

1. **A photograph** from `footage/` — the intended case. Full-bleed, `grayscale(1)`,
   brightness 0.68, 82% opacity, centre-anchored, with a very slow Ken Burns drift.
2. **A project screenshot** — quieter: 50% opacity, top-anchored, no drift, since it
   underpins the plane rather than carrying it.
3. **The generated field alone** — five large radial blobs in warm neutrals, slowly
   drifting, seeded from the project id (`rSeed`) so every plane is distinct but
   stable across renders. They carry **no `filter: blur()`**: `closest-side` already
   lands each gradient on alpha 0 at every edge of its box, so there is nothing for a
   Gaussian to soften, and blurring them promoted all 30 to their own render surfaces
   (~200 MB of RGBA at 1080p) for a difference of under 0.012 alpha.

The generated field renders under the media in every case, and an SVG film-grain
layer plus a top-left tonal falloff sit over the top, giving the title ground to
stand on. **Everything is desaturated** — a colour cast would break the achromatic
palette, which is the system's hardest rule.

**Footage (`footage/`).** Photographs are discovered, never referenced. `npm run footage`
(and `build.js` in CI, so a stale committed manifest cannot ship) writes
`footage/manifest.json` from the folder contents; the theme fetches it on load. **The
filename is the slot** — `hero.jpg` fills the hero plane, `statement.jpg` the second,
and `<project-id>.jpg` that project's plane. HEIC dropped in the folder is converted
to JPEG by the same command, since no browser renders it, and every JPEG/PNG is then
re-encoded as a **grayscale WebP** — the planes render `grayscale(1)`, so a colour file
is two chroma planes decoded and thrown away (the hero halved, 603 KB → 349 KB). The
manifest prefers the best format per slot and `build.js` deploys only what it names,
so the colour master can sit in the folder for free. The hero is preloaded from the
`<head>` by filename stamped at build time — it is the LCP element and otherwise sits
four hops deep behind the manifest fetch. Shooting guidance lives in
[footage/README.md](footage/README.md); the two rules that matter are that the image
must survive being turned black and white, and that the top-left quadrant stays dark
and simple because the title sits there in white.

**Rules specific to this theme:**
- Never introduce an accent colour. Project `accent` values are deliberately ignored.
- Never centre text; the top-left anchor is the defining gesture.
- No shadows, no elevation, no card surfaces, no framed or rounded images.
- No bold weights — 300 and 400 only.
- The hamburger (two 1px lines, top-right) is the only navigation surface.

**Chrome tone.** Every plane carries `data-r-tone="dark|light"` describing its own
surface. `useSurfaceTone()` finds the section under the fixed chrome line (y = 38) and
flips the wordmark and hamburger between paper and ink, so the chrome never needs a
scrim. **Sections must tile the document contiguously** — a gap leaves the chrome
falling back to `dark` over a paper section.

**Motion.** One fade-up (`.r-in` → `.r-on`, IntersectionObserver, no library), the
slow field drift, and the Ken Burns push on photographs. Both are gated behind `prefers-reduced-motion`. Fields are paused
by default and only run while within 25% of the viewport (`.r-field.r-live`) — set
animation **longhands** inline, never the `animation` shorthand, or the inline
declaration overrides `animation-play-state` and every plane animates at once.

**Content sources.** Projects and tools come from Sanity like every other edition.
Only the photographs live in the repo, because they are page furniture rather than
content — see [footage/README.md](footage/README.md).

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
