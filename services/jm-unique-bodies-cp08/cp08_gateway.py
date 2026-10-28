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
import threading
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

import server
import cp07_atomic_runtime as cp07
import atlas_custody

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
    def __init__(self,addr,atlas,secret,origin,extra_origins=(),
                 custody_enabled=False,custody_token=''):
        self.atlas=atlas;self.secret=secret;self.origin=origin.rstrip('/')
        self.browser_origins=frozenset((self.origin,*extra_origins))
        self.custody_enabled=custody_enabled
        self.custody_token=custody_token
        self.custody_lock=threading.Lock()
        self.custody_consumed=False
        super().__init__(addr,Handler)

class Handler(BaseHTTPRequestHandler):
    server_version='JMCP08'
    sys_version=''
    def log_message(self,fmt,*args):
        # Don't log URL query values or credentials.
        pass
    def cors_headers(self,status):
        # Original Workshop/CP09 donor: private custody route and its refusals
        # must never gain browser CORS privileges from the separate MCP route.
        if urlsplit(self.path).path!='/mcp':return
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
    def custody_export(self):
        # Disabled by default. No browser Origin, cookies, query or GET export.
        # Exact owner bearer + separately issued private custody grant required.
        if not self.server.custody_enabled:
            return self.reply(404,{'error':'NOT_FOUND'})
        if self.headers.get('Origin') is not None or self.headers.get('Cookie') is not None:
            return self.reply(403,{'error':'NON_BROWSER_OPERATOR_ONLY'})
        if not self.authenticated():
            return self.reply(401,{'error':'BEARER_REQUIRED'})
        supplied=self.headers.get('X-JM-Custody-Grant','')
        if not hmac.compare_digest(supplied.encode(),self.server.custody_token.encode()):
            return self.reply(403,{'error':'CUSTODY_GRANT_REQUIRED'})
        if self.headers.get('Content-Length','0') not in ('','0'):
            return self.reply(413,{'error':'EMPTY_POST_REQUIRED'})
        with self.server.custody_lock:
            if self.server.custody_consumed:
                return self.reply(409,{'error':'CUSTODY_ONCE_ALREADY_CONSUMED'})
            self.server.custody_consumed=True
        try:
            with tempfile.TemporaryDirectory(prefix='jmcp10-one-shot-') as temp:
                archive=Path(temp)/'JM_CP10_ATLAS_CUSTODY.zip'
                saved=atlas_custody.snapshot(self.server.atlas.db_path,archive)
                self.send_response(200)
                self.send_header('Content-Type','application/zip')
                self.send_header('Content-Length',str(archive.stat().st_size))
                self.send_header('Cache-Control','private, no-store')
                self.send_header('X-Content-Type-Options','nosniff')
                self.send_header('Content-Disposition',
                                 'attachment; filename="JM_CP10_ATLAS_CUSTODY.zip"')
                self.send_header('X-JM-Archive-SHA256',saved['archive_sha256'])
                self.send_header('X-JM-Export-One-Shot','true')
                self.send_header('Referrer-Policy','no-referrer')
                self.end_headers()
                with archive.open('rb') as source:
                    while chunk:=source.read(65536):
                        self.wfile.write(chunk)
        except (OSError,ValueError,sqlite3.Error) as exc:
            # No sensitive source data or secret leaked into error response/log.
            try:return self.reply(503,{'error':'CUSTODY_SNAPSHOT_HOLD'})
            except (OSError,BrokenPipeError):return

    def do_POST(self):
        route=urlsplit(self.path)
        if route.path=='/custody/export' and not route.query:
            return self.custody_export()
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
    custody_flag=os.getenv('CP08_CUSTODY_EXPORT_ONCE','').strip()
    custody_token=os.getenv('JM_BODIES_CUSTODY_TOKEN','')
    if custody_flag not in ('','0','1'):
        raise SystemExit('HOLD: CP08_CUSTODY_EXPORT_ONCE must be 0 or 1')
    if custody_flag=='1' and (len(custody_token)<32 or custody_token==token):
        raise SystemExit('HOLD: independent JM_BODIES_CUSTODY_TOKEN of >=32 characters required')
    atlas=server.Atlas(args.db);cp07.init(atlas)
    with Gateway((args.host,args.port),atlas,token,explicit,extra,
                 custody_enabled=custody_flag=='1',custody_token=custody_token) as g:
        print('CP08 ready /health /fold /mcp',file=sys.stderr,flush=True)
        g.serve_forever()
if __name__=='__main__':main()
