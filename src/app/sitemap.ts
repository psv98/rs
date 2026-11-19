import type { MetadataRoute } from "next";
import { config } from "@/lib/config";
import { getPublicState } from "@/lib/data/public";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = config.siteUrl;
  const { current } = await getPublicState();
  const lastModified = current?.publishedAt ? new Date(current.publishedAt) : new Date();
  return [
    { url: `${base}/`, lastModified, changeFrequency: "monthly", priority: 1, alternates: { languages: { uk: `${base}/`, en: `${base}/en` } } },
    { url: `${base}/en`, lastModified, changeFrequency: "monthly", priority: 0.9, alternates: { languages: { uk: `${base}/`, en: `${base}/en` } } },
  ];
}
