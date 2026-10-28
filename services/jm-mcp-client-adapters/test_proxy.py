"""Pure local HTTP integration proof for JM client seat, no real bearer disclosure."""
import json
import os
import pathlib
import subprocess
import sys
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
import threading
import unittest

ROOT=pathlib.Path(__file__).resolve().parent
SCRIPT=ROOT/'stdio_http_bearer_proxy.py'
TOKEN='LOCAL_TEST_TOKEN_0123456789abcdef_ABCDEFGHIJKLMNOP'
calls=[]
class Recipient(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_POST(self):
  data=self.rfile.read(int(self.headers['Content-Length']))
  calls.append({'path':self.path,'token_ok':self.headers.get('Authorization')=='Bearer '+TOKEN,'payload':json.loads(data)})
  if self.path!='/mcp' or self.headers.get('Authorization')!='Bearer '+TOKEN:
   self.send_response(401);self.end_headers();return
  q=json.loads(data)
  result={'jsonrpc':'2.0','id':q.get('id'),'result':{}}
  if q['method']=='tools/list':result['result']={'tools':[{'name':'jm_original_inspect'}]}
  elif q['method']=='tools/call':result['result']={'structuredContent':{'hash':'FIXTURE_DIGEST'},'isError':False}
  self.send_response(200);self.send_header('Content-Type','application/json')
  self.end_headers();self.wfile.write(json.dumps(result).encode())
class TestClientSeat(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.server=ThreadingHTTPServer(('127.0.0.1',0),Recipient)
  cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True)
  cls.thread.start()
  cls.url=f'http://127.0.0.1:{cls.server.server_port}/mcp'
 @classmethod
 def tearDownClass(cls):cls.server.shutdown();cls.server.server_close()
 def run_proxy(self,target='commons',requests=None,secret=TOKEN,extra=None):
  env={**os.environ,'JM_COMMONS_REMOTE_TOKEN':secret,'JM_RECEIPT_REMOTE_TOKEN':secret,
       'JM_PROXY_TEST_URL':self.url,'JM_PROXY_TEST_ONLY':'1'}
  env.update(extra or {})
  wire=''.join(json.dumps(q)+'\n' for q in (requests or []))
  return subprocess.run([sys.executable,str(SCRIPT),'--target',target],input=wire,text=True,capture_output=True,env=env,timeout=15)
 def test_both_separate_client_aliases_use_actual_bearer_to_same_synthetic_recipient(self):
  for target in ('commons','receipt'):
   q={'jsonrpc':'2.0','id':13,'method':'tools/list'}
   p=self.run_proxy(target,[q])
   self.assertEqual(p.returncode,0)
   output=json.loads(p.stdout)
   self.assertEqual(output['result']['tools'][0]['name'],'jm_original_inspect')
   self.assertNotIn(TOKEN,p.stdout+p.stderr)
   self.assertTrue(calls[-1]['token_ok'])
 def test_genuine_tool_consequence_forwarded(self):
  q={'jsonrpc':'2.0','id':4,'method':'tools/call',
     'params':{'name':'jm_original_inspect','arguments':{'source':'JM test source'}}}
  p=self.run_proxy('commons',[q])
  self.assertEqual(json.loads(p.stdout)['result']['structuredContent']['hash'],'FIXTURE_DIGEST')
  self.assertEqual(calls[-1]['payload']['params']['arguments']['source'],'JM test source')
 def test_missing_secret_fails_closed(self):
  p=self.run_proxy('commons',[],secret='')
  self.assertEqual(p.returncode,2)
  self.assertIn('HOLD',p.stderr)
 def test_remote_url_override_fail_closed(self):
  p=self.run_proxy('commons',[],extra={'JM_PROXY_TEST_URL':'https://gemini.google.com/mcp'})
  self.assertEqual(p.returncode,2)
  self.assertIn('HOLD',p.stderr)
 def test_duplicate_json_keys_refused_before_any_remote_call(self):
  before=len(calls)
  env={**os.environ,'JM_COMMONS_REMOTE_TOKEN':TOKEN,
       'JM_PROXY_TEST_URL':self.url,'JM_PROXY_TEST_ONLY':'1'}
  p=subprocess.run([sys.executable,str(SCRIPT),'--target','commons'],
     input='{"jsonrpc":"2.0","id":1,"id":2,"method":"ping"}\n',
     text=True,capture_output=True,env=env,timeout=15)
  self.assertEqual(json.loads(p.stdout)['error']['code'],-32700)
  self.assertEqual(len(calls),before)
 def test_no_persistence_of_args(self):
  q={'jsonrpc':'2.0','id':99,'method':'tools/list'}
  p=self.run_proxy('receipt',[q,q])
  self.assertEqual(p.returncode,0)
  self.assertEqual(len(p.stdout.splitlines()),2)
  self.assertNotIn(TOKEN,p.stdout+p.stderr)
if __name__=='__main__':unittest.main(verbosity=2)
