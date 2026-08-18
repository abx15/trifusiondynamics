import { MetadataRoute } from "next";
import { getCmsServices, getPortfolioItems, getBlogPosts } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://trifusiondynamics.com";

  // Base static paths
  const staticPaths = [
    "",
    "/about",
    "/contact",
    "/privacy-policy",
    "/services",
    "/portfolio",
    "/blog",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1.0 : 0.8,
  }));

  // Fetch dynamic collections
  try {
    const [services, portfolio, blogs] = await Promise.all([
      getCmsServices(),
      getPortfolioItems(),
      getBlogPosts(),
    ]);

    const serviceEntries: MetadataRoute.Sitemap = services.map((s) => ({
      url: `${siteUrl}/services/${s.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

    const portfolioEntries: MetadataRoute.Sitemap = portfolio.map((p) => ({
      url: `${siteUrl}/portfolio/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

    const blogEntries: MetadataRoute.Sitemap = blogs.map((b) => ({
      url: `${siteUrl}/blog/${b.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    return [...staticEntries, ...serviceEntries, ...portfolioEntries, ...blogEntries];
  } catch (error) {
    console.error("Error generating sitemap dynamic paths:", error);
    return staticEntries;
  }
}
