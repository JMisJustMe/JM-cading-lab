"""CP05: real-loopback sanitized ingress log and standard 2025 / legacy compatibility."""
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
class TracedTransport(unittest.TestCase):
    def test_bounded_logs_and_all_legacy_initializations(self):
        with socket.socket() as sk:
            sk.bind(('127.0.0.1',0))
            port=sk.getsockname()[1]
        child=subprocess.Popen([sys.executable,str(ROOT/'server.py')],
            env={**os.environ,'PORT':str(port),'HOST':'127.0.0.1','JM_WORKSHOP_TOKEN':''},
            stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
        def req(method,path,body=None,headers=None):
            conn=http.client.HTTPConnection('127.0.0.1',port,timeout=5)
            data=json.dumps(body).encode() if body is not None else None
            conn.request(method,path,body=data,headers=headers or {})
            r=conn.getresponse();status=r.status;raw=r.read();conn.close()
            return status,json.loads(raw) if raw else None
        try:
            for attempt in range(120):
                try:
                    if req('GET','/healthz')[0]==200:break
                except (OSError,ConnectionError):
                    time.sleep(.035)
            else:raise RuntimeError('Host not up')
            secret='LEAK_PROBE_SECRETS_NEVER_LOG_7421'
            for version,expected in [('2024-11-05','2025-11-25'),('2025-06-18','2025-06-18'),
                                     ('2025-11-25','2025-11-25')]:
                packet={'jsonrpc':'2.0','id':1,'method':'initialize','params':{'protocolVersion':version,
                        'capabilities':{},'clientInfo':{'name':secret,'version':'1.0'}}}
                code,obj=req('POST','/mcp?secret='+secret,packet,headers={'Content-Type':'application/json',
                   'Accept':'application/json, text/event-stream','Authorization':'Bearer '+secret,
                   'Cookie':'session='+secret,'User-Agent':secret})
                self.assertEqual(code,200)
                self.assertEqual(obj['result']['protocolVersion'],expected)
            code,obj=req('POST','/mcp',{'jsonrpc':'2.0','id':4,'method':'notifications/initialized'},{
                  'Content-Type':'application/json'})
            self.assertEqual(code,202)
            code,obj=req('POST','/mcp',{'jsonrpc':'2.0','id':5,'method':'tools/list','params':{}},{
                  'Content-Type':'application/json'})
            self.assertEqual(code,200)
            self.assertEqual(len(obj['result']['tools']),7)
            code,_=req('OPTIONS','/mcp',headers={
                  'Origin':'https://gemini.google.com',
                  'Access-Control-Request-Method':'POST',
                  'Access-Control-Request-Headers':'content-type'})
            self.assertEqual(code,204)
            code,_=req('OPTIONS','/mcp',headers={'Origin':secret,
                  'Access-Control-Request-Method':'POST'})
            self.assertEqual(code,403)
        finally:
            child.terminate()
            out,err=child.communicate(timeout=6)
        self.assertNotIn(secret,out)
        self.assertNotIn(secret,err)
        self.assertIn('"event":"JM_WORKSHOP_INGRESS_CP05"',out)
        logs=[json.loads(l) for l in out.splitlines() if l.startswith('{')]
        self.assertTrue(any(x['rpc_method']=='initialize' and x['status']==200
                       and x['origin_class']=='absent' for x in logs),logs)
        self.assertTrue(any(x['rpc_method']=='notifications/initialized' and x['status']==202
                       for x in logs),logs)
        self.assertTrue(any(x['rpc_method']=='tools/list' and x['status']==200
                       for x in logs),logs)
        self.assertTrue(any(x['http_method']=='OPTIONS' and x['status']==204
                       and x['origin_class']=='gemini_web' for x in logs),logs)
        self.assertTrue(any(x['http_method']=='OPTIONS' and x['status']==403
                       and x['origin_class']=='other' for x in logs),logs)
        self.assertTrue(all(set(x)=={'event','http_method','path','origin_class',
                       'mcp_version_header','rpc_method','status'} for x in logs),logs)
        self.assertTrue(all(x['path'] in ('/healthz','/mcp') for x in logs),logs)

if __name__=='__main__':unittest.main()
