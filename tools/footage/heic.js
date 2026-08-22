// Converts any HEIC dropped into footage/ into a web-ready JPEG.
//
// Phones shoot HEIC and no browser renders it, so the manifest ignores that
// extension entirely — without this step a HEIC in footage/ would silently do
// nothing. Decoding uses Windows' own HEIF codec (see heic-convert.ps1) rather than
// an npm image library, keeping the project's dependency list at "Babel only".
//
// Runs ahead of the manifest in `npm run footage`. On anything other than Windows it
// no-ops, so the Linux CI build is unaffected — the converted JPEGs are committed.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIR = 'footage';
const SCRIPT = path.join(__dirname, 'heic-convert.ps1');

function convert(dir = DIR) {
  if (!fs.existsSync(dir)) return { converted: 0, skipped: true };

  const heics = fs.readdirSync(dir).filter(f => /\.hei[cf]$/i.test(f));
  if (heics.length === 0) return { converted: 0 };

  if (process.platform !== 'win32') {
    console.log(`Footage: ${heics.length} HEIC file(s) found but conversion needs Windows — skipping.`);
    console.log('         Convert them to .jpg and commit the result.');
    return { converted: 0, skipped: true };
  }

  const res = spawnSync('powershell', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', SCRIPT, '-Dir', path.resolve(dir),
  ], { encoding: 'utf-8' });

  if (res.error) {
    console.log('Footage: could not run the HEIC converter — ' + res.error.message);
    return { converted: 0, skipped: true };
  }

  let converted = 0, failed = 0;
  for (const line of (res.stdout || '').split('\n').map(l => l.trim()).filter(Boolean)) {
    if (line === 'NONE') continue;
    if (line.startsWith('OK')) { converted++; console.log('  ' + line); }
    else if (line.startsWith('FAIL')) { failed++; console.log('  ' + line); }
    // FRESH lines are the common case on a re-run; too noisy to print.
  }
  if (converted || failed) {
    console.log(`Footage: converted ${converted} HEIC file(s)${failed ? `, ${failed} failed` : ''}.`);
  }
  return { converted, failed };
}

module.exports = { convert };

if (require.main === module) convert();
