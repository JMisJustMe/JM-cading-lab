export const KADING_SOURCE = `
kading DoorCadence {
  key door.state = "closed"
  key door.denied = false
  cadence OpenDoor {
    beat authorise when door.authorized == true do door.ready = true
    beat open when door.ready == true do door.state = "open"
    recover denied do door.denied = true
  }
}
`;

export const JMP_SOURCE = `
jumpmap DoorJump {
  from door.state
  case "open" when door.authorized == true -> "entered" do door.entered = true
  case "closed" -> "waiting" do door.waiting = true
  else -> "blocked" do door.blocked = true
}
`;

export const CODIFYING_SOURCE = `
codex DoorRecord {
  field state: text = "closed"
  field authorized: bool = false
  field force: number = 0
  require state in ["closed","open"]
  emit DoorState
}
`;

export const KOCODIFYING_SOURCE = `
cocode DoorSync {
  left DoorRecord
  right RouteDoor
  bind left.state <-> right.doorState
  bind left.authorized <-> right.allowed
  bind left.force <-> right.force
  conflict left
  recover rollback
}
`;

export const FORMEULA_SOURCE = `
forme DoorForce(input) {
  bind doubled = input * 2
  bind safe = clamp(doubled, 0, 10)
  yield safe
}
`;

export const ROOT_METHOD_SOURCE = `
root AuthorizeDoor {
  premise user.hasKey == true
  branch allowed when user.hasKey == true -> Authorize
  method Authorize {
    do door.authorized = true
    do door.authorization = "RootMethod"
  }
  yield door.authorized
}
`;

export const PRIMEBODY_SOURCE = `
prime DoorBuild {
  source Kading
  stage parse using parseKading
  stage lower using lowerKading
  stage emit using compileCaden
  prove receipt
}
`;

export const JMVM_SOURCE = `
machine DoorMachine {
  const ready = true
  instruction LOAD door.state
  instruction ASSERT door.state == "open"
  instruction SET door.vmVerified = true
  instruction TRACE "door-vm-state"
  instruction DING "JMVM_DOOR_PASS"
  instruction HALT
}
`;

export const POLYGLOT_BRIDGE_SOURCE = `
bridge DoorBridge {
  from JMVM.DoorMachine
  to JMLogic.DoorOpenAllowed
  map source.door.state -> target.facts.doorState
  map source.door.authorized -> target.facts.allowed
  map source.door.vmVerified -> target.facts.vmVerified
  preserve identity
  onMismatch rollback
}
`;

export const INITIAL_STATE = {
  user: { hasKey: true },
  door: { state: "closed", authorized: false, ready: false, force: 0 }
};

export function nativeServices() {
  const calls = [];
  return {
    calls,
    services: {
      record: (...args) => { calls.push({ name: 'record', args }); return true; },
      identity: value => value,
      isReady: value => Boolean(value)
    }
  };
}
