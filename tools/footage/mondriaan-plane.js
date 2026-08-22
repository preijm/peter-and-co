// Generates footage/peter-and-co.png — the backdrop for this site's own plane in the
// Reel edition.
//
// The project *is* the theme switcher, so its plane shows another edition. A
// screenshot of Mondriaan would work badly: its top-left is the white hero panel, and
// the Reel title sits there in white. Composing the grid directly solves that — the
// top-left block is black by construction — and avoids dragging legible UI text into
// a title card.
//
// Two things drive the layout:
//   1. Reel desaturates everything. Red (#d72027) and blue (#1d4ed8) land 7 greys
//      apart out of 255, so they merge into one tone — they are placed far apart,
//      never sharing an edge, or the composition would read as one grey blob.
//   2. Yellow (196) and white (255) carry the light end, black (10) the dark end.
//      That is the real four-tone structure once the colour is gone.
//
// Flat colour compresses to almost nothing as PNG, so there is no JPEG step and no
// image library — zlib ships with Node. Run: node tools/footage/mondriaan-plane.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Straight from the Mondriaan theme (see CLAUDE.md).
const BLACK = [10, 10, 10];
const RED = [215, 32, 39];
const BLUE = [29, 78, 216];
const YELLOW = [252, 198, 11];
const WHITE = [255, 255, 255];

// 4:3, not 16:9. A plane is whatever shape the browser window is — typically nearer
// 5:4 on a laptop — and object-fit: cover discards the mismatch. A 16:9 source loses
// about 43% of its width on a 1439x1158 window, which cropped this composition to its
// middle and cut the outer blocks off entirely.
const W = 2000, H = 1500;
const LINE = Math.round(6 * (W / 1400));     // M_LINE scaled from the site's content width

// Composed the way Mondriaan actually composed, not as an even grid:
//   - Black and white share the frame roughly evenly. A white-dominant grid measured
//     120 on screen against 27-86 for the photographs either side of it and flared in
//     the sequence; an all-black ground fixed that but swallowed the lines, since a
//     black block on a black ground has no edge. Half and half keeps every line
//     visible and lands the plane mid-range.
//   - The grid lines are still the ground showing through between blocks; here the
//     ground and the dominant field happen to be the same colour.
//   - Cell sizes vary wildly — one dominant light field, several small ones clustered
//     toward an edge — and the grid is deliberately irregular.
//
// The title's block is black, so its corner needs no help from the falloff. Red and
// blue sit as far apart as the frame allows — bottom-left and mid-right — because they
// land 7 greys apart once desaturated and would read as one blob if they touched.
const BLOCKS = [
  { x: [0, 0.38], y: [0, 0.52], c: BLACK },      // the title's ground
  { x: [0.38, 0.90], y: [0, 0.30], c: WHITE },
  { x: [0.90, 1], y: [0, 0.30], c: YELLOW },     // thin accent running off the edge
  { x: [0.38, 0.62], y: [0.30, 0.52], c: WHITE },
  { x: [0.62, 1], y: [0.30, 0.52], c: BLACK },
  { x: [0, 0.20], y: [0.52, 1], c: WHITE },
  { x: [0.20, 0.38], y: [0.52, 0.74], c: BLUE },
  { x: [0.20, 0.38], y: [0.74, 1], c: BLACK },
  { x: [0.38, 0.78], y: [0.52, 1], c: WHITE },
  { x: [0.78, 0.90], y: [0.52, 0.74], c: RED },
  { x: [0.90, 1], y: [0.52, 0.74], c: BLACK },
  { x: [0.78, 1], y: [0.74, 1], c: BLACK },
];

// Black ground: every gap between blocks becomes a grid line for free.
const px = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) { px[i * 3] = BLACK[0]; px[i * 3 + 1] = BLACK[1]; px[i * 3 + 2] = BLACK[2]; }

const half = Math.round(LINE / 2);
for (const b of BLOCKS) {
  // Inset each edge by half a line, except at the canvas border where it would
  // leave a stray frame.
  const x0 = Math.round(b.x[0] * W) + (b.x[0] === 0 ? 0 : half);
  const x1 = Math.round(b.x[1] * W) - (b.x[1] === 1 ? 0 : half);
  const y0 = Math.round(b.y[0] * H) + (b.y[0] === 0 ? 0 : half);
  const y1 = Math.round(b.y[1] * H) - (b.y[1] === 1 ? 0 : half);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const o = (y * W + x) * 3;
      px[o] = b.c[0]; px[o + 1] = b.c[1]; px[o + 2] = b.c[2];
    }
  }
}

// ── Minimal PNG encoder (RGB8, filter 0) ──
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0;
  px.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
}
const crcTable = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, c]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.join('footage', 'peter-and-co.png');
fs.mkdirSync('footage', { recursive: true });
fs.writeFileSync(out, png);
console.log(`${out} — ${W}x${H}, ${Math.round(png.length / 1024)}KB`);
