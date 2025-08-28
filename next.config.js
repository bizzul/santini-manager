const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "https://flagcdn.com/",
      "flagcdn.com",
      "s.gravatar.com",
      "res.cloudinary.com",
      "reactive-manager.vercel.app",
      "avatar.vercel.sh",
    ],
  },
  webpack: (config, { dev, isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
    };

    // Optimize webpack cache for better performance
    if (!dev) {
      config.cache = {
        type: "filesystem",
        buildDependencies: {
          config: [__filename],
        },
        cacheDirectory: path.resolve(__dirname, ".next/cache"),
        compression: "gzip",
        maxMemoryGenerations: 1,
        store: "pack",
        version: "1.0.0",
      };
    }

    // Add performance hints to identify large chunks
    config.performance = {
      hints: dev ? false : "warning",
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    };

    return config;
  },
};

module.exports = nextConfig;
