#!/usr/bin/env node
/**
 * Static build of the PUBLIC site for GitHub Pages (or any static hosting).
 *
 *   BASE_PATH=/rs SITE_URL=https://psv98.github.io/rs npm run build:static
 *
 * 1. validates data/published/snapshots.json (same publication rules as the admin);
 * 2. pre-renders all PNG / ZIP exports into public/exports;
 * 3. runs `next build` with STATIC_EXPORT=1 — admin pages, API routes and the proxy
 *    (files named *.server.ts[x]) are not part of this build;
 * 4. result: ./out (with .nojekyll), ready to publish.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

const env = {
  ...process.env,
  STATIC_EXPORT: "1",
  BASE_PATH: process.env.BASE_PATH ?? "",
  SITE_URL: process.env.SITE_URL ?? "http://localhost:3000",
  NODE_ENV: "production",
};
const run = (cmd) => execSync(cmd, { stdio: "inherit", env });

console.log(`Static build → base path "${env.BASE_PATH || "/"}", site ${env.SITE_URL}`);
run("npx tsx --conditions=react-server scripts/render-static-exports.ts");
fs.rmSync(".next", { recursive: true, force: true });
run("npx next build");
fs.writeFileSync("out/.nojekyll", "");
// robots.txt / sitemap.xml (in server mode these are dynamic routes).
const site = env.SITE_URL.replace(/\/+$/, "");
fs.writeFileSync("out/robots.txt", `User-agent: *\nAllow: /\nDisallow: /present/\nDisallow: /en/present/\n\nSitemap: ${site}/sitemap.xml\n`);
const today = new Date().toISOString().slice(0, 10);
const alt = `<xhtml:link rel="alternate" hreflang="uk" href="${site}/"/><xhtml:link rel="alternate" hreflang="en" href="${site}/en/"/>`;
fs.writeFileSync(
  "out/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    `<url><loc>${site}/</loc><lastmod>${today}</lastmod>${alt}</url>\n<url><loc>${site}/en/</loc><lastmod>${today}</lastmod>${alt}</url>\n</urlset>\n`,
);
// GitHub Pages serves 404.html for unknown paths.
if (fs.existsSync("out/_not-found/index.html") && !fs.existsSync("out/404.html")) fs.copyFileSync("out/_not-found/index.html", "out/404.html");
console.log("✓ Static site in ./out");
