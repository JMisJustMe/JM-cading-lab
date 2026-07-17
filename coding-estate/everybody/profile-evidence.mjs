import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

export async function loadRecovered53Profiles(url = new URL('./recovered-53-profiles.json.gz.b64', import.meta.url)) {
  const encoded = (await readFile(url, 'utf8')).trim();
  const decoded = gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8');
  const data = JSON.parse(decoded);
  if (data.schema !== 'jm.everybody.recovered-profiles/1.1' || data.count !== data.profiles.length) {
    throw new Error('Recovered 53-body profile carrier failed schema/count validation.');
  }
  return data;
}
