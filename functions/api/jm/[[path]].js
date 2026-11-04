// Cloudflare Pages adapter: existing JM ECOSTATE home; portable core owns logic.
// No secrets, storage bindings, HTTP proxy, or mutation abilities at this API face.
import { handleJMApi } from '../../../jm-api/core.mjs';
export async function onRequest({ request }) { return handleJMApi(request); }
