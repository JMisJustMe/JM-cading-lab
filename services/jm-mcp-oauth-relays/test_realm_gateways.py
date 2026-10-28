"""Actual isolated HTTP OAuth flows for two sovereign JM MCP carriers.

Protected originals are not contacted in this fixture suite. Each mock MCP
responds with the EXACT canonical tool names and an independently keyed secret.
Real hosted original contact is checked as a distinct later production gate.
"""
import base64,hashlib,json,os,pathlib,re,socket,subprocess,sys,threading,time,unittest
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlencode, urlsplit,parse_qs
from urllib.request import Request,build_opener,HTTPRedirectHandler
from urllib.error import HTTPError
BASE=pathlib.Path(__file__).resolve().parent
EXE=BASE/'independent_realm_gateway.py'
CALLBACK='https://chatgpt.com/connector_platform_oauth_redirect'
CONFIGS={
 'commons':{'token':'COMMONS_TEST_TOKEN_DISTINCT_1234567890_ABCDEF','scope':'commons:inspect',
 'tools':['jm_original_inspect','jm_original_compare','jm_workroom_open','jm_capsule_verify','jm_capsule_compare','jm_capsule_create']},
 'receipt':{'token':'RECEIPT_TEST_TOKEN_DISTINCT_1234567890_ABCDEF','scope':'receipt:issue',
 'tools':['jm_federation_receipt_cp01']}
}
received=[]
def port():
 with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
def pkce(v):return base64.urlsafe_b64encode(hashlib.sha256(v.encode()).digest()).rstrip(b'=').decode()
class NoRedirect(HTTPRedirectHandler):
 def redirect_request(self,*args):return None
class OriginalMcpFixture(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_POST(self):
  body=self.rfile.read(int(self.headers.get('Content-Length','0')))
  auth=self.headers.get('Authorization','')
  if self.path!='/mcp' or auth!='Bearer '+CONFIGS[self.server.realm]['token']:
   self.send_response(401);self.end_headers();return
  rpc=json.loads(body)
  received.append({'realm':self.server.realm,'method':rpc.get('method'),
     'name':rpc.get('params',{}).get('name'),'arguments':rpc.get('params',{}).get('arguments',{})})
  if rpc.get('method')=='tools/list':
   result={'tools':[{'name':name,'description':'original JM fixture only'} for name in CONFIGS[self.server.realm]['tools']]}
  else:
   result={'isError':False,'structuredContent':{'realm':self.server.realm,'executed':True,'native_name':rpc.get('params',{}).get('name')}}
  answer=json.dumps({'jsonrpc':'2.0','id':rpc.get('id'),'result':result}).encode()
  self.send_response(200)
  self.send_header('Content-Type','application/json')
  self.send_header('Content-Length',str(len(answer)))
  self.end_headers();self.wfile.write(answer)
class RealHttp(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.orig={};cls.gate={};cls.proc=[]
  for realm in CONFIGS:
   origin=ThreadingHTTPServer(('127.0.0.1',port()),OriginalMcpFixture)
   origin.realm=realm
   t=threading.Thread(target=origin.serve_forever,daemon=True);t.start()
   cls.orig[realm]=origin
   p=port()
   base='http://127.0.0.1:'+str(p)
   env={**os.environ,'JM_OAUTH_PUBLIC_ORIGIN':base,'JM_OAUTH_TEST_ONLY':'1',
       'JM_OAUTH_TEST_UPSTREAM':'http://127.0.0.1:'+str(origin.server_port)+'/mcp'}
   proc=subprocess.Popen([sys.executable,str(EXE),'--realm',realm,'--host','127.0.0.1','--port',str(p)],
       cwd=BASE,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
   cls.proc.append(proc);cls.gate[realm]=base
   for i in range(80):
    try:
     with build_opener(NoRedirect()).open(base+'/health',timeout=.5) as r:
      if r.status==200:break
    except Exception:pass
    if proc.poll() is not None:raise AssertionError(realm+' startup '+proc.stderr.read().decode()[-1000:])
    time.sleep(.05)
   else:raise AssertionError('GATEWAY_STARTUP_HOLD '+realm)
 @classmethod
 def tearDownClass(cls):
  for p in cls.proc:
   p.terminate()
   try:p.communicate(timeout=3)
   except subprocess.TimeoutExpired:p.kill();p.communicate()
  for server in cls.orig.values():server.shutdown();server.server_close()
 @classmethod
 def hit(cls,realm,path,method='GET',body=None,headers=None):
  headers=headers or {}
  if isinstance(body,dict):
   body=(json.dumps(body) if headers.get('Content-Type')=='application/json' else urlencode(body)).encode()
  req=Request(cls.gate[realm]+path,data=body,method=method,headers=headers)
  try:
   with build_opener(NoRedirect()).open(req,timeout=15) as resp:return resp.status,resp.headers,resp.read()
  except HTTPError as e:return e.code,e.headers,e.read()
 @classmethod
 def rpc(cls,realm,method,params=None,token=None,origin=None):
  h={'Content-Type':'application/json'}
  if token:h['Authorization']='Bearer '+token
  if origin:h['Origin']=origin
  return cls.hit(realm,'/mcp','POST',{'jsonrpc':'2.0','id':3,'method':method,'params':params or {}},h)
 @classmethod
 def approve(cls,realm,scope=None,secret=None):
  url=cls.gate[realm]
  s,_,raw=cls.hit(realm,'/oauth/register','POST',{'redirect_uris':[CALLBACK],'client_name':'JM '+realm+' test'},{'Content-Type':'application/json'})
  assert s==201,(s,raw)
  client=json.loads(raw)['client_id']
  verifier='A'*64
  q=urlencode({'client_id':client,'redirect_uri':CALLBACK,'response_type':'code',
      'code_challenge_method':'S256','code_challenge':pkce(verifier),
      'state':'JM_CHECK','scope':scope or CONFIGS[realm]['scope'],'resource':url+'/mcp'})
  s,_,body=cls.hit(realm,'/oauth/authorize?'+q)
  assert s==200,(s,body)
  m=re.search(rb'name="request_id" value="([^"]+)"',body)
  assert m,body[-600:]
  s,h,raw=cls.hit(realm,'/oauth/authorize','POST',
      {'request_id':m.group(1).decode(),'owner_access_token':secret if secret is not None else CONFIGS[realm]['token']},
      {'Content-Type':'application/x-www-form-urlencoded'})
  if s!=302:return s,None,None,None
  dest=urlsplit(h['Location'])
  assert dest.netloc=='chatgpt.com'
  code=parse_qs(dest.query)['code'][0]
  form={'grant_type':'authorization_code','client_id':client,'code':code,
      'code_verifier':verifier,'redirect_uri':CALLBACK}
  status,_,response=cls.hit(realm,'/oauth/token','POST',form,{'Content-Type':'application/x-www-form-urlencoded'})
  return status,json.loads(response),client,code
 def test_01_independent_live_fixture_health(self):
  for realm,base in self.gate.items():
   status,_,data=self.hit(realm,'/health')
   self.assertEqual(status,200)
   out=json.loads(data)
   self.assertEqual(out['realm'],realm)
   self.assertFalse(out['original_service_mutated'])
 def test_02_distinct_oauth_scope_metadata(self):
  for realm in CONFIGS:
   s,_,data=self.hit(realm,'/.well-known/oauth-protected-resource/mcp')
   self.assertEqual(s,200)
   resource=json.loads(data)
   self.assertEqual(resource['resource'],self.gate[realm]+'/mcp')
   self.assertNotEqual(set(resource['scopes_supported']),set(CONFIGS['receipt' if realm=='commons' else 'commons']['scope'].split()))
 def test_03_untrusted_client_not_automatically_authorized(self):
  for realm in CONFIGS:
   self.assertEqual(self.rpc(realm,'tools/list')[0],401)
   self.assertEqual(self.rpc(realm,'tools/list',token=CONFIGS[realm]['token'])[0],401)
 def test_04_wrong_owner_token_rejected_each_realm(self):
  for realm in CONFIGS:self.assertEqual(self.approve(realm,secret='WRONG_'*10)[0],400)
 def test_05_commons_read_scope_lists_five_real_tool_names_and_disallows_capsule_create(self):
  s,t,_,_=self.approve('commons')
  self.assertEqual(s,200)
  s,_,body=self.rpc('commons','tools/list',token=t['access_token'])
  self.assertEqual(s,200)
  names={x['name'] for x in json.loads(body)['result']['tools']}
  self.assertEqual(names,set(CONFIGS['commons']['tools'])-{'jm_capsule_create'})
  self.assertEqual(self.rpc('commons','tools/call',{'name':'jm_capsule_create','arguments':{}},t['access_token'])[0],403)
 def test_06_commons_read_tool_dispatches_to_original_fixture(self):
  s,t,_,_=self.approve('commons')
  self.assertEqual(s,200)
  s,_,body=self.rpc('commons','tools/call',{'name':'jm_original_inspect','arguments':{'source':'# JM demo'}},t['access_token'])
  self.assertEqual(s,200)
  self.assertEqual(json.loads(body)['result']['structuredContent']['realm'],'commons')
 def test_07_commons_explicit_capsule_permission_enables_original_capability(self):
  s,t,_,_=self.approve('commons',scope='commons:inspect commons:capsule')
  self.assertEqual(s,200)
  s,_,body=self.rpc('commons','tools/call',{'name':'jm_capsule_create','arguments':{'name':'JM'}} ,t['access_token'])
  self.assertEqual(s,200)
  self.assertEqual(json.loads(body)['result']['structuredContent']['native_name'],'jm_capsule_create')
 def test_08_receipt_native_tool_invocation(self):
  s,t,_,_=self.approve('receipt')
  self.assertEqual(s,200)
  s,_,body=self.rpc('receipt','tools/list',token=t['access_token'])
  self.assertEqual([x['name'] for x in json.loads(body)['result']['tools']],CONFIGS['receipt']['tools'])
  s,_,body=self.rpc('receipt','tools/call',{'name':'jm_federation_receipt_cp01','arguments':{'gate':'JMOP-TEST'}},t['access_token'])
  self.assertEqual(s,200)
  self.assertEqual(json.loads(body)['result']['structuredContent']['realm'],'receipt')
 def test_09_cross_realm_oauth_token_does_not_travel(self):
  s,t,_,_=self.approve('commons')
  self.assertEqual(s,200)
  self.assertEqual(self.rpc('receipt','tools/list',token=t['access_token'])[0],401)
 def test_10_cross_realm_original_token_does_not_authorize(self):
  self.assertEqual(self.approve('commons',secret=CONFIGS['receipt']['token'])[0],400)
  self.assertEqual(self.approve('receipt',secret=CONFIGS['commons']['token'])[0],400)
 def test_11_redirect_spoof_rejected(self):
  for realm in CONFIGS:
   s,_,body=self.hit(realm,'/oauth/register','POST',{'redirect_uris':['https://chatgpt.com.attacker.invalid/oauth']},{'Content-Type':'application/json'})
   self.assertEqual(s,400)
 def test_12_spoofed_origin_rejected(self):
  for realm in CONFIGS:
   self.assertEqual(self.rpc(realm,'tools/list',origin='https://gemini.google.com.attacker.invalid')[0],403)
 def test_13_oauth_pkce_code_reuse_rejected(self):
  s,t,client,code=self.approve('receipt')
  self.assertEqual(s,200)
  form={'grant_type':'authorization_code','client_id':client,'code':code,'code_verifier':'A'*64,'redirect_uri':CALLBACK}
  self.assertEqual(self.hit('receipt','/oauth/token','POST',form,{'Content-Type':'application/x-www-form-urlencoded'})[0],400)
 def test_14_refresh_token_rotates_and_no_bearer_leaks(self):
  s,t,client,_=self.approve('receipt')
  self.assertEqual(s,200)
  before=t['refresh_token']
  form={'grant_type':'refresh_token','client_id':client,'refresh_token':before}
  s,_,body=self.hit('receipt','/oauth/token','POST',form,{'Content-Type':'application/x-www-form-urlencoded'})
  self.assertEqual(s,200)
  out=json.loads(body)
  self.assertNotEqual(before,out['refresh_token'])
  self.assertNotIn(CONFIGS['receipt']['token'],json.dumps(out))
  self.assertEqual(self.hit('receipt','/oauth/token','POST',form,{'Content-Type':'application/x-www-form-urlencoded'})[0],400)
 def test_15_invalid_scopes_never_get_authority(self):
  for realm in CONFIGS:
   url=self.gate[realm]
   s,_,raw=self.hit(realm,'/oauth/register','POST',{'redirect_uris':[CALLBACK]},{'Content-Type':'application/json'})
   c=json.loads(raw)['client_id']
   query=urlencode({'client_id':c,'redirect_uri':CALLBACK,'response_type':'code',
      'code_challenge_method':'S256','code_challenge':pkce('A'*64),
      'scope':'cp08:execute','state':'BAD','resource':url+'/mcp'})
   s,_,_=self.hit(realm,'/oauth/authorize?'+query)
   self.assertEqual(s,400)
if __name__=='__main__':unittest.main(verbosity=2)
