"""Minimal stdlib MCP transport for JM Workshop and generated read-only recipe servers.

Dual-era JSON-RPC MCP 2025-03-26 / 2025-06-18 / 2025-11-25 and 2026-07-28:
initialize, ping, tools/list, tools/call, resources/list/read, prompts/list/get.
Streamable HTTP is stateless JSON-response mode; SSE and server-initiated
notifications are intentionally unsupported; no GET SSE stream or MCP sessions.
management or authentication is claimed. Add an authenticated gateway before
any future write capability.  Separate from JM Build Mesh.
"""
from __future__ import annotations
import json
import pathlib
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PROTOCOLS=('2025-03-26','2025-06-18','2025-11-25')
MODERN='2026-07-28'
MAX_BODY=131072


def _reject_duplicates(pairs):
    d={}
    for k,v in pairs:
        if k in d: raise ValueError('duplicate JSON property')
        d[k]=v
    return d


def _j(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',',':'),allow_nan=False)


def _err(id, code, message):
    return {'jsonrpc':'2.0','id':id,'error':{'code':code,'message':message}}


def _content(result):
    return {'content':[{'type':'text','text':_j(result)}],'structuredContent':result,'isError':False}


class Dispatch:
    def __init__(self,name,version,tools,handlers,resources=None,read_resource=None):
        self.name=name;self.version=version;self.tools=tools;self.handlers=handlers
        self.resources=resources or [];self.read_resource=read_resource
        assert {t['name'] for t in tools}==set(handlers), 'tool discovery and dispatch mismatch'

    def rpc(self,obj,modern=False):
        if not isinstance(obj,dict): return _err(None,-32600,'JSON-RPC request must be object')
        reqid=obj.get('id')
        if obj.get('jsonrpc')!='2.0' or not isinstance(obj.get('method'),str):
            return _err(reqid,-32600,'invalid JSON-RPC request')
        method=obj['method'];params=obj.get('params',{})
        if not isinstance(params,dict):return _err(reqid,-32602,'params must be object')
        if method.startswith('notifications/'):
            return None
        if reqid is None or type(reqid) not in (int,str):return _err(None,-32600,'request id required')
        try:
            if modern and method=='server/discover':
                data={'resultType':'complete','supportedVersions':[MODERN,*reversed(PROTOCOLS)],
                      'capabilities':{'tools':{'listChanged':False},'resources':{},'prompts':{}},
                      '_meta':{'io.modelcontextprotocol/serverInfo':{'name':self.name,'version':self.version}},
                      'ttlMs':300000,'cacheScope':'public'}
            elif method=='initialize':
                version=params.get('protocolVersion')
                if version not in PROTOCOLS:version=PROTOCOLS[-1]
                data={'protocolVersion':version,'capabilities':{'tools':{'listChanged':False},
                      'resources':{'listChanged':False},'prompts':{'listChanged':False}},
                      'serverInfo':{'name':self.name,'version':self.version}}
            elif method=='ping':data={}
            elif method=='tools/list':data={'tools':self.tools}
            elif method=='tools/call':
                name=params.get('name');args=params.get('arguments',{})
                if name not in self.handlers:return _err(reqid,-32602,'unknown MCP tool')
                if not isinstance(args,dict):return _err(reqid,-32602,'tool arguments must be object')
                try:data=_content(self.handlers[name](args))
                except (ValueError,TypeError,OverflowError,KeyError) as e:
                    data={'content':[{'type':'text','text':str(e)[:500]}],'isError':True}
            elif method=='resources/list':data={'resources':self.resources}
            elif method=='resources/read':
                if not self.read_resource:return _err(reqid,-32602,'no resources')
                uri=params.get('uri')
                value=self.read_resource(uri)
                data={'contents':[{'uri':uri,'mimeType':'application/json','text':_j(value)}]}
            elif method=='prompts/list':
                data={'prompts':[{'name':'design_safe_capability','description':'Help define a bounded JM Workshop MCP tool',
                    'arguments':[{'name':'purpose','description':'The desired capability and real-world outcome','required':True}]}]}
            elif method=='prompts/get':
                if params.get('name')!='design_safe_capability':return _err(reqid,-32602,'unknown prompt')
                purpose=(params.get('arguments') or {}).get('purpose','')
                if not isinstance(purpose,str) or not 1<=len(purpose)<=500: return _err(reqid,-32602,'purpose must be bounded text')
                data={'messages':[{'role':'user','content':{'type':'text','text':
                    'Design a declarative JM MCP Workshop recipe for: '+purpose+'. Use workshop://recipe/example as a reference. No arbitrary scripts, external writes or unapproved JM body access. Return a complete recipe with explicit inputs, steps and outputs.'}}]}
            else:return _err(reqid,-32601,'method not found')
            if modern and isinstance(data,dict) and 'resultType' not in data:
                data={'resultType':'complete',**data}
            return {'jsonrpc':'2.0','id':reqid,'result':data}
        except (ValueError,TypeError,KeyError,OverflowError) as e:
            return _err(reqid,-32602,str(e)[:500])


def serve(name,version,tools,handlers,resources=None,read_resource=None):
    app=Dispatch(name,version,tools,handlers,resources,read_resource)
    if '--stdio' in sys.argv:
        for line in sys.stdin:
            if len(line)>MAX_BODY:continue
            try:result=app.rpc(json.loads(line,object_pairs_hook=_reject_duplicates))
            except (ValueError,TypeError,json.JSONDecodeError):result=_err(None,-32700,'invalid JSON')
            if result is not None:
                sys.stdout.write(_j(result)+'\n');sys.stdout.flush()
        return
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args):return
        def _send_asset(self, name, mime):
            """Only predefined local UI assets; never read a caller-selected path."""
            data=(pathlib.Path(__file__).resolve().parent/name).read_bytes()
            self.send_response(200)
            self.send_header('Content-Type',mime)
            self.send_header('Content-Length',str(len(data)))
            self.send_header('Cache-Control','no-store')
            self.send_header('X-Content-Type-Options','nosniff')
            self.send_header('Referrer-Policy','no-referrer')
            self.send_header('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
            self.end_headers()
            self.wfile.write(data)
        def _cors_headers(self,status):
            """Browser contact: allow only exact admitted origins (never wildcard).
            A denied preflight must not acquire a browser access grant.
            """
            if self.command=='OPTIONS' and status!=204:return
            origin=self.headers.get('Origin','')
            if origin and self._origin_allowed():
                self.send_header('Access-Control-Allow-Origin',origin)
                self.send_header('Vary','Origin')
                self.send_header('Access-Control-Allow-Methods','POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers',
                    'Accept, Authorization, Content-Type, MCP-Protocol-Version, Mcp-Method, Mcp-Name, Mcp-Session-Id, Last-Event-ID')
                self.send_header('Access-Control-Max-Age','600')
        def _send(self,status,body,ctype='application/json'):
            data=_j(body).encode('utf-8') if body is not None else b''
            self.send_response(status)
            self.send_header('Content-Type',ctype)
            self.send_header('Content-Length',str(len(data)))
            self.send_header('Cache-Control','no-store')
            self.send_header('X-Content-Type-Options','nosniff')
            self._cors_headers(status)
            self.end_headers()
            if data:self.wfile.write(data)
        def _origin_allowed(self):
            origin=self.headers.get('Origin','')
            if not origin:return True
            allowed={'https://chatgpt.com','https://gemini.google.com','https://jm-mcp-workshop.onrender.com',
                     'http://127.0.0.1','http://localhost'}
            # A served owner UI must be allowed to POST back to its own canonical
            # host; never accept arbitrary matching Host/Origin supplied by clients.
            port=os.environ.get('PORT','10000')
            allowed.update({'http://127.0.0.1:'+port,'http://localhost:'+port})
            env=os.environ.get('JM_WORKSHOP_ALLOWED_ORIGINS','')
            allowed.update(x.strip() for x in env.split(',') if x.strip())
            return origin in allowed
        def _auth(self):
            token=os.environ.get('JM_WORKSHOP_TOKEN','')
            if not token:return True
            import hmac
            return hmac.compare_digest(self.headers.get('Authorization',''), 'Bearer '+token)
        def do_GET(self):
            if self.path in ('/','/workshop') and name=='JM MCP WORKSHOP': return self._send_asset('workshop.html','text/html; charset=utf-8')
            if self.path=='/workshop.css' and name=='JM MCP WORKSHOP': return self._send_asset('workshop.css','text/css; charset=utf-8')
            if self.path=='/workshop.js' and name=='JM MCP WORKSHOP': return self._send_asset('workshop.js','application/javascript; charset=utf-8')
            if self.path=='/healthz':
                self._send(200,{'service':name,'version':version,'mcp_endpoint':'/mcp',
                      'safety':'READ_ONLY_DECLARATIVE','authorization_required':bool(os.environ.get('JM_WORKSHOP_TOKEN'))})
            elif self.path=='/mcp':self._send(405,{'error':'Streamable HTTP: POST JSON-RPC to /mcp. SSE GET is not enabled.'})
            else:self._send(404,{'error':'unknown path'})
        def do_OPTIONS(self):
            # A browser sends preflight before JSON-RPC POST (Content-Type application/json).
            if self.path!='/mcp':return self._send(404,{'error':'unknown path'})
            if not self._origin_allowed():return self._send(403,{'error':'Origin forbidden'})
            requested_method=self.headers.get('Access-Control-Request-Method','').upper()
            if requested_method not in ('','POST'):return self._send(405,{'error':'Method forbidden'})
            allowed={'accept','authorization','content-type','mcp-protocol-version',
                     'mcp-method','mcp-name','mcp-session-id','last-event-id'}
            requested={h.strip().lower() for h in self.headers.get('Access-Control-Request-Headers','').split(',') if h.strip()}
            if not requested.issubset(allowed):return self._send(403,{'error':'Request header forbidden'})
            return self._send(204,None)
        def do_POST(self):
            if self.path!='/mcp':return self._send(404,{'error':'unknown path'})
            if not self._origin_allowed():return self._send(403,{'error':'Origin forbidden'})
            if not self._auth():return self._send(401,{'error':'Bearer token required'})
            version_header=self.headers.get('MCP-Protocol-Version')
            if version_header and version_header not in PROTOCOLS+(MODERN,):
                return self._send(400,{'jsonrpc':'2.0','id':None,'error':{'code':-32022,
                  'message':'Unsupported protocol version','data':{'supported':[MODERN,*reversed(PROTOCOLS)],'requested':version_header}}})
            if 'application/json' not in self.headers.get('Content-Type',''):return self._send(415,{'error':'application/json required'})
            try:n=int(self.headers.get('Content-Length','0'))
            except ValueError:return self._send(400,{'error':'bad length'})
            if n<1 or n>MAX_BODY:return self._send(413,{'error':'body size exceeded'})
            try:payload=json.loads(self.rfile.read(n),object_pairs_hook=_reject_duplicates)
            except (ValueError,TypeError):return self._send(400,_err(None,-32700,'invalid JSON'))
            modern=version_header==MODERN or (
                isinstance(payload,dict) and isinstance(payload.get('params'),dict)
                and isinstance(payload['params'].get('_meta'),dict)
                and payload['params']['_meta'].get('io.modelcontextprotocol/protocolVersion')==MODERN)
            if modern:
                def mismatch(what):
                    return self._send(400,{'jsonrpc':'2.0','id':payload.get('id') if isinstance(payload,dict) else None,
                         'error':{'code':-32020,'message':'MCP header or metadata mismatch: '+what}})
                if not isinstance(payload,dict):return mismatch('request')
                params=payload.get('params',{})
                if not isinstance(params,dict):return mismatch('params')
                meta=params.get('_meta',{})
                if not isinstance(meta,dict) or meta.get('io.modelcontextprotocol/protocolVersion')!=MODERN:
                    return mismatch('protocol metadata')
                if not isinstance(meta.get('io.modelcontextprotocol/clientCapabilities'),dict):
                    return mismatch('clientCapabilities')
                if version_header!=MODERN:return mismatch('MCP-Protocol-Version')
                if self.headers.get('Mcp-Method')!=payload.get('method'):return mismatch('Mcp-Method')
                method=payload.get('method')
                if method in ('tools/call','prompts/get','resources/read'):
                    key='uri' if method=='resources/read' else 'name'
                    if self.headers.get('Mcp-Name')!=params.get(key):return mismatch('Mcp-Name')
                accept=self.headers.get('Accept','')
                if 'application/json' not in accept or 'text/event-stream' not in accept:
                    return mismatch('Accept')
            result=app.rpc(payload,modern=modern)
            self._send(202 if result is None else 200,result)
    server=ThreadingHTTPServer((os.environ.get('HOST','0.0.0.0'),int(os.environ.get('PORT','10000'))),Handler)
    try:server.serve_forever()
    finally:server.server_close()
