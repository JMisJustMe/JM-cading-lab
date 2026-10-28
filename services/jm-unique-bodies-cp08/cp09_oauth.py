"""JM Unique Bodies CP09: additive OAuth 2.1 admission organ, original CP08 donor unchanged.

Identity gate: owner must PRESENT the original JM_BODIES_TOKEN in a private
same-origin consent form. A client registration/redirect alone grants NOTHING.
PKCE S256 mandatory; codes single-use; access and rotating refresh tokens are
held by SHA-256 digest in process memory; reload => reauthentication.
No password, bearer, codes, verifier, request body or token is logged.
"""
import base64
import hashlib
import hmac
import html
import json
import re
import secrets
import threading
import time
from urllib.parse import urlsplit, parse_qs, urlencode, urlunsplit

CLIENT_HOSTS={'chatgpt.com','chat.openai.com','auth.openai.com','gemini.google.com'}
SCOPES={'cp08:read','cp08:execute'}
def digest(t):return hashlib.sha256(t.encode()).hexdigest()
def challenge(v):return base64.urlsafe_b64encode(hashlib.sha256(v.encode()).digest()).rstrip(b'=').decode()
def opaque():return secrets.token_urlsafe(40)
def safe_redirect(s):
    if not isinstance(s,str) or len(s)>1024:return False
    try:r=urlsplit(s)
    except ValueError:return False
    return r.scheme=='https' and r.hostname in CLIENT_HOSTS and not r.username and not r.password and not r.fragment and r.port in (None,443)
def valid_pkce(c):return isinstance(c,str) and bool(re.fullmatch(r'[A-Za-z0-9_-]{43}',c))
def one(p,name,default=None):
    seq=p.get(name,[])
    if len(seq)!=1:return default
    return seq[0]
def parse_form(raw):
    if len(raw)>16384:raise ValueError('BOUNDED_BODY_REQUIRED')
    return parse_qs(raw.decode('utf-8'),keep_blank_values=True,strict_parsing=True,max_num_fields=30)
def authorize_url(redirect,code,state):
    r=urlsplit(redirect)
    query=r.query+('&' if r.query else '')+urlencode({'code':code,'state':state})
    return urlunsplit((r.scheme,r.netloc,r.path,query,''))
class Admission:
    def __init__(self,origin,owner_token):
        self.origin=origin.rstrip('/')
        self.resource=self.origin+'/mcp'
        self.secret=owner_token
        self.clients={};self.pending={};self.codes={};self.access={};self.refresh={}
        self.lock=threading.RLock()
        self.failed_login_at=[]
    def metadata(self,path):
        if path in ('/.well-known/oauth-protected-resource','/.well-known/oauth-protected-resource/mcp'):
            return {'resource':self.resource,'authorization_servers':[self.origin],
                    'bearer_methods_supported':['header'],'scopes_supported':sorted(SCOPES)}
        if path in ('/.well-known/oauth-authorization-server','/.well-known/openid-configuration'):
            return {'issuer':self.origin,'authorization_endpoint':self.origin+'/oauth/authorize',
                    'token_endpoint':self.origin+'/oauth/token','registration_endpoint':self.origin+'/oauth/register',
                    'response_types_supported':['code'],'grant_types_supported':['authorization_code','refresh_token'],
                    'token_endpoint_auth_methods_supported':['none','client_secret_post'],
                    'code_challenge_methods_supported':['S256'],
                    'scopes_supported':sorted(SCOPES),
                    'client_id_metadata_document_supported':False}
        return None
    def register(self,data):
        if not isinstance(data,dict):raise ValueError('INVALID_CLIENT')
        redirects=data.get('redirect_uris')
        if not isinstance(redirects,list) or not 1<=len(redirects)<=5 or not all(safe_redirect(x) for x in redirects):
            raise ValueError('REDIRECT_URI_DENIED')
        method=data.get('token_endpoint_auth_method','none')
        if method not in ('none','client_secret_post'):raise ValueError('CLIENT_AUTH_METHOD_HOLD')
        client_id=opaque()
        record={'redirect_uris':redirects,'method':method,'created':time.time(),
                'client_name':str(data.get('client_name','JM MCP client'))[:70]}
        answer={'client_id':client_id,'redirect_uris':redirects,'token_endpoint_auth_method':method,
                'grant_types':['authorization_code','refresh_token'],'response_types':['code'],
                'client_id_issued_at':int(record['created'])}
        if method=='client_secret_post':
            secret=opaque()
            record['secret_hash']=digest(secret)
            answer.update(client_secret=secret,client_secret_expires_at=0)
        with self.lock:self.clients[client_id]=record
        return answer
    def start(self,params):
        with self.lock:
            client_id=one(params,'client_id')
            rec=self.clients.get(client_id)
            redirect=one(params,'redirect_uri')
            requested=one(params,'scope','cp08:read')
            scope=set(requested.split())
            if not rec or redirect not in rec['redirect_uris'] or not scope or not scope<=SCOPES:
                raise ValueError('CLIENT_REDIRECT_OR_SCOPE_HOLD')
            if one(params,'response_type')!='code' or one(params,'code_challenge_method')!='S256':
                raise ValueError('PKCE_S256_REQUIRED')
            ch=one(params,'code_challenge')
            state=one(params,'state','')
            if not valid_pkce(ch) or not isinstance(state,str) or len(state)>1024:
                raise ValueError('PKCE_OR_STATE_HOLD')
            resource=one(params,'resource')
            if resource not in (None,self.resource):
                raise ValueError('RESOURCE_AUDIENCE_HOLD')
            key=opaque()
            self.pending[digest(key)]={'client_id':client_id,'redirect_uri':redirect,'challenge':ch,
              'scope':' '.join(sorted(scope)),'state':state,'until':time.time()+600}
            return key,rec['client_name'],requested
    def accept(self,request_id,owner_token):
        now=time.time()
        with self.lock:
            self.failed_login_at=[x for x in self.failed_login_at if x>now-60]
            if len(self.failed_login_at)>=12:raise ValueError('RATE_LIMIT_HOLD')
            req=self.pending.get(digest(request_id))
            if req is None or req['until']<=now:raise ValueError('CONSENT_EXPIRED')
            if not isinstance(owner_token,str) or not hmac.compare_digest(owner_token.encode(),self.secret.encode()):
                self.failed_login_at.append(now);raise ValueError('OWNER_AUTH_FAILED')
            del self.pending[digest(request_id)]
            code=opaque()
            self.codes[digest(code)]={**req,'until':now+120}
            return authorize_url(req['redirect_uri'],code,req['state'])
    def authenticated_client(self,params,rec,client_id):
        if rec['method']=='client_secret_post':
            candidate=one(params,'client_secret','')
            if not hmac.compare_digest(digest(candidate),rec['secret_hash']):
                raise ValueError('CLIENT_SECRET_HOLD')
    def grant(self,form):
        with self.lock:
            client_id=one(form,'client_id')
            rec=self.clients.get(client_id)
            if rec is None:raise ValueError('UNKNOWN_CLIENT')
            self.authenticated_client(form,rec,client_id)
            typ=one(form,'grant_type')
            now=time.time()
            if typ=='authorization_code':
                code=one(form,'code','')
                entry=self.codes.pop(digest(code),None)
                if not entry or entry['until']<now:raise ValueError('CODE_EXPIRED_OR_USED')
                if entry['client_id']!=client_id or one(form,'redirect_uri')!=entry['redirect_uri']:
                    raise ValueError('CLIENT_REDIRECT_HOLD')
                verifier=one(form,'code_verifier','')
                if not isinstance(verifier,str) or not re.fullmatch(r'[A-Za-z0-9._~-]{43,128}',verifier):
                    raise ValueError('VERIFIER_REQUIRED')
                if not hmac.compare_digest(challenge(verifier),entry['challenge']):
                    raise ValueError('PKCE_MISMATCH')
                scope=entry['scope']
            elif typ=='refresh_token':
                old=one(form,'refresh_token','')
                entry=self.refresh.pop(digest(old),None)
                if entry is None or entry['until']<now or entry['client_id']!=client_id:
                    raise ValueError('REFRESH_EXPIRED_OR_USED')
                scope=entry['scope']
            else:raise ValueError('UNSUPPORTED_GRANT_TYPE')
            access=opaque();refresh=opaque()
            self.access[digest(access)]={'client_id':client_id,'scope':scope,'until':now+3600}
            self.refresh[digest(refresh)]={'client_id':client_id,'scope':scope,'until':now+7*86400}
            return {'access_token':access,'token_type':'Bearer','expires_in':3600,
                    'refresh_token':refresh,'scope':scope}
    def scopes(self,bearer):
        if not isinstance(bearer,str):return None
        if hmac.compare_digest(bearer.encode(),self.secret.encode()):
            return set(SCOPES)
        with self.lock:
            r=self.access.get(digest(bearer))
            if r and r['until']>time.time():return set(r['scope'].split())
        return None
def consent_form(request_id,client_name,scope):
    name=html.escape(client_name,quote=True)
    scopes=html.escape(scope,quote=True)
    key=html.escape(request_id,quote=True)
    return f'''<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>JM Unique Bodies OAuth approval</title></head><body>
<h1>JM Unique Bodies — owner approval</h1>
<p>This requests access on behalf of: <strong>{name}</strong></p>
<p>Permissions requested: <strong>{scopes}</strong></p>
<p>Only approve a recognised client. Enter your existing CP08 owner token in this same-origin form.
Never paste it into ChatGPT or Gemini chat.</p>
<form method="post" action="/oauth/authorize">
<input type="hidden" name="request_id" value="{key}">
<label>JM CP08 owner token <input type="password" name="owner_access_token" required autocomplete="off"></label>
<button type="submit">Approve this MCP connection</button></form></body></html>'''
