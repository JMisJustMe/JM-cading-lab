extends "res://CP08Recipient.gd"
## CP09 Living Rivals: child-only reactive movement, three distinct consequences,
## meaningful player counterplay, native role silhouette cues, and clean overlays.
## Inherited original Godot, CP02, CP03 and CP08 source are not rewritten.
var cp9_think_timer: float = 0.0
var cp9_intel: Label

func _ready() -> void:
	super._ready()
	if is_instance_valid(contact_label):
		contact_label.text = "CP09 · LIVING RIVALS · FORM / PAIR / BRAID"
	cp9_intel = Label.new()
	cp9_intel.position = Vector2(14,278)
	cp9_intel.add_theme_font_size_override("font_size",15)
	cp9_intel.add_theme_color_override("font_color",Color("ffcc8f"))
	cp9_intel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cp9_intel.text = "RIVAL INTEL · WATCH THE THREE ROLES"
	add_child(cp9_intel)
	_sync_native_rails()

func start_battle(variant: String = "") -> void:
	super.start_battle(variant)
	cp9_think_timer = 4.5
	_sync_native_rails()

func _sync_native_rails() -> void:
	var active: bool = mode == "playing"
	if has_node("ConductRail"):
		get_node("ConductRail").visible = active
	if has_node("CooperationRail"):
		get_node("CooperationRail").visible = active
	if is_instance_valid(contact_panel):
		contact_panel.visible = active
	if is_instance_valid(cp8_label):
		cp8_label.visible = active
	if is_instance_valid(cp9_intel):
		cp9_intel.visible = active
		if active and not battle.is_empty():
			cp9_intel.text = str(battle.get("cp9_last","LIVING RIVALS · THREE DISTINCT COMBAT ROLES"))

func _process(delta: float) -> void:
	super._process(delta)
	_sync_native_rails()

func _combat_step(dt: float) -> void:
	super._combat_step(dt)
	_cp9_special_step(dt)
	cp9_think_timer -= dt
	if cp9_think_timer <= 0.0:
		cp9_think_timer = 4.5
		_cp9_rethink()

func _cp9_sector_active() -> bool:
	return mode == "playing" and not battle.is_empty() and str(battle.get("operation","SECTOR")) == "SECTOR"

func _cp9_note(kind: String, pos: Vector2) -> void:
	battle["cp9_last"] = kind
	battle["cp9_events"] = int(battle.get("cp9_events",0)) + 1
	_event("ripple",pos,Color("ffc782"),0.92)

func _cp9_rethink() -> void:
	if not _cp9_sector_active():
		return
	for hero in battle.get("heroes",[]):
		if str(hero.get("team","")) != "red" or not hero.has("cp8_directive") or not _alive(hero) or not hero["flight"].is_empty():
			continue
		var decision: Dictionary = CP8_TACTICS.choose(battle["zones"],battle["heroes"],str(hero.get("type","")))
		if str(decision.get("zone","")).is_empty() or str(hero.get("order","")) == str(decision["zone"]):
			continue
		hero["order"] = str(decision["zone"])
		hero["cp8_directive"] = str(decision["directive"])
		battle["enemy_plan"] = "RIVAL REROUTE / " + str(decision["directive"]) + " / " + str(decision["zone"])
		_cp9_note("RIVAL REROUTE · " + str(decision["zone"]),Vector2(float(hero["x"]),float(hero["y"])))
	_save_battle()

func _cp9_special_step(dt: float) -> void:
	if not _cp9_sector_active():
		return
	for hero in battle.get("heroes",[]):
		if str(hero.get("team","")) != "red" or not hero.has("cp8_directive") or not _alive(hero) or not hero["flight"].is_empty():
			continue
		hero["cp9_cooldown"] = maxf(0.0,float(hero.get("cp9_cooldown",0.0))-dt)
		if float(hero["cp9_cooldown"]) > 0.0:
			continue
		var here = Vector2(float(hero["x"]),float(hero["y"]))
		match str(hero.get("type","")):
			"bulwark":
				var challenged: bool = false
				for enemy in battle["heroes"]:
					if str(enemy.get("team","")) == "blue" and _alive(enemy) and enemy["flight"].is_empty() and here.distance_to(Vector2(float(enemy["x"]),float(enemy["y"]))) < 144.0:
						challenged = true
						break
				if challenged:
					var protected = 0
					for ally in battle["heroes"]:
						if str(ally.get("team","")) == "red" and _alive(ally) and ally["flight"].is_empty() and here.distance_to(Vector2(float(ally["x"]),float(ally["y"]))) <= 140.0:
							ally["shield"] = maxf(float(ally.get("shield",0.0)),3.2)
							protected += 1
					hero["cp9_cooldown"] = 9.0
					_cp9_note("BULWARK · FRONTLINE BRACE / %d SHIELDED" % protected,here)
			"dart":
				for zone in battle["zones"]:
					if str(zone.get("id","")) != str(hero.get("order","")):
						continue
					var center = _zone_position(zone)
					if here.distance_to(center) > float(zone["r"]) + 30.0:
						break
					if float(zone.get("control",0.0)) <= 12.0:
						break
					var defended: bool = false
					for enemy in battle["heroes"]:
						if str(enemy.get("team","")) == "blue" and _alive(enemy) and enemy["flight"].is_empty() and here.distance_to(Vector2(float(enemy["x"]),float(enemy["y"]))) < 75.0:
							defended = true
							break
					if defended:
						hero["cp9_cooldown"] = 2.5
						_cp9_note("DART FLANK COUNTERED · BLUE DEFENDER",here)
					else:
						zone["control"] = clampf(float(zone["control"])-14.0,-100.0,100.0)
						hero["cp9_cooldown"] = 8.0
						_cp9_note("DART · SIGNAL SABOTAGE / -" + str(14),here)
					break
			"warden":
				var patient: Dictionary = {}
				var injury: float = 0.0
				for ally in battle["heroes"]:
					if str(ally.get("team","")) != "red" or not _alive(ally) or not ally["flight"].is_empty():
						continue
					if here.distance_to(Vector2(float(ally["x"]),float(ally["y"]))) >= 155.0:
						continue
					var missing: float = float(ally["maxhp"])-float(ally["hp"])
					if missing > injury:
						injury = missing
						patient = ally
				if injury > 1.0 and not patient.is_empty():
					patient["hp"] = minf(float(patient["maxhp"]),float(patient["hp"])+17.0)
					patient["shield"] = maxf(float(patient.get("shield",0.0)),2.2)
					hero["cp9_cooldown"] = 8.0
					_cp9_note("WARDEN · BATTLEFIELD TRIAGE / +17 HP",Vector2(float(patient["x"]),float(patient["y"])))

func _draw() -> void:
	super._draw()
	if mode != "playing" or battle.is_empty() or str(battle.get("operation","SECTOR")) != "SECTOR":
		return
	# Native visual grammar makes enemy roles immediately distinguishable.
	draw_set_transform(world_offset,0,Vector2.ONE*world_scale)
	for hero in battle.get("heroes",[]):
		if str(hero.get("team","")) != "red" or not _alive(hero) or not hero["flight"].is_empty() or not hero.has("cp8_directive"):
			continue
		var pos = Vector2(float(hero["x"]),float(hero["y"]))
		match str(hero.get("type","")):
			"bulwark":
				draw_arc(pos,43.0,0.0,TAU,28,Color("ff9e68",0.7),3.6)
				_line(pos+Vector2(-16,-42),pos+Vector2(0,-57),Color("ffe2b7"),3)
				_line(pos+Vector2(0,-57),pos+Vector2(16,-42),Color("ffe2b7"),3)
			"dart":
				_line(pos+Vector2(-42,24),pos+Vector2(-21,5),Color("ffdb66",0.88),3.0)
				_line(pos+Vector2(-48,8),pos+Vector2(-29,-5),Color("ffdb66",0.58),2.5)
				draw_arc(pos,37,PI*0.9,TAU*0.9,17,Color("ffdc80"),2.4)
			"warden":
				draw_arc(pos,49.0,0,TAU,36,Color("d6a6ff",0.85),2.5)
				_line(pos+Vector2(-12,-52),pos+Vector2(12,-52),Color("e6ceff"),3)
				_line(pos+Vector2(0,-64),pos+Vector2(0,-40),Color("e6ceff"),3)
	draw_set_transform(Vector2.ZERO,0,Vector2.ONE)
