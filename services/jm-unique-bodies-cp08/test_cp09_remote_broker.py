"""CP09 OAuth gateway proves original CP08 shared Atlas, NOT duplicate state."""
import base64,hashlib,json,os,pathlib,re,socket,subprocess,sys,tempfile,time,unittest
import urllib.request,urllib.error,urllib.parse
ROOT=pathlib.Path(__file__).resolve().parent
OWNER='CP09_ORIGINAL_OWNER_TOKEN_0123456789ABCDEF'
CLIENT='https://chatgpt.com/connector/oauth/callback'
def choose_port():
 with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
def pcode(v):return base64.urlsafe_b64encode(hashlib.sha256(v.encode()).digest()).rstrip(b'=').decode()
class StopRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args):return None
class TestRemoteBroker(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory()
  cls.cp08_port=choose_port();cls.cp09_port=choose_port()
  cls.cp08='http://127.0.0.1:'+str(cls.cp08_port)
  cls.cp09='http://127.0.0.1:'+str(cls.cp09_port)
  env={**os.environ,'JM_BODIES_TOKEN':OWNER,'CP08_PUBLIC_ORIGIN':cls.cp08}
  cls.original=subprocess.Popen([sys.executable,'cp08_gateway.py','--host','127.0.0.1',
    '--port',str(cls.cp08_port),'--db',str(pathlib.Path(cls.tmp.name)/'atlas.sqlite3')],
    cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
  env2={**os.environ,'JM_CP09_PUBLIC_ORIGIN':cls.cp09,'JM_CP09_TEST_ONLY':'1',
        'JM_CP09_TEST_UPSTREAM':cls.cp08+'/mcp'}
  cls.broker=subprocess.Popen([sys.executable,'cp09_oauth_broker.py','--host','127.0.0.1',
    '--port',str(cls.cp09_port)],cwd=ROOT,env=env2,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
  for proc,endpoint in [(cls.original,cls.cp08+'/health'),(cls.broker,cls.cp09+'/health')]:
   for n in range(100):
    try:
     with urllib.request.urlopen(endpoint,timeout=.5) as r:
      if r.status==200:break
    except Exception:pass
    if proc.poll() is not None:raise RuntimeError('HOLD startup '+proc.stderr.read().decode()[-900:])
    time.sleep(.05)
   else:raise RuntimeError('HOLD startup timed out')
 @classmethod
 def tearDownClass(cls):
  for p in [cls.original,cls.broker]:
   p.terminate()
   try:p.communicate(timeout=4)
   except subprocess.TimeoutExpired:p.kill();p.communicate()
  cls.tmp.cleanup()
 @classmethod
 def call(cls,root,path,method='GET',body=None,headers=None):
  h=headers or {}
  if isinstance(body,dict) and h.get('Content-Type')=='application/json':
   body=json.dumps(body).encode()
  elif isinstance(body,dict):body=urllib.parse.urlencode(body).encode()
  req=urllib.request.Request(root+path,data=body,headers=h,method=method)
  try:
   with urllib.request.build_opener(StopRedirect()).open(req,timeout=30) as r:
    return r.status,r.headers,r.read()
  except urllib.error.HTTPError as e:return e.code,e.headers,e.read()
 @classmethod
 def rpc(cls,root,method,params=None,token=None):
  headers={'Content-Type':'application/json'}
  if token:headers['Authorization']='Bearer '+token
  return cls.call(root,'/mcp','POST',{'jsonrpc':'2.0','id':2,'method':method,'params':params or {}},headers)
 @classmethod
 def approve(cls,scope='cp08:read',owner=OWNER):
  s,_,body=cls.call(cls.cp09,'/oauth/register','POST',{'redirect_uris':[CLIENT],'client_name':'JM Test Client','token_endpoint_auth_method':'none'},{'Content-Type':'application/json'})
  assert s==201,(s,body)
  client=json.loads(body)['client_id'];verifier='B'*50
  query=urllib.parse.urlencode({'client_id':client,'redirect_uri':CLIENT,'response_type':'code',
      'code_challenge_method':'S256','code_challenge':pcode(verifier),
      'scope':scope,'state':'JM_SCOPE','resource':cls.cp09+'/mcp'})
  s,_,b=cls.call(cls.cp09,'/oauth/authorize?'+query)
  assert s==200,(s,b)
  match=re.search(rb'name="request_id" value="([^"]+)"',b)
  assert match,b
  s,headers,b=cls.call(cls.cp09,'/oauth/authorize','POST',
   {'request_id':match.group(1).decode(),'owner_access_token':owner},
   {'Content-Type':'application/x-www-form-urlencoded'})
  if owner!=OWNER:return s,None,None,None
  assert s==302,(s,b)
  code=urllib.parse.parse_qs(urllib.parse.urlsplit(headers['Location']).query)['code'][0]
  s,_,b=cls.call(cls.cp09,'/oauth/token','POST',{'grant_type':'authorization_code','code':code,
    'client_id':client,'redirect_uri':CLIENT,'code_verifier':verifier},
    {'Content-Type':'application/x-www-form-urlencoded'})
  assert s==200,(s,b)
  return s,json.loads(b),client,code
 def test_01_no_duplicate_atlas_and_backend_remains_original(self):
  a=json.loads(self.call(self.cp08,'/health')[2])
  b=json.loads(self.call(self.cp09,'/health')[2])
  self.assertEqual(a['version'],'0.8.0-cp08')
  self.assertEqual(b['backend'],'ORIGINAL_CP08_NOT_REPLACED')
 def test_02_public_unauth_denied(self):
  s,h,b=self.rpc(self.cp09,'tools/list')
  self.assertEqual(s,401)
  self.assertIn('resource_metadata=',h.get('WWW-Authenticate',''))
 def test_03_user_cannot_approve_using_wrong_original_secret(self):
  s,_,_,_=self.approve(owner='WRONG_INVALID_TOKEN')
  self.assertEqual(s,400)
 def test_04_oauth_read_only_is_original_cp08_tool_filtered(self):
  s,t,_,_=self.approve()
  self.assertEqual(s,200)
  s,_,b=self.rpc(self.cp09,'tools/list',token=t['access_token'])
  self.assertEqual(s,200)
  self.assertEqual([x['name'] for x in json.loads(b)['result']['tools']],['atomic_contact_history'])
  s,_,b=self.rpc(self.cp09,'tools/call',{'name':'atomic_contact_execute','arguments':{'run_key':'should.never.write','apply':True}},token=t['access_token'])
  self.assertEqual(s,403);self.assertIn(b'OAUTH_SCOPE_HOLD',b)
 def test_05_authenticated_write_reaches_original_shared_atlas(self):
  s,t,_,_=self.approve('cp08:read cp08:execute')
  self.assertEqual(s,200)
  s,_,b=self.rpc(self.cp09,'tools/call',{'name':'atomic_contact_execute',
    'arguments':{'run_key':'cp09.oauth.shared.original.001','apply':True}},token=t['access_token'])
  self.assertEqual(s,200,b)
  self.assertEqual(json.loads(b)['result']['structuredContent']['state'],'ATOMIC_NATIVE_TO_ATLAS_PERSISTED')
  s,_,original=self.rpc(self.cp08,'tools/call',
    {'name':'atomic_contact_history','arguments':{}},token=OWNER)
  self.assertEqual(s,200)
  self.assertGreaterEqual(json.loads(original)['result']['structuredContent']['total_atlas_contact_events'],2)
 def test_06_original_bearer_cannot_log_into_oauth_broker_mcp_directly(self):
  self.assertEqual(self.rpc(self.cp09,'tools/list',token=OWNER)[0],401)
  self.assertEqual(self.rpc(self.cp08,'tools/list',token=OWNER)[0],200)
 def test_07_spoofed_origin_denied(self):
  h={'Content-Type':'application/json','Origin':'https://gemini.google.com.attacker.invalid'}
  s,_,_=self.call(self.cp09,'/mcp','POST',{'jsonrpc':'2.0','id':2,'method':'tools/list'},h)
  self.assertEqual(s,403)
 def test_08_client_redirect_and_refresh_preserve_original_secret_privacy(self):
  s,t,client,_=self.approve()
  self.assertEqual(s,200)
  self.assertNotIn(OWNER,json.dumps(t))
  refresh=t['refresh_token']
  s,_,b=self.call(self.cp09,'/oauth/token','POST',{'grant_type':'refresh_token',
    'client_id':client,'refresh_token':refresh},{'Content-Type':'application/x-www-form-urlencoded'})
  self.assertEqual(s,200,b)
  self.assertNotIn(OWNER,b.decode())
  self.assertEqual(self.call(self.cp09,'/oauth/token','POST',{'grant_type':'refresh_token',
    'client_id':client,'refresh_token':refresh},{'Content-Type':'application/x-www-form-urlencoded'})[0],400)
 def test_09_owner_unauthorized_fails_without_public_mutation(self):
  s,_,b=self.call(self.cp09,'/oauth/register','POST',
   {'redirect_uris':['https://evil.example/hi']},{'Content-Type':'application/json'})
  self.assertEqual(s,400)
 def test_10_copy_paste_trailing_whitespace_is_normalized_without_leaking_owner_secret(self):
  s,_,_,_=self.approve(owner=OWNER+'  '+chr(10))
  self.assertEqual(s,302)
 def test_11_wrong_valid_length_token_reports_safe_original_rejection(self):
  s,_,raw=self.call(self.cp09,'/oauth/register','POST',
   {'redirect_uris':[CLIENT],'client_name':'JM diagnostic client'},
   {'Content-Type':'application/json'})
  self.assertEqual(s,201)
  client=json.loads(raw)['client_id']
  query=urllib.parse.urlencode({'client_id':client,'redirect_uri':CLIENT,
      'response_type':'code','code_challenge_method':'S256',
      'code_challenge':pcode('C'*60),'scope':'cp08:read','state':'JM_DIAGNOSTIC',
      'resource':self.cp09+'/mcp'})
  s,_,html=self.call(self.cp09,'/oauth/authorize?'+query)
  self.assertEqual(s,200)
  req=re.search(rb'name="request_id" value="([^"]+)"',html).group(1).decode()
  s,_,body=self.call(self.cp09,'/oauth/authorize','POST',
   {'request_id':req,'owner_access_token':'X'*48},
   {'Content-Type':'application/x-www-form-urlencoded'})
  self.assertEqual(s,400)
  self.assertIn(b'OWNER_TOKEN_NOT_ACCEPTED',body)
  self.assertNotIn(OWNER.encode(),body)
  self.assertNotIn(('X'*48).encode(),body)
 def test_12_expired_or_restart_lost_request_reports_fresh_session_action(self):
  s,_,body=self.call(self.cp09,'/oauth/authorize','POST',
   {'request_id':'EXPIRED_OR_RESTART_LOST_REQUEST','owner_access_token':OWNER},
   {'Content-Type':'application/x-www-form-urlencoded'})
  self.assertEqual(s,400)
  self.assertIn(b'CONSENT_EXPIRED',body)
  self.assertIn(b'restart ChatGPT authorisation',body)
  self.assertNotIn(OWNER.encode(),body)

 def test_13_cold_upstream_503_retries_then_checks_exact_original_tools(self):
  from unittest.mock import patch
  from io import BytesIO
  from cp09_remote_admission import RemoteAdmission
  class ValidResponse:
   status=200
   def __enter__(self):return self
   def __exit__(self,*args):return False
   def read(self,n):
    return json.dumps({'result':{'tools':[{'name':'atomic_contact_execute'},{'name':'atomic_contact_history'}]}}).encode()
  expired=urllib.error.HTTPError(self.cp08+'/mcp',503,'cold upstream',{},BytesIO(b''))
  a=RemoteAdmission(self.cp09,self.cp08+'/mcp')
  with patch('cp09_remote_admission.urllib.request.urlopen',side_effect=[expired,ValidResponse()]) as fake:
   with patch('cp09_remote_admission.time.sleep',return_value=None):
    good,reason=a.check_owner(OWNER)
  self.assertTrue(good);self.assertEqual(reason,'VERIFIED')
  self.assertEqual(fake.call_count,2)
 def test_14_rejected_owner_token_never_retried(self):
  from unittest.mock import patch
  from io import BytesIO
  from cp09_remote_admission import RemoteAdmission
  denied=urllib.error.HTTPError(self.cp08+'/mcp',401,'unauthorised',{},BytesIO(b''))
  a=RemoteAdmission(self.cp09,self.cp08+'/mcp')
  with patch('cp09_remote_admission.urllib.request.urlopen',side_effect=denied) as fake:
   good,reason=a.check_owner('X'*48)
  self.assertFalse(good);self.assertEqual(reason,'OWNER_TOKEN_NOT_ACCEPTED')
  self.assertEqual(fake.call_count,1)

 def test_15_authenticated_mcp_initialized_notification_gets_empty_202(self):
  s,t,_,_=self.approve()
  self.assertEqual(s,200)
  headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream',
           'Authorization':'Bearer '+t['access_token']}
  s,head,body=self.call(self.cp09,'/mcp','POST',
     {'jsonrpc':'2.0','method':'notifications/initialized'},headers)
  self.assertEqual(s,202)
  self.assertEqual(body,b'')
  self.assertEqual(head.get('Content-Length'),'0')
 def test_16_notification_is_not_an_anonymous_bypass(self):
  s,_,_=self.call(self.cp09,'/mcp','POST',
    {'jsonrpc':'2.0','method':'notifications/initialized'},
    {'Content-Type':'application/json'})
  self.assertEqual(s,401)
 def test_17_authenticated_get_without_sse_returns_405(self):
  s,t,_,_=self.approve()
  self.assertEqual(s,200)
  s,h,b=self.call(self.cp09,'/mcp','GET',headers={'Authorization':'Bearer '+t['access_token'],'Accept':'text/event-stream'})
  self.assertEqual(s,405)
  self.assertEqual(b,b'')
 def test_18_fake_notification_with_id_must_not_get_202(self):
  s,t,_,_=self.approve()
  self.assertEqual(s,200)
  s,_,_=self.call(self.cp09,'/mcp','POST',
    {'jsonrpc':'2.0','id':9,'method':'notifications/initialized'},
    {'Content-Type':'application/json','Authorization':'Bearer '+t['access_token']})
  self.assertEqual(s,400)


 def modern(self,method,token=None,name=None,arguments=None,version="2026-07-28",headers=None):
  meta={"io.modelcontextprotocol/protocolVersion":version,
        "io.modelcontextprotocol/clientInfo":{"name":"jm-cp10-test","version":"1.0"},
        "io.modelcontextprotocol/clientCapabilities":{}}
  params={"_meta":meta}
  if name is not None:params.update({"name":name,"arguments":arguments or {}})
  h={"Content-Type":"application/json","Accept":"application/json, text/event-stream",
     "MCP-Protocol-Version":version,"Mcp-Method":method}
  if token:h["Authorization"]="Bearer "+token
  if name is not None:h["Mcp-Name"]=name
  h.update(headers or {})
  return self.call(self.cp09,"/mcp","POST",
    {"jsonrpc":"2.0","id":20261028,"method":method,"params":params},h)

 def test_19_modern_discovery_is_authenticated_and_no_engine_substitution(self):
  self.assertEqual(self.modern("server/discover")[0],401)
  s,t,_,_=self.approve()
  self.assertEqual(s,200)
  status,_,raw=self.modern("server/discover",t["access_token"])
  self.assertEqual(status,200,raw)
  result=json.loads(raw)["result"]
  self.assertEqual(result["resultType"],"complete")
  self.assertIn("2026-07-28",result["supportedVersions"])
  self.assertEqual(result["capabilities"],{"tools":{}})
  self.assertNotIn(OWNER,raw.decode())

 def test_20_modern_read_list_and_real_original_history_call(self):
  s,t,_,_=self.approve()
  self.assertEqual(s,200)
  status,_,raw=self.modern("tools/list",t["access_token"])
  self.assertEqual(status,200,raw)
  result=json.loads(raw)["result"]
  self.assertEqual(result["resultType"],"complete")
  self.assertEqual([v["name"] for v in result["tools"]],["atomic_contact_history"])
  status,_,raw=self.modern("tools/call",t["access_token"],
      "atomic_contact_history",{})
  self.assertEqual(status,200,raw)
  self.assertEqual(json.loads(raw)["result"]["resultType"],"complete")
  status,_,raw=self.modern("tools/call",t["access_token"],
      "atomic_contact_execute",{"run_key":"cp10.must.not.write","apply":True})
  self.assertEqual(status,403,raw)

 def test_21_modern_header_spoof_rejected_before_original(self):
  s,t,_,_=self.approve()
  self.assertEqual(s,200)
  status,_,raw=self.modern("tools/list",t["access_token"],
      headers={"Mcp-Method":"tools/call"})
  self.assertEqual(status,400,raw)
  self.assertEqual(json.loads(raw)["error"]["code"],-32020)
  status,_,raw=self.modern("tools/call",t["access_token"],
      "atomic_contact_history",{},headers={"Mcp-Name":"atomic_contact_execute"})
  self.assertEqual(status,400,raw)
  self.assertEqual(json.loads(raw)["error"]["code"],-32020)

 def test_22_modern_unknown_method_fails_with_jsonrpc_404(self):
  s,t,_,_=self.approve()
  self.assertEqual(s,200)
  status,_,raw=self.modern("resources/list",t["access_token"])
  self.assertEqual(status,404,raw)
  self.assertEqual(json.loads(raw)["error"]["code"],-32601)

 def test_23_modern_unsupported_version_reports_scope_of_support(self):
  s,t,_,_=self.approve()
  self.assertEqual(s,200)
  status,_,raw=self.modern("server/discover",t["access_token"],version="2099-01-01")
  self.assertEqual(status,400,raw)
  self.assertEqual(json.loads(raw)["error"]["code"],-32022)
  self.assertIn("2026-07-28",json.loads(raw)["error"]["data"]["supported"])

if __name__=='__main__':unittest.main(verbosity=2)
