import io
import json
import tempfile
import unittest
import uuid
import zipfile
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from jm_ufc import (CapsuleError, build_capsule, decode_capsule, export_archive,
                    import_archive, verify_archive, secure_relative, sha256)

PASSWORD = "correct horse battery staple 2026!"


def make_docx():
    b = io.BytesIO()
    with zipfile.ZipFile(b, "w") as z:
        z.writestr("word/document.xml", '<w:document><w:p><w:t>Derived document</w:t></w:p></w:document>')
    return b.getvalue()


class CapsuleTest(unittest.TestCase):
    def setUp(self):
        self.t = tempfile.TemporaryDirectory()
        self.addCleanup(self.t.cleanup)
        self.root = Path(self.t.name)
        (self.root / "source").mkdir()
        self.chat = {"messages": [{"position": 0, "role": "user", "text": "Show my creation"},
                                  {"position": 1, "role": "assistant", "text": "Image attached", "attachments": ["media/art.png"]}]}
        self.originals = {
            "chat/chat.json": json.dumps(self.chat).encode(),
            "media/art.png": b"\x89PNG\r\n\x1a\nsynthetic-test-image-bytes",
            "docs/derived.docx": make_docx(),
        }
        for p, b in self.originals.items():
            dst = self.root / "source" / p
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_bytes(b)
        ids = [str(uuid.uuid4()) for _ in range(3)]
        self.spec = {
            "owner_id": str(uuid.uuid4()), "personal_number": 1, "creation_kind": "conversation",
            "items": [
                {"id": ids[0], "kind": "conversation", "source": "source/chat/chat.json", "path": "chat/chat.json", "parents": [], "position": 0},
                {"id": ids[1], "kind": "image", "source": "source/media/art.png", "path": "media/art.png", "parents": [ids[0]], "position": 1, "metadata": {"message_index": 1, "attachment_index": 0}},
                {"id": ids[2], "kind": "document", "source": "source/docs/derived.docx", "path": "docs/derived.docx", "parents": [ids[0]], "position": 2},
            ],
        }
        self.specfile = self.root / "spec.json"
        self.specfile.write_text(json.dumps(self.spec))
        self.archive = self.root / "first.jmufc"

    def test_export_verify_restore_complete_bytes_and_ancestry(self):
        receipt = export_archive(self.specfile, self.archive, PASSWORD)
        manifest, blobs = verify_archive(self.archive, PASSWORD, str(self.archive) + ".receipt.json")
        self.assertEqual(len(blobs), 3)
        self.assertEqual(receipt["root_hash"], manifest["root_hash"])
        dest = self.root / "restored"
        imported = import_archive(self.archive, dest, PASSWORD, str(self.archive) + ".receipt.json")
        self.assertEqual(imported, manifest)
        self.assertEqual({p: (dest / p).read_bytes() for p in self.originals}, self.originals)
        self.assertEqual(json.loads((dest / "chat/chat.json").read_text())["messages"][1]["attachments"], ["media/art.png"])
        self.assertEqual(manifest["items"][1]["parents"], [manifest["items"][0]["id"]])
        self.assertEqual(manifest["items"][1]["metadata"]["attachment_index"], 0)

    def test_two_owners_can_both_have_number_one(self):
        a, _ = build_capsule(self.spec, self.root, PASSWORD)
        other = dict(self.spec, owner_id=str(uuid.uuid4()))
        b, _ = build_capsule(other, self.root, PASSWORD)
        ma, _ = decode_capsule(a, PASSWORD)
        mb, _ = decode_capsule(b, PASSWORD)
        self.assertEqual((ma["personal_number"], mb["personal_number"]), (1, 1))
        self.assertNotEqual(ma["owner_id"], mb["owner_id"])
        self.assertNotEqual(ma["capsule_id"], mb["capsule_id"])

    def test_wrong_password_and_ciphertext_tamper_rejected(self):
        encrypted, _ = build_capsule(self.spec, self.root, PASSWORD)
        with self.assertRaises(CapsuleError):
            decode_capsule(encrypted, "another strong password")
        with self.assertRaises(CapsuleError):
            decode_capsule(encrypted[:-1] + bytes([encrypted[-1] ^ 1]), PASSWORD)

    def test_receipt_mismatch_rejected(self):
        export_archive(self.specfile, self.archive, PASSWORD)
        bad = self.root / "mismatch.json"
        receipt = json.loads((self.root / "first.jmufc.receipt.json").read_text())
        receipt["root_hash"] = "0" * 64
        bad.write_text(json.dumps(receipt))
        with self.assertRaises(CapsuleError):
            verify_archive(self.archive, PASSWORD, bad)

    def test_unsafe_paths_and_ancestry_cycles_rejected(self):
        for p in ["../wrong", "/absolute", "C:/windows", "media/../x", "media//x", "media\\evil", ".hidden/file"]:
            with self.assertRaises(CapsuleError, msg=p):
                secure_relative(p)
        bad = json.loads(json.dumps(self.spec))
        bad["items"][0]["parents"] = [bad["items"][2]["id"]]
        with self.assertRaises(CapsuleError):
            build_capsule(bad, self.root, PASSWORD)

    def test_no_overwrite_existing_destination_or_export(self):
        export_archive(self.specfile, self.archive, PASSWORD)
        with self.assertRaises(CapsuleError):
            export_archive(self.specfile, self.archive, PASSWORD)
        dest = self.root / "restored"
        dest.mkdir()
        sentinel = dest / "KEEP.txt"
        sentinel.write_text("do not touch")
        with self.assertRaises(CapsuleError):
            import_archive(self.archive, dest, PASSWORD)
        self.assertEqual(sentinel.read_text(), "do not touch")

    def test_cross_capsule_revision_reference(self):
        base, _ = build_capsule(self.spec, self.root, PASSWORD)
        original, _ = decode_capsule(base, PASSWORD)
        desc = dict(self.spec, previous_capsule_id=original["capsule_id"])
        next_bytes, _ = build_capsule(desc, self.root, PASSWORD)
        follow, _ = decode_capsule(next_bytes, PASSWORD)
        self.assertEqual(follow["previous_capsule_id"], original["capsule_id"])
        self.assertNotEqual(follow["capsule_id"], original["capsule_id"])


if __name__ == "__main__":
    unittest.main()
