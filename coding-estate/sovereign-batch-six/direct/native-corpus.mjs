export const ROUTECORE_SOURCE=`
nativeRoute DoorNative {
  entry = closed
  states = [closed,open]
  transition = press
  abi = jm.routecore.v1
}
`;
export const GAME_NATIVE_SOURCE=`
gamecore DoorGameCore {
  source = Door.game
  parser = parseGame
  ir = lowerGame
  runtime = runGame
  host = serveGame
  organs = [input,mechanics,trace]
}
`;
export const CODEHAND_SOURCE=`
codehand DoorHand {
  arena = DoorArena
  world = DoorWorld
  operators = [state,route]
  console = DoorConsole
  cold_ding = DoorCold
}
`;
export const CHOICE_SOURCE=`
choicebox DoorChoice {
  prompt = "Choose door action"
  choices = [open,inspect,recover]
  default = inspect
  state_path = door.choice
}
`;
export const COMBIBIND_SOURCE=`
combine DoorBind {
  left = DoorLogic
  right = DoorVisual
  compatible = [state,trace]
  output = DoorBound
  rollback = DoorRollback
}
`;
export const SMOOTH_SOURCE=`
smooth DoorFlow {
  input = DoorSteps
  pass = dedupe
  equivalence = endpoints
  metric = transitions
}
`;
export const GRAFT_SOURCE=`
graft DoorAbility {
  donor = AbilityBody
  host = DoorBody
  capability = unlock
  provenance = AbilityReceipt
  rollback = RemoveUnlock
}
`;
export const VISUAL_GRAFT_SOURCE=`
visualgraft DoorGlow {
  mechanic = DoorOpen
  state_path = door.state
  expression = "door:{state}"
  asset = DoorSprite
  contact = tap
}
`;
export const VISUAL_RUNTIME_SOURCE=`
interaction DoorField {
  field = DoorPanel
  inputs = [tap,drag]
  state_path = door.input
  feedback = pulse
  render = DoorRenderer
}
`;
export const GAMEFORGE_SOURCE=`
gameforge DoorForge {
  game = DoorGame
  identity = DoorGame.v1
  adapters = [mobileAdapter,traceAdapter]
  build = buildGame
  exports = [web,android]
}
`;
export const GLYPHPLAY_SOURCE=`
glyphplay DoorGlyphPlay {
  creator = JM
  glyphs = [OPEN,INSPECT]
  interaction = tap
  trace = DoorTrace
  output = DoorAction
}
`;
export const GLYPHFORGE_SOURCE=`
glyphforge DoorGlyphForge {
  shell = JMGameShell
  game = DoorGame
  control_grammar = DoorControls
  capabilities = [tap,drag,save]
  adapter = DoorAdapter
}
`;
export const PLAYFORM_SOURCE=`
playform DoorPlayForm {
  form = DoorPanel
  regions = [door,handle]
  interactions = [tap,drag]
  layout = side-scroll
  state_path = play.lastInput
}
`;
export const WAKE_SOURCE=`
wake DoorWake {
  dormant = DoorArchive
  identity = DoorBody
  adapters = [recoverSource,normaliseRoutes]
  route = door.wake
  emit = DoorLive
}
`;
export const KADING_GAME_SOURCE=`
kadinggame DoorEstate {
  game = DoorGame
  kading = codeWithKading
  organs = [input,trace,receipt]
  runtime = runKadingGame
  host = serveKadingGame
}
`;
export const PATTERN_TAP_SOURCE=`
tap DoorTap {
  sequence = [left,right,left]
  max_gap = 250
  route = door.open
  state = ready
}
`;
export const SEEDFORM_SOURCE=`
seedform DoorSeed {
  surface = DoorHandSurface
  choices = [open,inspect]
  combos = [tap-hold,drag-release]
  permissions = [player,admin]
  state_path = seedform.selection
}
`;
export const FINGER_ONE_SOURCE=`
fingerone SourceHand {
  bodies = [Cading,FlowTalk,JMLogic]
  select = sovereign
  route = estate.compile
  receipt = SourceHandReceipt
}
`;
export const FINGER_TWO_SOURCE=`
fingertwo BodyHand {
  routes = [formula,gesture,mudra,morseminus,zerogrip]
  embodied = true
  temporal = true
  receipt = BodyHandReceipt
}
`;
export const OS_CODING_SOURCE=`
os DoorOS {
  entry = boot
  services = [openDoor,inspectDoor]
  permissions = [player,admin]
  event_loop = route-loop
  recovery = DoorRecovery
}
`;
