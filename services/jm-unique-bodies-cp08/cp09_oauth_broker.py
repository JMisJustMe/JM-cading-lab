"""JM CP09 OAuth HTTPS connection seat. Forwards to original CP08 MCP, never owns Atlas.
OAuth 2.1 client, owner-consent PKCE, token and scope verification performed
before every forwarded request. Existing CP08 bearer and Fold portal unchanged.
"""
import argparse
import json
import os
import re
import secrets
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlsplit,parse_qs
from cp09_oauth import consent_form,parse_form
from cp09_remote_admission import RemoteAdmission,UPSTREAM
ALLOWED={'atomic_contact_execute','atomic_contact_history'}
TRUSTED={'https://chatgpt.com','https://gemini.google.com'}
class Gateway(ThreadingHTTPServer):
    daemon_threads=True
    allow_reuse_address=True
    def __init__(self,addr,origin,upstream):
        self.origin=origin
        self.admission=RemoteAdmission(origin,upstream)
        super().__init__(addr,Handler)
class Handler(BaseHTTPRequestHandler):
    server_version='JM-CP09-OAuth'
    sys_version=''
    def log_message(self,*args):pass
    def reply(self,status,obj,headers=None):
        body=json.dumps(obj,separators=(',',':'),ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(body)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        if status==401:
            self.send_header('WWW-Authenticate','Bearer resource_metadata="'+self.server.origin+'/.well-known/oauth-protected-resource/mcp"')
        origin=self.headers.get('Origin')
        if origin in TRUSTED:
            self.send_header('Access-Control-Allow-Origin',origin)
            self.send_header('Vary','Origin')
        for name,value in (headers or {}).items():self.send_header(name,value)
        self.end_headers();self.wfile.write(body)
    def reply_html(self,body):
        raw=body.encode()
        self.send_response(200)
        self.send_header('Content-Type','text/html; charset=utf-8')
        self.send_header('Content-Length',str(len(raw)))
        self.send_header('Cache-Control','no-store')
        self.send_header('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'")
        self.send_header('Referrer-Policy','no-referrer')
        self.end_headers();self.wfile.write(raw)
    def redirect(self,uri):
        self.send_response(302)
        self.send_header('Location',uri)
        self.send_header('Cache-Control','no-store')
        self.send_header('Referrer-Policy','no-referrer')
        self.send_header('Content-Length','0')
        self.end_headers()
    def read(self,n=16384):
        try:size=int(self.headers.get('Content-Length','0'))
        except ValueError:raise ValueError('LENGTH_INVALID')
        if size<1 or size>n:raise ValueError('BODY_LIMIT')
        return self.rfile.read(size)
    def do_GET(self):
        path=urlsplit(self.path)
        if path.path=='/health' and not path.query:
            return self.reply(200,{'name':'JM Unique Bodies CP09 OAuth Admission',
                'version':'0.9.0-cp09','backend':'ORIGINAL_CP08_NOT_REPLACED',
                'auth':'OAUTH_PKCE_OWNER_CONSENT',
                'state':'ADMISSION_ROUTE_NO_SEPARATE_ATLAS'})
        if path.path in ('/.well-known/oauth-protected-resource','/.well-known/oauth-protected-resource/mcp',
                '/.well-known/oauth-authorization-server','/.well-known/openid-configuration') and not path.query:
            return self.reply(200,self.server.admission.metadata(path.path))
        if path.path=='/oauth/authorize':
            try:
                params=parse_qs(path.query,keep_blank_values=True,max_num_fields=30)
                request_id,name,scope=self.server.admission.start(params)
                return self.reply_html(consent_form(request_id,name,scope))
            except (ValueError,TypeError):
                return self.reply(400,{'error':'OAUTH_AUTHORIZATION_HOLD'})
        if path.path=='/mcp':return self.reply(401,{'error':'OAUTH_REQUIRED'})
        return self.reply(404,{'error':'NOT_FOUND'})
    def do_OPTIONS(self):
        path=urlsplit(self.path)
        origin=self.headers.get('Origin','')
        if path.path!='/mcp' or origin not in TRUSTED:return self.reply(403,{'error':'CORS_HOLD'})
        self.send_response(204)
        self.send_header('Content-Length','0')
        self.send_header('Access-Control-Allow-Origin',origin)
        self.send_header('Access-Control-Allow-Methods','POST,OPTIONS')
        self.send_header('Access-Control-Allow-Headers','Authorization,Content-Type,Accept,MCP-Protocol-Version')
        self.send_header('Vary','Origin')
        self.end_headers()
    def do_POST(self):
        path=urlsplit(self.path)
        if path.query:return self.reply(400,{'error':'QUERY_DISABLED'})
        if path.path.startswith('/oauth/'):
            try:
                data=self.read()
                content=self.headers.get('Content-Type','').split(';')[0].strip().lower()
                if path.path=='/oauth/register':
                    if content!='application/json':raise ValueError('JSON_REQUIRED')
                    return self.reply(201,self.server.admission.register(json.loads(data)))
                if content!='application/x-www-form-urlencoded':raise ValueError('FORM_REQUIRED')
                form=parse_form(data)
                if path.path=='/oauth/authorize':
                    return self.redirect(self.server.admission.accept(
                        form.get('request_id',[''])[0],form.get('owner_access_token',[''])[0]))
                if path.path=='/oauth/token':
                    return self.reply(200,self.server.admission.grant(form))
            except (ValueError,TypeError,UnicodeDecodeError,json.JSONDecodeError):
                return self.reply(400,{'error':'OAUTH_ADMISSION_HOLD'})
            return self.reply(404,{'error':'OAUTH_ROUTE_HOLD'})
        if path.path!='/mcp':return self.reply(404,{'error':'NOT_FOUND'})
        origin=self.headers.get('Origin','')
        if origin and origin not in TRUSTED:return self.reply(403,{'error':'ORIGIN_HOLD'})
        auth=self.headers.get('Authorization','')
        if not auth.startswith('Bearer '):return self.reply(401,{'error':'OAUTH_REQUIRED'})
        owner,scope=self.server.admission.downstream(auth[7:])
        if not owner or scope is None:return self.reply(401,{'error':'OAUTH_EXPIRED_OR_UNAUTHORIZED'})
        if self.headers.get('Content-Type','').split(';')[0].lower().strip()!='application/json':
            return self.reply(415,{'error':'JSON_REQUIRED'})
        try:
            request=json.loads(self.read(256000))
            if not isinstance(request,dict) or request.get('jsonrpc')!='2.0':
                return self.reply(400,{'error':'RPC_OBJECT_HOLD'})
            method=request.get('method')
            if method not in ('initialize','ping','tools/list','tools/call'):
                return self.reply(403,{'error':'RPC_METHOD_HOLD'})
            if method=='tools/call':
                params=request.get('params') or {}
                if not isinstance(params,dict) or params.get('name') not in ALLOWED or not isinstance(params.get('arguments',{}),dict):
                    return self.reply(403,{'error':'TOOL_SCOPE_HOLD'})
                name=params['name']
                needed='cp08:execute' if name=='atomic_contact_execute' else 'cp08:read'
                if needed not in scope:return self.reply(403,{'error':'OAUTH_SCOPE_HOLD'})
            raw=json.dumps(request,separators=(',',':')).encode()
            upstream_req=urllib.request.Request(self.server.admission.upstream,data=raw,method='POST',
                headers={'Content-Type':'application/json','Authorization':'Bearer '+owner,'Accept':'application/json'})
            with urllib.request.urlopen(upstream_req,timeout=35) as result:
                if result.status==202:return self.reply(202,{})
                if result.status!=200:return self.reply(502,{'error':'UPSTREAM_HOLD'})
                data=result.read(500001)
                if len(data)>500000:return self.reply(502,{'error':'UPSTREAM_SIZE_HOLD'})
                response=json.loads(data)
                if not isinstance(response,dict) or response.get('jsonrpc')!='2.0':
                    return self.reply(502,{'error':'UPSTREAM_JSON_HOLD'})
                if method=='tools/list' and 'result' in response:
                    response['result']['tools']=[
                        x for x in response['result'].get('tools',[]) if
                        (x['name']=='atomic_contact_history' and 'cp08:read' in scope) or
                        (x['name']=='atomic_contact_execute' and 'cp08:execute' in scope)]
                return self.reply(200,response)
        except (ValueError,TypeError,UnicodeDecodeError,json.JSONDecodeError):
            return self.reply(400,{'error':'INVALID_BOUNDED_RPC'})
        except (urllib.error.URLError,OSError):
            return self.reply(502,{'error':'PROTECTED_ORIGINAL_CP08_UNREACHABLE'})
def main():
    p=argparse.ArgumentParser()
    p.add_argument('--host',default='127.0.0.1')
    p.add_argument('--port',type=int,default=int(os.getenv('PORT','10000')))
    options=p.parse_args()
    origin=os.getenv('JM_CP09_PUBLIC_ORIGIN','').rstrip('/')
    if not origin:
        if options.host in ('127.0.0.1','localhost'):origin='http://127.0.0.1:'+str(options.port)
        else:raise SystemExit('HOLD: Explicit public HTTPS origin required')
    if not re.fullmatch(r'https://[\w.-]+(?::\d+)?|http://127\.0\.0\.1(?::\d+)?',origin):
        raise SystemExit('HOLD: CP09 requires HTTPS outside loopback')
    upstream=UPSTREAM
    if os.getenv('JM_CP09_TEST_ONLY')=='1':
        candidate=os.getenv('JM_CP09_TEST_UPSTREAM','')
        if re.fullmatch(r'http://127\.0\.0\.1:\d+/mcp',candidate):upstream=candidate
        else:raise SystemExit('HOLD: test upstream must be localhost')
    with Gateway((options.host,options.port),origin,upstream) as g:
        print('JM_CP09_OAUTH_GATEWAY_READY; upstream original CP08 unchanged',flush=True)
        g.serve_forever()
if __name__=='__main__':main()
