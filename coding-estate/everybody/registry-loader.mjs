import { loadRegistry } from './everybody-maximiser.mjs';

const DEFAULT_REGISTRIES = Object.freeze([
  './body-registry.json',
  './body-registry-extension-01.json',
  './body-registry-extension-02.json'
]);

export async function loadFederatedRegistry(sources = DEFAULT_REGISTRIES) {
  const parts = await Promise.all(sources.map(source => loadRegistry(source)));
  const bodies = [];
  const seen = new Map();
  const collisions = [];

  for (const part of parts) {
    for (const body of part.bodies ?? []) {
      if (seen.has(body.id)) {
        collisions.push({ id: body.id, first: seen.get(body.id).name, second: body.name });
        continue;
      }
      seen.set(body.id, body);
      bodies.push(body);
    }
  }

  if (collisions.length) {
    throw new Error(`Registry body-id collisions must be resolved explicitly: ${JSON.stringify(collisions)}`);
  }

  return {
    schema: 'jm.everybody.registry-federation/1.1',
    name: 'JM EveryBody — Federated Sovereign Registry',
    status: 'ALPHA_NOT_CROWN',
    release_state: 'MAXIMAL_PORTABLE_V1_1',
    recovered_count: bodies.length,
    final_count_claimed: false,
    count_boundary: 'Federated recovered set only. Every further exact body is appended through another explicit registry extension.',
    laws: [
      'no_supreme_replacement',
      'individual_complete_lane',
      'shared_organs_do_not_erase_identity',
      'lookup_before_composition',
      'targets_never_govern_source',
      'no_ding_no_claim',
      'working_profile_does_not_falsely_claim_historical_native_grammar'
    ],
    pipeline: parts[0].pipeline,
    registry_sources: sources,
    source_lineages: parts.flatMap(part => part.source_lineage ?? []),
    bodies
  };
}

export { DEFAULT_REGISTRIES };
