import type { NextConfig } from "next";
// @ts-expect-error next-pwa has no type declarations
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  turbopack: {},
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
})(nextConfig);
