/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  async redirects() {
    return [
      { source: "/register", destination: "/join", permanent: false },
    ];
  },
};

export default nextConfig;
