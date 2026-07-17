export const FLOW_BODY_SOURCE=`
bodyroute CalmOpen {
  state = calm
  utterance = "open now"
  meaning = intent.openDoor
  route = door.open
  action door.requested = true
}
`;
export const COMMAND_GLYPH_SOURCE=`command ! pressure=high route=door.open action door.state = "open"\ncommand ? pressure=query route=door.inspect action door.inspected = true\ncommand ~ pressure=soft route=door.softOpen action door.state = "ajar"`;
export const MIRROR_SOURCE=`
pair OpenPair {
  left_name = intent.openDoor
  right_move = press
  route = door.open
}
`;
export const PRAYER_SOURCE=`
prayer DoorJoin {
  hand_a = left
  hand_b = right
  contact = door
  max_delta = 1
  route = door.open
}
`;
export const COLD_JOIN_SOURCE=`
join DoorMemory {
  trace = T1
  ding = D1
  memory = door.open.memory
}
`;
export const MEBL_SOURCE=`
event Request {
  state = requested
  cause = user
  trace = T1
  receipt = R1
  membrane = entry
}
event Authorised {
  state = authorised
  cause = policy
  trace = T2
  receipt = R2
  membrane = gate
}
event Opened {
  state = open
  cause = route
  trace = T3
  receipt = R3
  membrane = exit
}
cause Request -> Authorised
cause Authorised -> Opened
trace Opened carries Request
`;
export const BOW_SOURCE=`
binding DoorBinding {
  source = FlowTalk
  target = RouteOS
  route = door.open
  trace = T1
  preserve = [FlowTalk, RouteOS]
}
`;
export const EMP_SOURCE=`
whatness DoorClaim {
  thing = door.open
  observer = player
  preset = expectedOpen
  evidence = sensor.open
  trace = T1
}
`;
export const PAT_SOURCE=`
pattern DoorBranch {
  family = branch
  values = [1,2,4,8]
  engine = RouteForm
  route = door.options
}
`;
export const STAR_SOURCE=`
star DoorStar {
  hinge = door.threshold
  truth = authorised
  same_estate = true
  route = door.open
}
`;
export const PROMISE_SOURCE=`
door OpenDoor {
  primary = door.open
  fallback = door.inspect
  promise = no_dead_door
  alive = true
}
`;
export const BUGG_SOURCE=`
bugg DoorStuck {
  source = door.route
  symptom = stuck
  expected = open
  recovery = resetHinge
  trace = TBUG1
}
`;
export const BIO_SOURCE=`
bioding DoorContact {
  claim = door.open
  source = sensor.door
  signal = open
  state = confirmed
  trace = TBIO1
}
`;
export const GATES_SOURCE=`
build DoorBuild {
  source = door.cad
  gates = [source,signal,route,state,trace,body,receipt,rebuild]
  receipt = door.receipt
}
`;
export const DELIVERY_SOURCE=`
package DoorPack {
  source = door.cad
  build = door.build
  receipt = door.receipt
  package = door.zip
  open_first = OPEN_FIRST.md
}
`;
export const PAD_SOURCE=`
pad DoorPad {
  language = Cading
  source = "open = door.open.✓"
  tests = [fullstop,landing]
  savepack = DoorSavePack
}
`;
export const IR_SOURCE=`node source0 kind=source value="open"\nnode landing kind=landing value=door.open\nlink source0 -> landing kind=speakuals`;
export const HYBRID_SOURCE=`
hybrid DoorHybrid {
  source = door.cad
  targets = [javascript,rust,wasm]
  constraints = [browser,android]
  prefer = javascript
}
`;
export const CADING_SOURCE=`open, open-door = door.open.✓`;
