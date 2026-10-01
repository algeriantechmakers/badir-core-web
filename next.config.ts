import type { NextConfig } from "next";
const isDev = process.env.NODE_ENV === "development";
/**
 * Allows a deployment to serve objects from a custom CDN domain without editing
 * this file: set S3_PUBLIC_URL at build time and its host joins the allowlist.
 * Optional — the static patterns below already cover R2 and local MinIO.
 */
const extraImageHosts: NonNullable<NextConfig["images"]>["remotePatterns"] =
  (() => {
    const publicUrl = process.env.S3_PUBLIC_URL;
    if (!publicUrl) return [];
    try {
      const { protocol, hostname, port } = new URL(publicUrl);
      return [
        {
          protocol: protocol.replace(":", "") as "http" | "https",
          hostname,
          ...(port ? { port } : {}),
        },
      ];
    } catch {
      return [];
    }
  })();

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "40mb",
    },
    proxyClientMaxBodySize: "40mb",
  },
  async rewrites() {
    return [
      {
        source: "/api/webhooks/mailerlite",
        destination: "/api/webhooks/mailerlite",
      },
    ];
  },
  images: {
    // Build-time allowlist of hosts next/image may optimise from. It is baked
    // into the build, so it deliberately covers every environment at once —
    // that keeps a single image promotable across dev1/staging1/prod.
    dangerouslyAllowLocalIP: isDev,
    remotePatterns: [
      // Rows written before the S3 migration still hold Supabase public URLs.
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
      // Cloudflare R2: public dev buckets and the S3 API endpoint.
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      // Local MinIO.
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "http", hostname: "minio", port: "9000" },
      ...extraImageHosts,
    ],
    qualities: [60, 80, 100],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
