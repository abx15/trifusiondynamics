import { Metadata } from "next";

interface MetadataProps {
  title?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
  slug?: string;
}

export function constructMetadata({
  title,
  description,
  image = "/logo.png",
  noIndex = false,
  slug = "",
}: MetadataProps = {}): Metadata {
  const defaultTitle = "Trifusion Dynamics | Full-Stack & AI-Powered SaaS Development";
  const defaultDescription =
    "We build modern, resilient full-stack applications and integrate bespoke AI automation pipelines to transform business operations for Indian SMBs and startups.";

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://trifusiondynamics.vercel.app/"
  ).replace(/\/$/, "");

  // Build absolute canonical URL: siteUrl/slug (slug may be "" for root)
  const canonicalPath = slug ? `/${slug}` : "/";
  const canonicalUrl = `${siteUrl}${canonicalPath}`;

  // Resolve image to absolute URL
  const ogImage = image.startsWith("http") ? image : `${siteUrl}${image}`;

  return {
    title: title ? `${title} | Trifusion Dynamics` : defaultTitle,
    description: description || defaultDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: title ? `${title} | Trifusion Dynamics` : defaultTitle,
      description: description || defaultDescription,
      url: canonicalUrl,
      siteName: "Trifusion Dynamics",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title || defaultTitle,
        },
      ],
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: title ? `${title} | Trifusion Dynamics` : defaultTitle,
      description: description || defaultDescription,
      images: [ogImage],
      creator: "@trifusiondyn",
      site: "@trifusiondyn",
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}
