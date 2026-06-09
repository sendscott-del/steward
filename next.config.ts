import type { NextConfig } from "next";

// Domain migration → steward.gatheredin.app. 301 the old Vercel host to the new
// domain (root + all paths). Only matches the old host, so the new domain serves
// normally. Mirror of the Magnify pilot's two-rule pattern (a lone /:path* misses
// the bare root).
const OLD_HOST = "stewards-indeed.vercel.app";
const NEW_BASE = "https://steward.gatheredin.app";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "host", value: OLD_HOST }],
        destination: `${NEW_BASE}/`,
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: OLD_HOST }],
        destination: `${NEW_BASE}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
