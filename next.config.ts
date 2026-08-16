import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@excalidraw/excalidraw"],
  // Keep tesseract off the Turbopack graph — its worker_threads script
  // must load from a real filesystem path, not the virtual /ROOT remap.
  serverExternalPackages: ["tesseract.js", "tesseract.js-core"],
};

export default nextConfig;
