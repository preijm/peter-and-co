// Builds footage/manifest.json from whatever is sitting in footage/.
//
// The Reel edition fetches this at load. A static host has no directory listing, so
// the site can't discover the folder's contents on its own — this is that listing.
// The point is that a photograph only ever has to be dropped into footage/: its
// filename (minus extension) is its slot, and nothing in index.html names it.
//
//   footage/hero.jpg          → the hero plane
//   footage/statement.jpg     → the second statement plane
//   footage/milk-me-not.jpg   → that project's plane (filename must match the id)
//
// Run directly (`npm run footage`) or via build.js, which regenerates it in CI so a
// committed-but-stale manifest can never ship.
const fs = require('fs');
const path = require('path');

const DIR = 'footage';
// Best format first. A slot may hold several encodings of the same photograph —
// tools/footage/webp.js writes a grayscale WebP next to the colour master and both
// answer to the same slot name — so the order here decides which one the page gets.
// build.js ships only the files this manifest names, so the loser never leaves the
// repo. HEIC is absent on purpose: no browser renders it.
const EXTS = ['.avif', '.webp', '.jpg', '.jpeg', '.png'];

function build(dir = DIR) {
  const out = {};
  const rank = {};
  if (!fs.existsSync(dir)) return out;
  for (const file of fs.readdirSync(dir).sort()) {
    const ext = path.extname(file).toLowerCase();
    const r = EXTS.indexOf(ext);
    if (r < 0) continue;
    const slot = path.basename(file, ext);
    if (slot in out && rank[slot] <= r) continue;
    out[slot] = file;
    rank[slot] = r;
  }
  return out;
}

function write(dir = DIR) {
  const map = build(dir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(map, null, 2) + '\n');
  return map;
}

module.exports = { build, write };

// A slot whose winner is still a raw master means no encoded sibling was produced —
// usually ffmpeg missing. Those extensions are gitignored, so the manifest would name a
// file that never reaches the repo and the plane would quietly fall back to its
// generated field on the deployed site. Worth shouting about.
const UNENCODED = /\.(jpe?g|png)$/i;
function unencoded(map) {
  return Object.entries(map).filter(([, file]) => UNENCODED.test(file)).map(([slot, file]) => slot + ' -> ' + file);
}

module.exports.unencoded = unencoded;

if (require.main === module) {
  const map = write();
  const names = Object.keys(map);
  console.log(`footage/manifest.json — ${names.length} photograph(s)${names.length ? ': ' + names.join(', ') : ' (planes fall back to generated fields)'}`);
  const raw = unencoded(map);
  if (raw.length) {
    console.warn('');
    console.warn('  WARNING: ' + raw.length + ' slot(s) still point at an un-encoded master:');
    raw.forEach(r => console.warn('    ' + r));
    console.warn('  Those extensions are gitignored, so they will not be committed and the');
    console.warn('  plane will fall back to its generated field once deployed.');
    console.warn('  Install ffmpeg and re-run, or commit the file explicitly with git add -f.');
    console.warn('');
  }
}
