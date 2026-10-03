import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.trifusiondynamics.com",
      },
      {
        protocol: "https",
        hostname: "cloudflare-ipfs.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async redirects() {
    return [
      // Redirect old /home to root
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
      // Redirect /work to /portfolio
      {
        source: "/work",
        destination: "/portfolio",
        permanent: true,
      },
      // Redirect /work/:slug to /portfolio/:slug
      {
        source: "/work/:slug",
        destination: "/portfolio/:slug",
        permanent: true,
      },
      // Redirect /service (singular) to /services
      {
        source: "/service",
        destination: "/services",
        permanent: true,
      },
      // Redirect /service/:slug to /services/:slug
      {
        source: "/service/:slug",
        destination: "/services/:slug",
        permanent: true,
      },
      // Redirect /blog/posts/:slug to /blog/:slug
      {
        source: "/blog/posts/:slug",
        destination: "/blog/:slug",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' http://localhost:* ws://localhost:* https: http: ws: wss:",
              "font-src 'self' data: https:",
              "object-src 'none'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          { key: "X-XSS-Protection", value: "0" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
