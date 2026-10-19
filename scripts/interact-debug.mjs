import { chromium } from "playwright";
import path from "node:path";
const OUT = path.join(process.cwd(), ".shots");
const b = await chromium.launch({ channel: "msedge" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: "reduce" });
const p = await ctx.newPage();
p.on("pageerror", (e) => console.error("PAGEERROR", String(e).slice(0, 200)));

await p.goto("http://localhost:5199/", { waitUntil: "networkidle" });
const all = await p.locator("header button[aria-label]").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
console.log("header buttons:", JSON.stringify(all));
const open1 = p.locator("header button").first(); // hamburger = first header button
await open1.click({ force: true });
await p.waitForTimeout(700);
await p.screenshot({ path: path.join(OUT, "try-menu-390.png") });
await p.keyboard.press("Escape");
await p.waitForTimeout(300);
console.log("drawer gone after Esc:", (await p.locator("header [role='dialog']").count()) === 0);

// search overlay
const searchBtn = p.locator("header button[aria-label]").nth(1);
await searchBtn.click({ force: true });
await p.locator("input").first().fill("شيفون");
await p.waitForTimeout(700);
await p.screenshot({ path: path.join(OUT, "try-search-390.png") });
console.log("search open OK");
await ctx.close();

// desktop dropdown at 1280
const ctx2 = await b.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
const p2 = await ctx2.newPage();
await p2.goto("http://localhost:5199/", { waitUntil: "networkidle" });
const shopLink = p2.locator("header a[aria-haspopup='menu']");
console.log("has dropdown trigger:", await shopLink.count());
if (await shopLink.count()) {
  await shopLink.hover();
  await p2.waitForTimeout(400);
  const menuVisible = await p2.locator("header [role='menu']").isVisible();
  console.log("menu visible on hover:", menuVisible);
  await p2.screenshot({ path: path.join(OUT, "try-dropdown-1280.png") });
  await p2.keyboard.press("Escape");
  await p2.waitForTimeout(200);
  console.log("menu visible after Esc:", await p2.locator("header [role='menu']").isVisible());
}
await ctx2.close();
await b.close();
