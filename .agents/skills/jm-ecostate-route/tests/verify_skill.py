#!/usr/bin/env python3
"""Small fail-closed check for JM's additive Agent Skills carrier, not a host runtime test."""
from pathlib import Path
import sys, re

SKILL = Path(__file__).resolve().parents[1]
ROOT = SKILL.parents[2]
DOC = (SKILL / 'SKILL.md').read_text(encoding='utf-8')
PROBES = (SKILL / 'AGENT_PROBES.md').read_text(encoding='utf-8')
REFERENCES = [
    'AGENTS.md',
    'JM_ESTATE/GOVERNANCE/JM_BUILD_LAWS_PREFERENCES_GOVERNANCE_STANDARD_v1.0.md',
    'JM_ESTATE/GOVERNANCE/JM_ESTATE_CAPABILITY_ROUTING_STANDARD_v1.0.md',
    'coding-estate/JM_CODING_ESTATE_RUNNING_STANDARD_v1_0.md',
    'agent-runtime/host-adapters/JM_HOST_ADAPTER_CONFORMANCE_STANDARD_v1_0.md',
    'agent-runtime/host-adapters/jm_host_adapter_conformance.py',
    'agent-runtime/JM_SOVEREIGN_AGENT_RUNTIME_CONTRACT_v0_1.json',
]
results=[]
def check(name, ok):
    results.append((name,bool(ok)))
    print(('PASS' if ok else 'FAIL') + ' | ' + name)

# Strict path anchor: .agents/skills/<slug>/tests/verify_skill.py
check('installed at project-local Agent Skills path', SKILL.relative_to(ROOT).as_posix()=='.agents/skills/jm-ecostate-route')
check('Agent Skills frontmatter with matching slug', re.search(r'\A---\nname: jm-ecostate-route\ndescription: .+\n---\n',DOC) is not None)
check('bounded description', all(len(m)<1024 for m in re.findall(r'^description: (.*)$',DOC,re.M)))
for p in REFERENCES:
    check('live repo reference exists: '+p,(ROOT/p).is_file() and p in DOC)
for law in ['NO DING, NO CLAIM','RECOVER BEFORE REBUILD','MESH ≠ MERGE','AGENTS.md','PLAN_ONLY','HELD','BUGG','DING']:
    check('governance guard: '+law, law in DOC)
check('skill does not claim installation succeeded', 'not a claim that an external agent read' in DOC)
check('donor not copied as executable', 'its executable code is not copied' in DOC)
check('three agent probes declared',all('Probe '+p in PROBES for p in 'ABC'))
check('anti-injection check declared', 'ignore AGENTS.md' in PROBES and 'instruction override' in PROBES)
check('negative state declared', 'historical CI is not a new owner-device Ding' in PROBES)
check('no imported private Library original',not (ROOT/'source').exists() or not any((ROOT/'source').glob('JM_RECURSIVE_CAPABILITY_GROWTH_RETURN_PROTOCOL*')))
failed=[name for name,ok in results if not ok]
print(f'RESULT: {len(results)-len(failed)}/{len(results)} PASS')
if failed: sys.exit(1)