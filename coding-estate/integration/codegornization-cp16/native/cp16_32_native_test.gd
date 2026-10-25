extends SceneTree
# One independent Godot process per CP16_RUN_INDEX 0..31, each tests
# all SIX native player-button routes and bound state/effect, plus holds.
const SEAL=preload("res://CP16Seal.gd")
var scene
var passed: int=0
var failed: int=0
var cases: Array=[]
func check(name: String,ok: bool) -> void:
	if ok:
		passed+=1
	else:
		failed+=1
		push_error("CP16 TEST FAIL "+name)
	print("CP16 ASSERT ", "PASS " if ok else "FAIL ",name)
func _initialize() -> void:
	call_deferred("run")
func launch(team: String,pos: Vector2) -> Dictionary:
	if not scene._launch(team,"dart",pos):
		return {}
	var hero: Dictionary=scene.battle["heroes"].back()
	hero["x"]=pos.x
	hero["y"]=pos.y
	scene._land(hero)
	return hero
func scenario(action: String,power: bool,index: int) -> void:
	scene.start_battle("SECTOR")
	scene.set_process(false)
	scene.cp16_power_mode=false
	# Vary the real native actor location and injury in every independent run.
	var place=Vector2(368.0+float(index%13)*9.0,192.0+float(index%7)*7.0)
	var ally=launch("blue",place)
	if ally.is_empty():
		check("real blue launch",false)
		return
	ally["shield"]=0.0
	ally["hp"]=float(33+index%10) if action=="RECOVER" else float(ally["maxhp"])
	var red: Dictionary={}
	if action=="INTERCEPT":
		red=launch("red",place+Vector2(34,18))
		if red.is_empty():
			check("real red launch",false)
			return
		red["stun"]=0.0
		scene.battle["energy"]["red"]=100.0
	scene.battle["energy"]["blue"]=100.0
	if power:
		scene.cp16_toggle.pressed.emit()
	else:
		scene._sync_native_rails()
	check(action+(" POWER" if power else " SAFE")+" real touch target enabled",not scene.cp15_buttons[action].disabled)
	var before_hp: float=float(red["hp"]) if action=="INTERCEPT" else float(ally["hp"])
	var prior: float=float(scene.battle["energy"]["blue"])
	scene.cp15_buttons[action].pressed.emit()
	var receipt: Dictionary=scene.battle.get("cp16_return",{}) if power else scene.battle.get("cp15_return",{})
	var cost: float=0.0
	var variant: String=""
	match action:
		"GUARD":
			cost=12.0 if power else 8.0
			variant="HEAVY WARD" if power else "BRACE"
			check("shield actual effect "+variant,is_equal_approx(float(ally["shield"]),5.0 if power else 3.0))
		"RECOVER":
			cost=14.0 if power else 9.0
			variant="SURGE HEAL" if power else "RALLY"
			check("actual heal "+variant,is_equal_approx(float(ally["hp"]),minf(float(ally["maxhp"]),before_hp+(19.0 if power else 12.0))))
		"INTERCEPT":
			cost=17.0 if power else 10.0
			variant="DIVE" if power else "TRAP"
			check("actual stun "+variant,is_equal_approx(float(red["stun"]),1.8 if power else 1.25))
			check("actual rival damage "+variant,is_equal_approx(float(red["hp"]),before_hp-(5.0 if power else 4.0)))
	check("actual energy consumption "+variant,is_equal_approx(float(scene.battle["energy"]["blue"]),prior-cost))
	check("native receipt exact source "+variant,
		str(receipt.get("variant",""))==variant and
		str(receipt.get("originalJourMazeSHA256",""))==SEAL.ORIGINAL_JOURMAZE_SHA and
		is_equal_approx(float(receipt.get("before",{}).get("energy",-1.0))-float(receipt.get("after",{}).get("energy",-1.0)),cost))
	if power:
		check("power sealed separate from CP15",str(receipt.get("routePacketSHA256",""))==SEAL.PACKET_SHA and scene.battle.get("cp16_return",{})==receipt and str(receipt.get("schema",""))=="jm.cp16-power-native-return/1")
	else:
		check("safe exact CP15 remains independent",str(receipt.get("routePacketSHA256",""))==SEAL.CP15_PACKET_SHA and scene.battle.get("cp15_return",{})==receipt and str(receipt.get("schema",""))=="jm.jourmaze-player-native-return/1")
	var after: float=float(scene.battle["energy"]["blue"])
	var held: Dictionary=scene.accept_cp16_route(action)
	check("shared native cooldown prevents rapid duplicate "+variant,not bool(held.get("applied",false)) and str(held.get("error",""))=="RECOVERING" and is_equal_approx(float(scene.battle["energy"]["blue"]),after))
	cases.append({"action":action,"power":power,"variant":variant,"receipt":receipt})
func run() -> void:
	var index=int(OS.get_environment("CP16_RUN_INDEX"))
	var raw_index=OS.get_environment("CP16_RUN_INDEX")
	if raw_index.is_empty() or index<0 or index>=32:
		push_error("CP16_RUN_INDEX_0_TO_31_REQUIRED")
		quit(1)
		return
	scene=load("res://CP16Main.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame
	check("original sources inherited",scene.has_method("accept_ko_live") and scene.has_method("accept_cp15_route") and scene.has_method("_toggle_ko_trace"))
	check("original JourMaze exact donor",SEAL.ORIGINAL_JOURMAZE_SHA=="56c5ff4f76a222eb32d6b01d955ed0fe45d5389e5c14cba12f8e7618157545db")
	check("exact three power routes parsed",scene.cp16_power.size()==3)
	check("actual native mode control",scene.cp16_toggle is Button and scene.cp16_toggle.name=="RouteModeToggle")
	check("menu keeps deck hidden",not scene.cp15_dock.visible)
	scene._fit_cp16_deck(Vector2(400,850))
	check("portrait full route mode deck fits",scene.cp15_dock.position.x>=0.0 and scene.cp15_dock.position.x+scene.cp15_dock.size.x<=400.0 and scene.cp15_dock.position.y+scene.cp15_dock.size.y<=850.0)
	scene._fit_cp16_deck(Vector2(1050,620))
	check("landscape full route mode deck fits",scene.cp15_dock.position.x>=0.0 and scene.cp15_dock.position.x+scene.cp15_dock.size.x<=1050.0 and scene.cp15_dock.position.y+scene.cp15_dock.size.y<=620.0)
	scene._fit_cp16_deck(scene.get_viewport_rect().size)
	for action in ["GUARD","RECOVER","INTERCEPT"]:
		scenario(action,false,index)
		scenario(action,true,index)
	# Test live power energy denial after target exists, without spending anything.
	scene.start_battle("SECTOR")
	scene.set_process(false)
	var ally=launch("blue",Vector2(445,216))
	scene.battle["energy"]["blue"]=9.0
	scene.cp16_power_mode=false
	scene.cp16_toggle.pressed.emit()
	check("power mode activated by native button",scene.cp16_power_mode and str(scene.cp16_toggle.text).contains("POWER"))
	var refused: Dictionary=scene.accept_cp16_route("GUARD")
	check("power cost fails closed",not bool(refused.get("applied",false)) and str(refused.get("error",""))=="POWER ENERGY LOW" and is_equal_approx(float(scene.battle["energy"]["blue"]),9.0))
	check("power action disabled when affordable SAFE would otherwise pass",scene.cp15_buttons["GUARD"].disabled)
	scene.cp16_toggle.pressed.emit()
	check("safe mode restores without match restart",not scene.cp16_power_mode and not scene.cp15_buttons["GUARD"].disabled)
	refused=scene.accept_cp16_route("BOGUS")
	check("invalid action held",not bool(refused.get("applied",false)))
	scene._finish()
	scene._sync_native_rails()
	check("routes cannot fire on result screen",not bool(scene.accept_cp16_route("GUARD").get("applied",false)))
	check("deck hidden on result",not scene.cp15_dock.visible)
	var output=OS.get_environment("CP16_EVIDENCE_DIR")
	if output.is_empty() or not output.is_absolute_path():
		push_error("CP16_EVIDENCE_DIR_ABSOLUTE_PATH_REQUIRED")
		quit(1)
		return
	DirAccess.make_dir_recursive_absolute(output)
	var suffix=("%02d" % index)
	var f=FileAccess.open(output.path_join("run-"+suffix+".json"),FileAccess.WRITE)
	check("native independent receipt file",f!=null)
	if f!=null:
		f.store_string(JSON.stringify({"schema":"jm.cp16-native-32-run/1","runIndex":index,"passed":passed+0,"failed":failed,"cases":cases,"engine":Engine.get_version_info()["string"],"host":OS.get_name(),"ownerFoldPhysicalTest":false}))
		f.close()
	print("CP16 RUN ",index," SUMMARY ",passed,"/",passed+failed," CASES ",cases.size())
	quit(0 if failed==0 and cases.size()==6 else 1)
