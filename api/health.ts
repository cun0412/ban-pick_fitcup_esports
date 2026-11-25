import { handleHealth } from './_handlers.js';

export default async function handler(_req: any, res: any) {
  const out = await handleHealth();
  res.status(out.status).json(out.data);
}
