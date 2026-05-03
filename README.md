# Peter & Co.

Personal hub site — [peterandco.nl](https://peterandco.nl)

A dark editorial portfolio built to show projects and thinking. Single self-contained HTML file; no build step, no dependencies to install.

## Stack

- React 18 (UMD, no bundler)
- Babel Standalone (JSX in-browser)
- DM Serif Display + JetBrains Mono
- Hosted on GitHub Pages

## Run locally

```bash
npx serve .
```

Then open [localhost:3456](http://localhost:3456).

## Structure

Everything lives in `index.html`. Components are defined in order:

| Component | What it does |
|---|---|
| `SiteHeader` | Responsive logo + nav, shared across all pages |
| `Hero` | Work page hero with headline and CTA |
| `ProjectGrid` | Card grid of projects |
| `ProjectDetail` | Full project page (description, stack, role) |
| `About` | Bio, photo, background |
| `Tools` | Stack I use day-to-day |
| `Contact` | mailto-wired contact form |
| `Footer` | Links + tagline |

`logos.html` is a standalone logo variation sheet — open it directly in the browser.
