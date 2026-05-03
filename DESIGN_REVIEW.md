# Design Review: Peter & Co. Hub Site

Reviewed against: visual inspection (no DESIGN_BRIEF.md found)  
Philosophy: Dark editorial minimal — DM Serif Display + JetBrains Mono  
Date: 2026-04-20

## Screenshots Captured

| Breakpoint | What it shows |
|---|---|
| Desktop 1280px | Work page — hero + project grid |
| Tablet 768px | Work page — responsive grid |
| Mobile 375px — work | Hero + project cards |
| Mobile 375px — about | About 2-col grid on narrow viewport |
| Desktop 1280px — about | About page full layout |

---

## Summary

The aesthetic direction is strong and coherent — the serif/mono pairing, near-black palette, and editorial spacing give it a distinctive voice that reads professional without feeling corporate. The one must-fix is a mobile navigation breakage that makes the site unusable at 375px. Several missing accessibility foundations (focus rings, semantic HTML) are quick wins before shipping.

---

## Must Fix

**1. Mobile nav overflows and logo wraps**  
At 375px the logo "& Co." drops to a second line and the nav links overflow the viewport edge — "tools" and "contact" are clipped off-screen. The header row has no responsive handling. Fix: add a media query (or inline style at ≤480px) that reduces the logo font size to ~24px/16px and either reduces nav gap or collapses it to a hamburger. At minimum: `fontSize: window.innerWidth < 480 ? '24px' : '36px'` on the logo, and `gap: '16px'` on the nav at mobile widths.

**2. About grid stays 2-column on mobile**  
The `gridTemplateColumns: '1fr 1fr'` in `About()` (index.html:289) persists at all widths. At 375px the text column is ~140px wide — too narrow for readable body text. Fix: collapse to single column on mobile (`grid-template-columns: 1fr` at ≤600px) with the photo above or below the text.

---

## Should Fix

**3. No focus indicators on any interactive element**  
All buttons and links use `background: none; border: none` styles with no `:focus-visible` ring. Keyboard users cannot see where they are. Fix: add a global `button:focus-visible, a:focus-visible { outline: 2px solid #ffffff; outline-offset: 3px; }` rule in the `<style>` block.

**4. No semantic HTML landmarks**  
The entire app renders into `<div id="root">` with no `<nav>`, `<main>`, `<header>`, or `<footer>` semantic elements (the `<footer>` tag exists but nav uses divs). Screen readers cannot jump to sections. Fix: replace the nav container `<div>` with `<nav>`, wrap page content in `<main>`, and the logo+nav row in `<header>`.

**5. React dev build + Babel standalone loaded at runtime**  
`index.html` loads `react.development.js` and `@babel/standalone` (lines 9–11). The Babel transform runs in the browser on every page load — noticeably slow on first paint. Before shipping, swap to `react.production.min.js`/`react-dom.production.min.js` and either pre-compile the JSX or use a static build step.

**6. Contact form has no submission backend**  
`Contact()` (index.html:384) sets `sent=true` on submit but sends nothing. The "Got it." state is a UI-only mock. Fix: wire to Formspree (`action="https://formspree.io/f/..."`) or EmailJS before launch.

---

## Could Improve

**7. Logo + nav duplicated across Hero and PageHeader**  
The exact same logo markup + nav loop appears in both `Hero` (lines 92–111) and `PageHeader` (lines 56–78). They render in different contexts (Hero on work page, PageHeader on all others) but are identical. Extract into one `<SiteHeader>` component to keep responsive fixes in one place.

**8. "03 / →" indicator implies pagination that doesn't exist**  
The arrow in `ProjectGrid` (line 250) looks interactive but does nothing. Either remove the arrow and keep the count as a plain label, or make it scroll/navigate somewhere.

**9. About page has significant empty space below content on desktop**  
The about section ends around 60% of the viewport height, leaving a large blank area before the footer. Consider adding a thin "what I'm currently building" strip or a contact CTA row to fill the gap intentionally rather than leaving it as dead space.

**10. Hero subtitle placement is awkward at narrow widths**  
"product owner by day, builder by night." sits inline right of the CTA button (flexbox row). At ~480–600px this creates an awkward narrow text block. Consider moving it below the button or giving it its own line.

---

## What Works Well

- **Typography pairing is the standout.** DM Serif Display + JetBrains Mono is sharp and distinctive — it gives the site a personality that most portfolios don't have.
- **Accent color system on project cards.** Green / amber / purple dots with a matching bottom-border on hover is refined. The hover state reveals the color without overwhelming the dark palette.
- **Logo treatment.** "Peter" large + "& Co." smaller and muted is a nice hierarchical move — it reads as one unit but has visual tension.
- **Hero headline copy.** "I build things. Sometimes they're useful." fits the aesthetic perfectly — confident, self-aware, not trying too hard.
- **Footer copy.** "this is a playground, not a business. yet." is the right note to end on.
- **Project detail page.** The two-column layout (description + meta sidebar) with the accent-tinted screenshot placeholder is well considered.
