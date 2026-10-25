extends "res://CP11Recipient.gd"
## CP11 CONVERGENCE: retain exact green live KO decision recipient (PR455).
## Donate only PR453's owner-visible native-return trace capability.
## Build-stage KO executors != original interpreters running on Android.
var ko_trace_open: bool = false
var ko_trace_panel: PanelContainer
var ko_trace_label: Label

func _ready() -> void:
	super._ready()
	var rail: HBoxContainer = get_node("CooperationRail")
	var view_button := Button.new()
	view_button.name = "KOTraceButton"
	view_button.text = "KO TRACE · LIVE RETURN"
	view_button.custom_minimum_size = Vector2(176,58)
	view_button.pressed.connect(_toggle_ko_trace)
	rail.add_child(view_button)
	ko_trace_panel = PanelContainer.new()
	ko_trace_panel.name = "KOTracePanel"
	ko_trace_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var style := StyleBoxFlat.new()
	style.bg_color = Color("091b27",0.96)
	style.border_color = Color("56d7bd",0.85)
	style.set_border_width_all(2)
	style.set_corner_radius_all(12)
	style.set_content_margin_all(12)
	ko_trace_panel.add_theme_stylebox_override("panel",style)
	ko_trace_label = Label.new()
	ko_trace_label.name = "KOActualReturn"
	ko_trace_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ko_trace_label.add_theme_font_size_override("font_size",14)
	ko_trace_label.add_theme_color_override("font_color",Color("d5f8ec"))
	ko_trace_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	ko_trace_panel.add_child(ko_trace_label)
	add_child(ko_trace_panel)
	_fit_native_controls()
	_sync_native_rails()

func _fit_native_controls() -> void:
	super._fit_native_controls()
	if is_instance_valid(ko_trace_panel):
		_fit_ko_trace(get_viewport_rect().size)

func _fit_ko_trace(view_size: Vector2) -> void:
	if not is_instance_valid(ko_trace_panel):
		return
	var width: float = minf(455.0,maxf(240.0,view_size.x-24.0))
	var height: float = minf(256.0,maxf(140.0,view_size.y-130.0))
	ko_trace_panel.custom_minimum_size = Vector2(width,height)
	ko_trace_panel.size = Vector2(width,height)
	ko_trace_panel.position = Vector2(maxf(12.0,view_size.x-width-12.0),maxf(105.0,minf(184.0,view_size.y-height-12.0)))
	if is_instance_valid(ko_trace_label):
		ko_trace_label.add_theme_font_size_override("font_size",12 if view_size.x<540 else 14)

func _toggle_ko_trace() -> void:
	if mode != "playing":
		return
	ko_trace_open = not ko_trace_open
	_sync_native_rails()

func _ko_trace_summary() -> String:
	if ko11_policy.is_empty():
		return "KO TRACE · SOURCE POLICY HOLD"
	var src: Dictionary = ko11_policy.get("source",{})
	var seal: String = str(ko11_policy.get("transportSHA256",""))
	var lines: Array[String] = [
		"JM KO · REAL EXECUTION AND RETURN",
		"KOCODIFYING · Node source identity/binding",
		"CODIFYING · Node typed native intents",
		"JMLOGIC · Node 4-row policy compilation",
		"GODOT · LIVE state-based action + return"
	]
	if mode=="playing" and not battle.is_empty():
		var facts: Dictionary = _ko11_facts()
		var choice: String = _ko11_choice(facts)
		lines.append("LIVE CHOICE · "+choice+" / wounded="+str(facts["wounded"])+" / nearby="+str(facts["enemy_near"]))
	var returned: Dictionary = battle.get("ko11_return",{}) if not battle.is_empty() else {}
	if returned.is_empty():
		lines.append("NATIVE RETURN · NOT USED YET")
	else:
		var before: Dictionary=returned.get("before",{})
		var after: Dictionary=returned.get("after",{})
		lines.append("NATIVE RETURN · "+str(returned.get("selected","HOLD"))+" / "+str(after.get("targets",[]).size())+" TARGETS")
		lines.append("ENERGY "+str(int(float(before.get("energy",0))))+" → "+str(int(float(after.get("energy",0)))))
		lines.append("NATIVE RETURN RECORDED · INDEX "+str(returned.get("index",0)))
	lines.append("POLICY SHA "+seal.substr(0,14)+"…")
	if src.is_empty():
		lines.append("KO DONOR SOURCE HOLD")
	else:
		lines.append("KO reconstructed descendant · original history NOT claimed")
	lines.append("BUILD · JS DONORS / DEVICE · NATIVE GODOT")
	lines.append("QUALIFICATION · OPEN (JudgeMaker separate CP12)")
	return "\n".join(PackedStringArray(lines))

func _sync_native_rails() -> void:
	super._sync_native_rails()
	if is_instance_valid(ko_trace_panel):
		ko_trace_panel.visible = mode=="playing" and ko_trace_open
		if ko_trace_panel.visible and is_instance_valid(ko_trace_label):
			ko_trace_label.text = _ko_trace_summary()
