"""JM Unique Bodies CP09 additive OAuth: real network, consent, scopes, original CP08 execution."""
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.parse
import urllib.request
BASE=Path(__file__).resolve().parent
TOKEN='CP09_OWNER_TEST_TOKEN_1234567890_XYZ987654'
def port():
 with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
def pkce(v):return base64.urlsafe_b64encode(hashlib.sha256(v.encode()).digest()).rstrip(b'=').decode()
class TestCP09RealTransport(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory()
  cls.port=port()
  cls.origin=f'http://127.0.0.1:{cls.port}'
  env={**os.environ,'JM_BODIES_TOKEN':TOKEN,'CP08_PUBLIC_ORIGIN':cls.origin}
  cls.process=subprocess.Popen([sys.executable,str(BASE/'cp09_oauth_gateway.py'),'--host','127.0.0.1',
    '--port',str(cls.port),'--db',str(Path(cls.tmp.name)/'atlas.sqlite3')],cwd=BASE,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
  for n in range(100):
   try:
    if cls.get('/health')[0]==200:break
   except Exception:pass
   if cls.process.poll() is not None:
    raise RuntimeError('CP09 startup failed '+cls.process.stderr.read().decode()[-1100:])
   time.sleep(.06)
  else:raise RuntimeError('CP09 startup timeout')
 @classmethod
 def tearDownClass(cls):
  if hasattr(cls,'process'):
   cls.process.terminate()
   try:cls.process.communicate(timeout=4)
   except subprocess.TimeoutExpired:cls.process.kill();cls.process.communicate()
  cls.tmp.cleanup()
 @classmethod
 def get(cls,path,method='GET',body=None,headers=None,redirect=False):
  if isinstance(body,dict) and (headers or {}).get('Content-Type')=='application/json':
   body=json.dumps(body).encode()
  elif isinstance(body,dict):
   body=urllib.parse.urlencode(body).encode()
  req=urllib.request.Request(cls.origin+path,data=body,headers=headers or {},method=method)
  opener=urllib.request.build_opener(urllib.request.HTTPHandler(),
      urllib.request.HTTPSHandler(),NoRedirect()) if not redirect else urllib.request.build_opener()
  try:
   with opener.open(req,timeout=20) as r:return r.status,r.headers,r.read(300000)
  except urllib.error.HTTPError as e:return e.code,e.headers,e.read(300000)
 @classmethod
 def rpc(cls,method,params=None,token=None):
  head={'Content-Type':'application/json'}
  if token is not None:head['Authorization']='Bearer '+token
  return cls.get('/mcp','POST',{'jsonrpc':'2.0','id':7,'method':method,'params':params or {}},head)
 def test_01_original_cp08_still_alive_and_token_protected(self):
  status,_,data=self.get('/health')
  self.assertEqual(status,200);self.assertEqual(json.loads(data)['version'],'0.8.0-cp08')
  self.assertEqual(self.rpc('tools/list')[0],401)
  self.assertEqual(self.rpc('tools/list',token=TOKEN)[0],200)
 def test_02_oauth_resource_metadata_and_auth_server(self):
  a=json.loads(self.get('/.well-known/oauth-protected-resource/mcp')[2])
  self.assertEqual(a['resource'],self.origin+'/mcp')
  b=json.loads(self.get('/.well-known/oauth-authorization-server')[2])
  self.assertEqual(b['code_challenge_methods_supported'],['S256'])
  self.assertEqual(b['registration_endpoint'],self.origin+'/oauth/register')
 def register(self,method='none',url='https://chatgpt.com/connector/oauth/callback'):
  s,h,b=self.get('/oauth/register','POST',{'redirect_uris':[url],'client_name':'JM ChatGPT test','token_endpoint_auth_method':method},{'Content-Type':'application/json'})
  return s,json.loads(b)
 def authorize(self,client,scope='cp08:read',verifier='A'*45,token=TOKEN):
  query=urllib.parse.urlencode({'client_id':client,'redirect_uri':'https://chatgpt.com/connector/oauth/callback','response_type':'code',
      'state':'JM_CHALLENGE','scope':scope,'code_challenge_method':'S256','code_challenge':pkce(verifier),
      'resource':self.origin+'/mcp'})
  s,_,data=self.get('/oauth/authorize?'+query)
  self.assertEqual(s,200,(s,data))
  m=re.search(rb'name="request_id" value="([^"]+)"',data)
  self.assertIsNotNone(m,data[:400])
  request_id=m.group(1).decode()
  return self.get('/oauth/authorize','POST',{'request_id':request_id,'owner_access_token':token},
    {'Content-Type':'application/x-www-form-urlencoded'})
 def exchange(self,client,code,verifier='A'*45,extra=None):
  form={'grant_type':'authorization_code','client_id':client,'code':code,
      'code_verifier':verifier,'redirect_uri':'https://chatgpt.com/connector/oauth/callback'}
  form.update(extra or {})
  s,_,b=self.get('/oauth/token','POST',form,{'Content-Type':'application/x-www-form-urlencoded'})
  return s,json.loads(b)
 def test_03_client_registration_rejects_open_redirect(self):
  self.assertEqual(self.register(url='https://chatgpt.com.evil.test/redirect')[0],400)
  self.assertEqual(self.register(url='https://attacker.example/callback')[0],400)
  self.assertEqual(self.register(url='http://chatgpt.com/callback')[0],400)
 def test_04_owner_consent_required_before_access(self):
  s,client=self.register()
  self.assertEqual(s,201)
  s,_,b=self.authorize(client['client_id'],token='WRONG_SECRET')
  self.assertEqual(s,400)
  self.assertIn(b'OAUTH_REQUEST_OR_AUTHORIZATION_HOLD',b)
 def test_05_pkce_scoped_original_tools_and_refresh(self):
  s,client=self.register()
  self.assertEqual(s,201)
  s,h,_=self.authorize(client['client_id'])
  self.assertEqual(s,302)
  self.assertTrue(h['Location'].startswith('https://chatgpt.com/'))
  code=urllib.parse.parse_qs(urllib.parse.urlsplit(h['Location']).query)['code'][0]
  s,token=self.exchange(client['client_id'],code)
  self.assertEqual(s,200,token)
  self.assertEqual(token['scope'],'cp08:read')
  s,_,body=self.rpc('tools/list',token=token['access_token'])
  self.assertEqual(s,200,body)
  names=[x['name'] for x in json.loads(body)['result']['tools']]
  self.assertEqual(names,['atomic_contact_history'])
  s,_,body=self.rpc('tools/call',{'name':'atomic_contact_execute','arguments':{'run_key':'scope.bypass','apply':True}},token['access_token'])
  self.assertEqual(s,403);self.assertIn(b'OAUTH_SCOPE_HOLD',body)
  s,_,body=self.rpc('tools/call',{'name':'atomic_contact_history','arguments':{}},token['access_token'])
  self.assertEqual(s,200,body)
  self.assertEqual(self.exchange(client['client_id'],code)[0],400)
  renew={'grant_type':'refresh_token','client_id':client['client_id'],'refresh_token':token['refresh_token']}
  s,_,b=self.get('/oauth/token','POST',renew,{'Content-Type':'application/x-www-form-urlencoded'})
  self.assertEqual(s,200,b);self.assertIn('access_token',json.loads(b))
  self.assertEqual(self.get('/oauth/token','POST',renew,{'Content-Type':'application/x-www-form-urlencoded'})[0],400)
 def test_06_explicit_owner_consent_enables_original_atomic_write(self):
  s,client=self.register()
  self.assertEqual(s,201)
  s,h,_=self.authorize(client['client_id'],scope='cp08:read cp08:execute')
  self.assertEqual(s,302)
  code=urllib.parse.parse_qs(urllib.parse.urlsplit(h['Location']).query)['code'][0]
  s,token=self.exchange(client['client_id'],code)
  self.assertEqual(s,200,token)
  s,_,b=self.rpc('tools/call',{'name':'atomic_contact_execute',
      'arguments':{'run_key':'cp09.real.atomic.001','apply':True}},token['access_token'])
  self.assertEqual(s,200,b)
  self.assertEqual(json.loads(b)['result']['structuredContent']['state'],'ATOMIC_NATIVE_TO_ATLAS_PERSISTED')
 def test_07_spoofed_origin_and_legacy_bearer_still_held(self):
  h={'Content-Type':'application/json','Origin':'https://attacker.example','Authorization':'Bearer '+TOKEN}
  self.assertEqual(self.get('/mcp','POST',{'jsonrpc':'2.0','id':1,'method':'tools/list'},h)[0],403)
  h['Origin']='https://gemini.google.com'
  self.assertEqual(self.get('/mcp','POST',{'jsonrpc':'2.0','id':1,'method':'tools/list'},h)[0],403)
 def test_08_fold_portal_preserved(self):
  s,head,b=self.get('/fold')
  self.assertEqual(s,200);self.assertIn(b'JM',b)
  self.assertIn("script-src 'sha256-",head.get('Content-Security-Policy',''))
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,hdrs,newurl):return None
if __name__=='__main__':unittest.main(verbosity=2)
