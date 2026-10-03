import { MetadataRoute } from "next";
import { getCmsServices, getPortfolioItems, getBlogPosts } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Strip trailing slash to keep URLs clean
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://trifusiondynamics.vercel.app/"
  ).replace(/\/$/, "");
  const currentDate = new Date();

  // Base static paths with appropriate priorities and change frequencies
  const staticPaths = [
    {
      path: "",
      lastModified: currentDate,
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      path: "/about",
      lastModified: currentDate,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    },
    {
      path: "/contact",
      lastModified: currentDate,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      path: "/privacy-policy",
      lastModified: currentDate,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      path: "/services",
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      path: "/portfolio",
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      path: "/blog",
      lastModified: currentDate,
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((item) => ({
    url: `${siteUrl}${item.path}`,
    lastModified: item.lastModified,
    changeFrequency: item.changeFrequency,
    priority: item.priority,
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
      lastModified: currentDate,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates: {
        languages: {
          en: `${siteUrl}/services/${s.slug}`,
        },
      },
    }));

    const portfolioEntries: MetadataRoute.Sitemap = portfolio.map((p) => ({
      url: `${siteUrl}/portfolio/${p.slug}`,
      lastModified: currentDate,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates: {
        languages: {
          en: `${siteUrl}/portfolio/${p.slug}`,
        },
      },
    }));

    const blogEntries: MetadataRoute.Sitemap = blogs.map((b) => ({
      url: `${siteUrl}/blog/${b.slug}`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.6,
      alternates: {
        languages: {
          en: `${siteUrl}/blog/${b.slug}`,
        },
      },
    }));

    return [...staticEntries, ...serviceEntries, ...portfolioEntries, ...blogEntries];
  } catch (error) {
    console.error("Error generating sitemap dynamic paths:", error);
    return staticEntries;
  }
}
