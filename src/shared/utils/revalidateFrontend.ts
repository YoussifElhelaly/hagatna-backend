import { env } from '@config/env';

/**
 * Ask the storefront (hagatna-customer, Next.js) to on-demand-revalidate the
 * given paths right now, instead of waiting for the next time-based ISR window.
 *
 * IMPORTANT: uses env.CUSTOMER_URL (the single storefront origin), NOT
 * env.FRONTEND_URL — that var is a comma-separated CORS allow-list of
 * multiple origins (see config/env.ts) and would build a malformed fetch URL.
 *
 * Best-effort / fire-and-forget: never throws, never blocks the caller. If
 * REVALIDATE_SECRET isn't configured, this silently no-ops and the frontend
 * just falls back to its normal time-based `revalidate` cache windows.
 */
export async function revalidateFrontendPaths(paths: string[]): Promise<void> {
  if (!env.REVALIDATE_SECRET) return; // not configured — skip, rely on time-based cache

  try {
    await fetch(`${env.CUSTOMER_URL}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': env.REVALIDATE_SECRET,
      },
      body: JSON.stringify({ paths }),
    });

    if (env.INDEXNOW_KEY) {
      const urls = paths.map((p) => `${env.CUSTOMER_URL}${p}`);
      fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: env.CUSTOMER_URL.replace(/^https?:\/\//, ''),
          key: env.INDEXNOW_KEY,
          urlList: urls,
        }),
      }).catch((err) => console.error('IndexNow ping failed', err));
    }
  } catch (err) {
    // Best-effort — never blocks approve/update/delete.
    console.error('Failed to revalidate frontend', err);
  }
}
