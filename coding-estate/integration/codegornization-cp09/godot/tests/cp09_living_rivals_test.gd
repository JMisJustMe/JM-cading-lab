extends SceneTree
var checks: Array = []
var scene

func check(name: String, ok: bool) -> void:
	checks.append(ok)
	print("CP09 LIVING ", "PASS " if ok else "FAIL ",name)

func _initialize() -> void:
	call_deferred("run")

func begin(variant: String = "SECTOR") -> void:
	scene.start_battle(variant)
	scene.set_process(false)
	scene.battle["energy"]["red"]=100.0
	scene.battle["energy"]["blue"]=100.0

func spawn(team: String, kind: String, position: Vector2) -> Dictionary:
	if not scene._launch(team,kind,position):
		return {}
	var hero: Dictionary=scene.battle["heroes"].back()
	hero["flight"]={}
	hero["x"]=position.x
	hero["y"]=position.y
	if team=="red":
		hero["cp8_directive"]="TEST_ROLE"
		hero["order"]="CROSSROADS"
	return hero

func run() -> void:
	scene=load("res://CP09Main.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame
	check("CP09 inherits CP08/CP03 native controls",scene.has_method("_land") and scene.has_method("accept_cue") and scene.has_method("pair_companions"))
	check("native FORM controls hidden on initial menu",not scene.get_node("ConductRail").visible and not scene.get_node("CooperationRail").visible and not scene.contact_panel.visible)
	begin()
	scene._sync_native_rails()
	check("FORM controls appear during active match",scene.get_node("ConductRail").visible and scene.get_node("CooperationRail").visible and scene.contact_panel.visible)
	scene.mode="result"
	scene._sync_native_rails()
	check("victory screen hides CP03 and rival overlay rails",not scene.get_node("ConductRail").visible and not scene.get_node("CooperationRail").visible and not scene.contact_panel.visible and not scene.cp8_label.visible and not scene.cp9_intel.visible)
	scene.mode="playing"
	scene._sync_native_rails()
	check("controls return after reentry",scene.get_node("ConductRail").visible and scene.cp9_intel.visible)
	begin()
	var bulwark: Dictionary=spawn("red","bulwark",Vector2(608,351))
	var player: Dictionary=spawn("blue","dart",Vector2(647,356))
	check("genuine native role entities launched",not bulwark.is_empty() and not player.is_empty())
	bulwark["shield"]=0.0
	scene._cp9_special_step(0.2)
	check("Bulwark frontline brace changes shield state",float(bulwark["shield"])>=3.2)
	var event_count: int=int(scene.battle.get("cp9_events",0))
	scene._cp9_special_step(0.2)
	check("Bulwark brace cooldown prevents stacking",int(scene.battle.get("cp9_events",0))==event_count)
	begin()
	var dart: Dictionary=spawn("red","dart",Vector2(755,488))
	player=spawn("blue","bulwark",Vector2(755,482))
	dart["order"]="SUPPLY"
	var zone: Dictionary=scene.battle["zones"][2]
	zone["owner"]="blue"
	zone["control"]=70.0
	scene._cp9_special_step(0.1)
	check("nearby blue defender counters Dart sabotage",is_equal_approx(float(zone["control"]),70.0) and str(scene.battle.get("cp9_last","")).contains("COUNTERED"))
	player["x"]=300.0
	player["y"]=100.0
	dart["cp9_cooldown"]=0.0
	scene._cp9_special_step(0.1)
	check("Dart sabotage changes actual contested zone control",is_equal_approx(float(zone["control"]),56.0))
	event_count=int(scene.battle.get("cp9_events",0))
	scene._cp9_special_step(0.1)
	check("Dart cannot repeat sabotage before recovery",int(scene.battle.get("cp9_events",0))==event_count and is_equal_approx(float(zone["control"]),56.0))
	begin()
	var warden: Dictionary=spawn("red","warden",Vector2(608,351))
	bulwark=spawn("red","bulwark",Vector2(632,351))
	bulwark["hp"]=48.0
	bulwark["shield"]=0.0
	scene._cp9_special_step(0.2)
	check("Warden triage repairs injured red ally",is_equal_approx(float(bulwark["hp"]),65.0) and float(bulwark["shield"])>=2.2)
	check("Warden healing has a true cooldown",float(warden.get("cp9_cooldown",0.0))>=7.0)
	begin()
	dart=spawn("red","dart",Vector2(608,351))
	dart["order"]="RIDGE"
	for z in scene.battle["zones"]:
		z["owner"]="neutral"
		z["control"]=0.0
	zone=scene.battle["zones"][2]
	zone["owner"]="blue"
	zone["control"]=70.0
	scene._cp9_rethink()
	check("living rival retargets after world pressure changes",str(dart["order"])=="SUPPLY")
	check("reroute visibly records source-backed action",str(scene.battle.get("cp9_last","")).contains("REROUTE"))
	begin()
	bulwark=spawn("red","bulwark",Vector2(608,351))
	player=spawn("blue","dart",Vector2(647,356))
	bulwark["shield"]=0.0
	scene._combat_step(0.02)
	check("normal native combat reaches role-special logic",float(bulwark["shield"])>=3.0)
	begin("CONVOY")
	scene._cp9_special_step(0.2)
	scene._cp9_rethink()
	check("CONVOY remains wholly inherited",not scene.battle.has("cp9_events"))
	begin("BEACON")
	scene._cp9_special_step(0.2)
	scene._cp9_rethink()
	check("BEACON remains wholly inherited",not scene.battle.has("cp9_events"))
	var fails: int=checks.count(false)
	print("CP09 LIVING SUMMARY ",checks.size()-fails,"/",checks.size())
	quit(0 if fails==0 else 1)
