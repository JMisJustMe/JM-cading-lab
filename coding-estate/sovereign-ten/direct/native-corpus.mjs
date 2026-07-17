export const FLOWTALK_SOURCE = `
context {
  room = "hallway"
  user = "player1"
}
utterance "open the door"
as intent openDoor(target="door")
branch {
  alt: intent unlockDoor(target="door")
}
ambig {
  openDoor < unlockDoor
}
respond {
  say "Opening the door"
  emit DoorOpenRequested
  route DoorOpenRoute
  recover askAgain
}
`;

export const JMLOGIC_SOURCE = `
rule DoorOpenAllowed {
  when intent.openDoor and user.hasKey == true
  then permit
  then door.allowed = true
  recover {
    deny
    show "Access denied"
  }
}
`;

export const JM32_SOURCE = `
policy DoorAccess {
  clause AllowWithKey {
    when door.allowed == true
    oblige door.authorized = true
  }
  clause DenyWithoutPermission {
    when door.allowed != true
    sanction deny
  }
}
guard LogAccess {
  when intent.openDoor
  do call logAccess()
}
`;

export const ROUTESCRIPT_SOURCE = `
route DoorOpenRoute {
  start:
    call markStarted()
    goto policy
  policy:
    branch door.authorized == true -> open
    branch door.authorized != true -> denied
    onError -> recoverStep
  open:
    door.state = "open"
    end
  denied:
    show "door is locked"
    end
  recoverStep:
    show "route recovered"
    end
}
`;

export const REALITY_CONTACT_SOURCE = `
evidence E1 {
  source = "sensor.door"
  signal = signal(type="doorState", value="open")
  context = {room="hallway", user="player1"}
  claim = claim(action="openDoor", user="player1")
}
adapter DoorAdapter {
  channel = "sensor.door"
  capability = "doorState"
  map(type -> eventType, value -> state)
}
`;

export const DINGS_SOURCE = `
ding D1 {
  claim = claim(action="openDoor", target="door", user="player1")
  proof = proof(policy="DoorAccess", route="DoorOpenRoute")
  signatures = ["system"]
  traces = ["T1"]
  evidence = ["E1"]
}
`;

export const TRACEBOX_SOURCE = `
trace T1 {
  event(time=1, type="FlowTalkInterpretation", payload={"intent":"openDoor"})
  event(time=2, type="JMLogicDecision", payload={"rule":"DoorOpenAllowed"})
  event(time=3, type="RouteStep", payload={"step":"open"})
}
`;

export const GAME_CODING_SOURCE = `
entity Door {
  state = "closed"
}
mechanic OpenDoor {
  requires door.authorized == true
  effect door.state = "open"
}
mechanic CloseDoor {
  requires door.state == "open"
  effect door.state = "closed"
}
collision DoorCollision {
  when player.position == door.position
  then trigger OpenDoor
}
combo UnlockAndOpen {
  steps = [OpenDoor]
}
update DoorAutoClose {
  every 60 frames
  do door.state = "closed"
}
`;

export const JM_GAMECORE_SOURCE = `
organ DoorOrgan {
  handles = [Door]
  rules = [OpenDoor]
  invariants = {
    door.state != "broken"
  }
}
system PlayerInteraction {
  organs = [DoorOrgan]
  events = [DoorCollision]
  identity = "PlayerInteraction.v1"
}
`;

export const INITIAL_FACTS = {
  context: { room: 'hallway', user: 'player1' },
  user: { hasKey: true, role: 'player' },
  door: { allowed: false, authorized: false, state: 'closed', position: 4 },
  player: { position: 4 }
};

export function nativeServices() {
  const calls = [];
  return {
    calls,
    services: {
      logAccess: (...args) => { calls.push({ service: 'logAccess', args }); return true; },
      markStarted: (...args) => { calls.push({ service: 'markStarted', args }); return true; }
    }
  };
}
