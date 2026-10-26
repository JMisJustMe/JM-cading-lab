"""Production policy around the unchanged M001 byte/CRC gate. No upload APIs.

An existing keeper is mandatory. Missing custody is HOLD, never 'unique'.
Same bytes reuse that keeper unless a separately reviewed, pinned role exists
in the repository authority registry. This module cannot approve its own roles.
"""
from pathlib import Path
import hashlib
import importlib.util
import json

ROOT = Path(__file__).resolve().parents[3]
ROLE_REGISTRY = ROOT / 'registry/storage-admission/approved-roles.json'


def check(candidate, keeper, role_id=None):
    source = Path(__file__).with_name('JM_M001_Carrier_Admission_Gate_v0_1.py')
    spec = importlib.util.spec_from_file_location('jm_m001_original_gate', source)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    result = module.assess(candidate, keeper)
    if result.get('schema') != 'JM.M001.CarrierAdmission/0.1':
        raise ValueError('unexpected M001 gate schema')
    if result['state'] == 'HOLD_INVALID':
        raise ValueError('admission HOLD: ' + '; '.join(result['errors']))
    result['additional_carrier_allowed'] = result['state'] == 'DISTINCT_BYTES'
    result['production_decision'] = ('ADMIT_DISTINCT' if result['additional_carrier_allowed']
                                     else 'REUSE_EXISTING')
    if role_id:
        registry = json.loads(ROLE_REGISTRY.read_text())
        if registry.get('schema') != 'JM.M001.ApprovedCarrierRoles/0.1':
            raise ValueError('role authority registry invalid')
        role = registry.get('roles', {}).get(role_id)
        if not role or role.get('state') != 'APPROVED':
            raise ValueError('separate carrier role is not independently approved')
        for field in ('candidate_sha256', 'keeper_sha256'):
            if role.get(field) != result[field]:
                raise ValueError('role authority does not bind these exact bytes')
        if (not role.get('candidate_role') or not role.get('keeper_role') or
                role['candidate_role'] == role['keeper_role'] or not role.get('reason')):
            raise ValueError('separate role responsibility is absent')
        # Evidence is a distinct reviewed source, not a boolean or a CLI bypass.
        evidence_source = ROOT / role['evidence_path']
        evidence = evidence_source.resolve()
        if (not evidence.is_relative_to(ROOT) or
                evidence in {Path(candidate).resolve(), Path(keeper).resolve(), ROLE_REGISTRY.resolve()} or
                evidence_source.is_symlink()):
            raise ValueError('role evidence is not independent')
        if hashlib.sha256(evidence.read_bytes()).hexdigest() != role.get('evidence_sha256'):
            raise ValueError('role authority evidence readback failed')
        result.update(production_decision='ADMIT_DISTINCT_ROLE', additional_carrier_allowed=True,
                      approved_role_id=role_id)
    # Original gate's false mutation/retirement flags remain unchanged.
    return result
