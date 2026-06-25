import * as Sentry from '@sentry/node';

// ─── Must be the very first import in server.ts ───────────────────────────────
// Sentry instruments Node.js internals (http, express, prisma) on init.
// Any import before this call won't be auto-instrumented.

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? '',
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  release: `hagatna-backend@${process.env.npm_package_version ?? '1.0.0'}`,

  integrations: [
    // Auto-captures: HTTP requests, headers, response codes
    Sentry.httpIntegration({ breadcrumbs: true }),
    // Auto-captures: Express route, request body, query params
    Sentry.expressIntegration(),
    // Auto-captures: every Prisma query as a breadcrumb + slow query detection
    Sentry.prismaIntegration(),
  ],

  // Performance: 20% sample in production (tune up if you need more data)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // ─── Filter: don't send expected 4xx errors ──────────────────────────────
  // Validation errors, auth failures, 404s = expected. 5xx = bugs we care about.
  beforeSend(event, hint) {
    const err = hint?.originalException as Record<string, unknown> | null;
    if (
      err &&
      err.isOperational === true &&
      typeof err.statusCode === 'number' &&
      err.statusCode < 500
    ) {
      return null;
    }
    return event;
  },
});
