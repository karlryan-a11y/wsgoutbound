import type { NextConfig } from "next";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

// Force .env.local to override system env vars (fixes Claude Code setting empty ANTHROPIC_API_KEY),
// but NEVER let it override NODE_ENV. Next sets that itself (production for `next build`,
// development for `next dev`); a stray NODE_ENV in .env.local otherwise runs the production
// build in dev mode and crashes /_global-error prerendering with a null React dispatcher
// ("Cannot read properties of null (reading 'useContext')").
const preservedNodeEnv = process.env.NODE_ENV;
dotenvConfig({ path: resolve(process.cwd(), ".env.local"), override: true });
// NODE_ENV is typed read-only, hence the cast.
if (preservedNodeEnv) (process.env as Record<string, string | undefined>).NODE_ENV = preservedNodeEnv;

const nextConfig: NextConfig = {
};

export default nextConfig;
