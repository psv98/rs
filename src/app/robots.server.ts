import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

// NOTE: robots.txt only asks crawlers to stay away. Access control for /admin is
// enforced on the server for every request.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/admin", "/api/export", "/present", "/en/present"] }],
    sitemap: `${config.siteUrl}/sitemap.xml`,
  };
}
