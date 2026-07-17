import { compileNativeV1_1, NATIVE_ADAPTERS_V1_1 } from './native-adapters-v1-1.mjs';
import {
  canonicalNativeAvailability,
  canonicalNativeSpec,
  compileCanonicalNative,
  fixtureCanonicalNativeSource
} from './canonical-native-v2.mjs';

export const EXACT_HISTORICAL_NATIVE_IDS = Object.freeze(Object.keys(NATIVE_ADAPTERS_V1_1).sort());

export function nativeStatusV2(body, registry) {
  if (!body) return null;
  const canonical = canonicalNativeAvailability(body, EXACT_HISTORICAL_NATIVE_IDS);
  return {
    ...canonical,
    exactHistoricalAdapter: Object.hasOwn(NATIVE_ADAPTERS_V1_1, body.id),
    canonicalSpec: canonicalNativeSpec(body),
    canonicalFixture: fixtureCanonicalNativeSource(body),
    registryCount: registry?.bodies?.length ?? null
  };
}

export function compileNativeUnified(bodyId, source, registry, { mode = 'auto' } = {}) {
  const body = registry?.bodies?.find(candidate => candidate.id === bodyId) ?? null;
  if (!body) return { ok: false, bodyId, status: 'UNKNOWN_BODY', diagnostics: [{ level: 'error', code: 'UNKNOWN_BODY', message: bodyId }] };
  const escapedId = bodyId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const canonicalHeader = new RegExp(`^\\s*NATIVE\\s+${escapedId}\\s+2\\.0\\b`, 'i').test(String(source ?? ''));

  if (mode === 'canonical' || (mode === 'auto' && canonicalHeader)) {
    return { lane: 'CURRENT_CANONICAL_NATIVE_V2', ...compileCanonicalNative(bodyId, source, registry) };
  }
  if (mode === 'historical' || mode === 'exact' || (mode === 'auto' && Object.hasOwn(NATIVE_ADAPTERS_V1_1, bodyId))) {
    return { lane: 'RECOVERED_HISTORICAL_NATIVE_SUBSET', ...compileNativeV1_1(bodyId, source, registry) };
  }
  return {
    ok: false,
    bodyId,
    lane: 'HISTORICAL_SOURCE_UNRECOVERED_CURRENT_CANON_AVAILABLE',
    status: 'USE_CANONICAL_NATIVE_V2_OR_SUPPLY_RECOVERED_HISTORICAL_SOURCE',
    canonicalSpec: canonicalNativeSpec(body),
    canonicalFixture: fixtureCanonicalNativeSource(body),
    diagnostics: [{
      level: 'error',
      code: 'HISTORICAL_ADAPTER_NOT_RECOVERED',
      message: `${bodyId} has a complete current canonical-native v2 specification, but no exact recovered historical adapter for the supplied non-v2 source.`
    }],
    claimBoundary: 'Current canonical completion and historical source recovery are separate lanes.'
  };
}
