import { chromium } from "playwright";
const b = await chromium.launch({ channel: "msedge" });
const p = await (await b.newContext({ viewport: { width: 390, height: 900 } })).newPage();
const errs = [];
p.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 200)); });
p.on("pageerror", (e) => errs.push("PAGEERROR " + String(e).slice(0, 200)));
for (const u of ["/product/classic-chiffon-hijab", "/product/p-h1"]) {
  await p.goto("http://localhost:5199" + u, { waitUntil: "networkidle" });
  const h1 = await p.locator("h1").first().textContent().catch(() => "?");
  console.log(u, "→", (h1 ?? "").slice(0, 60));
}
console.log("console errors:", JSON.stringify(errs.slice(0, 6), null, 1));
await b.close();
