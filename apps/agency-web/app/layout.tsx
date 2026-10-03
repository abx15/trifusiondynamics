import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import StickyMobileCTA from "@/components/sections/StickyMobileCTA";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
  themeColor: "#070a13",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "Trifusion Dynamics | Full-Stack & AI-Powered SaaS Development",
    template: "%s | Trifusion Dynamics",
  },
  description:
    "We build modern, resilient full-stack applications and integrate bespoke AI automations to transform operations for Indian SMBs and startups.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Trifusion-Dynamics",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", sizes: "512x512", type: "image/png" }
    ],
    apple: "/icons/icon-192.png",
    shortcut: "/favicon.png",
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://trifusiondynamics.com"
  ),
  // ✅ Google Search Console Verification
  verification: {
    google: "googlea691be4bf549d308",
  },
  // ✅ Open Graph (Social Sharing with Logo)
  openGraph: {
    title: "Trifusion Dynamics | Full-Stack & AI-Powered SaaS Development",
    description:
      "We build modern, resilient full-stack applications and integrate bespoke AI automations to transform operations for Indian SMBs and startups.",
    url: "https://trifusiondynamics.com",
    siteName: "Trifusion Dynamics",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Trifusion Dynamics Logo",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  // ✅ Twitter Card with Logo
  twitter: {
    card: "summary",
    title: "Trifusion Dynamics | Full-Stack & AI-Powered SaaS",
    description:
      "We build modern, resilient full-stack applications and integrate bespoke AI automations.",
    images: ["/logo.png"],
  },
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://trifusiondynamics.vercel.app";

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Trifusion Dynamics",
    "url": siteUrl,
    "logo": `${siteUrl}/logo.png`,
    "description": "Premium Full-Stack and AI-powered SaaS agency targeting high-growth startups and enterprises. We specialize in AI integration, SaaS development, mobile engineering, cloud infrastructure, and custom ERP/CRM solutions.",
    "foundingDate": "2024",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "New Ashok Nagar, East Delhi",
      "addressLocality": "Delhi",
      "postalCode": "110096",
      "addressCountry": "IN",
      "addressRegion": "Delhi"
    },
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "telephone": "+91-8745883950",
        "contactType": "sales",
        "email": "support.trifusion@gmail.com",
        "areaServed": "IN",
        "availableLanguage": ["en", "hi"],
        "hoursAvailable": {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          "opens": "10:30",
          "closes": "18:30"
        }
      },
      {
        "@type": "ContactPoint",
        "contactType": "customer support",
        "email": "support.trifusion@gmail.com",
        "areaServed": "IN",
        "availableLanguage": ["en", "hi"],
        "hoursAvailable": {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          "opens": "00:00",
          "closes": "23:59"
        }
      }
    ],
    "areaServed": [
      {
        "@type": "Country",
        "name": "India"
      },
      {
        "@type": "GeoCircle",
        "geoMidpoint": {
          "@type": "GeoCoordinates",
          "latitude": "28.6139",
          "longitude": "77.2090"
        },
        "geoRadius": "1000"
      }
    ],
    "sameAs": [
      "https://twitter.com/trifusion",
      "https://linkedin.com/company/trifusion-dynamics",
      "https://github.com/abx15"
    ],
    "serviceType": [
      "AI Integration Services",
      "SaaS Development",
      "Mobile App Development",
      "Cloud Infrastructure",
      "Custom ERP & CRM",
      "Cybersecurity Consulting",
      "UI/UX Design"
    ],
    "priceRange": "$$",
    "knowsAbout": [
      "Next.js",
      "React Native",
      "NestJS",
      "PostgreSQL",
      "pgvector",
      "RAG",
      "AI Integration",
      "Microservices",
      "Kubernetes",
      "Docker"
    ]
  };

  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} h-full antialiased`}
    >
      <head>
        {/* ✅ Google Analytics GA4 — set NEXT_PUBLIC_GA_ID in .env */}
        {GA_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_ID}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}
        {/* ✅ JSON-LD Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#070a13] text-slate-100 font-sans pb-16 lg:pb-0">
        <ServiceWorkerRegistration />
        <Header />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
        <StickyMobileCTA />
      </body>
    </html>
  );
}
