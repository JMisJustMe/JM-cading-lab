# JM OneGame Engine v0.1 — Native Source Stack

The separate native files remain inside the Zionfolder. This mount preserves their authoritative order and executable intent in one readable source witness.

## 01 — Cading

```cading
module JMOneGame {
  body Identity {
    id: text = "JM-ONEGAME-001"
    name: text = "JM OneGame Engine"
    role: text = "Play, Make, Test and Ship many distinct game bodies through one shared organ stack"
    owner: text = "Theodore Benjamin Scott / JM / JMISJUSTME"
    state: text = "OPERATIONAL BROWSER BYPRODUCT / PHONE DING PENDING"
  }

  entity GameBody { id:text; title:text; template:text; identity:text; state:text }
  entity GameEntity { id:text; kind:text; x:number; y:number; size:number; behaviour:text; state:text }
  entity ContactBody { id:text; x:number; y:number; label:text; role:text; state:text }
  entity Trace { id:text; event:text; source:text; route:text; state:text; evidence:text }

  route source_to_game(source:text, template:text) -> GameBody {
    let body: GameBody = GameBody(source, source, template, source, "SEATED")
    ding "game-body-seated"
    return body
  }

  route contact_to_action(input:text, cursor:text, target:text, action:text) -> text {
    if input == cursor { hold "collapsed-contact-route"; return "HOLD" }
    if cursor == target { hold "cursor-target-collapse"; return "HOLD" }
    ding "contact-route-separated"
    return action
  }

  route compile(game:GameBody, entities:number, reverseTrace:number) -> text {
    if entities < 1 { hold "empty-game"; return "HOLD" }
    if reverseTrace != 1 { hold "source-back-route-missing"; return "HOLD" }
    ding "onegame-playable-body"
    return "PLAYABLE"
  }
}
```

## 02 — Kading

```kading
estate JMOneGame {
  source_houses {
    gameforge: "build graph, adapters, project packaging"
    glyphplay: "creator flow, playable glyph/entity body, edit-test-package"
    glyphforge: "asset/glyph adaptation and capability negotiation"
    jm_game_native_core: "shared organs without identity collapse"
    kading_game_estate_engine: "language-to-game behaviour"
    visualang: "truthful visual and interaction grammar"
    ldml_play: "game-strength motion, reduced motion, adaptive intensity"
    x_form: "thing/display/role/freedom/limit/contact/trace inspection"
    living_cursor: "persistent aim, role-separated contact, ContactBodies"
    routeos: "events, undo, recovery, save and export"
    tracebox: "receipts, replay, BUGG and DING"
  }

  game_houses {
    aim_clash keeps [aim, launch, collision, target consequence]
    glyph_run keeps [move, collect, hazard, goal]
    route_catch keeps [seek, contact, sequence, trace]
  }

  law "Shared organs do not make separate games identical."
}
```

## 03 — JMLogic

```jmlogic
JMLogic OneGameRules {
  current_best := proof(source + execution + trace + recovery)
  version_number_alone != current_best
  visual_claim must_equal visible_state
  touchable_display must_have real_action
  motion must_equal state_change
  identity(game_a) != identity(game_b)
  shared_organ does_not_imply shared_game
  HAND != CURSOR != TARGET != ACTION != CONTACTBODY != TRACE
  family_map != byproduct
  byproduct := joined_body_exists AND joined_body_performs_new_capability
  renderer_state is_not source_of_truth
  DING only_when self_test_passes AND playable_scene_runs AND export_body_exists
}
```

## 04 — FlowTalk

```flowtalk
FlowTalk OneGameContact {
  say "MAKE" -> open creator and expose place/edit/save/export actions
  say "PLAY" -> run selected game identity and its own verbs
  say "TEST" -> show checks, BUGGs, DINGs and performance state
  say "TRACE" -> show what entered, changed, acted and remained
  say "AIM" -> move living cursor without moving target
  say "ACT" -> apply selected game action beneath cursor
  say "HOLD" -> grab declared movable body
  say "PIN" -> preserve cursor position as editable ContactBody
  say "DOT DOT" -> first double-tap seats FROM; second seats TO and creates route
  say "X-FORM" -> reveal thing, display, role, freedoms, limits, motion, contact and trace
}
```

## 05 — RouteCode

```routecode
ROUTECODE ONEGAME {
  OPEN -> LOAD_DEFAULT -> READY
  READY + MAKE -> EDIT
  READY + PLAY -> RUN
  EDIT + PLACE(kind) -> ENTITY_SEATED -> TRACE
  EDIT + TAP(entity) -> SELECTED -> XFORM
  EDIT + HOLD(entity) -> GRABBED -> ALTER -> RELEASE -> COMMIT -> TRACE
  EDIT + PIN -> CONTACTBODY -> EDITABLE -> PRESERVE
  EDIT + DOUBLE_TAP -> DOT_A
  DOT_A + DOUBLE_TAP -> DOT_B -> DELIVER -> ROUTE_BODY -> TRACE
  RUN + ACT -> GAME_SPECIFIC_ACTION -> CONSEQUENCE -> TRACE
  ANY + UNDO -> PRIOR_SERIAL_STATE
  ANY + SAVE -> LOCAL_BODY
  ANY + EXPORT_PROJECT -> JSON_BODY
  ANY + EXPORT_PLAYABLE -> STANDALONE_HTML_BODY
}
```

## 06 — Quadze

```quadze
QUADZE ONEGAME {
  entity_state: IDLE | ACTIVE | SELECTED | GRABBED | MOVING | HIT | DING | BUGG | HIDDEN
  engine_phase: BOOT | READY | MAKE | PLAY | PAUSE | TEST | EXPORT
  contact_phase: FREE | AIM | TARGET | ACT | GRAB | ALTER | RELEASE | PIN | REPLAY
  directions: N | NE | E | SE | S | SW | W | NW
  update: fixed 60hz simulation
  render: adaptive display refresh
  rule: movement_trace != movement_body
  rule: route != traveller
  rule: position != direction
  rule: game_identity persists through shared engine phase
}
```

## 07 — RouteOS

```routeos
RouteOS OneGameHost {
  service Simulation owns [entities, rules, collisions, score, lives, saveable_state]
  service Render owns [canvas, camera, particles, visual_state_projection]
  service Input owns [pointer, touch, keyboard, action_map, accessibility_parity]
  service Contact owns [living_cursor, target_query, grab, ContactBody, dotdotdeliverance]
  service Edit owns [palette, inspector, undo, redo, scene_change]
  service Store owns [local_save, import, export_project, export_playable]
  service Trace owns [receipts, self_test, performance, replay]
  permission Render cannot mutate authoritative simulation without routed command
  recovery on_error -> BUGG_RECEIPT -> SAFE_PAUSE -> RESET_OR_LOAD
}
```

## 08 — GameCore

```gamecore
GAMECORE ONEGAME {
  shared organs: clock, entity_store, collision, action_map, renderer, save, trace
  adapter aim_clash {
    verbs: AIM, LAUNCH, BOUNCE, HIT
    success: TARGET_HIT
    fail: SHOT_STALL
  }
  adapter glyph_run {
    verbs: MOVE, COLLECT, EVADE, REACH
    success: GOAL_REACHED
    fail: LIFE_ZERO
  }
  adapter route_catch {
    verbs: SEEK, CONTACT, LINK, COMPLETE
    success: SEQUENCE_COMPLETE
    fail: TIME_EXPIRED
  }
  conformance "adapters share organs while keeping distinct verbs, success, fail and feedback"
}
```

## 09 — Visualang PLAY

```visualang
VISUALANG ONEGAME PROFILE PLAY {
  crown "The visual must speak the body behaviour."
  no_dead_stickers: true
  touchable_means_action: true
  movement_matches_state: true
  separate_meaningful_parts_remain_separate: true
  surface: simple
  depth: living
  state_colour { aim: yellow; route: cyan; ding: green; bugg: red; selected: violet }
  xform on_select reveals [thing, display, role, freedoms, limits, movement, contact, trace]
  reduced_motion: supported
}
```

## 10 — Living Cursor / Contact Engine

```contact
CONTACT ONEGAME {
  crown "The finger guides. The living cursor aims. Contact acts. Meaningful contact may remain alive."
  separation HAND != CURSOR != TARGET != ACTION != CONTACTBODY != TRACE
  route GUIDE > AIM > TARGET > CLICK_OR_GRAB > ALTER > RELEASE > PRESERVE > REPLAY
  cursor persistent true
  cursor offset adjustable
  cursor precision adjustable
  single_tap SELECT_OR_ACT
  hold GRAB_DECLARED_ENTITY
  pin MAKE_EDITABLE_CONTACTBODY
  double_tap dotdotdeliverance { first FROM; second TO; output ROUTE_BODY }
  visible_button_parity true
}
```

## Emission

The ten native bodies emit the standalone HTML carrier. HTML and JavaScript carry the result; they do not replace the authoring authority.