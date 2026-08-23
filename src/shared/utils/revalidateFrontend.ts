const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const SITE_URL = process.env.SITE_URL || 'https://hagatnaa.com';
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || ''; // Optional: set this to ping Bing

export async function revalidateFrontendPaths(paths: string[]): Promise<void> {
  try {
    await fetch(`${FRONTEND_URL}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': process.env.REVALIDATE_SECRET || '',
      },
      body: JSON.stringify({ paths }),
    });

    if (INDEXNOW_KEY) {
      const urls = paths.map(p => `${SITE_URL}${p}`);
      fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: SITE_URL.replace(/^https?:\/\//, ''),
          key: INDEXNOW_KEY,
          urlList: urls
        })
      }).catch(err => console.error('IndexNow ping failed', err));
    }
  } catch (err) {
    // Best-effort
    console.error('Failed to revalidate frontend', err);
  }
}
