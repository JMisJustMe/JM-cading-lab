#!/usr/bin/env python3
"""JM Estate Contact Organ Propagation v1.1 — independent cross-aware descendant materialiser.

v1 is preserved as a contacted failure ancestor. v1.1 has its own recipient registry and does not import/rewrite v1.
NO DING, NO CLAIM: source materialisation is not APK/device proof.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = json.loads((ROOT / 'governance/contact-organ/recipient_registry_v1_1.json').read_text(encoding='utf-8'))
ROWS = REGISTRY['recipients']
COMMON = (ROOT / 'governance/contact-organ/JM_ESTATE_CONTACT_ORGAN_v1_0.js').read_text(encoding='utf-8')
CROSS = (ROOT / 'governance/contact-organ/JM_ESTATE_CROSS_DEVICE_CONTACT_ADAPTER_v1_0.js').read_text(encoding='utf-8')
OUT = ROOT / 'estate-publication/contact-organ-descendants'
MARK = 'JM_ESTATE_CONTACT_ORGAN_PATCH_v1_1'
CROSS_IDS = {'cross-continuity', 'cross-forge', 'cross-private-arcade'}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def find_exact(name):
    if not name:
        return None
    hits = [p for p in ROOT.rglob(name) if 'contact-organ-descendants' not in p.parts and '.git' not in p.parts]
    return hits[0] if hits else None


def navigator_fallback():
    base = ROOT / 'estate-publication/apps-tools-games/JM3232-Navigator-Browser-Bridge-v0.1/source-carriage'
    recon = base / 'reconstruct_navigator_bridge.py'
    if recon.exists():
        subprocess.run([sys.executable, str(recon)], cwd=base, check=False)
        candidate = base / 'reconstructed/JM3232_NAVIGATOR_BROWSER_BRIDGE_v0_1/source_authorities/JM3232_UNIFIED_BROWSER_v1_0_OPEN.html'
        if candidate.exists():
            return candidate
    return None


def resolve_source(row):
    name = row.get('file')
    expected = row.get('sha256')
    source = find_exact(name)
    if source:
        actual = digest(source)
        if expected and actual != expected:
            return None, 'EXACT_SOURCE_HASH_MISMATCH', {'found': str(source.relative_to(ROOT)), 'actual': actual, 'expected': expected}
        return source, 'EXACT_MAPPED_SOURCE', {}

    fallback = row.get('fallback')
    if fallback == '__JM3232_RECONSTRUCT__':
        source = navigator_fallback()
        if source:
            return source, 'RECOVERED_REPO_SOURCE_AUTHORITY', {}
    elif fallback:
        candidate = ROOT / fallback
        if candidate.exists():
            return candidate, 'CURRENT_REPO_REAL_BODY_FALLBACK', {}

    return None, 'SOURCE_RECOVERY_REQUIRED', {'expectedFile': name, 'fallback': fallback}


def bootstrap(config, source_class, cross):
    parts = ['\n<!-- ' + MARK + ' -->\n', '<script>\n', COMMON, '\n</script>\n']
    if cross:
        parts += ['<script>\n', CROSS, '\n</script>\n']
    parts += [
        '<script>\n',
        'window.JM_CONTACT_PATCH_CONFIG=' + json.dumps(config, separators=(',', ':')) + ';\n',
        '(async()=>{\n',
        ' window.JMContact=JMContactOrgan.create(window.JM_CONTACT_PATCH_CONFIG);\n',
        ' await window.JMContact.init();\n',
        ' await window.JMContact.ready({observedDocument:true,sourceClass:' + json.dumps(source_class) + '});\n',
        ' window.JMCrossDeviceContactDonorMounted=' + ('true' if cross else 'false') + ';\n',
        ' window.dispatchEvent(new CustomEvent("jm-contact-organ-ready",{detail:{recipientId:' + json.dumps(config['recipientId']) + ',crossDeviceDonorMounted:' + ('true' if cross else 'false') + '}}));\n',
        '})().catch(e=>console.error("JM Contact Organ v1.1",e));\n',
        '</script>\n<!-- /' + MARK + ' -->\n'
    ]
    return ''.join(parts)


def materialise(source, row, source_class):
    text = source.read_text(encoding='utf-8', errors='strict')
    if '</body>' not in text.lower():
        return None, {'status': 'NATIVE_CARRIER_ADAPTER_REQUIRED', 'source': str(source.relative_to(ROOT))}

    rid = row['id']
    cross = rid in CROSS_IDS
    config = {
        'schema': 'jm.estate.contact-organ-recipient/1.1',
        'recipientId': rid,
        'bodyId': source.name,
        'bodyVersion': 'repo-contact-descendant-v1.1',
        'inheritance': row['inheritance'],
        'consequence': row['consequence'],
        'authorizationModel': row['auth'],
        'remoteAuthority': bool(row['remote']),
        'persistence': True,
        'cloudEvents': False,
        'protectedParent': True,
        'sourceClass': source_class,
        'crossDeviceDonorMounted': cross,
        'carrierBinding': 'REQUIRED_FOR_REAL_CROSS_DEVICE_CONSEQUENCE' if cross else 'NOT_APPLICABLE',
        'claimBoundary': 'Source descendant proves organ mounting only. Body consequence, APK build/install, remote transport and physical/device Ding remain separately observed and claim-gated.'
    }

    insertion = bootstrap(config, source_class, cross)
    position = text.lower().rfind('</body>')
    outdir = OUT / rid
    outdir.mkdir(parents=True, exist_ok=True)
    descendant = outdir / (source.stem + '_CONTACT_ORGAN_v1_1_DESCENDANT.html')
    descendant.write_text(text[:position] + insertion + text[position:], encoding='utf-8')

    receipt = {
        'schema': 'jm.estate.contact-organ-patch-receipt/1.1',
        'recipientId': rid,
        'source': str(source.relative_to(ROOT)),
        'sourceClass': source_class,
        'sourceSha256': digest(source),
        'expectedExactSourceSha256': row.get('sha256'),
        'descendant': str(descendant.relative_to(ROOT)),
        'descendantSha256': digest(descendant),
        'parentMutated': False,
        'commonOrganMounted': True,
        'crossDeviceDonorMounted': cross,
        'crossCarrierBound': False if cross else None,
        'bodySpecificConsequenceWiring': 'OPEN_UNTIL_BODY_ACTION_RESULT_IS_EXPLICITLY_OBSERVED',
        'apkBuild': 'OPEN',
        'physicalDing': 'OPEN'
    }
    (outdir / 'PATCH_RECEIPT_v1_1.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    return descendant, receipt


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    results = []
    for row in ROWS:
        source, source_class, extra = resolve_source(row)
        if source is None:
            results.append({'recipientId': row['id'], 'status': source_class, **extra})
            continue
        descendant, receipt = materialise(source, row, source_class)
        if descendant is None:
            results.append({'recipientId': row['id'], **receipt})
            continue
        results.append({
            'recipientId': row['id'],
            'status': 'MATERIALIZED_CROSS_DONOR_DESCENDANT' if row['id'] in CROSS_IDS else 'MATERIALIZED_COMMON_DESCENDANT',
            'source': str(source.relative_to(ROOT)),
            'sourceClass': source_class,
            'descendant': str(descendant.relative_to(ROOT)),
            'sha256': receipt['descendantSha256'],
            'crossDeviceDonorMounted': receipt['crossDeviceDonorMounted']
        })

    recovery = [r for r in results if r['status'] in {'SOURCE_RECOVERY_REQUIRED', 'EXACT_SOURCE_HASH_MISMATCH'}]
    report = {
        'schema': 'jm.estate.contact-organ-github-propagation/1.1',
        'law': 'FROZEN PARENT -> CLEAN DESCENDANT',
        'transferLaw': 'TRANSFER THE ORGAN WHERE THE MEANING SURVIVES; ADAPT THE CARRIER WHERE THE PLATFORM CHANGES.',
        'ownerLaw': 'OWNER USES; THE BODY PROVES.',
        'claimLaw': 'NO DING, NO CLAIM.',
        'historicalV1': 'PRESERVED_CONTACTED_FAILURE_ANCESTOR__NOT_IMPORTED',
        'totalRecipients': len(ROWS),
        'crossRecipients': len(CROSS_IDS),
        'phoneRecipients': len(ROWS) - len(CROSS_IDS),
        'materialized': sum(r['status'].startswith('MATERIALIZED_') for r in results),
        'crossMaterialized': sum(r['status'] == 'MATERIALIZED_CROSS_DONOR_DESCENDANT' for r in results),
        'commonMaterialized': sum(r['status'] == 'MATERIALIZED_COMMON_DESCENDANT' for r in results),
        'recoveryOpen': len(recovery),
        'results': results,
        'claimBoundary': 'Materialisation is source evidence only; no APK build/install or physical consequence is synthesized.'
    }
    (OUT / 'PROPAGATION_RECEIPT_v1_1.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    (OUT / 'SOURCE_RECOVERY_QUEUE_v1_1.json').write_text(json.dumps({'schema': 'jm.estate.contact-organ-source-recovery-queue/1.1', 'count': len(recovery), 'rows': recovery}, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
