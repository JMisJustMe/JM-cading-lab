"""JM WORKSHOP CP02 forward proof: real owner contact route + runtime & package boundaries."""
import base64
import hashlib
import http.client
import io
import json
import os
import pathlib
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import recipe,workshop
from runtime import Dispatch


def score():
    return {'slug':'jm_score_bonus','description':'Calculate a game score plus a bounded achievement bonus.',
            'inputs':[{'name':'score','type':'integer','required':True},{'name':'bonus','type':'integer','required':True}],
            'steps':[{'op':'add','from':'score','with':'bonus','as':'total'},
                     {'op':'prefix','from':'total','value':'Score: ','as':'label'}],
            'outputs':['total','label']}

class V02Behavior(unittest.TestCase):
    def test_version(self):self.assertEqual(workshop.VERSION,'0.2.0')
    def test_tool_registry(self):self.assertEqual(len(workshop.list_tools()),7)
    def test_direct_real_score(self):
        d=workshop.run({'recipe':score(),'arguments':{'score':42,'bonus':8}})
        self.assertEqual(d['result'],{'total':50,'label':'Score: 50'})
        self.assertEqual(d['state'],'RECIPE_EXECUTED')
        self.assertFalse(d['mutation_performed'])
    def test_direct_no_exec(self):
        bad=score();bad['steps'][0]['op']='exec'
        with self.assertRaises(recipe.RecipeError): workshop.run({'recipe':bad,'arguments':{'score':1,'bonus':2}})
    def test_direct_no_secret_input(self):
        with self.assertRaises(recipe.RecipeError): workshop.run({'recipe':score(),'arguments':{'score':1,'bonus':2,'secret':'abc'}})
    def test_direct_bad_extra_envelope(self):
        with self.assertRaises(recipe.RecipeError): workshop.run({'recipe':score(),'arguments':{'score':1,'bonus':2},'shell':'ls'})
    def test_direct_numeric_limit(self):
        with self.assertRaises(recipe.RecipeError):workshop.run({'recipe':score(),'arguments':{'score':10**70,'bonus':1}})
    def test_direct_no_network(self):
        bad=score();bad['steps']=[{'op':'http','as':'total','url':'https://localhost'}]
        with self.assertRaises(recipe.RecipeError): workshop.run({'recipe':bad,'arguments':{'score':1,'bonus':2}})
    def test_http_model_structured_match(self):
        app=Dispatch('JM MCP WORKSHOP','0.2.0',workshop.list_tools(),workshop.HANDLERS)
        r=app.rpc({'jsonrpc':'2.0','id':8,'method':'tools/call','params':{'name':'workshop_run','arguments':{'recipe':score(),'arguments':{'score':42,'bonus':8}}}})
        self.assertEqual(r['result']['structuredContent']['result']['total'],50)
        self.assertEqual(json.loads(r['result']['content'][0]['text']),r['result']['structuredContent'])
    def test_example_game_badge(self):
        b={'slug':'jm_game_badge','description':'Generate an achievement badge for an authored game character.',
          'inputs':[{'name':'hero','type':'string','required':True},{'name':'level','type':'integer','required':True}],
          'steps':[{'op':'format','as':'badge','template':'{hero} · LEVEL {level} · ACHIEVEMENT UNLOCKED'}],
          'outputs':['badge']}
        self.assertEqual(workshop.run({'recipe':b,'arguments':{'hero':'Rift Runner','level':5}})['result']['badge'],
                         'Rift Runner · LEVEL 5 · ACHIEVEMENT UNLOCKED')
    def test_child_propagates_score(self):
        z,_=workshop.bundle(score())
        with tempfile.TemporaryDirectory() as folder:
            with zipfile.ZipFile(io.BytesIO(z)) as arc:arc.extractall(folder)
            p=subprocess.run([sys.executable,'server.py','--stdio'],cwd=folder,input=json.dumps({'jsonrpc':'2.0','method':'tools/call','id':12,'params':{'name':'jm_score_bonus','arguments':{'score':42,'bonus':8}}})+'\n',capture_output=True,text=True,timeout=10)
            self.assertEqual(p.returncode,0,p.stderr)
            self.assertEqual(json.loads(p.stdout)['result']['structuredContent']['total'],50)
    def test_package_byte_determinism(self):
        a,_=workshop.bundle(score());b,_=workshop.bundle(score());self.assertEqual(a,b)
        self.assertEqual(workshop.publish({'recipe':score()})['sha256'],hashlib.sha256(a).hexdigest())
    def test_built_package_never_exposes_workshop_private_files(self):
        b,_=workshop.bundle(score())
        with zipfile.ZipFile(io.BytesIO(b)) as z:
            self.assertNotIn('workshop.html',z.namelist())
            self.assertNotIn('workshop.py',z.namelist())
    def test_all_tool_schemas_include_run(self):
        d={t['name']:t for t in workshop.list_tools()}
        self.assertEqual(d['workshop_run']['inputSchema']['required'],['recipe','arguments'])
        self.assertFalse(d['workshop_run']['annotations']['destructiveHint'])
    def test_ui_has_no_inline_scripts(self):
        html=(ROOT/'workshop.html').read_text()
        self.assertIn('src="/workshop.js"',html)
        self.assertNotIn('<script>',html)
        self.assertIn('name="viewport"',html)
    def test_ui_no_external_scripts_or_css(self):
        text=(ROOT/'workshop.html').read_text()
        self.assertNotIn('https://',text)
        self.assertIn('href="/workshop.css"',text)
    def test_ui_script_has_action_route(self):
        js=(ROOT/'workshop.js').read_text()
        for name in ('workshop_define','workshop_run','workshop_test','workshop_publish'):
            self.assertIn(name,js)
        self.assertIn('URL.createObjectURL',js)
    def test_css_mobile(self):
        self.assertIn('@media(max-width:470px)',(ROOT/'workshop.css').read_text())

class V02Http(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        s=socket.socket();s.bind(('127.0.0.1',0));cls.port=s.getsockname()[1];s.close()
        cls.proc=subprocess.Popen([sys.executable,str(ROOT/'server.py')],env={**os.environ,'PORT':str(cls.port),'HOST':'127.0.0.1'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for _ in range(100):
            try:
                cls.get('/healthz');break
            except (ConnectionError,OSError):time.sleep(.035)
        else:raise RuntimeError('Workshop HTTP not live')
    @classmethod
    def tearDownClass(cls):cls.proc.terminate();cls.proc.wait(timeout=5)
    @classmethod
    def get(cls,path):
        c=http.client.HTTPConnection('127.0.0.1',cls.port,timeout=3);c.request('GET',path)
        r=c.getresponse();result=(r.status,dict(r.getheaders()),r.read());c.close();return result
    def test_health(self):
        status,headers,data=self.get('/healthz');self.assertEqual(status,200)
        self.assertEqual(json.loads(data)['version'],'0.2.0')
    def test_owner_editor_live_route(self):
        status,headers,data=self.get('/');self.assertEqual(status,200)
        self.assertIn('text/html',headers['Content-Type']);self.assertIn(b'MCP <em>WORKSHOP</em>',data)
        self.assertIn('script-src',headers['Content-Security-Policy'])
    def test_asset_routes(self):
        for path,typ in (('/workshop.js','javascript'),('/workshop.css','css')):
            with self.subTest(path=path):
                status,headers,data=self.get(path)
                self.assertEqual(status,200)
                self.assertIn(typ,headers['Content-Type']);self.assertGreater(len(data),200)
    def test_unknown_path_rejected(self):self.assertEqual(self.get('/etc/passwd')[0],404)
    def test_get_mcp_rejected(self):self.assertEqual(self.get('/mcp')[0],405)
    def _origin_post(self,origin):
        c=http.client.HTTPConnection('127.0.0.1',self.port,timeout=3)
        body=json.dumps({'jsonrpc':'2.0','id':8,'method':'tools/list','params':{}})
        c.request('POST','/mcp',body=body,headers={'Content-Type':'application/json','Origin':origin})
        r=c.getresponse();code=r.status;response=r.read();c.close()
        return code,response
    def test_canonical_hosted_browser_origin_allowed(self):
        code,response=self._origin_post('https://jm-mcp-workshop.onrender.com')
        self.assertEqual(code,200,response[:250])
    def test_same_origin_local_browser_allowed(self):
        code,response=self._origin_post('http://127.0.0.1:'+str(self.port))
        self.assertEqual(code,200,response[:250])
    def test_origin_suffix_spoof_denied(self):
        code,response=self._origin_post('https://jm-mcp-workshop.onrender.com.evil.example')
        self.assertEqual(code,403)
    def test_unlisted_external_site_denied(self):
        code,response=self._origin_post('https://not-jm.example')
        self.assertEqual(code,403)
    def test_jsonrpc_direct_run(self):
        c=http.client.HTTPConnection('127.0.0.1',self.port,timeout=3)
        payload=json.dumps({'jsonrpc':'2.0','id':42,'method':'tools/call','params':{'name':'workshop_run','arguments':{'recipe':score(),'arguments':{'score':42,'bonus':8}}}})
        c.request('POST','/mcp',body=payload,headers={'Content-Type':'application/json','Accept':'application/json'})
        r=c.getresponse();self.assertEqual(r.status,200)
        self.assertEqual(json.loads(r.read())['result']['structuredContent']['result']['total'],50)
        c.close()

if __name__=='__main__':unittest.main()
