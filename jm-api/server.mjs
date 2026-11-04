/**
 * JM API localhost Node/Termux/Windows adapter.
 * This is a local test/developer carrier, not an internet-facing auth gateway.
 */
import http from 'node:http';
import { handleJMApi } from './core.mjs';

const HOST = '127.0.0.1'; // Never expose a private owner device by default.
const PORT = Number(process.env.JM_API_PORT ?? '8787');
if (!Number.isSafeInteger(PORT) || PORT < 1024 || PORT > 65535) {
  throw new Error('JM_API_PORT must be an integer from 1024 to 65535');
}
const server = http.createServer(async (req, res) => {
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 4096) {
        res.writeHead(413, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        return res.end(JSON.stringify({ok:false,error:'REQUEST_TOO_LARGE'}));
      }
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);
    const input = new Request('http://' + HOST + ':' + PORT + req.url, {
      method: req.method,
      headers: req.headers,
      ...(body.length ? { body } : {})
    });
    const response = await handleJMApi(input);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(400, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ok:false,error:'INVALID_REQUEST'}));
  }
});
server.listen(PORT, HOST, () => {
  console.log('JM API v1 local: http://' + HOST + ':' + PORT + '/api/jm/v1');
});
for (const signal of ['SIGINT','SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
