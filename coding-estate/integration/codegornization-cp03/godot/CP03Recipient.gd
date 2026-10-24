extends "res://ConductRecipient.gd"
## CP03 carrier adapter; original Main.gd and ConductRecipient.gd remain exact.
var ui_touches = {}
var lifecycle_saves = 0
var contact_panel: PanelContainer
var contact_label: Label
func _ready() -> void:
	super._ready()
	var rail = get_node("ConductRail")
	rail.position = Vector2(14,66)
	for button in rail.get_children():
		button.custom_minimum_size.y = 58
		button.focus_mode = Control.FOCUS_ALL
	contact_panel = PanelContainer.new()
	contact_panel.position = Vector2(14,132)
	contact_panel.custom_minimum_size = Vector2(620,42)
	contact_label = Label.new()
	contact_label.text = "CP03 · Native target · start a mission, then choose FORM"
	contact_label.add_theme_font_size_override("font_size",16)
	contact_panel.add_child(contact_label)
	add_child(contact_panel)
	get_tree().root.size_changed.connect(_fit_native_controls)
	_fit_native_controls()
func _fit_native_controls() -> void:
	if not is_instance_valid(contact_panel):return
	var width = get_viewport_rect().size.x
	for button in get_node("ConductRail").get_children():
		button.custom_minimum_size.x = maxf(100.0,minf(180.0,(width-48.0)/4.0))
	contact_panel.custom_minimum_size.x = minf(900.0,width-28.0)
func _is_native_control(p: Vector2) -> bool:
	return get_node("ConductRail").get_global_rect().has_point(p) or contact_panel.get_global_rect().has_point(p)
func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed and _is_native_control(event.position):
			var hit: Button = null
			for button in get_node("ConductRail").get_children():
				if button.get_global_rect().has_point(event.position):
					hit = button
					button.set_pressed_no_signal(true)
			ui_touches[event.index] = hit
			get_viewport().set_input_as_handled()
			return
		if ui_touches.has(event.index):
			if not event.pressed:
				var button = ui_touches[event.index]
				if is_instance_valid(button):
					button.set_pressed_no_signal(false)
					if button.get_global_rect().has_point(event.position):button.pressed.emit()
				ui_touches.erase(event.index)
			get_viewport().set_input_as_handled()
			return
		if event.pressed and touch_id>=0 and event.index!=touch_id:return
	elif event is InputEventScreenDrag and ui_touches.has(event.index):return
	elif event is InputEventMouseButton or event is InputEventMouseMotion:
		if _is_native_control(event.position):return
	super._input(event)
func accept_packet(envelope: Variant) -> Dictionary:
	var result = super.accept_packet(envelope)
	if is_instance_valid(contact_label):
		contact_label.text = "COMMITTED · revision "+str(result.get("receipt",{}).get("revision",0)) if result.get("applied",false) else "CONTACT HOLD · "+str(result.get("error","duplicate — state preserved"))
	return result
func _notification(what: int) -> void:
	if what==NOTIFICATION_APPLICATION_PAUSED or what==NOTIFICATION_APPLICATION_FOCUS_OUT:
		if not battle.is_empty() and mode in ["playing","paused"]:
			_save_battle()
			lifecycle_saves+=1
			dragging=false
			touch_id=-1
			for button in ui_touches.values():
				if is_instance_valid(button):button.set_pressed_no_signal(false)
			ui_touches.clear()
			if mode=="playing":_toggle_pause()
	elif what==NOTIFICATION_WM_GO_BACK_REQUEST:
		if mode in ["playing","paused"]:
			_toggle_pause()
			_save_battle()
