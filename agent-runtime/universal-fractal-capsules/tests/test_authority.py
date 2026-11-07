"""CP03 recipient-specific, actual-byte signing/numbering proofs; synthetic only."""
import json
import os
import tempfile
import unittest
import uuid
from pathlib import Path

from jm_ufc import CapsuleError, export_archive
from jm_ufc_web import export_web
from jm_ufc_authority import (init_owner, open_owner, allocate_personal_number,
                               sign_receipt, check_signed_receipt)


class AuthorityTest(unittest.TestCase):
    KEY_SECRET = 'A synthetic owner-vault secret deliberately not used for actual JM keys!'
    ARCH_SECRET = 'A synthetic browser encryption secret; never for user data!'

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.owner = str(uuid.uuid4())
        self.vault = self.root / 'owner-private.json'
        self.public = self.root / 'owner-public.json'
        init_owner(self.vault, self.public, self.KEY_SECRET, self.owner)
        (self.root / 'chat.json').write_text('{"messages":[{"role":"user","content":"synthetic"}]}', encoding='utf-8')
        (self.root / 'photo.png').write_bytes(b'\x89PNG\r\n\x1a\n Original synthetic pixels, NOT a real image')
        self.spec = self.root / 'spec.json'
        self.spec.write_text(json.dumps({
            'owner_id': self.owner, 'personal_number': 1, 'creation_kind': 'conversation',
            'items': [
                {'id': str(uuid.uuid4()), 'kind': 'conversation', 'source': 'chat.json', 'path': 'original/chat.json', 'parents': [], 'position': 0},
                {'id': str(uuid.uuid4()), 'kind': 'image', 'source': 'photo.png', 'path': 'original/photo.png', 'parents': [], 'position': 1},
            ],
        }), encoding='utf-8')

    def _archive(self, mode='web'):
        a = self.root / ('test-' + mode + '.jmufc')
        if mode == 'web':
            export_web(self.spec, a, self.ARCH_SECRET)
        else:
            export_archive(self.spec, a, self.ARCH_SECRET)
        return a, Path(str(a)+'.receipt.json')

    def _signed(self, mode='web'):
        archive, receipt = self._archive(mode)
        signed = self.root / ('signed-' + mode + '.json')
        sign_receipt(archive, receipt, self.vault, self.KEY_SECRET, self.ARCH_SECRET, signed)
        return archive, receipt, signed

    def test_browser_signed_ciphertext_trusted_pinned_key(self):
        a, r, signed = self._signed()
        result = check_signed_receipt(signed, a, r, self.public)
        self.assertTrue(result['signature_valid'])
        self.assertTrue(result['trusted_owner_key_matched'])
        self.assertEqual(result['signed_by_owner_id'], self.owner)

    def test_legacy_archive_also_signs_without_schema_mutation(self):
        a, r, signed = self._signed('legacy')
        self.assertTrue(check_signed_receipt(signed, a, r, self.public)['trusted_owner_key_matched'])

    def test_self_signed_unpinned_not_trusted(self):
        a, r, signed = self._signed()
        x = check_signed_receipt(signed, a, r)
        self.assertTrue(x['signature_valid'])
        self.assertFalse(x['trusted_owner_key_matched'])

    def test_wrong_owner_refused_before_signing(self):
        a, r = self._archive()
        other = self.root / 'someone-else-vault.json'
        init_owner(other, self.root/'other-public.json', self.KEY_SECRET)
        with self.assertRaises(CapsuleError):
            sign_receipt(a, r, other, self.KEY_SECRET, self.ARCH_SECRET, self.root/'no.json')
        self.assertFalse((self.root/'no.json').exists())

    def test_wrong_password_refused(self):
        with self.assertRaises(CapsuleError):
            open_owner(self.vault, 'This is a wrong encryption password')
        a, r = self._archive()
        with self.assertRaises(CapsuleError):
            sign_receipt(a,r,self.vault,self.KEY_SECRET,'wrong archive secret here',self.root/'no.json')

    def test_tampered_signed_payload_rejected(self):
        a, r, signed = self._signed()
        body = json.loads(signed.read_text())
        body['payload']['personal_number']=22
        signed.write_text(json.dumps(body))
        with self.assertRaises(CapsuleError):
            check_signed_receipt(signed,a,r,self.public)

    def test_tampered_archive_and_receipt_rejected(self):
        a, r, signed = self._signed()
        raw = bytearray(a.read_bytes());raw[-1]^=1;a.write_bytes(raw)
        with self.assertRaises(CapsuleError):
            check_signed_receipt(signed,a,r,self.public)
        a,r,signed = self._signed('legacy')
        receipt_json=json.loads(r.read_text());receipt_json['item_count']=999
        r.write_text(json.dumps(receipt_json))
        with self.assertRaises(CapsuleError):
            check_signed_receipt(signed,a,r,self.public)

    def test_signed_receipt_output_refuses_overwrite(self):
        a, r, signed = self._signed()
        prior = signed.read_bytes()
        with self.assertRaises(CapsuleError):
            sign_receipt(a,r,self.vault,self.KEY_SECRET,self.ARCH_SECRET,signed)
        self.assertEqual(prior,signed.read_bytes())

    def test_different_family_owners_each_begin_one_idempotently(self):
        registry = self.root/'personal-number-registry'
        other_public = self.root/'other-public.json'
        init_owner(self.root/'other-vault.json', other_public, self.KEY_SECRET)
        mine_a=str(uuid.uuid4());mine_b=str(uuid.uuid4());other_a=str(uuid.uuid4())
        a=allocate_personal_number(registry,self.public,mine_a)
        a_again=allocate_personal_number(registry,self.public,mine_a)
        b=allocate_personal_number(registry,self.public,mine_b)
        other=allocate_personal_number(registry,other_public,other_a)
        self.assertEqual((a['personal_number'],a_again['personal_number'],b['personal_number'],other['personal_number']),(1,1,2,1))
        self.assertTrue(a_again['already_registered'])
        self.assertNotEqual(a['owner_id'],other['owner_id'])

    def test_existing_foreign_or_corrupt_ledger_fail_closed(self):
        registry=self.root/'registry'
        allocate_personal_number(registry,self.public,str(uuid.uuid4()))
        ledger=registry/self.owner/'personal-numbers.json'
        j=json.loads(ledger.read_text());j['owner_id']=str(uuid.uuid4());ledger.write_text(json.dumps(j))
        with self.assertRaises(CapsuleError):
            allocate_personal_number(registry,self.public,str(uuid.uuid4()))

    def test_existing_lock_fail_closed(self):
        registry=self.root/'registry'
        owner_dir=registry/self.owner
        owner_dir.mkdir(parents=True)
        (owner_dir/'.allocation.lock').write_text('EXTERNAL_OWNER_RUNNING\n')
        with self.assertRaises(CapsuleError):
            allocate_personal_number(registry,self.public,str(uuid.uuid4()))
        self.assertTrue((owner_dir/'.allocation.lock').exists())

    def test_key_immutable(self):
        orig=self.vault.read_bytes()
        with self.assertRaises(CapsuleError):
            init_owner(self.vault,self.root/'unused.json',self.KEY_SECRET)
        self.assertEqual(orig,self.vault.read_bytes())

    def test_wrong_trusted_key_rejected(self):
        a,r,signed=self._signed()
        o=self.root/'other-public.json'
        init_owner(self.root/'other-vault.json',o,self.KEY_SECRET)
        with self.assertRaises(CapsuleError):
            check_signed_receipt(signed,a,r,o)


if __name__ == '__main__':
    unittest.main()
