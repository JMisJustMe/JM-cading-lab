export const CADING_SOURCE = `open, open-the-door = intent.openDoor.✓`;

export const QUADZE_SOURCE = `
body Alpha {
  local_time: 3
  membrane: soft(ε = 2)
  routes: [Pulse, Cross]
}
body Beta {
  local_time: 1
  membrane: porous(ε = 3)
  routes: [Recovery]
}
route Pulse { cost: 1 apply: increment_state }
route Cross { cost: 2 apply: cross_boundary }
route Recovery { cost: 1 apply: restore_state }
keeper Gate1 { rule: allow_if Alpha.local_time >= 4 }
glyph Echo { window: [5..12] latency: 1 hysteresis: 3 }
policy rejected: dingandreceipt
`;

export const SPEAKUALS_SOURCE = `intent.openDoor = door.requested.✓`;

export const MARK_LEVEL_SOURCE = `
marks {
  open = "open"
  door = "door"
}
level meaning {
  phrase = [open, door]
  yields = intent.openDoor
}
route intent.openDoor -> door.open
`;

export const TBS_STRING_SOURCE = `
string DoorCommand {
  source = "open door"
  segment words = ["open", "door"]
  bind "open" -> action
  bind "door" -> target
  compose action + target -> intent
}
`;

export const TOKEN_BODY_SOURCE = `
token WORD /[A-Za-z]+/
token NUMBER /\\d+/
skip SPACE /\\s+/
`;

export const PUNCT_BODY_SOURCE = `
punct FULL ".✓" effect=complete
punct QUESTION "?" effect=query
punct PRESS "!" effect=act
sequence PROVEN = [PRESS, FULL]
`;

export const GLYPH_BODY_SOURCE = `
glyph OPEN "!" pressure=high route=door.open
glyph ASK "?" pressure=search route=door.inspect
glyph SOFT "~" pressure=soft route=door.softOpen
`;

export const ROUTE_FRAME_SOURCE = `
frame Door {
  entry start
  step start goto check
  step check when door.authorized == true goto open else deny
  step open do door.state = "open" end
  step deny do door.state = "locked" end
}
`;

export const STATE_FIELD_SOURCE = `
field Door {
  state closed
  state open
  transition Open closed -> open when door.authorized == true
  transition Close open -> closed
}
`;

export const CONTACT_BAND_SOURCE = `
band DoorTouch {
  range 0..10
  zone soft 0..3 route inspect
  zone firm 4..7 route open
  zone hard 8..10 route reject
}
`;

export const FORMULA_GATE_SOURCE = `
gate OpenGate(force, focus) {
  formula force + focus
  pass when result >= 10
  onpass door.authorized = true
  onfail door.authorized = false
}
`;

export const FORMULA_BORN_SOURCE = `
wordbody DoorWord {
  word = "open"
  image = "door"
  state = "ready"
}
formula DoorFormula {
  from = DoorWord
  glyph = "!"
  route = door.open
}
`;

export const NONCODING_SOURCE = `
signal OpenSignal {
  meaning = "open door"
  form = gesture
  action = door.open
}
`;

export const CONTACT_CODE_SOURCE = `
contact DoorPress {
  target = door
  pressure >= 4
  hold >= 200
  effect door.state = "open"
}
`;

export const MORSE_MINUS_SOURCE = `
morse Open "--- gap -" route door.open
morse Inspect "- gap -" route door.inspect
`;

export const ZERO_GRIP_SOURCE = `
zerogrip SoftOpen {
  hinge = "0+0"
  signal = "-"
  max_force = 1
  route = door.softOpen
}
`;

export const MUDRA_SOURCE = `
mudra OpenDoor {
  shape = open
  hold = 2
  route = door.open
  state = ready
}
`;

export const JICKMA_SOURCE = `
jickma DoorGift {
  before = door.closed
  contact = press
  trace = impact
  gift = permission
  after = door.open
}
`;

export const MOOD_DRILLS_SOURCE = `
drill CalmOpen {
  mood = low
  intensity = 3
  steps = [breathe, focus, open]
  shift = clear
  route = door.open
}
`;

export const INITIAL_STATE = {
  intent: { openDoor: false },
  door: { requested: false, authorized: false, state: "closed" },
  fields: { Door: "closed" },
  mood: "low"
};
