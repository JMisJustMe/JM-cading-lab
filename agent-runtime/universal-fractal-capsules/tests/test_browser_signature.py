"""CP03 JavaScript WebCrypto/Ed25519 parity using Node: not physical browser proof."""
import json
import shutil
import subprocess
import tempfile
import unittest
import uuid
from pathlib import Path

from jm_ufc import canonical
from jm_ufc_authority import init_owner, sign_receipt
from jm_ufc_web import export_web

ROOT=Path(__file__).resolve().parents[1]


class SignedBrowserParityTest(unittest.TestCase):
    def test_js_crypto_matches_python_signed_receipts_and_tamper_rejection(self):
        if not shutil.which('node'):
            self.skipTest('Node unavailable for JS Crypto cross-runtime test')
        html=(ROOT/'web/verify-signed.html').read_text()
        self.assertIn('<script>',html)
        core=html.split('<script>',1)[1].split("$('verify').onclick",1)[0]
        # Browser-UI handlers are intentionally excluded; this verifies the
        # *same* core JS cryptographic functions in independent Node WebCrypto.
        with tempfile.TemporaryDirectory() as d:
            d=Path(d);owner=str(uuid.uuid4())
            vault=d/'vault.json'; public=d/'public.json'
            init_owner(vault,public,'synthetic private signing key never for real use',owner)
            (d/'body.txt').write_text('Synthetic chat, no actual private content')
            spec=d/'spec.json'
            spec.write_bytes(canonical({'owner_id':owner,'personal_number':1,'creation_kind':'conversation','items':[
                {'source':'body.txt','kind':'conversation','path':'chat/body.txt','parents':[],'position':0}]}))
            archive=d/'sample.jmufc';passphrase='synthetic browser passphrase never for real private use'
            export_web(spec,archive,passphrase)
            receipt=Path(str(archive)+'.receipt.json');signed=d/'signed.json'
            sign_receipt(archive,receipt,vault,'synthetic private signing key never for real use',passphrase,signed)
            (d/'tampered.jmufc').write_bytes(archive.read_bytes()[:-1]+bytes([archive.read_bytes()[-1]^1]))
            js="import fs from 'node:fs';\n"+core+'''
 const archive=new Uint8Array(fs.readFileSync(process.argv[1]));
 const receiptBytes=new Uint8Array(fs.readFileSync(process.argv[2]));
 const signed=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
 const trusted=JSON.parse(fs.readFileSync(process.argv[4],'utf8'));
 const a=await check(archive,receiptBytes,signed,null);
 const b=await check(archive,receiptBytes,signed,trusted);
 if(!a.verified||a.trusted_owner_key_matched||!b.verified||!b.trusted_owner_key_matched)throw Error('TRUST_BOUNDARY_FAIL');
 let rejected=false;
 try{await check(new Uint8Array(fs.readFileSync(process.argv[5])),receiptBytes,signed,trusted)}catch(e){rejected=/hash mismatch/.test(e.message)}
 if(!rejected)throw Error('TAMPER_NOT_REJECTED');
 console.log('JS_CRYPTO_PARITY_PASS');
 '''
            result=subprocess.run(['node','--input-type=module','-e',js,str(archive),str(receipt),str(signed),str(public),str(d/'tampered.jmufc')],capture_output=True,text=True,timeout=20)
            self.assertEqual(result.returncode,0, result.stderr)
            self.assertIn('JS_CRYPTO_PARITY_PASS',result.stdout)


if __name__=='__main__':unittest.main()
