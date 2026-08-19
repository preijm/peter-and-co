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
  // Generated locally by `npm run footprint` — CI can't see the session logs,
  // so this is committed and copied through as-is.
  'footprint.json',
  ...fs.readdirSync('.').filter(f => f.startsWith('google') && f.endsWith('.html')),
];
for (const f of staticFiles) {
  if (fs.existsSync(f)) {
    if (f === 'sitemap.xml') {
      // Stamp lastmod with today's date so it never goes stale between deploys
      const today = new Date().toISOString().slice(0, 10);
      const sitemap = fs.readFileSync(f, 'utf-8').replace(/<lastmod>[\d-]+<\/lastmod>/g, `<lastmod>${today}</lastmod>`);
      fs.writeFileSync(path.join('dist', f), sitemap);
    } else {
      fs.copyFileSync(f, path.join('dist', f));
    }
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

console.log('Build complete.');
