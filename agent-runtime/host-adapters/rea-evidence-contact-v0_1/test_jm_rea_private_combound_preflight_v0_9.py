import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('jm_real_private_preflight', HERE/'jm_rea_private_combound_preflight_v0_9.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

def sha(s):
    return hashlib.sha256(s.encode('utf-8')).hexdigest()

FULL = '''<!doctype html><html><head>
<script>const Runtime = {
beginDrag(){return true;}, moveDrag(){return true;}, releaseDrag(){return true;},
commitShot(){return true;}, registerCrewUse(){return true;}
};</script><script>'use strict'; const other=42;</script>
</head><body>Game</body></html>'''

class JMRealPrivatePreflightTests(unittest.TestCase):
    def check_source(self, html, expected=None):
        with tempfile.TemporaryDirectory(prefix='jm-private-fixture-') as tmp:
            source = Path(tmp)/'sample.html'
            source.write_text(html, encoding='utf-8')
            original = source.read_bytes()
            with patch.object(mod, 'EXPECTED', expected or sha(html)):
                result = mod.preflight(source)
            self.assertEqual(source.read_bytes(), original)
            return result

    def test_realistic_synthetic_embedded_runtime_preflight_without_rea_claim(self):
        report = self.check_source(FULL)
        self.assertEqual(report['embedded_scripts'], 2)
        self.assertEqual(report['embedded_scripts_syntax_pass'], 2)
        self.assertEqual(report['runtime_source_module'], 'combound_inline_000.js')
        self.assertFalse(report['real_rea_evidence_validated'])
        self.assertFalse(report['raw_script_source_retained'])
        self.assertEqual(report['runtime_roots'], list(mod.ROOTS))

    def test_strict_original_frozen_source_hash_gate(self):
        with self.assertRaisesRegex(RuntimeError, 'PROTECTED_FLAZ_DIGEST_MISMATCH'):
            self.check_source(FULL, '0'*64)

    def test_missing_methods_hold(self):
        text = FULL.replace('releaseDrag(){return true;}', 'otherAction(){return true;}')
        with self.assertRaisesRegex(RuntimeError, 'MISSING_RUNTIME_ROOT_releaseDrag'):
            self.check_source(text)

    def test_external_script_not_silently_omitted(self):
        html = FULL.replace('</head>', '<script src="unknown.js"></script></head>')
        with self.assertRaisesRegex(RuntimeError, 'EXTERNAL_SCRIPT_NOT_STAGED'):
            self.check_source(html)

    def test_second_runtime_declaration_holds(self):
        html = FULL.replace('</head>', '<script>const Runtime={};</script></head>')
        with self.assertRaisesRegex(RuntimeError, 'AMBIGUOUS_RUNTIME_SOURCE'):
            self.check_source(html)

    def test_syntax_error_in_any_script_holds(self):
        html = FULL.replace('const other=42;', 'const other = ;')
        with self.assertRaisesRegex(RuntimeError, 'SYNTAX_SCRIPT_1'):
            self.check_source(html)

if __name__=='__main__':
    unittest.main()
