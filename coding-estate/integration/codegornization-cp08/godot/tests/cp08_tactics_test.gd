extends SceneTree
const TACTICS = preload("res://CP08Tactics.gd")
var checks: Array = []

func check(label: String, ok: bool) -> void:
	checks.append(ok)
	print("CP08 TACTICS ", "PASS " if ok else "FAIL ",label)

func _initialize() -> void:
	call_deferred("run")

func run() -> void:
	var zones = [
		{"id":"RIDGE","x":448.0,"y":216.0,"r":79.0,"owner":"blue","control":70.0},
		{"id":"CROSSROADS","x":608.0,"y":351.0,"r":91.0,"owner":"red","control":-40.0},
		{"id":"SUPPLY","x":755.0,"y":488.0,"r":79.0,"owner":"blue","control":30.0}
	]
	var heroes = [
		{"team":"blue","x":448.0,"y":216.0,"hp":100.0,"maxhp":100.0,"leaving":false,"flight":{}},
		{"team":"blue","x":461.0,"y":230.0,"hp":100.0,"maxhp":100.0,"leaving":false,"flight":{}},
		{"team":"red","x":608.0,"y":351.0,"hp":20.0,"maxhp":100.0,"leaving":false,"flight":{}}
	]
	check("bulwark breaks defended ridge",TACTICS.choose(zones,heroes,"bulwark")["zone"]=="RIDGE")
	check("dart flanks unguarded supply",TACTICS.choose(zones,heroes,"dart")["zone"]=="SUPPLY")
	check("warden aids wounded ally at crossroads",TACTICS.choose(zones,heroes,"warden")["zone"]=="CROSSROADS")
	check("unsupported type holds",TACTICS.choose(zones,heroes,"invented")["directive"]=="HOLD")
	check("empty zones holds",TACTICS.choose([],heroes,"dart")["zone"]=="")
	check("deterministic replay",JSON.stringify(TACTICS.choose(zones,heroes,"dart"))==JSON.stringify(TACTICS.choose(zones,heroes,"dart")))
	var before: String = JSON.stringify(zones) + JSON.stringify(heroes)
	TACTICS.choose(zones,heroes,"warden")
	check("pure policy does not mutate evidence inputs",before==JSON.stringify(zones)+JSON.stringify(heroes))
	var scene = load("res://CP08Main.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame
	scene.start_battle("SECTOR")
	scene.set_process(false)
	scene.next_enemy=0.0
	scene.battle["energy"]["red"]=100.0
	var prior: int = scene.battle["heroes"].size()
	scene._enemy_step(0.2)
	check("inherited rival actually spawns",scene.battle["heroes"].size()==prior+1)
	var rival: Dictionary = scene.battle["heroes"].back()
	check("actual spawned rival receives tactical order",not str(rival.get("order","")).is_empty() and str(rival.get("cp8_directive","")).length()>0)
	check("tactical HUD reflects real order",str(scene.battle.get("enemy_plan","")).contains(str(rival.get("order",""))) and scene.cp8_label.text==scene.battle["enemy_plan"])
	check("native scene preserves original touch ownership",scene.has_method("_input") and scene.has_method("accept_cue"))
	# Gemini CP8 review CP8-DEFECT-001: prove intended destination survives
	# real inherited landing + results in movement, not just spawn-frame assignment.
	# Exercise an actual originally spawned rival with complete native fields.
	rival["type"]="dart"
	rival["x"]=448.0
	rival["y"]=216.0 # MID-ROUTE RIDGE touchdown, not requested SUPPLY
	rival["order"]="SUPPLY"
	rival["cp8_directive"]="FLANK_UNGUARDED"
	var ridge: Dictionary=scene.battle["zones"][0]
	var control_before: float=float(ridge["control"])
	scene._land(rival)
	check("CP8 red tactical destination survives intermediate landing",str(rival.get("order",""))=="SUPPLY")
	check("inherited intermediate landing still captures Ridge",rival["flight"].is_empty() and float(ridge["control"])<control_before)
	var distance_before: float=Vector2(float(rival["x"]),float(rival["y"])).distance_to(Vector2(755.0,488.0))
	scene._combat_step(0.25)
	check("CP8 rival actually advances toward intended distant zone",Vector2(float(rival["x"]),float(rival["y"])).distance_to(Vector2(755.0,488.0))<distance_before)
	# Untagged native champion continues inheriting ordinary landing order.
	scene.start_battle("SECTOR")
	scene.set_process(false)
	var basic: bool=scene._launch("red","dart",Vector2(448.0,216.0))
	check("original untagged red dart launches for landing control",basic)
	if basic:
		var plain: Dictionary=scene.battle["heroes"].back()
		plain["x"]=448.0
		plain["y"]=216.0
		plain["order"]="SUPPLY"
		scene._land(plain)
		check("untagged champion retains original Ridge landing rule",str(plain.get("order",""))=="RIDGE")
	else:
		check("untagged champion retains original Ridge landing rule",false)
	scene.start_battle("BEACON")
	scene.set_process(false)
	scene.next_enemy=0.0
	prior=scene.battle["heroes"].size()
	scene._enemy_step(0.2)
	check("beacon uses inherited waves without sector raider",scene.battle["heroes"].size()==prior)
	var failed: int=checks.count(false)
	print("CP08 TACTICS SUMMARY ",checks.size()-failed,"/",checks.size())
	quit(0 if failed==0 else 1)
