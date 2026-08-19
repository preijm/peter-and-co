#!/usr/bin/env node
/**
 * Build-footprint extractor.
 *
 * Reads local Claude Code session logs and reports, per project, what can
 * actually be MEASURED about how it was built: tokens, time, prompts, edits,
 * and an energy/CO2 estimate.
 *
 * Everything it reports is a FLOOR, never a total. Claude Code is the only
 * tool here that records exact per-message token counts, and its logs are
 * deleted after `cleanupPeriodDays` (default 30) — so each project's real
 * cost is this number plus an unmeasured remainder. The `coverage` block on
 * every project says how much of the git history the measured window spans.
 *
 * THE ARCHIVE
 * Because logs are deleted on a rolling window, reading only what's on disk
 * means the numbers SHRINK every time you regenerate them. So each run folds
 * what it finds into `archive.json`, keyed by session ID, and reports from
 * the archive rather than from disk. Once a session has been counted it stays
 * counted after its log is gone. Session IDs are unique, so re-reading a
 * session that's still on disk overwrites its entry instead of double-counting.
 *
 * The archive is the durable record — commit it. Deleting it silently throws
 * away every session whose log has already been cleaned up.
 *
 * Usage:
 *   node tools/footprint/extract.js                 # human-readable table
 *   node tools/footprint/extract.js --json out.json # machine-readable
 *   node tools/footprint/extract.js --project folio # filter by name
 *   node tools/footprint/extract.js --verbose       # per-model breakdown
 *   node tools/footprint/extract.js --no-archive    # read-only, don't write
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
const ARCHIVE_PATH = path.join(__dirname, 'archive.json');
const ARCHIVE_VERSION = 1;

// Gap between consecutive log records that still counts as "actively working".
// Anything longer is treated as the user having walked away.
const ACTIVE_GAP_MS = 10 * 60 * 1000;

/**
 * API list price, USD per million tokens: [input, output, cacheWrite, cacheRead].
 * Cache write bills ~1.25x input, cache read ~0.1x input.
 *
 * NOTE: this is the list API rate. On a Claude subscription you did not pay
 * this. Reported as `equivalentListPriceUSD` and should never be presented as
 * "what this cost me".
 */
const PRICING = {
  'claude-opus-5':     [5, 25, 6.25, 0.5],
  'claude-opus-4-8':   [5, 25, 6.25, 0.5],
  'claude-opus-4-7':   [5, 25, 6.25, 0.5],
  'claude-opus-4-6':   [5, 25, 6.25, 0.5],
  'claude-sonnet-5':   [3, 15, 3.75, 0.3],
  'claude-sonnet-4-6': [3, 15, 3.75, 0.3],
  'claude-haiku-4-5':  [1,  5, 1.25, 0.1],
  'claude-fable-5':    [10, 50, 12.5, 1.0],
};

/**
 * Emission factors, gCO2e per million tokens.
 *
 * Sonnet-class figures are the only ones measured directly (Jegham et al.
 * 2025, as used by the claude-carbon project). Opus- and Fable-class are
 * EXTRAPOLATED by rough parameter ratio and are the weakest link in this
 * whole calculation — treat them as order-of-magnitude, not precise.
 */
const EMISSIONS = {
  base: { input: 190, output: 1140 },  // measured, Sonnet-class
  multipliers: {
    sonnet: { factor: 1.0, extrapolated: false },
    haiku:  { factor: 0.5, extrapolated: true },
    opus:   { factor: 2.0, extrapolated: true },
    fable:  { factor: 2.0, extrapolated: true },
  },
};

/**
 * Three ways to count, because the answer moves by ~55x depending on how you
 * treat cache reads. Publishing a single number here would be false precision.
 *
 *  floor    - only tokens actually generated. Unarguable.
 *  midpoint - cache reads weighted 0.1 (they skip prefill and bill 10x less).
 *             The most defensible single figure.
 *  ceiling  - every token at full input weight. Almost certainly an overcount.
 */
const SCENARIOS = {
  floor:    { input: 0,   cacheWrite: 0,    cacheRead: 0 },
  midpoint: { input: 1.0, cacheWrite: 1.25, cacheRead: 0.1 },
  ceiling:  { input: 1.0, cacheWrite: 1.0,  cacheRead: 1.0 },
};

// Tangible comparisons. Deliberately excludes trees: at project scale the
// answer is a fraction of a tree, and it imports contested offset logic.
const COMPARISONS = {
  kmDriven:     120,   // gCO2e per km, average passenger car
  kettleBoils:  15,    // gCO2e per boil (~0.1 kWh at a typical grid mix)
  phoneCharges: 1.8,   // gCO2e per full charge (~0.012 kWh)
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function modelClass(model) {
  if (!model) return null;
  if (model.includes('opus')) return 'opus';
  if (model.includes('sonnet')) return 'sonnet';
  if (model.includes('haiku')) return 'haiku';
  if (model.includes('fable') || model.includes('mythos')) return 'fable';
  return null;
}

function git(cwd, args) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function isDir(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

/**
 * Stable identity for a project across renames, moves and worktrees.
 * Root commit SHA is best: survives directory moves and needs no remote.
 *
 * Resolved at archive time and then STORED, because a session whose log has
 * been deleted may also have had its working directory moved or removed —
 * by then there's nothing left to resolve.
 */
function projectIdentity(cwd) {
  if (!cwd || !isDir(cwd)) return null;
  const root = git(cwd, ['rev-list', '--max-parents=0', 'HEAD']);
  if (root) return { key: 'git:' + root.split('\n').pop(), repo: cwd };
  const remote = git(cwd, ['remote', 'get-url', 'origin']);
  if (remote) return { key: 'remote:' + remote, repo: cwd };
  return { key: 'path:' + cwd.toLowerCase(), repo: null };
}

function emptyTotals() {
  return { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 };
}

const uniq = (arr) => Array.from(new Set(arr));

// ---------------------------------------------------------------------------
// Log parsing — one record per SESSION, not per directory
// ---------------------------------------------------------------------------

/**
 * Parse every session file in one Claude Code project directory.
 * Returns an array of per-session summaries (possibly empty — directories
 * routinely outlive the logs they held).
 */
function parseSessionsInDir(dirPath) {
  let files;
  try {
    files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.jsonl'));
  } catch {
    return [];
  }

  const out = [];

  for (const file of files) {
    let lines;
    try {
      lines = fs.readFileSync(path.join(dirPath, file), 'utf8').split('\n');
    } catch {
      continue;
    }

    const s = {
      sessionId: path.basename(file, '.jsonl'),
      dirName: path.basename(dirPath),
      cwd: null,
      prompts: 0,
      assistantMessages: 0,
      compactions: 0,
      apiErrors: 0,
      webSearches: 0,
      webFetches: 0,
      totals: emptyTotals(),
      byModel: {},
      tools: {},
      files: new Set(),
      branches: new Set(),
      prs: new Set(),
      skills: {},
      days: new Set(),
      timestamps: [],
    };

    for (const line of lines) {
      if (!line.trim()) continue;
      let rec;
      try { rec = JSON.parse(line); } catch { continue; }

      if (rec.sessionId) s.sessionId = rec.sessionId;
      if (rec.cwd && !s.cwd) s.cwd = rec.cwd;
      if (rec.timestamp) {
        const t = Date.parse(rec.timestamp);
        if (!Number.isNaN(t)) {
          s.timestamps.push(t);
          s.days.add(rec.timestamp.slice(0, 10));
        }
      }
      if (rec.gitBranch) s.branches.add(rec.gitBranch);
      if (rec.prNumber) s.prs.add(rec.prNumber);
      if (rec.isCompactSummary || rec.compactMetadata) s.compactions++;
      if (rec.isApiErrorMessage) s.apiErrors++;
      if (rec.attributionSkill) {
        s.skills[rec.attributionSkill] = (s.skills[rec.attributionSkill] || 0) + 1;
      }

      const msg = rec.message;

      // A real human prompt: role user, string content, not a tool result or
      // an injected meta record.
      if (
        rec.type === 'user' && msg && msg.role === 'user' &&
        !rec.isMeta && typeof msg.content === 'string'
      ) {
        s.prompts++;
      }

      if (rec.type !== 'assistant' || !msg) continue;
      s.assistantMessages++;

      const usage = msg.usage;
      if (usage) {
        const model = msg.model || 'unknown';
        const t = {
          input: usage.input_tokens || 0,
          output: usage.output_tokens || 0,
          cacheWrite: usage.cache_creation_input_tokens || 0,
          cacheRead: usage.cache_read_input_tokens || 0,
        };
        for (const k of Object.keys(t)) s.totals[k] += t[k];
        if (!s.byModel[model]) s.byModel[model] = emptyTotals();
        for (const k of Object.keys(t)) s.byModel[model][k] += t[k];

        if (usage.server_tool_use) {
          s.webSearches += usage.server_tool_use.web_search_requests || 0;
          s.webFetches += usage.server_tool_use.web_fetch_requests || 0;
        }
      }

      if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type !== 'tool_use') continue;
          s.tools[block.name] = (s.tools[block.name] || 0) + 1;
          const fp = block.input && (block.input.file_path || block.input.notebook_path);
          if (fp) s.files.add(String(fp).split(path.sep).join('/'));
        }
      }
    }

    if (!s.timestamps.length) continue;
    out.push(s);
  }

  return out;
}

/**
 * Collapse a session's raw timestamps into merged busy intervals.
 *
 * Storing every timestamp forever would balloon the archive, but storing a
 * single activeMs per session would over-count: two sessions running the same
 * afternoon would each claim that afternoon, and summing them reports more
 * hours than actually elapsed. Intervals keep the archive small AND let the
 * aggregate union overlapping sessions back down to real wall-clock.
 */
function busyIntervals(timestamps) {
  const ts = timestamps.slice().sort((a, b) => a - b);
  const out = [];
  let start = ts[0], prev = ts[0];
  for (let i = 1; i < ts.length; i++) {
    if (ts[i] - prev < ACTIVE_GAP_MS) { prev = ts[i]; continue; }
    if (prev > start) out.push([start, prev]);
    start = prev = ts[i];
  }
  if (prev > start) out.push([start, prev]);
  return out;
}

/** Total elapsed time covered by a set of intervals, overlaps counted once. */
function unionMs(intervals) {
  if (!intervals.length) return 0;
  const sorted = intervals.slice().sort((a, b) => a[0] - b[0]);
  let total = 0, [s, e] = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const [ns, ne] = sorted[i];
    if (ns <= e) { if (ne > e) e = ne; continue; }
    total += e - s;
    s = ns; e = ne;
  }
  return total + (e - s);
}

/** Collapse a parsed session into the flat, JSON-safe shape the archive keeps. */
function toArchiveEntry(s, identity, nowIso) {
  const ts = s.timestamps.sort((a, b) => a - b);
  const intervals = busyIntervals(ts);
  const activeMs = unionMs(intervals);

  return {
    intervals,
    projectKey: identity ? identity.key : 'dir:' + s.dirName,
    projectName: identity && identity.repo
      ? path.basename(identity.repo)
      : (s.cwd ? path.basename(s.cwd) : s.dirName),
    cwd: s.cwd,
    dirName: s.dirName,
    firstSeen: new Date(ts[0]).toISOString(),
    lastSeen: new Date(ts[ts.length - 1]).toISOString(),
    activeMs,
    days: Array.from(s.days).sort(),
    prompts: s.prompts,
    assistantMessages: s.assistantMessages,
    compactions: s.compactions,
    apiErrors: s.apiErrors,
    webSearches: s.webSearches,
    webFetches: s.webFetches,
    totals: s.totals,
    byModel: s.byModel,
    tools: s.tools,
    files: Array.from(s.files),
    branches: Array.from(s.branches),
    prs: Array.from(s.prs),
    skills: s.skills,
    archivedAt: nowIso,
  };
}

// ---------------------------------------------------------------------------
// Archive
// ---------------------------------------------------------------------------

function loadArchive() {
  try {
    const raw = JSON.parse(fs.readFileSync(ARCHIVE_PATH, 'utf8'));
    if (raw && raw.sessions && typeof raw.sessions === 'object') return raw;
  } catch {
    // Missing or unreadable archive is normal on a first run.
  }
  return { version: ARCHIVE_VERSION, sessions: {} };
}

function saveArchive(archive) {
  archive.version = ARCHIVE_VERSION;
  archive.note =
    'Durable record of measured Claude Code sessions, keyed by session ID. ' +
    'Claude Code deletes session logs after cleanupPeriodDays (default 30), ' +
    'so this file is the only lasting copy of anything already cleaned up. ' +
    'Commit it. Deleting it loses that history permanently.';
  fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(archive, null, 2));
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

function aggregate(entries) {
  const g = {
    cwd: null, repo: null,
    prompts: 0, assistantMessages: 0, compactions: 0, apiErrors: 0,
    webSearches: 0, webFetches: 0, intervals: [],
    sessions: 0, sessionsOnDisk: 0, sessionsFromArchive: 0,
    totals: emptyTotals(), byModel: {}, tools: {}, skills: {},
    files: [], branches: [], prs: [], days: [],
    first: null, last: null,
  };

  for (const e of entries) {
    g.sessions++;
    if (e._onDisk) g.sessionsOnDisk++; else g.sessionsFromArchive++;
    g.prompts += e.prompts || 0;
    g.assistantMessages += e.assistantMessages || 0;
    g.compactions += e.compactions || 0;
    g.apiErrors += e.apiErrors || 0;
    g.webSearches += e.webSearches || 0;
    g.webFetches += e.webFetches || 0;
    // Union rather than sum: overlapping sessions must not double-count hours.
    // Entries archived before intervals existed fall back to their activeMs.
    if (Array.isArray(e.intervals) && e.intervals.length) g.intervals.push(...e.intervals);
    else if (e.activeMs) g.legacyActiveMs = (g.legacyActiveMs || 0) + e.activeMs;

    for (const k of Object.keys(g.totals)) g.totals[k] += (e.totals && e.totals[k]) || 0;
    for (const [m, t] of Object.entries(e.byModel || {})) {
      if (!g.byModel[m]) g.byModel[m] = emptyTotals();
      for (const k of Object.keys(g.byModel[m])) g.byModel[m][k] += t[k] || 0;
    }
    for (const [t, n] of Object.entries(e.tools || {})) g.tools[t] = (g.tools[t] || 0) + n;
    for (const [s, n] of Object.entries(e.skills || {})) g.skills[s] = (g.skills[s] || 0) + n;

    g.files.push(...(e.files || []));
    g.branches.push(...(e.branches || []));
    g.prs.push(...(e.prs || []));
    g.days.push(...(e.days || []));

    if (!g.cwd && e.cwd) g.cwd = e.cwd;
    if (e.firstSeen && (!g.first || e.firstSeen < g.first)) g.first = e.firstSeen;
    if (e.lastSeen && (!g.last || e.lastSeen > g.last)) g.last = e.lastSeen;
  }

  g.files = uniq(g.files);
  g.branches = uniq(g.branches);
  g.prs = uniq(g.prs);
  g.days = uniq(g.days);
  g.activeMs = unionMs(g.intervals) + (g.legacyActiveMs || 0);
  return g;
}

// ---------------------------------------------------------------------------
// Derived numbers
// ---------------------------------------------------------------------------

function computeCost(byModel) {
  let total = 0;
  const unpriced = [];
  for (const [model, t] of Object.entries(byModel)) {
    const p = PRICING[model];
    if (!p) {
      if (model !== 'unknown' && model !== '<synthetic>') unpriced.push(model);
      continue;
    }
    total += (t.input * p[0] + t.output * p[1] + t.cacheWrite * p[2] + t.cacheRead * p[3]) / 1e6;
  }
  return { equivalentListPriceUSD: Math.round(total * 100) / 100, unpricedModels: unpriced };
}

function computeEmissions(byModel) {
  const out = {};
  let anyExtrapolated = false;

  for (const [name, weights] of Object.entries(SCENARIOS)) {
    let grams = 0;
    for (const [model, t] of Object.entries(byModel)) {
      const cls = modelClass(model);
      if (!cls) continue;
      const mult = EMISSIONS.multipliers[cls];
      if (mult.extrapolated) anyExtrapolated = true;

      const inputEquivalent =
        t.input * weights.input +
        t.cacheWrite * weights.cacheWrite +
        t.cacheRead * weights.cacheRead;

      grams +=
        (inputEquivalent * EMISSIONS.base.input * mult.factor) / 1e6 +
        (t.output * EMISSIONS.base.output * mult.factor) / 1e6;
    }
    out[name] = Math.round(grams * 10) / 10;
  }

  const mid = out.midpoint;
  return {
    gramsCO2e: out,
    headline: {
      kgCO2e: Math.round((mid / 1000) * 10) / 10,
      kmDriven: Math.round(mid / COMPARISONS.kmDriven),
      kettleBoils: Math.round(mid / COMPARISONS.kettleBoils),
      phoneCharges: Math.round(mid / COMPARISONS.phoneCharges),
    },
    caveats: [
      'Range spans ' + (out.ceiling / Math.max(out.floor, 0.1)).toFixed(0) +
        'x between floor and ceiling; the variable is how cache reads are weighted.',
      anyExtrapolated
        ? 'Opus/Fable emission factors are extrapolated by parameter ratio, not measured.'
        : 'All emission factors are measured for this model class.',
      'Base factors: Jegham et al. 2025 (Sonnet-class, via the claude-carbon project).',
    ],
  };
}

/**
 * Cross-check the measured window against git history.
 *
 * This is the honesty check: it reports how much of the project's actual
 * commit history predates the earliest session we have any record of.
 */
function computeCoverage(repo, g) {
  const from = g.first ? g.first.slice(0, 10) : null;
  const to = g.last ? g.last.slice(0, 10) : null;

  const base = {
    tool: 'claude-code',
    measuredFrom: from,
    measuredTo: to,
    isFloor: true,
    sessionsMeasured: g.sessions,
    sessionsRetainedFromDeletedLogs: g.sessionsFromArchive,
    unmeasured: [
      'Sessions deleted before this archive first recorded them.',
      'Any work done in other tools (Lovable, Antigravity, Cursor, OpenCode, ...).',
      'Any work done outside an AI coding tool entirely.',
    ],
  };
  if (!repo || !from) return base;

  const firstCommit = git(repo, ['log', '--reverse', '--format=%ad', '--date=short']);
  const total = git(repo, ['rev-list', '--count', 'HEAD']);
  // Full timestamp, not the date: `--until=YYYY-MM-DD` is inclusive of that
  // whole day, so a project built and measured on the same day would count
  // every one of its commits as falling *before* the window.
  const before = git(repo, ['rev-list', '--count', 'HEAD', '--until=' + g.first]);
  if (!firstCommit || !total) return base;

  const totalCommits = parseInt(total, 10);
  const commitsBefore = parseInt(before || '0', 10);

  return Object.assign(base, {
    repoPath: repo,
    firstCommitDate: firstCommit.split('\n')[0],
    totalCommits,
    commitsBeforeMeasuredWindow: commitsBefore,
    commitCoveragePct: totalCommits
      ? Math.round(((totalCommits - commitsBefore) / totalCommits) * 100)
      : null,
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function collect(writeArchive) {
  const archive = loadArchive();
  const nowIso = new Date().toISOString();
  let seen = 0, fresh = 0;

  // Pass 1: read what's on disk and fold it into the archive. A session still
  // present is re-read and overwritten, so counts stay correct as it grows.
  if (isDir(PROJECTS_DIR)) {
    for (const entry of fs.readdirSync(PROJECTS_DIR)) {
      const dirPath = path.join(PROJECTS_DIR, entry);
      for (const s of parseSessionsInDir(dirPath)) {
        const identity = projectIdentity(s.cwd);
        const prior = archive.sessions[s.sessionId];
        const next = toArchiveEntry(s, identity, nowIso);
        // Keep the identity resolved on an earlier run if the repo has since
        // moved or been deleted — a stale key still groups correctly.
        if (prior && prior.projectKey && (!identity || !identity.repo)) {
          next.projectKey = prior.projectKey;
          next.projectName = prior.projectName;
        }
        if (!prior) fresh++;
        archive.sessions[s.sessionId] = next;
        seen++;
      }
    }
  }

  if (writeArchive) saveArchive(archive);

  // Pass 2: report from the archive, not from disk. Sessions whose logs are
  // gone still appear here — that is the entire point.
  const onDisk = new Set();
  if (isDir(PROJECTS_DIR)) {
    for (const entry of fs.readdirSync(PROJECTS_DIR)) {
      for (const f of (() => {
        try { return fs.readdirSync(path.join(PROJECTS_DIR, entry)); } catch { return []; }
      })()) {
        if (f.endsWith('.jsonl')) onDisk.add(path.basename(f, '.jsonl'));
      }
    }
  }

  const groups = new Map();
  for (const [sid, e] of Object.entries(archive.sessions)) {
    const key = e.projectKey || 'unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(Object.assign({}, e, { _onDisk: onDisk.has(sid) || onDisk.has(e.sessionId) }));
  }

  const projects = [];
  for (const entries of groups.values()) {
    const g = aggregate(entries);
    const repo = g.cwd && isDir(g.cwd) ? g.cwd : null;
    const cost = computeCost(g.byModel);
    const t = g.totals;
    const total = t.input + t.output + t.cacheWrite + t.cacheRead;
    const edits = (g.tools.Edit || 0) + (g.tools.Write || 0) + (g.tools.NotebookEdit || 0);

    projects.push({
      name: entries[0].projectName || 'unknown',
      path: g.cwd,
      sourceDirs: uniq(entries.map((e) => e.dirName).filter(Boolean)),

      measured: {
        prompts: g.prompts,
        assistantMessages: g.assistantMessages,
        sessions: g.sessions,
        sessionsRetainedFromDeletedLogs: g.sessionsFromArchive,
        activeHours: Math.round((g.activeMs / 3600000) * 10) / 10,
        calendarDays: g.days.length,
        firstSeen: g.first ? g.first.slice(0, 10) : null,
        lastSeen: g.last ? g.last.slice(0, 10) : null,
      },

      tokens: {
        output: t.output,
        input: t.input,
        cacheWrite: t.cacheWrite,
        cacheRead: t.cacheRead,
        total,
        cacheReadShare: total ? Math.round((t.cacheRead / total) * 1000) / 10 : 0,
      },

      work: {
        toolCalls: Object.values(g.tools).reduce((a, b) => a + b, 0),
        edits,
        bashCommands: g.tools.Bash || 0,
        filesTouched: g.files.length,
        branches: g.branches.length,
        prs: g.prs.length,
        webSearches: g.webSearches,
        compactions: g.compactions,
        apiErrors: g.apiErrors,
      },

      models: Object.fromEntries(
        Object.entries(g.byModel)
          .map(([m, v]) => [m, v.input + v.output + v.cacheWrite + v.cacheRead])
          .sort((a, b) => b[1] - a[1])
      ),
      skills: g.skills,

      // Labelled deliberately: this is the API list-price equivalent, NOT what
      // was paid on a subscription. Do not render this as "cost".
      pricing: cost,
      emissions: computeEmissions(g.byModel),
      coverage: computeCoverage(repo, g),
    });
  }

  projects.sort((a, b) => b.tokens.total - a.tokens.total);
  return { projects, stats: { sessionsSeen: seen, sessionsNew: fresh, archived: Object.keys(archive.sessions).length } };
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const n = (x) => x.toLocaleString('en-US');

function pad(s, w) {
  s = String(s);
  return s.length >= w ? s.slice(0, w) : s + ' '.repeat(w - s.length);
}
function padLeft(s, w) {
  s = String(s);
  return s.length >= w ? s : ' '.repeat(w - s.length) + s;
}

function printTable(projects, verbose, stats) {
  console.log('');
  console.log('BUILD FOOTPRINT  —  measured from Claude Code session logs');
  console.log('Every figure is a FLOOR. See the coverage column.');
  console.log('');

  const header =
    pad('PROJECT', 22) + padLeft('PROMPTS', 8) + padLeft('HOURS', 7) +
    padLeft('OUTPUT', 12) + padLeft('TOTAL TOK', 15) + padLeft('EDITS', 7) +
    padLeft('KG CO2E', 9) + padLeft('COVERAGE', 10);
  console.log(header);
  console.log('-'.repeat(header.length));

  for (const p of projects) {
    const cov = p.coverage.commitCoveragePct != null ? p.coverage.commitCoveragePct + '%' : '?';
    console.log(
      pad(p.name, 22) +
      padLeft(n(p.measured.prompts), 8) +
      padLeft(p.measured.activeHours, 7) +
      padLeft(n(p.tokens.output), 12) +
      padLeft(n(p.tokens.total), 15) +
      padLeft(n(p.work.edits), 7) +
      padLeft(p.emissions.headline.kgCO2e, 9) +
      padLeft(cov, 10)
    );
  }

  console.log('');
  console.log("COVERAGE = share of the project's git commits inside the measured window.");
  console.log('KG CO2E  = midpoint scenario. Floor/ceiling span is much wider — see JSON.');
  console.log('');

  for (const p of projects) {
    console.log('  ' + p.name);
    console.log('    span         ' + (p.measured.firstSeen || '?') + ' -> ' +
                (p.measured.lastSeen || '?') + '   (' + p.measured.calendarDays + ' active days)');
    if (p.coverage.firstCommitDate) {
      console.log('    git history  starts ' + p.coverage.firstCommitDate + ', ' +
                  p.coverage.totalCommits + ' commits, ' +
                  p.coverage.commitsBeforeMeasuredWindow + ' before logs begin');
    }
    console.log('    sessions     ' + p.measured.sessions +
                (p.measured.sessionsRetainedFromDeletedLogs
                  ? '  (' + p.measured.sessionsRetainedFromDeletedLogs + ' retained from deleted logs)'
                  : ''));
    console.log('    cache reads  ' + p.tokens.cacheReadShare + '% of all tokens');
    console.log('    CO2e range   floor ' + (p.emissions.gramsCO2e.floor / 1000).toFixed(1) +
                ' kg  |  mid ' + (p.emissions.gramsCO2e.midpoint / 1000).toFixed(1) +
                ' kg  |  ceiling ' + (p.emissions.gramsCO2e.ceiling / 1000).toFixed(1) + ' kg');
    console.log('    ~' + p.emissions.headline.kmDriven + ' km driven, or ' +
                n(p.emissions.headline.kettleBoils) + ' kettle boils (midpoint)');
    console.log('    list price   $' + p.pricing.equivalentListPriceUSD +
                '  (API list rate — NOT what was paid on a subscription)');
    if (verbose) {
      console.log('    models       ' + Object.entries(p.models)
        .map(([m, v]) => m + ' ' + n(v)).join(', '));
      if (Object.keys(p.skills).length) {
        console.log('    skills       ' + Object.entries(p.skills)
          .map(([s, c]) => s + ' (' + c + ')').join(', '));
      }
      console.log('    dirs         ' + p.sourceDirs.join(', '));
    }
    console.log('');
  }

  console.log('Archive: ' + stats.archived + ' sessions recorded (' +
              stats.sessionsSeen + ' readable on disk, ' + stats.sessionsNew + ' new this run)');
  console.log('  ' + path.relative(process.cwd(), ARCHIVE_PATH).split(path.sep).join('/') +
              ' — commit it; it outlives the logs.');
  console.log('');
}

function main() {
  const argv = process.argv.slice(2);
  const jsonIdx = argv.indexOf('--json');
  const projIdx = argv.indexOf('--project');
  const verbose = argv.includes('--verbose');
  const writeArchive = !argv.includes('--no-archive');

  const { projects: all, stats } = collect(writeArchive);
  let projects = all;

  if (projIdx !== -1 && argv[projIdx + 1]) {
    const needle = argv[projIdx + 1].toLowerCase();
    projects = projects.filter(
      (p) => p.name.toLowerCase().includes(needle) ||
             (p.path || '').toLowerCase().includes(needle)
    );
  }

  if (!projects.length) {
    console.log('No projects with usable session data found.');
    return;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'claude-code-session-logs',
    disclaimer:
      'All figures are a measured floor, not a total. Only Claude Code usage ' +
      'is counted, and only sessions this archive recorded before their logs ' +
      'were deleted. Work in other tools is not included.',
    methodology: {
      pricing: 'Anthropic list API rates. Not what was paid on a subscription.',
      emissions: EMISSIONS,
      scenarios: SCENARIOS,
      activeTimeGapMs: ACTIVE_GAP_MS,
      archive: 'Sessions are recorded by ID in tools/footprint/archive.json and ' +
               'stay counted after Claude Code deletes their logs.',
    },
    projects,
  };

  if (jsonIdx !== -1) {
    const out = argv[jsonIdx + 1] || 'footprint.json';
    fs.writeFileSync(out, JSON.stringify(payload, null, 2));
    console.log('Wrote ' + out + '  (' + projects.length + ' projects)');
    console.log('Archive: ' + stats.archived + ' sessions (' + stats.sessionsNew + ' new this run)');
  } else {
    printTable(projects, verbose, stats);
  }
}

main();
