import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@remotion/renderer",
    "@remotion/bundler",
    "remotion",
    "@ffmpeg-installer/ffmpeg",
    "archiver",
  ],
};

export default nextConfig;
