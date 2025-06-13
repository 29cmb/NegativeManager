import type { NextConfig } from "next";
import withFlowbiteReact from "flowbite-react/plugin/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    unoptimized: true
  },
  output: "export",
  env: {
    SERVER_URL: "https://napi.devcmb.hackclub.app"
  }
};

export default withFlowbiteReact(nextConfig);
