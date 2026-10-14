import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // nodemailer reads files and opens sockets: keep it out of the bundle and run it on the server only.
  serverExternalPackages: ["nodemailer"],
};

export default nextConfig;
