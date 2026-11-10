import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // `next dev` would otherwise write a generic AGENTS.md at the root; the project keeps no such file.
  agentRules: false,
};

export default nextConfig;
