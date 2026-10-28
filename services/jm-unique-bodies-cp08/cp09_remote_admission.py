"""JM Unique Bodies CP09 OAuth relay into the sovereign CP08 hosted MCP.

No duplicate CP08 engine, donor, or Atlas is created. Existing CP08 stays LIVE,
unchanged, and bearer-protected. Owner token is entered solely on this HTTPS
gateway's consent page and VERIFIED by calling the actual CP08 tools/list.
Upstream credential remains ONLY in RAM, keyed by short-lived OAuth token digest.
No token, request body, authorisation code or owner content is logged.
"""
import hmac
import hashlib
import json
import time
import urllib.error
import urllib.request
from urllib.parse import urlsplit
from cp09_oauth import Admission,SCOPES,opaque,digest,authorize_url
UPSTREAM='https://jm-unique-bodies-cp08-contact.onrender.com/mcp'
class RemoteAdmission(Admission):
    def __init__(self,origin,upstream):
        super().__init__(origin,opaque())
        self.upstream=upstream
        self.owner_by_code={};self.owner_by_access={};self.owner_by_refresh={}
    def probe_owner(self,secret):
        """Compatibility: boolean public-safe validation, no token disclosure."""
        valid,_=self.check_owner(secret)
        return valid
    def check_owner(self,secret):
        """Return only bounded reason code; never expose token or request bytes."""
        if not isinstance(secret,str) or len(secret)<24:
            return False,'OWNER_TOKEN_FORMAT_HOLD'
        payload=json.dumps({'jsonrpc':'2.0','id':401,'method':'tools/list','params':{}}).encode()
        req=urllib.request.Request(self.upstream,data=payload,method='POST',headers={
           'Authorization':'Bearer '+secret,
           'Content-Type':'application/json','Accept':'application/json'})
        # A sleeping free-tier CP08 instance may need a cold start. Retry only
        # transport failures; never retry a rejected/invalid bearer as if valid.
        for attempt in range(2):
            try:
                with urllib.request.urlopen(req,timeout=20) as response:
                    if response.status!=200:return False,'UPSTREAM_CONTACT_HOLD'
                    body=json.loads(response.read(100000))
                    names={x['name'] for x in body['result']['tools']}
                    if not {'atomic_contact_execute','atomic_contact_history'}<=names:
                        return False,'UPSTREAM_TOOL_CONTRACT_HOLD'
                    return True,'VERIFIED'
            except urllib.error.HTTPError as error:
                if error.code in (401,403):return False,'OWNER_TOKEN_NOT_ACCEPTED'
                if error.code in (429,500,502,503,504) and attempt==0:
                    time.sleep(1)
                    continue
                return False,'UPSTREAM_CONTACT_HOLD'
            except (urllib.error.URLError,TimeoutError,OSError):
                if attempt==0:
                    time.sleep(1)
                    continue
                return False,'UPSTREAM_CONTACT_HOLD'
            except (ValueError,KeyError,TypeError,OverflowError):
                return False,'UPSTREAM_TOOL_CONTRACT_HOLD'
        return False,'UPSTREAM_CONTACT_HOLD'
    def accept(self,request_id,owner_token):
        now=time.time()
        with self.lock:
            self.failed_login_at=[x for x in self.failed_login_at if x>now-60]
            if len(self.failed_login_at)>=12:raise ValueError('RATE_LIMIT_HOLD')
            req=self.pending.get(digest(request_id))
            if req is None or req['until']<=now:raise ValueError('CONSENT_EXPIRED')
        # Copy/pasting a file often includes a trailing newline or space.
        # Trim edge whitespace only; retain the original bearer byte pattern.
        token=owner_token.strip() if isinstance(owner_token,str) else owner_token
        valid,reason=self.check_owner(token)
        if not valid:
            with self.lock:self.failed_login_at.append(time.time())
            raise ValueError(reason)
        with self.lock:
            req=self.pending.pop(digest(request_id),None)
            if req is None or req['until']<=time.time():raise ValueError('CONSENT_EXPIRED')
            code=opaque()
            self.codes[digest(code)]={**req,'until':time.time()+120}
            self.owner_by_code[digest(code)]=token
            return authorize_url(req['redirect_uri'],code,req['state'])
    def grant(self,form):
        grant_type=form.get('grant_type',[''])[0]
        with self.lock:
            if grant_type=='authorization_code':
                ref=digest(form.get('code',[''])[0]);owner=self.owner_by_code.get(ref)
            elif grant_type=='refresh_token':
                ref=digest(form.get('refresh_token',[''])[0]);owner=self.owner_by_refresh.get(ref)
            else:owner=None;ref=None
            if not owner:raise ValueError('OWNER_SESSION_HOLD')
            response=super().grant(form)
            if grant_type=='authorization_code':self.owner_by_code.pop(ref,None)
            else:self.owner_by_refresh.pop(ref,None)
            self.owner_by_access[digest(response['access_token'])]=owner
            self.owner_by_refresh[digest(response['refresh_token'])]=owner
            return response
    def downstream(self,access):
        with self.lock:
            scope=self.scopes(access)
            secret=self.owner_by_access.get(digest(access))
            if scope is None or not secret:return None,None
            return secret,scope
