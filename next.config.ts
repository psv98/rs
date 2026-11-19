import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Two build modes:
 *  - server (default): full app — public site, admin panel, PNG API (Node.js hosting);
 *  - static (STATIC_EXPORT=1, see scripts/build-static.mjs): public pages only, for
 *    GitHub Pages, generated from data/published/snapshots.json.
 */
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = isStatic ? (process.env.BASE_PATH ?? "").replace(/\/+$/, "") : "";

// Static security headers (server mode). The per-request CSP with a nonce is set in src/proxy.ts.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const common: NextConfig = {
  // Files that need a Node.js server (admin pages, API routes, proxy) end in
  // .server.ts(x); the static build simply does not pick them up. The GitHub-backed
  // editor for the static site (src/app/editor/*.static.tsx) exists only in the static build.
  pageExtensions: isStatic ? ["static.tsx", "tsx", "ts"] : ["server.tsx", "server.ts", "tsx", "ts"],
  poweredByHeader: false,
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_STATIC_EXPORT: isStatic ? "1" : "0",
  },
};

const staticConfig: NextConfig = {
  ...common,
  output: "export",
  basePath: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

const serverConfig: NextConfig = {
  ...common,
  output: "standalone",
  // Native / wasm modules must not be bundled.
  serverExternalPackages: ["better-sqlite3", "@resvg/resvg-js", "@node-rs/argon2", "pg", "satori"],
  // Fonts and brand assets are read from disk by the PNG renderer.
  outputFileTracingIncludes: {
    "/api/**/*": ["./assets/fonts/**/*", "./public/brand/**/*", "./public/icons/**/*"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        source: "/api/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default isStatic ? staticConfig : serverConfig;
