import type { NextConfig } from "next";
// @ts-expect-error next-pwa has no type declarations
import withPWA from "next-pwa";

const nextConfig: NextConfig = {};

// next-pwa runs at build time and needs process.env directly (not our env module)
const isDev = process.env.NODE_ENV === "development";

export default withPWA({
  dest: "public",
  disable: isDev,
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https?:\/\/.*\/api\/.*$/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /^https?:\/\/.*\/(_next\/static|_next\/image|fonts|icons|manifest\.json).*$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
  ],
})(nextConfig);
