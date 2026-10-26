"""Repository-grade local MCP Workshop v0.2 regression / adversarial / transport suite."""
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
import recipe
import workshop
from runtime import Dispatch


def sample():return recipe.sample_recipe()


def generated_package():
    blob,hashes=workshop.bundle(sample())
    folder=pathlib.Path(tempfile.mkdtemp(prefix='jm_workshop_generated_'))
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        z.extractall(folder)
    return folder,blob,hashes


class RecipeTests(unittest.TestCase):
    def test_sample_pass(self):self.assertEqual(recipe.execute(sample(),{'name':'JM'}),{'greeting':'JM says hello, JM'})
    def test_fingerprint_stable(self):self.assertEqual(recipe.digest(sample()),recipe.digest(json.loads(json.dumps(sample()))))
    def test_no_eval(self):self.assertNotIn('eval(', (ROOT/'recipe.py').read_text())
    def test_duplicate_input_rejected(self):
        r=sample();r['inputs'].append(dict(r['inputs'][0]));self.assertRaises(recipe.RecipeError,recipe.validate_recipe,r)
    def test_extra_recipe_key_rejected(self):
        r=sample();r['exec']='rm -rf';self.assertRaises(recipe.RecipeError,recipe.validate_recipe,r)
    def test_bad_slug_rejected(self):
        r=sample();r['slug']='hello;import os';self.assertRaises(recipe.RecipeError,recipe.validate_recipe,r)
    def test_unknown_opcode_rejected(self):
        r=sample();r['steps'][0]['op']='python';self.assertRaises(recipe.RecipeError,recipe.validate_recipe,r)
    def test_duplicate_step_output_rejected(self):
        r=sample();r['steps'][0]['as']='name';self.assertRaises(recipe.RecipeError,recipe.validate_recipe,r)
    def test_unknown_source_rejected(self):
        r=sample();r['steps'][0]['from']='absent';self.assertRaises(recipe.RecipeError,recipe.validate_recipe,r)
    def test_bad_format_injection_rejected(self):
        r=sample();r['steps'][0]={'op':'format','as':'upper_name','template':'{name.__class__}'};self.assertRaises(recipe.RecipeError,recipe.validate_recipe,r)
    def test_numeric_add(self):
        r={'slug':'sum_two','description':'Add two numerical inputs with explicit typed operations.',
          'inputs':[{'name':'a','type':'integer','required':True},{'name':'b','type':'integer','required':True}],
          'steps':[{'op':'add','as':'total','from':'a','with':'b'}],'outputs':['total']}
        self.assertEqual(recipe.execute(r,{'a':4,'b':5}),{'total':9})
    def test_bool_not_integer(self):
        r={'slug':'add_numbers','description':'Correctly distinguish booleans from integer input.',
          'inputs':[{'name':'a','type':'integer','required':True}],
          'steps':[{'op':'copy','as':'b','from':'a'}],'outputs':['b']}
        self.assertRaises(recipe.RecipeError,recipe.execute,r,{'a':True})
    def test_out_of_range_number(self):
        r={'slug':'large_num','description':'Reject unbounded input numbers, independent of caller.',
          'inputs':[{'name':'a','type':'integer','required':True}],
          'steps':[{'op':'copy','as':'b','from':'a'}],'outputs':['b']}
        self.assertRaises(recipe.RecipeError,recipe.execute,r,{'a':10**99})
    def test_unknown_argument(self):self.assertRaises(recipe.RecipeError,recipe.execute,sample(),{'name':'JM','secret':1})
    def test_missing_required_argument(self):self.assertRaises(recipe.RecipeError,recipe.execute,sample(),{})
    def test_format_template(self):
        r={'slug':'formatted','description':'Produce a named template using bounded fields.',
          'inputs':[{'name':'name','type':'string','required':True}],
          'steps':[{'op':'format','as':'message','template':'Hello {name}!'}],'outputs':['message']}
        self.assertEqual(recipe.execute(r,{'name':'Gemini'}),{'message':'Hello Gemini!'})
    def test_join(self):
        r={'slug':'joining','description':'Join a list of bounded user inputs without execution.',
          'inputs':[{'name':'a','type':'string','required':True},{'name':'b','type':'string','required':True}],
          'steps':[{'op':'join','as':'joined','parts':['a','b'],'value':' / '}],'outputs':['joined']}
        self.assertEqual(recipe.execute(r,{'a':'JM','b':'CP01'}),{'joined':'JM / CP01'})
    def test_default_input_schema(self):
        s=recipe.json_schema(sample());self.assertEqual(s['required'],['name']);self.assertFalse(s['additionalProperties'])


class WorkshopTests(unittest.TestCase):
    def test_define(self):self.assertEqual(workshop.define({'recipe':sample()})['state'],'DEFINITION_VALID')
    def test_define_no_unexpected_args(self):self.assertRaises(recipe.RecipeError,workshop.define,{'recipe':sample(),'unsafe':1})
    def test_connect_no_live_claim(self):
        a=workshop.connect({'recipe':sample(),'donor':{'name':'JM Build Mesh','route':'JM-BUILD-MESH','purpose':'Read-only capability donor descriptor'}})
        self.assertEqual(a['state'],'DONOR_ROUTE_PROPOSED');self.assertTrue(a['requires_owner_authorization_for_execution'])
    def test_connect_rejects_secret_field(self):self.assertRaises(recipe.RecipeError,workshop.connect,{'recipe':sample(),'donor':{'name':'JM Build Mesh','route':'route','purpose':'Read-only descriptor','secret':'x'}})
    def test_compose_parse(self):
        a=workshop.compose({'recipe':sample()});compile(a['source'],'server.py','exec')
        self.assertEqual(hashlib.sha256(a['source'].encode()).hexdigest(),a['source_sha256'])
    def test_test_pass(self):
        a=workshop.test({'recipe':sample(),'cases':[{'arguments':{'name':'J'}}]})
        self.assertEqual((a['state'],a['passed'],a['total']),('TEST_PASS',1,1))
    def test_test_mismatch_hold(self):
        a=workshop.test({'recipe':sample(),'cases':[{'arguments':{'name':'JM'},'expected':{'greeting':'NO'}}]})
        self.assertEqual(a['state'],'TEST_HOLD')
    def test_test_error_is_fail_closed(self):
        a=workshop.test({'recipe':sample(),'cases':[{'arguments':{'not_name':'JM'}}]})
        self.assertEqual(a['passed'],0)
    def test_compare_same(self):
        a=workshop.compare({'ancestor':sample(),'candidate':sample()});self.assertTrue(a['unchanged'])
    def test_compare_replacement_input_breaking(self):
        a=sample();b=sample();b['inputs'][0]['type']='number';r=workshop.compare({'ancestor':a,'candidate':b})
        self.assertTrue(r['potential_breaking_change'])
    def test_compare_noncontract_step_change_retest(self):
        a=sample();b=sample();b['steps'][1]['value']='X';r=workshop.compare({'ancestor':a,'candidate':b})
        self.assertTrue(r['behaviour_retest_required'])
    def test_publish_zip_contains_standalone_server(self):
        d=workshop.publish({'recipe':sample()});data=base64.b64decode(d['package_base64']);
        self.assertEqual(hashlib.sha256(data).hexdigest(),d['sha256'])
        with zipfile.ZipFile(io.BytesIO(data)) as z:self.assertEqual(sorted(z.namelist()),sorted(d['entry_sha256']))
    def test_bundle_deterministic(self):
        a,_=workshop.bundle(sample());b,_=workshop.bundle(sample());self.assertEqual(a,b)
    def test_resource_sample(self):self.assertEqual(workshop.read_resource('workshop://recipe/example')['slug'],'jm_greeting')
    def test_unknown_resource_hold(self):self.assertRaises(recipe.RecipeError,workshop.read_resource,'file:///etc/passwd')
    def test_tool_contracts_bound(self):self.assertEqual(set(workshop.HANDLERS),{t['name'] for t in workshop.list_tools()})
    def test_all_tool_arguments_strict(self):
        for t in workshop.list_tools():self.assertFalse(t['inputSchema']['additionalProperties'])
    def test_annotated_as_non_destructive(self):
        for t in workshop.list_tools():self.assertFalse(t['annotations']['destructiveHint'])


class TransportTests(unittest.TestCase):
    def setUp(self):self.app=Dispatch('JM MCP WORKSHOP','0.2.0',workshop.list_tools(),workshop.HANDLERS,workshop.resources(),workshop.read_resource)
    def rpc(self,method,params=None):return self.app.rpc({'jsonrpc':'2.0','method':method,'id':2,'params':params or {}})
    def test_initialize_2025(self):self.assertEqual(self.rpc('initialize',{'protocolVersion':'2025-11-25'})['result']['protocolVersion'],'2025-11-25')
    def test_initialize_older(self):self.assertEqual(self.rpc('initialize',{'protocolVersion':'2025-06-18'})['result']['protocolVersion'],'2025-06-18')
    def test_ping(self):self.assertEqual(self.rpc('ping')['result'],{})
    def test_list_tools(self):self.assertEqual(len(self.rpc('tools/list')['result']['tools']),7)
    def test_live_tool_call(self):
        r=self.rpc('tools/call',{'name':'workshop_test','arguments':{'recipe':sample(),'cases':[{'arguments':{'name':'JM'}}]}})['result']
        self.assertEqual(r['structuredContent']['passed'],1)
        self.assertEqual(json.loads(r['content'][0]['text']),r['structuredContent'])
    def test_bad_tool_returns_error_content(self):
        r=self.rpc('tools/call',{'name':'workshop_define','arguments':{'recipe':{}}})
        self.assertTrue(r['result']['isError'])
    def test_missing_tool_json_rpc_error(self):self.assertEqual(self.rpc('tools/call',{'name':'delete_all','arguments':{}})['error']['code'],-32602)
    def test_list_resources(self):self.assertEqual(len(self.rpc('resources/list')['result']['resources']),2)
    def test_read_resource(self):self.assertIn('jm_greeting',self.rpc('resources/read',{'uri':'workshop://recipe/example'})['result']['contents'][0]['text'])
    def test_prompt_list(self):self.assertEqual(self.rpc('prompts/list')['result']['prompts'][0]['name'],'design_safe_capability')
    def test_prompt_get(self):self.assertIn('hello',self.rpc('prompts/get',{'name':'design_safe_capability','arguments':{'purpose':'hello'}})['result']['messages'][0]['content']['text'])
    def test_notification(self):self.assertIsNone(self.app.rpc({'jsonrpc':'2.0','method':'notifications/initialized'}))
    def test_unknown_rpc(self):self.assertEqual(self.rpc('shell/exec')['error']['code'],-32601)


class RealProcessTests(unittest.TestCase):
    def test_stdio_real_subprocess(self):
        p=subprocess.run([sys.executable,str(ROOT/'server.py'),'--stdio'],input='{"jsonrpc":"2.0","id":7,"method":"tools/list"}\n',capture_output=True,text=True,timeout=6)
        self.assertEqual(p.returncode,0);self.assertEqual(len(json.loads(p.stdout)['result']['tools']),7)
    def test_generated_stdio_real_subprocess(self):
        folder,blob,hashes=generated_package()
        try:
            p=subprocess.run([sys.executable,str(folder/'server.py'),'--stdio'],input='{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"jm_greeting","arguments":{"name":"JM"}}}\n',capture_output=True,text=True,timeout=6)
            self.assertEqual(p.returncode,0,p.stderr)
            self.assertEqual(json.loads(p.stdout)['result']['structuredContent'],{'greeting':'JM says hello, JM'})
        finally:shutil.rmtree(folder)
    def test_real_http_post(self):
        sock=socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1];sock.close()
        env={**os.environ,'HOST':'127.0.0.1','PORT':str(port)}
        p=subprocess.Popen([sys.executable,str(ROOT/'server.py')],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env)
        try:
            for i in range(60):
                try:conn=http.client.HTTPConnection('127.0.0.1',port,timeout=1);conn.request('GET','/healthz');res=conn.getresponse();res.read();conn.close();break
                except OSError:time.sleep(.05)
            else:self.fail('HTTP service never started')
            conn=http.client.HTTPConnection('127.0.0.1',port,timeout=2)
            body=json.dumps({'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':'workshop_define','arguments':{'recipe':sample()}}})
            conn.request('POST','/mcp',body=body,headers={'Content-Type':'application/json','MCP-Protocol-Version':'2025-11-25','Accept':'application/json'})
            response=conn.getresponse();data=json.loads(response.read());conn.close()
            self.assertEqual(response.status,200)
            self.assertEqual(data['result']['structuredContent']['state'],'DEFINITION_VALID')
            conn=http.client.HTTPConnection('127.0.0.1',port,timeout=2)
            conn.request('POST','/mcp',body=body,headers={'Content-Type':'application/json','Origin':'https://evil.example'})
            response=conn.getresponse();response.read();conn.close();self.assertEqual(response.status,403)
            conn=http.client.HTTPConnection('127.0.0.1',port,timeout=2)
            conn.request('GET','/mcp');response=conn.getresponse();response.read();conn.close();self.assertEqual(response.status,405)
        finally:
            p.terminate();p.wait(timeout=5)

if __name__=='__main__':unittest.main()
