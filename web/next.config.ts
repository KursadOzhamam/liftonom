import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker/Coolify üretim imajı için minimal bağımsız çıktı (.next/standalone)
  output: "standalone",
};

export default nextConfig;
