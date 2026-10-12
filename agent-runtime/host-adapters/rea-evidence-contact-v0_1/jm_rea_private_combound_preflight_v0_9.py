#!/usr/bin/env python3
"""Exact protected COMBOUND v2.3 → real REA 6.1 execution gate.

Private scripts live in disposable local storage for node --check, then vanish.
Preflight is NOT REA analysis. --run-rea delegates ONLY to the existing,
local-only v0.8 real REA+JM32/TraceBox runner; no fake REA success possible.
"""
import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

EXPECTED = '53b6c3d87ebecd647cc59f679d20ca4a0f52cfb7053e8e5bb114b711d1c5e428'
ROOTS = ('beginDrag', 'moveDrag', 'releaseDrag', 'commitShot', 'registerCrewUse')

class InlineScripts(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.inside = False
        self.scripts = []
        self.external = 0

    def handle_starttag(self, tag, attrs):
        if tag == 'script':
            if any(k.lower() == 'src' for k, _ in attrs):
                self.external += 1
                self.inside = False
            else:
                self.inside = True
                self.scripts.append('')

    def handle_endtag(self, tag):
        if tag == 'script':
            self.inside = False

    def handle_data(self, data):
        if self.inside:
            self.scripts[-1] += data

def fail(reason):
    raise RuntimeError('JM_REA_V09_PREFLIGHT_HOLD:' + reason)

def preflight(source: Path, node='node'):
    if not source.is_file():
        fail('SOURCE_ABSENT')
    data = source.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if digest != EXPECTED:
        fail('PROTECTED_FLAZ_DIGEST_MISMATCH')
    parser = InlineScripts()
    parser.feed(data.decode('utf-8'))
    if parser.external:
        fail('EXTERNAL_SCRIPT_NOT_STAGED')
    if not parser.scripts:
        fail('NO_INLINE_SCRIPTS')
    if not shutil.which(node):
        fail('NODE_SYNTAX_CHECK_UNAVAILABLE')
    main = []
    syntax = 0
    with tempfile.TemporaryDirectory(prefix='jm-rea-private-preflight-') as tmp:
        folder = Path(tmp)
        for i, text in enumerate(parser.scripts):
            name = f'combound_inline_{i:03d}.js'
            p = folder / name
            p.write_text(text, encoding='utf-8')
            result = subprocess.run([node, '--check', str(p)],
                                    capture_output=True, text=True, timeout=45)
            if result.returncode != 0:
                fail('SYNTAX_SCRIPT_' + str(i))
            syntax += 1
            if re.search(r'\b(?:const|let|var)\s+Runtime\s*=\s*\{', text):
                main.append((name, text))
    if len(main) != 1:
        fail('AMBIGUOUS_RUNTIME_SOURCE')
    module, text = main[0]
    for root in ROOTS:
        if not re.search(r'\b' + root + r'\s*\(', text):
            fail('MISSING_RUNTIME_ROOT_' + root)
    version = subprocess.run([node, '--version'], capture_output=True,
                             text=True, timeout=10).stdout.strip()
    pieces = version.removeprefix('v').split('.')
    major, minor = (int(pieces[0]), int(pieces[1])) if len(pieces) == 3 and all(p.isdigit() for p in pieces) else (-1, -1)
    ready_node = (major == 22 and minor >= 19) or (major == 24 and minor >= 11) or major >= 26
    return {'schema': 'JM.REA.COMBOUND.PrivatePreflight/0.9',
            'status': 'SOURCE_SYNTAX_AND_ROOT_PREFLIGHT_PASS__REAL_REA_NOT_EXECUTED',
            'source_sha256': digest, 'embedded_scripts': len(parser.scripts),
            'embedded_scripts_syntax_pass': syntax, 'external_scripts': parser.external,
            'runtime_source_module': module, 'runtime_roots': list(ROOTS),
            'node_version': version, 'node_meets_rea_6_1_minimum': ready_node,
            'rea_executable_present': shutil.which('rea') is not None,
            'real_rea_evidence_validated': False, 'protected_source_mutated': False,
            'raw_script_source_retained': False}

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--protected', type=Path, required=True)
    p.add_argument('--output', type=Path, help='A NEW absolute JSON receipt')
    p.add_argument('--node', default='node')
    p.add_argument('--rea', default='rea')
    p.add_argument('--run-rea', action='store_true',
                   help='After strict preflight, execute actual REA and JM projection')
    args = p.parse_args()
    result = preflight(args.protected, args.node)
    if args.run_rea:
        if not args.output or not args.output.is_absolute() or args.output.exists():
            fail('FRESH_ABSOLUTE_REA_RECEIPT_REQUIRED')
        if not result['node_meets_rea_6_1_minimum']:
            fail('NODE_TOO_OLD_FOR_REA')
        if shutil.which(args.rea) is None:
            fail('REAL_REA_CLI_NOT_INSTALLED')
        old_runner = Path(__file__).with_name('jm_rea_private_combound_runner_v0_8.py')
        if not old_runner.is_file():
            fail('INHERITED_REAL_REA_RUNNER_ABSENT')
        cmd = [sys.executable, str(old_runner), '--protected', str(args.protected),
               '--output', str(args.output), '--rea', args.rea, '--node', args.node,
               '--roots', 'releaseDrag,commitShot',
               '--module', result['runtime_source_module']]
        done = subprocess.run(cmd, check=False, timeout=600)
        if done.returncode != 0:
            fail('REAL_REA_OR_JM_HANDOFF_FAILED')
        print('JM_REA_V09_GENUINE_REA_HANDOFF: SUCCESS (see real evidence receipt)')
        return
    if args.output:
        if not args.output.is_absolute():
            fail('OUTPUT_ABSOLUTE_PATH_REQUIRED')
        with args.output.open('x', encoding='utf-8') as out:
            json.dump(result, out, indent=2)
            out.write('\n')
    print(json.dumps(result, sort_keys=True))

if __name__ == '__main__':
    main()
, version)
    major, minor = (int(m.group(1)), int(m.group(2))) if m else (-1, -1)
    ready_node = (major == 22 and minor >= 19) or (major == 24 and minor >= 11) or major >= 26
    return {'schema': 'JM.REA.COMBOUND.PrivatePreflight/0.9',
            'status': 'SOURCE_SYNTAX_AND_ROOT_PREFLIGHT_PASS__REAL_REA_NOT_EXECUTED',
            'source_sha256': digest, 'embedded_scripts': len(parser.scripts),
            'embedded_scripts_syntax_pass': syntax, 'external_scripts': parser.external,
            'runtime_source_module': module, 'runtime_roots': list(ROOTS),
            'node_version': version, 'node_meets_rea_6_1_minimum': ready_node,
            'rea_executable_present': shutil.which('rea') is not None,
            'real_rea_evidence_validated': False, 'protected_source_mutated': False,
            'raw_script_source_retained': False}

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--protected', type=Path, required=True)
    p.add_argument('--output', type=Path, help='A NEW absolute JSON receipt')
    p.add_argument('--node', default='node')
    p.add_argument('--rea', default='rea')
    p.add_argument('--run-rea', action='store_true',
                   help='After strict preflight, execute actual REA and JM projection')
    args = p.parse_args()
    result = preflight(args.protected, args.node)
    if args.run_rea:
        if not args.output or not args.output.is_absolute() or args.output.exists():
            fail('FRESH_ABSOLUTE_REA_RECEIPT_REQUIRED')
        if not result['node_meets_rea_6_1_minimum']:
            fail('NODE_TOO_OLD_FOR_REA')
        if shutil.which(args.rea) is None:
            fail('REAL_REA_CLI_NOT_INSTALLED')
        old_runner = Path(__file__).with_name('jm_rea_private_combound_runner_v0_8.py')
        if not old_runner.is_file():
            fail('INHERITED_REAL_REA_RUNNER_ABSENT')
        cmd = [sys.executable, str(old_runner), '--protected', str(args.protected),
               '--output', str(args.output), '--rea', args.rea, '--node', args.node,
               '--roots', 'releaseDrag,commitShot',
               '--module', result['runtime_source_module']]
        done = subprocess.run(cmd, check=False, timeout=600)
        if done.returncode != 0:
            fail('REAL_REA_OR_JM_HANDOFF_FAILED')
        print('JM_REA_V09_GENUINE_REA_HANDOFF: SUCCESS (see real evidence receipt)')
        return
    if args.output:
        if not args.output.is_absolute():
            fail('OUTPUT_ABSOLUTE_PATH_REQUIRED')
        with args.output.open('x', encoding='utf-8') as out:
            json.dump(result, out, indent=2)
            out.write('\n')
    print(json.dumps(result, sort_keys=True))

if __name__ == '__main__':
    main()
