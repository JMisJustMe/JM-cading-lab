"""Tests of the actual public admission rail; never authorizes game execution."""
import json,os,subprocess,socket,time,unittest,http.client,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
class Ingress(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  with socket.socket() as sk:
   sk.bind(('127.0.0.1',0));cls.port=sk.getsockname()[1]
  cls.server=subprocess.Popen([sys.executable,str(ROOT/'server.py')],env={**os.environ,'PORT':str(cls.port)},stdout=subprocess.DEVNULL)
  for _ in range(100):
   try:
    if cls.req('GET','/healthz')[0]==200:break
   except OSError:time.sleep(0.05)
  else:raise AssertionError('server failed to start')
 @classmethod
 def tearDownClass(cls):
  cls.server.terminate();cls.server.wait(timeout=5)
 @classmethod
 def req(cls,verb='POST',path='/mcp',payload=None,headers=None):
  raw=json.dumps(payload).encode() if payload is not None else None
  conn=http.client.HTTPConnection('127.0.0.1',cls.port,timeout=5)
  conn.request(verb,path,body=raw,headers={'Content-Type':'application/json',**(headers or {})})
  r=conn.getresponse();status=r.status;hdr=dict(r.getheaders());data=r.read();conn.close()
  return status,hdr,json.loads(data) if data else None
 @classmethod
 def rpc(cls,method,params=None,headers=None,path='/mcp'):
  return cls.req('POST',path,{'jsonrpc':'2.0','id':7,'method':method,'params':params or {}},headers)
 def test_health(self):
  s,h,d=self.req('GET','/healthz');self.assertEqual(s,200);self.assertEqual(d['game_assets'],0);self.assertFalse(d['execution'])
 def test_legacy(self):
  for v in ('2025-03-26','2025-06-18','2025-11-25','2024-11-05'):
   s,h,r=self.rpc('initialize',{'protocolVersion':v,'capabilities':{},'clientInfo':{}})
   self.assertEqual(s,200)
   self.assertEqual(r['result']['protocolVersion'],v if v!='2024-11-05' else '2025-06-18')
 def test_modern(self):
  p={'_meta':{'io.modelcontextprotocol/protocolVersion':'2026-07-28','io.modelcontextprotocol/clientCapabilities':{}}}
  s,h,r=self.rpc('server/discover',p,{'MCP-Protocol-Version':'2026-07-28','Mcp-Method':'server/discover'})
  self.assertEqual(s,200);self.assertIn('2026-07-28',r['result']['supportedVersions'])
 def test_discovery(self):
  s,h,r=self.rpc('tools/list');self.assertEqual(s,200)
  tools=r['result']['tools'];self.assertEqual(len(tools),7)
  for t in tools:self.assertEqual(t['inputSchema']['type'],'object');self.assertEqual(t['inputSchema']['additionalProperties'],False)
 def test_status(self):
  s,h,r=self.rpc('tools/call',{'name':'experience_status','arguments':{}})
  self.assertEqual(s,200);self.assertFalse(r['result']['isError']);self.assertEqual(r['result']['structuredContent']['hosted_game_source_count'],0)
 def test_protected_tools_are_denied(self):
  for n in ('experience_open','experience_act','experience_observe','experience_compare','experience_handoff_read','experience_close'):
   s,h,r=self.rpc('tools/call',{'name':n,'arguments':{}})
   self.assertEqual(s,200);self.assertTrue(r['result']['isError'])
   self.assertFalse(r['result']['structuredContent']['execution_occurred'])
 def test_preflight(self):
  s,h,_=self.req('OPTIONS',headers={'Origin':'https://gemini.google.com','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,mcp-method'})
  self.assertEqual(s,204);self.assertEqual(h['Access-Control-Allow-Origin'],'https://gemini.google.com')
 def test_cross_origin_rejected(self):
  self.assertEqual(self.req('OPTIONS',headers={'Origin':'https://evil.example'})[0],403)
 def test_slash(self):
  self.assertEqual(self.rpc('tools/list',path='/mcp/')[0],200)
 def test_notify(self):
  s,h,r=self.req('POST','/mcp',{'jsonrpc':'2.0','method':'notifications/initialized'});self.assertEqual(s,202)
 def test_get_mcp(self):self.assertEqual(self.req('GET','/mcp')[0],405)
 def test_not_game_source(self):
  self.assertFalse((ROOT/'samples').exists());self.assertFalse((ROOT/'captures').exists())
if __name__=='__main__':unittest.main()
