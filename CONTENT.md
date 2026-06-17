# Editing content (projects & tools)

Projects and tools live in two spreadsheet files — **edit those, not the code**:

- [`content/projects.csv`](content/projects.csv)
- [`content/tools.csv`](content/tools.csv)

These are the **single source of truth**. At build time, `build.js` reads them and
bakes the data into the site (it regenerates the `PROJECTS` / `TOOL_CATEGORIES`
arrays in `index.html` between the `/* CONTENT:*:START */` markers). No Google, no
live fetch, no separate copy to keep in sync.

> The arrays inside `index.html` are just a dev/preview snapshot — the build
> overwrites them from the CSVs. Don't bother editing them by hand.

## How to update content

1. Open `content/projects.csv` or `content/tools.csv` — they open in Excel / Numbers /
   Google Sheets, or you can edit them right in **GitHub's web editor** (pencil icon).
2. Make your change (add a row, edit a cell, set a tool's `status` to `retired`).
3. Save / commit. On push to `master`, GitHub Actions runs the build and deploys —
   the change is live in a couple of minutes.

That's it. No need to ask Claude for routine content edits.

### Editing in Excel — keep it CSV
If you open in Excel, use **File → Save As → CSV UTF-8** (don't save as .xlsx).
Keep the header row exactly as-is.

## Column reference

### content/projects.csv
| Column | What it is |
|---|---|
| `id` | unique slug, e.g. `milk-me-not` (auto-made from the title if left blank) |
| `title` | project name |
| `description` | one punchy sentence (shown in lists) |
| `tagline` | short accent line on the detail page |
| `detail` | 2–3 sentence write-up |
| `tags` | comma-separated, e.g. `app, food, ratings` (first tag is the category) |
| `year` | e.g. `2025` |
| `url` | short display URL, no `https://` |
| `href` | full link — **leave blank if not live** (shows as "soon") |
| `screenshot` | image path, e.g. `screenshots/foo.png` — blank for the placeholder |
| `role` | what you did, e.g. `Idea, design, build, ship.` |
| `stack` | comma-separated tech, e.g. `React, Supabase` |
| `tools` | comma-separated tools used, e.g. `Claude, Stitch` |
| `featured` | `TRUE` to show on the homepage, else `FALSE` |
| `public` | `FALSE` to hide from the all-projects list; blank = public |
| `accent_default` | hex colour for Ink/Chalk/Volt, e.g. `#22c55e` |
| `accent_mondriaan` | hex for Mondriaan (a primary: `#d72027`, `#1d4ed8`, `#fcc60b`) |

### content/tools.csv
| Column | What it is |
|---|---|
| `category` | `build`, `infrastructure`, or `daily` |
| `name` | tool name |
| `desc` | one dry, specific sentence |
| `status` | `retired` hides it from the Tools page (but it can still be listed in a project's `tools`); blank = active |

## Notes

- **Lists** (`tags`, `stack`, `tools`) are comma-separated inside one cell. If a value
  itself contains a comma, wrap the whole cell in double quotes (Excel does this for you).
- **Retired tools** drop off the Tools page but stay valid to credit on a project —
  that's how *Stitch* and *Remember the Milk* still appear on Milk Me Not.
- Want to preview before deploying? Run `node build.js` and open `dist/index.html`,
  or just push and let the deploy run.
