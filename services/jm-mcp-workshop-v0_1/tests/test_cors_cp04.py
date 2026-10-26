"""CP04: owner-aligned cross-origin browser preflight, without opening public source/write access."""
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
ALLOWED='https://gemini.google.com'
HOSTED='https://jm-mcp-workshop.onrender.com'
DENIED='https://gemini.google.com.attacker.example'

class BrowserMcpCors(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with socket.socket() as s:
            s.bind(('127.0.0.1',0))
            cls.port=s.getsockname()[1]
        cls.proc=subprocess.Popen([sys.executable,str(ROOT/'server.py')],
            env={**os.environ,'PORT':str(cls.port),'HOST':'127.0.0.1','JM_WORKSHOP_TOKEN':''},
            stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for _ in range(120):
            try:
                r=cls.contact('GET','/healthz')
                if r[0]==200:break
            except (OSError,ConnectionError):time.sleep(.035)
        else:raise RuntimeError('local Workshop not ready')
    @classmethod
    def tearDownClass(cls):
        cls.proc.terminate()
        cls.proc.wait(timeout=5)
    @classmethod
    def contact(cls,method,path,body=None,headers=None):
        conn=http.client.HTTPConnection('127.0.0.1',cls.port,timeout=4)
        data=json.dumps(body).encode() if body is not None else None
        conn.request(method,path,body=data,headers=headers or {})
        resp=conn.getresponse()
        status=resp.status
        header={k.lower():v for k,v in resp.getheaders()}
        body=resp.read()
        conn.close()
        return status,header,body
    def preflight(self,origin=ALLOWED,method='POST',request_headers='content-type,mcp-protocol-version,mcp-method,mcp-name,authorization'):
        return self.contact('OPTIONS','/mcp',headers={'Origin':origin,
             'Access-Control-Request-Method':method,
             'Access-Control-Request-Headers':request_headers})
    def test_gemini_preflight_success(self):
        status,headers,body=self.preflight()
        self.assertEqual(status,204,body)
        self.assertEqual(headers.get('access-control-allow-origin'),ALLOWED)
        self.assertIn('POST',headers.get('access-control-allow-methods',''))
        for name in ('content-type','mcp-protocol-version','mcp-method','mcp-name','authorization'):
            self.assertIn(name,headers.get('access-control-allow-headers','').lower())
    def test_chatgpt_preflight_success(self):
        status,headers,_=self.preflight(origin='https://chatgpt.com')
        self.assertEqual(status,204)
        self.assertEqual(headers.get('access-control-allow-origin'),'https://chatgpt.com')
    def test_same_origin_owner_site(self):
        status,headers,_=self.preflight(origin=HOSTED)
        self.assertEqual(status,204)
        self.assertEqual(headers.get('access-control-allow-origin'),HOSTED)
    def test_origin_suffix_spoof_forbidden(self):
        status,headers,_=self.preflight(origin=DENIED)
        self.assertEqual(status,403)
        self.assertNotIn('access-control-allow-origin',headers)
    def test_unknown_method_does_not_pass(self):
        status,_,_=self.preflight(method='DELETE')
        self.assertEqual(status,405)
    def test_unknown_request_header_not_granted(self):
        status,headers,_=self.preflight(request_headers='content-type,x-evil-power')
        self.assertEqual(status,403)
        self.assertNotIn('access-control-allow-origin',headers)
    def test_only_mcp_endpoint_preflight(self):
        status,_,_=self.contact('OPTIONS','/etc/passwd',headers={'Origin':ALLOWED})
        self.assertEqual(status,404)
    def test_legacy_browser_post_has_access_header(self):
        status,headers,response=self.contact('POST','/mcp',
            {'jsonrpc':'2.0','id':5,'method':'tools/list','params':{}},
            {'Content-Type':'application/json','Accept':'application/json','Origin':ALLOWED,
             'MCP-Protocol-Version':'2025-11-25'})
        self.assertEqual(status,200,response)
        self.assertEqual(headers.get('access-control-allow-origin'),ALLOWED)
        self.assertEqual(len(json.loads(response)['result']['tools']),7)
    def test_modern_browser_post_has_access_header(self):
        method='server/discover'
        payload={'jsonrpc':'2.0','id':7,'method':method,'params':{'_meta':{
                'io.modelcontextprotocol/protocolVersion':'2026-07-28',
                'io.modelcontextprotocol/clientCapabilities':{}}}}
        status,headers,response=self.contact('POST','/mcp',payload,{'Content-Type':'application/json',
            'Origin':ALLOWED,'MCP-Protocol-Version':'2026-07-28',
            'Mcp-Method':method,'Accept':'application/json, text/event-stream'})
        self.assertEqual(status,200,response)
        self.assertEqual(headers.get('access-control-allow-origin'),ALLOWED)
        self.assertIn('2026-07-28',json.loads(response)['result']['supportedVersions'])
    def test_bad_origin_post_still_denied(self):
        status,headers,_=self.contact('POST','/mcp',
            {'jsonrpc':'2.0','id':2,'method':'tools/list','params':{}},
            {'Content-Type':'application/json','Origin':DENIED})
        self.assertEqual(status,403)
        self.assertNotIn('access-control-allow-origin',headers)
    def test_no_origin_no_unnecessary_cors(self):
        status,headers,_=self.contact('POST','/mcp',
            {'jsonrpc':'2.0','id':2,'method':'tools/list','params':{}},
            {'Content-Type':'application/json'})
        self.assertEqual(status,200)
        self.assertNotIn('access-control-allow-origin',headers)
    def test_auth_header_granted_not_auth_bypassed(self):
        status,headers,_=self.preflight(request_headers='authorization,content-type')
        self.assertEqual(status,204)
        self.assertIn('authorization',headers['access-control-allow-headers'].lower())
        self.assertFalse(os.environ.get('JM_WORKSHOP_TOKEN')) # token-free test environment only

if __name__=='__main__': unittest.main()
