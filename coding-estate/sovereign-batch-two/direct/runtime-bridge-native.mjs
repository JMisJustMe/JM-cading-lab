import { digest, stable } from './native-core.mjs';
import { Kading } from './kading-jmp-native.mjs';
import { RootMethod, CadenVM } from './root-caden-native.mjs';
import { THEOPrimeBody, JMVM, JMVM_OPCODES } from './prime-jmvm-native.mjs';
import { PolyglotBridge } from './polyglot-native.mjs';

export { RootMethod, CadenVM, THEOPrimeBody, JMVM, JMVM_OPCODES, PolyglotBridge };

export function runtimeChain(sources, initialState, services = {}) {
  const root = RootMethod.execute(sources.root, 'AuthorizeDoor', initialState, services).runtime;
  const caden = CadenVM.executeSource(sources.kading, 'OpenDoor', root.state, services);
  const primeOperations = {
    parseKading: source => Kading.parse(source),
    lowerKading: ast => ({ ast, ir: Kading.lower(ast) }),
    compileCaden: value => CadenVM.compile(value.ast, 'OpenDoor')
  };
  const prime = THEOPrimeBody.execute(sources.prime, 'DoorBuild', sources.kading, primeOperations).runtime;
  const vm = JMVM.execute(sources.jmvm, 'DoorMachine', caden.runtime.state, services).runtime;
  const bridge = PolyglotBridge.execute(sources.bridge, 'DoorBridge', { door: vm.state.door, machine: vm.machine }, { facts: {}, identity: 'JMLogic.DoorOpenAllowed' }).runtime;
  return { root, caden, prime, vm, bridge, digest: digest(stable({ root: root.state, caden: caden.runtime.state, prime: prime.proof, vm: vm.state, bridge: bridge.target })) };
}
