/**
 * JM ECOSTATE CP-GC1 — additive Google Cloud Run transport adapter.
 * Reuses unchanged native Estate Functions relay; never creates a rival Cloud Contact authority.
 * Not an authorization server, database, or proof of Google Cloud deployment.
 */
import http from 'node:http';
import { onRequest } from '../functions/api/estate-contact.js';

const ROUTE = '/api/estate-contact';
const MAX_BODY = 32_768;
const REPLY_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
};

function normalizedOrigin(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const url = new URL(raw);
    const local = ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
        url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
        url.origin !== raw.replace(/\/$/, '')) return null;
    return url.origin;
  } catch { return null; }
}

function error(res, status, code) {
  res.writeHead(status, REPLY_HEADERS);
  res.end(JSON.stringify({ok:false,error:code}));
}

async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) {
      const e = new Error('BODY_TOO_LARGE'); e.status = 413; throw e;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** Create testable server without initiating any external network or service mutation. */
export function createJMCloudRunRelay({publicOrigin=process.env.JM_PUBLIC_ORIGIN, handler=onRequest}={}) {
  const origin = normalizedOrigin(publicOrigin);
  return http.createServer(async (req, res) => {
    try {
      if (!origin) return error(res, 503, 'CONFIG_HOLD_PUBLIC_ORIGIN');
      if (!['GET','POST'].includes(req.method)) return error(res, 405, 'METHOD_NOT_ALLOWED');
      const path = new URL(req.url, 'http://localhost');
      if (path.pathname !== ROUTE) return error(res, 404, 'ROUTE_NOT_FOUND');
      // Never reconstruct target URLs from Host or X-Forwarded-* headers.
      if (req.headers['transfer-encoding'] && req.headers['content-length'])
        return error(res, 400, 'AMBIGUOUS_BODY');
      if (req.method === 'GET' && (req.headers['content-length'] || req.headers['transfer-encoding']))
        return error(res, 400, 'GET_BODY_NOT_ALLOWED');
      const body = req.method === 'POST' ? await readBody(req) : undefined;
      const upstreamRequest = new Request(origin + ROUTE + path.search, {
        method: req.method,
        headers: {
          ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
          ...(req.headers.origin ? { origin: req.headers.origin } : {}),
          ...(req.headers['content-type'] ? { 'content-type': req.headers['content-type'] } : {}),
        },
        ...(req.method === 'POST' ? {body} : {}),
      });
      // The inherited Estate relay enforces fixed target, allowlisted routes,
      // scoped bearer, Origin guard, JSON, target timeout, and redirect denial.
      const response = await handler({request: upstreamRequest});
      if (!response || !(response instanceof Response)) return error(res,502,'RELAY_BAD_RESPONSE');
      const text = await response.text();
      if (Buffer.byteLength(text) > 65536) return error(res, 502, 'RELAY_REPLY_TOO_LARGE');
      if (!response.headers.get('content-type')?.includes('application/json'))
        return error(res, 502, 'RELAY_REPLY_NOT_JSON');
      res.writeHead(response.status, REPLY_HEADERS);
      res.end(text);
    } catch (err) {
      if (!res.headersSent) error(res, err?.status === 413 ? 413 : 502,
        err?.status === 413 ? 'BODY_TOO_LARGE' : 'RELAY_FAILED');
      else res.destroy();
    }
  });
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const port = Number(process.env.PORT || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('INVALID_PORT');
  const server = createJMCloudRunRelay();
  server.listen(port, '0.0.0.0'); // Cloud Run requires 0.0.0.0:$PORT.
}
