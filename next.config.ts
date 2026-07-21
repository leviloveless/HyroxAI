import type { NextConfig } from "next";

// Baseline security response headers (roadmap #3.8). Deliberately excludes a
// Content-Security-Policy for now (needs per-route tuning against Supabase +
// Anthropic + Next inline runtime); add one as a follow-up.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // web-push is loaded via a runtime dynamic import in lib/push/send.ts; mark it
  // external so Next traces it into the serverless bundle (else the import fails
  // in production and push sends silently no-op).
  serverExternalPackages: ["web-push"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    // Clean URLs for the static race pages in public/.
    return [
      { source: "/pace", destination: "/pace.html" }, // HYROX pacing-guide capture
      { source: "/deka", destination: "/deka.html" }, // DEKA FIT pacing estimator
    ];
  },
};

export default nextConfig;
