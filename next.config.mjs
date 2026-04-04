/** @type {import('next').NextConfig} */
const apiTarget =
  process.env.API_PROXY_TARGET?.replace(/\/$/, "") ||
  "http://localhost:4000";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api-proxy/:path*",
        destination: `${apiTarget}/:path*`,
      },
      {
        source: "/push/:path*",
        destination: `${apiTarget}/push/:path*`,
      },
    ];
  },
};

export default nextConfig;
