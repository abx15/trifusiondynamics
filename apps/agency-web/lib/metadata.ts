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
  image = "/og-image.jpg",
  noIndex = false,
  slug = "",
}: MetadataProps = {}): Metadata {
  const defaultTitle = "Trifusion Dynamics | Full-Stack & AI-Powered SaaS Development";
  const defaultDescription =
    "We build modern, resilient full-stack applications and integrate bespoke AI automation pipelines to transform business operations for Indian SMBs and startups.";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://trifusiondynamics.com";
  const currentUrl = `${siteUrl}/${slug}`;

  return {
    title: title ? `${title} | Trifusion Dynamics` : defaultTitle,
    description: description || defaultDescription,
    alternates: {
      canonical: currentUrl,
    },
    openGraph: {
      title: title ? `${title} | Trifusion Dynamics` : defaultTitle,
      description: description || defaultDescription,
      url: currentUrl,
      siteName: "Trifusion Dynamics",
      images: [
        {
          url: image.startsWith("http") ? image : `${siteUrl}${image}`,
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
      images: [image.startsWith("http") ? image : `${siteUrl}${image}`],
      creator: "@trifusion",
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
