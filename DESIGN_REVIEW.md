# Design Review: Volt Edition

Reviewed against: original brief — *"modern, awwwards-worthy landing page for a UI/UX designer portfolio, GSAP/Three.js, mobile-friendly"*
Philosophy: Editorial × kinetic (dark, electric-lime accent, oversized display type)
Date: 2026-06-13

## Screenshots Captured

| Screenshot | Breakpoint | Description |
|---|---|---|
| — | — | **Not captured.** `preview_screenshot` times out in this environment (confirmed failing even on the static Ink theme — the preview tab runs backgrounded and the renderer throttles `requestAnimationFrame`). No Playwright/Cursor browser MCP is available. |

> Review is grounded in **live computed-style/layout measurements** (`preview_eval` / `preview_inspect`) plus source review of the `volt-src` blob in `index.html`. This gives exact numbers for contrast, type, spacing, and overlaps — but not the holistic visual gestalt. Paste real screenshots and I'll layer that on.

## Resolution log (2026-06-13, subtraction pass applied)

- ✅ **#1 / #2 motion + grain** — film grain removed entirely; background is now a single slow lime glow (drift speed cut ~4×). Custom cursor and the hero word-rotator both removed. Marquee + scroll reveals retained as the choreographed motion.
- ✅ **#3 faint contrast** — `V_FAINT` raised `#55534a → #7d7a6e`, now **4.55:1** (passes AA for normal text).
- ✅ **#4 custom cursor** — removed.
- ✅ **#6 type families** — Instrument Serif confined to the two ampersands (wordmark + hero) only; facts values, hover-preview tagline, and footer tagline moved to sans/mono.
- ✅ **#7 pill/footer overlap** — footer bottom padding added (80/84px) to clear the fixed pill.
- ✅ **#8 hero measure** — widened to 500px → ~61 chars/line.
- ✅ **#10 touch target** — mobile edition pill now 46px tall.
- ↳ **#5 (`mixBlendMode` wordmark)** and **#9 (rotator jitter, now moot)** left as-is / resolved by removal.

## Summary

The bones are good — strong type scale (213px hero, near full-bleed), consistent 150px section rhythm, a disciplined single accent, clean one-pager structure. The "mess" is real and it's almost entirely **motion overload and surface noise**, not layout. Six independent motion systems run at once with no choreography, a film-grain layer sits over the entire page, and a lagging custom cursor adds jank. Calm the motion and kill the grain and 80% of the "mess" feeling goes away.

## Must Fix

1. **Six concurrent motion systems = visual cacophony.** Running simultaneously: drifting glow + film grain (`VCanvas`, index.html:2054), custom lag cursor (`VCursor`, :2112), the marquee (`VMarquee`, :2206), the hero word-rotator (`VRotator`, :2161), GSAP scroll parallax, and GSAP reveals. Awwwards-winning kinetic pages are *choreographed* — one focal motion at a time, the rest still. Right now nothing ever rests. _Fix: pick a hierarchy. Keep the hero char-reveal + scroll reveals (the payoff moments). Cut or heavily tame the rest: drop the word-rotator, slow the marquee or trigger it only on scroll, and make the background glow nearly static._

2. **Film grain over the whole page reads as "dirty," not premium.** `VCanvas` paints a re-randomized noise tile every frame across a fixed full-viewport backdrop (index.html:2072). Perpetual animated grain is the single biggest "messy/noisy" contributor and it never stops (battery + CPU). _Fix: remove the grain entirely, or render it **once** as a static, very-low-alpha overlay (≤4%) and stop the per-frame redraw. Keep only the slow lime glow._

3. **Faint text fails WCAG.** `V_FAINT #55534a` on `#0c0c0a` measures **2.54:1** — below the 3:1 floor even for large text. It's used on eyebrow labels, fact-grid keys, "soon", and footer secondary text. _Fix: raise faint to ≈`#6f6c61` (~3.4:1) for decorative, and use `V_DIM #8a877a` (5.43:1) for anything that must be read._

## Should Fix

4. **Custom cursor is a gimmick tax.** The dot + lagging follow-ring (`VCursor`, :2112) reads as "tryhard" and the easing lag feels janky on anything but a high-refresh display. _Fix: remove it, or reduce to a single subtle element with no lag. If kept, it must never lag behind fast movement._

5. **`mixBlendMode: difference` on the wordmark is a legibility gamble.** Over the lime glow the wordmark color is unpredictable and can go muddy (index.html:2250). _Fix: drop the blend mode; use solid `V_INK` with a subtle text-shadow, or a tiny frosted chip like the edition pill so both floating controls match._

6. **Four type families competing.** Anton + Archivo + Instrument Serif + Space Mono are all in active use. Instrument Serif italic is sprinkled as an accent (the `&`, rotator, fact values, footer tagline) and dilutes the Anton/mono system. _Fix: demote Instrument Serif to exactly one role (e.g. only the hero `&` and the "Let's Talk" — nowhere else), or cut it. Three families max._

7. **Fixed edition pill can collide with the footer.** It's pinned bottom-right (z 100); the footer's social links also sit bottom-right at scroll end → overlap. _Fix: add bottom padding to the footer equal to the pill height + gap, or fade/park the pill when the footer enters view._

## Could Improve

8. **Hero intro line is short (~41 chars/line at 400px).** Comfortable range is 45–75. _Suggestion: widen the measure to ~480–520px so it reads as a sentence, not a column._
9. **Word-rotator causes width jitter** as different-length words swap inside the paragraph. If kept, reserve a fixed min-width for the slot. (Or cut it — see #1.)
10. **Mobile edition pill is 42px tall** — just under the 44×44 touch ideal. _Suggestion: bump mobile padding to land at ≥44px._

## What Works Well

- **Type scale**: 213px hero filling 1216/1295px is a genuine awwwards-grade headline moment. Strong hierarchy down to the mono labels.
- **Spacing rhythm**: consistent 150px section padding (40px mobile) — disciplined and intentional.
- **Color discipline**: single electric-lime accent against warm near-black; primary/muted/lime all clear AA+ (17.1 / 9.6 / 16.2:1).
- **Structure**: the one-pager refactor reads cleanly — no nav bar, content floats over one continuous surface, the Background section adds real substance.
- **Responsive**: true reflow (rows stack, facts grid 4→2 cols), no horizontal overflow at 375px, motion gated behind `prefers-reduced-motion`.
