"""CP10 operator-only live Atlas export: real HTTP, dual secrets, one-shot."""
import hashlib
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path

import atlas_custody
import cp07_atomic_runtime as cp07
import server

ROOT=Path(__file__).resolve().parent
BEARER='cp10.owner.test.token.abcdefghijklmnopqrstuvwxyz'
GRANT='cp10.separate.custody.grant.0123456789abcdefghijklmnopqrstuvwxyz'


def port():
    with socket.socket() as s:
        s.bind(('127.0.0.1',0))
        return s.getsockname()[1]


class OperatorOnlyCustody(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path=Path(self.tmp.name)
        self.db=self.path/'active.sqlite3'
        self.port=port()
        self.proc=None
        atlas=server.Atlas(str(self.db))
        cp07.init(atlas)
        cp07.execute(atlas,'cp10.source.test.001',apply=True)
        self.start()
        self.addCleanup(self.stop)

    def start(self,enabled=False,grant=GRANT):
        self.stop()
        env=os.environ.copy()
        env.update({'JM_BODIES_TOKEN':BEARER,
            'JM_BODIES_CUSTODY_TOKEN':grant,
            'CP08_CUSTODY_EXPORT_ONCE':'1' if enabled else '0',
            'CP08_PUBLIC_ORIGIN':'http://127.0.0.1:'+str(self.port)})
        self.proc=subprocess.Popen([sys.executable,str(ROOT/'cp08_gateway.py'),
            '--host','127.0.0.1','--port',str(self.port),
            '--db',str(self.db)],cwd=ROOT,env=env,
            stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
        for _ in range(200):
            try:
                with urllib.request.urlopen(self.origin+'/health',timeout=.5) as resp:
                    if json.load(resp)['ok']:return
            except (OSError,ValueError):
                if self.proc.poll() is not None:break
                time.sleep(.02)
        error=self.proc.stderr.read().decode(errors='replace') if self.proc.poll() is not None else 'startup timeout'
        self.stop()
        raise RuntimeError('gateway refused to start: '+error[:600])

    def stop(self):
        if self.proc is None:return
        try:
            if self.proc.poll() is None:
                self.proc.terminate()
                try:self.proc.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    self.proc.kill()
                    self.proc.wait()
        finally:
            if self.proc.stderr is not None:self.proc.stderr.close()
            self.proc=None

    @property
    def origin(self):
        return 'http://127.0.0.1:'+str(self.port)

    def request(self,path='/custody/export',bearer=BEARER,grant=GRANT,
                origin=None,cookie=None,body=b'',method='POST'):
        headers={}
        if bearer is not None:headers['Authorization']='Bearer '+bearer
        if grant is not None:headers['X-JM-Custody-Grant']=grant
        if origin is not None:headers['Origin']=origin
        if cookie is not None:headers['Cookie']=cookie
        req=urllib.request.Request(self.origin+path,data=body if method=='POST' else None,
            headers=headers,method=method)
        try:
            with urllib.request.urlopen(req,timeout=25) as resp:
                return resp.status,dict(resp.headers.items()),resp.read()
        except urllib.error.HTTPError as err:
            return err.code,dict(err.headers.items()),err.read()

    def test_00_disabled_is_not_export_endpoint(self):
        before=atlas_custody.sha_file(self.db)
        code,headers,data=self.request()
        self.assertEqual(code,404)
        self.assertNotIn(b'SQLite',data)
        self.assertEqual(before,atlas_custody.sha_file(self.db))

    def test_01_enabled_requires_both_secrets(self):
        self.start(enabled=True)
        for bearer,grant,expected in [(None,GRANT,401),(BEARER,None,403),
                                      ('wrong',GRANT,401),(BEARER,'wrong',403)]:
            code,_,_=self.request(bearer=bearer,grant=grant)
            self.assertEqual(code,expected)
        # Denied requests must not consume the one allowed export.
        code,_,_=self.request()
        self.assertEqual(code,200)

    def test_02_real_http_original_receipt_export_then_new_host_recovery(self):
        self.start(enabled=True)
        original=atlas_custody.sha_file(self.db)
        code,h,data=self.request()
        self.assertEqual(code,200)
        self.assertEqual(h.get('Content-Type'),'application/zip')
        self.assertEqual(h.get('Cache-Control'),'private, no-store')
        self.assertEqual(h.get('X-JM-Export-One-Shot'),'true')
        self.assertEqual(h.get('X-JM-Archive-SHA256'),hashlib.sha256(data).hexdigest())
        self.assertEqual(original,atlas_custody.sha_file(self.db))
        path=self.path/'owner-export.zip'
        path.write_bytes(data)
        recovered=self.path/'other-host.sqlite3'
        actual=atlas_custody.restore(path,recovered,h['X-JM-Archive-SHA256'],apply=True)
        self.assertEqual(actual['state'],'COLD_ATLAS_RESTORED_NEW_PATH')
        self.assertEqual(actual['history']['event_count'],2)
        donor=server.Atlas(str(recovered))
        replay=cp07.execute(donor,'cp10.source.test.001',apply=True)
        self.assertEqual((replay['state'],replay['writes_now']),('ALREADY_PROVEN_REPLAY',0))

    def test_03_one_shot_denies_second_valid_export(self):
        self.start(enabled=True)
        self.assertEqual(self.request()[0],200)
        code,_,data=self.request()
        self.assertEqual(code,409)
        self.assertIn(b'CUSTODY_ONCE_ALREADY_CONSUMED',data)

    def test_04_browser_origins_and_cookies_refused(self):
        self.start(enabled=True)
        for kw in [{'origin':self.origin},{'origin':'https://gemini.google.com'},
                   {'cookie':'session=anything'}]:
            code,_,_=self.request(**kw)
            self.assertEqual(code,403)
        self.assertEqual(self.request()[0],200)

    def test_05_get_query_or_body_cannot_export(self):
        self.start(enabled=True)
        self.assertNotEqual(self.request(method='GET')[0],200)
        self.assertNotEqual(self.request(path='/custody/export?token=secret')[0],200)
        self.assertEqual(self.request(body=b'not empty')[0],413)
        self.assertEqual(self.request()[0],200)

    def test_06_old_mcp_scope_not_extended(self):
        self.start(enabled=True)
        payload={'jsonrpc':'2.0','id':1,'method':'tools/list','params':{}}
        req=urllib.request.Request(self.origin+'/mcp',data=json.dumps(payload).encode(),
             headers={'Authorization':'Bearer '+BEARER,'Content-Type':'application/json'})
        with urllib.request.urlopen(req,timeout=10) as resp:
            tools=json.load(resp)['result']['tools']
        self.assertEqual({x['name'] for x in tools},
                         {'atomic_contact_history','atomic_contact_execute'})

    def test_07_untrusted_short_export_secret_aborts_launch(self):
        self.stop()
        env=os.environ.copy()
        env.update({'JM_BODIES_TOKEN':BEARER,
            'JM_BODIES_CUSTODY_TOKEN':'short',
            'CP08_CUSTODY_EXPORT_ONCE':'1',
            'CP08_PUBLIC_ORIGIN':self.origin})
        result=subprocess.run([sys.executable,str(ROOT/'cp08_gateway.py'),'--host',
            '127.0.0.1','--port',str(self.port),'--db',str(self.db)],
            cwd=ROOT,env=env,capture_output=True,text=True,timeout=8)
        self.assertNotEqual(result.returncode,0)
        self.assertIn('independent JM_BODIES_CUSTODY_TOKEN',result.stderr)

    def test_08_two_simultaneous_valid_clients_get_only_one_archive(self):
        import concurrent.futures
        self.start(enabled=True)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            vals=list(pool.map(lambda _:self.request()[0],range(2)))
        self.assertEqual(sorted(vals),[200,409])


if __name__=='__main__':
    unittest.main(verbosity=2)
