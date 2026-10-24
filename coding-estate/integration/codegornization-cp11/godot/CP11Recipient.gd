extends "res://CP10Recipient.gd"
## JM CP11 — owner-visible provenance from actual precomputed KO executions,
## source-typed Godot battle contact, and actual native return receipt.
## This view is not a claim that the JS language donors run on the phone.
var ko_trace_open: bool = false
var ko_trace_panel: PanelContainer
var ko_trace_label: Label

func _ready() -> void:
	super._ready()
	var rail: HBoxContainer = get_node("CooperationRail")
	var view_button: Button = Button.new()
	view_button.name = "KOTraceButton"
	view_button.text = "KO TRACE · SEE BODIES"
	view_button.custom_minimum_size = Vector2(180,58)
	view_button.pressed.connect(_toggle_ko_trace)
	rail.add_child(view_button)
	ko_trace_panel = PanelContainer.new()
	ko_trace_panel.name = "KOTracePanel"
	ko_trace_panel.position = Vector2(712,184)
	ko_trace_panel.custom_minimum_size = Vector2(455,244)
	ko_trace_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var box_style: StyleBoxFlat = StyleBoxFlat.new()
	box_style.bg_color = Color("091b27",0.95)
	box_style.border_color = Color("56d7bd",0.85)
	box_style.set_border_width_all(2)
	box_style.set_corner_radius_all(12)
	box_style.set_content_margin_all(12)
	ko_trace_panel.add_theme_stylebox_override("panel",box_style)
	ko_trace_label = Label.new()
	ko_trace_label.name = "BodiesAndReturn"
	ko_trace_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ko_trace_label.add_theme_font_size_override("font_size",15)
	ko_trace_label.add_theme_color_override("font_color",Color("d5f8ec"))
	ko_trace_label.text = _ko_trace_summary()
	ko_trace_panel.add_child(ko_trace_label)
	add_child(ko_trace_panel)
	_fit_native_controls()
	_sync_native_rails()

func _toggle_ko_trace() -> void:
	if mode != "playing":
		return
	ko_trace_open = not ko_trace_open
	_sync_native_rails()

func _ko_trace_summary() -> String:
	var envelope = JSON.parse_string(FileAccess.get_file_as_string("res://packets/ko_aegis.json"))
	if not envelope is Dictionary:
		return "KO TRACE · SOURCE PACKET NOT RECOVERED"
	var payload = JSON.parse_string(str(envelope.get("payload","")))
	if not payload is Dictionary:
		return "KO TRACE · INVALID SOURCE PACKET"
	var record: Dictionary = payload.get("contact",{})
	var sources: Dictionary = payload.get("source",{})
	var output: Dictionary = battle.get("ko_return",{}) if not battle.is_empty() else {}
	var source_hash: String = str(envelope.get("payloadSHA256",""))
	var lines: Array[String] = [
		"JM KO  /  BODIES IN CONTACT",
		"KOCODIFYING  ·  BUILD-STAGE SYNCHRONISATION",
		"   KOCODIFIER → SLINGFALL  ·  AEGIS",
		"CODIFYING  ·  TYPED NATIVE INTENT",
		"   "+str(record.get("effect","HOLD"))+" / "+str(record.get("energy","?"))+" ENERGY / "+str(record.get("shield_seconds","?"))+"s",
		"JMLOGIC  ·  BUILD-STAGE PERMISSION",
		"   "+("AUTHORISED" if bool(payload.get("execution",{}).get("allowed",false)) else "HOLD"),
		"SLINGFALL GODOT  ·  LIVE GAME CONSEQUENCE"
	]
	if output.is_empty():
		lines.append("   NOT USED YET · DEPLOY BLUE ALLY, THEN KO AEGIS")
	else:
		var before: Dictionary=output.get("before",{})
		var after: Dictionary=output.get("after",{})
		lines.append("   ENERGY "+str(int(float(before.get("energy",0))))+" → "+str(int(float(after.get("energy",0))))+"  /  "+str(output.get("appliedActors",0))+" ALLIES SHIELDED")
		lines.append("   NATIVE RETURN RECORDED · "+str(output.get("effect","UNKNOWN")))
	lines.append("SOURCE "+source_hash.substr(0,14)+"…")
	lines.append("KO DESCENDANT · HISTORICAL ORIGINAL NOT CLAIMED")
	lines.append("BUILD: JS DONORS  /  DEVICE: NATIVE GODOT")
	if sources.is_empty():
		lines.append("SOURCE HOLD")
	return "\n".join(PackedStringArray(lines))

func _sync_native_rails() -> void:
	super._sync_native_rails()
	if is_instance_valid(ko_trace_panel):
		ko_trace_panel.visible = mode == "playing" and ko_trace_open
		if ko_trace_panel.visible and is_instance_valid(ko_trace_label):
			ko_trace_label.text = _ko_trace_summary()
