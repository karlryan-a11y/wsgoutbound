import type { NextConfig } from "next";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

// Force .env.local to override system env vars (fixes Claude Code setting empty ANTHROPIC_API_KEY)
dotenvConfig({ path: resolve(process.cwd(), ".env.local"), override: true });

const nextConfig: NextConfig = {
};

export default nextConfig;
