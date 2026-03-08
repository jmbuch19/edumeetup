import { withSentryConfig } from "@sentry/nextjs";
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const withPWA = require('next-pwa')({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    register: true,
    skipWaiting: true,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'files.edumeetup.com',       // Cloudflare R2 — primary CDN domain
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '*.r2.dev',                  // Cloudflare R2 — public dev / preview URLs
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',        // Legacy logos uploaded before R2 migration
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com', // Google profile pictures
            },
            {
                protocol: 'https',
                hostname: '*.googleusercontent.com',   // Google profile pictures (other subdomains)
            },
        ],
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin'
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(self), microphone=(), geolocation=(), browsing-topics=()'
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clare.ai https://*.wati.io",
                            "worker-src 'self' blob:",
                            "style-src 'self' 'unsafe-inline'",
                            "img-src 'self' data: blob: https://files.edumeetup.com https://lh3.googleusercontent.com https://*.googleusercontent.com https://*.clare.ai https://*.wati.io",
                            "font-src 'self' data:",
                            "connect-src 'self' https://*.neon.tech https://api.resend.com https://o4511006401691648.ingest.us.sentry.io https://*.clare.ai https://*.wati.io https://wati-integration-prod-service.clare.ai",
                            "media-src 'self'",
                            "object-src 'none'",
                            "frame-src 'self' https://*.clare.ai https://*.wati.io",
                            "frame-ancestors 'none'",
                            "base-uri 'self'",
                            "form-action 'self'",
                            "upgrade-insecure-requests",
                        ].join('; ')
                    },
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin'
                    },
                    {
                        key: 'Cross-Origin-Resource-Policy',
                        value: 'same-origin'
                    },
                ]
            },
            {
                // API routes — no caching, no indexing
                source: '/api/(.*)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'no-store, no-cache, must-revalidate'
                    },
                    {
                        key: 'X-Robots-Tag',
                        value: 'noindex'
                    },
                ]
            },
        ]
    }
};

export default withSentryConfig(withPWA(nextConfig), {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    org: "edumeetup",
    project: "edumeetup-mvp",

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: "/monitoring",

    // Hides source maps from generated client bundles
    hideSourceMaps: true,
});
