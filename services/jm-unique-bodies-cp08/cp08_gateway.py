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
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

import server
import cp07_atomic_runtime as cp07

ROOT=Path(__file__).resolve().parent
VERSION='0.8.0-cp08'
ALLOWED={'atomic_contact_execute','atomic_contact_history'}

class Gateway(ThreadingHTTPServer):
    daemon_threads=True
    allow_reuse_address=True
    def __init__(self,addr,atlas,secret,origin):
        self.atlas=atlas;self.secret=secret;self.origin=origin.rstrip('/')
        super().__init__(addr,Handler)

class Handler(BaseHTTPRequestHandler):
    server_version='JMCP08'
    sys_version=''
    def log_message(self,fmt,*args):
        # Don't log URL query values or credentials.
        pass
    def reply(self,status,obj,headers=None):
        data=server.canon(obj).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','no-referrer')
        self.send_header('X-Frame-Options','DENY')
        for k,v in (headers or {}).items():self.send_header(k,v)
        self.end_headers();self.wfile.write(data)
    def authenticated(self):
        val=self.headers.get('Authorization','')
        return hmac.compare_digest(val.encode(),('Bearer '+self.server.secret).encode())
    def trusted_origin(self):
        o=self.headers.get('Origin')
        return not o or o==self.server.origin
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
        if r.get('jsonrpc')!='2.0' or r.get('method') not in ('tools/list','tools/call','initialize','ping'):
            return self.reply(403,{'error':'METHOD_HOLD'})
        if r.get('method')=='tools/call':
            p=r.get('params')
            if not isinstance(p,dict) or p.get('name') not in ALLOWED:
                return self.reply(403,{'error':'TOOL_SCOPE_HOLD'})
            a=p.get('arguments',{})
            if not isinstance(a,dict) or len(a)>6:return self.reply(400,{'error':'INVALID_TOOL_ARGUMENTS'})
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
    atlas=server.Atlas(args.db);cp07.init(atlas)
    with Gateway((args.host,args.port),atlas,token,explicit) as g:
        print('CP08 ready /health /fold /mcp',file=sys.stderr,flush=True)
        g.serve_forever()
if __name__=='__main__':main()
