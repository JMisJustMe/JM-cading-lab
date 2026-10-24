extends "res://Main.gd"
## Original Main.gd remains byte-exact. This recipient accepts typed results,
## not JavaScript source. SHA integrity is not sender identity authentication.
const SOURCE_SEAL = preload("res://SourceSeal.gd").SHA256
var conduct_error = ""

func _ready() -> void:
	super._ready()
	var rail = HBoxContainer.new()
	rail.position = Vector2(14,54)
	for form in ["skyray","rootwarden","prismwisp"]:
		var button = Button.new()
		button.text = "FORM · " + form.to_upper()
		button.custom_minimum_size = Vector2(180,42)
		button.pressed.connect(func():
			if mode != "playing":
				_toast("START A MISSION BEFORE FORM CONTACT")
				return
			var result = accept_file("res://packets/" + form + ".json")
			_toast("FORM " + form.to_uppercase() if result.get("applied",false) else "FORM HOLD · " + conduct_error)
		)
		rail.add_child(button)
	add_child(rail)
	var dialog = FileDialog.new()
	dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	dialog.access = FileDialog.ACCESS_FILESYSTEM
	dialog.filters = PackedStringArray(["*.json ; JM Conduct packet"])
	dialog.file_selected.connect(func(path): accept_file(path))
	add_child(dialog)
	var importer = Button.new()
	importer.text = "IMPORT PACKET"
	importer.custom_minimum_size = Vector2(170,42)
	importer.pressed.connect(func(): dialog.popup_centered_ratio(0.75))
	rail.add_child(importer)

func conducted_state() -> Dictionary:
	return battle.get("conducted",{"sourceSeal":SOURCE_SEAL,"revision":0,"accepted":{},"agents":[],"trace":[]})

func refuse(code: String) -> Dictionary:
	conduct_error = code
	return {"applied":false,"error":code}

func accept_file(path: String) -> Dictionary:
	var file = FileAccess.open(path,FileAccess.READ)
	if file == null or file.get_length() > 1000000:
		return refuse("PACKET_FILE_HOLD")
	var envelope = JSON.parse_string(file.get_as_text())
	return accept_packet(envelope)

func accept_packet(envelope: Variant) -> Dictionary:
	if mode != "playing" or not envelope is Dictionary:
		return refuse("RECIPIENT_NOT_READY")
	if envelope.get("schema","") != "jm.targetbridge.transport/2" or not envelope.get("payload") is String:
		return refuse("TRANSPORT_SCHEMA")
	var text: String = envelope["payload"]
	if text.length() > 900000 or text.sha256_text() != envelope.get("payloadSHA256",""):
		return refuse("TRANSPORT_HASH")
	var packet = JSON.parse_string(text)
	if not packet is Dictionary or packet.get("schema","") != "jm.targetbridge.conduct/2" or packet.get("sourceSeal","") != SOURCE_SEAL:
		return refuse("SOURCE_SEAL_HOLD")
	var tx = packet.get("transaction",{})
	var request = tx.get("request",{})
	var id = str(request.get("id",""))
	if id.is_empty() or id.length() > 60:
		return refuse("TRANSACTION_ID")
	var state = conducted_state().duplicate(true)
	if state["accepted"].has(id):
		if state["accepted"][id] == envelope["payloadSHA256"]:
			return {"applied":false,"duplicate":true,"revision":state["revision"]}
		return refuse("IDEMPOTENCY_CONFLICT")
	if int(packet.get("expectedRecipientRevision",-1)) != int(state["revision"]):
		return refuse("STALE_RECIPIENT")
	var records = tx.get("records",[])
	if not records is Array or records.is_empty() or records.size() > 4:
		return refuse("BATCH_LIMIT")
	for record in records:
		if not record is Dictionary or record.get("schema","") != "jm.conduct/1":
			return refuse("RECORD_SCHEMA")
		var pattern = record.get("pattern",{})
		if not pattern.get("route","") in ["mend","lance","nova"] or pattern.get("state","") != "live":
			return refuse("PATTERN_ROUTE")
		var strength = float(pattern.get("strength",-1))
		if not is_finite(strength) or strength < 1 or strength > 16:
			return refuse("PATTERN_STRENGTH")
	var cost = 22.0 * records.size()
	if float(battle["energy"]["blue"]) < cost:
		return refuse("NATIVE_ENERGY_HOLD")
	# All packet gates pass before any native game state is changed.
	var before = {"energy":battle["energy"]["blue"],"hp":_hero_hps(),"cover":_cover_hps()}
	battle = battle.duplicate(true)
	battle["energy"]["blue"] = float(battle["energy"]["blue"]) - cost
	for record in records:
		apply_pattern(record["pattern"])
	var form = str(tx.get("formation",""))
	if form in ["SKYRAY","ROOTWARDEN","PRISMWISP"]:
		state["agents"].append({"id":id,"form":form,"x":608.0,"y":351.0,"age":0.0,"life":18.0,"clock":0.0,"contacts":0})
	state["revision"] = int(state["revision"]) + 1
	state["accepted"][id] = envelope["payloadSHA256"]
	var returned = {"schema":"jm.targetbridge.native-return/2","transactionId":id,"payloadSHA256":envelope["payloadSHA256"],"sourceSeal":SOURCE_SEAL,"revision":state["revision"],"formation":form,"before":before,"after":{"energy":battle["energy"]["blue"],"hp":_hero_hps(),"cover":_cover_hps()},"runtime":{"engine":Engine.get_version_info()["string"],"os":OS.get_name(),"headless":DisplayServer.get_name()=="headless","physicalDevice":false}}
	state["trace"].append(returned)
	battle["conducted"] = state
	_save_battle()
	queue_redraw()
	return {"applied":true,"receipt":returned}

func _hero_hps() -> Array:
	return battle["heroes"].map(func(hero):return {"id":hero["id"],"team":hero["team"],"hp":hero["hp"]})

func _cover_hps() -> Array:
	return battle["cover"].map(func(cover):return {"id":cover.get("id",""),"hp":cover["hp"]})

func apply_pattern(pattern: Dictionary) -> void:
	var strength = float(pattern["strength"])
	match pattern["route"]:
		"mend":
			for hero in battle["heroes"]:
				if hero["team"] == "blue" and _alive(hero):
					hero["hp"] = minf(float(hero["maxhp"]),float(hero["hp"])+strength)
			if battle["operation"] == "BEACON":
				battle["beacon"]["hull"] = minf(BEACON_MAX_HULL,float(battle["beacon"]["hull"])+strength)
		"lance":
			for hero in battle["heroes"]:
				if hero["team"] == "red" and _alive(hero):
					_hit(hero,12.0+strength,{"type":"dart","team":"blue","x":142.0,"y":float(hero["y"])})
		"nova":
			for cover in battle["cover"]:
				if not cover["destroyed"]:
					_damage_cover(cover,strength*1.5,"blue")
			for hero in battle["heroes"]:
				if hero["team"] == "red" and _alive(hero):
					hero["stun"] = maxf(float(hero["stun"]),1.4)

func _process(delta: float) -> void:
	super._process(delta)
	if mode == "playing":
		step_forms(minf(delta,0.05))

func step_forms(dt: float) -> void:
	if not battle.has("conducted"):
		return
	for agent in battle["conducted"]["agents"]:
		agent["age"] += dt
		agent["life"] -= dt
		agent["clock"] -= dt
		var near: Dictionary = {}
		for hero in battle["heroes"]:
			if hero["team"] == "red" and _alive(hero) and (near.is_empty() or hero["x"] < near["x"]):
				near = hero
		match agent["form"]:
			"SKYRAY":
				if not near.is_empty():
					agent["x"] = move_toward(float(agent["x"]),float(near["x"]),dt*190.0)
					agent["y"] = float(near["y"])-60.0+sin(float(agent["age"])*5.0)*18.0
					if float(agent["clock"]) <= 0:
						_hit(near,8.0,{"type":"dart","team":"blue","x":agent["x"],"y":agent["y"]})
						agent["clock"] = 0.9
						agent["contacts"] += 1
			"ROOTWARDEN":
				for hero in battle["heroes"]:
					if hero["team"] == "red" and _alive(hero) and Vector2(hero["x"],hero["y"]).distance_to(Vector2(agent["x"],agent["y"])) < 150.0:
						hero["stun"] = maxf(float(hero["stun"]),dt*1.2)
						agent["contacts"] += 1
				if float(agent["clock"]) <= 0:
					for cover in battle["cover"]:
						if not cover["destroyed"]:
							cover["hp"] = minf(float(cover["maxhp"]),float(cover["hp"])+2.0)
					agent["clock"] = 1.0
			"PRISMWISP":
				agent["x"] = 608.0+cos(float(agent["age"])*2.0)*140.0
				agent["y"] = 351.0+sin(float(agent["age"])*2.0)*85.0
				if not near.is_empty() and float(agent["clock"]) <= 0:
					_hit(near,5.0,{"type":"warden","team":"blue","x":agent["x"],"y":agent["y"]})
					_damage_cover(battle["cover"][0],1.0,"blue")
					agent["clock"] = 0.6
					agent["contacts"] += 1
	battle["conducted"]["agents"] = battle["conducted"]["agents"].filter(func(a):return a["life"] > 0)

func _draw() -> void:
	super._draw()
	if not battle.has("conducted"):
		return
	draw_set_transform(world_offset,0,Vector2.ONE*world_scale)
	for agent in battle["conducted"]["agents"]:
		var p = Vector2(agent["x"],agent["y"])
		var t = float(agent["age"])
		match agent["form"]:
			"SKYRAY":
				var flap = sin(t*8.0)*15.0
				_poly([p+Vector2(-36,-flap),p+Vector2(-6,-12),p+Vector2(8,-3),p+Vector2(36,-flap),p+Vector2(5,15)],Color("ffd080"))
				_line(p+Vector2(-5,10),p+Vector2(-27,40),BLUE,3.0)
			"ROOTWARDEN":
				for i in range(6):
					var angle = float(i)*TAU/6.0+t*0.12
					_line(p,p+Vector2(cos(angle),sin(angle))*(55.0+sin(t*3.0)*8.0),BLUE,4.0)
				_circle(p,16.0,Color("74b27a"))
			"PRISMWISP":
				_poly([p+Vector2(0,-24),p+Vector2(19,0),p+Vector2(0,24),p+Vector2(-19,0)],Color("d2a2ff"))
				_circle(p,6.0,SAND)
		_txt(str(agent["form"]),p.x,p.y-34.0,12,BLUE)
	draw_set_transform(Vector2.ZERO,0,Vector2.ONE)
