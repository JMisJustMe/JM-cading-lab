extends SceneTree
var checks = []
var scene
func _initialize() -> void:
	call_deferred("run")
func check(name: String, ok: bool) -> void:
	checks.append({"name":name,"passed":ok})
	print("NATIVE CONDUCT ","PASS " if ok else "FAIL ",name)
func load_envelope(name: String) -> Dictionary:
	return JSON.parse_string(FileAccess.get_file_as_string("res://packets/"+name+".json"))
func reset() -> void:
	scene.start_battle("BEACON")
	scene.set_process(false)
	scene.profile["level"] = 1
	scene._launch("blue","bulwark",Vector2(550,351))
	scene._launch("red","dart",Vector2(610,351))
	for h in scene.battle["heroes"]:
		h["flight"] = {}
		h["x"] = 550.0 if h["team"] == "blue" else 610.0
		h["y"] = 351.0
		h["hp"] = 50.0 if h["team"] == "blue" else 100.0
		h["shield"] = 0.0
	scene.battle["energy"]["blue"] = 100.0
	scene.battle["beacon"]["hull"] = 100.0

func run() -> void:
	scene = load("res://ConductedMain.tscn").instantiate()
	root.add_child(scene)
	reset()
	var packet = load_envelope("skyray")
	var original = JSON.stringify(scene.battle)
	var bad = packet.duplicate(true)
	bad["payloadSHA256"] = "0".repeat(64)
	check("transport hash fails before state mutation",not scene.accept_packet(bad).get("applied",false) and JSON.stringify(scene.battle)==original)
	var payload: Dictionary = JSON.parse_string(packet["payload"])
	payload["transaction"]["records"][1]["pattern"]["route"] = "execute-code"
	bad["payload"] = JSON.stringify(payload)
	bad["payloadSHA256"] = bad["payload"].sha256_text()
	check("rehashed unknown route refuses whole batch",not scene.accept_packet(bad).get("applied",false) and JSON.stringify(scene.battle)==original)
	var result: Dictionary = scene.accept_packet(packet)
	check("actual Node-six-body packet commits in native Godot",result.get("applied",false))
	check("native energy pays full two-record cost",is_equal_approx(scene.battle["energy"]["blue"],56.0))
	check("native Mend repairs original champion",scene.battle["heroes"][0]["hp"]>50.0)
	check("native Mend repairs original Beacon",scene.battle["beacon"]["hull"]>100.0)
	check("native Lance damages original enemy",scene.battle["heroes"][1]["hp"]<100.0)
	check("source and payload fingerprint return bound",result["receipt"]["payloadSHA256"]==packet["payloadSHA256"] and result["receipt"]["sourceSeal"]==scene.SOURCE_SEAL)
	check("runtime measured actual Godot Linux",result["receipt"]["runtime"]["os"]==OS.get_name() and result["receipt"]["runtime"]["headless"])
	var hp = scene.battle["heroes"][1]["hp"]
	scene.step_forms(0.05)
	check("Skyray autonomous contact damages original enemy",scene.battle["heroes"][1]["hp"]<hp and scene.battle["conducted"]["agents"][0]["contacts"]>0)
	var before_dup = JSON.stringify(scene.battle)
	var duplicate: Dictionary = scene.accept_packet(packet)
	check("duplicate packet changes no live state",duplicate.get("duplicate",false) and not duplicate.get("applied",true) and JSON.stringify(scene.battle)==before_dup)
	check("stale distinct packet refuses native revision",scene.accept_packet(load_envelope("rootwarden")).get("error","")=="STALE_RECIPIENT")
	scene._save_battle()
	var saved_bytes = FileAccess.get_file_as_string(scene.SAVE_BATTLE)
	var checkpoint = FileAccess.open("res://../evidence/native-checkpoint.json",FileAccess.WRITE)
	checkpoint.store_string(saved_bytes)
	checkpoint.close()
	var native_state = JSON.parse_string(JSON.stringify(scene.battle["conducted"]))
	var return_file = FileAccess.open("res://../evidence/native-return.json",FileAccess.WRITE)
	return_file.store_string(JSON.stringify({"schema":"jm.godot.execution-evidence/2","receipt":result["receipt"],"state":scene.battle["conducted"]},"  "))
	return_file.close()
	scene.battle = {}
	scene.resume_battle()
	scene.set_process(false)
	check("original save path restores exact native agent and journal",scene.battle["conducted"]==native_state)
	check("recovered duplicate remains idempotent",scene.accept_packet(packet).get("duplicate",false))
	reset()
	var cover_hp = scene.battle["cover"][0]["hp"]
	result = scene.accept_packet(load_envelope("rootwarden"))
	check("Rootwarden formation earned from two original routes",result.get("applied",false) and scene.battle["conducted"]["agents"][0]["form"]=="ROOTWARDEN")
	check("Nova materially damages original cover",scene.battle["cover"][0]["hp"]<cover_hp)
	check("Nova stuns actual enemy",scene.battle["heroes"][1]["stun"]>0.0)
	scene.battle["heroes"][1]["stun"] = 0.0
	cover_hp = scene.battle["cover"][0]["hp"]
	scene.step_forms(0.05)
	check("Rootwarden maintains physical root contact",scene.battle["heroes"][1]["stun"]>0.0)
	check("Rootwarden restores damaged terrain",scene.battle["cover"][0]["hp"]>cover_hp)
	reset()
	result = scene.accept_packet(load_envelope("prismwisp"))
	check("Prismwisp earned without replacing original roles",result.get("applied",false) and scene.ORDER==["bulwark","dart","warden"] and scene.battle["conducted"]["agents"][0]["form"]=="PRISMWISP")
	hp = scene.battle["heroes"][1]["hp"]
	scene.step_forms(0.05)
	check("Prismwisp orbit makes original combat contact",scene.battle["heroes"][1]["hp"]<hp)
	var failed = checks.filter(func(c):return not c["passed"])
	var receipt = {"scope":"actual original SLINGFALL inherited GDScript scene plus typed Node→Godot result adapter; Linux headless, not Samsung","passed":checks.size()-failed.size(),"total":checks.size(),"checks":checks,"engine":Engine.get_version_info()["string"]}
	var f = FileAccess.open("res://../evidence/native-tests.json",FileAccess.WRITE)
	f.store_string(JSON.stringify(receipt,"  "))
	f.close()
	print("NATIVE CONDUCT SUMMARY ",checks.size()," checks ",failed.size()," failures")
	quit(0 if failed.is_empty() else 1)
