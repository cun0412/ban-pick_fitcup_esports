import { handleHeroes } from './_handlers.js';

export default async function handler(req: any, res: any) {
  const out = await handleHeroes({
    method: req.method || 'GET',
    query: (req.query || {}) as Record<string, string>,
    body: req.body,
  });
  res.status(out.status).json(out.data);
}
