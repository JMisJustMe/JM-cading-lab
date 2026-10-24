extends SceneTree
const KO_SEAL = preload("res://KOSeal.gd")
var checks: Array = []
var scene

func check(title: String, ok: bool) -> void:
	checks.append(ok)
	print("CP10 KO ", "PASS " if ok else "FAIL ",title)

func _initialize() -> void:
	call_deferred("run")

func begin(variant: String = "SECTOR") -> void:
	scene.start_battle(variant)
	scene.set_process(false)
	scene.battle["energy"]["blue"]=100.0

func actor() -> Dictionary:
	if not scene._launch("blue","dart",Vector2(448,216)):
		return {}
	var h: Dictionary = scene.battle["heroes"].back()
	h["x"]=448.0
	h["y"]=216.0
	scene._land(h)
	return h

func packet() -> Dictionary:
	return JSON.parse_string(FileAccess.get_file_as_string("res://packets/ko_aegis.json"))

func run() -> void:
	scene=load("res://CP10Main.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame
	check("KO action inherits existing native controls",scene.has_method("accept_cue") and scene.has_method("_cp9_special_step") and scene.has_method("_land"))
	check("KO contact button is real native hit target",scene.has_node("CooperationRail/KOContactButton") and scene._buttons().has(scene.get_node("CooperationRail/KOContactButton")))
	check("KO contact hidden on initial menu",not scene.get_node("CooperationRail").visible)
	begin()
	var envelope: Dictionary=packet()
	check("typed source packet available in actual native project",envelope is Dictionary and str(envelope.get("schema",""))=="jm.ko-contact.transport/1")
	var content: String=str(envelope.get("payload",""))
	check("native seal proves exact KO donor artifact identity",content.sha256_text()==KO_SEAL.PACKET_SHA and str(envelope["payloadSHA256"])==KO_SEAL.PACKET_SHA)
	var decoded: Dictionary=JSON.parse_string(content)
	check("two separate KO / SLINGFALL identities preserved",decoded["identities"]["left"]=="KOCODIFIER" and decoded["identities"]["right"]=="SLINGFALL" and decoded["source"]["historicalKocodifyingOriginal"]==false)
	check("all three real donor executions encoded in contact",bool(decoded["execution"]["Codifying"]) and bool(decoded["execution"]["Kocodifying"]) and bool(decoded["execution"]["JMLogic"]) and bool(decoded["execution"]["allowed"]))
	var energy_before: float=float(scene.battle["energy"]["blue"])
	var denied=scene.accept_ko_contact(envelope)
	check("contact refuses empty blue field",not denied["applied"] and denied["error"]=="NO_GROUNDED_ALLY" and is_equal_approx(float(scene.battle["energy"]["blue"]),energy_before))
	var hero=actor()
	check("original native launch and landing valid",not hero.is_empty() and hero["flight"].is_empty())
	hero["shield"]=0.0
	var real_balance_before_tamper: float=float(scene.battle["energy"]["blue"])
	var tampered=envelope.duplicate(true)
	tampered["payloadSHA256"]="1".repeat(64)
	denied=scene.accept_ko_contact(tampered)
	check("tampered KO packet holds and does not spend energy",not denied["applied"] and denied["error"]=="KO_SOURCE_BYTES" and is_equal_approx(float(scene.battle["energy"]["blue"]),real_balance_before_tamper))
	scene.battle["energy"]["blue"]=5.0
	denied=scene.accept_ko_contact(envelope)
	check("real native energy gate refuses underspend",not denied["applied"] and denied["error"]=="INSUFFICIENT_ENERGY" and is_equal_approx(float(hero["shield"]),0.0))
	scene.battle["energy"]["blue"]=100.0
	var accepted=scene.accept_ko_contact(envelope)
	check("KO contact causes actual native state change",bool(accepted.get("applied",false)) and is_equal_approx(float(scene.battle["energy"]["blue"]),88.0) and float(hero["shield"])>=6.0)
	check("owner-visible KO statement reflects real state",str(scene.battle.get("ko_visible","")).contains("1 ALLIES SHIELDED") and str(scene.battle["ko_visible"]).contains("RECEIPT"))
	var r: Dictionary=scene.battle.get("ko_return",{})
	check("live native return names the actual donor bodies",r.get("participants",[]).has("Kocodifying") and r.get("participants",[]).has("JMLogic") and r.get("participants",[]).has("Codifying") and r["distinctIdentities"]["left"]=="KOCODIFIER" and r["distinctIdentities"]["right"]=="SLINGFALL")
	check("native before/after outcome returned and sealed",is_equal_approx(float(r["before"]["energy"]),100.0) and is_equal_approx(float(r["after"]["energy"]),88.0) and str(r["sourceSHA256"])==KO_SEAL.PACKET_SHA)
	denied=scene.accept_ko_contact(envelope)
	check("duplicate KO intent cannot double-apply",not denied["applied"] and denied["error"]=="CONTACT_ALREADY_USED" and is_equal_approx(float(scene.battle["energy"]["blue"]),88.0))
	check("native game persisted accepted KO contact",scene._has_save() and int(scene.battle["ko_applied"])==1)
	scene.mode="result"
	scene._sync_native_rails()
	check("KO control and readout hidden on victory",not scene.get_node("CooperationRail").visible and not scene.ko_readout.visible)
	begin("CONVOY")
	denied=scene.accept_ko_contact(envelope)
	check("CONVOY mission unchanged by KO SECTOR-only contact",not denied["applied"] and denied["error"]=="NOT_ACTIVE_SECTOR")
	begin("BEACON")
	denied=scene.accept_ko_contact(envelope)
	check("BEACON mission unchanged by KO SECTOR-only contact",not denied["applied"] and denied["error"]=="NOT_ACTIVE_SECTOR")
	var fails=checks.count(false)
	print("CP10 KO SUMMARY ",checks.size()-fails,"/",checks.size())
	quit(0 if fails==0 else 1)
