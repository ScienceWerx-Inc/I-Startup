import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 85 for the landing hero photo, whose dashboard text softens at the default 75.
    qualities: [75, 85],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
};

export default nextConfig;
