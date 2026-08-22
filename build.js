const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const footage = require('./tools/footage/manifest');

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

// Regenerate the footage listing from the folder so a stale committed manifest
// can never ship — the Reel edition reads this to find its photographs.
const shots = footage.write();
console.log("Footage manifest: " + Object.keys(shots).length + " photograph(s)");

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

// 2b. Stamp the Reel hero preload with the file the manifest actually names, so the
// <head> can start the LCP image during parse without hardcoding a filename that
// could drift out of the folder.
html = html.replace(
  /var HERO = '[^']*'; \/\* build:hero \*\//,
  `var HERO = '${shots.hero || ''}'; /* build:hero */`
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
// Copy only the photographs the manifest actually names, plus the manifest itself.
// The folder is a working directory: it holds HEIC originals no browser renders
// (1.7 MB), the colour masters the WebP encodes replaced, and the shooting guide.
// Nothing on the page can ever request those, and copying them wholesale doubled the
// deploy payload and published footage/README.md at the site root.
if (fs.existsSync('footage')) {
  // Cleared first: dist/ is not wiped between local builds, so a photograph that was
  // renamed or re-encoded would otherwise linger in the output forever.
  fs.rmSync('dist/footage', { recursive: true, force: true });
  fs.mkdirSync('dist/footage', { recursive: true });
  // credits.json rides along with the manifest: the page fetches it at runtime, so
  // leaving it behind means the photographers silently lose their credit in production
  // while it still renders locally.
  for (const file of [...new Set(Object.values(shots)), 'manifest.json', 'credits.json']) {
    if (fs.existsSync(path.join('footage', file))) {
      fs.copyFileSync(path.join('footage', file), path.join('dist/footage', file));
    }
  }
  console.log(`Copied footage/ (${Object.keys(shots).length} photograph(s))`);
}

console.log('Build complete.');
