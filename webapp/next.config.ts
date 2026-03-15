import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.fussball.de",
        pathname: "/export.media/**",
      },
    ],
  },
};

export default nextConfig;
