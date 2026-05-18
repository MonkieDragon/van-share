import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/passenger/select-route",
        destination: "/create-journey",
        permanent: false,
      },
      {
        source: "/passenger/new-request",
        destination: "/create-journey",
        permanent: false,
      },
      {
        source: "/passenger/request-status",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
