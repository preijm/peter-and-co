# Footage

Photographs for the **Reel** edition. Drop a file in here, run `npm run footage`, done —
nothing in `index.html` ever names your pictures.

```bash
npm run footage
```

## The filename is the slot

| File | Where it lands |
|------|----------------|
| `hero.jpg` | The opening plane — the first full screen |
| `statement.jpg` | **Creates** the second plane, *"built in the hours after the day job ended"* |
| `<project-id>.jpg` | That project's plane |

Project ids are the slugs from Sanity. Currently:

| Slot | Project |
|------|---------|
| `milk-me-not` | Milk Me Not |
| `folio` | Folio |
| `peter-and-co` | Peter & Co. |
| `boer-transport` | Boer Transport |
| `reijm-tuinaanleg` | Reijm Tuinaanleg |

So `footage/boer-transport.jpg` becomes Boer Transport's plane. If you add a project in
Sanity, its slug is its slot — no code change needed.

> The frozen fallback array in `index.html` still calls Peter & Co. `experiment-03`.
> That only matters if Sanity is unreachable, in which case that plane would look for
> `experiment-03.jpg` instead. Worth aligning the two slugs at some point.

Any slot without a photograph falls back to that plane's generated tonal field, so a
half-filled folder looks deliberate rather than broken. Project planes fall back to the
project screenshot first, if it has one.

The **statement plane is the exception**: it does not exist at all until
`statement.jpg` does. A full screen of empty dark under a single line reads as dead
space rather than a cinematic pause — that second act needs a second photograph to
earn a screen.

`.jpg`, `.jpeg`, `.png`, `.webp` and `.avif` are all picked up. If a slot holds several
formats of the same photograph, the manifest picks the best one — `.avif`, then
`.webp`, then `.jpg`/`.jpeg`/`.png` — and **only the winner is deployed**. That is what
makes it safe to leave your colour master sitting next to the encoded file.

### Grayscale WebP

`npm run footage` also re-encodes every `.jpg`/`.png` here as a grayscale `.webp`. The
Reel palette is achromatic — every plane renders through `grayscale(1)` — so a colour
JPEG makes the browser decode two chroma planes it is about to discard. Encoding the
colour out at rest is invisible on the page and roughly halves the bytes: the hero went
from 603 KB to 349 KB, and it is the largest thing the edition loads.

The original stays where it is, as the colour master. It just stops being the file the
site downloads. Dimensions are never touched — Ken Burns pushes the hero to 1.13x, so a
1920px window is already displaying it at 2170 CSS px.

This step needs `ffmpeg` on your PATH. Without it the command says so and moves on; the
`.webp` files are committed, so CI and other machines are unaffected.

### HEIC from your phone

Drop `.heic` files straight in — `npm run footage` converts them to web-ready JPEG
before building the manifest, so `reijm-tuinaanleg.heic` becomes
`reijm-tuinaanleg.jpg` and lands on that plane. No browser can render HEIC, which is
why the conversion has to happen here rather than at load.

Decoding uses Windows' own HEIF codec, so there's nothing to install — but it does
mean the step only runs on Windows. **The converted `.jpg` and the `.webp` encoded from
it are what get committed**; the `.heic` originals are gitignored, so keep them in
OneDrive. Re-running is cheap: files that are already current are left alone.

## What to shoot

The photograph is the whole plane — it fills the viewport edge to edge with no border,
no rounding and no overlay. Two things matter:

**1. It gets desaturated to grayscale.** This is the hardest rule in the system: the
palette is six neutrals and a single hue would break it. So colour does nothing for
you — **tonal structure is everything**. A golden-hour shot with dark tree masses
against a blown-out sun works beautifully in black and white. A flat, evenly-lit scene
turns to grey mud.

**2. The top-left corner carries the text.** Every title sits pinned to the top-left,
in white. Keep that quadrant **tonally simple and dark** — sky, shadow, a mass of
foliage. Anything busy or bright up there and the title stops reading. The theme adds
a soft dark falloff in that corner to help, but it can't rescue a blown-out sky.

Beyond that, aim for what the system asks of its imagery: atmospheric, golden hour or
overcast, deep natural grain, a wide tonal range, some motion. Landscapes, the print
bed mid-run, a workspace at night, long shadows. Not product shots, not headshots,
not anything centred and posed.

### For project planes: shoot the subject, not the screen

A screenshot of a client's website is the weakest thing you can put behind their name —
it shows the deliverable, not the business. Photograph **what the company actually
does**: Boer Transport is trucks, containers, a yard at first light. Reijm Tuinaanleg is
soil, hedges, a finished garden in low sun. The work was the website, but the *story* is
the company, and that is what a title card wants behind it.

Nothing is lost by keeping screenshots out of the planes — each project's screenshot
still shows properly on its detail page in the other editions.

**For client work, ask them for the photograph.** Most businesses have a folder of them
and are glad to be asked. A photo taken by or for the client belongs to them: get their
OK before it goes on your site, and don't pull images off their website instead.

## Format

- **Landscape**, roughly 16:9 or wider. Portrait crops badly — planes are viewport-shaped.
  A 3:4 phone photo loses about half its height to the crop, usually the half that made
  the shot work.
- **2000px wide, JPEG around 400–500KB.** These render desaturated, dimmed to 82% and
  under film grain, so finer detail is invisible weight on a page that stacks several
  full-screen images.
- HEIC files are resized and compressed to exactly that by `npm run footage`. **Anything
  you export by hand is passed through untouched** — the build never resizes — so match
  those numbers yourself.
- The hero loads eagerly, everything below it lazily.

## Treatment applied automatically

`grayscale(1)`, mild contrast lift, brightness pulled down to 0.68, 82% opacity over
the plane's generated field, plus film grain and a very slow Ken Burns drift. The
drift pauses whenever the plane is off-screen and is disabled entirely under
`prefers-reduced-motion`. You do not need to edit or grade anything — shoot for
structure and let the theme do the rest.
