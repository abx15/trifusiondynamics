import { MetadataRoute } from "next";
import { getPortfolioItems, getBlogPosts } from "@/lib/api";

export default async function imageSitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://trifusiondynamics.vercel.app/";
  const currentDate = new Date();

  const images: MetadataRoute.Sitemap = [];

  // Add main logo and static images
  images.push({
    url: `${siteUrl}/logo.png`,
    lastModified: currentDate,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  });

  // Add portfolio images
  try {
    const portfolio = await getPortfolioItems();
    portfolio.forEach((item) => {
      if (item.coverImage) {
        images.push({
          url: item.coverImage,
          lastModified: currentDate,
          changeFrequency: "monthly" as const,
          priority: 0.6,
        });
      }
    });
  } catch (error) {
    console.error("Error fetching portfolio for image sitemap:", error);
  }

  // Add blog images
  try {
    const blogs = await getBlogPosts();
    blogs.forEach((post) => {
      if (post.coverImage) {
        images.push({
          url: post.coverImage,
          lastModified: currentDate,
          changeFrequency: "weekly" as const,
          priority: 0.6,
        });
      }
    });
  } catch (error) {
    console.error("Error fetching blogs for image sitemap:", error);
  }

  return images;
}
