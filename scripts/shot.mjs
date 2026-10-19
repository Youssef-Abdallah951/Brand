/* Responsive audit screenshots: system Edge (Chromium) via Playwright.
 * Usage: node scripts/shot.mjs [prefix]  → .shots/<prefix>-<route>-<w>.png
 * Requires a dev server on http://localhost:5199
 */
import { mkdirSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PREFIX = process.argv[2] ?? "v";
const BASE = "http://localhost:5199";
const SIZES = [320, 360, 390, 430, 768, 1024, 1280, 1536];
const ROUTES = [
  ["/", "home"],
  ["/shop", "shop"],
  ["/product/classic-chiffon-hijab", "pdp"],
  ["/cart", "cart"],
  ["/checkout", "checkout"],
];
const OUT = path.join(process.cwd(), ".shots");
mkdirSync(OUT, { recursive: true });

// clear previous set
for (const f of readdirSync(OUT)) if (f.startsWith(PREFIX + "-")) unlinkSync(path.join(OUT, f));

const browser = await chromium.launch({ channel: "msedge" });
let horizontalOverflow = {};
for (const [route, label] of ROUTES) {
  for (const w of SIZES) {
    const h = w < 768 ? 900 : Math.min(1400, Math.round(w * 0.75));
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1024 });
    const page = await ctx.newPage();
    try {
      await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(() => {
        const d = document.documentElement;
        return d.scrollWidth - d.clientWidth;
      });
      if (overflow > 1) horizontalOverflow[`${label}@${w}`] = overflow;
      await page.screenshot({ path: path.join(OUT, `${PREFIX}-${label}-${w}.png`), fullPage: false });
      // Mobile extras once per prefix: menu open + search open at 390
      if (PREFIX === "after" && w === 390 && route === "/") {
        await page.click("header button[aria-label^='القائمة'], header button[aria-label^='Menu']", { force: true }).catch(() => {});
        await page.waitForTimeout(350);
        await page.screenshot({ path: path.join(OUT, `${PREFIX}-menu-390.png`) });
        await page.keyboard.press("Escape").catch(() => {});
        const searchBtn = page.locator("header button[aria-label]:not([aria-label*='القائمة']):first-of-type");
        await page.evaluate(() => (window.scrollTo(0, 0)));
      }
      if (PREFIX === "after" && w === 390 && route === "/shop") {
        await page.click("header button", { trial: true }).catch(() => {});
      }
    } catch (err) {
      console.error(`${route}@${w}: ${String(err).slice(0, 160)}`);
    }
    await ctx.close();
  }
}
await browser.close();
console.log("horizontal overflow:", JSON.stringify(horizontalOverflow));
console.log("shots →", OUT);
