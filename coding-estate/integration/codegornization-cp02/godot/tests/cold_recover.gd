extends SceneTree
func _initialize() -> void:
	call_deferred("run")
func run() -> void:
	var scene = load("res://ConductedMain.tscn").instantiate()
	root.add_child(scene)
	scene.set_process(false)
	var saved = JSON.parse_string(FileAccess.get_file_as_string("res://../evidence/native-checkpoint.json"))
	scene._save_file(scene.SAVE_BATTLE,saved)
	scene.resume_battle()
	var state = scene.battle["conducted"]
	var initial = state.duplicate(true)
	var envelope = JSON.parse_string(FileAccess.get_file_as_string("res://packets/skyray.json"))
	var duplicate = scene.accept_packet(envelope)
	var checks = [scene.mode=="playing",scene.battle["energy"]["blue"]==56.0,state["agents"][0]["form"]=="SKYRAY",duplicate.get("duplicate",false),state==initial]
	var hp = scene.battle["heroes"][1]["hp"]
	scene.battle["conducted"]["agents"][0]["clock"] = 0.0
	scene.step_forms(0.05)
	checks.append(scene.battle["heroes"][1]["hp"] < hp)
	var ok = checks.all(func(v):return v)
	var result = {"status":"PROVEN" if ok else "HOLD","passed":checks.filter(func(v):return v).size(),"total":checks.size(),"scope":"fresh Godot process and original save-path recovery from transported checkpoint; no physical device"}
	var file = FileAccess.open("res://../evidence/cold-native-recovery.json",FileAccess.WRITE)
	file.store_string(JSON.stringify(result,"  "))
	file.close()
	print("COLD NATIVE RECOVERY ",result)
	quit(0 if ok else 1)
