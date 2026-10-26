"""Build in scratch, contact retained bytes, then publish only earned changes."""
from pathlib import Path
import argparse
import hashlib
import importlib.util
import json
import os
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def package(stage, archive):
    stage, archive = Path(stage), Path(archive)
    manifest = {'schema': 'JM.AdvancedGenerator.Package/0.2',
                'status': 'PLAYABLE_SOURCE_COMPILE_PENDING', 'files': []}
    for path in sorted(stage.rglob('*')):
        if path.is_file() and path.name != 'PACKAGE_MANIFEST.json':
            data = path.read_bytes()
            manifest['files'].append({'path': str(path.relative_to(stage)),
                                     'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    if not manifest['files']:
        raise ValueError('empty package source: HOLD')
    (stage / 'PACKAGE_MANIFEST.json').write_text(json.dumps(manifest, indent=2) + '\n')
    with tempfile.TemporaryDirectory(prefix='jm-package-admission-') as td:
        candidate = Path(td) / archive.name
        with zipfile.ZipFile(candidate, 'w') as z:
            for path in sorted(stage.rglob('*')):
                if path.is_file():
                    info = zipfile.ZipInfo(str(Path(archive.stem) / path.relative_to(stage)),
                                           date_time=(1980, 1, 1, 0, 0, 0))
                    info.compress_type = zipfile.ZIP_DEFLATED
                    z.writestr(info, path.read_bytes())
        source = ROOT / 'agent-runtime/host-adapters/storage-admission/jm_m001_production_admission.py'
        spec = importlib.util.spec_from_file_location('production_admission', source)
        gate = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(gate)
        result = gate.check(candidate, archive)  # Missing/invalid keeper fails before writes.
        if result['additional_carrier_allowed']:
            # Original old ZIP metadata may differ even when every payload is
            # unchanged. Do not mint another wrapper for timestamp-only churn.
            def payloads(p):
                with zipfile.ZipFile(p) as z:
                    return {i.filename: z.read(i) for i in z.infolist() if not i.is_dir()}
            if payloads(candidate) == payloads(archive):
                result.update(production_decision='REUSE_SAME_MEMBERS', additional_carrier_allowed=False)
        if result['additional_carrier_allowed']:
            data = candidate.read_bytes()
            digest = hashlib.sha256(data).hexdigest()
            if digest != result['candidate_sha256'] or hashlib.sha256(archive.read_bytes()).hexdigest() != result['keeper_sha256']:
                raise ValueError('package inputs changed after admission: HOLD')
            # Preserve the old keeper on interrupted write; replace atomically.
            with tempfile.NamedTemporaryFile(dir=archive.parent, delete=False) as f:
                pending = Path(f.name)
                try:
                    f.write(data)
                    f.flush()
                    os.fsync(f.fileno())
                except BaseException:
                    pending.unlink(missing_ok=True)
                    raise
            try:
                os.replace(pending, archive)
            finally:
                pending.unlink(missing_ok=True)
            archive.with_suffix('.sha256').write_text(f'{digest}  {archive.name}\n')
            archive.with_suffix('.run.json').write_text(json.dumps({
                'schema': 'JM.AdvancedGenerator.PackageRun/0.2',
                'run_id': os.environ.get('GITHUB_RUN_ID'),
                'run_attempt': os.environ.get('GITHUB_RUN_ATTEMPT'),
                'commit': os.environ.get('GITHUB_SHA'), 'archive': archive.name,
                'bytes': archive.stat().st_size, 'sha256': digest,
                'carrier_admission': result}, indent=2) + '\n')
        return result


if __name__ == '__main__':
    ap = argparse.ArgumentParser(__doc__)
    ap.add_argument('--stage', type=Path, required=True)
    ap.add_argument('--archive', type=Path, required=True)
    args = ap.parse_args()
    result = package(args.stage, args.archive)
    print(json.dumps(result, sort_keys=True))
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
            f.write('additional_carrier=' + str(result['additional_carrier_allowed']).lower() + '\n')
