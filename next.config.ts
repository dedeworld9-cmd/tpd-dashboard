import type { NextConfig } from "next";

/**
 * STATIC_EXPORT=1 builds a static copy for GitHub Pages (served under
 * /tampaPD). The default build is unchanged for Vercel.
 */
const pages = process.env.STATIC_EXPORT === "1";
const basePath = pages ? "/tampaPD" : "";

const nextConfig: NextConfig = pages
  ? {
      output: "export",
      basePath,
      trailingSlash: true,
      images: { loader: "custom", loaderFile: "./src/lib/static-image-loader.ts" },
      env: { NEXT_PUBLIC_BASE_PATH: basePath },
    }
  : {};

export default nextConfig;
