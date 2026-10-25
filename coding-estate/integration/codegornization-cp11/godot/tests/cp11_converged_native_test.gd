extends SceneTree
const SEAL=preload("res://KO11Seal.gd")
var scene
var checks: Array=[]
var returns: Array=[]
func check(label: String, ok: bool) -> void:
	checks.append(ok)
	print("CP11 CONVERGED ", "PASS " if ok else "FAIL ",label)
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
func capture(expected: String, cost: int) -> void:
	var r: Dictionary=scene.accept_ko_live()
	var receipt: Dictionary=r.get("receipt",{})
	check(expected+" accepted by actual native live recipient",bool(r.get("applied",false)) and r.get("action","")==expected)
	check(expected+" live receipt source-sealed and costs real energy",str(receipt.get("compiledPolicySHA256",""))==SEAL.POLICY_SHA and is_equal_approx(float(receipt.get("before",{}).get("energy",-1))-float(receipt.get("after",{}).get("energy",-1)),float(cost)))
	check(expected+" native record is in live battle recovery state",scene.battle.get("ko11_return",{})==receipt and int(receipt.get("index",0))==1)
	returns.append(receipt)
func run() -> void:
	scene=load("res://CP11ConvergedMain.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame
	check("inherits original CP10, live CP11 and gameplay routes",scene.has_method("accept_ko_contact") and scene.has_method("accept_ko_live") and scene.has_method("_cp9_special_step"))
	check("source compiled policy inherited untouched",not scene.ko11_policy.is_empty() and scene.ko11_policy.get("transportSHA256","")==SEAL.POLICY_SHA)
	check("trace is real added native control",scene.has_node("CooperationRail/KOTraceButton") and scene._buttons().has(scene.get_node("CooperationRail/KOTraceButton")))
	check("trace is hidden on menu",not scene.ko_trace_panel.visible)
	scene._fit_ko_trace(Vector2(400,850))
	check("Fold portrait trace fits",scene.ko_trace_panel.position.x>=0.0 and scene.ko_trace_panel.position.x+scene.ko_trace_panel.size.x<=400.0)
	scene._fit_ko_trace(Vector2(1050,620))
	check("Fold landscape trace fits",scene.ko_trace_panel.position.x>=0.0 and scene.ko_trace_panel.position.x+scene.ko_trace_panel.size.x<=1050.0)
	scene._fit_ko_trace(scene.get_viewport_rect().size)
	begin()
	scene._toggle_ko_trace()
	check("owner trace opens during match",scene.ko_trace_panel.visible)
	var before_text: String=scene._ko_trace_summary()
	check("trace distinguishes real roles and not-used-yet",before_text.contains("KOCODIFYING") and before_text.contains("CODIFYING") and before_text.contains("JMLOGIC") and before_text.contains("GODOT") and before_text.contains("NOT USED YET"))
	var blue=launch("blue",Vector2(448,216))
	blue["shield"]=0.0
	capture("AEGIS",12)
	check("AEGIS real shield consequence",float(blue["shield"])>=5.0)
	scene._sync_native_rails()
	var after_text: String=scene._ko_trace_summary()
	check("trace reflects actual return, not a label",after_text.contains("NATIVE RETURN RECORDED") and after_text.contains("ENERGY 100 → 88") and scene.ko_trace_label.text==after_text)
	begin()
	blue=launch("blue",Vector2(448,216))
	blue["hp"]=40.0
	capture("TRIAGE",16)
	check("TRIAGE real HP and shield consequence",is_equal_approx(float(blue["hp"]),59.0) and float(blue["shield"])>=3.0)
	begin()
	blue=launch("blue",Vector2(448,216))
	var red=launch("red",Vector2(481,218))
	blue["hp"]=blue["maxhp"]
	red["stun"]=0.0
	capture("COUNTER",14)
	check("COUNTER real enemy stun consequence",float(red["stun"])>=1.8)
	scene._toggle_ko_trace()
	check("trace closes without ending game",not scene.ko_trace_panel.visible and scene.mode=="playing")
	scene._toggle_ko_trace()
	var final_text: String=scene._ko_trace_summary()
	check("latest native returned result owner-visible",final_text.contains("COUNTER") and final_text.contains("ENERGY 100 → 86"))
	scene._finish()
	scene._sync_native_rails()
	check("inherited result mode hides native KO trace",scene.mode=="result" and not scene.ko_trace_panel.visible)
	var native_evidence={"schema":"jm.ko-converged-native-evidence/1",
		"compiledPolicySHA256":SEAL.POLICY_SHA,"policyTable":scene.ko11_policy.get("table",{}),
		"nativeReturns":returns,"traceBefore":before_text,"traceAfter":after_text,"traceFinal":final_text,
		"checks":checks.size(),"failures":checks.count(false),
		"host":"Godot native Linux, not Android physical owner device"}
	var output=ProjectSettings.globalize_path("res://").path_join("../evidence/cp11-converged-native-return.json")
	var f=FileAccess.open(output,FileAccess.WRITE)
	check("native returns written to independent verification artifact",f!=null)
	if f!=null:
		native_evidence["checks"]=checks.size()
		native_evidence["failures"]=checks.count(false)
		f.store_string(JSON.stringify(native_evidence))
		f.close()
	var failures=checks.count(false)
	print("CP11 CONVERGED SUMMARY ",checks.size()-failures,"/",checks.size())
	quit(0 if failures==0 else 1)
