"""JM Federation Receipt CP02 deployment carrier over EXACT independently tested CP01 ZIP.

This is not a reimplementation. Fails closed without an environment bearer token.
No source snapshot, secret, private estate files, or owner project data embedded.
"""
import base64
import hashlib
import io
import os
from pathlib import Path
import runpy
import sys
import tempfile
import zipfile

ROOT=Path(__file__).resolve().parent
ZIP_SHA='b9d04050d20edfebd454a7ad3ecceee00ee9f4d8a81481b80814ca2ba4ba8faa'
FILES={
    'server.py':'c1bb19bec7f2300bfb04584703f54a69ea48bd9328ff7c5c7b75e34357ca1794',
    'runtime.py':'b2e0a7bb2228072e257c1c1e278e076dd689a4ea48661ccd5c2052aa38da4d91',
    'recipe.py':'d7fcc58a805dd3fdff0c11e7cdca5219671222fc0f12a68d1bb23f56142c28da',
    'manifest.json':'e07c9b25938a697ef516439dbe092831fd354e5fd5a4e781826c9262a0d93b25',
    'recipe.json':'d61b951ac7e7711c9409383db64f8aae2644317dc4fee7830510401470cb02ab',
    'README.md':'59fae7c39bcce6ed7fc6495cfc48af6d5f2da0b524e09cf387a8f23e99ec091f',
}
def sha(b):return hashlib.sha256(b).hexdigest()
def verified_zip():
    lines=(ROOT/'standalone_mcp_zip.b64').read_text(encoding='ascii').splitlines()
    archive=base64.b64decode(lines[-1],validate=True)
    if len(archive)!=10100 or sha(archive)!=ZIP_SHA:raise RuntimeError('HOLD: Workshop package hash mismatch')
    with zipfile.ZipFile(io.BytesIO(archive)) as bundle:
        if set(bundle.namelist())!=set(FILES) or bundle.testzip() is not None:raise RuntimeError('HOLD: Workshop archive entry mismatch')
        exact={name:bundle.read(name) for name in FILES}
    if any(sha(data)!=FILES[name] for name,data in exact.items()):raise RuntimeError('HOLD: Workshop source hash mismatch')
    return exact
def main():
    token=os.environ.get('JM_WORKSHOP_TOKEN','')
    if len(token)<24:raise SystemExit('HOLD: JM_WORKSHOP_TOKEN missing/weak. No anonymous hosted seat.')
    contents=verified_zip()
    with tempfile.TemporaryDirectory(prefix='jm-federation-receipt-') as path:
        out=Path(path)
        for name,data in contents.items():(out/name).write_bytes(data)
        sys.path.insert(0,path)
        os.chdir(path)
        print('JM_FEDERATION_CP02_EXACT_SOURCE_HOSTED_READY',flush=True)
        if os.environ.get('JM_RECEIPT_HOST_SELFTEST')=='1':
            from threading import Thread
            import json, time
            from urllib.request import Request, urlopen
            def verify_local_runtime():
                endpoint='http://127.0.0.1:'+os.environ.get('PORT','10000')+'/mcp'
                headers={'Content-Type':'application/json','Authorization':'Bearer '+token,
                         'Accept':'application/json, text/event-stream'}
                args={'gate':'JMOP-HOST-PROOF','admission':'PUBLIC_SAFE_CONTACT_ONLY',
                      'provider':'RENDER_HOST_LOCAL','fold':'UNOBSERVED','workshop':'EXACT_CP01'}
                body={'jsonrpc':'2.0','id':32,'method':'tools/call',
                      'params':{'name':'jm_federation_receipt_cp01','arguments':args}}
                for retry in range(15):
                    time.sleep(0.5)
                    try:
                        req=Request(endpoint,data=json.dumps(body).encode(),headers=headers,method='POST')
                        with urlopen(req,timeout=5) as response:
                            obj=json.loads(response.read())
                        output=obj['result']['structuredContent']
                        if output.get('remote_device_proven') is not False or not output['receipt'].startswith('JM_FED_CP01|GATE=JMOP-HOST-PROOF'):
                            raise ValueError('RECEIPT_SCOPE_MISMATCH')
                        print('JM_CP02_HOSTED_AUTH_SELFTEST PASS original MCP receipt and scope',flush=True)
                        return
                    except Exception:
                        continue
                print('JM_CP02_HOSTED_AUTH_SELFTEST HOLD no verified authenticated tool consequence',flush=True)
            Thread(target=verify_local_runtime,daemon=True).start()
        runpy.run_path(str(out/'server.py'),run_name='__main__')
if __name__=='__main__':main()
