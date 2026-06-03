import type { VercelRequest, VercelResponse } from '@vercel/node';

const WC_KEY = (process.env.WC_CONSUMER_KEY ?? '').trim();
const WC_SECRET = (process.env.WC_CONSUMER_SECRET ?? '').trim();

const WC_BASE = 'https://leahcation.ru/wp/wp-json/wc/v3';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow only GET requests (read-only WC access)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { path, ...queryParams } = req.query as Record<string, string>;

  if (!path) {
    return res.status(400).json({ error: 'Missing path param' });
  }

  // Build upstream URL
  const params = new URLSearchParams(queryParams).toString();
  const upstreamUrl = `${WC_BASE}/${path}${params ? '?' + params : ''}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64'),
        'Accept': 'application/json',
      },
    });

    const data = await upstream.text();

    // Forward relevant headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

    return res.status(upstream.status).send(data);
  } catch (err) {
    console.error('[wc proxy]', err);
    return res.status(502).json({ error: 'Upstream error' });
  }
}
