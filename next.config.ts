import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output keeps the Docker / AWS (ECS, Amplify) path open.
  output: "standalone",
  images: {
    // Unsplash serves resized images from its own CDN, so we use a tiny custom
    // loader instead of proxying multi-megabyte originals through Next.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    qualities: [75],
  },
};

export default nextConfig;
