extends SceneTree
const SEAL = preload("res://CP15Seal.gd")
var scene
var checks: Array=[]
var returns: Array=[]
func check(label: String, ok: bool) -> void:
	checks.append(ok)
	print("CP15 PLAYER ", "PASS " if ok else "FAIL ",label)
func _initialize() -> void:
	call_deferred("run")
func begin() -> void:
	scene.start_battle("SECTOR")
	scene.set_process(false)
	scene.battle["energy"]["blue"]=100.0
	scene.battle["energy"]["red"]=100.0
func launch(team: String,pos: Vector2) -> Dictionary:
	if not scene._launch(team,"dart",pos):
		return {}
	var h: Dictionary=scene.battle["heroes"].back()
	h["x"]=pos.x
	h["y"]=pos.y
	scene._land(h)
	return h
func snap(action: String,cost: float) -> Dictionary:
	scene.battle["energy"]["blue"]=100.0
	var applied=scene.accept_cp15_route(action)
	var receipt: Dictionary=applied.get("receipt",{})
	check(action+" truly applies from native player route",bool(applied.get("applied",false)) and str(applied.get("route",""))==action)
	check(action+" has truthful native energy spend",is_equal_approx(float(scene.battle["energy"]["blue"]),100.0-cost) and is_equal_approx(float(receipt.get("before",{}).get("energy",-1))-float(receipt.get("after",{}).get("energy",-1)),cost))
	check(action+" source-bound Godot return persisted",str(receipt.get("routePacketSHA256",""))==SEAL.PACKET_SHA and str(receipt.get("originalJourMazeSHA256",""))==SEAL.JOURMAZE_SHA and scene.battle.get("cp15_return",{})==receipt)
	returns.append(receipt)
	return receipt
func run() -> void:
	scene=load("res://CP15Main.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame
	check("original CP11 native live gameplay and trace survived",scene.has_method("accept_ko_live") and scene.has_method("_toggle_ko_trace") and scene.has_method("accept_ko_contact"))
	check("exact JourMaze sealed packet loaded",scene.cp15_routes.size()==3 and SEAL.JOURMAZE_SHA=="56c5ff4f76a222eb32d6b01d955ed0fe45d5389e5c14cba12f8e7618157545db")
	check("route deck exists as native UI with three actual buttons",scene.has_node("JMRouteDeck") and scene.cp15_buttons.size()==3 and scene.cp15_buttons["GUARD"] is Button)
	check("menu does not present live route contact",not scene.cp15_dock.visible)
	scene._fit_cp15_deck(Vector2(400,850))
	check("Fold portrait route deck fits viewport",scene.cp15_dock.position.x>=0.0 and scene.cp15_dock.position.x+scene.cp15_dock.size.x<=400.0 and scene.cp15_dock.position.y+scene.cp15_dock.size.y<=850.0)
	scene._fit_cp15_deck(Vector2(1050,620))
	check("Fold landscape route deck fits viewport",scene.cp15_dock.position.x>=0.0 and scene.cp15_dock.position.x+scene.cp15_dock.size.x<=1050.0 and scene.cp15_dock.position.y+scene.cp15_dock.size.y<=620.0)
	scene._fit_cp15_deck(scene.get_viewport_rect().size)
	begin()
	check("zero blue champions cannot force route",not scene.accept_cp15_route("GUARD").get("applied",false))
	var blue=launch("blue",Vector2(448,216))
	check("native blue champion launched and grounded",not blue.is_empty() and blue["flight"].is_empty())
	blue["shield"]=0.0
	scene.battle["energy"]["blue"]=100.0
	scene._sync_native_rails()
	check("route deck visible in match and BRACE button actually actionable",scene.cp15_dock.visible and not scene.cp15_buttons["GUARD"].disabled and scene.cp15_buttons["RECOVER"].disabled and scene.cp15_buttons["INTERCEPT"].disabled)
	scene.cp15_buttons["GUARD"].pressed.emit()
	var guard: Dictionary=scene.battle.get("cp15_return",{})
	check("physical-button signal spent 8 energy and shielded ally",guard.get("selected","")=="GUARD" and is_equal_approx(float(scene.battle["energy"]["blue"]),92.0) and is_equal_approx(float(blue["shield"]),3.0))
	check("touch result has game consequence displayed",str(scene.cp15_notice.text).contains("BRACE") and str(guard.get("variant",""))=="BRACE")
	check("original KO live policy still independently works",not scene.ko11_policy.is_empty())
	var previous: Dictionary=guard.duplicate(true)
	scene.battle["energy"]["blue"]=100.0
	var old_ko=scene.accept_ko_live()
	check("original KO native auto action preserved, not replaced",bool(old_ko.get("applied",false)) and str(old_ko.get("action",""))=="AEGIS" and float(blue["shield"])>=5.0)
	check("KO and JourMaze maintain separate native return state",scene.battle.get("cp15_return",{})==previous and scene.battle.has("ko11_return"))
	var before_duplicate: float=float(scene.battle["energy"]["blue"])
	var held=scene.accept_cp15_route("GUARD")
	check("cooldown prevents rapid duplicate touch cost",not held.get("applied",false) and str(held.get("error",""))=="RECOVERING" and is_equal_approx(before_duplicate,float(scene.battle["energy"]["blue"])))
	begin()
	blue=launch("blue",Vector2(448,216))
	blue["hp"]=40.0
	blue["shield"]=0.0
	var heal=snap("RECOVER",9.0)
	check("RALLY makes actual grounded injured hero recover",is_equal_approx(float(blue["hp"]),52.0) and heal.get("variant","")=="RALLY" and heal["after"]["targets"][0]["hp"]==52.0)
	begin()
	blue=launch("blue",Vector2(448,216))
	var red=launch("red",Vector2(481,218))
	red["stun"]=0.0
	var pre_hp:float=float(red["hp"])
	var press=snap("INTERCEPT",10.0)
	check("TRAP performs real native red HP damage AND stun",is_equal_approx(float(red["hp"]),pre_hp-4.0) and float(red["stun"])>=1.25 and press.get("variant","")=="TRAP")
	begin()
	blue=launch("blue",Vector2(448,216))
	var wrong=scene.accept_cp15_route("INTERCEPT")
	check("TRAP rejects missing nearby grounded rival without spending energy",not wrong.get("applied",false) and wrong.get("error","")=="NO NEARBY RIVAL" and float(scene.battle["energy"]["blue"])<=100.0)
	scene.battle["energy"]["blue"]=2.0
	wrong=scene.accept_cp15_route("GUARD")
	check("route refuses insufficient live energy",not wrong.get("applied",false) and wrong.get("error","")=="ENERGY LOW")
	scene.battle["energy"]["blue"]=100.0
	wrong=scene.accept_cp15_route("RECOVER")
	check("RALLY rejects uninjured actor",not wrong.get("applied",false) and wrong.get("error","")=="NO INJURED ALLY")
	wrong=scene.accept_cp15_route("BOGUS")
	check("undefined route fails closed",not wrong.get("applied",false) and wrong.get("error","")=="ROUTE NOT SEALED")
	scene.mode="result"
	wrong=scene.accept_cp15_route("GUARD")
	check("result mode cannot apply battle changes",not wrong.get("applied",false) and wrong.get("error","")=="SECTOR ONLY")
	scene._sync_native_rails()
	check("route deck hides when match ends",not scene.cp15_dock.visible)
	# Emitting an action does not assert Samsung owner touch; this is native
	# Godot event routing and gameplay state, not physical Fold acceptance.
	var written={"schema":"jm.cp15-player-native-proof/1","host":"Godot headless Linux native","originalJourMazeSHA256":SEAL.JOURMAZE_SHA,
		"nativePlayerRouteReturns":returns,"buttonSignal":"pressed.emit was wired to the same handler as real touch",
		"checks":checks.size(),"failures":checks.count(false),"ownerFoldPhysicalContact":false}
	var file=FileAccess.open(ProjectSettings.globalize_path("res://").path_join("../evidence/cp15-player-native.json"),FileAccess.WRITE)
	check("actual native proof was written to receipt artifact",file!=null)
	if file!=null:
		written["checks"]=checks.size()
		written["failures"]=checks.count(false)
		file.store_string(JSON.stringify(written))
		file.close()
	var failed:int=checks.count(false)
	print("CP15 PLAYER SUMMARY ",checks.size()-failed,"/",checks.size())
	quit(0 if failed==0 else 1)
