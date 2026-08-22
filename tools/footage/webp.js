// Re-encodes the photographs in footage/ as grayscale WebP.
//
// Every plane renders its photograph through `filter: grayscale(1)` — the Reel
// palette is achromatic and a colour cast would break it — so a colour JPEG makes
// the browser decode two chroma planes it is about to throw away. Encoding the
// chroma out at rest costs nothing visually and roughly halves the bytes
// (hero: 603 KB JPEG → 350 KB WebP; the LCP element of the edition).
//
// The original stays put. It is the colour master, the manifest prefers the WebP
// over it (see manifest.js), and build.js only ships what the manifest names — so
// keeping it costs nothing at the edge and means a colour edition is still possible.
//
// Dimensions are untouched: downscaling to 1600px saves another ~200 KB but drops
// the hero to 27.8 dB PSNR against its own grayscale original, and Ken Burns already
// pushes the photograph to 1.06x, so a 1920px window displays it at up to 2035 CSS px.
//
// Needs ffmpeg on PATH. Without it this no-ops with a note — the encoded files are
// committed, so CI and non-Windows machines are unaffected, exactly like heic.js.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIR = 'footage';
const SOURCES = /\.(jpe?g|png)$/i;
const QUALITY = 60;

function haveFfmpeg() {
  const res = spawnSync('ffmpeg', ['-version'], { encoding: 'utf-8' });
  return !res.error && res.status === 0;
}

function convert(dir = DIR) {
  if (!fs.existsSync(dir)) return { converted: 0, skipped: true };

  const sources = fs.readdirSync(dir).filter(f => SOURCES.test(f));
  const stale = sources.filter(f => {
    const out = path.join(dir, path.basename(f, path.extname(f)) + '.webp');
    if (!fs.existsSync(out)) return true;
    return fs.statSync(out).mtimeMs < fs.statSync(path.join(dir, f)).mtimeMs;
  });
  if (stale.length === 0) return { converted: 0 };

  if (!haveFfmpeg()) {
    console.log(`Footage: ${stale.length} photograph(s) have no WebP and ffmpeg is not on PATH — skipping.`);
    console.log('         Install ffmpeg, or commit the .webp files from a machine that has it.');
    return { converted: 0, skipped: true };
  }

  let converted = 0, failed = 0;
  for (const file of stale) {
    const src = path.join(dir, file);
    const out = path.join(dir, path.basename(file, path.extname(file)) + '.webp');
    const res = spawnSync('ffmpeg', [
      '-y', '-loglevel', 'error', '-i', src,
      '-vf', 'format=gray',
      '-c:v', 'libwebp', '-compression_level', '6', '-quality', String(QUALITY),
      out,
    ], { encoding: 'utf-8' });

    if (res.status !== 0 || !fs.existsSync(out)) {
      failed++;
      console.log(`  FAIL ${file} — ${(res.stderr || res.error && res.error.message || '').trim().split('\n')[0]}`);
      continue;
    }
    // A WebP that came out bigger than its source is not worth shipping; the
    // manifest would prefer it and the page would get slower.
    if (fs.statSync(out).size >= fs.statSync(src).size) {
      fs.unlinkSync(out);
      console.log(`  SKIP ${file} — WebP came out larger, keeping the original`);
      continue;
    }
    converted++;
    const before = fs.statSync(src).size, after = fs.statSync(out).size;
    console.log(`  OK   ${file} → ${path.basename(out)} (${Math.round(before / 1024)} KB → ${Math.round(after / 1024)} KB)`);
  }
  if (converted || failed) {
    console.log(`Footage: encoded ${converted} grayscale WebP${failed ? `, ${failed} failed` : ''}.`);
  }
  return { converted, failed };
}

module.exports = { convert };

if (require.main === module) convert();
