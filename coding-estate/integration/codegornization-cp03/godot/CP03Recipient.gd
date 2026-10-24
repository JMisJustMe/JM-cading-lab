extends "res://ConductRecipient.gd"
## CP03 carrier adapter; original Main.gd and ConductRecipient.gd remain exact.
var ui_touches = {}
var lifecycle_saves = 0
var hold_started = {}
var measured_hold = 0.0
const DIRECTOR = preload("res://DirectorSeal.gd")
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
	var coop = HBoxContainer.new()
	coop.name = "CooperationRail"
	coop.position = Vector2(14,184)
	for title in ["PAIR · 88 energy","HOLD BRAID · 4 energy"]:
		var button = Button.new()
		button.text = title
		button.custom_minimum_size = Vector2(230,58)
		coop.add_child(button)
	coop.get_child(0).pressed.connect(pair_companions)
	coop.get_child(1).pressed.connect(func():
		var result = accept_cue_file("res://packets/guard_braid.json",measured_hold)
		contact_label.text = "BRAID COMMITTED · source-authored protection sequence" if result.get("applied",false) else "BRAID HOLD · "+str(result.get("error","duplicate"))
	)
	add_child(coop)
	_fit_native_controls()
func _buttons() -> Array:
	var buttons: Array = get_node("ConductRail").get_children()
	if has_node("CooperationRail"):buttons.append_array(get_node("CooperationRail").get_children())
	return buttons
func _fit_native_controls() -> void:
	if not is_instance_valid(contact_panel):return
	var width = get_viewport_rect().size.x
	for button in _buttons():
		button.custom_minimum_size.x = maxf(100.0,minf(180.0,(width-48.0)/4.0))
	contact_panel.custom_minimum_size.x = minf(900.0,width-28.0)
func _is_native_control(p: Vector2) -> bool:
	return get_node("ConductRail").get_global_rect().has_point(p) or contact_panel.get_global_rect().has_point(p) or (has_node("CooperationRail") and get_node("CooperationRail").get_global_rect().has_point(p))
func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		# Android cancellation revokes this pointer; it never commits intent.
		if event.canceled:
			var button = ui_touches.get(event.index)
			ui_touches.erase(event.index)
			hold_started.erase(event.index)
			if is_instance_valid(button):
				button.set_pressed_no_signal(button in ui_touches.values())
			if event.index==touch_id:
				dragging=false
				touch_id=-1
			get_viewport().set_input_as_handled()
			return
		if event.pressed and _is_native_control(event.position):
			var hit: Button = null
			for button in _buttons():
				if button.get_global_rect().has_point(event.position):
					hit = button
					button.set_pressed_no_signal(true)
			ui_touches[event.index] = hit
			hold_started[event.index] = Time.get_ticks_msec()
			get_viewport().set_input_as_handled()
			return
		if ui_touches.has(event.index):
			if not event.pressed:
				var button = ui_touches[event.index]
				measured_hold = float(Time.get_ticks_msec()-hold_started.get(event.index,Time.get_ticks_msec()))/1000.0
				hold_started.erase(event.index)
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
			hold_started.clear()
			if mode=="playing":_toggle_pause()
	elif what==NOTIFICATION_WM_GO_BACK_REQUEST:
		if mode in ["playing","paused"]:
			_toggle_pause()
			_save_battle()

func pair_companions() -> void:
	if mode!="playing" or conducted_state()["revision"]!=0 or float(battle["energy"]["blue"])<88.0:
		contact_label.text="PAIR HOLD · start fresh mission with 88 energy"
		return
	var first=accept_file("res://packets/pair_root.json")
	if first.get("applied",false):
		var second=accept_file("res://packets/pair_sky.json")
		contact_label.text="PAIR LIVE · Rootwarden + Skyray · hold BRAID" if second.get("applied",false) else "SECOND CONTACT HOLD"

func accept_cue_file(path: String,held: float) -> Dictionary:
	return accept_cue(JSON.parse_string(FileAccess.get_file_as_string(path)),held)

func accept_cue(envelope: Variant,held: float) -> Dictionary:
	if mode!="playing" or not envelope is Dictionary:return {"applied":false,"error":"NOT_PLAYING"}
	if envelope.get("schema","")!="jm.targetbridge.choreography/1" or not envelope.get("payload") is String:return {"applied":false,"error":"CUE_SCHEMA"}
	var text: String=envelope["payload"]
	if text.length()>100000 or text.sha256_text()!=envelope.get("payloadSHA256",""):return {"applied":false,"error":"CUE_BYTES"}
	var cue=JSON.parse_string(text)
	if not cue is Dictionary or cue.get("schema","")!="jm.cooperation.choreography/1" or cue.get("bodySHA256","")!=DIRECTOR.BODY or cue.get("programSeal","")!=DIRECTOR.PROGRAM:return {"applied":false,"error":"CUE_SOURCE"}
	var id=str(cue.get("id",""))
	if id.is_empty() or id.length()>60:return {"applied":false,"error":"CUE_ID"}
	var history: Dictionary=battle.get("cue_history",{})
	if history.has(id):return {"applied":false,"duplicate":history[id]==envelope["payloadSHA256"],"error":"DUPLICATE_OR_CONFLICT"}
	if held<0.6 or not is_finite(held):return {"applied":false,"error":"HELD_INTENT"}
	if int(cue.get("expectedRecipientRevision",-1))!=conducted_state()["revision"]:return {"applied":false,"error":"CUE_RECIPIENT_REVISION"}
	var actors=cue.get("actors",[])
	if not actors is Array or actors.size()!=2 or actors[0]==actors[1]:return {"applied":false,"error":"CUE_ACTORS"}
	var live=conducted_state()["agents"].map(func(a):return a["form"])
	for actor in actors:
		if not actor in live:return {"applied":false,"error":"ACTOR_NOT_LIVE"}
	var steps=["anchor","ward","return"] if cue.get("mode","")=="protect" else ["seek","mark","strike"] if cue.get("mode","")=="focus" else []
	var cues=cue.get("cues",[])
	if steps.is_empty() or not cues is Array or cues.size()!=3:return {"applied":false,"error":"CUE_SEQUENCE"}
	for i in range(3):
		if not cues[i] is Dictionary or int(cues[i].get("index",-1))!=i or cues[i].get("verb","")!=steps[i] or not is_equal_approx(float(cues[i].get("time",-1)),i*0.45):return {"applied":false,"error":"CUE_PHASE"}
	if float(battle["energy"]["blue"])<4.0:return {"applied":false,"error":"CUE_ENERGY"}
	if history.size()>=20:return {"applied":false,"error":"CUE_HISTORY_LIMIT"}
	battle["energy"]["blue"]-=4.0
	history[id]=envelope["payloadSHA256"]
	battle["cue_history"]=history
	battle["cue"]={"id":id,"elapsed":0.0,"next":0,"mode":cue["mode"],"actors":actors,"cues":cues,"events":[],"complete":false,"payloadSHA256":envelope["payloadSHA256"]}
	_save_battle()
	return {"applied":true,"id":id}

func step_forms(dt: float) -> void:
	super.step_forms(dt)
	if not battle.has("cue") or battle["cue"]["complete"]:return
	var cue: Dictionary=battle["cue"]
	var live=conducted_state()["agents"].map(func(a):return a["form"])
	for actor in cue["actors"]:
		if not actor in live:
			cue["complete"]=true
			cue["events"].append({"kind":"cancelled_actor_expired"})
			_save_battle()
			return
	cue["elapsed"]+=dt
	while cue["next"]<3 and cue["elapsed"]>=cue["cues"][cue["next"]]["time"]:
		var index: int=cue["next"]
		if cue["mode"]=="protect":
			if index==1:
				for hero in battle["heroes"]:
					if hero["team"]=="blue" and _alive(hero):hero["hp"]=minf(float(hero["maxhp"]),float(hero["hp"])+8.0)
			if index==2:
				for cover in battle["cover"]:
					if not cover["destroyed"]:cover["hp"]=minf(float(cover["maxhp"]),float(cover["hp"])+6.0)
		else:
			for hero in battle["heroes"]:
				if hero["team"]=="red" and _alive(hero):
					if index==1:hero["stun"]=maxf(float(hero["stun"]),0.5)
					if index==2:_hit(hero,14.0,{"type":"dart","team":"blue","x":608.0,"y":351.0})
		cue["events"].append({"index":index,"verb":cue["cues"][index]["verb"],"elapsed":cue["elapsed"]})
		cue["next"]+=1
		cue["complete"]=cue["next"]==3
		_save_battle()

func _draw() -> void:
	super._draw()
	if not battle.has("conducted"):return
	draw_set_transform(world_offset,0,Vector2.ONE*world_scale)
	var agents=conducted_state()["agents"]
	for agent in agents:
		var p=Vector2(agent["x"],agent["y"])
		var age: float=agent["age"]
		if agent["form"]=="SKYRAY":
			_circle(p+Vector2(-4,-4),3.0,Color("112c3c"))
			_line(p+Vector2(2,8),p+Vector2(18+sin(age*5.0)*8.0,36),Color("ffd080"),2.0)
		elif agent["form"]=="ROOTWARDEN":
			for i in range(3):_circle(p+Vector2((i-1)*22,-25+sin(age*3.0+i)*4.0),13.0,Color("95cc91"))
		else:
			for i in range(3):_circle(p+Vector2.from_angle(age*2.0+i*TAU/3.0)*31.0,4.0,Color("e2c6ff"))
	if battle.has("cue") and not battle["cue"]["complete"] and agents.size()>=2:
		var a=Vector2(agents[0]["x"],agents[0]["y"])
		var b=Vector2(agents[1]["x"],agents[1]["y"])
		_line(a,b,Color("b7f5db"),4.0)
		_circle((a+b)*0.5,12.0+sin(float(battle["cue"]["elapsed"])*14.0)*5.0,Color("ddc3ff"))
	draw_set_transform(Vector2.ZERO,0,Vector2.ONE)
