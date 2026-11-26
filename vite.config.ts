import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Middleware chạy các endpoint /api/* ngay trong Vite dev server (npm run dev)
 * để không cần chạy thêm server phụ khi phát triển ở local.
 */
function localApiPlugin(): Plugin {
  return {
    name: 'local-api-middleware',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      for (const [k, v] of Object.entries(env)) {
        if (!process.env[k]) process.env[k] = v;
      }

      server.middlewares.use(async (req: any, res: any, next: () => void) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next();
        }

        try {
          const parsedUrl = new URL(req.url, 'http://localhost');
          const route = parsedUrl.pathname.replace(/^\/api\//, '');
          const query: Record<string, string> = {};
          parsedUrl.searchParams.forEach((v: string, k: string) => {
            query[k] = v;
          });

          let body: any = undefined;
          if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const raw = Buffer.concat(chunks).toString('utf8');
            if (raw) {
              try {
                body = JSON.parse(raw);
              } catch {
                body = raw;
              }
            }
          }

          const mod = await server.ssrLoadModule('/api/_handlers.ts');
          const apiReq = { method: req.method || 'GET', query, body };
          let out = { status: 404, data: { error: 'Not found' } };

          if (route === 'health') out = await mod.handleHealth();
          else if (route === 'config') out = await mod.handleConfig(apiReq);
          else if (route === 'live') out = await mod.handleLive(apiReq);
          else if (route === 'matches') out = await mod.handleMatches(apiReq);
          else if (route === 'heroes') out = await mod.handleHeroes(apiReq);
          else if (route === 'football-reports') out = await mod.handleFootballReports(apiReq);

          res.statusCode = out.status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(out.data));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: err?.message || 'Internal Server Error' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApiPlugin()],
  server: {
    port: 5173,
    open: true,
  },
});
