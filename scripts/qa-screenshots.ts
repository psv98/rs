/**
 * Visual QA + end-to-end smoke test in a real browser (headless Chrome via puppeteer-core).
 *
 *   QA_BASE=http://localhost:3000 QA_USER=editor QA_PASS='…' CHROME_PATH=/usr/bin/google-chrome npm run qa:screenshots
 *
 * Steps: login → open the snapshot under review → confirm checks (QA_PUBLISH=1 only) → publish
 * → screenshots of UA/EN pages at desktop / tablet / mobile widths and of the admin.
 * Run it against a local QA database only: with QA_PUBLISH=1 it publishes.
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer, { type Page } from "puppeteer-core";

const BASE = process.env.QA_BASE ?? "http://localhost:3000";
const OUT = path.resolve("qa/screenshots");
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide", width: 1920, height: 1080 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "mobile", width: 390, height: 844 },
];

async function shot(page: Page, name: string, full = true) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, `${name}.png`) as `${string}.png`, fullPage: full });
  console.log("📸", name);
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"],
  });
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));

  if (process.env.QA_USER && process.env.QA_PASS) {
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle0" });
    await shot(page, "admin-login", false);
    await page.type('input[name="username"]', process.env.QA_USER);
    await page.type('input[name="password"]', process.env.QA_PASS);
    await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click('button[type="submit"]')]);
    await shot(page, "admin-dashboard");

    if (process.env.QA_PUBLISH === "1") {
      const href = await page.$$eval("table a.btn", (as) => (as as HTMLAnchorElement[]).map((a) => a.href));
      // the 24.10.2026 snapshot under review is the second row in the seed
      const reviewRow = await page.$$eval("tbody tr", (rows) =>
        rows.findIndex((r) => r.textContent?.includes("На перевірці") && r.textContent?.includes("24 жовтня 2026")),
      );
      if (reviewRow >= 0) {
        await page.goto(href[reviewRow]!, { waitUntil: "networkidle0" });
        await shot(page, "admin-editor-check");
        const boxes = await page.$$('.adm-check input[type="checkbox"]');
        for (const b of boxes) await b.click();
        const areas = await page.$$(".adm-check ~ .adm-grid textarea");
        await areas[0]?.type("[QA] Тестове пояснення для локальної перевірки.");
        await areas[1]?.type("[QA] Test explanation for local checks.");
        await page.click(".adm-card .btn--primary");
        await new Promise((r) => setTimeout(r, 800));
        await page.click(".adm-actions .btn--primary"); // Опублікувати
        await page.waitForSelector("dialog[open] input");
        await page.type("dialog[open] input", "2026-10-24");
        await page.click("dialog[open] .btn--primary");
        await new Promise((r) => setTimeout(r, 1200));
        await shot(page, "admin-editor-published", false);
      }
    }
  }

  for (const vp of VIEWPORTS) {
    for (const [lang, url] of [
      ["uk", "/"],
      ["en", "/en"],
    ] as const) {
      if (lang === "en" && vp.name === "tablet") continue;
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
      await page.goto(`${BASE}${url}`, { waitUntil: "networkidle0" });
      await shot(page, `public-${lang}-${vp.name}-fold`, false);
      await shot(page, `public-${lang}-${vp.name}-full`);
    }
  }
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`${BASE}/present`, { waitUntil: "networkidle0" });
  await shot(page, "present-uk", false);

  // Overflow check: no element wider than the viewport on mobile.
  await page.setViewport({ width: 360, height: 780 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(overflow > 0 ? `⚠ horizontal overflow on 360px: ${overflow}px` : "✓ no horizontal overflow at 360px");

  console.log(errors.length ? `⚠ console errors:\n${errors.join("\n")}` : "✓ no console errors");
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
