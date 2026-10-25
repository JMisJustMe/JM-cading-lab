extends SceneTree
# Review UI is additive. Original 62-64 JS execution happens in separate
# CI Node qualification of actual native receipts, never in this Godot script.
var scene
var ok: int=0
var failed: int=0
func check(title: String,yes: bool) -> void:
	if yes:
		ok+=1
	else:
		failed+=1
		push_error("CP17 TEST FAIL "+title)
	print("CP17 ", "PASS " if yes else "FAIL ",title)
func _initialize() -> void:
	call_deferred("run")
func launch(team: String,p: Vector2) -> Dictionary:
	if not scene._launch(team,"dart",p):
		return {}
	var h: Dictionary=scene.battle["heroes"].back()
	h["x"]=p.x
	h["y"]=p.y
	scene._land(h)
	return h
func run() -> void:
	scene=load("res://CP17Main.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame
	check("inherits exact six-route source",scene.cp16_power.size()==3 and scene.cp15_routes.size()==3)
	check("inherits original KO and route contact",scene.has_method("accept_ko_live") and scene.has_method("accept_cp15_route") and scene.has_method("accept_cp16_route"))
	check("separate on-device audit touch",scene.cp17_audit_button is Button and scene.cp17_audit_button.name=="CP17LiveAudit")
	check("no false on-device qualification on menu",not scene.cp17_audit_button.visible and not scene.cp17_audit_text.visible)
	for viewport in [Vector2(400,850),Vector2(1050,620)]:
		scene._fit_cp17_deck(viewport)
		var deck=scene.cp15_dock
		check("native route deck fits screen "+str(viewport),deck.position.x>=0.0 and deck.position.y>=0.0 and deck.position.x+deck.size.x<=viewport.x and deck.position.y+deck.size.y<=viewport.y)
	scene._fit_cp17_deck(scene.get_viewport_rect().size)
	scene.start_battle("SECTOR")
	scene.set_process(false)
	var blue=launch("blue",Vector2(420,200))
	check("real hero deployed",not blue.is_empty())
	scene.battle["energy"]["blue"]=100.0
	scene.cp17_audit_button.pressed.emit()
	check("owner audit toggled",scene.cp17_audit_open and scene.cp17_audit_text.visible)
	check("before contact no invented native result",scene.cp17_review_summary().contains("NO ROUTE USED") and scene.cp17_review_summary().contains("UNREVIEWED"))
	scene.cp15_buttons["GUARD"].pressed.emit()
	var safe=scene.battle.get("cp15_return",{})
	check("safe contact still changes native battle",str(safe.get("schema",""))=="jm.jourmaze-player-native-return/1" and float(blue.get("shield",0))>=3.0 and is_equal_approx(float(scene.battle["energy"]["blue"]),92.0))
	var safe_text: String=scene.cp17_review_summary()
	check("safe receipt exact local provenance",safe_text.contains("BRACE") and safe_text.contains("92") and safe_text.contains("LOCAL SEAL: CHECKED"))
	check("owner live event is honestly not independently judged",safe_text.contains("THIS LIVE DEVICE EVENT: NOT INDEPENDENTLY JUDGED"))
	scene.battle["cp15_return"]["routePacketSHA256"]="0".repeat(64)
	check("forged local receipt HOLD",scene.cp17_review_summary().contains("LOCAL RECEIPT · HOLD"))
	scene.start_battle("SECTOR")
	scene.set_process(false)
	blue=launch("blue",Vector2(420,200))
	blue["shield"]=0.0
	scene.battle["energy"]["blue"]=100.0
	scene.cp16_toggle.pressed.emit()
	check("power toggle retained",scene.cp16_power_mode)
	scene.cp15_buttons["GUARD"].pressed.emit()
	var power=scene.battle.get("cp16_return",{})
	check("power contact still changes native battle",str(power.get("schema",""))=="jm.cp16-power-native-return/1" and float(blue["shield"])>=5.0 and is_equal_approx(float(scene.battle["energy"]["blue"]),88.0))
	check("power genuine contact is visibly reviewable",scene.cp17_review_summary().contains("HEAVY WARD") and scene.cp17_review_summary().contains("88"))
	scene.cp17_audit_button.pressed.emit()
	check("review closes without changing gameplay",not scene.cp17_audit_open and scene.mode=="playing")
	scene._finish()
	check("review surface respects result-screen privacy",not scene.cp17_audit_button.visible and not scene.cp17_audit_text.visible)
	print("CP17 NATIVE REVIEW SUMMARY ",ok,"/",ok+failed)
	quit(0 if failed==0 else 1)
