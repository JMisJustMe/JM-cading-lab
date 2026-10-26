"""JM WORKSHOP CP03 dual-era MCP contract: actual localhost HTTP, no production claims."""
import http.client
import json
import os
import pathlib
import socket
import subprocess
import sys
import time
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import workshop
from runtime import Dispatch, MODERN, PROTOCOLS

META={'io.modelcontextprotocol/protocolVersion':MODERN,
      'io.modelcontextprotocol/clientCapabilities':{},
      'io.modelcontextprotocol/clientInfo':{'name':'JM-local-contract-test','version':'0.1'}}
def req(method,id=1,params=None,modern=True):
    p=dict(params or {})
    if modern:p['_meta']=dict(META)
    return {'jsonrpc':'2.0','id':id,'method':method,'params':p}

def score():
    return {'slug':'jm_score','description':'Safely add game score and bonus.',
            'inputs':[{'name':'a','type':'integer','required':True},
                      {'name':'b','type':'integer','required':True}],
            'steps':[{'op':'add','from':'a','with':'b','as':'total'}],
            'outputs':['total']}

class DispatchContract(unittest.TestCase):
    def setUp(self):
        self.app=Dispatch('JM MCP WORKSHOP',workshop.VERSION,workshop.list_tools(),workshop.HANDLERS)
    def test_modern_discovery(self):
        x=self.app.rpc(req('server/discover'),modern=True)['result']
        self.assertEqual(x['resultType'],'complete')
        self.assertIn(MODERN,x['supportedVersions'])
        self.assertEqual(x['_meta']['io.modelcontextprotocol/serverInfo']['name'],'JM MCP WORKSHOP')
    def test_modern_tools(self):
        x=self.app.rpc(req('tools/list'),modern=True)['result']
        self.assertEqual(x['resultType'],'complete')
        self.assertEqual(len(x['tools']),7)
        self.assertIn('workshop_run',{t['name'] for t in x['tools']})
    def test_modern_execute_real_recipe(self):
        x=self.app.rpc(req('tools/call',params={'name':'workshop_run',
                  'arguments':{'recipe':score(),'arguments':{'a':42,'b':8}}}),modern=True)['result']
        self.assertEqual(x['resultType'],'complete')
        self.assertEqual(x['structuredContent']['result']['total'],50)
    def test_modern_unknown_tool(self):
        x=self.app.rpc(req('tools/call',params={'name':'no-such-tool'}),modern=True)
        self.assertEqual(x['error']['code'],-32602)
    def test_modern_resources(self):
        x=self.app.rpc(req('resources/list'),modern=True)['result']
        self.assertEqual(x['resultType'],'complete')
    def test_modern_prompt_list(self):
        x=self.app.rpc(req('prompts/list'),modern=True)['result']
        self.assertEqual(x['resultType'],'complete')
    def test_legacy_still_works(self):
        x=self.app.rpc(req('tools/list',modern=False))['result']
        self.assertEqual(len(x['tools']),7)
        self.assertNotIn('resultType',x)
    def test_legacy_initialize_inherited(self):
        for ver in PROTOCOLS:
            x=self.app.rpc(req('initialize',modern=False,
                params={'protocolVersion':ver,'capabilities':{},'clientInfo':{'name':'test','version':'1'}}))['result']
            self.assertEqual(x['protocolVersion'],ver)

class WireContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with socket.socket() as s:
            s.bind(('127.0.0.1',0));cls.port=s.getsockname()[1]
        cls.proc=subprocess.Popen([sys.executable,str(ROOT/'server.py')],
          env={**os.environ,'HOST':'127.0.0.1','PORT':str(cls.port),'JM_WORKSHOP_TOKEN':''},
          stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
        for _ in range(100):
            try:
                status,*_=cls.send('GET','/healthz')
                if status==200:break
            except (ConnectionError,OSError):time.sleep(.035)
        else:raise RuntimeError('HTTP server not started')
    @classmethod
    def tearDownClass(cls):
        cls.proc.terminate();cls.proc.communicate(timeout=5)
    @classmethod
    def send(cls,method,path,body=None,headers=None):
        c=http.client.HTTPConnection('127.0.0.1',cls.port,timeout=4)
        data=json.dumps(body) if body is not None else None
        c.request(method,path,body=data,headers=headers or {})
        r=c.getresponse();b=r.read();status=r.status;h=dict(r.getheaders());c.close()
        try:b=json.loads(b)
        except (ValueError,UnicodeDecodeError):pass
        return status,h,b
    @classmethod
    def modern_call(cls,body,override=None):
        headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream',
                 'MCP-Protocol-Version':MODERN,'Mcp-Method':body['method']}
        if body['method'] in ('tools/call','prompts/get','resources/read'):
            headers['Mcp-Name']=body['params']['uri' if body['method']=='resources/read' else 'name']
        headers.update(override or {})
        return cls.send('POST','/mcp',body,headers)
    def test_discovery_http(self):
        status,_,data=self.modern_call(req('server/discover'))
        self.assertEqual(status,200,data)
        self.assertEqual(data['result']['resultType'],'complete')
        self.assertIn(MODERN,data['result']['supportedVersions'])
    def test_tools_http(self):
        status,_,data=self.modern_call(req('tools/list'))
        self.assertEqual(status,200,data)
        self.assertEqual(len(data['result']['tools']),7)
    def test_real_math_http(self):
        body=req('tools/call',params={'name':'workshop_run',
                 'arguments':{'recipe':score(),'arguments':{'a':21,'b':29}}})
        status,_,data=self.modern_call(body)
        self.assertEqual(status,200,data)
        self.assertEqual(data['result']['structuredContent']['result']['total'],50)
    def test_header_version_required(self):
        status,_,data=self.modern_call(req('tools/list'),{'MCP-Protocol-Version':'2025-11-25'})
        self.assertEqual(status,400)
        self.assertEqual(data['error']['code'],-32020)
    def test_header_method_required(self):
        status,_,data=self.modern_call(req('tools/list'),{'Mcp-Method':'ping'})
        self.assertEqual(status,400)
    def test_accept_both_required(self):
        status,_,data=self.modern_call(req('tools/list'),{'Accept':'application/json'})
        self.assertEqual(status,400)
    def test_capabilities_required(self):
        body=req('tools/list');del body['params']['_meta']['io.modelcontextprotocol/clientCapabilities']
        status,_,_=self.modern_call(body)
        self.assertEqual(status,400)
    def test_named_header_required(self):
        body=req('tools/call',params={'name':'workshop_run','arguments':{}})
        status,_,_=self.modern_call(body,{'Mcp-Name':'incorrect'})
        self.assertEqual(status,400)
    def test_unknown_version_reports_supported(self):
        status,_,data=self.send('POST','/mcp',req('tools/list',modern=False),
             {'Content-Type':'application/json','MCP-Protocol-Version':'2099-01-01'})
        self.assertEqual(status,400)
        self.assertIn(MODERN,data['error']['data']['supported'])
        self.assertEqual(data['error']['code'],-32022)
    def test_inherited_legacy(self):
        status,_,data=self.send('POST','/mcp',req('tools/list',modern=False),
             {'Content-Type':'application/json','Accept':'application/json'})
        self.assertEqual(status,200,data)
        self.assertNotIn('resultType',data['result'])
    def test_legacy_get_mcp_still_405(self):
        status,*_=self.send('GET','/mcp')
        self.assertEqual(status,405)
    def test_origin_denial_retained(self):
        status,_,_=self.modern_call(req('tools/list'),{'Origin':'https://attacker.example'})
        self.assertEqual(status,403)

if __name__=='__main__':unittest.main()
