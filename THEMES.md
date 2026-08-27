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
| Chalk      | `light · oversized · one statement` |
| Mondriaan  | `primary · geometric · De Stijl` |
| Volt       | `dark · minimal · systems`       |
| Grain      | `cinematic · achromatic · full-bleed` |
| Prism      | `light · colour · depth`         |

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

### Chalk (v1) — poster

Chalk began as the plain light palette on the shared layout, which made it Ink with the
lights on: a setting rather than an edition. It is now a takeover built on one idea —
**a single statement, sized to fill the sheet, over ruled listings.** There is not a
card, a panel or a shadow anywhere in it; every surface is paper, a hairline or a 3px
rule.

**The statement is arithmetic, not taste.** In DM Serif Display at `-0.04em`,
"I build things." measures **5.476×** its own font-size, so the line that fills a sheet
is `available width / 5.476`. That gives `clamp(52px, 16.1vw, 264px)`, which holds
96–100% of the measure on one line from 375px to 1920px. Both numbers are load-bearing:

- **16.1vw** — fills the measure while the sheet is narrower than its cap.
- **264px** — the sheet maxes at `1560px`, so above a 1560px viewport the measure is a
  constant **1448px** however wide the window gets, and `1448 / 5.476 = 264`. Without
  the ceiling a 1920px window computes 313px and pushes the line 266px past the sheet.

Change the headline words and that 5.476 changes with them — re-measure, don't guess.

**Two traps this edition has already fallen into, both silent:**

1. **Never give `CHStatement` both `whiteSpace` and `textWrap` as keys**, one set to
   `undefined`. React writes an undefined style value as `style.textWrap = ''`, which
   removes the `text-wrap` *shorthand* — including `text-wrap-mode`, the half of
   `white-space: nowrap` that does the not-wrapping. The element keeps
   `white-space-collapse` and wraps anyway. It surfaced only at 1920px, because below
   that the line happened to fit unaided. Apply one or the other, conditionally.
2. **`CHRule`'s `draw` is opt-in.** `animation-timeline: view()` measures an element
   against its own trip through the viewport, so a rule already on screen at load sits
   partway through its entry range forever — the listings rule at the foot of the first
   sheet drew to ~45% and stopped. Rules above the fold are simply set; only rules the
   reader scrolls to draw themselves in.

**Motion** is near-zero on purpose — a print idiom does not float. Two primitives only:
`ch-draw` (rules scaling in from the left, below the fold) and `ch-rise` (one 12px
move). Nothing loops, and everything is off under `prefers-reduced-motion`.

**Screenshots sit BELOW the poster sheet**, under a `the plate` label, sized through
`sanityImg(url, 1600)`. Placing one beside the statement would destroy the scale
contrast the edition runs on; placing it after costs that nothing, and a portfolio that
never shows the work is the worse trade. Project pages hand the scale to the project's
**tagline**, not its name — a name is a label and cannot carry a sheet, while these
taglines were written as statements already.

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

### Mondriaan Home Painting (v1)

The home page is one **full-bleed painting** — no 1280px container, no separate
header. Logo, nav and the edition switch are painted tiles inside the
composition (`MHomePainting`); `MHeader` renders on every page *except* home.
The right-hand column bleeds off the top and right edges with no black line,
like the unbounded planes on the real canvases (via `marginTop: -M_PLINE` and
the container's right padding being 0).

```
gridTemplateColumns: '98px 176px minmax(280px, 1fr) 90px 120px 120px 120px 120px 128px'
gridTemplateRows:    '104px 520px 82px 162px 122px'
gap / outer padding: M_PLINE = 10px on background M_INK
```

Cell layout (cols 1–9):
| Area | Column | Row | Content |
|------|--------|-----|---------|
| Logo "P" tile | 1 | 1 | Red — navigates home |
| Peter / & Co. stack | 2 | 1 | White + yellow tiles |
| White plane | 3 / 5 | 1 | Empty broken white |
| Nav tiles | 5–8 | 1 | work · tools · about · contact |
| Red column | 9 | 1 / 3 | Bleeds top+right; carries EDITION |
| Hero | 1 / 9 | 2 | Headline on warmest white |
| Work label | 1 / 6 | 3 | "Selected Work · NN / NN" |
| Project 2 (blue) | 6 / 9 | 3 / 5 | Blue card |
| Yellow accent | 9 | 3 | Bleeds right |
| Project 1 (red) | 1 / 4 | 4 / 6 | Tall red card |
| Black square | 4 / 6 | 4 | Wikipedia easter egg |
| Project 3 (yellow) compact | 4 / 9 | 5 | Wide compact card |
| White block | 9 | 4 / 6 | Bleeds right |

### Painterly System
Nothing on the home canvas is pixel-perfect — it must read as a painting, not
a diagram. The machinery lives in the mondriaan blob:

- **`MPaintDefs`** — hidden SVG filter bank: three turbulence-displacement
  filters (`m-wob-a/b/c`, different seeds so adjacent planes never wander in
  sync), two brush-streak masks (`m-str-h/v`), and canvas grain (`m-grain`).
  Filter regions are proportional (`-15% … 130%`), **never** a big fixed
  `userSpaceOnUse` box — a fixed region sized for the hero allocates the same
  huge buffer on every small tile and can wedge software rasterization.
- **`MPlane`** — every plane's colour is an absolute layer displaced by a
  wobble filter, so edges wander into the 10px black gaps and the grid reads
  as hand-ruled lines. A nested streak layer (shade from `M_STREAK`) adds
  directional brushwork. Content sits on top, crisp — type is printed over the
  painting, never painted.
- **`MPaintOverlay`** — fixed grain + linen weave over the whole edition
  (z 50, under the Editions modal at z 1000), on every page.
- Whites are **broken whites** (`M_W`), one tint per plane; `M_WHITE` itself is
  warm (`#f6f3ea`) so text on colored planes and the subpages match.

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
- **`animation-fill-mode` must be `backwards`, never `both`** — the keyframes
  end on `clip-path: inset(0)`, and holding that after the animation clips the
  wobbled plane edges back to straight rectangles (`mPnt` does this right)

### Mondriaan Colours
```js
M_RED    = '#d72027'
M_BLUE   = '#1d4ed8'
M_YELLOW = '#fcc60b'
M_BLACK  = '#0a0a0a'   // text + subpage borders
M_WHITE  = '#f6f3ea'   // painted white — warm, never pure
M_INK    = '#141210'   // painted line black (home canvas + theme border token)
M_LINEN  = '#efece3'   // raw-canvas page ground
M_W      = ['#faf7ef', '#f1eee3', '#f6f3ea', '#edeadf']  // broken whites
M_PLINE  = 10          // painted line width (home); M_LINE = 6 stays on subpages
```

### Typography
```js
M_DISPLAY = "'Archivo Black', 'Helvetica Neue', sans-serif"
M_SANS    = "'Space Grotesk', 'Helvetica Neue', sans-serif"
M_MONO    = "'Space Mono', 'JetBrains Mono', monospace"
```
