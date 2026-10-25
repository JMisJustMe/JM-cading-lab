extends "res://CP15Recipient.gd"
## CP16: six tactile actions in two modes. Base CP15, KO11 and Godot stay intact.
## Original JourMaze v1.0 executed in Node; Godot consumes the exact typed
## source-checked alternate route and performs native battle changes on touch.
const CP16_SEAL = preload("res://CP16Seal.gd")
var cp16_power: Dictionary = {}
var cp16_power_mode: bool = false
var cp16_toggle: Button

func _ready() -> void:
	super._ready()
	cp16_power = _cp16_load()
	cp16_toggle = Button.new()
	cp16_toggle.name = "RouteModeToggle"
	cp16_toggle.text = "MODE · SAFE"
	cp16_toggle.custom_minimum_size = Vector2(166,48)
	cp16_toggle.focus_mode = Control.FOCUS_NONE
	cp16_toggle.add_theme_font_size_override("font_size",14)
	cp16_toggle.pressed.connect(_cp16_toggle_mode)
	# Add to inherited player-touch deck, never cover main movement rail.
	var column: VBoxContainer = cp15_dock.get_child(0)
	column.add_child(cp16_toggle)
	column.move_child(cp16_toggle,1)
	_fit_native_controls()
	_sync_native_rails()

func _cp16_load() -> Dictionary:
	var envelope = JSON.parse_string(FileAccess.get_file_as_string("res://packets/cp16_power_routes.json"))
	if not envelope is Dictionary or str(envelope.get("schema",""))!="jm.cp16-route-power-transport/1" or not envelope.get("payload") is String:
		return {}
	var raw: String = envelope["payload"]
	if raw.length()>19000 or raw.sha256_text()!=CP16_SEAL.PACKET_SHA or str(envelope.get("payloadSHA256",""))!=CP16_SEAL.PACKET_SHA:
		return {}
	var policy=JSON.parse_string(raw)
	if not policy is Dictionary or str(policy.get("schema",""))!="jm.cp16-route-power/1":
		return {}
	if str(policy.get("originalJourMazeSHA256",""))!=CP16_SEAL.ORIGINAL_JOURMAZE_SHA or int(policy.get("originalSelfTests",0))!=5:
		return {}
	if str(policy.get("inheritedCP15PacketSHA256",""))!=CP16_SEAL.CP15_PACKET_SHA or CP16_SEAL.CP15_PACKET_SHA!=CP15_SEAL.PACKET_SHA:
		return {}
	if str(policy.get("ko11PolicySHA256",""))!=CP16_SEAL.KO11_POLICY_SHA or CP16_SEAL.KO11_POLICY_SHA!=KO11_SEAL.POLICY_SHA:
		return {}
	var ids: Dictionary=policy.get("identities",{})
	if str(ids.get("routeDonor",""))!="JM JourMaze" or str(ids.get("gameRecipient",""))!="SLINGFALL" or str(ids.get("ko",""))!="KOCODIFIER":
		return {}
	var cards: Dictionary=policy.get("cards",{})
	var exact: Dictionary={
		"GUARD":{"label":"HEAVY WARD","cost":12.0,"shield_seconds":5.0,"heal":0.0,"stun_seconds":0.0,"damage":0.0,"requires":"GROUNDED_BLUE","mid":"HEAVY_WARD"},
		"RECOVER":{"label":"SURGE HEAL","cost":14.0,"shield_seconds":0.0,"heal":19.0,"stun_seconds":0.0,"damage":0.0,"requires":"WOUNDED_BLUE","mid":"SURGE_HEAL"},
		"INTERCEPT":{"label":"DIVE","cost":17.0,"shield_seconds":0.0,"heal":0.0,"stun_seconds":1.8,"damage":5.0,"requires":"NEAR_RED","mid":"DIVE"}
	}
	if cards.size()!=3:
		return {}
	for action in exact.keys():
		if not cards.get(action) is Dictionary:
			return {}
		var item: Dictionary=cards[action]
		var expect: Dictionary=exact[action]
		if str(item.get("action",""))!=action or str(item.get("label",""))!=str(expect["label"]) or str(item.get("requires",""))!=str(expect["requires"]):
			return {}
		for key in ["cost","shield_seconds","heal","stun_seconds","damage"]:
			if not is_equal_approx(float(item.get(key,-999)),float(expect[key])):
				return {}
		var path: Array=item.get("selectedPath",[])
		if path.size()!=3 or str(path[0])!="FIELD" or str(path[1])!=str(expect["mid"]) or str(path[2])!=str(item.get("goal","")):
			return {}
	return cards

func _cp16_toggle_mode() -> void:
	if mode!="playing" or cp16_power.is_empty():
		return
	cp16_power_mode = not cp16_power_mode
	battle["cp16_notice"] = "POWER ROUTES · BIGGER IMPACT, HIGHER COST" if cp16_power_mode else "SAFE ROUTES · ECONOMICAL CONTACT"
	_sync_native_rails()

func _cp16_candidates(action: String) -> Dictionary:
	var base: Dictionary=super._cp15_candidates(action)
	if not bool(base.get("ok",false)) or not cp16_power_mode:
		return base
	if cp16_power.is_empty() or not cp16_power.has(action):
		return {"ok":false,"error":"POWER ROUTE SOURCE HOLD"}
	var needed: float=float(cp16_power[action]["cost"])
	if float(battle["energy"]["blue"])<needed:
		return {"ok":false,"error":"POWER ENERGY LOW"}
	return {"ok":true,"cost":needed,"targets":base["targets"]}

func accept_cp16_route(action: String) -> Dictionary:
	if not cp16_power_mode:
		return super.accept_cp15_route(action)
	var proof: Dictionary=_cp16_candidates(action)
	if not bool(proof.get("ok",false)):
		return {"applied":false,"error":str(proof.get("error","ROUTE HOLD"))}
	if cp16_power.is_empty() or not cp16_power.has(action):
		return {"applied":false,"error":"POWER SOURCE HOLD"}
	var card: Dictionary=cp16_power[action]
	var targets: Array=proof["targets"]
	var energy_before: float=float(battle["energy"]["blue"])
	var before: Array=targets.map(func(h):return {"id":int(h["id"]),"hp":float(h["hp"]),"shield":float(h["shield"]),"stun":float(h["stun"])})
	battle["energy"]["blue"] = energy_before-float(card["cost"])
	for hero in targets:
		match action:
			"GUARD":
				hero["shield"]=minf(10.0,float(hero["shield"])+float(card["shield_seconds"]))
			"RECOVER":
				hero["hp"]=minf(float(hero["maxhp"]),float(hero["hp"])+float(card["heal"]))
			"INTERCEPT":
				hero["stun"]=maxf(float(hero["stun"]),float(card["stun_seconds"]))
				hero["hp"]=maxf(0.0,float(hero["hp"])-float(card["damage"]))
		_event("ripple",Vector2(float(hero["x"]),float(hero["y"])),BLUE,2.5)
	var after: Array=targets.map(func(h):return {"id":int(h["id"]),"hp":float(h["hp"]),"shield":float(h["shield"]),"stun":float(h["stun"])})
	battle["cp15_count"]=int(battle.get("cp15_count",0))+1
	battle["cp15_last_time"]=float(battle.get("elapsed",0.0))
	battle["cp15_notice"]="JM POWER "+str(card["label"])+" · "+str(targets.size())+" HIT"
	battle["cp16_notice"]="SOURCE-SEALED POWER CONSEQUENCE"
	var receipt: Dictionary={
		"schema":"jm.cp16-power-native-return/1",
		"routePacketSHA256":CP16_SEAL.PACKET_SHA,
		"originalJourMazeSHA256":CP16_SEAL.ORIGINAL_JOURMAZE_SHA,
		"inheritedCP15PacketSHA256":CP16_SEAL.CP15_PACKET_SHA,
		"ko11PolicySHA256":CP16_SEAL.KO11_POLICY_SHA,
		"selected":action,"variant":card["label"],"selectedPath":card["selectedPath"],
		"cost":card["cost"],"index":battle["cp15_count"],
		"before":{"energy":energy_before,"targets":before},
		"after":{"energy":float(battle["energy"]["blue"]),"targets":after},
		"engine":Engine.get_version_info()["string"],"host":OS.get_name(),
		"runtime":"original JourMaze executed in Node builder; native Godot executes sealed typed effect"
	}
	battle["cp16_return"]=receipt
	_save_battle()
	queue_redraw()
	_sync_native_rails()
	return {"applied":true,"route":action,"receipt":receipt}

func _cp15_press(action: String) -> void:
	var result: Dictionary=accept_cp16_route(action)
	if not bool(result.get("applied",false)) and not battle.is_empty():
		battle["cp15_notice"]="ROUTE HOLD · "+str(result.get("error","unknown"))
	_sync_native_rails()

func _fit_native_controls() -> void:
	super._fit_native_controls()
	if is_instance_valid(cp16_toggle) and is_instance_valid(cp15_dock):
		_fit_cp16_deck(get_viewport_rect().size)

func _fit_cp16_deck(screen: Vector2) -> void:
	if not is_instance_valid(cp15_dock):
		return
	var width: float=minf(206.0,maxf(166.0,screen.x-20.0))
	var height: float=318.0
	cp15_dock.custom_minimum_size=Vector2(width,height)
	cp15_dock.size=Vector2(width,height)
	cp15_dock.position=Vector2(maxf(8.0,screen.x-width-10.0),maxf(105.0,screen.y-height-12.0))

func _sync_native_rails() -> void:
	super._sync_native_rails()
	if not is_instance_valid(cp16_toggle) or not is_instance_valid(cp15_dock):
		return
	var active: bool=mode=="playing" and not battle.is_empty()
	cp16_toggle.visible=active
	cp16_toggle.disabled=not active or cp16_power.is_empty()
	cp16_toggle.text="MODE · POWER ✦" if cp16_power_mode else "MODE · SAFE"
	if not active:
		return
	for action in ["GUARD","RECOVER","INTERCEPT"]:
		var btn: Button=cp15_buttons[action]
		var card: Dictionary=cp16_power.get(action,{}) if cp16_power_mode else cp15_routes.get(action,{})
		if card.is_empty():
			btn.disabled=true
			btn.text="SOURCE HOLD"
		else:
			var can: Dictionary=_cp16_candidates(action)
			btn.disabled=not bool(can.get("ok",false))
			btn.text=str(card["label"])+" · "+str(card["cost"])+"E"
