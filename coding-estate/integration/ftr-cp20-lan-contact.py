"""JM FTR CP20: opt-in source-only LAN contact; NEVER gameplay authority.
Serves the original game and exact imported JM donors without duplicating assets.
No firewall rules, network profile changes, internet tunnel, or publication.
"""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

REPO = Path(__file__).resolve().parents[2]
GAME = '/estate-publication/apps-tools-games/games/'
GAME_DIRS = (GAME + 'ftr-first-person-v0.5.1/', GAME + 'ftr-first-person-v0.5.1-r1/')
DONOR_FILES = {
    '/coding-estate/sovereign-ten/direct/game-native.mjs',
    '/coding-estate/sovereign-ten/direct/native-core.mjs',
    '/coding-estate/sovereign-batch-six/direct/game-input-native-a.mjs',
    '/coding-estate/sovereign-batch-six/direct/native-core.mjs',
    '/coding-estate/integration/ftr-eight-contact.mjs',
}
GAME_URL = GAME_DIRS[1] + 'index.html'

class FTRSourceOnly(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO), **kwargs)

    def permitted(self):
        uri = urlsplit(self.path)
        path = unquote(uri.path)
        if '\\' in path or any(p in ('.', '..') for p in path.split('/')):
            return False
        return any(path.startswith(prefix) for prefix in GAME_DIRS) or path in DONOR_FILES

    def do_GET(self):
        if self.permitted(): return super().do_GET()
        self.send_error(403, 'Only original FTR and exact JM coding donors')

    def do_HEAD(self):
        if self.permitted(): return super().do_HEAD()
        self.send_error(403, 'Only original FTR and exact JM coding donors')

    def list_directory(self, path):
        self.send_error(403, 'Directory browsing disabled')
        return None

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Source-exact FTR local/LAN test contact')
    parser.add_argument('--host', default='127.0.0.1', help='Explicit owner-approved interface IP; localhost by default')
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    assert (REPO / GAME_URL.lstrip('/')).is_file(), 'ORIGINAL_FTR_SOURCE_MISSING'
    if args.host not in ('127.0.0.1','::1','localhost'):
        print('LAN TEST ONLY: device must be on reachable private network; no firewall changes or public deploy')
    print('FTR CP20 URL:', f'http://{args.host}:{args.port}{GAME_URL}', flush=True)
    try: ThreadingHTTPServer((args.host, args.port), FTRSourceOnly).serve_forever()
    except KeyboardInterrupt: pass

[executed on device: GroundZeroJM (397d444c-e212-4670-878b-c8937ca2f05a)]