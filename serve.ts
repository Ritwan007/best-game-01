// Serve game/ locally for play-testing: `node serve.ts`, then open
// http://localhost:8080 — no build step, no network, static files only.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const types: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
};
const server = createServer(async (req, res) => {
  const path = req.url === '/' ? '/index.html' : (req.url ?? '/index.html').split('?')[0];
  try {
    const body = await readFile(join(here, 'game', path));
    res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});
server.listen(8080, () => console.log('Kilnfire at http://localhost:8080'));
