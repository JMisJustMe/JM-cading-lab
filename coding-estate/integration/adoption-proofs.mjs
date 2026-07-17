import { Parser, Compiler, JSEmitter, CompileCadingAPI } from "../sovereign-batch-five/direct/compiler-lab-native.mjs";
import { RouteCoreNative, CodeHand, ChoiceBox, OSCoding } from "../sovereign-batch-six/direct/runtime-composition-native.mjs";
import { GameForge, JMVisualGraft, JMVisualRuntime } from "../sovereign-batch-six/direct/game-input-native-a.mjs";
import { PLAYFORM, PatternTapping, Seedform } from "../sovereign-batch-six/direct/game-input-native-b.mjs";

function requireTrue(condition, code) {
  if (!condition) throw Object.assign(new Error(code), { code });
}

export function runGameAdoptionProof() {
  const forgeSource = `gameforge FOURFOLDProof {
    game: FOURFOLD
    identity: FOURFOLD
    adapters: ["attachTrace","attachInput"]
    build: buildGame
    exports: ["browser","android"]
  }`;
  const playSource = `playform ArenaContact {
    form: drag_aim
    regions: ["arena","unit"]
    interactions: ["tap","drag","hold"]
    layout: side_scroll
    state_path: play.lastInput
  }`;
  const seedSource = `seedform GestureChoice {
    surface: arena
    choices: ["aim","move","cancel"]
    combos: ["tap-hold","drag-release"]
    permissions: ["player","tester"]
    state_path: seed.choice
  }`;
  const tapSource = `tap DoubleAim {
    sequence: ["left","right"]
    max_gap: 300
    route: aim.confirm
    state: armed
  }`;
  const visualSource = `visualgraft AimLine {
    mechanic: drag_aim
    state_path: aim.state
    expression: "aim-{state}"
    asset: aim_line
    contact: drag
  }`;
  const interactionSource = `interaction ArenaTouch {
    field: arena
    inputs: ["tap","drag","hold"]
    state_path: input.last
    feedback: pulse
    render: immediate
  }`;

  const game = { name: "FOURFOLD", identity: "FOURFOLD", capabilities: ["drag", "aim", "touch"] };
  const forge = GameForge.execute(forgeSource, game, {
    attachTrace: value => ({ ...value, traceAttached: true }),
    attachInput: value => ({ ...value, inputAttached: true }),
    buildGame: value => ({ ...value, built: true })
  });
  const play = PLAYFORM.execute(playSource, { region: "arena", type: "drag", value: "aim" }, {});
  const seed = Seedform.execute(seedSource, { permission: "player", choice: "aim", combo: "drag-release" }, {});
  const pattern = PatternTapping.execute(tapSource, [
    { tap: "left", time: 1000 },
    { tap: "right", time: 1240 }
  ]);
  const visual = JMVisualGraft.execute(visualSource, { aim: { state: "armed" } });
  const interaction = JMVisualRuntime.execute(interactionSource, { type: "drag", value: "aim" }, {});

  requireTrue(forge.state.distinct && forge.state.outputs.android, "GAME_FORGE_FAILED");
  requireTrue(play.result.mutuallyExecutable && seed.result.governed, "GAME_INPUT_FAILED");
  requireTrue(pattern.state.temporal && visual.state.mechanicLinked && interaction.result.consequenceReadable, "GAME_CONTACT_FAILED");

  return {
    name: "game",
    project: "FOURFOLD integration proof",
    bodies: ["GameForge", "PLAYFORM", "Seedform Choice Interface", "Pattern-Tapping", "JMVisualGraft", "JM Visual Interaction Runtime"],
    passed: true,
    receipts: [forge, play, seed, pattern, visual, interaction].map(result => result.receipt.resultDigest)
  };
}

export function runToolAdoptionProof() {
  const grammarSource = `grammar DoorLanguage {
    token OPEN /open/
    skip WS /\\s+/
    rule Command = [OPEN] meaning=door.open
  }`;
  const compilerSource = `compiler EstateCompiler {
    parser: Parser
    ir: OneBodyIR
    targets: ["javascript","typescript"]
  }`;
  const emitterSource = `emitter BrowserDoor {
    entry: OneBodyIR
    export: doorMeaning
    runtime: browser
  }`;
  const apiSource = `api CompileDoor {
    input: cading
    source_param: source
    target_param: target
    output: receipt
  }`;

  const compile = (sourceText, target) => {
    const parsed = Parser.execute(grammarSource, sourceText);
    const compiled = Compiler.execute(compilerSource, parsed, target);
    if (target === "javascript") {
      const emitted = JSEmitter.execute(emitterSource, compiled.onebody);
      return { ...emitted, parsed, compiled };
    }
    return compiled;
  };

  const api = CompileCadingAPI.execute(apiSource, { source: "open", target: "javascript" }, { compile });
  requireTrue(api.state.status === "ok", "TOOL_API_FAILED");
  requireTrue(api.compiled.state.code.includes("doorMeaning"), "TOOL_EMIT_FAILED");
  requireTrue(api.compiled.compiled.onebody.identityPreserved, "TOOL_IDENTITY_FAILED");

  return {
    name: "tool",
    project: "Cading compile API integration proof",
    bodies: ["Parser", "Compiler", "Cading IR / OneBody IR", "JS Emitter", "compileCading API"],
    passed: true,
    receipts: [
      api.compiled.parsed.receipt.resultDigest,
      api.compiled.compiled.receipt.resultDigest,
      api.compiled.receipt.resultDigest,
      api.receipt.resultDigest
    ]
  };
}

export function runOSAdoptionProof() {
  const routeSource = `nativeRoute EstateDoor {
    entry: closed
    states: ["closed","open"]
    transition: press
    abi: jm.route/1
  }`;
  const osSource = `os EstateOS {
    entry: home
    services: ["openDoor","inspectEstate"]
    permissions: ["owner","player"]
    event_loop: route-loop
    recovery: restore-current-best
  }`;
  const handSource = `codehand EstateHand {
    arena: Estate
    world: SovereignWorld
    operators: ["route","state","receipt"]
    console: CadenPad
    cold_ding: enabled
  }`;
  const choiceSource = `choicebox EntryChoice {
    prompt: "Choose estate route"
    choices: ["games","tools","estate"]
    default: estate
    state_path: entry.choice
  }`;

  const route = RouteCoreNative.execute(routeSource, { state: "closed", event: "press" });
  const os = OSCoding.execute(osSource, {
    permission: "owner",
    service: "openDoor",
    payload: { target: "SovereignWorld", state: route.state.to }
  }, {
    openDoor: payload => ({ opened: payload.target, state: payload.state }),
    inspectEstate: payload => ({ inspected: payload })
  });
  const hand = new CodeHand();
  const world = hand.open(handSource);
  hand.operate(world, "route", "estate.home");
  hand.operate(world, "state", os.state.outcome.state);
  const closed = hand.close(world);
  const choice = ChoiceBox.execute(choiceSource, "estate", {});

  requireTrue(route.state.to === "open" && os.state.outcome.opened === "SovereignWorld", "OS_ROUTE_FAILED");
  requireTrue(closed.state.coldDing === "enabled" && choice.choice.selected === "estate", "OS_HAND_FAILED");

  return {
    name: "os",
    project: "JM Estate OS integration proof",
    bodies: ["RouteCore Native", "OS_CODING", "CodeHand RouteOS", "Choice Box"],
    passed: true,
    receipts: [route, os, closed, choice].map(result => result.receipt.resultDigest)
  };
}

export function runAllAdoptionProofs() {
  const proofs = [runGameAdoptionProof(), runToolAdoptionProof(), runOSAdoptionProof()];
  return {
    schema: "jm.sovereign-estate.adoption-proofs/1.0",
    passed: proofs.every(proof => proof.passed),
    proofs
  };
}
