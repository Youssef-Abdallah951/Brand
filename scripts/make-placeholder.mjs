/* Generates the branded fallback image (used whenever a product lacks a
 * photo). Warm sand background, JiA wordmark, soft silk-drape motif.
 * Usage: node scripts/make-placeholder.mjs
 */
import sharp from "sharp";
import path from "node:path";
import { mkdirSync } from "node:fs";

const OUT = path.join(process.cwd(), "public", "images");
mkdirSync(OUT, { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#faf7f2"/>
      <stop offset="1" stop-color="#f0e9df"/>
    </linearGradient>
    <linearGradient id="silk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e0d3bd"/>
      <stop offset="0.5" stop-color="#c9a06a"/>
      <stop offset="1" stop-color="#7d6239"/>
    </linearGradient>
  </defs>
  <rect width="800" height="1000" fill="url(#bg)"/>
  <g opacity="0.55" fill="none" stroke="url(#silk)" stroke-width="26" stroke-linecap="round">
    <path d="M 240 210 C 420 260, 300 420, 430 500 C 560 580, 420 720, 260 760"/>
    <path d="M 320 190 C 500 260, 380 430, 510 510 C 640 590, 500 740, 340 780" opacity="0.5"/>
  </g>
  <circle cx="530" cy="810" r="10" fill="#9a7b4f" opacity="0.6"/>
  <circle cx="270" cy="830" r="6" fill="#9a7b4f" opacity="0.4"/>
  <text x="400" y="900" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="64" letter-spacing="14" fill="#7d6239">JiA</text>
  <text x="400" y="950" text-anchor="middle" font-family="Georgia, serif" font-size="22" letter-spacing="6" fill="#9a7b4f">SILK</text>
</svg>`;

await sharp(Buffer.from(svg)).webp({ quality: 80 }).toFile(path.join(OUT, "placeholder.webp"));
await sharp(Buffer.from(svg)).jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(OUT, "placeholder.jpg"));
console.log("placeholder done");
