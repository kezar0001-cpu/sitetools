import type { MetadataRoute } from "next";

const SITE_URL = "https://buildstate.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/sitesign",
    "/siteplan",
    "/site-capture",
    "/site-itp",
    "/site-docs",
    "/workspace",
    "/about",
    "/contact",
    "/terms",
    "/privacy",
    "/login",
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
