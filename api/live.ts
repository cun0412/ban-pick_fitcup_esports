import { handleLive } from './_handlers.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const out = await handleLive({
    method: req.method || 'GET',
    query: (req.query || {}) as Record<string, string>,
    body: req.body,
  });
  res.status(out.status).json(out.data);
}
