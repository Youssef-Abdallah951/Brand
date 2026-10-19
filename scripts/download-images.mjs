/* Downloads verified Pexels photos (free commercial license) and converts them
 * to WebP + JPG fallback under public/images/. Sizes: products 800x1000
 * (4:5), hero 1800x1013. Branded placeholder generated locally (no photo).
 * Usage: node scripts/download-images.mjs
 */
import { createWriteStream, existsSync, mkdirSync, statSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import path from "node:path";
import sharp from "sharp";

const OUT = path.join(process.cwd(), "public", "images");
mkdirSync(OUT, { recursive: true });

// id = Pexels photo id (verified: description says hijab / modest fashion /
// fabric / gift). file = output base name.
const PLAN = [
  // hero
  { id: 14355034, file: "hero", w: 1800, h: 1013, maxKB: 300 },
  // product mains + hovers
  { id: 6071508, file: "p-h1-main", w: 800, h: 1000, maxKB: 150 },
  { id: 14935628, file: "p-h1-hover", w: 800, h: 1000, maxKB: 150 },
  { id: 36441448, file: "p-h2-main", w: 800, h: 1000, maxKB: 150 },
  { id: 6461393, file: "p-h2-hover", w: 800, h: 1000, maxKB: 150 },
  { id: 18946070, file: "p-h3-main", w: 800, h: 1000, maxKB: 150 },
  { id: 35009418, file: "p-h3-hover", w: 800, h: 1000, maxKB: 150 },
  { id: 14512379, file: "p-h4-main", w: 800, h: 1000, maxKB: 150 },
  { id: 6766360, file: "p-h4-hover", w: 800, h: 1000, maxKB: 150 },
  { id: 8937937, file: "p-h5-main", w: 800, h: 1000, maxKB: 150 },
  { id: 35009336, file: "p-h5-hover", w: 800, h: 1000, maxKB: 150 },
  { id: 3037589, file: "p-h6-main", w: 800, h: 1000, maxKB: 150 },
  { id: 15305989, file: "p-h6-hover", w: 800, h: 1000, maxKB: 150 },
  { id: 19985542, file: "p-h7-main", w: 800, h: 1000, maxKB: 150 },
  { id: 7946638, file: "p-h7-hover", w: 800, h: 1000, maxKB: 150 },
  { id: 6530831, file: "p-h8-main", w: 800, h: 1000, maxKB: 150 },
  { id: 5648264, file: "p-h8-hover", w: 800, h: 1000, maxKB: 150 },
  { id: 33726113, file: "p-h9-main", w: 800, h: 1000, maxKB: 150 },
  { id: 7396145, file: "p-h9-hover", w: 800, h: 1000, maxKB: 150 },
  { id: 7816728, file: "p-h10-main", w: 800, h: 1000, maxKB: 150 },
  { id: 36501061, file: "p-h10-hover", w: 800, h: 1000, maxKB: 150 },
  { id: 10984343, file: "p-h11-main", w: 800, h: 1000, maxKB: 150 },
  { id: 35009415, file: "p-h11-hover", w: 800, h: 1000, maxKB: 150 },
  { id: 6594240, file: "p-h12-main", w: 800, h: 1000, maxKB: 150 },
  { id: 7256915, file: "p-h12-hover", w: 800, h: 1000, maxKB: 150 },
  { id: 7256915, file: "p-h13-main", w: 800, h: 1000, maxKB: 150 },
  { id: 6461523, file: "p-h13-hover", w: 800, h: 1000, maxKB: 150 },
  { id: 7998237, file: "p-h14-main", w: 800, h: 1000, maxKB: 150 },
  { id: 6461393, file: "p-h14-hover", w: 800, h: 1000, maxKB: 150 },
  { id: 5705991, file: "p-h15-main", w: 800, h: 1000, maxKB: 150 },
  { id: 793517, file: "p-h15-hover", w: 800, h: 1000, maxKB: 150 },
  { id: 5872188, file: "p-h16-main", w: 800, h: 1000, maxKB: 150 },
  { id: 34972172, file: "p-h16-hover", w: 800, h: 1000, maxKB: 150 },
];

const qualityFor = (bytes, maxKB, q) =>
  bytes <= maxKB * 1024 ? q : Math.max(40, q - 8);

async function download(id, dest) {
  const url = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1400`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for photo ${id}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function convert(file, w, h, maxKB) {
  const raw = path.join(OUT, `${file}-raw.jpg`);
  const src = sharp(raw).resize(w, h, { fit: "cover", position: "attention" });
  let q = 74;
  let buf = await src.clone().webp({ quality: q }).toBuffer();
  while (buf.length > maxKB * 1024 && q > 40) {
    q = qualityFor(buf.length, maxKB, q);
    if (q <= 40) break;
    buf = await src.clone().webp({ quality: q }).toBuffer();
  }
  await src.clone().webp({ quality: q }).toFile(path.join(OUT, `${file}.webp`));
  await src.clone().jpeg({ quality: Math.min(80, q + 8), mozjpeg: true }).toFile(path.join(OUT, `${file}.jpg`));
  return { webp: buf.length, q };
}

const results = [];
for (const { id, file, w, h, maxKB } of PLAN) {
  if (existsSync(path.join(OUT, `${file}.webp`))) {
    results.push({ file, cached: true });
    continue;
  }
  try {
    await download(id, path.join(OUT, `${file}-raw.jpg`));
    const { webp, q } = await convert(file, w, h, maxKB);
    const rawKB = Math.round(statSync(path.join(OUT, `${file}-raw.jpg`)).size / 1024);
    results.push({ file, id, webpKB: Math.round(webp / 1024), rawKB, q });
  } catch (err) {
    results.push({ file, id, error: String(err) });
  }
}
// remove raw intermediates
for (const { file } of PLAN) {
  try { await import("node:fs").then((f) => f.rmSync(path.join(OUT, `${file}-raw.jpg`), { force: true })); } catch { /* noop */ }
}
console.table(results.map(({ file, id, webpKB, q, error, cached }) => ({ file, id, webpKB, q, cached: cached ?? false, error: error ?? "" })));
