// src/config/env.ts
// ─────────────────────────────────────────────────────────────────────────────
// Environment Variables
// Grouped by concern and lightly documented for clarity
// ─────────────────────────────────────────────────────────────────────────────

// ░ App / Runtime
export const isProd = process.env.NODE_ENV === "production";
export const PORT = process.env.PORT! ?? 3000;

// ░ Database
export const MONGO_URI = process.env.MONGO_URI!;

// ░ Security / Crypto
export const HASH_SECRET = process.env.HASH_SECRET!;
export const ENC_KEY = process.env.ENC_KEY!;

// ░ Auth
export const DISABLE_AUTH = process.env.DISABLE_AUTH === "true";
export const AUTH_COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN ?? ".sspportal.lvh.me";
// Provide a sane default cookie name to avoid empty-string misconfig breaking sessions
export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? "traxyard.session-token";
export const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

// Whitelist hosts we allow for callbackUrl (comma‑separated)
export const NEXT_PUBLIC_ALLOWED_CALLBACK_HOSTS = process.env.NEXT_PUBLIC_ALLOWED_CALLBACK_HOSTS!;

// ░ External Identity (Azure AD)
export const AZURE_AD_CLIENT_ID = process.env.AZURE_AD_CLIENT_ID!;
export const AZURE_AD_CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET!;
export const AZURE_AD_TENANT_ID = process.env.AZURE_AD_TENANT_ID!;

// ░ Storage (AWS S3)
export const APP_AWS_BUCKET_NAME = process.env.APP_AWS_BUCKET_NAME!;
export const APP_AWS_REGION = process.env.APP_AWS_REGION!;
export const APP_AWS_ACCESS_KEY_ID = process.env.APP_AWS_ACCESS_KEY_ID!;
export const APP_AWS_SECRET_ACCESS_KEY = process.env.APP_AWS_SECRET_ACCESS_KEY!;

// ░ Email
export const SAFETY_EMAIL = process.env.SAFETY_EMAIL!;
export const NO_REPLY_EMAIL = process.env.NO_REPLY_EMAIL!;

// ░ Anti-abuse / Captcha (Cloudflare Turnstile)
export const NEXT_PUBLIC_TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!;
export const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY!;

// ░ Cron / Jobs
export const CRON_SECRET = process.env.CRON_SECRET!;

// ░ Images (Next/Image): comma-separated list of URLs or hostnames
//    Example: "https://img.example.com, https://cdn.foo.io, images.bar.net"
export const NEXT_IMAGE_DOMAINS = process.env.NEXT_IMAGE_DOMAINS!;

// ░ Public URLs
export const NEXT_PUBLIC_PORTAL_BASE_URL = process.env.NEXT_PUBLIC_PORTAL_BASE_URL!;

// ░ Reports Export (SQS)
export const REPORTS_SQS_URL = process.env.REPORTS_SQS_URL!; // e.g., https://sqs.ca-central-1.amazonaws.com/123456789012/traxyard-report-jobs
