"""JM Federation SIX physical-host HTTPS verification: no credentials or private payloads.

Proves public readiness, bearer refusal, and provider preflight. NOT authenticated
Gemini/ChatGPT client execution. Inherits the original deployed MCP hosts intact.
"""
import json
import ssl
import time
import urllib.request
import urllib.error
import unittest

HOSTS={
 "mesh":("https://jm-ecostate-build-mesh-mcp.onrender.com","/health"),
 "workshop":("https://jm-mcp-workshop.onrender.com","/healthz"),
 "experience":("https://jm-live-experience-intake-mcp.onrender.com","/healthz"),
 "unique":("https://jm-unique-bodies-cp08-contact.onrender.com","/health"),
 "commons":("https://jm-app-commons-cp06-mcp.onrender.com","/healthz"),
 "receipt":("https://jm-federation-receipt-cp02-mcp.onrender.com","/healthz")
}
ctx=ssl.create_default_context()
def get(url,method='GET',body=None,headers=None):
 req=urllib.request.Request(url,method=method,data=None if body is None else json.dumps(body).encode('utf-8'),headers=headers or {})
 try:
  with urllib.request.urlopen(req,timeout=25,context=ctx) as r:return r.status,r.headers,bytes(r.read(150000))
 except urllib.error.HTTPError as e:return e.code,e.headers,bytes(e.read(150000))
def ready(label):
 url,path=HOSTS[label]
 last=None
 for attempt in range(22):
  try:
   status,headers,raw=get(url+path)
   if status==200:
    doc=json.loads(raw)
    assert isinstance(doc,dict)
    return doc
   last='HTTP '+str(status)
  except Exception as e:last=type(e).__name__+': '+str(e)[:70]
  time.sleep(3)
 raise AssertionError(label+' not responding: '+str(last))
class Federation(unittest.TestCase):
 def test_01_six_independent_https_services(self):
  for body in HOSTS:
   doc=ready(body)
   print('CONTACT_PASS',body,json.dumps(doc)[:190],flush=True)
 def test_02_commons_live_bearer_required(self):
  doc=ready('commons')
  self.assertEqual(doc['state'],'TOKEN_PROTECTED')
  self.assertEqual(doc['tool_count'],6)
  target=HOSTS['commons'][0]+'/mcp'
  rpc={'jsonrpc':'2.0','id':1,'method':'tools/list','params':{}}
  status,_,_=get(target,'POST',rpc,{'Content-Type':'application/json'})
  self.assertEqual(status,401)
  status,_,_=get(target,'POST',rpc,{'Content-Type':'application/json','Authorization':'Bearer WRONG_TEST_ONLY'})
  self.assertEqual(status,401)
  status,_,_=get(target,'POST',rpc,{'Content-Type':'application/json','Origin':'https://gemini.google.com.attacker.invalid'})
  self.assertEqual(status,403)
  print('COMMONS_HOSTED_NEGATIVE_AUTH_3_3_PASS',flush=True)
 def test_03_receipt_live_bearer_required(self):
  doc=ready('receipt')
  self.assertEqual(doc['authorization_required'],True)
  target=HOSTS['receipt'][0]+'/mcp'
  rpc={'jsonrpc':'2.0','id':2,'method':'tools/list','params':{}}
  status,_,_=get(target,'POST',rpc,{'Content-Type':'application/json'})
  self.assertEqual(status,401)
  status,_,_=get(target,'POST',rpc,{'Content-Type':'application/json','Authorization':'Bearer WRONG_TEST_ONLY'})
  self.assertEqual(status,401)
  status,_,_=get(target,'POST',rpc,{'Content-Type':'application/json','Origin':'https://gemini.google.com.attacker.invalid'})
  self.assertEqual(status,403)
  print('RECEIPT_HOSTED_NEGATIVE_AUTH_3_3_PASS',flush=True)
 def test_04_gemini_browser_preflight_is_not_gemini_authentication(self):
  for name in ('commons','receipt'):
   url=HOSTS[name][0]+'/mcp'
   status,headers,_=get(url,'OPTIONS',None,{'Origin':'https://gemini.google.com','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'})
   self.assertEqual(status,204,(name,status))
   self.assertEqual(headers.get('Access-Control-Allow-Origin'),'https://gemini.google.com')
  print('CORS_2_2_PASS_BUT_NO_GEMINI_CLIENT_PROOF',flush=True)
if __name__=='__main__':unittest.main(verbosity=2)
