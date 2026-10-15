import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const normalizedBase =
  basePath && basePath !== "/" ? basePath.replace(/\/$/, "") : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: normalizedBase || undefined,
  assetPrefix: normalizedBase ? `${normalizedBase}/` : undefined,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
