# Peter & Co. — Sanity Studio (the admin)

This is the **admin** for the portfolio's content (projects + tools). It's a separate
app from the website. The website (`../index.html`) **reads** content from Sanity at
load; you **edit** content here.

- Project ID: `fas2xxna` · Dataset: `production`

## First-time setup (run once, in this `studio/` folder)

```bash
cd studio
npm install
npx sanity login        # opens a browser — log in with the account you made
npm run seed            # imports seed.ndjson → your current projects & tools
npm run dev             # runs the admin locally at http://localhost:3333
```

## Use it every day

- `npm run dev` → edit at http://localhost:3333, or
- `npm run deploy` → publishes a hosted admin at `https://<name>.sanity.studio`
  that you can open from anywhere (and hand to a client).

Changes you publish here appear on the website on next refresh (the site reads live).

## Notes

- `seed.ndjson` is a one-time import of the content that was hardcoded in the site.
  After importing once, the Studio is the source of truth — don't re-run `seed`.
- Screenshots: the seed doesn't include images. Upload them per project in the Studio
  (the `Screenshot` / `Screenshot (before)` fields). Projects without one show the
  placeholder. For redesign case studies, set both `Screenshot` and
  `Screenshot (before)` to show the drag-to-reveal comparison slider.
- If the website can't read Sanity (offline, etc.) it falls back to a frozen
  snapshot baked into `index.html`. That snapshot isn't auto-synced with Sanity —
  it's just there so the site never fully breaks, not a live mirror of your content.
