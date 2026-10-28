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
 def test_16_native_mcp_initialized_notification_202_empty_for_both_realms(self):
  for realm in CONFIGS:
   s,t,_,_=self.approve(realm)
   self.assertEqual(s,200)
   headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream',
            'Authorization':'Bearer '+t['access_token']}
   s,h,b=self.hit(realm,'/mcp','POST',{'jsonrpc':'2.0','method':'notifications/initialized'},headers)
   self.assertEqual(s,202)
   self.assertEqual(b,b'')
   self.assertEqual(h.get('Content-Length'),'0')
 def test_17_notification_cannot_bypass_oauth(self):
  for realm in CONFIGS:
   s,_,_=self.hit(realm,'/mcp','POST',{'jsonrpc':'2.0','method':'notifications/initialized'},
      {'Content-Type':'application/json'})
   self.assertEqual(s,401)
 def test_18_authenticated_get_has_spec_405_not_false_401(self):
  for realm in CONFIGS:
   s,t,_,_=self.approve(realm)
   self.assertEqual(s,200)
   s,h,b=self.hit(realm,'/mcp','GET',headers={'Authorization':'Bearer '+t['access_token'],'Accept':'text/event-stream'})
   self.assertEqual(s,405)
   self.assertEqual(b,b'')


 def modern(self,realm,method,token=None,name=None,arguments=None,version='2026-07-28',extra=None):
  params={'_meta':{
    'io.modelcontextprotocol/protocolVersion':version,
    'io.modelcontextprotocol/clientInfo':{'name':'jm-cp10-test','version':'1.0'},
    'io.modelcontextprotocol/clientCapabilities':{}}}
  h={'Content-Type':'application/json','Accept':'application/json, text/event-stream',
     'MCP-Protocol-Version':version,'Mcp-Method':method}
  if token:h['Authorization']='Bearer '+token
  if name:
   params.update({'name':name,'arguments':arguments or {}})
   h['Mcp-Name']=name
  h.update(extra or {})
  return self.hit(realm,'/mcp','POST',{'jsonrpc':'2.0','id':1028,'method':method,'params':params},h)

 def test_19_dual_realm_modern_authenticated_discovery(self):
  for realm in CONFIGS:
   self.assertEqual(self.modern(realm,'server/discover')[0],401)
   status,t,_,_=self.approve(realm)
   self.assertEqual(status,200)
   status,_,raw=self.modern(realm,'server/discover',t['access_token'])
   self.assertEqual(status,200,raw)
   data=json.loads(raw)['result']
   self.assertEqual(data['resultType'],'complete')
   self.assertIn('2026-07-28',data['supportedVersions'])
   self.assertEqual(data['capabilities'],{'tools':{}})
   self.assertNotIn(CONFIGS[realm]['token'],raw.decode())

 def test_20_dual_realm_modern_filtered_list_and_original_read_call(self):
  for realm in CONFIGS:
   status,t,_,_=self.approve(realm)
   self.assertEqual(status,200)
   token=t['access_token']
   status,_,raw=self.modern(realm,'tools/list',token)
   self.assertEqual(status,200,raw)
   data=json.loads(raw)['result']
   self.assertEqual(data['resultType'],'complete')
   expected=CONFIGS[realm]['tools']
   if realm=='commons':expected=[x for x in expected if x!='jm_capsule_create']
   self.assertEqual([x['name'] for x in data['tools']],expected)
   name=expected[0]
   status,_,raw=self.modern(realm,'tools/call',token,name,{'source':'CP10 synthetic'})
   self.assertEqual(status,200,raw)
   result=json.loads(raw)['result']
   self.assertEqual(result['resultType'],'complete')
   self.assertEqual(result['structuredContent']['realm'],realm)

 def test_21_modern_scope_and_header_security_boundaries(self):
  s,t,_,_=self.approve('commons')
  self.assertEqual(s,200)
  token=t['access_token']
  self.assertEqual(self.modern('commons','tools/call',token,
     'jm_capsule_create',{})[0],403)
  self.assertEqual(self.modern('receipt','tools/list',token)[0],401)
  s,_,raw=self.modern('commons','tools/list',token,extra={'Mcp-Method':'tools/call'})
  self.assertEqual(s,400,raw)
  self.assertEqual(json.loads(raw)['error']['code'],-32020)
  s,_,raw=self.modern('commons','tools/call',token,'jm_original_inspect',{},
      extra={'Mcp-Name':'jm_capsule_create'})
  self.assertEqual(s,400,raw)
  self.assertEqual(json.loads(raw)['error']['code'],-32020)

 def test_22_modern_unsupported_or_unknown_fails_closed(self):
  for realm in CONFIGS:
   s,t,_,_=self.approve(realm)
   self.assertEqual(s,200)
   token=t['access_token']
   s,_,raw=self.modern(realm,'resources/list',token)
   self.assertEqual(s,404,raw)
   self.assertEqual(json.loads(raw)['error']['code'],-32601)
   s,_,raw=self.modern(realm,'server/discover',token,version='2099-01-01')
   self.assertEqual(s,400,raw)
   self.assertEqual(json.loads(raw)['error']['code'],-32022)


 def test_23_optional_client_info_per_realm(self):
  for realm in CONFIGS:
   s,t,_,_=self.approve(realm)
   self.assertEqual(s,200)
   headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream',
       'MCP-Protocol-Version':'2026-07-28','Mcp-Method':'server/discover',
       'Authorization':'Bearer '+t['access_token']}
   meta={'io.modelcontextprotocol/protocolVersion':'2026-07-28',
         'io.modelcontextprotocol/clientCapabilities':{}}
   request=lambda m:{'jsonrpc':'2.0','id':45,'method':'server/discover',
     'params':{'_meta':m}}
   s,_,raw=self.hit(realm,'/mcp','POST',request(meta),headers)
   self.assertEqual(s,200,raw)
   s,_,raw=self.hit(realm,'/mcp','POST',request({**meta,
      'io.modelcontextprotocol/clientInfo':{'name':123}}),headers)
   self.assertEqual(s,400,raw)

 def test_24_modern_list_private_zero_ttl_and_independent_identity(self):
  for realm in CONFIGS:
   s,t,_,_=self.approve(realm)
   self.assertEqual(s,200)
   s,_,raw=self.modern(realm,'tools/list',t['access_token'])
   self.assertEqual(s,200,raw)
   result=json.loads(raw)['result']
   self.assertEqual(result['cacheScope'],'private')
   self.assertEqual(result['ttlMs'],0)
   self.assertEqual(result['_meta']['io.modelcontextprotocol/serverInfo']['name'],
     'JM APP//COMMONS OAuth Connection CP07' if realm=='commons' else
     'JM Federation Receipt OAuth Connection CP03')


 def test_25_modern_mcp_browser_preflight_for_both_realm_seats(self):
  for realm in CONFIGS:
   s,h,b=self.hit(realm,'/mcp','OPTIONS',headers={
     'Origin':'https://gemini.google.com',
     'Access-Control-Request-Method':'POST',
     'Access-Control-Request-Headers':'MCP-Protocol-Version,Mcp-Method,Mcp-Name,Authorization'})
   self.assertEqual(s,204,b)
   for name in ('MCP-Protocol-Version','Mcp-Method','Mcp-Name'):
    self.assertIn(name,h.get('Access-Control-Allow-Headers',''))
   s,_,_=self.hit(realm,'/mcp','OPTIONS',headers={
     'Origin':'https://gemini.google.com.attacker.invalid'})
   self.assertEqual(s,403)


 def test_26_authorization_recovery_is_specific_and_never_leaks_sensitive_values(self):
  for realm in CONFIGS:
   secret="SENSITIVE_NEVER_ECHO_TEST_TOKEN"
   query=urlencode({
    'client_id':'client_not_registered_after_restart_'+secret,
    'redirect_uri':CALLBACK,
    'scope':CONFIGS[realm]['scope'],
    'response_type':'code',
    'code_challenge_method':'S256',
    'code_challenge':pkce('A'*64),
    'state':'STATE_NEVER_ECHO_'+secret
   })
   s,_,raw=self.hit(realm,'/oauth/authorize?'+query)
   self.assertEqual(s,400,raw)
   result=json.loads(raw)
   self.assertEqual(result['error'],'OAUTH_AUTHORIZATION_HOLD')
   self.assertEqual(result['cause'],'CLIENT_REGISTRATION_NOT_FOUND')
   self.assertIn('Restart',result['recovery'])
   self.assertNotIn(secret,raw.decode())
   self.assertNotIn(CALLBACK,raw.decode())


 def test_27_receipt_private_consent_failure_classifies_expiry_and_bad_bearer(self):
  s,_,raw=self.hit('receipt','/oauth/authorize','POST',
     {'request_id':'SYNTHETIC_MISSING_APPROVAL','owner_access_token':'BAD_TEST_SECRET_NEVER_ECHO'},
     {'Content-Type':'application/x-www-form-urlencoded'})
  self.assertEqual(s,400,raw)
  obj=json.loads(raw)
  self.assertEqual(obj['error'],'OAUTH_ADMISSION_HOLD')
  self.assertEqual(obj['cause'],'APPROVAL_EXPIRED')
  self.assertNotIn(b'BAD_TEST_SECRET_NEVER_ECHO',raw)
  url=self.gate['receipt']
  s,_,raw=self.hit('receipt','/oauth/register','POST',
    {'redirect_uris':[CALLBACK],'client_name':'JM receipt POST fault fixture'},
    {'Content-Type':'application/json'})
  self.assertEqual(s,201,raw)
  client=json.loads(raw)['client_id']
  q=urlencode({'client_id':client,'redirect_uri':CALLBACK,'response_type':'code',
    'code_challenge_method':'S256','code_challenge':pkce('B'*64),
    'state':'STATE_SENSITIVE_NEVER_ECHO','scope':'receipt:issue','resource':url+'/mcp'})
  s,_,body=self.hit('receipt','/oauth/authorize?'+q)
  self.assertEqual(s,200,body)
  m=re.search(rb'name="request_id" value="([^"]+)"',body)
  self.assertIsNotNone(m)
  s,_,raw=self.hit('receipt','/oauth/authorize','POST',
     {'request_id':m.group(1).decode(),'owner_access_token':'BAD_TEST_SECRET_NEVER_ECHO'},
     {'Content-Type':'application/x-www-form-urlencoded'})
  self.assertEqual(s,400,raw)
  obj=json.loads(raw)
  self.assertEqual(obj['cause'],'ORIGINAL_BEARER_NOT_VERIFIED')
  self.assertNotIn(b'BAD_TEST_SECRET_NEVER_ECHO',raw)
  self.assertNotIn(b'STATE_SENSITIVE_NEVER_ECHO',raw)


 def test_28_receipt_exact_public_chatgpt_callback_recovers_dcr_without_tool_authority(self):
  realm='receipt'
  url=self.gate[realm]
  callback='https://chatgpt.com/connector/oauth/JMTESTRECOVERY'
  client='R'*54
  verifier='Z'*64
  args={'client_id':client,'redirect_uri':callback,'response_type':'code',
    'code_challenge_method':'S256','code_challenge':pkce(verifier),
    'scope':'receipt:issue','resource':url+'/mcp','state':'SYNTHETIC_CALLBACK'}
  query=urlencode(args)
  s,_,html=self.hit(realm,'/oauth/authorize?'+query)
  self.assertEqual(s,200,html)
  self.assertIn(b'ChatGPT (recovered public callback)',html)
  self.assertEqual(self.rpc(realm,'tools/list',token=client)[0],401)
  req=re.search(rb'name="request_id" value="([^"]+)"',html)
  self.assertIsNotNone(req)
  s,h,raw=self.hit(realm,'/oauth/authorize','POST',
     {'request_id':req.group(1).decode(),'owner_access_token':CONFIGS[realm]['token']},
     {'Content-Type':'application/x-www-form-urlencoded'})
  self.assertEqual(s,302,raw)
  code=parse_qs(urlsplit(h['Location']).query)['code'][0]
  form={'grant_type':'authorization_code','client_id':client,'code':code,
    'code_verifier':verifier,'redirect_uri':callback}
  s,_,raw=self.hit(realm,'/oauth/token','POST',form,
      {'Content-Type':'application/x-www-form-urlencoded'})
  self.assertEqual(s,200,raw)
  access=json.loads(raw)['access_token']
  s,_,raw=self.rpc(realm,'tools/list',token=access)
  self.assertEqual(s,200,raw)
  self.assertEqual([x['name'] for x in json.loads(raw)['result']['tools']],
     ['jm_federation_receipt_cp01'])
  s,_,raw=self.rpc(realm,'tools/call',
     {'name':'jm_federation_receipt_cp01','arguments':{'gate':'RECOVERED_TEST'}},access)
  self.assertEqual(s,200,raw)
  self.assertEqual(json.loads(raw)['result']['structuredContent']['executed'],True)
  for bad in [
    {**args,'client_id':'TOO_SHORT'},
    {**args,'client_id':'S'*54,'redirect_uri':'https://chatgpt.com.evil.invalid/connector/oauth/JMTESTRECOVERY'},
    {**args,'client_id':'T'*54,'redirect_uri':'https://chatgpt.com/redirect'},
    {**args,'client_id':'U'*54,'code_challenge':'bad'},
    {**args,'client_id':'V'*54,'scope':'commons:capsule'},
    {**args,'client_id':'W'*54,'resource':'https://evil.invalid/mcp'}
  ]:
   s,_,raw=self.hit(realm,'/oauth/authorize?'+urlencode(bad))
   self.assertEqual(s,400,(bad['client_id'][:5],raw))
   self.assertEqual(json.loads(raw)['cause'],'CLIENT_REGISTRATION_NOT_FOUND')
  s,_,raw=self.hit('commons','/oauth/authorize?'+query)
  self.assertEqual(s,400,raw)
  self.assertEqual(json.loads(raw)['cause'],'CLIENT_REGISTRATION_NOT_FOUND')

if __name__=='__main__':unittest.main(verbosity=2)
