import type { NextConfig } from "next";

function parseImageRemotePatterns(env?: string) {
  if (!env) return [] as { protocol: "http" | "https"; hostname: string }[];

  return env
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      try {
        // Accept either full URL ("https://cdn.example.com") or bare host ("cdn.example.com")
        const url = entry.startsWith("http://") || entry.startsWith("https://") ? new URL(entry) : new URL(`https://${entry}`);

        const protocol = url.protocol.replace(":", "") as "http" | "https";
        const hostname = url.hostname;

        if (!hostname) return null;
        return { protocol, hostname };
      } catch {
        // Ignore malformed entries
        return null;
      }
    })
    .filter((v): v is { protocol: "http" | "https"; hostname: string } => Boolean(v));
}

const remotePatterns = parseImageRemotePatterns(process.env.NEXT_IMAGE_DOMAINS);

// De-duplicate hostnames for the `domains` fallback
const imageDomains = Array.from(new Set(remotePatterns.map((p) => p.hostname)));

const nextConfig: NextConfig = {
  images: {
    // Prefer remotePatterns (supports protocol/hostname granularity)
    remotePatterns,
    // Also include domains for broader compatibility
    domains: imageDomains,
  },
  // ...any other config
};

export default nextConfig;
