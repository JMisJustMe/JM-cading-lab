"""Real live CP09 OAuth discovery and denial, original CP08 unchanged.
No owner credential or protected game data is transmitted.
"""
import base64,hashlib,json,time,urllib.parse,urllib.request,urllib.error,unittest
BASE='https://jm-unique-bodies-cp09-oauth.onrender.com'
ORIGINAL='https://jm-unique-bodies-cp08-contact.onrender.com'
class TestHosted(unittest.TestCase):
 @classmethod
 def req(cls,url,method='GET',body=None,form=False):
  headers={'Accept':'application/json'}
  if body is not None:
   if form:
    headers['Content-Type']='application/x-www-form-urlencoded'
    body=urllib.parse.urlencode(body).encode()
   else:
    headers['Content-Type']='application/json'
    body=json.dumps(body).encode()
  req=urllib.request.Request(url,data=body,headers=headers,method=method)
  try:
   with urllib.request.build_opener(StopRedirect()).open(req,timeout=25) as r:return r.status,r.headers,r.read(50000)
  except urllib.error.HTTPError as e:return e.code,e.headers,e.read(50000)
 @classmethod
 def setUpClass(cls):
  for attempt in range(50):
   try:
    if cls.req(BASE+'/health')[0]==200:return
   except Exception:pass
   time.sleep(3)
  raise AssertionError('HOSTED_CP09_NOT_READY')
 def test_01_external_oauth_route_no_duplicate_atlas(self):
  s,_,raw=self.req(BASE+'/health')
  self.assertEqual(s,200)
  body=json.loads(raw)
  self.assertEqual(body['backend'],'ORIGINAL_CP08_NOT_REPLACED')
  self.assertEqual(body['auth'],'OAUTH_PKCE_OWNER_CONSENT')
  s,_,b=self.req(ORIGINAL+'/health')
  self.assertEqual(s,200)
  self.assertEqual(json.loads(b)['version'],'0.8.0-cp08')
  print('PASS original CP08 remains separate + CP09 live gateway',flush=True)
 def test_02_oauth_resource_metadata_and_pkce(self):
  s,_,raw=self.req(BASE+'/.well-known/oauth-protected-resource/mcp')
  self.assertEqual(s,200)
  self.assertEqual(json.loads(raw)['resource'],BASE+'/mcp')
  s,_,raw=self.req(BASE+'/.well-known/oauth-authorization-server')
  self.assertEqual(s,200)
  a=json.loads(raw)
  self.assertEqual(a['code_challenge_methods_supported'],['S256'])
  self.assertEqual(a['registration_endpoint'],BASE+'/oauth/register')
  print('PASS externally discoverable OAuth2.1 protected resource and PKCE metadata',flush=True)
 def test_03_live_dcr_and_owner_consent_form_but_no_permission_without_owner(self):
  s,_,raw=self.req(BASE+'/oauth/register','POST',{'redirect_uris':['https://chatgpt.com/connector/oauth/callback'],'client_name':'JM external safety fixture'})
  self.assertEqual(s,201,raw)
  client=json.loads(raw)['client_id']
  verifier='A'*45
  pkce=base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
  q=urllib.parse.urlencode({'client_id':client,'redirect_uri':'https://chatgpt.com/connector/oauth/callback','response_type':'code',
    'code_challenge_method':'S256','code_challenge':pkce,'state':'JM_P0',
    'scope':'cp08:read','resource':BASE+'/mcp'})
  s,_,html=self.req(BASE+'/oauth/authorize?'+q)
  self.assertEqual(s,200)
  self.assertIn(b'name="owner_access_token"',html)
  self.assertIn(b'JM external safety fixture',html)
  self.assertNotIn(b'Bearer ',html)
  print('PASS real dynamic client registration, PKCE and owner consent UI',flush=True)
 def test_04_guards_reject_no_owner_token(self):
  s,h,_=self.req(BASE+'/mcp')
  self.assertEqual(s,401)
  self.assertIn('resource_metadata=',h.get('WWW-Authenticate',''))
  s,h,_=self.req(BASE+'/mcp','POST',{'jsonrpc':'2.0','id':1,'method':'tools/list'})
  self.assertEqual(s,401)
  s,_,_=self.req(BASE+'/oauth/register','POST',{'redirect_uris':['https://chatgpt.com.evil.com/steal']})
  self.assertEqual(s,400)
  s,_,_=self.req(ORIGINAL+'/mcp','POST',{'jsonrpc':'2.0','id':1,'method':'tools/list'})
  self.assertEqual(s,401)
  print('PASS original and OAuth bridge protected, redirect spoof denied',flush=True)
class StopRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args):return None
if __name__=='__main__':unittest.main(verbosity=2)
