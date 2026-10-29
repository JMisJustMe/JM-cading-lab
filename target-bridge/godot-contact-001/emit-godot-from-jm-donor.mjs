/**
 * JM Target Bridge / Godot CP04
 * Source-adapter: bounded Unity host recipient previously emitted by JM Target Bridge.
 * This is a NEW Godot headless target contact, NOT repeating old Unity/GDevelop Dings.
 * Does NOT assert original SPINBREAK or whole-game Godot compatibility.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const donor='target-bridge/unity-contact-001/Assets/JMTargetBridge/JMTargetBridgeUnityContact001.cs';
const expectedBlob='3b73109dc8b476e0bb956686878ccd7ef2666966';
const bytes=readFileSync(join(root,donor));
const blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
if(blob!==expectedBlob)throw new Error('JM_TARGET_BRIDGE_SOURCE_IDENTITY_MISMATCH');
const text=bytes.toString('utf8');
function read(pattern,label){const m=text.match(pattern);if(!m)throw new Error('DONOR_SEMANTIC_HOLD_'+label);return m;}
const bodyId=read(/BodyId\s*=\s*"([^"]+)"/,'ID')[1];
const sourceAuthority=read(/Source authority remains JM/,'AUTHORITY');
const playerX=Number(read(/player\.transform\.position = new Vector3\((-?\d+(?:\.\d+)?)f,\s*0f,\s*0f\)/,'PLAYER_START')[1]);
const coinX=Number(read(/coin\.transform\.position = new Vector3\((-?\d+(?:\.\d+)?)f,\s*0f,\s*0f\)/,'COIN_START')[1]);
const speed=Number(read(/Vector3\.right \* \((\d+(?:\.\d+)?)f \* Time\.deltaTime\)/,'MOVEMENT_SPEED')[1]);
const score=Number(read(/score = (\d+);/,'SCORE')[1]);
read(/Destroy\(coin\);/,'COIN_CONSUMPTION');
read(/scoreBefore == 0 && score == 1/,'SCORE_DELTA');
for(const hold of ['hazard.consequence','goal.after_collecting','starting_player_hp']){
  if(!text.includes(hold))throw new Error('JM_DONOR_HOLD_LOST_'+hold);
}
if(!bodyId.startsWith('jm.target-bridge.mini-collect-contact/')||score!==1)throw Error('UNSUPPORTED_DONOR_SLICE');
const output=resolve(process.argv[2]??'/tmp/jm-godot-contact');
mkdirSync(output,{recursive:true});
const project=`config_version=5
[application]
config/name="JM Target Bridge Godot Contact 001"
run/main_scene="res://contact.tscn"
[rendering]
renderer/rendering_method="gl_compatibility"
renderer/rendering_method.mobile="gl_compatibility"
`;
const scene=`[gd_scene load_steps=2 format=3]
[ext_resource type="Script" path="res://contact.gd" id="1"]
[node name="JMTargetBridgeGodotContact" type="Node2D"]
script = ExtResource("1")
`;
const script=`extends Node2D
# Automatically emitted from exact frozen JM-owned Target Bridge Unity donor.
# Host carries original bounded semantics; this is not a new Godot game design.
const SOURCE_AUTHORITY = "JM"
const SOURCE_DONOR_BLOB = "${blob}"
const UNRESOLVED = ["hazard.consequence", "goal.after_collecting", "starting_player_hp"]
var player_x = ${playerX}
var coin_x = ${coinX}
var speed = ${speed}
var score = 0
var coin_exists = true
var frame = 0
var move_observed = false
var contact_observed = false
var score_observed = false
var consumption_observed = false

func _ready() -> void:
    Input.action_press("ui_right")
    print("JM_GODOT_HOST_READY source=JM blob=" + SOURCE_DONOR_BLOB)

func _physics_process(delta: float) -> void:
    frame += 1
    if Input.is_action_pressed("ui_right"):
        var before_x: float = player_x
        player_x += speed * delta
        if player_x > before_x:
            move_observed = true
    if coin_exists and absf(player_x - coin_x) < 1.35:
        contact_observed = true
        var score_before: int = score
        score = ${score}
        if score_before == 0 and score == 1:
            score_observed = true
        coin_exists = false
        consumption_observed = not coin_exists
        if move_observed and contact_observed and score_observed and consumption_observed:
            var receipt = {
                "schema":"JM.TargetBridge.GodotHostReceipt/0.1",
                "host":"Godot", "source_authority":SOURCE_AUTHORITY,
                "source_donor_blob":SOURCE_DONOR_BLOB,
                "source_semantics":"JM-owned Unity host-contact slice",
                "observations":{"movement":"PASS","contact":"PASS","score_delta":"PASS","coin_consumption":"PASS"},
                "score_before":score_before,"score_after":score,"coin_consumed":not coin_exists,
                "input":"headless_synthetic_ui_right",
                "unresolved_preserved":UNRESOLVED,
                "status":"HEADLESS_GODOT_RUNTIME_PASS",
                "owner_device":"NOT_TESTED"
            }
            print("JM_TARGET_BRIDGE_GODOT_RUNTIME_PASS " + JSON.stringify(receipt))
            get_tree().quit(0)
    if frame > 280:
        push_error("GODOT_SOURCE_SEMANTICS_NOT_OBSERVED")
        get_tree().quit(5)
`;
writeFileSync(join(output,'project.godot'),project);
writeFileSync(join(output,'contact.tscn'),scene);
writeFileSync(join(output,'contact.gd'),script);
console.log(JSON.stringify({schema:'JM.TargetBridge.GodotEmissionReceipt/0.1',sourceAuthority:'JM',
  donor,blob,bodyId,host:'Godot 4.x',project:output,
  semantics:{playerX,coinX,speed,scoreOnContact:score,coinConsumed:true},
  unresolved:['hazard.consequence','goal.after_collecting','starting_player_hp'],
  proof:'HOST_INGESTIBLE_GENERATED_NOT_RUN',sourceIsOriginalGame:false}));
