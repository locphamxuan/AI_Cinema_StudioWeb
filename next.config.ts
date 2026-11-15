import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // `next dev` would otherwise write a generic AGENTS.md at the root; the project keeps no such file.
  agentRules: false,
  // A signed contract PDF (up to 10 MB, same as the API) travels through a Server Action.
  experimental: { serverActions: { bodySizeLimit: '11mb' } },
};

export default nextConfig;
