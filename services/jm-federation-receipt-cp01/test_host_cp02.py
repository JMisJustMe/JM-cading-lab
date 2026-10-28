"""Execute actual CP02 hosted carrier locally via real sockets and inherited workshop runtime."""
import json
import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import unittest
from pathlib import Path

DIR=Path(__file__).resolve().parent
TOKEN='CP02_TEST_TOKEN_SAFE_FIXTURE_1234567890abcdef'
def open_port():
 with socket.socket() as s:
  s.bind(('127.0.0.1',0))
  return s.getsockname()[1]
class Hosted(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.port=open_port()
  cls.url=f'http://127.0.0.1:{cls.port}'
  cls.process=subprocess.Popen([sys.executable,'-u','host_cp02.py'],cwd=DIR,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env={**os.environ,'HOST':'127.0.0.1','PORT':str(cls.port),'JM_WORKSHOP_TOKEN':TOKEN})
  for attempt in range(100):
   try:
    status,body=cls.req('/healthz')
    if status==200:break
   except Exception:pass
   if cls.process.poll() is not None:raise AssertionError('HOLD startup: '+cls.process.stderr.read().decode()[-500:])
   time.sleep(.05)
  else:raise AssertionError('HOLD no health response')
 @classmethod
 def tearDownClass(cls):
  cls.process.terminate()
  try:cls.process.communicate(timeout=5)
  except subprocess.TimeoutExpired:cls.process.kill();cls.process.communicate()
 @classmethod
 def req(cls,path,method='GET',body=None,token=None,origin=None):
  headers={'Accept':'application/json, text/event-stream','Content-Type':'application/json'}
  if token is not None:headers['Authorization']='Bearer '+token
  if origin is not None:headers['Origin']=origin
  req=urllib.request.Request(cls.url+path,data=None if body is None else json.dumps(body).encode(),method=method,headers=headers)
  try:
   with urllib.request.urlopen(req,timeout=8) as response:return response.status,json.loads(response.read() or b'{}')
  except urllib.error.HTTPError as response:return response.code,json.loads(response.read() or b'{}')
 @classmethod
 def rpc(cls,method,params=None,id=1):
  return {'jsonrpc':'2.0','id':id,'method':method,'params':params or {}}
 def test_01_health_reports_bearer_required(self):
  status,data=self.req('/healthz')
  self.assertEqual(status,200);self.assertTrue(data['authorization_required'])
  self.assertEqual(data['mcp_endpoint'],'/mcp')
 def test_02_absent_bearer_rejected(self):
  status,data=self.req('/mcp','POST',self.rpc('tools/list'))
  self.assertEqual(status,401);self.assertEqual(data['error'],'Bearer token required')
 def test_03_bad_bearer_rejected(self):
  status,_=self.req('/mcp','POST',self.rpc('tools/list'),token='WRONG')
  self.assertEqual(status,401)
 def test_04_spoofed_origin_rejected(self):
  status,_=self.req('/mcp','POST',self.rpc('tools/list'),token=TOKEN,origin='https://gemini.google.com.evil.example')
  self.assertEqual(status,403)
 def test_05_token_allows_tools_list_original_source(self):
  status,r=self.req('/mcp','POST',self.rpc('tools/list'),token=TOKEN)
  self.assertEqual(status,200);self.assertEqual(r['result']['tools'][0]['name'],'jm_federation_receipt_cp01')
 def test_06_sixteen_authenticated_original_tool_calls(self):
  for i in range(16):
   args={'gate':'JMOP-TEST-'+str(i),'admission':'PUBLIC_SAFE_CONTACT_ONLY','provider':'RUNNER','fold':'UNOBSERVED','workshop':'ORIGINAL_CP01'}
   status,r=self.req('/mcp','POST',self.rpc('tools/call',{'name':'jm_federation_receipt_cp01','arguments':args},i+3),token=TOKEN)
   self.assertEqual(status,200)
   data=r['result']['structuredContent']
   self.assertTrue(data['receipt'].startswith('JM_FED_CP01|GATE=JMOP-TEST-'))
   self.assertEqual(data['receipt_chars'],len(data['receipt']))
   self.assertFalse(data['remote_device_proven'])
 def test_07_weak_token_blocks_startup(self):
  p=subprocess.run([sys.executable,'host_cp02.py'],cwd=DIR,env={**os.environ,'JM_WORKSHOP_TOKEN':'short'},capture_output=True,timeout=5)
  self.assertNotEqual(p.returncode,0)
  self.assertIn(b'HOLD',p.stderr+p.stdout)
 def test_08_composition_unchanged(self):
  sys.path.insert(0,str(DIR))
  from host_cp02 import verified_zip
  self.assertEqual(len(verified_zip()),6)

if __name__=='__main__':unittest.main(verbosity=2)
