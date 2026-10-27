"""CP08 owner/device HTTPS gateway over protected CP07 MCP runtime.

No independent fake donor; every write goes through server.dispatch ->
cp07_atomic_runtime.execute -> SHA-pinned original JS donor via Node -> Atlas SQLite.
Bearer secret must come from an environment variable. The browser serves same origin.
"""
import argparse
import hmac
import json
import os
import re
import sys
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

import server
import cp07_atomic_runtime as cp07
import cp09_custody as custody

ROOT=Path(__file__).resolve().parent
VERSION='0.8.0-cp08'
ALLOWED={'atomic_contact_execute','atomic_contact_history'}
# Inherited CORS discipline from sovereign JM MCP Workshop CP04.
# Extra browser origins are strictly opt-in. No implicit provider grants.
PREFLIGHT_HEADERS={
    'accept','authorization','content-type','mcp-protocol-version',
    'mcp-method','mcp-name','mcp-session-id','last-event-id'
}

class Gateway(ThreadingHTTPServer):
    daemon_threads=True
    allow_reuse_address=True
    def __init__(self,addr,atlas,secret,origin,extra_origins=(),custody_secret=''):
        self.atlas=atlas;self.secret=secret;self.origin=origin.rstrip('/')
        self.custody_secret=custody_secret
        self.browser_origins=frozenset((self.origin,*extra_origins))
        super().__init__(addr,Handler)

class Handler(BaseHTTPRequestHandler):
    server_version='JMCP08'
    sys_version=''
    def log_message(self,fmt,*args):
        # Don't log URL query values or credentials.
        pass
    def cors_headers(self,status):
        if self.command=='OPTIONS' and status!=204:return
        origin=self.headers.get('Origin','')
        if origin and origin in self.server.browser_origins:
            self.send_header('Access-Control-Allow-Origin',origin)
            self.send_header('Vary','Origin')
            self.send_header('Access-Control-Allow-Methods','POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers',
                             ', '.join(sorted(PREFLIGHT_HEADERS)))
            self.send_header('Access-Control-Max-Age','600')
    def reply(self,status,obj,headers=None):
        data=b'' if status==204 else server.canon(obj).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','no-referrer')
        self.send_header('X-Frame-Options','DENY')
        self.cors_headers(status)
        for k,v in (headers or {}).items():self.send_header(k,v)
        self.end_headers()
        if data:self.wfile.write(data)
    def authenticated(self):
        val=self.headers.get('Authorization','')
        return hmac.compare_digest(val.encode(),('Bearer '+self.server.secret).encode())
    def trusted_origin(self):
        o=self.headers.get('Origin')
        return not o or o in self.server.browser_origins
    def do_OPTIONS(self):
        route=urlsplit(self.path)
        if route.path!='/mcp' or route.query:
            return self.reply(404,{'error':'NOT_FOUND'})
        # OPTIONS never authorizes a write: exact origin, method and headers only.
        if not self.headers.get('Origin') or not self.trusted_origin():
            return self.reply(403,{'error':'ORIGIN_HOLD'})
        if self.headers.get('Access-Control-Request-Method','').upper()!='POST':
            return self.reply(405,{'error':'METHOD_HOLD'})
        requested={x.strip().lower() for x in
            self.headers.get('Access-Control-Request-Headers','').split(',')
            if x.strip()}
        if not requested.issubset(PREFLIGHT_HEADERS):
            return self.reply(403,{'error':'PREFLIGHT_HEADER_HOLD'})
        return self.reply(204,None)
    def do_GET(self):
        route=urlsplit(self.path)
        if route.query:return self.reply(400,{'error':'QUERY_STRINGS_DISABLED'})
        if route.path=='/custody/export':
            # Separate offline owner-custody channel. Disabled unless BOTH an
            # explicit server-side switch and a second owner secret are set.
            # No browser Origin/CORS: even an admitted MCP browser origin does
            # not gain full raw SQLite custody.
            if not self.server.custody_secret:
                return self.reply(404,{'error':'CUSTODY_EXPORT_DISABLED'})
            if self.headers.get('Origin') is not None:
                return self.reply(403,{'error':'BROWSER_CUSTODY_HOLD'})
            if not self.authenticated():
                return self.reply(401,{'error':'BEARER_REQUIRED'})
            custody_auth=self.headers.get('X-JM-Custody-Token','')
            if not hmac.compare_digest(custody_auth.encode(),
                                       self.server.custody_secret.encode()):
                return self.reply(401,{'error':'SECOND_OWNER_SECRET_REQUIRED'})
            if self.headers.get('Range') is not None:
                return self.reply(400,{'error':'RANGE_NOT_SUPPORTED'})
            try:
                with tempfile.TemporaryDirectory() as temporary:
                    archive=Path(temporary)/'cp09-cold-owner-custody.zip'
                    custody.capsule_backup(Path(self.server.atlas.db_path),archive)
                    packed=archive.read_bytes()
            except (OSError,ValueError):
                return self.reply(409,{'error':'CUSTODY_INTEGRITY_HOLD'})
            # Never log, cache, inline-print, or attach this private content.
            self.send_response(200)
            self.send_header('Content-Type','application/zip')
            self.send_header('Content-Disposition',
                'attachment; filename="JM_CP09_OWNER_COLD_CUSTODY.zip"')
            self.send_header('Content-Length',str(len(packed)))
            self.send_header('Cache-Control','no-store, private')
            self.send_header('X-Content-Type-Options','nosniff')
            self.send_header('Referrer-Policy','no-referrer')
            self.send_header('Cross-Origin-Resource-Policy','same-origin')
            self.end_headers()
            self.wfile.write(packed)
            return
        if route.path=='/health':return self.reply(200,{'ok':True,'version':VERSION,'persistence':'SQLITE_BACKEND_HOST_DEPENDENT','mode':'MCP_ACTUAL_HTTP'})
        if route.path not in ('/','/fold'):return self.reply(404,{'error':'NOT_FOUND'})
        data=(ROOT/'CP08_FOLD_PORTAL.html').read_bytes()
        self.send_response(200)
        self.send_header('Content-Type','text/html; charset=utf-8')
        self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store')
        self.send_header('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; script-src 'sha256-FbhmsiYxmIBOgA8FINdnCKzejRxHcOADYpGG9sQ/3ks='; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','no-referrer')
        self.send_header('X-Frame-Options','DENY')
        self.end_headers();self.wfile.write(data)
    def do_POST(self):
        route=urlsplit(self.path)
        if route.path!='/mcp' or route.query:return self.reply(404,{'error':'NOT_FOUND'})
        if not self.trusted_origin():return self.reply(403,{'error':'ORIGIN_HOLD'})
        if not self.authenticated():return self.reply(401,{'error':'BEARER_REQUIRED'})
        if self.headers.get('Content-Type','').split(';')[0].strip().lower()!='application/json':return self.reply(415,{'error':'JSON_REQUIRED'})
        try:length=int(self.headers.get('Content-Length','0'))
        except ValueError:return self.reply(400,{'error':'INVALID_LENGTH'})
        if length<=0 or length>256_000:return self.reply(413,{'error':'BOUNDED_BODY_REQUIRED'})
        try:r=json.loads(self.rfile.read(length))
        except (UnicodeDecodeError,json.JSONDecodeError):return self.reply(400,{'error':'INVALID_JSON'})
        if not isinstance(r,dict):return self.reply(400,{'error':'JSON_RPC_OBJECT_REQUIRED'})
        if r.get('jsonrpc')!='2.0' or r.get('method') not in ('tools/list','tools/call','initialize','ping','server/discover'):
            return self.reply(403,{'error':'METHOD_HOLD'})
        if r.get('method')=='tools/call':
            p=r.get('params')
            if not isinstance(p,dict) or p.get('name') not in ALLOWED:
                return self.reply(403,{'error':'TOOL_SCOPE_HOLD'})
            a=p.get('arguments',{})
            if not isinstance(a,dict) or len(a)>6:return self.reply(400,{'error':'INVALID_TOOL_ARGUMENTS'})
        # Match the existing JM Atlas dual-era HTTP contract rather than
        # exposing server/discover without its required modern headers.
        version=self.headers.get('MCP-Protocol-Version')
        if version==server.MODERN:
            accept=self.headers.get('Accept','')
            if 'application/json' not in accept or 'text/event-stream' not in accept:
                return self.reply(406,{'error':'MODERN_ACCEPT_HOLD'})
            declared=((r.get('params') or {}).get('_meta') or {}).get(
                'io.modelcontextprotocol/protocolVersion') if isinstance(r.get('params'),dict) else None
            if declared!=version or self.headers.get('Mcp-Method')!=r.get('method'):
                return self.reply(400,{'error':'MODERN_HEADER_MISMATCH'})
            if r.get('method')=='tools/call' and self.headers.get('Mcp-Name')!=(r.get('params') or {}).get('name'):
                return self.reply(400,{'error':'MODERN_TOOL_HEADER_MISMATCH'})
        elif version and version not in server.VERSIONED:
            return self.reply(400,{'error':'UNSUPPORTED_PROTOCOL_VERSION'})
        if r.get('method')=='server/discover' and version!=server.MODERN:
            return self.reply(400,{'error':'MODERN_DISCOVERY_REQUIRED'})
        # Delegate to authentic protected dispatcher, not an invented RPC implementation.
        reply=server.dispatch(self.server.atlas,r)
        if r['method']=='tools/list' and reply and 'result' in reply:
            reply['result']['tools']=[x for x in reply['result']['tools'] if x['name'] in ALLOWED]
        return self.reply(202 if reply is None else 200,reply)

def main():
    a=argparse.ArgumentParser()
    a.add_argument('--host',default='127.0.0.1')
    a.add_argument('--port',type=int,default=int(os.getenv('PORT','8765')))
    a.add_argument('--db',default=os.getenv('JM_BODIES_DB','/tmp/jm-cp08-atlas.sqlite3'))
    args=a.parse_args()
    token=os.getenv('JM_BODIES_TOKEN','')
    if len(token)<24:raise SystemExit('HOLD: set a random JM_BODIES_TOKEN of >=24 chars; no public unauthenticated service')
    explicit=os.getenv('CP08_PUBLIC_ORIGIN','').rstrip('/')
    if not explicit:
        if args.host in ('127.0.0.1','localhost','::1'):
            explicit='http://127.0.0.1:'+str(args.port)
        else:raise SystemExit('HOLD: CP08_PUBLIC_ORIGIN must be set when binding beyond localhost')
    if not re.fullmatch(r'https://[\w.-]+(?::\d+)?|http://(?:127\.0\.0\.1|localhost)(?::\d+)?',explicit):
        raise SystemExit('HOLD: CP08_PUBLIC_ORIGIN requires HTTPS (except loopback)')
    # Additional browser origins are opt-in and never wildcard or HTTP remote.
    extra=tuple(x.strip() for x in os.getenv('CP08_ALLOWED_BROWSER_ORIGINS','').split(',') if x.strip())
    if any(not re.fullmatch(r'https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?',x)
           or x.endswith('.') for x in extra):
        raise SystemExit('HOLD: CP08_ALLOWED_BROWSER_ORIGINS requires exact HTTPS origins')
    switch=os.getenv('JM_CP09_EXPORT_ENABLE','')
    if switch not in ('','0','1'):
        raise SystemExit('HOLD: JM_CP09_EXPORT_ENABLE must be 0 or 1')
    custody_secret=os.getenv('JM_CP09_EXPORT_SECRET','')
    if switch=='1' and (len(custody_secret)<32 or custody_secret==token):
        raise SystemExit('HOLD: CP09 export requires an independent 32+ character owner secret')
    if switch!='1':custody_secret=''
    atlas=server.Atlas(args.db);cp07.init(atlas)
    with Gateway((args.host,args.port),atlas,token,explicit,extra,custody_secret) as g:
        print('CP08 ready /health /fold /mcp',file=sys.stderr,flush=True)
        g.serve_forever()
if __name__=='__main__':main()
