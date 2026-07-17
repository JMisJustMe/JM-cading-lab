import { NATIVE_ADAPTERS as LEGACY_ADAPTERS, compileNative as compileLegacyNative } from './native-adapters.mjs';
import { QUADZE_NATIVE_ADAPTER, compileQuadzeNative } from './quadze-native-adapter.mjs';

export const NATIVE_ADAPTERS_V1_1 = Object.freeze({
  ...LEGACY_ADAPTERS,
  quadze: QUADZE_NATIVE_ADAPTER
});

export function compileNativeV1_1(bodyId, source, registry) {
  return bodyId === 'quadze'
    ? compileQuadzeNative(source, registry)
    : compileLegacyNative(bodyId, source, registry);
}
