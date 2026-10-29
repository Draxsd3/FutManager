import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Public build identifier only; never include credentials in this object.
  env: {
    NEXT_PUBLIC_BUILD_REVISION: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? "local",
  },
};

export default nextConfig;
