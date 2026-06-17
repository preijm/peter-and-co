const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const babelConfig = {
  presets: [
    ['@babel/preset-react', { runtime: 'classic' }],
    ['@babel/preset-env', {
      targets: { chrome: '90', firefox: '88', safari: '14', edge: '90' },
      modules: false,
      bugfixes: true,
    }],
  ],
};

fs.mkdirSync('dist', { recursive: true });

let html = fs.readFileSync('index.html', 'utf-8').replace(/\r\n/g, '\n');

// ── Content injection: content/*.csv is the source of truth ────────────────
// Parse the CSVs and regenerate the PROJECTS / TOOL_CATEGORIES arrays between the
// /* CONTENT:*:START */ … /* CONTENT:*:END */ markers in index.html before compiling.
// (The inline literals in index.html are only the dev/preview snapshot.)
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', i = 0, q = false;
  const endField = () => { row.push(field); field = ''; };
  const endRow = () => { endField(); rows.push(row); row = []; };
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // strip UTF-8 BOM (Excel adds it)
  text = text.replace(/\r\n/g, '\n');
  while (i < text.length) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { q = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { q = true; i++; continue; }
    if (c === ',') { endField(); i++; continue; }
    if (c === '\n') { endRow(); i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) endRow();
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(r => r.some(c => c.trim() !== ''))
    .map(r => { const o = {}; headers.forEach((h, idx) => (o[h] = (r[idx] || '').trim())); return o; });
}
const csvList = s => (s || '').split(/[,;|]/).map(x => x.trim()).filter(Boolean);
const csvBool = s => /^(true|yes|1|x)$/i.test((s || '').trim());

function mapProjects(rows) {
  return rows.filter(r => r.id || r.title).map(r => {
    const p = {
      id: r.id || (r.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      title: r.title, description: r.description, tagline: r.tagline, detail: r.detail,
      tags: csvList(r.tags), year: r.year, url: r.url, role: r.role,
      stack: csvList(r.stack), tools: csvList(r.tools),
      featured: csvBool(r.featured),
      accent: { default: r.accent_default || '#818cf8', 'mondriaan-v1': r.accent_mondriaan || r.accent_default || '#d72027' },
    };
    if (r.href) p.href = r.href;
    if (r.screenshot) p.screenshot = r.screenshot;
    if ((r.public || '').trim() !== '' && !csvBool(r.public)) p.public = false;
    return p;
  });
}
function mapTools(rows) {
  const order = ['build', 'infrastructure', 'daily'], byCat = {};
  rows.filter(r => r.name).forEach(r => {
    const cat = (r.category || 'build').toLowerCase().trim();
    (byCat[cat] = byCat[cat] || []).push({
      name: r.name, desc: r.desc,
      ...(/retired/i.test(r.status || '') ? { status: 'retired' } : {}),
    });
  });
  const cats = order.filter(c => byCat[c]).map(c => ({ label: c, tools: byCat[c] }));
  Object.keys(byCat).forEach(c => { if (!order.includes(c)) cats.push({ label: c, tools: byCat[c] }); });
  return cats;
}
function injectContent(name, decl, file, mapper) {
  if (!fs.existsSync(file)) { console.log(`No ${file}; keeping inline ${name}.`); return; }
  const data = mapper(parseCsv(fs.readFileSync(file, 'utf-8')));
  if (!data.length) { console.log(`${file} empty; keeping inline ${name}.`); return; }
  const block = `/* CONTENT:${name}:START */\n${decl} = ${JSON.stringify(data, null, 2)};\n/* CONTENT:${name}:END */`;
  const re = new RegExp(`/\\* CONTENT:${name}:START \\*/[\\s\\S]*?/\\* CONTENT:${name}:END \\*/`);
  if (!re.test(html)) { console.warn(`Markers for ${name} not found; skipping.`); return; }
  html = html.replace(re, () => block);
  console.log(`Injected ${name} from ${file} (${data.length} entries).`);
}
injectContent('PROJECTS', 'const PROJECTS', 'content/projects.csv', mapProjects);
injectContent('TOOLS', 'const TOOL_CATEGORIES', 'content/tools.csv', mapTools);

// 0. Update lazy loader before compilation: skip Babel.transform since code is pre-compiled
html = html.replace(
  `    const src = document.getElementById(theme.srcId).textContent;\n    const compiled = Babel.transform(src, { presets: ['react'] }).code;`,
  `    const compiled = document.getElementById(theme.srcId).textContent;`
);

// 1. Compile main text/babel script → external app.js with defer
html = html.replace(
  /<script type="text\/babel">([\s\S]*?)<\/script>/,
  (_, src) => {
    console.log('Compiling main script…');
    const { code } = babel.transformSync(src.trim(), babelConfig);
    fs.writeFileSync('dist/app.js', code);
    return `<script src="app.js" defer></script>`;
  }
);

// 2. Pre-compile lazy-load theme blobs (stay as text/plain, but no JSX)
html = html.replace(
  /(<script type="text\/plain" id="([\w-]+-src)">)([\s\S]*?)(<\/script>)/g,
  (_, open, id, src, close) => {
    console.log(`Compiling ${id} blob…`);
    const { code } = babel.transformSync(src.trim(), babelConfig);
    return `${open}\n${code}\n${close}`;
  }
);

// 3. Remove Babel CDN script (no longer needed)
html = html.replace(
  /<script src="https:\/\/unpkg\.com\/@babel\/standalone[^"]*"[^>]*><\/script>\n?/,
  ''
);


// Write output
fs.writeFileSync('dist/index.html', html);
console.log('Written dist/index.html');

// Copy static assets
const staticFiles = [
  'CNAME', 'robots.txt', 'sitemap.xml',
  'social-card.png',
  ...fs.readdirSync('.').filter(f => f.startsWith('google') && f.endsWith('.html')),
];
for (const f of staticFiles) {
  if (fs.existsSync(f)) {
    fs.copyFileSync(f, path.join('dist', f));
    console.log(`Copied ${f}`);
  }
}

// Copy themes/ recursively
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}
if (fs.existsSync('themes')) {
  copyDir('themes', 'dist/themes');
  console.log('Copied themes/');
}
if (fs.existsSync('screenshots')) {
  copyDir('screenshots', 'dist/screenshots');
  console.log('Copied screenshots/');
}
if (fs.existsSync('assets')) {
  copyDir('assets', 'dist/assets');
  console.log('Copied assets/');
}

console.log('Build complete.');
