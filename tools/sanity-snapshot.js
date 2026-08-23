// Deploy-time content snapshot.
//
// PROJECTS / TOOL_CATEGORIES in index.html are not a disaster fallback, they are the
// first paint: loadSanityContent() runs inside a useEffect, so whatever is in those
// arrays is what the page renders before the fetch resolves. Ship them empty and the
// Grain reel paints a hero and a contact block, then pops five full-screen planes in
// once the network answers.
//
// Hand-maintaining them does not work - by the time this was written the array was
// missing a project entirely and still called Peter & Co. `experiment-03`. So the
// build regenerates them instead, and the copy in index.html matters only to
// `npx serve .`.
//
// The queries and the mapping are not duplicated here. They are lifted out of
// index.html between the SANITY-SHARED markers and evaluated in Node, so the snapshot
// is produced by the exact code the browser runs. If someone changes the projection
// or the mapper, this follows automatically.
//
// This file is both a module and a CLI. build.js is synchronous top to bottom and the
// injection has to happen before the main script is compiled out to app.js, so rather
// than make the whole build async it shells out to `node tools/sanity-snapshot.js`
// and reads JSON back. Running it directly prints the snapshot, which is also the
// easiest way to see what a deploy would bake in.

const fs = require('fs');
const { execFileSync } = require('child_process');

const TIMEOUT_MS = 15000;

function span(src, name) {
  const open = `// >>> ${name}\n`;
  const close = `// <<< ${name}`;
  const a = src.indexOf(open);
  if (a < 0) throw new Error(`marker "// >>> ${name}" not found`);
  const b = src.indexOf(close, a);
  if (b < 0) throw new Error(`marker "// <<< ${name}" not found after its opener`);
  return { body: src.slice(a + open.length, b), start: a + open.length, end: b };
}

// Everything between the markers is plain, self-contained JS - no JSX, no React, no
// browser globals - so it runs as-is under Node.
function loadShared(html) {
  const src = span(html, 'SANITY-SHARED').body;
  const exported = 'sanityUrl, Q_PROJECTS, Q_TOOLS, mapSanityProjects, mapSanityTools';
  try {
    return new Function(`${src}\nreturn { ${exported} };`)();
  } catch (e) {
    throw new Error(`SANITY-SHARED did not evaluate: ${e.message}`);
  }
}

async function query(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  return (j && j.result) || null;
}

// Each half is fetched independently: one endpoint failing should not cost the other
// its refresh. An empty result counts as a failure rather than as "no content" - a
// broken projection returning [] would otherwise ship a site with no projects at all.
async function fetchSnapshot(html) {
  const shared = loadShared(html);
  const [pr, tr] = await Promise.all([
    query(shared.sanityUrl(shared.Q_PROJECTS)).catch(e => { console.error(`  projects: ${e.message}`); return null; }),
    query(shared.sanityUrl(shared.Q_TOOLS)).catch(e => { console.error(`  tools: ${e.message}`); return null; }),
  ]);
  const out = {};
  const ps = pr ? shared.mapSanityProjects(pr) : [];
  const ts = tr ? shared.mapSanityTools(tr) : [];
  if (ps.length) out.projects = ps;
  if (ts.length) out.tools = ts;
  return out;
}

function replaceSpan(html, name, decl, value) {
  const s = span(html, name);
  return html.slice(0, s.start) + `${decl} = ${JSON.stringify(value, null, 2)};\n` + html.slice(s.end);
}

// Synchronous entry point for build.js. Never throws: a CMS being unreachable must
// not fail a deploy, it just means shipping the arrays already in the file.
function apply(html) {
  let snap;
  try {
    const raw = execFileSync(process.execPath, [__filename], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], timeout: TIMEOUT_MS * 3,
    });
    snap = JSON.parse(raw);
  } catch (e) {
    console.log(`Sanity snapshot unavailable (${e.message.split('\n')[0]}) - shipping the arrays as they are in index.html`);
    return html;
  }

  let out = html, done = [];
  try {
    if (snap.projects) { out = replaceSpan(out, 'PROJECTS-FALLBACK', 'const PROJECTS', snap.projects); done.push(`${snap.projects.length} projects`); }
    if (snap.tools) { out = replaceSpan(out, 'TOOLS-FALLBACK', 'const TOOL_CATEGORIES', snap.tools); done.push(`${snap.tools.reduce((n, c) => n + c.tools.length, 0)} tools`); }
  } catch (e) {
    console.log(`Sanity snapshot not injected: ${e.message}`);
    return html;
  }

  if (done.length === 2) console.log(`Sanity snapshot: ${done.join(', ')}`);
  else if (done.length) console.log(`Sanity snapshot: ${done.join(', ')} (the rest kept the copy in index.html)`);
  else console.log('Sanity snapshot empty - shipping the arrays as they are in index.html');
  return out;
}

module.exports = { apply, span, loadShared, fetchSnapshot };

if (require.main === module) {
  const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf-8').replace(/\r\n/g, '\n');
  fetchSnapshot(html)
    .then(s => process.stdout.write(JSON.stringify(s)))
    .catch(e => { console.error(e.message); process.stdout.write('{}'); });
}
