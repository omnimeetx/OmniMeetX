import { withSentryConfig } from '@sentry/nextjs/config';
/** @type {import('next').NextConfig} */
const nextConfig = {
  // TODO: turn these back on once the existing type/lint errors are fixed
  // (run `npm run typecheck` to list them) so broken code can't ship.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  /**
   * Stub Node-only modules that some browser libraries reference but never
   * call client-side, so webpack doesn't fail trying to bundle them.
   */
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        os: false,
        encoding: false,
        'node-fetch': false,
      };
    }
    return config;
  },
  // The backend is called directly at NEXT_PUBLIC_API_URL (see lib/config.ts).
  // No /api rewrite here: it used to point at a hardcoded production server,
  // so any relative call — even in local dev — silently hit live data.
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/uploading/bundler-plugin-options/

  org: "omnimeetx",

  project: "javascript-nextjs",

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

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: false, // the site runs on Render, not Vercel

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
      // The browser reports errors only; page-speed tracing would add ~60 KB to every page.
      // The backend still traces API requests.
      removeTracing: true,
    },
  }
});
