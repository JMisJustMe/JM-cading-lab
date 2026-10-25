extends SceneTree
## CP13 — one independent headless Godot process per JM_SWEEP_INDEX.
## 32 runs = eight varied live game contexts x four actual KO fact combinations.
## Donor JS is NOT executed in Godot; this file returns authentic Godot game state.
const SEAL=preload("res://KO11Seal.gd")
var scene
var checks: Array=[]
func check(label: String, ok: bool) -> void:
	checks.append(ok)
	print("JM CP13 NATIVE ", "PASS " if ok else "FAIL ",label)
func abort(reason: String) -> void:
	push_error("CP13 NATIVE HOLD "+reason)
	print("CP13 NATIVE HOLD "+reason)
	quit(1)
func _initialize() -> void:
	call_deferred("run")
func launch(team: String,position: Vector2) -> Dictionary:
	if not scene._launch(team,"dart",position):
		return {}
	var h: Dictionary=scene.battle["heroes"].back()
	h["x"]=position.x
	h["y"]=position.y
	scene._land(h)
	return h
func run() -> void:
	var index_text: String=OS.get_environment("JM_SWEEP_INDEX")
	var output: String=OS.get_environment("JM_SWEEP_OUT")
	if not index_text.is_valid_int() or not output.is_absolute_path():
		abort("REQUIRES_EXPLICIT_INDEX_AND_ABSOLUTE_OUTPUT")
		return
	var index: int=int(index_text)
	if index<0 or index>=32:
		abort("INDEX_OUTSIDE_0_TO_31")
		return
	var variant: int=index/4
	var case_id: int=index%4
	var wounded: bool=case_id>=2
	var enemy_near: bool=case_id%2==1
	var expected: String="TRIAGE" if wounded else ("COUNTER" if enemy_near else "AEGIS")
	scene=load("res://CP11ConvergedMain.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame
	check("original CP11 game and contact methods inherited",scene.has_method("accept_ko_live") and scene.has_method("accept_ko_contact") and scene.has_method("_launch"))
	check("original sourced policy sealed and available",not scene.ko11_policy.is_empty() and scene.ko11_policy.get("transportSHA256","")==SEAL.POLICY_SHA)
	check("owner-facing native trace button inherited",scene.has_node("CooperationRail/KOTraceButton"))
	scene.start_battle("SECTOR")
	scene.set_process(false)
	var pos: Vector2=Vector2(390+variant*12,177+variant*8)
	var blue: Dictionary=launch("blue",pos)
	if blue.is_empty():
		abort("BLUE_LAUNCH_FAILED")
		return
	blue["shield"]=0.0
	blue["hp"]=float(blue["maxhp"])-float(25+variant) if wounded else float(blue["maxhp"])
	var red: Dictionary={}
	if enemy_near:
		red=launch("red",pos+Vector2(28+variant,8))
		if red.is_empty():
			abort("RED_LAUNCH_FAILED")
			return
		red["stun"]=0.0
	# Launch is real gameplay and spends energy. Normalise at CONTACT only.
	scene.battle["energy"]["blue"]=100.0
	scene.battle["elapsed"]=float(variant)*0.17
	var facts: Dictionary=scene._ko11_facts()
	check("live battlefield wound fact matches actual blue HP",bool(facts.get("wounded",false))==wounded)
	check("live battlefield enemy proximity matches actual red hero",bool(facts.get("enemy_near",false))==enemy_near)
	check("source JMLogic-derived policy chooses correct live branch",scene._ko11_choice(facts)==expected)
	scene._toggle_ko_trace()
	check("owner trace opens during active gameplay",scene.ko_trace_panel.visible)
	var before_trace: String=scene._ko_trace_summary()
	check("native trace records no fictional pre-contact effect",before_trace.contains("NOT USED YET") and not before_trace.contains("NATIVE RETURN RECORDED"))
	var accepted: Dictionary=scene.accept_ko_live()
	check("real native KO effect committed",bool(accepted.get("applied",false)) and str(accepted.get("action",""))==expected)
	var receipt: Dictionary=accepted.get("receipt",{})
	if receipt.is_empty():
		abort("MISSING_TRUE_NATIVE_RETURN")
		return
	var spec: Dictionary=scene.ko11_policy["actions"][expected]
	var cost: float=float(spec.get("cost",-1))
	check("real energy change and correct returned cost",is_equal_approx(float(scene.battle["energy"]["blue"]),100.0-cost) and is_equal_approx(float(receipt["before"]["energy"])-float(receipt["after"]["energy"]),cost))
	check("native return is source-sealed",str(receipt.get("compiledPolicySHA256",""))==SEAL.POLICY_SHA and not bool(receipt.get("historicalOriginal",true)))
	check("real current battle persisted before/after return",scene.battle.get("ko11_return",{})==receipt and int(scene.battle.get("ko11_count",0))==1)
	check("real recipient retains separate identities",receipt.get("identities",{})==scene.ko11_policy.get("identities",{}))
	var effect_ok: bool=false
	if expected=="AEGIS":
		effect_ok=float(blue["shield"])>=5.0 and receipt["after"]["targets"].size()>=1
	elif expected=="TRIAGE":
		effect_ok=float(blue["hp"])>float(receipt["before"]["targets"][0]["hp"]) and float(blue["shield"])>=3.0
	elif expected=="COUNTER":
		effect_ok=float(red["stun"])>=1.8 and receipt["after"]["targets"].size()>=1
	check("selected actual native shield/heal/stun consequence occurred",effect_ok)
	var budget_after: float=float(scene.battle["energy"]["blue"])
	var tamper: Dictionary=scene.ko11_policy.duplicate(true)
	tamper["table"]["00"]="COUNTER" if expected!="COUNTER" else "TRIAGE"
	var denied: Dictionary=scene.accept_ko_live(tamper)
	check("caller-modified policy rejected without state mutation",not bool(denied.get("applied",false)) and str(denied.get("error",""))=="POLICY_DRIFT" and is_equal_approx(float(scene.battle["energy"]["blue"]),budget_after))
	var duplicate: Dictionary=scene.accept_ko_live()
	check("same-frame repeat contact held",not bool(duplicate.get("applied",false)) and is_equal_approx(float(scene.battle["energy"]["blue"]),budget_after) and int(scene.battle.get("ko11_count",0))==1)
	scene._sync_native_rails()
	var after_trace: String=scene._ko_trace_summary()
	check("trace visibly matches real native consequence",after_trace.contains("NATIVE RETURN RECORDED") and after_trace.contains(expected))
	var rec={
		"schema":"jm.cp13.native-32-sweep/1",
		"runIndex":index,"variant":variant,"caseId":case_id,
		"expectedFacts":{"wounded":wounded,"enemy_near":enemy_near},
		"actualFacts":{"wounded":facts["wounded"],"enemy_near":facts["enemy_near"]},
		"expectedAction":expected,"selectedAction":str(receipt.get("selected","")),
		"nativeReturn":receipt,
		"traceBefore":before_trace,"traceAfter":after_trace,
		"originalPolicySHA256":SEAL.POLICY_SHA,"checks":checks.size(),
		"failures":checks.count(false),
		"tamperHeld":not bool(denied.get("applied",false)),
		"duplicateHeld":not bool(duplicate.get("applied",false)),
		"engine":Engine.get_version_info()["string"],
		"host":"Godot native Linux separate process; NOT owner Samsung Fold"
	}
	var file: FileAccess=FileAccess.open(output,FileAccess.WRITE)
	if file==null:
		abort("NATIVE_OUTPUT_OPEN_FAILED")
		return
	file.store_string(JSON.stringify(rec))
	file.close()
	var failed: int=checks.count(false)
	print("CP13 NATIVE RUN ",index," SUMMARY ",checks.size()-failed,"/",checks.size())
	quit(0 if failed==0 else 1)
