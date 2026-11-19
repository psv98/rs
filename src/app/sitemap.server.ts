import type { MetadataRoute } from "next";
import { config } from "@/lib/config";
import { dynamicInServerMode, getPublicState } from "@/lib/data/public";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await dynamicInServerMode();
  const base = config.siteUrl;
  const { current } = await getPublicState();
  const lastModified = current?.publishedAt ? new Date(current.publishedAt) : new Date();
  return [
    { url: `${base}/`, lastModified, changeFrequency: "monthly", priority: 1, alternates: { languages: { uk: `${base}/`, en: `${base}/en${process.env.STATIC_EXPORT === "1" ? "/" : ""}` } } },
    { url: `${base}/en${process.env.STATIC_EXPORT === "1" ? "/" : ""}`, lastModified, changeFrequency: "monthly", priority: 0.9, alternates: { languages: { uk: `${base}/`, en: `${base}/en${process.env.STATIC_EXPORT === "1" ? "/" : ""}` } } },
  ];
}
