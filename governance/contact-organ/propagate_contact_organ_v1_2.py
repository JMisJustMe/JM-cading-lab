#!/usr/bin/env python3
"""JM Estate Contact Organ Propagation v1.2 — recovery-aware descendant materialiser.

v1.2 does not flatten every missing repo path into SOURCE_RECOVERY_REQUIRED.
It carries v1.1 materialisations forward, types each unresolved source authority,
materialises any exact source that has entered the repo, and writes durable
per-recipient recovery authority receipts for external/custody/embedded routes.

NO DING, NO CLAIM: source materialisation/recovery accounting is not APK/device proof.
"""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[2]
RECIPIENTS = json.loads((ROOT / 'governance/contact-organ/recipient_registry_v1_1.json').read_text(encoding='utf-8'))['recipients']
RECOVERY = json.loads((ROOT / 'governance/contact-organ/source_recovery_registry_v1_2.json').read_text(encoding='utf-8'))
RECOVERY_BY_ID = {r['recipientId']: r for r in RECOVERY['rows']}
COMMON = (ROOT / 'governance/contact-organ/JM_ESTATE_CONTACT_ORGAN_v1_0.js').read_text(encoding='utf-8')
CROSS = (ROOT / 'governance/contact-organ/JM_ESTATE_CROSS_DEVICE_CONTACT_ADAPTER_v1_0.js').read_text(encoding='utf-8')
OUT = ROOT / 'estate-publication/contact-organ-descendants'
MARK = 'JM_ESTATE_CONTACT_ORGAN_PATCH_v1_2'
CROSS_IDS = {'cross-continuity', 'cross-forge', 'cross-private-arcade'}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def find_exact(name):
    if not name:
        return None
    hits = [p for p in ROOT.rglob(name) if 'contact-organ-descendants' not in p.parts and '.git' not in p.parts]
    return hits[0] if hits else None


def v11_materialisation(recipient_id):
    d = OUT / recipient_id
    if not d.exists():
        return None
    descendants = sorted(d.glob('*_CONTACT_ORGAN_v1_1_DESCENDANT.html'))
    receipt = d / 'PATCH_RECEIPT_v1_1.json'
    if descendants and receipt.exists():
        rec = json.loads(receipt.read_text(encoding='utf-8'))
        return {'descendant': descendants[0], 'receipt': rec}
    return None


def resolve_repo_source(row):
    source = find_exact(row.get('file'))
    if source:
        expected = row.get('sha256')
        actual = digest(source)
        if expected and actual != expected:
            return None, 'EXACT_SOURCE_HASH_MISMATCH', {'found': str(source.relative_to(ROOT)), 'actual': actual, 'expected': expected}
        return source, 'EXACT_MAPPED_REPO_SOURCE', {}

    fallback = row.get('fallback')
    if fallback and fallback != '__JM3232_RECONSTRUCT__':
        p = ROOT / fallback
        if p.exists():
            return p, 'CURRENT_REPO_REAL_BODY_FALLBACK', {}

    recovery = RECOVERY_BY_ID.get(row['id'])
    if recovery:
        for key in ('repoCarrier', 'repoSource', 'seatedSource'):
            candidate = recovery.get(key)
            if candidate:
                p = ROOT / candidate
                if p.exists():
                    expected = recovery.get('expectedSha256')
                    actual = digest(p)
                    if expected and actual != expected:
                        return None, 'RECOVERY_CARRIER_HASH_MISMATCH', {'found': candidate, 'actual': actual, 'expected': expected}
                    return p, 'RECOVERY_REGISTRY_REPO_CARRIER', {}
    return None, None, {}


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
        '})().catch(e=>console.error("JM Contact Organ v1.2",e));\n',
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
        'schema': 'jm.estate.contact-organ-recipient/1.2',
        'recipientId': rid,
        'bodyId': source.name,
        'bodyVersion': 'repo-contact-descendant-v1.2',
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
    descendant = outdir / (source.stem + '_CONTACT_ORGAN_v1_2_DESCENDANT.html')
    descendant.write_text(text[:position] + insertion + text[position:], encoding='utf-8')
    receipt = {
        'schema': 'jm.estate.contact-organ-patch-receipt/1.2',
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
    (outdir / 'PATCH_RECEIPT_v1_2.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    return descendant, receipt


def write_recovery_receipt(row, recovery):
    rid = row['id']
    outdir = OUT / rid
    outdir.mkdir(parents=True, exist_ok=True)
    receipt = {
        'schema': 'jm.estate.contact-organ-recovery-authority-receipt/1.2',
        'recipientId': rid,
        'routeClass': recovery.get('routeClass', 'UNCLASSIFIED_RECOVERY'),
        'currentFile': recovery.get('currentFile') or row.get('file'),
        'expectedSha256': recovery.get('expectedSha256') or row.get('sha256'),
        'authority': recovery.get('authority'),
        'fileLibraryFileId': recovery.get('fileLibraryFileId'),
        'parentFile': recovery.get('parentFile'),
        'parentSha256': recovery.get('parentSha256'),
        'recoveryCarrier': recovery.get('recoveryCarrier'),
        'next': recovery.get('next'),
        'sourceByteState': 'EXTERNAL_OR_CUSTODY_AUTHORITY_CONFIRMED__NOT_YET_SEATED_AS_REPO_SOURCE',
        'parentMutation': 'NONE',
        'commonOrganMount': 'PENDING_EXACT_SOURCE_SEAT',
        'apkBuild': 'OPEN',
        'physicalDing': 'OPEN',
        'claimBoundary': 'Recovery authority receipt proves source identity/routing, not source byte materialisation, APK build/install, or physical consequence.'
    }
    p = outdir / 'RECOVERY_AUTHORITY_RECEIPT_v1_2.json'
    p.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    return p, receipt


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    results = []
    for row in RECIPIENTS:
        rid = row['id']
        old = v11_materialisation(rid)
        if old:
            results.append({
                'recipientId': rid,
                'status': 'CARRY_FORWARD_MATERIALIZED_V1_1',
                'descendant': str(old['descendant'].relative_to(ROOT)),
                'sha256': old['receipt'].get('descendantSha256'),
                'crossDeviceDonorMounted': bool(old['receipt'].get('crossDeviceDonorMounted'))
            })
            continue

        source, source_class, extra = resolve_repo_source(row)
        if source is not None:
            descendant, receipt = materialise(source, row, source_class)
            if descendant is None:
                results.append({'recipientId': rid, **receipt})
            else:
                results.append({
                    'recipientId': rid,
                    'status': 'MATERIALIZED_V1_2_CROSS_DESCENDANT' if rid in CROSS_IDS else 'MATERIALIZED_V1_2_COMMON_DESCENDANT',
                    'source': str(source.relative_to(ROOT)),
                    'sourceClass': source_class,
                    'descendant': str(descendant.relative_to(ROOT)),
                    'sha256': receipt['descendantSha256'],
                    'crossDeviceDonorMounted': receipt['crossDeviceDonorMounted']
                })
            continue

        if source_class in {'EXACT_SOURCE_HASH_MISMATCH', 'RECOVERY_CARRIER_HASH_MISMATCH'}:
            results.append({'recipientId': rid, 'status': source_class, **extra})
            continue

        recovery = RECOVERY_BY_ID.get(rid)
        if recovery:
            p, rec = write_recovery_receipt(row, recovery)
            results.append({
                'recipientId': rid,
                'status': 'RECOVERY_AUTHORITY_CONFIRMED_' + recovery.get('routeClass', 'UNCLASSIFIED'),
                'recoveryReceipt': str(p.relative_to(ROOT)),
                'expectedFile': rec['currentFile'],
                'expectedSha256': rec['expectedSha256']
            })
        else:
            results.append({'recipientId': rid, 'status': 'RECOVERY_ROUTE_UNCLASSIFIED', 'expectedFile': row.get('file')})

    materialised = [r for r in results if r['status'].startswith('CARRY_FORWARD_MATERIALIZED') or r['status'].startswith('MATERIALIZED_')]
    recovery_confirmed = [r for r in results if r['status'].startswith('RECOVERY_AUTHORITY_CONFIRMED_')]
    unresolved = [r for r in results if r not in materialised and r not in recovery_confirmed]
    report = {
        'schema': 'jm.estate.contact-organ-github-propagation/1.2',
        'law': 'FROZEN PARENT -> CLEAN DESCENDANT',
        'writableRouteLaw': RECOVERY['laws']['writableRoute'],
        'claimLaw': 'NO DING, NO CLAIM.',
        'totalRecipients': len(RECIPIENTS),
        'materialized': len(materialised),
        'recoveryAuthorityConfirmed': len(recovery_confirmed),
        'unresolved': len(unresolved),
        'results': results,
        'claimBoundary': 'Materialisation/recovery accounting is source evidence only; APK build/install and owner-device consequence remain separate.'
    }
    (OUT / 'PROPAGATION_RECEIPT_v1_2.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    (OUT / 'SOURCE_RECOVERY_QUEUE_v1_2.json').write_text(json.dumps({'schema': 'jm.estate.contact-organ-source-recovery-queue/1.2', 'count': len(recovery_confirmed) + len(unresolved), 'authorityConfirmed': len(recovery_confirmed), 'unresolved': len(unresolved), 'rows': recovery_confirmed + unresolved}, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
