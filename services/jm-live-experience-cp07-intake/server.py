#!/usr/bin/env python3
"""JM Live Experience CP07 — public admission/contact ONLY, no protected source."""
import json,os
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from urllib.parse import urlsplit
NAME='jm-live-experience-cp07-intake'
VERSION='0.7.0'
PROTOS=('2025-03-26','2025-06-18','2025-11-25')
MODERN='2026-07-28'
ORIGINS={'https://chatgpt.com','https://gemini.google.com'}
PROTECTED=('experience_open','experience_act','experience_observe','experience_compare','experience_handoff_read','experience_close')
def spec(n):
    fields={
      'experience_open':(['artifact_id'],{'artifact_id':'string','viewport':'string'}),
      'experience_act':(['session_id','action'],{'session_id':'string','action':'string','target':'string'}),
      'experience_observe':(['session_id'],{'session_id':'string'}),
      'experience_compare':(['baseline_id','candidate_id'],{'baseline_id':'string','candidate_id':'string'}),
      'experience_handoff_read':(['session_id'],{'session_id':'string'}),
      'experience_close':(['session_id'],{'session_id':'string'}),
      'experience_status':([],{})}
    required,props=fields[n]
    return {'name':n,'description':('Read-only production readiness and public contact status.' if n=='experience_status' else 'AUTHORITY_HOLD: protected CP06 experience tool, NOT executable on public admission rail.'),
       'inputSchema':{'type':'object','properties':{k:{'type':v} for k,v in props.items()},'required':required,'additionalProperties':False},
       'annotations':{'readOnlyHint':True,'destructiveHint':False,'idempotentHint':True,'openWorldHint':False}}
TOOLS=[spec(n) for n in ('experience_status',)+PROTECTED]
STATUS={'schema':'JM.LiveExperience.AdmissionRail/0.7','body':'JM Live Experience MCP',
        'state':'PUBLIC_SAFE_CONTACT_ONLY','hosted_game_source_count':0,
        'CP05_CP06_source':'PROTECTED_SEPARATELY_IN_OWNER_LIBRARY',
        'experience_execution':'AUTHORITY_HOLD','actual_gameplay_consequences':False,
        'held_gates':['OWNER_APPROVED_PUBLIC_FIXTURES','PRODUCTION_SIGNED_CLIENT_IDENTITY',
          'PRODUCTION_OWNER_GRANT_SIGNER','ISOLATED_NONROOT_CHROMIUM_SANDBOX',
          'ACTUAL_GEMINI_AND_CHATGPT_PROVIDER_TOOL_CONTACT','PHYSICAL_OWNER_FOLD',
          'REAL_RIFT_WEBGL_PROOF'],
        'preserved':['JM Build Mesh independent','JM MCP Workshop independent',
                     'CP01-CP05 protected historical FLAZ','CP06 protected production gate'],
        'instruction':'Discover MCP contact here; obtain external production authority before gameplay.'}
def result(data):return {'content':[{'type':'text','text':json.dumps(data,ensure_ascii=False)}], 'structuredContent':data,'isError':data.get('state')=='AUTHORITY_HOLD'}
def rpc_err(id,code,msg):return {'jsonrpc':'2.0','id':id,'error':{'code':code,'message':msg}}
def rpc(p,modern=False):
    if not isinstance(p,dict) or p.get('jsonrpc')!='2.0' or not isinstance(p.get('method'),str):
        return rpc_err(None,-32600,'Invalid Request')
    name=p['method'];id=p.get('id');params=p.get('params') or {}
    if name.startswith('notifications/'):return None
    if not isinstance(id,(int,str)) or isinstance(id,bool):return rpc_err(None,-32600,'id required')
    if not isinstance(params,dict):return rpc_err(id,-32602,'params must be object')
    if modern and name=='server/discover':
        data={'resultType':'complete','supportedVersions':[MODERN,*reversed(PROTOS)],
              'capabilities':{'tools':{'listChanged':False}},'ttlMs':300000,'cacheScope':'public',
              '_meta':{'io.modelcontextprotocol/serverInfo':{'name':NAME,'version':VERSION}}}
    elif name=='initialize':
        proposed=params.get('protocolVersion')
        version=proposed if proposed in PROTOS else '2025-06-18'
        data={'protocolVersion':version,'capabilities':{'tools':{'listChanged':False}},
              'serverInfo':{'name':NAME,'version':VERSION},
              'instructions':'Read-only MCP intake. experience_status works; six protected tools return AUTHORITY_HOLD with zero gameplay execution.'}
    elif name=='tools/list':data={'tools':TOOLS}
    elif name=='ping':data={}
    elif name=='tools/call':
        tool=params.get('name');args=params.get('arguments') or {}
        if tool not in ('experience_status',)+PROTECTED or not isinstance(args,dict):return rpc_err(id,-32602,'Unknown tool or invalid arguments')
        if tool=='experience_status':
            if args:return rpc_err(id,-32602,'No arguments required')
            data=result(STATUS)
        else:data=result({'state':'AUTHORITY_HOLD','tool':tool,'execution_occurred':False,
             'source_exposed':False,'reason':'Real JWT issuer, signed grant authority, approved originals and browser sandbox are required in protected CP06.'})
    else:return rpc_err(id,-32601,'Unknown JSON-RPC method')
    if modern and 'resultType' not in data:data={'resultType':'complete',**data}
    return {'jsonrpc':'2.0','id':id,'result':data}
class Handler(BaseHTTPRequestHandler):
    server_version='JMExperienceIntake/0.7'
    def log_message(self,*_):return
    def allowed(self):
        origin=self.headers.get('Origin','')
        return not origin or origin in ORIGINS
    def send(self,status,obj=None):
        raw=json.dumps(obj,ensure_ascii=False,separators=(',',':')).encode() if obj is not None else b''
        self.send_response(status)
        self.send_header('Content-Type','application/json')
        self.send_header('Content-Length',str(len(raw)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        origin=self.headers.get('Origin','')
        if origin and self.allowed() and status!=403:
            self.send_header('Access-Control-Allow-Origin',origin)
            self.send_header('Vary','Origin')
            self.send_header('Access-Control-Allow-Methods','POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers','Accept, Content-Type, MCP-Protocol-Version, Mcp-Method, Mcp-Name')
        self.end_headers()
        if raw:self.wfile.write(raw)
    def do_GET(self):
        path=urlsplit(self.path).path
        if path in ('/','/healthz','/ready'):
            return self.send(200,{'name':NAME,'version':VERSION,'status':'PUBLIC_SAFE_CONTACT_ONLY','execution':False,'game_assets':0})
        if path in ('/mcp','/mcp/'):return self.send(405,{'error':'POST JSON-RPC required, GET SSE not enabled'})
        return self.send(404)
    def do_OPTIONS(self):
        if urlsplit(self.path).path not in ('/mcp','/mcp/'):return self.send(404)
        if not self.allowed():return self.send(403)
        if self.headers.get('Access-Control-Request-Method','POST').upper()!='POST':return self.send(405)
        if not {s.strip().lower() for s in self.headers.get('Access-Control-Request-Headers','').split(',') if s.strip()}.issubset({'content-type','accept','mcp-protocol-version','mcp-method','mcp-name'}):
            return self.send(403)
        return self.send(204)
    def do_POST(self):
        if urlsplit(self.path).path not in ('/mcp','/mcp/'):return self.send(404)
        if not self.allowed():return self.send(403)
        if self.headers.get('Content-Type','').split(';')[0].strip().lower()!='application/json':return self.send(415)
        try:n=int(self.headers.get('Content-Length','0'))
        except ValueError:return self.send(400)
        if n<=0 or n>65536:return self.send(413)
        try:payload=json.loads(self.rfile.read(n))
        except (ValueError,UnicodeDecodeError):return self.send(400,rpc_err(None,-32700,'Parse error'))
        h=self.headers.get('MCP-Protocol-Version')
        if h and h not in PROTOS+(MODERN,):return self.send(400,rpc_err(None,-32022,'Unsupported version'))
        modern=h==MODERN or (isinstance(payload,dict) and isinstance(payload.get('params'),dict) and isinstance(payload['params'].get('_meta'),dict) and payload['params']['_meta'].get('io.modelcontextprotocol/protocolVersion')==MODERN)
        if modern:
            meta=payload.get('params',{}).get('_meta',{}) if isinstance(payload,dict) else {}
            if h!=MODERN or self.headers.get('Mcp-Method')!=payload.get('method') or not isinstance(meta.get('io.modelcontextprotocol/clientCapabilities'),dict):
                return self.send(400,rpc_err(payload.get('id'),-32020,'Modern header and metadata mismatch'))
        out=rpc(payload,modern)
        return self.send(202 if out is None else 200,out)
if __name__=='__main__':
    p=int(os.environ.get('PORT','10000'))
    print(json.dumps({'event':'JM_EXPERIENCE_PUBLIC_INTAKE_CP07','port':p,'hosted_owner_game_sources':0}),flush=True)
    ThreadingHTTPServer(('0.0.0.0',p),Handler).serve_forever()
