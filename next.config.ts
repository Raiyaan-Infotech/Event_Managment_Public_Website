import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Tenant logos and hero images come from wherever the admin uploaded them
  // (S3/media host), and the set is open-ended across tenants, so the image
  // host allowlist has to be configured rather than hardcoded.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
