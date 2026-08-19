# Build footprint extractor

Reads local Claude Code session logs and reports, per project, what can
actually be **measured** about how it was built — prompts, hours, tokens,
edits, and an energy/CO2 estimate.

```bash
node tools/footprint/extract.js
```

```bash
node tools/footprint/extract.js --json footprint.json
```

Flags: `--json <path>` write machine-readable output · `--project <name>`
filter · `--verbose` per-model and per-skill breakdown · `--no-archive`
report without updating the archive.

No dependencies. Reads only `~/.claude/projects/`, never writes to it.

---

## archive.json — commit this file

Claude Code deletes session logs older than `cleanupPeriodDays` (**default
30**), at startup. Reading only what's on disk therefore means the numbers
**shrink every time you regenerate them** — a receipt that quietly gets
smaller is worse than no receipt.

So every run folds what it finds into `archive.json`, keyed by session ID, and
reports from the archive rather than from disk:

- A session still on disk is re-read and its entry **overwritten**, so growing
  sessions stay accurate and nothing is double-counted (session IDs are unique).
- A session whose log has been deleted **stays in the archive** and keeps
  counting. `coverage.sessionsRetainedFromDeletedLogs` reports how many.
- Numbers are therefore monotonic: they can only go up.

### Two files, because this repo is public

| File | Committed? | Contents |
|---|---|---|
| `archive.local.json` | **No** — gitignored | Every project, plus absolute paths. The real record. |
| `archive.json` | Yes | Only `--only` allowlisted projects. No paths, no branch names. |

`archive.local.json` **is the durable record and must not be lost.** Deleting it
throws away every session whose log has already been cleaned up. It is not in
git, so it is not backed up by pushing — copy it if you move machines.

`archive.json` is the redacted subset that ships publicly. File paths and branch
names are stored as one-way SHA-256 prefixes, which still union correctly for
distinct counts but disclose nothing. Project keys are root commit SHAs, or
hashes when a project has no git history.

### The publish allowlist

`--only` gates **both** published artefacts — `footprint.json` on the website
and `archive.json` in this repo:

```bash
node tools/footprint/extract.js --json footprint.json --only milk-me-not,folio
```

Without it, every project you have ever opened Claude Code in would be named
publicly. The terminal table always shows everything; only the written files
are filtered. Add a project here when, and only when, it goes on the site.

To stop losing history in the first place, raise the retention window in
`~/.claude/settings.json`:

```json
{ "cleanupPeriodDays": 3650 }
```

### Why intervals, not a single duration

Each archived session stores its **merged busy intervals**, not one `activeMs`
number. Storing a single duration per session over-counts: two sessions run
the same afternoon would each claim that afternoon, and summing them reports
more hours than actually elapsed. The aggregate unions all intervals instead,
so overlapping sessions collapse to real wall-clock. On this repo that's the
difference between 11.1 and 8.3 hours for one project.

---

## The one rule: this is a floor, never a total

Every number this tool produces is a **lower bound**. It is not "what this
project cost" — it is "the part of what this project cost that happens to be
measurable". The gap is usually large, and the tool reports it rather than
hiding it.

Three separate things go unmeasured:

1. **Work in other tools.** Lovable, Antigravity, Cursor, v0 — none of them
   expose per-project token counts. Lovable reports *credits*, dashboard-only,
   with no API, and its credit history only begins **8 March 2026**.
2. **Work before the logs.** Claude Code rotates session logs away. The
   `coverage` block shows how much of each project's git history predates the
   earliest surviving log — for `milk-me-not` that's 98% of commits.
3. **Work done without an AI tool at all.**

The `coverage.commitCoveragePct` field is the honesty check. Read it before
quoting any other number.

---

## Why there are three CO2 numbers

The single largest input to the answer is a judgement call nobody has
standardised: **how much should a cache read count?**

Over 90% of tokens in a typical Claude Code project are cache reads — the same
context re-sent on every turn. They skip prefill compute and bill at 10% of
input rate, so counting them at full weight is clearly wrong. Counting them at
zero is also wrong. The tool reports all three:

| Scenario | Cache reads weighted | Meaning |
|---|---|---|
| `floor` | 0 | Only tokens actually generated. Unarguable. |
| `midpoint` | 0.1 | Matches how they're billed. The defensible figure. |
| `ceiling` | 1.0 | Everything at full input weight. Almost certainly an overcount. |

For `peter-and-co` that spans 5.2 kg → 283 kg, a **55x range**. Publishing one
number without the range would be false precision. The `headline` field uses
the midpoint; the range is always available alongside it.

---

## Emission factors

Base factors are `190 gCO2e` per million input tokens and `1140 gCO2e` per
million output tokens, from Jegham et al. 2025, as used by the
[claude-carbon](https://github.com/gwittebolle/claude-carbon) project.

**Those figures are measured for Sonnet-class models only.** Opus, Fable and
Haiku are extrapolated by rough parameter ratio (2.0x, 2.0x, 0.5x) and are the
weakest link in the whole calculation — order-of-magnitude, not precise. The
`emissions.caveats` array says so on every project.

Tangible comparisons use 120 gCO2e/km driven, 15 g per kettle boil, 1.8 g per
phone charge.

### No trees

Deliberately omitted. At project scale the honest answer is a *fraction* of a
tree, which doesn't communicate anything, and tree-equivalence imports offset
accounting that is genuinely contested. Kilometres driven is legible and
doesn't make a claim the number can't support.

---

## The dollar figure is not what was paid

`pricing.equivalentListPriceUSD` is computed from Anthropic **list API rates**.
On a Claude subscription you did not pay that amount. The field name is
deliberately awkward for this reason. Do not render it as "cost" anywhere
user-facing without that qualifier attached.

---

## How projects are identified

Session directories are grouped by **root commit SHA**, which survives renames,
directory moves and git worktrees. Falls back to remote URL, then to path.

This is what merges `Documents/PeterAndCo` with `Projects/peter-and-co`, and
folds worktree directories back into their parent project. Directories whose
working directory is not a git repo are reported under their folder name with
no coverage percentage.

---

## Suggested display

The token counts are the least legible thing here. `179 prompts, 11 hours`
lands in a way that `1.16 billion tokens` does not — lead with the human-scale
figures and let the tokens back them up:

```
180 prompts · 11.2 h active · 25 days
2.9M tokens generated (1.16B including cache)
245 edits across 31 files · 11 PRs
~55 kg CO2e — roughly 460 km of driving
Measured: Claude Code, 12 Jun–19 Aug 2026. Earlier work
and other tools not counted (15% of commits).
```
