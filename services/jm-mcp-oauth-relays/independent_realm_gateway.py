"""Two sovereign JM MCP OAuth carriers using verified CP09 OAuth admission code.

One process = ONE realm. APP//COMMONS CP06 and Federation Receipt CP02 keep
their independent hosted native MCP engines and private Render bearer keys.
This transport does not create, store or merge underlying engine states.
"""
import argparse
import html
import json
import os
from pathlib import Path
import re
import sys
import time
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from urllib.parse import urlsplit, parse_qs

# Inherit the existing CP09 audited PKCE, one-use authorization codes, DCR,
# owner consent, rotating refresh and credential RAM-only source unchanged.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "jm-unique-bodies-cp08"))
from cp09_oauth import one, opaque, valid_pkce, digest, parse_form
from cp09_remote_admission import RemoteAdmission
from cp09_oauth_broker import Handler as CP09Handler, TRUSTED

REALMS = {
 "commons": {
  "name":"JM APP//COMMONS OAuth Connection CP07",
  "engine":"JM APP//COMMONS CP06 original six-tool native stdio",
  "upstream":"https://jm-app-commons-cp06-mcp.onrender.com/mcp",
  "default_scope":"commons:inspect",
  "scopes":frozenset(["commons:inspect","commons:capsule"]),
  "tools":{
   "jm_original_inspect":"commons:inspect",
   "jm_original_compare":"commons:inspect",
   "jm_workroom_open":"commons:inspect",
   "jm_capsule_verify":"commons:inspect",
   "jm_capsule_compare":"commons:inspect",
   "jm_capsule_create":"commons:capsule"
  }
 },
 "receipt": {
  "name":"JM Federation Receipt OAuth Connection CP03",
  "engine":"JM Federation Receipt CP02 original exact standalone CP01",
  "upstream":"https://jm-federation-receipt-cp02-mcp.onrender.com/mcp",
  "default_scope":"receipt:issue",
  "scopes":frozenset(["receipt:issue"]),
  "tools":{"jm_federation_receipt_cp01":"receipt:issue"}
 }
}

def consent_page(id_, name, scopes, realm):
    title=html.escape(REALMS[realm]["name"])
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width"><title>{title} - owner approval</title></head>
<body><h1>{title} - owner approval</h1>
<p>Client: <strong>{html.escape(name)}</strong></p>
<p>Requested permissions: <strong>{html.escape(scopes)}</strong></p>
<p>This grant connects to the existing independent JM engine; it does not create a second engine.
Only approve a client you recognize. Enter its EXISTING separate Render service bearer token here,
not in a ChatGPT/Gemini chat or GitHub source. This HTTPS gateway verifies that token with
the original service before granting access.</p>
<form method="post" action="/oauth/authorize">
<input type="hidden" name="request_id" value="{html.escape(id_,quote=True)}">
<label>Original JM {html.escape(realm)} service token
<input type="password" name="owner_access_token" required autocomplete="off"></label>
<button type="submit">Approve this specific MCP connection</button>
</form></body></html>"""

class RealmAdmission(RemoteAdmission):
    def __init__(self,origin,upstream,realm):
        super().__init__(origin,upstream)
        self.realm=realm
        self.config=REALMS[realm]
    def metadata(self,path):
        data=super().metadata(path)
        if data is not None:
            data["scopes_supported"]=sorted(self.config["scopes"])
        return data
    def start(self,params):
        with self.lock:
            client=one(params,"client_id")
            rec=self.clients.get(client)
            redirect=one(params,"redirect_uri")
            requested=one(params,"scope",self.config["default_scope"])
            scopes=set(requested.split())
            if not rec or redirect not in rec["redirect_uris"] or not scopes or not scopes<=self.config["scopes"]:
                raise ValueError("CLIENT_REDIRECT_SCOPE_HOLD")
            if one(params,"response_type")!="code" or one(params,"code_challenge_method")!="S256":
                raise ValueError("PKCE_S256_REQUIRED")
            ch=one(params,"code_challenge")
            state=one(params,"state","")
            if not valid_pkce(ch) or not isinstance(state,str) or len(state)>1024:
                raise ValueError("PKCE_STATE_HOLD")
            if one(params,"resource") not in (None,self.origin,self.resource):
                raise ValueError("RESOURCE_AUDIENCE_HOLD")
            req=opaque()
            self.pending[digest(req)]={
                "client_id":client, "redirect_uri":redirect, "challenge":ch,
                "scope":" ".join(sorted(scopes)), "state":state, "until":time.time()+600
            }
            return req,rec["client_name"],requested
    def probe_owner(self,secret):
        if not isinstance(secret,str) or len(secret)<24:return False
        request=json.dumps({"jsonrpc":"2.0","id":401,"method":"tools/list","params":{}}).encode()
        q=urllib.request.Request(self.upstream,method="POST",data=request,headers={
            "Authorization":"Bearer "+secret,
            "Content-Type":"application/json",
            "Accept":"application/json, text/event-stream"
        })
        try:
            with urllib.request.urlopen(q,timeout=14) as response:
                if response.status!=200:return False
                result=json.loads(response.read(150000))
            tools={x["name"] for x in result["result"]["tools"]}
            # All, and ONLY, expected original tool names must be present.
            return tools==set(self.config["tools"])
        except (OSError, ValueError, KeyError,TypeError,OverflowError):
            return False

class RealmHandler(CP09Handler):
    def empty_response(self,status,headers=None):
        self.send_response(status)
        self.send_header('Content-Length','0')
        self.send_header('Cache-Control','no-store')
        for key,value in (headers or {}).items():self.send_header(key,value)
        self.end_headers()
    def do_GET(self):
        route=urlsplit(self.path)
        if route.path=="/health" and not route.query:
            config=self.server.admission.config
            return self.reply(200,{
                "name":config["name"],"backend":config["engine"],
                "realm":self.server.admission.realm,"state":"OAUTH_OWNER_CONSENT_REQUIRED",
                "mcp_endpoint":"/mcp","original_service_mutated":False
            })
        if route.path=="/mcp":
            header=self.headers.get("Authorization","")
            if not header.startswith("Bearer ") or not self.server.admission.downstream(header[7:])[0]:
                return self.reply(401,{"error":"OAUTH_REQUIRED"})
            return self.empty_response(405,{"Allow":"POST,OPTIONS"})
        if route.path=="/oauth/authorize":
            try:
                args=parse_qs(route.query,keep_blank_values=True,max_num_fields=30)
                id_,name,scope=self.server.admission.start(args)
                return self.reply_html(consent_page(id_,name,scope,self.server.admission.realm))
            except (ValueError, TypeError):
                return self.reply(400,{"error":"OAUTH_AUTHORIZATION_HOLD"})
        return super().do_GET()
    def do_POST(self):
        route=urlsplit(self.path)
        if route.path!="/mcp":return super().do_POST()
        if route.query:return self.reply(400,{"error":"QUERY_DISABLED"})
        origin=self.headers.get("Origin")
        if origin and origin not in TRUSTED:return self.reply(403,{"error":"ORIGIN_HOLD"})
        header=self.headers.get("Authorization","")
        if not header.startswith("Bearer "):return self.reply(401,{"error":"OAUTH_REQUIRED"})
        original,scopes=self.server.admission.downstream(header[7:])
        if not original or scopes is None:return self.reply(401,{"error":"OAUTH_EXPIRED"})
        if self.headers.get("Content-Type","").split(";")[0].strip().lower()!="application/json":
            return self.reply(415,{"error":"JSON_REQUIRED"})
        try:
            request=json.loads(self.read(65000))
            if not isinstance(request,dict) or request.get("jsonrpc")!="2.0":
                return self.reply(400,{"error":"INVALID_JSON_RPC"})
            method=request.get("method")
            if method in ("notifications/initialized","notifications/cancelled"):
                if "id" in request:return self.reply(400,{"error":"NOTIFICATION_ID_HOLD"})
                return self.empty_response(202)
            if method not in ("initialize","ping","tools/list","tools/call"):
                return self.reply(403,{"error":"RPC_SCOPE_HOLD"})
            tools=self.server.admission.config["tools"]
            if method=="tools/call":
                params=request.get("params")
                if not isinstance(params,dict) or not isinstance(params.get("arguments",{}),dict):
                    return self.reply(400,{"error":"INVALID_TOOL_ARGS"})
                required=tools.get(params.get("name"))
                if not required:return self.reply(403,{"error":"UNKNOWN_NATIVE_TOOL"})
                if required not in scopes:return self.reply(403,{"error":"OAUTH_SCOPE_HOLD"})
            wire=json.dumps(request,separators=(",",":")).encode()
            q=urllib.request.Request(self.server.admission.upstream,data=wire,method="POST",headers={
                "Authorization":"Bearer "+original,"Content-Type":"application/json",
                "Accept":"application/json, text/event-stream"
            })
            with urllib.request.urlopen(q,timeout=35) as response:
                if response.status==202:return self.empty_response(202)
                if response.status!=200:return self.reply(502,{"error":"ORIGINAL_MCP_HOLD"})
                raw=response.read(500001)
                if len(raw)>500000:return self.reply(502,{"error":"ORIGINAL_MCP_RESPONSE_SIZE_HOLD"})
                result=json.loads(raw)
            if not isinstance(result,dict) or result.get("jsonrpc")!="2.0":
                return self.reply(502,{"error":"ORIGINAL_MCP_RPC_HOLD"})
            if method=="tools/list" and "result" in result:
                result["result"]["tools"]=[x for x in result["result"].get("tools",[])
                    if x.get("name") in tools and tools[x["name"]] in scopes]
            return self.reply(200,result)
        except (ValueError,TypeError,UnicodeDecodeError,json.JSONDecodeError):
            return self.reply(400,{"error":"INVALID_BOUNDED_RPC"})
        except (OSError,urllib.error.URLError):
            return self.reply(502,{"error":"ORIGINAL_MCP_UNREACHABLE"})

class RealmGateway(ThreadingHTTPServer):
    daemon_threads=True
    allow_reuse_address=True
    def __init__(self,addr,origin,realm,upstream):
        self.origin=origin
        self.admission=RealmAdmission(origin,upstream,realm)
        super().__init__(addr,RealmHandler)

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--realm",required=True,choices=tuple(REALMS))
    p.add_argument("--host",default="127.0.0.1")
    p.add_argument("--port",type=int,default=int(os.getenv("PORT","10000")))
    args=p.parse_args()
    origin=os.getenv("JM_OAUTH_PUBLIC_ORIGIN","").rstrip("/")
    if not origin:
        if args.host=="127.0.0.1":origin="http://127.0.0.1:"+str(args.port)
        else:raise SystemExit("HOLD: explicit HTTPS public origin required")
    if not re.fullmatch(r"https://[\w.-]+(?::\d+)?|http://127\.0\.0\.1(?::\d+)?",origin):
        raise SystemExit("HOLD: HTTPS required beyond local test")
    upstream=REALMS[args.realm]["upstream"]
    if os.getenv("JM_OAUTH_TEST_ONLY")=="1":
        candidate=os.getenv("JM_OAUTH_TEST_UPSTREAM","")
        if not re.fullmatch(r"http://127\.0\.0\.1:\d+/mcp",candidate):
            raise SystemExit("HOLD: no non-loopback test substitute")
        upstream=candidate
    with RealmGateway((args.host,args.port),origin,args.realm,upstream) as service:
        print("JM_"+args.realm.upper()+"_OAUTH_GATEWAY_READY original bearer engine preserved",flush=True)
        service.serve_forever()
if __name__=="__main__":main()
