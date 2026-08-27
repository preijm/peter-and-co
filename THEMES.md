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
| Broadside  | `light · oversized · one statement` |
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

### Broadside (v1) — poster

Broadside began life as **Chalk**, the plain light palette on the shared layout, which
made it Ink with the lights on: a setting rather than an edition. It was renamed when it
stopped being one — a broadside is a single sheet printed on one side in large type,
which is exactly what this is, and it shares a register with the words the edition
already uses (*the plate*, *the listings*, *the particulars*, the colophon). The old
`chalk-v1` id was retired outright rather than aliased, so anyone still carrying it in
localStorage falls back to the default edition. It is now a takeover built on one idea —
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

1. **Never give `BSStatement` both `whiteSpace` and `textWrap` as keys**, one set to
   `undefined`. React writes an undefined style value as `style.textWrap = ''`, which
   removes the `text-wrap` *shorthand* — including `text-wrap-mode`, the half of
   `white-space: nowrap` that does the not-wrapping. The element keeps
   `white-space-collapse` and wraps anyway. It surfaced only at 1920px, because below
   that the line happened to fit unaided. Apply one or the other, conditionally.
2. **`BSRule`'s `draw` is opt-in.** `animation-timeline: view()` measures an element
   against its own trip through the viewport, so a rule already on screen at load sits
   partway through its entry range forever — the listings rule at the foot of the first
   sheet drew to ~45% and stopped. Rules above the fold are simply set; only rules the
   reader scrolls to draw themselves in.

**Broadside is page-driven, not one long scroll** — the only edition besides Mondriaan that
reads `page`. Home is the poster and nothing else: exactly one viewport, zero scroll.
`work` / `background` / `kit` / `contact` in the chrome call `navigate()` and each opens
its own sheet, so nothing is stacked below a fold. This replaced a single scrolling page
whose first screen ended in a hard rule with the next section starting 90px *below* the
fold — nothing bled past it, so the edition read as a one-page site and needed a
"continued ↓" mark to admit otherwise. Sheets, not sections, removed the need for the
mark. Two consequences to keep in mind:

- The hero listings **are** the work index, so `work` is dropped from the phone nav
  (which abbreviates `background` to `bg` to fit 375px). Logo → home → listings.
- `the kit` is the one sheet that can exceed a viewport; 19 tools across 3 shelves runs
  ~27px over at 1440×900. That is fine — chasing an exact fit is futile when viewport
  heights vary this much.

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
header, and **no footer**: the canvas is the whole viewport (`minHeight: 100vh`
with the hero row flexible, so the painting stretches rather than leaving linen
below). Logo, nav and the edition switch are painted tiles inside the
composition (`MHomePainting`, via the shared `MHeaderTiles` fragment).
The right-hand column bleeds off the top and right edges with no black line,
like the unbounded planes on the real canvases (via `marginTop: -M_PLINE` and
the container's right padding being 0).

```
gridTemplateColumns: M_COLS = '98px 170px minmax(220px, 1fr) 76px 110px 110px 110px 110px 124px'
gridTemplateRows:    '104px minmax(360px, 1fr) 82px 162px 122px'
gap / outer padding: M_PLINE = 10px on background M_INK
```

Cell layout (cols 1–9):
| Area | Column | Row | Content |
|------|--------|-----|---------|
| Logo "P" tile | 1 | 1 | Red — navigates home |
| Peter / & Co. stack | 2 | 1 | White + yellow tiles |
| White plane | 3 / 5 | 1 | Empty broken white |
| Nav tiles | 5–8 | 1 | work · tools · about · contact |
| Edition tile | 9 | 1 | Red block, bleeds top+right |
| Red column | 9 | 2 | Bleeds right, beside the hero |
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

### Painted subpages
Every desktop page is a painting, not just home. The shared pieces:

- **`MPaintedHeader`** — the `MHeaderTiles` band (grid on `M_COLS`, 104px row)
  on every page except home. Mobile keeps the classic bordered `MHeader`.
- **Every header tile is a block**, the edition switch included
  (`MEditionTile`): it is nav-sized in the last column, bleeding off the right
  edge only — it keeps a painted line above it like every other tile — painted
  standing rather than on hover (it is the one control that leaves the
  edition) and lightening a shade when hovered. It is **blue** —
  red already carries the logo, the home hero's right-hand column and the
  first project card. On home a red plane below it carries that column down
  beside the hero, so the right edge stacks blue / red / yellow / white.
- **Nothing sits under the edition tile in its own colour.** Work's count
  plane is ink rather than blue for exactly this reason; Tools' total stays
  red. Balance each plane against its neighbours rather than assigning one
  colour per kind of content.
- **Nav hover colours are `M_RED` / `M_YELLOW` / `M_BLUE` / `M_INK`** — contact
  takes ink, because a white hover on a paper tile is no hover at all.
- **`MSectionCanvas`** — a full-bleed painted grid for page content. Its top
  padding is 0: the header band's bottom padding supplies the shared 10px line,
  so stacking them never doubles it.
- **Work** is a painted table — `MWorkRow` renders six planes per project that
  share hover state (the row lifts together, the arrow tile repaints yellow).
  Accent number tiles rotate red → blue → yellow → ink.
- **Tools / About / Contact / Project detail** rebuild their old compositions
  as planes: same content, painted surfaces; the contact form is defined once
  and shared between the desktop plane and the mobile card.
- **About's lower field carries no copy on purpose.** Six blocks — paper, a
  narrow red bar, yellow, a narrow ink bar — divide the space under the
  statement into a rhythm. A Mondriaan canvas is mostly empty rectangles, so
  the answer to a large blank area in this edition is more divisions, not more
  words. Its row sizes and headline clamp are tuned so the whole composition,
  blue statement band included, lands inside a 1440×900 viewport.
- **Those six blocks are the only ones a reader may repaint** (`M_ABOUT_FIELD`,
  `M_REPAINT`). Clicking one strokes it to the next colour — red, yellow,
  blue, ink, then back to where it started — so the composition can be
  rearranged the way Mondriaan rearranged the coloured cards on his studio
  wall. Each plane's cycle **starts at its own colour and then skips it**
  (`mCycleFor`), or the red block's first click would repaint it red and read
  as a broken control. They earn the interaction by being the only planes
  on the site with **no other job**: everywhere else a click already navigates,
  and a canvas where some blocks go somewhere and others change colour teaches
  the reader nothing. Nothing is hidden behind them, so a reader who never
  clicks still sees the intended painting. They are real `<button>`s with an
  `aria-label`, and remounting on the stroke count is what replays the paint —
  a repaint arrives from a rotating side with no delay, while the first paint
  keeps its place in the page's sequence.
- **Form controls are painted too** (`MPaintField`, `MPaintButton`): a wobbled
  ink slab is the frame with a 7px-inset paper plane on top of it — the two
  wobble on different seeds, so the border's thickness varies down its length
  like a brushed line — and the real `input`/`textarea` rides on top with no
  border or background of its own (focus repaints the inner plane yellow).
  The submit button is an offset ink slab plus a red face, both wobbled, so
  its "shadow" reads as a second brushstroke rather than a drop shadow.
  Mobile keeps the flat bordered controls.
- **`MFooter`** is a full-bleed painted band (©-plane + red github, blue
  linkedin, yellow email tiles) rendered **only on the contact page** — its
  job is "reach me", so every other page ends where its painting ends. Mobile
  keeps the bordered footer, same rule.
- **A page that fills exactly one screen subtracts its chrome**: `M_HEAD_H`
  (124) always, plus `M_FOOT_H` (116) on contact, which is the only page
  carrying the footer. Contact sizes itself to
  `calc(100vh - M_HEAD_H - M_FOOT_H)` so the footer band lands in view without
  scrolling; About subtracts the header alone.
- Vertical lines between the header band and a page's own grid do **not**
  align — rows with different divisions are the authentic Mondriaan move, not
  a bug to fix.

### Paint-In Animation
When a page mounts, each block sweeps in using CSS `clip-path` animations — the feeling of fresh paint being applied.

**The keyframes are plain `inset()` sweeps — the raggedness is not drawn.**
`MPlane` runs the animation on the colour layer *inside* the plane's turbulence
filter, so the straight clip edge is displaced into a wandering one on its way
across, by the same noise that wobbles every plane's static edges. The paint
arrives looking like the paint already on the canvas.

This structure is the whole trick, and it exists because **CSS applies a filter
before it applies a clip**. Clipping the filtered element itself cuts a hard
geometric edge, so the colour layer has to be a *child* of the filtered
wrapper. Do not merge those two divs back together.

**Do not draw the edge as polygon points.** That was tried twice and both
attempts failed in an instructive way: notches at an even pitch read as tape
pulled off a serrated cutter, and deepening them to compensate read as torn
paper. Regular geometry cannot look hand-made — noise can.

The sweep ends at `inset(… -4% …)` rather than `inset(0)` so the last of the
displaced edge is never shaved off; `backwards` fill then hands the element
back unclipped.

The content layer carries the same animation, so a plane never shows its words
before its paint.

**Planes are painted one at a time.** `mPnt(dir, order, dur?)` takes a position
in the paint order, not a millisecond delay, so the sequence reads in the
markup and the whole cascade retunes from two constants: `M_STEP` (420ms,
the gap between one plane's stroke and the next) and `M_DUR` (560ms, one
stroke). `M_STEP` is deliberately close to `M_DUR` — a plane has all but
finished before the next begins, so the eye follows a single brush around the
canvas rather than watching the page assemble itself at once. The shared
header band takes an `order` prop for where it starts: home paints its hero
first and passes `order={1}`; every other page lets it default to 0 and starts
its own content at 2.9.

Rules:
- Easing: `cubic-bezier(0.22, 0.61, 0.36, 1)` — a stroke decelerates into place
- Home's last plane lands around 3.5s; subpages a little later
- **No flash or sheen after** — blocks settle cleanly with no outro effect
- **`animation-fill-mode` must be `backwards`, never `both`** — the keyframes
  end past 100%, and holding that after the animation clips the wobbled plane
  edges (`mPnt` does this right)

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
