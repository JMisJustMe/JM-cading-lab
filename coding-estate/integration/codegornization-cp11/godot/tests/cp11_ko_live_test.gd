extends SceneTree
const SEAL=preload("res://KO11Seal.gd")
var scene
var checks: Array=[]
func check(label: String, ok: bool) -> void:
	checks.append(ok)
	print("CP11 KO LIVE ", "PASS " if ok else "FAIL ",label)
func _initialize() -> void:
	call_deferred("run")
func begin(variant: String="SECTOR") -> void:
	scene.start_battle(variant)
	scene.set_process(false)
	scene.battle["energy"]["blue"]=100.0
	scene.battle["energy"]["red"]=100.0
func launch(team: String,kind: String,pos: Vector2) -> Dictionary:
	if not scene._launch(team,kind,pos):return {}
	var h: Dictionary=scene.battle["heroes"].back()
	h["x"]=pos.x;h["y"]=pos.y
	scene._land(h)
	return h
func run() -> void:
	scene=load("res://CP11Main.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame
	check("native CP11 inherited real CP10 KO and original game",scene.has_method("accept_ko_contact") and scene.has_method("_cp9_special_step") and scene.has_method("accept_cue") and scene.has_method("_launch"))
	check("native KO policy is source-sealed and loaded",not scene.ko11_policy.is_empty() and scene.ko11_policy["transportSHA256"]==SEAL.POLICY_SHA)
	check("separate KO identities and native decision row set",scene.ko11_policy["identities"]["left"]=="KOCODIFIER" and scene.ko11_policy["identities"]["right"]=="SLINGFALL" and scene.ko11_policy["table"].size()==4)
	check("real donor policies include all three alternatives",scene.ko11_policy["table"]["00"]=="AEGIS" and scene.ko11_policy["table"]["01"]=="COUNTER" and scene.ko11_policy["table"]["10"]=="TRIAGE" and scene.ko11_policy["table"]["11"]=="TRIAGE")
	check("native KO interface hidden on menu",not scene.get_node("CooperationRail").visible)
	begin()
	check("live policy needs actual player champion",scene.accept_ko_live()["error"]=="DEPLOY_FIRST")
	var hero=launch("blue","dart",Vector2(448,216))
	check("original native game launch and land available",not hero.is_empty() and hero["flight"].is_empty())
	hero["shield"]=0.0
	scene.battle["energy"]["blue"]=100.0
	check("healthy and uncontested live choice is AEGIS",scene._ko11_choice(scene._ko11_facts())=="AEGIS")
	var a=scene.accept_ko_live()
	check("live AEGIS actually spends 12 and shields champion",bool(a.get("applied",false)) and a.get("action","")=="AEGIS" and is_equal_approx(float(hero["shield"]),5.0) and is_equal_approx(float(scene.battle["energy"]["blue"]),88.0))
	check("visible KO result, provenance and receipt real",scene.battle["ko11_visible"].contains("AEGIS") and a["receipt"]["executors"].has("Kocodifying") and a["receipt"]["nativeExecutor"]=="Godot bounded decision-table")
	var d=scene.accept_ko_live()
	check("live contact respects cooldown",not d["applied"] and d["error"]=="RECOVERING")
	var tampered: Dictionary=scene.ko11_policy.duplicate(true)
	tampered["table"]["00"]="COUNTER"
	d=scene.accept_ko_live(tampered)
	check("caller modified rules denied without energy change",not d["applied"] and d["error"]=="POLICY_DRIFT" and is_equal_approx(float(scene.battle["energy"]["blue"]),88.0))
	begin()
	hero=launch("blue","dart",Vector2(448,216))
	hero["hp"]=40.0
	hero["shield"]=0.0
	scene.battle["energy"]["blue"]=100.0
	check("wounded blue changes runtime decision to TRIAGE",scene._ko11_choice(scene._ko11_facts())=="TRIAGE")
	a=scene.accept_ko_live()
	check("TRIAGE heals actual HP and spends 16 energy",a.get("action","")=="TRIAGE" and is_equal_approx(float(hero["hp"]),59.0) and float(hero["shield"])>=3.0 and is_equal_approx(float(scene.battle["energy"]["blue"]),84.0))
	begin()
	hero=launch("blue","dart",Vector2(448,216))
	var rival=launch("red","dart",Vector2(481,218))
	hero["hp"]=hero["maxhp"]
	rival["stun"]=0.0
	scene.battle["energy"]["blue"]=100.0
	check("live nearby red target switches policy to COUNTER",scene._ko11_choice(scene._ko11_facts())=="COUNTER")
	a=scene.accept_ko_live()
	check("COUNTER actually stuns nearby rival and spends 14",a.get("action","")=="COUNTER" and float(rival["stun"])>=1.8 and is_equal_approx(float(scene.battle["energy"]["blue"]),86.0))
	begin()
	hero=launch("blue","dart",Vector2(448,216))
	rival=launch("red","dart",Vector2(481,218))
	hero["hp"]=40.0
	check("when both live facts true, triage precedence comes from original policy",scene._ko11_choice(scene._ko11_facts())=="TRIAGE")
	begin()
	hero=launch("blue","dart",Vector2(448,216))
	scene.battle["energy"]["blue"]=0.0
	d=scene.accept_ko_live()
	check("insufficient energy holds and no native state mutation",not d.get("applied",false) and d.get("error","")=="KO_ENERGY_HOLD" and not scene.battle.has("ko11_return"))
	begin("CONVOY")
	d=scene.accept_ko_live()
	check("CONVOY gameplay protected",not d.get("applied",false) and d.get("error","")=="NOT_ACTIVE_SECTOR")
	begin("BEACON")
	d=scene.accept_ko_live()
	check("BEACON gameplay protected",not d.get("applied",false) and d.get("error","")=="NOT_ACTIVE_SECTOR")
	begin()
	scene.mode="result"
	scene._sync_native_rails()
	check("KO live and inherited rails hide on results screen",not scene.get_node("CooperationRail").visible and not scene.ko11_label.visible)
	var failed: int=checks.count(false)
	print("CP11 KO LIVE SUMMARY ",checks.size()-failed,"/",checks.size())
	quit(0 if failed==0 else 1)
