extends SceneTree
var scene
var checks=[]
func _initialize() -> void:call_deferred("run")
func check(name: String,ok: bool) -> void:
	checks.append({"name":name,"passed":ok})
	print("NATIVE DIRECTOR ","PASS " if ok else "FAIL ",name)
func packet() -> Dictionary:return JSON.parse_string(FileAccess.get_file_as_string("res://packets/guard_braid.json"))
func run() -> void:
	scene=load("res://CP03Main.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	scene.start_battle("BEACON")
	scene.set_process(false)
	check("cue requires two genuinely live distinct actors",not scene.accept_cue(packet(),1.0).get("applied",false))
	scene.pair_companions()
	check("actual original six-body pairs create two independent companions",scene.conducted_state()["revision"]==2 and scene.conducted_state()["agents"].size()==2)
	check("pair pays native four-record energy",is_equal_approx(scene.battle["energy"]["blue"],12.0))
	scene._launch("blue","bulwark",Vector2(550,351))
	# The launch needs energy; this fixture supplies energy explicitly to isolate healing.
	if scene.battle["heroes"].is_empty():
		scene.battle["energy"]["blue"]=100.0
		scene._launch("blue","bulwark",Vector2(550,351))
	var hero: Dictionary=scene.battle["heroes"][0]
	hero["flight"]={}
	hero["hp"]=50.0
	var bad=packet()
	bad["payloadSHA256"]="0".repeat(64)
	var before=JSON.stringify(scene.battle)
	check("altered cue bytes refuse before state mutation",not scene.accept_cue(bad,1.0).get("applied",false) and JSON.stringify(scene.battle)==before)
	check("short actual held input refuses before mutation",not scene.accept_cue(packet(),0.59).get("applied",false) and JSON.stringify(scene.battle)==before)
	var result: Dictionary=scene.accept_cue(packet(),0.8)
	check("real source-authored cue commits in native recipient",result.get("applied",false))
	scene.step_forms(0.05)
	check("native scheduler executes exact anchor phase",scene.battle["cue"]["next"]==1 and scene.battle["cue"]["events"][0]["verb"]=="anchor")
	var mid=FileAccess.open("res://../evidence/cue-mid-checkpoint.json",FileAccess.WRITE)
	scene._save_battle()
	mid.store_string(FileAccess.get_file_as_string(scene.SAVE_BATTLE))
	mid.close()
	scene.step_forms(0.45)
	check("ward has measurable healing beyond original autonomous pair",is_equal_approx(hero["hp"],58.0))
	scene.battle["cover"][0]["hp"]=20.0
	scene.step_forms(0.45)
	check("return repairs original native terrain",scene.battle["cover"][0]["hp"]>=26.0)
	check("all three source phases finish once",scene.battle["cue"]["complete"] and scene.battle["cue"]["events"].size()==3)
	before=JSON.stringify(scene.battle)
	check("duplicate choreography changes no state",not scene.accept_cue(packet(),1.0).get("applied",false) and JSON.stringify(scene.battle)==before)
	scene._save_battle()
	scene.battle={}
	scene.resume_battle()
	scene.set_process(false)
	check("original save returns completed cue and idempotency",scene.battle["cue"]["complete"] and scene.battle["cue_history"].has("guard_braid"))
	scene.start_battle("BEACON")
	scene.set_process(false)
	var pair: Vector2=scene.get_node("CooperationRail").get_child(0).get_global_rect().get_center()
	var braid: Vector2=scene.get_node("CooperationRail").get_child(1).get_global_rect().get_center()
	for down in [true,false]:
		var e=InputEventScreenTouch.new()
		e.index=8
		e.position=pair
		e.pressed=down
		root.push_input(e,true)
	check("native PAIR touchscreen route spends real energy",scene.conducted_state()["revision"]==2 and is_equal_approx(scene.battle["energy"]["blue"],12.0))
	var press=InputEventScreenTouch.new()
	press.index=9
	press.position=braid
	press.pressed=true
	root.push_input(press,true)
	var release=press.duplicate()
	release.pressed=false
	root.push_input(release,true)
	check("short touchscreen BRAID cannot bypass source hold",not scene.battle.has("cue"))
	root.push_input(press,true)
	var hold_start=Time.get_ticks_msec()
	while Time.get_ticks_msec()-hold_start<700:
		await process_frame
	root.push_input(release,true)
	print("HELD TOUCH ",scene.measured_hold," ",scene.contact_label.text," ",scene.battle["energy"]["blue"])
	check("actual timed native touch admits held source choreography",scene.battle.has("cue") and is_equal_approx(scene.battle["energy"]["blue"],8.0))
	var failed=checks.filter(func(c):return not c["passed"])
	var f=FileAccess.open("res://../evidence/native-director-tests.json",FileAccess.WRITE)
	f.store_string(JSON.stringify({"scope":"actual Godot Linux typed-cue adapter, original companions, healing/terrain and persisted phase; energy explicitly supplied only if fixture launch requires it","passed":checks.size()-failed.size(),"total":checks.size(),"checks":checks},"  "))
	f.close()
	quit(0 if failed.is_empty() else 1)
