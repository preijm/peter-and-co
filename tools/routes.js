// One static page per route, so every view on the site has a URL that loads on its own
// and previews as itself when shared. The app routes on location.pathname (parseRoute in
// index.html); these pages only exist so GitHub Pages has a file to serve at that path,
// and so each one carries its own <title>, canonical and og:/twitter: tags. The body is
// the same app as the home page.
//
//   /work/<id>   dist/work/<id>.html   GitHub Pages serves foo.html at /foo
//   /work        dist/work.html and dist/work/index.html (whichever the host picks)
//   /tools …     dist/tools.html, about.html, contact.html
//   anything else dist/404.html — the app again, which sends unknown paths home and
//                still opens a project published in Sanity since the last deploy.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SITE = 'https://peterandco.nl';
const CARD = `${SITE}/social-card.png`;

const PAGES = {
  work:    { title: 'Work · Peter & Co.',    description: 'Things I built and shipped: finance, food, websites, and whatever else would not leave me alone.' },
  tools:   { title: 'Tools · Peter & Co.',   description: 'The kit I build with: AI, infrastructure and the daily tools behind every project on Peter & Co.' },
  about:   { title: 'About · Peter & Co.',   description: 'Peter Reijm: product owner, builder, explorer. Based in Rotterdam.' },
  contact: { title: 'Contact · Peter & Co.', description: 'Got a problem worth building? Get in touch with Peter Reijm.' },
};

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The PROJECTS array as baked into the page (by sanity.apply, or as committed).
function readProjects(html, span) {
  const body = span(html, 'PROJECTS-FALLBACK').body;
  return vm.runInNewContext(body + '\n;PROJECTS', {}, { timeout: 1000 });
}

// A fixed 1200x630 JPEG crop of the Sanity screenshot. JPEG rather than auto=format:
// several link unfurlers do not render AVIF or WebP.
function ogImage(p) {
  if (!p.screenshot || !/cdn\.sanity\.io/.test(p.screenshot)) return { url: CARD, w: 1200, h: 630 };
  const sep = p.screenshot.includes('?') ? '&' : '?';
  return { url: `${p.screenshot}${sep}w=1200&h=630&fit=crop&crop=top&fm=jpg&q=80`, w: 1200, h: 630 };
}

function setHead(html, { title, description, url, image }) {
  const t = esc(title), d = esc(description), u = esc(url);
  const swap = (re, to) => {
    if (!re.test(html)) throw new Error(`routes: head tag not found: ${re}`);
    html = html.replace(re, to);
  };
  swap(/<title>[^<]*<\/title>/, `<title>${t}</title>`);
  swap(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${d}">`);
  swap(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${u}">`);
  swap(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${t}">`);
  swap(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${d}">`);
  swap(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${t}">`);
  swap(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${d}">`);
  swap(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${u}">`);
  if (image) {
    const i = esc(image.url);
    swap(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${i}">`);
    swap(/<meta property="og:image:width" content="[^"]*">/, `<meta property="og:image:width" content="${image.w}">`);
    swap(/<meta property="og:image:height" content="[^"]*">/, `<meta property="og:image:height" content="${image.h}">`);
    swap(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${i}">`);
  }
  return html;
}

// Returns the URLs written, for the sitemap.
function write(html, projects, outDir) {
  const out = (rel, page) => {
    const f = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, page);
  };
  // Clear the old project pages first: dist/ is not wiped between local builds, and a
  // project renamed in Sanity would otherwise keep a stale page under its old slug.
  fs.rmSync(path.join(outDir, 'work'), { recursive: true, force: true });

  const urls = [];
  for (const [id, meta] of Object.entries(PAGES)) {
    const url = `${SITE}/${id}`;
    const page = setHead(html, { ...meta, url });
    out(`${id}.html`, page);
    if (id === 'work') out('work/index.html', page);
    urls.push({ url, live: true });
  }
  for (const p of projects) {
    if (!p || !p.id || !/^[a-z0-9][a-z0-9-]*$/.test(p.id)) {
      console.log(`  skipped a project without a usable id: ${p && (p.id || p.title)}`);
      continue;
    }
    const url = `${SITE}/work/${p.id}`;
    out(`work/${p.id}.html`, setHead(html, {
      title: `${p.title} · Peter & Co.`,
      // The one-line description says what the thing is; the tagline is a slogan
      // ("Coded from the couch.") that tells a stranger nothing on its own.
      description: p.description || p.tagline || PAGES.work.description,
      url,
      image: ogImage(p),
    }));
    urls.push({ url, live: p.public !== false });
  }
  out('404.html', html.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n<meta name="robots" content="noindex">'));
  return urls;
}

module.exports = { readProjects, write, setHead };
