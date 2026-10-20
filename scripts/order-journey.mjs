// Order journey QA — runs ONLY in seed mode (no Supabase env):
// PDP → add to cart → cart → checkout → success → wa.me message content.
// Asserts the local-order flow (localStorage snapshot + WhatsApp handoff).
import { chromium } from "playwright";
import { existsSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:5188";
const VIEWPORTS = [
  { name: "mobile-360", width: 360, height: 780 },
  { name: "desktop-1280", width: 1280, height: 800 },
];

function log(m) { console.log(m); }

async function dump(page, label) {
  const texts = await page.evaluate(() =>
    [...document.querySelectorAll("button, a")].map((el) => el.textContent?.trim().slice(0, 40)).filter(Boolean),
  );
  log(`    !! [${label}] visible buttons/links: ${JSON.stringify(texts.slice(0, 30))}`);
}

async function clickButton(page, re, label) {
  const btn = page.locator("button, a", { hasText: re }).first();
  try {
    await btn.click({ timeout: 5000 });
    return;
  } catch { /* dump below */ }
  await dump(page, label);
  const btn2 = page.locator("button, a", { hasText: re }).first();
  await btn2.click({ timeout: 5000 });
}

function assert(cond, msg, errors) {
  if (cond) log(`    ok: ${msg}`);
  else { errors.push(msg); log(`    FAIL: ${msg}`); }
}

const decodeWa = (href) => {
  const q = new URL(href).searchParams.get("text") ?? "";
  return decodeURIComponent(q);
};

const run = async () => {
  if (!existsSync(".shots")) (await import("node:fs")).mkdirSync(".shots");
  const results = [];
  for (const vp of VIEWPORTS) {
    log(`\\n== ${vp.name} ==`);
    const errors = [];
    const browser = await chromium.launch({ channel: "msedge", reducedMotion: "reduce" });
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    let popupHref = "";
    page.on("popup", async (p) => {
      await p.waitForURL("https://wa.me/**", { timeout: 4000 }).catch(() => {});
      popupHref = p.url();
    });

    // PDP → add to cart
    await page.goto(`${BASE}/product/classic-chiffon-hijab`, { waitUntil: "networkidle" });
    log(`  pdp: ${page.url()}`);
    await clickButton(page, /أضف|إضافة السلة|add to cart/i, "pdp-add");

    // Cart → checkout
    await page.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
    const checkoutLink = page.locator('a[href="/checkout"], a[href*="checkout"]').first();
    try { await checkoutLink.click({ timeout: 5000 }); } catch { await dump(page, "cart"); throw new Error("checkout link not found"); }

    // Checkout form
    await page.waitForURL("**/checkout", { timeout: 5000 });
    await clickButton(page, /عادي|standard/i, "delivery-method");
    await page.locator('input[autocomplete="given-name"]').fill("سارة محمود");
    await page.locator('input[autocomplete="family-name"]').fill("محمود");
    await page.locator('input[type="tel"]').first().fill("01012345678");
    const inputs = page.locator('main input:not([type]), main input[type="tel"]');
    await inputs.nth(3).fill("مدينة نصر");
    await inputs.nth(5).fill("شارع التسعين الشمالي، أمام البرج");
    const gov = page.locator("select").first();
    await gov.selectOption({ index: 1 });
    const govLabel = await gov.evaluate((el) => el.selectedOptions[0].textContent);
    log(`  governorate: ${govLabel}`);
    await page.screenshot({ path: `.shots/journey-${vp.name}-checkout.png` });

    // Place order → success page
    await page.on("framenavigated", () => {});
    await clickButton(page, /إتمام|اطلبي|place order|تأكيد/i, "place-order");
    await page.waitForURL("**/order-success**", { timeout: 8000 });
    await page.waitForTimeout(400);
    log(`  success: ${page.url()}`);
    await page.screenshot({ path: `.shots/journey-${vp.name}-success.png`, fullPage: true });

    // Local order stored
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("jia_orders_v1") ?? "[]"));
    assert(stored.length === 1, `localStorage holds 1 order (got ${stored.length})`, errors);
    const ord = stored[0] ?? {};
    assert(ord.phone === "01012345678", "phone stored", errors);
    assert(Array.isArray(ord.items) && ord.items.length >= 1, `items stored (got ${ord.items?.length})`, errors);
    assert(ord.total > 0 && ord.subtotal > 0 && ord.orderNumber?.startsWith("LM-"), "totals + order number stored", errors);
    log(`  order: #${ord.orderNumber} total=${ord.total} status=${ord.status}`);

    // Success page: order number visible + summary + wa.me CTA
    const body = await page.locator("main").textContent();
    assert(body.includes(ord.orderNumber), "order number shown on success page", errors);
    const waHref = await page.locator('main a[href^="https://wa.me/"]').first().getAttribute("href");
    assert(!!waHref, "WhatsApp CTA present on success page", errors);

    const expected = waHref ? decodeWa(waHref) : "";
    for (const [label, re] of [
      ["order number in message", new RegExp(ord.orderNumber.replace("LM-", "LM-?"))],
      ["customer name", /سارة محمود/],
      ["phone", /01012345678/],
      ["governorate", new RegExp((govLabel ?? "").trim())],
      ["address", /شارع التسعين/],
      ["area", /مدينة نصر/],
      ["item name", /حجاب|شيفون|chiffon|silk/i],
      ["unit price", /سعر الوحدة/],
      ["quantity", /الكمية/],
      ["subtotal label", /الإجمالي الفرعي/],
      ["shipping label", /الشحن/],
      ["total", /الإجمالي النهائي/],
      ["COD payment", /كاش عند الاستلام/],
    ]) {
      assert(re.test(expected), `message includes ${label}`, errors);
    }
    if (ord.discount > 0) assert(/الخصم/.test(expected), "discount line present", errors);

    // Popup opened by the flow carries the same wa.me URL
    assert(popupHref.startsWith("https://wa.me/"), popupHref ? "popup auto-opened with wa.me" : "popup blocked (CTA button still available)", errors);

    // Cart cleared
    const cartCount = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes("cart")));
    log(`  cart keys: ${JSON.stringify(cartCount)}`);

    await browser.close();
    results.push({ name: vp.name, errors, ord, popup: popupHref });
  }

  log("\\n==== RESULT ====");
  let failed = false;
  for (const r of results) {
    if (r.errors.length) { failed = true; log(`${r.name}: FAILED -> ${JSON.stringify(r.errors)}`); }
    else log(`${r.name}: PASS (order ${r.ord?.orderNumber}, popup ${r.popup.slice(0, 60)}...)`);
  }
  process.exit(failed ? 1 : 0);
};

run().catch((e) => { console.error(e); process.exit(1); });
