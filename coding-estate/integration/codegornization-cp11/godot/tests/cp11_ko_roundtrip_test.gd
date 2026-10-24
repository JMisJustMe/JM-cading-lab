extends SceneTree
var checks: Array = []
var scene

func check(name: String, ok: bool) -> void:
	checks.append(ok)
	print("CP11 KO LOOP ", "PASS " if ok else "FAIL ",name)

func _initialize() -> void:
	call_deferred("run")

func run() -> void:
	scene=load("res://CP11Main.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame
	check("inherited CP10 native execution and entire gameplay API exists",scene.has_method("accept_ko_contact") and scene.has_method("_cp9_special_step") and scene.has_method("accept_cue"))
	check("actual KO TRACE button shares inherited native touch ownership",scene.has_node("CooperationRail/KOTraceButton") and scene._buttons().has(scene.get_node("CooperationRail/KOTraceButton")))
	check("KO owner proof panel hidden on menu",not scene.ko_trace_panel.visible)
	scene.start_battle("SECTOR")
	scene.set_process(false)
	scene._toggle_ko_trace()
	check("owner can open native evidence panel during real battle",scene.ko_trace_open and scene.ko_trace_panel.visible)
	var before_text: String=scene._ko_trace_summary()
	check("precontact screen names actual donor roles distinctly",before_text.contains("KOCODIFYING") and before_text.contains("CODIFYING") and before_text.contains("JMLOGIC") and before_text.contains("SLINGFALL GODOT"))
	check("no false native consequence before player contact",before_text.contains("NOT USED YET") and not before_text.contains("NATIVE RETURN RECORDED"))
	check("source truth and host distinction are owner-visible",before_text.contains("HISTORICAL ORIGINAL NOT CLAIMED") and before_text.contains("JS DONORS") and before_text.contains("NATIVE GODOT"))
	if not scene._launch("blue","dart",Vector2(448,216)):
		check("actual inherited champion launch",false)
		quit(1)
		return
	var hero: Dictionary=scene.battle["heroes"].back()
	hero["x"]=448.0
	hero["y"]=216.0
	scene._land(hero)
	hero["shield"]=0.0
	scene.battle["energy"]["blue"]=100.0
	check("actual grounded game champion available",hero["flight"].is_empty() and scene.battle["heroes"].size()>0)
	var envelope=JSON.parse_string(FileAccess.get_file_as_string("res://packets/ko_aegis.json"))
	var result: Dictionary=scene.accept_ko_contact(envelope)
	check("KO payload changed live native energy and shield",bool(result.get("applied",false)) and float(scene.battle["energy"]["blue"])==88.0 and float(hero["shield"])>=6.0)
	var receipt: Dictionary=scene.battle.get("ko_return",{})
	check("live game returned source-bound before/after outcome",receipt.get("sourceSHA256","")==envelope.get("payloadSHA256","") and receipt["before"]["energy"]==100.0 and receipt["after"]["energy"]==88.0)
	scene._sync_native_rails()
	var after_text: String=scene._ko_trace_summary()
	check("visible KO trace now reports measured native consequence",after_text.contains("ENERGY 100 → 88") and after_text.contains("1 ALLIES SHIELDED") and after_text.contains("NATIVE RETURN RECORDED"))
	check("owner panel uses actual dynamic output, not a static old label",scene.ko_trace_label.text==after_text and scene.ko_trace_panel.visible)
	scene._toggle_ko_trace()
	check("KO trace can close without ending match or removing source",not scene.ko_trace_panel.visible and scene.mode=="playing" and scene.battle.has("ko_return"))
	scene._toggle_ko_trace()
	scene.mode="result"
	scene._sync_native_rails()
	check("victory hides KO trace and original form controls",not scene.ko_trace_panel.visible and not scene.get_node("CooperationRail").visible)
	var native_evidence = {
		"schema":"jm.ko-native-evidence/1",
		"executed_in":"Godot 4.5.2 native host, independent of Node reverse verifier",
		"ko_source_packet_sha256":str(envelope.get("payloadSHA256","")),
		"native_return":receipt,
		"owner_trace_before":before_text,
		"owner_trace_after":after_text,
		"native_test_checks":checks.size(),
		"native_test_failed":checks.count(false)
	}
	var output = ProjectSettings.globalize_path("res://").path_join("../evidence/cp11-native-return.json")
	var file=FileAccess.open(output,FileAccess.WRITE)
	check("actual Godot return can be exported to independent verifier",file != null)
	if file != null:
		file.store_string(JSON.stringify(native_evidence))
		file.close()
	var fails=checks.count(false)
	print("CP11 KO LOOP SUMMARY ",checks.size()-fails,"/",checks.size())
	quit(0 if fails==0 else 1)
