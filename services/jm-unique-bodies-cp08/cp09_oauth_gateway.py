"""JM CP09 OAuth carrier: original CP08 server/Atlas/Node donor remain exact modules.

This is an additive HTTPS admission route at the SAME deployment/Atlas, not
another database or duplicate Unique Bodies authority. CP08 original gateway
module stays unchanged. Auth via owner-controlled consent + PKCE; no public tools.
"""
import argparse
import hmac
import json
import os
import re
import sys
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit,parse_qs

import cp08_gateway as cp08
from cp09_oauth import Admission,consent_form,parse_form,SCOPES
import cp07_atomic_runtime as cp07
import server

class OAuthHandler(cp08.Handler):
    def _scopes(self):
        value=self.headers.get('Authorization','')
        if not value.startswith('Bearer '):return None
        return self.server.oauth.scopes(value[7:])
    def authenticated(self):
        self._granted=self._scopes()
        return self._granted is not None
    def trusted_origin(self):
        origin=self.headers.get('Origin','')
        if not origin or origin==self.server.origin:return True
        # The legacy static bearer cannot be used cross-origin. Only owner-issued
        # temporary OAuth access tokens may travel via these explicit origins.
        bearer=self.headers.get('Authorization','')
        if bearer==('Bearer '+self.server.secret):return False
        return origin in ('https://chatgpt.com','https://gemini.google.com') and self._scopes() is not None
    def reply(self,status,obj,headers=None):
        headers=dict(headers or {})
        if status==401:
            headers['WWW-Authenticate']='Bearer resource_metadata="'+self.server.origin+'/.well-known/oauth-protected-resource/mcp", scope="cp08:read"'
        if self.headers.get('Origin') in ('https://chatgpt.com','https://gemini.google.com',self.server.origin):
            headers['Access-Control-Allow-Origin']=self.headers.get('Origin')
            headers['Vary']='Origin'
        return super().reply(status,obj,headers)
    def html_response(self,status,body):
        raw=body.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type','text/html; charset=utf-8')
        self.send_header('Content-Length',str(len(raw)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','no-referrer')
        self.send_header('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'")
        self.end_headers();self.wfile.write(raw)
    def redirect(self,where):
        self.send_response(302)
        self.send_header('Location',where)
        self.send_header('Cache-Control','no-store')
        self.send_header('Referrer-Policy','no-referrer')
        self.send_header('Content-Length','0')
        self.end_headers()
    def do_OPTIONS(self):
        route=urlsplit(self.path)
        origin=self.headers.get('Origin','')
        if route.path!='/mcp' or origin not in ('https://chatgpt.com','https://gemini.google.com',self.server.origin):
            return self.reply(403,{'error':'PREFLIGHT_ORIGIN_HOLD'})
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin',origin)
        self.send_header('Access-Control-Allow-Methods','POST,OPTIONS')
        self.send_header('Access-Control-Allow-Headers','Authorization,Content-Type,Accept,MCP-Protocol-Version')
        self.send_header('Access-Control-Max-Age','600')
        self.send_header('Vary','Origin')
        self.send_header('Content-Length','0')
        self.end_headers()
    def read_bytes(self,limit=16384):
        try:length=int(self.headers.get('Content-Length','0'))
        except ValueError:raise ValueError('INVALID_LENGTH')
        if length<=0 or length>limit:raise ValueError('BOUNDED_BODY_REQUIRED')
        return self.rfile.read(length)
    def do_GET(self):
        route=urlsplit(self.path)
        meta=self.server.oauth.metadata(route.path)
        if meta is not None and not route.query:return self.reply(200,meta)
        if route.path=='/oauth/authorize':
            try:
                params=parse_qs(route.query,keep_blank_values=True,max_num_fields=25)
                key,name,scope=self.server.oauth.start(params)
                return self.html_response(200,consent_form(key,name,scope))
            except (ValueError,TypeError):
                return self.html_response(400,'<h1>JM OAuth authorization request held</h1>')
        if route.path=='/mcp':
            return self.reply(401,{'error':'OAUTH_OR_OWNER_BEARER_REQUIRED'})
        return super().do_GET()
    def do_POST(self):
        route=urlsplit(self.path)
        if route.path.startswith('/oauth/'):
            try:
                if route.query:raise ValueError('QUERY_DISABLED')
                body=self.read_bytes(16384)
                content_type=self.headers.get('Content-Type','').split(';')[0].strip().lower()
                if route.path=='/oauth/register':
                    if content_type!='application/json':raise ValueError('JSON_REQUIRED')
                    data=json.loads(body)
                    return self.reply(201,self.server.oauth.register(data))
                if content_type!='application/x-www-form-urlencoded':raise ValueError('FORM_REQUIRED')
                form=parse_form(body)
                if route.path=='/oauth/authorize':
                    dest=self.server.oauth.accept(
                      form.get('request_id',[''])[0],form.get('owner_access_token',[''])[0])
                    return self.redirect(dest)
                if route.path=='/oauth/token':
                    return self.reply(200,self.server.oauth.grant(form))
            except (ValueError,TypeError,UnicodeDecodeError,json.JSONDecodeError):
                return self.reply(400,{'error':'OAUTH_REQUEST_OR_AUTHORIZATION_HOLD'})
            return self.reply(404,{'error':'NO_OAUTH_ROUTE'})
        if route.path!='/mcp' or route.query:return self.reply(404,{'error':'NOT_FOUND'})
        if not self.trusted_origin():return self.reply(403,{'error':'ORIGIN_HOLD'})
        if not self.authenticated():return self.reply(401,{'error':'OAUTH_OR_BEARER_REQUIRED'})
        if self.headers.get('Content-Type','').split(';')[0].strip().lower()!='application/json':
            return self.reply(415,{'error':'JSON_REQUIRED'})
        try:r=json.loads(self.read_bytes(256000))
        except (ValueError,TypeError,json.JSONDecodeError,UnicodeDecodeError):
            return self.reply(400,{'error':'INVALID_BOUNDED_JSON'})
        if not isinstance(r,dict):return self.reply(400,{'error':'JSON_RPC_OBJECT_REQUIRED'})
        if r.get('jsonrpc')!='2.0' or r.get('method') not in ('tools/list','tools/call','initialize','ping'):
            return self.reply(403,{'error':'METHOD_HOLD'})
        if r.get('method')=='tools/call':
            p=r.get('params')
            if not isinstance(p,dict) or p.get('name') not in cp08.ALLOWED:
                return self.reply(403,{'error':'TOOL_SCOPE_HOLD'})
            a=p.get('arguments',{})
            if not isinstance(a,dict) or len(a)>6:return self.reply(400,{'error':'INVALID_TOOL_ARGUMENTS'})
            required='cp08:execute' if p['name']=='atomic_contact_execute' else 'cp08:read'
            if required not in self._granted:return self.reply(403,{'error':'OAUTH_SCOPE_HOLD'})
        reply=server.dispatch(self.server.atlas,r)
        if r['method']=='tools/list' and reply and 'result' in reply:
            reply['result']['tools']=[x for x in reply['result']['tools']
                if x['name'] in cp08.ALLOWED and (
                  ('cp08:execute' in self._granted and x['name']=='atomic_contact_execute') or
                  ('cp08:read' in self._granted and x['name']=='atomic_contact_history'))]
        return self.reply(202 if reply is None else 200,reply)
class OAuthGateway(ThreadingHTTPServer):
    daemon_threads=True
    allow_reuse_address=True
    def __init__(self,addr,atlas,secret,origin):
        self.atlas=atlas;self.secret=secret;self.origin=origin.rstrip('/')
        self.oauth=Admission(self.origin,secret)
        super().__init__(addr,OAuthHandler)
def main():
    a=argparse.ArgumentParser()
    a.add_argument('--host',default='127.0.0.1')
    a.add_argument('--port',type=int,default=int(os.getenv('PORT','8765')))
    a.add_argument('--db',default=os.getenv('JM_BODIES_DB','/tmp/jm-cp08-atlas.sqlite3'))
    args=a.parse_args()
    token=os.getenv('JM_BODIES_TOKEN','')
    if len(token)<24:raise SystemExit('HOLD: JM_BODIES_TOKEN must remain configured >=24 chars')
    explicit=os.getenv('CP08_PUBLIC_ORIGIN','').rstrip('/')
    if not explicit:
        if args.host in ('127.0.0.1','localhost','::1'):explicit='http://127.0.0.1:'+str(args.port)
        else:raise SystemExit('HOLD: CP08_PUBLIC_ORIGIN required for remote access')
    if not re.fullmatch(r'https://[\w.-]+(?::\d+)?|http://(?:127\.0\.0\.1|localhost)(?::\d+)?',explicit):
        raise SystemExit('HOLD: HTTPS required outside localhost')
    atlas=server.Atlas(args.db);cp07.init(atlas)
    with OAuthGateway((args.host,args.port),atlas,token,explicit) as gate:
        print('CP09 OAuth gateway READY, inherited CP08 Atlas and Fold, private consent',flush=True)
        gate.serve_forever()
if __name__=='__main__':main()
