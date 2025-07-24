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
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
    };
    return config;
  },
};

module.exports = nextConfig;
