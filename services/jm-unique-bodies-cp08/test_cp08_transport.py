"""Real HTTP socket regression for CP08; no Playwright fetch override."""
import json,os,socket,subprocess,tempfile,time,unittest,urllib.request,urllib.error,sys
from pathlib import Path
BASE=Path(__file__).resolve().parent
TOKEN='cp08.test.secret.0123456789.abcdef'

def choose_port():
 with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
class TestCP08Transport(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.db=str(Path(self.tmp.name)/'atlas.sqlite3');self.port=choose_port()
  try:self.start()
  except BaseException:
   if hasattr(self,'proc'):self.stop()
   self.tmp.cleanup()
   raise
 def tearDown(self):
  self.stop();self.tmp.cleanup()
 def start(self):
  env=os.environ.copy();env.update({'JM_BODIES_TOKEN':TOKEN,'CP08_PUBLIC_ORIGIN':f'http://127.0.0.1:{self.port}'})
  self.proc=subprocess.Popen([sys.executable,str(BASE/'cp08_gateway.py'),'--host','127.0.0.1','--port',str(self.port),'--db',self.db],env=env,cwd=BASE,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  for _ in range(400):
   try:
    with urllib.request.urlopen(f'http://127.0.0.1:{self.port}/health',timeout=.5) as r:
     if json.load(r)['ok']:return
   except Exception:
    if self.proc.poll() is not None:break
    time.sleep(.03)
  raise RuntimeError('CP08 server not ready; exit='+str(self.proc.poll()))
 def stop(self):
  self.proc.terminate()
  try:self.proc.wait(timeout=3)
  except subprocess.TimeoutExpired:self.proc.kill();self.proc.wait()
 def http(self,method='tools/call',name='atomic_contact_history',arguments=None,token=TOKEN,origin=None,full=None):
  request=full if full is not None else {'jsonrpc':'2.0','id':1,'method':method,'params':{'name':name,'arguments':arguments or {}}}
  headers={'Content-Type':'application/json'}
  if token is not None:headers['Authorization']='Bearer '+token
  if origin is not None:headers['Origin']=origin
  payload=json.dumps(request).encode()
  try:
   with urllib.request.urlopen(urllib.request.Request(f'http://127.0.0.1:{self.port}/mcp',data=payload,headers=headers),timeout=30) as r:return r.status,json.load(r)
  except urllib.error.HTTPError as e:return e.code,json.load(e)
 def test_00_authentication_and_origin(self):
  self.assertEqual(self.http(token=None)[0],401)
  self.assertEqual(self.http(token='bad')[0],401)
  self.assertEqual(self.http(origin='null')[0],403)
  self.assertEqual(self.http(origin='https://untrusted.example')[0],403)
  self.assertEqual(self.http(origin=f'http://127.0.0.1:{self.port}')[0],200)
 def test_01_scope_tool_list(self):
  code,p=self.http(method='tools/list',full={'jsonrpc':'2.0','id':1,'method':'tools/list','params':{}})
  self.assertEqual(code,200)
  self.assertEqual(set(x['name'] for x in p['result']['tools']),{'atomic_contact_history','atomic_contact_execute'})
  self.assertEqual(self.http(name='native_contact_execute',arguments={'run_key':'x.y.z','apply':True})[0],403)
  self.assertEqual(self.http(method='resources/list',full={'jsonrpc':'2.0','id':1,'method':'resources/list'})[0],403)
 def test_02_real_http_contact_and_replay(self):
  c,r=self.http(name='atomic_contact_execute',arguments={'run_key':'cp08.real.001','apply':True})
  self.assertEqual(c,200,r);a=r['result']['structuredContent'];self.assertEqual(a['state'],'ATOMIC_NATIVE_TO_ATLAS_PERSISTED')
  self.assertEqual([d['consequence'] for d in a['typed_delivery']],['door.open','inspect'])
  self.assertEqual(a['registration_count'],1)
  c,r=self.http(name='atomic_contact_execute',arguments={'run_key':'cp08.real.001','apply':True})
  self.assertEqual(r['result']['structuredContent']['state'],'ALREADY_PROVEN_REPLAY')
  h=self.http()[1]['result']['structuredContent']
  self.assertTrue(h['integrity_valid']);self.assertEqual(h['total_atlas_contact_events'],2)
 def test_03_32_run_stress_http(self):
  for i in range(32):
   c,r=self.http(name='atomic_contact_execute',arguments={'run_key':f'cp08.socket.{i:02}','apply':True})
   self.assertEqual(c,200,r);self.assertEqual(r['result']['structuredContent']['state'],'ATOMIC_NATIVE_TO_ATLAS_PERSISTED')
  h=self.http()[1]['result']['structuredContent']
  self.assertEqual((h['run_count'],h['total_atlas_contact_events'],h['registered_body_count']),(32,64,1));self.assertTrue(h['integrity_valid'])
 def test_04_restart_recovers_sqlite_and_replay(self):
  self.http(name='atomic_contact_execute',arguments={'run_key':'cp08.restart.001','apply':True})
  self.stop();self.start()
  h=self.http()[1]['result']['structuredContent'];self.assertTrue(h['integrity_valid']);self.assertEqual(h['total_atlas_contact_events'],2)
  r=self.http(name='atomic_contact_execute',arguments={'run_key':'cp08.restart.001','apply':True})[1]['result']['structuredContent']
  self.assertEqual((r['state'],r['writes_now']),('ALREADY_PROVEN_REPLAY',0))
 def test_05_no_token_in_html(self):
  data=urllib.request.urlopen(f'http://127.0.0.1:{self.port}/fold').read().decode()
  self.assertIn('MCP PERSISTENCE',data);self.assertNotIn(TOKEN,data)
 def test_06_tamper_detected(self):
  self.http(name='atomic_contact_execute',arguments={'run_key':'cp08.tamper.001','apply':True})
  import sqlite3
  with sqlite3.connect(self.db) as c:c.execute("UPDATE atomic_contact_runs SET receipt_hash='bad'")
  h=self.http()[1]['result']['structuredContent'];self.assertFalse(h['integrity_valid'])
  r=self.http(name='atomic_contact_execute',arguments={'run_key':'cp08.tamper.001','apply':True})[1]
  self.assertTrue(r['result']['isError'])
 def test_07_runkey_conflict(self):
  self.http(name='atomic_contact_execute',arguments={'run_key':'cp08.conflict.001','apply':True})
  r=self.http(name='atomic_contact_execute',arguments={'run_key':'cp08.conflict.001','apply':True,'glyph':'!'})[1]
  self.assertTrue(r['result']['isError'])
 def test_08_donor_hash_holds_before_write(self):
  import cp07_atomic_runtime as a
  self.assertEqual(a.native.PINS['native-core.mjs'],a.native.sha((BASE/'vendor/jm-sovereign-batch-three/native-core.mjs').read_bytes()))
 def test_09_parallel_idempotent_same_key(self):
  import concurrent.futures
  def call(_):return self.http(name='atomic_contact_execute',arguments={'run_key':'cp08.concurrent.001','apply':True})[1]['result']
  with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:out=list(executor.map(call,range(4)))
  self.assertEqual(len([r for r in out if not r.get('isError')]),4,out)
  self.assertEqual(self.http()[1]['result']['structuredContent']['total_atlas_contact_events'],2)
if __name__=='__main__':unittest.main(verbosity=2)