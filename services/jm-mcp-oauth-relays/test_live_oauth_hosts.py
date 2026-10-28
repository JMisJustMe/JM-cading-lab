"""Actual public HTTPS assurance for the two new independent JM OAuth MCP clients.

Never provides private upstream credentials; proves registrations DO NOT grant
rights. User's later owner consent & actual ChatGPT/Gemini invocation separate.
"""
import base64,hashlib,json,time,unittest,urllib.parse,urllib.request,urllib.error
HOSTS={
 'commons':('https://jm-app-commons-cp07-oauth.onrender.com','https://jm-app-commons-cp06-mcp.onrender.com','commons:inspect'),
 'receipt':('https://jm-federation-receipt-cp03-oauth.onrender.com','https://jm-federation-receipt-cp02-mcp.onrender.com','receipt:issue')
}
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args):return None
def req(url,method='GET',body=None):
 headers={'Accept':'application/json'}
 if body is not None:
  headers['Content-Type']='application/json'
  body=json.dumps(body).encode()
 q=urllib.request.Request(url,data=body,headers=headers,method=method)
 try:
  with urllib.request.build_opener(NoRedirect()).open(q,timeout=28) as r:return r.status,r.headers,r.read(90000)
 except urllib.error.HTTPError as e:return e.code,e.headers,e.read(90000)
class Live(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  for realm,(gateway,original,scope) in HOSTS.items():
   for n in range(45):
    try:
     if req(gateway+'/health')[0]==200:break
    except Exception:pass
    time.sleep(3)
   else:raise AssertionError('HOSTED_'+realm+'_NOT_READY')
 def test_01_new_http_gateway_reaches_https_original_without_replacing_it(self):
  for realm,(gateway,original,scope) in HOSTS.items():
   s,_,raw=req(gateway+'/health')
   self.assertEqual(s,200)
   data=json.loads(raw)
   self.assertEqual(data['realm'],realm)
   self.assertFalse(data['original_service_mutated'])
   s,_,raw=req(original+'/healthz')
   self.assertEqual(s,200)
   print('LIVE_HTTPS_ORIGINAL_AND_REALM_REMAIN_INDEPENDENT',realm,flush=True)
 def test_02_oauth_discovery_contains_exact_sovereign_scope(self):
  for realm,(gateway,original,scope) in HOSTS.items():
   s,_,raw=req(gateway+'/.well-known/oauth-protected-resource/mcp')
   self.assertEqual(s,200)
   data=json.loads(raw)
   self.assertEqual(data['resource'],gateway+'/mcp')
   self.assertIn(scope,data['scopes_supported'])
   s,_,raw=req(gateway+'/.well-known/oauth-authorization-server')
   self.assertEqual(s,200)
   data=json.loads(raw)
   self.assertIn('S256',data['code_challenge_methods_supported'])
   self.assertEqual(data['registration_endpoint'],gateway+'/oauth/register')
   print('LIVE_OAUTH2_DISCOVERY_DCR_PKCE',realm,flush=True)
 def test_03_public_dcr_and_consent_form_do_not_grant_ownership(self):
  for realm,(gateway,original,scope) in HOSTS.items():
   s,_,raw=req(gateway+'/oauth/register','POST',{'redirect_uris':['https://chatgpt.com/connector_platform_oauth_redirect'],'client_name':'JM gated QA '+realm})
   self.assertEqual(s,201,(s,raw[:400]))
   client=json.loads(raw)['client_id']
   verifier='A'*48
   challenge=base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
   qs=urllib.parse.urlencode({'client_id':client,'redirect_uri':'https://chatgpt.com/connector_platform_oauth_redirect',
       'response_type':'code','code_challenge_method':'S256','code_challenge':challenge,
       'scope':scope,'resource':gateway+'/mcp','state':'JM_QA_NO_ACCESS'})
   s,_,html=req(gateway+'/oauth/authorize?'+qs)
   self.assertEqual(s,200)
   self.assertIn(b'owner_access_token',html)
   self.assertIn(realm.encode(),html.lower())
   s,_,_=req(gateway+'/mcp','POST',{'jsonrpc':'2.0','id':2,'method':'tools/list','params':{}})
   self.assertEqual(s,401)
   print('LIVE_DCR_CONSENT_NO_PRIVILEGES_GRANTED',realm,flush=True)
 def test_04_invalid_client_redirects_and_original_no_bearer(self):
  for realm,(gateway,original,scope) in HOSTS.items():
   s,_,_=req(gateway+'/oauth/register','POST',{'redirect_uris':['https://chatgpt.com.evil.invalid/callback']})
   self.assertEqual(s,400)
   s,_,_=req(original+'/mcp','POST',{'jsonrpc':'2.0','id':3,'method':'tools/list','params':{}})
   self.assertEqual(s,401)
   print('LIVE_INVALID_REDIRECT_AND_ORIGINAL_BEARER_HOLD',realm,flush=True)

 def test_05_live_modern_mcp_preflight_for_both_sovereign_realms(self):
  for realm,(gateway,original,scope) in HOSTS.items():
   q=urllib.request.Request(gateway+'/mcp',method='OPTIONS',headers={
     'Origin':'https://gemini.google.com','Access-Control-Request-Method':'POST',
     'Access-Control-Request-Headers':'Authorization,MCP-Protocol-Version,Mcp-Method,Mcp-Name'})
   with urllib.request.urlopen(q,timeout=28) as response:
    self.assertEqual(response.status,204)
    allowed=response.headers.get('Access-Control-Allow-Headers','')
    for field in ('MCP-Protocol-Version','Mcp-Method','Mcp-Name'):
     self.assertIn(field,allowed)
   print('LIVE_CP10_PREFLIGHT_FOR_'+realm.upper(),flush=True)



 def test_06_live_authorization_failure_returns_safe_restart_instructions(self):
  for realm,(gateway,original,scope) in HOSTS.items():
   params=urllib.parse.urlencode({
    'client_id':'UNREGISTERED_CLIENT_PROBE_ONLY_1234',
    'redirect_uri':'https://chatgpt.com/connector_platform_oauth_redirect',
    'response_type':'code','scope':scope,'state':'SECRET_TEST_STATE_NOT_TO_ECHO',
    'code_challenge_method':'S256','code_challenge':'A'*43
   })
   status,_,raw=req(gateway+'/oauth/authorize?'+params)
   self.assertEqual(status,400,raw)
   obj=json.loads(raw)
   self.assertEqual(obj['error'],'OAUTH_AUTHORIZATION_HOLD')
   self.assertEqual(obj['cause'],'CLIENT_REGISTRATION_NOT_FOUND')
   self.assertIn('Restart',obj['recovery'])
   self.assertNotIn(b'SECRET_TEST_STATE_NOT_TO_ECHO',raw)

if __name__=='__main__':unittest.main(verbosity=2)
