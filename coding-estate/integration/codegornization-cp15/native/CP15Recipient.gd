extends "res://CP11ConvergedRecipient.gd"
## CP15 playable route deck. Exact frozen JM JourMaze runs in Node build stage.
## Here Godot evaluates the seal and executes each player-selected native effect.
## CP10/CP11 KO source-driven auto action and native TRACE are unchanged.
const CP15_SEAL = preload("res://CP15Seal.gd")
var cp15_routes: Dictionary = {}
var cp15_dock: PanelContainer
var cp15_notice: Label
var cp15_buttons: Dictionary = {}

func _ready() -> void:
	super._ready()
	cp15_routes = _cp15_load()
	cp15_dock = PanelContainer.new()
	cp15_dock.name = "JMRouteDeck"
	cp15_dock.mouse_filter = Control.MOUSE_FILTER_PASS
	var style := StyleBoxFlat.new()
	style.bg_color = Color("101b25",0.96)
	style.border_color = Color("74d1ba")
	style.set_border_width_all(2)
	style.set_corner_radius_all(14)
	style.set_content_margin_all(8)
	cp15_dock.add_theme_stylebox_override("panel",style)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation",4)
	cp15_dock.add_child(column)
	var title := Label.new()
	title.text = "JM ROUTES · TOUCH TO ACT"
	title.add_theme_font_size_override("font_size",13)
	title.add_theme_color_override("font_color",Color("c7fff1"))
	column.add_child(title)
	for action in ["GUARD","RECOVER","INTERCEPT"]:
		var button := Button.new()
		button.name = "Route" + action
		button.custom_minimum_size = Vector2(166,45)
		button.focus_mode = Control.FOCUS_NONE
		button.add_theme_font_size_override("font_size",14)
		button.pressed.connect(_cp15_press.bind(action))
		column.add_child(button)
		cp15_buttons[action] = button
	cp15_notice = Label.new()
	cp15_notice.name = "RouteOutcome"
	cp15_notice.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	cp15_notice.add_theme_font_size_override("font_size",12)
	cp15_notice.add_theme_color_override("font_color",Color("edf6dc"))
	cp15_notice.custom_minimum_size = Vector2(166,36)
	column.add_child(cp15_notice)
	add_child(cp15_dock)
	_fit_native_controls()
	_sync_native_rails()

func _cp15_load() -> Dictionary:
	var envelope = JSON.parse_string(FileAccess.get_file_as_string("res://packets/jm_route_tactics.json"))
	if not envelope is Dictionary or str(envelope.get("schema",""))!="jm.jourmaze-native-tactics.transport/1":
		return {}
	if not envelope.get("payload") is String:
		return {}
	var raw: String = envelope["payload"]
	if raw.length()>25000 or raw.sha256_text()!=CP15_SEAL.PACKET_SHA or str(envelope.get("payloadSHA256",""))!=CP15_SEAL.PACKET_SHA:
		return {}
	var document = JSON.parse_string(raw)
	if not document is Dictionary or str(document.get("schema",""))!="jm.jourmaze-native-tactics/1":
		return {}
	var source: Dictionary = document.get("source",{})
	var identities: Dictionary = document.get("identities",{})
	if str(source.get("originalJourMazeSHA256",""))!=CP15_SEAL.JOURMAZE_SHA or int(source.get("originalSelfTests",0))!=5 or bool(source.get("historicalKOOriginal",true)):
		return {}
	if str(source.get("KO11PolicySHA256",""))!=CP15_SEAL.KO11_POLICY_SHA or CP15_SEAL.KO11_POLICY_SHA!=KO11_SEAL.POLICY_SHA:
		return {}
	if str(identities.get("donor",""))!="JM JourMaze" or str(identities.get("recipient",""))!="SLINGFALL" or str(identities.get("ko",""))!="KOCODIFIER":
		return {}
	var cards: Dictionary = document.get("cards",{})
	if cards.size()!=3:
		return {}
	# Exact bounded source-aligned effects: fail closed on a repackaged,
	# structurally plausible packet with undeclared native effects.
	var expected: Dictionary = {
		"GUARD":{"label":"BRACE","cost":8,"shield_seconds":3.0,"heal":0.0,"stun_seconds":0.0,"damage":0.0,"requires":"GROUNDED_BLUE"},
		"RECOVER":{"label":"RALLY","cost":9,"shield_seconds":0.0,"heal":12.0,"stun_seconds":0.0,"damage":0.0,"requires":"WOUNDED_BLUE"},
		"INTERCEPT":{"label":"TRAP","cost":10,"shield_seconds":0.0,"heal":0.0,"stun_seconds":1.25,"damage":4.0,"requires":"NEAR_RED"}
	}
	for action in expected.keys():
		if not cards.get(action) is Dictionary:
			return {}
		var item: Dictionary = cards[action]
		var spec: Dictionary = expected[action]
		if str(item.get("action",""))!=action or str(item.get("label",""))!=str(spec["label"]) or str(item.get("requires",""))!=str(spec["requires"]):
			return {}
		for k in ["cost","shield_seconds","heal","stun_seconds","damage"]:
			if not is_equal_approx(float(item.get(k,-999)),float(spec[k])):
				return {}
		var route: Array = item.get("selectedPath",[])
		if route.size()!=3 or str(route[0])!="FIELD" or str(route[1])!=str(spec["label"]).replace(" ","_"):
			return {}
	return cards

func _cp15_candidates(action: String) -> Dictionary:
	if mode!="playing" or battle.is_empty() or str(battle.get("operation","SECTOR"))!="SECTOR":
		return {"ok":false,"error":"SECTOR ONLY"}
	if cp15_routes.is_empty() or not cp15_routes.has(action):
		return {"ok":false,"error":"ROUTE NOT SEALED"}
	if int(battle.get("cp15_count",0))>=3:
		return {"ok":false,"error":"ROUTES SPENT"}
	if float(battle.get("cp15_last_time",-10000.0))+4.0>float(battle.get("elapsed",0.0)):
		return {"ok":false,"error":"RECOVERING"}
	var route: Dictionary = cp15_routes[action]
	var cost: float = float(route["cost"])
	if float(battle["energy"]["blue"])<cost:
		return {"ok":false,"error":"ENERGY LOW"}
	var facts: Dictionary = _ko11_facts()
	var blue: Array = facts["blue"]
	if blue.is_empty():
		return {"ok":false,"error":"DEPLOY FIRST"}
	var targets: Array = []
	if action=="GUARD":
		targets=blue
	elif action=="RECOVER":
		var selected: Dictionary = {}
		var biggest_injury: float = 0.0
		for ally in blue:
			var missing: float = float(ally["maxhp"])-float(ally["hp"])
			if missing>=5.0 and missing>biggest_injury:
				selected=ally
				biggest_injury=missing
		if selected.is_empty():
			return {"ok":false,"error":"NO INJURED ALLY"}
		targets=[selected]
	elif action=="INTERCEPT":
		for enemy in facts["red"]:
			var epos:=Vector2(float(enemy["x"]),float(enemy["y"]))
			for ally in blue:
				if epos.distance_to(Vector2(float(ally["x"]),float(ally["y"])))<=145.0:
					targets.append(enemy)
					break
		if targets.is_empty():
			return {"ok":false,"error":"NO NEARBY RIVAL"}
	else:
		return {"ok":false,"error":"UNDECLARED ROUTE"}
	return {"ok":true,"targets":targets,"cost":cost}

func accept_cp15_route(action: String) -> Dictionary:
	# No effect is triggered by a visual card alone: player touch first,
	# eligibility at the instant of contact, then real native consequence.
	var check: Dictionary = _cp15_candidates(action)
	if not bool(check.get("ok",false)):
		return {"applied":false,"error":str(check.get("error","ROUTE HOLD"))}
	var route: Dictionary=cp15_routes[action]
	var targets: Array=check["targets"]
	var before_energy: float=float(battle["energy"]["blue"])
	var before: Array=targets.map(func(h):return {"id":int(h["id"]),"hp":float(h["hp"]),"shield":float(h["shield"]),"stun":float(h["stun"])})
	battle["energy"]["blue"]=before_energy-float(route["cost"])
	for hero in targets:
		if action=="GUARD":
			hero["shield"]=minf(8.0,float(hero["shield"])+float(route["shield_seconds"]))
		elif action=="RECOVER":
			hero["hp"]=minf(float(hero["maxhp"]),float(hero["hp"])+float(route["heal"]))
		elif action=="INTERCEPT":
			hero["stun"]=maxf(float(hero["stun"]),float(route["stun_seconds"]))
			hero["hp"]=maxf(0.0,float(hero["hp"])-float(route["damage"]))
		_event("ripple",Vector2(float(hero["x"]),float(hero["y"])),BLUE,1.7)
	var after: Array=targets.map(func(h):return {"id":int(h["id"]),"hp":float(h["hp"]),"shield":float(h["shield"]),"stun":float(h["stun"])})
	battle["cp15_count"]=int(battle.get("cp15_count",0))+1
	battle["cp15_last_time"]=float(battle.get("elapsed",0.0))
	var message: String="JM ROUTE "+str(route["label"])+" · "+str(targets.size())+" AFFECTED"
	battle["cp15_notice"]=message
	var receipt: Dictionary={
		"schema":"jm.jourmaze-player-native-return/1",
		"routePacketSHA256":CP15_SEAL.PACKET_SHA,
		"originalJourMazeSHA256":CP15_SEAL.JOURMAZE_SHA,
		"ko11PolicySHA256":CP15_SEAL.KO11_POLICY_SHA,
		"sourceExecution":"original JourMaze at build; sealed native packet consumed in Godot",
		"selected":action,"variant":route["label"],"selectedPath":route["selectedPath"],
		"cost":route["cost"],"before":{"energy":before_energy,"targets":before},
		"after":{"energy":float(battle["energy"]["blue"]),"targets":after},
		"index":battle["cp15_count"],"engine":Engine.get_version_info()["string"],"host":OS.get_name()
	}
	battle["cp15_return"]=receipt
	_save_battle()
	queue_redraw()
	_sync_native_rails()
	return {"applied":true,"route":action,"receipt":receipt}

func _cp15_press(action: String) -> void:
	var result: Dictionary=accept_cp15_route(action)
	if not bool(result.get("applied",false)) and not battle.is_empty():
		battle["cp15_notice"]="ROUTE HOLD · "+str(result.get("error","unknown"))
	_sync_native_rails()

func _fit_native_controls() -> void:
	super._fit_native_controls()
	if is_instance_valid(cp15_dock):
		var screen: Vector2=get_viewport_rect().size
		_fit_cp15_deck(screen)

func _fit_cp15_deck(screen: Vector2) -> void:
	if not is_instance_valid(cp15_dock):
		return
	var width: float=minf(198.0,maxf(160.0,screen.x-20.0))
	var height: float=260.0
	cp15_dock.custom_minimum_size=Vector2(width,height)
	cp15_dock.size=Vector2(width,height)
	cp15_dock.position=Vector2(maxf(8.0,screen.x-width-10.0),maxf(112.0,screen.y-height-15.0))

func _sync_native_rails() -> void:
	super._sync_native_rails()
	if not is_instance_valid(cp15_dock):
		return
	var active: bool=mode=="playing" and not battle.is_empty()
	cp15_dock.visible=active
	if not active:
		return
	for action in ["GUARD","RECOVER","INTERCEPT"]:
		var btn: Button=cp15_buttons[action]
		var card: Dictionary=cp15_routes.get(action,{})
		if card.is_empty():
			btn.text=action+" · SOURCE HOLD"
			btn.disabled=true
		else:
			var can: Dictionary=_cp15_candidates(action)
			btn.text=str(card["label"])+" · "+str(card["cost"])+"E"
			btn.disabled=not bool(can.get("ok",false))
	var last: String=str(battle.get("cp15_notice","Choose a route.\nLive field gates apply."))
	cp15_notice.text=last
