import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Docker image ships only the traced files + server.js (see Dockerfile); Vercel and
  // `next dev` keep the normal .next output.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  devIndicators: false,
  // `next dev` would otherwise write a generic AGENTS.md at the root; the project keeps no such file.
  agentRules: false,
  // A signed contract PDF (up to 10 MB, same as the API) travels through a Server Action.
  experimental: { serverActions: { bodySizeLimit: '11mb' } },
};

export default nextConfig;
