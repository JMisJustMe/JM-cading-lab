extends Control
## SLINGFALL — BEACONFALL v0.6: three operations, deeper embodiment and wave defence.
## Inherits Convoy Front v0.5 and original JM source without replacement.
## Adds selectable convoy operation, escort/intercept pressure, checkpoints, mobile objective and bespoke results.
## Gameplay/roles/numbers ported from original SLINGFALL_v0_1_FIELD_CONTACT.html.
## Inherits v0.2/v0.3 gameplay and save identity. Adds destructive tactical cover, meaningful crosswind, telegraphed ion hazards and smarter rivals.
## Native, deterministic gameplay; no third-party assets or runtime services; Android Godot Editor compatible (GDScript).

const W = 1200.0
const H = 700.0
const MATCH_TIME = 140.0
const WIN_SCORE = 105.0
const SAVE_PROFILE = "user://slingfall_field_ascent_profile.json"
const SAVE_BATTLE = "user://slingfall_field_ascent_battle.json"
const BLUE = Color("61f0c6")
const RED = Color("ff8867")
const SAND = Color("e9d8ba")
const NIGHT = Color("091923")
const TYPES = {
	"bulwark": {"name":"BULWARK", "cost":32.0, "hp":160.0, "speed":61.0, "power":1.25, "dmg":17.0, "range":64.0, "cool":1.0},
	"dart": {"name":"DART", "cost":26.0, "hp":90.0, "speed":125.0, "power":1.75, "dmg":12.0, "range":56.0, "cool":0.66},
	"warden": {"name":"WARDEN", "cost":28.0, "hp":125.0, "speed":69.0, "power":1.3, "dmg":11.0, "range":75.0, "cool":1.05}
}
const ORDER = ["bulwark", "dart", "warden"]
const ZONE_DATA = [
	{"id":"RIDGE", "x":448.0, "y":216.0, "r":79.0, "mult":0.95},
	{"id":"CROSSROADS", "x":608.0, "y":351.0, "r":91.0, "mult":1.55},
	{"id":"SUPPLY", "x":755.0, "y":488.0, "r":79.0, "mult":1.13}
]

var mode = "menu"
var previous_mode = "menu"
var selected = "bulwark"
var operation_selected = "SECTOR"
var profile = {"scrap":0, "wins":0, "losses":0, "matches":0, "level":1, "best":0, "escorts":0,"defenses":0}
var battle = {}
var uid = 1
var timer = 0.0
var save_timer = 0.0
var next_enemy = 2.8
var message = ""
var message_time = 0.0
var rally = false
var touch_id = -1
var down_point = Vector2.ZERO
var aim_point = Vector2.ZERO
var dragging = false
var effects = []
var portrait_textures = {}
var resume_available = false
var rng = RandomNumberGenerator.new()
var world_scale = 1.0
var world_offset = Vector2.ZERO
var last_view = Vector2.ZERO
var vfx_time = 0.0
var weather = []
var combat_events: Array = []
var tone_shift = 0.0
var screenshake = 0.0
const SCAR_LIFETIME = 18.0
const SIGNATURE_THRESHOLD = 3
const COVER_BLUEPRINTS = [
	{"id":"WEST_BASTION","x":392.0,"y":347.0,"radius":48.0,"hp":75.0},
	{"id":"HIGH_BARRIER","x":653.0,"y":208.0,"radius":44.0,"hp":70.0},
	{"id":"EAST_RUIN","x":825.0,"y":386.0,"radius":47.0,"hp":80.0},
	{"id":"LOW_WALL","x":540.0,"y":533.0,"radius":45.0,"hp":65.0}
]
const ION_WARNING_SECONDS = 1.35
const ION_STRIKE_DAMAGE = 16.0
const CROSSWIND_DRIFT = 26.0
const CONVOY_ROUTE = [Vector2(316,476),Vector2(448,216),Vector2(608,351),Vector2(755,488),Vector2(874,264)]
const CONVOY_MAX_HULL = 180.0
const CONVOY_ESCORT_RADIUS = 133.0
const CONVOY_INTERCEPT_RADIUS = 148.0
# Third independent mission. Old save schema and project identity are untouched.
const BEACON_AT = Vector2(608,351)
const BEACON_MAX_HULL = 225.0
const BEACON_DEFENSE_RADIUS = 126.0
const BEACON_WAVES = ["dart","warden","bulwark"]
const OPERATIONS = ["SECTOR","CONVOY","BEACON"]

func _ready() -> void:
	rng.seed = 320015
	mouse_filter = Control.MOUSE_FILTER_STOP
	_load_profile()
	resume_available = _has_save()
	for kind in ORDER:
		var path = "res://assets/%s.png" % kind
		if not ResourceLoader.exists(path):
			path = "res://assets/%s.svg" % kind
		if ResourceLoader.exists(path):
			portrait_textures[kind] = load(path)
	for i in range(48):
		weather.append({"x":rng.randf_range(0,W),"y":rng.randf_range(40,H),"r":rng.randf_range(1,3),"v":rng.randf_range(3,12)})
	_resize()
	get_viewport().size_changed.connect(_resize)
	set_process(true)
	queue_redraw()

func _resize() -> void:
	last_view = get_viewport_rect().size
	world_scale = maxf(0.01, minf(last_view.x / W, last_view.y / H))
	world_offset = (last_view - Vector2(W,H) * world_scale) * 0.5
	queue_redraw()

func _new_battle() -> Dictionary:
	var zones = []
	for z in ZONE_DATA:
		var copied = z.duplicate(true)
		copied["control"] = 0.0
		copied["owner"] = ""
		zones.append(copied)
	var slots = {"blue":{}, "red":{}}
	for team in ["blue","red"]:
		for kind in ORDER:
			slots[team][kind] = {"active":0,"ready_at":0.0}
	var barricades: Array = []
	for item in COVER_BLUEPRINTS:
		var cover = item.duplicate(true)
		cover["maxhp"] = cover["hp"]
		cover["destroyed"] = false
		barricades.append(cover)
	return {"elapsed":0.0,"score":{"blue":0.0,"red":0.0},"energy":{"blue":100.0,"red":100.0},
		"zones":zones,"heroes":[],"slots":slots,"captures":{"blue":0,"red":0},"ended":false,
		"scars":[],"signatures":{"blue":0,"red":0},"salvage":{"blue":0,"red":0},"supply_tick":0.0,"field_event":"CLEAR",
		"cover":barricades,"ion_tick":0.0,"ion_marks":[],"ion_index":0,"enemy_plan":"CONTEST",
		"operation":"SECTOR","beacon":{"hull":BEACON_MAX_HULL,"charge":0.0,"wave":0,"cooldown":1.0,"paid":false,"complete":false,"under_attack":false,"raiders":0,"defenders":0,"last_hit":0.0,"repairs":0.0},"convoy":{"x":CONVOY_ROUTE[0].x,"y":CONVOY_ROUTE[0].y,"waypoint":1,"hull":CONVOY_MAX_HULL,"maxhull":CONVOY_MAX_HULL,"complete":false,"checkpoints":0,"progress":0.0,"escorts":0,"interceptors":0,"pulse":0.0}}

func start_battle(variant: String = "") -> void:
	if variant in OPERATIONS:
		operation_selected = variant
	battle = _new_battle()
	battle["operation"] = operation_selected
	uid = 1
	next_enemy = 2.8
	save_timer = 0.0
	selected = "bulwark"
	rally = false
	mode = "playing"
	effects.clear()
	combat_events.clear()
	screenshake = 0.0
	_delete_battle_file()
	_toast("DEFEND THE SIGNAL CORE" if operation_selected == "BEACON" else "ESCORT THE CARGO" if operation_selected == "CONVOY" else "SECURE ALL THREE SECTORS")

func _toast(msg: String, sec = 2.0) -> void:
	message = msg
	message_time = sec

func _save_file(path: String, value: Dictionary) -> void:
	var f = FileAccess.open(path, FileAccess.WRITE)
	if f != null:
		f.store_string(JSON.stringify(value))
		f.close()
		if path == SAVE_BATTLE:
			resume_available = true

func _read_file(path: String) -> Variant:
	if not FileAccess.file_exists(path):
		return null
	var f = FileAccess.open(path, FileAccess.READ)
	if f == null:
		return null
	var value = JSON.parse_string(f.get_as_text())
	f.close()
	return value

func _load_profile() -> void:
	var recovered = _read_file(SAVE_PROFILE)
	if recovered is Dictionary and recovered.has("level") and recovered.has("scrap") and int(recovered["level"]) >= 1 and int(recovered["level"]) <= 3:
		for k in profile.keys():
			if recovered.has(k):
				profile[k] = recovered[k]

func _save_profile() -> void:
	_save_file(SAVE_PROFILE, profile)

func _save_battle() -> void:
	if mode in ["playing","paused"] and battle.has("zones") and not battle.get("ended",false):
		_save_file(SAVE_BATTLE,{"version":2,"battle":battle,"selected":selected,"next_enemy":next_enemy,"uid":uid})

func _delete_battle_file() -> void:
	resume_available = false
	if FileAccess.file_exists(SAVE_BATTLE):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(SAVE_BATTLE))

func _has_save() -> bool:
	var saved = _read_file(SAVE_BATTLE)
	return saved is Dictionary and saved.get("version",0) == 2 and saved.get("battle",{}) is Dictionary and saved["battle"].get("ended",true) == false

func resume_battle() -> void:
	var saved = _read_file(SAVE_BATTLE)
	if not saved is Dictionary or saved.get("version",0) != 2:
		_toast("NO RECOVERABLE MATCH")
		return
	var b = saved.get("battle", {})
	if not b is Dictionary or not b.has("zones") or not b.has("slots") or not b.has("energy") or not b.has("heroes") or b["zones"].size() != 3:
		_toast("SAVE REJECTED — MATCH INTACT")
		return
	battle = b
	selected = saved.get("selected","bulwark")
	if not TYPES.has(selected):
		selected = "bulwark"
	uid = int(saved.get("uid",1))
	next_enemy = float(saved.get("next_enemy",2.8))
	# Schema-2 migration: older v0.2 battles recover unchanged; additive keys only.
	if not battle.has("scars"):
		battle["scars"] = []
	if not battle.has("signatures"):
		battle["signatures"] = {"blue":0,"red":0}
	if not battle.has("salvage"):
		battle["salvage"] = {"blue":0,"red":0}
	if not battle.has("supply_tick"):
		battle["supply_tick"] = 0.0
	if not battle.has("field_event"):
		battle["field_event"] = "CLEAR"
	# Additive schema-2 migration: never delete v0.2/v0.3 saves or reset progression.
	if not battle.has("cover"):
		battle["cover"] = _new_battle()["cover"]
	if not battle.has("ion_tick"):
		battle["ion_tick"] = 0.0
	if not battle.has("ion_marks"):
		battle["ion_marks"] = []
	if not battle.has("ion_index"):
		battle["ion_index"] = 0
	if not battle.has("enemy_plan"):
		battle["enemy_plan"] = "CONTEST"
	# Existing schema-2 saves are sector battles. Convoy fields are additive.
	if str(battle.get("operation","SECTOR")) not in OPERATIONS:
		battle["operation"] = "SECTOR"
	if not battle.has("operation"):
		battle["operation"] = "SECTOR"
	if not battle.has("convoy"):
		battle["convoy"] = _new_battle()["convoy"]
	if not battle.has("beacon"):
		battle["beacon"] = _new_battle()["beacon"]
	else:
		for key in _new_battle()["beacon"].keys():
			if not battle["beacon"].has(key):
				battle["beacon"][key] = _new_battle()["beacon"][key]
	operation_selected = str(battle["operation"])
	for h in battle["heroes"]:
		_ensure_living_hero(h)
	rally = false
	mode = "playing"
	_toast("FIELD STATE RESTORED")

func _ensure_living_hero(hero: Dictionary) -> void:
	if not hero.has("combo"):
		hero["combo"] = 0
	if not hero.has("signature"):
		hero["signature"] = 0.0
	if not hero.has("support_cd"):
		hero["support_cd"] = 2.0
	if not hero.has("beacon_cd"):
		hero["beacon_cd"] = 0.0
	if not hero.has("moving"):
		hero["moving"] = false
	if not hero.has("direction"):
		hero["direction"] = 1.0 if hero.get("team", "blue") == "blue" else -1.0

func _event(kind: String, p: Vector2, col: Color, size: float = 1.0) -> void:
	combat_events.append({"kind":kind,"p":p,"color":col,"size":size,"age":0.0,"ttl":0.65 if kind != "ripple" else 1.15})
	if combat_events.size() > 90:
		combat_events.pop_front()

func _register_scar(p: Vector2, team: String) -> void:
	# Bulwark's landfall affects opposing ground movement for a bounded period.
	battle["scars"].append({"x":p.x,"y":p.y,"team":team,"ttl":SCAR_LIFETIME,"radius":74.0})
	if battle["scars"].size() > 12:
		battle["scars"].pop_front()
	_event("ripple",p,_team_color(team),2.0)

func positive_cost(kind: String) -> float:
	return maxf(16.0,float(TYPES[kind]["cost"]) - (4.0 if int(profile["level"]) >= 3 else 0.0))

func _alive(hero: Dictionary) -> bool:
	return float(hero.get("hp",0.0)) > 0.0 and not hero.get("leaving",false)

func _get_hero(hero_id: int) -> Dictionary:
	for hero in battle.get("heroes",[]):
		if int(hero["id"]) == hero_id and _alive(hero):
			return hero
	return {}

func _launch(team: String, kind: String, target: Vector2) -> bool:
	if mode != "playing" or not TYPES.has(kind):
		return false
	var slot: Dictionary = battle["slots"][team][kind]
	var cost = positive_cost(kind)
	if int(slot["active"]) != 0 or float(slot["ready_at"]) > float(battle["elapsed"]) or float(battle["energy"][team]) < cost:
		return false
	target = Vector2(clampf(target.x,260,944),clampf(target.y,125,576))
	var origin = Vector2(155,345) if team == "blue" else Vector2(1045,353)
	var flight_time = clampf(origin.distance_to(target) / 385.0, 1.03,2.25)
	var hp = float(TYPES[kind]["hp"])
	var h = {"id":uid,"team":team,"type":kind,"x":origin.x,"y":origin.y,"z":0.0,
		"hp":hp,"maxhp":hp,"order":"","cool":0.0,"life":0.0,"shield":0.0,"age":0.0,"leaving":false,
		"death":0.0,"stun":0.0,"move_tick":0.0,"speed_boost":0.0,"anim":rng.randf_range(0.0,6.28),
		"flight":{"sx":origin.x,"sy":origin.y,"tx":target.x,"ty":target.y,"t":0.0,"total":flight_time,
			"drift":(CROSSWIND_DRIFT if team == "blue" else -CROSSWIND_DRIFT) if battle.get("field_event","CLEAR") == "CROSSWIND" else 0.0},
		"trail":[],"combo":0,"signature":0.0,"support_cd":2.0,"beacon_cd":0.0,"moving":false,"direction":1.0 if team=="blue" else -1.0}
	uid += 1
	battle["energy"][team] = float(battle["energy"][team]) - cost
	battle["heroes"].append(h)
	slot["active"] = int(h["id"])
	_burst(origin, _team_color(team),10)
	if team == "blue":
		_toast("%s AIRBORNE" % kind.to_upper(),0.9)
	return true

func _team_color(team: String) -> Color:
	return BLUE if team == "blue" else RED

func _zone_position(zone: Dictionary) -> Vector2:
	return Vector2(float(zone["x"]),float(zone["y"]))

func _nearest_zone(h: Dictionary) -> Dictionary:
	var best: Dictionary = battle["zones"][0]
	var best_distance = 999999.0
	for z in battle["zones"]:
		var distance = _zone_position(z).distance_to(Vector2(h["x"],h["y"])) + (230.0 if z["owner"] == h["team"] else 0.0)
		if distance < best_distance:
			best = z
			best_distance = distance
	return best

func _damage_cover(cover: Dictionary, damage: float, cause: String = "") -> void:
	if cover.get("destroyed",false):
		return
	cover["hp"] = maxf(0.0,float(cover["hp"]) - maxf(0.0,damage))
	var pos = Vector2(float(cover["x"]),float(cover["y"]))
	_event("impact",pos,Color("f0bc7b"),1.1)
	if float(cover["hp"]) <= 0.0:
		cover["destroyed"] = true
		_event("ripple",pos,Color("f1a66d"),1.8)
		_burst(pos,Color("ebaa74"),19)
		_toast("BARRICADE BREACHED // " + str(cover["id"]),1.2)
		if cause in ["blue","red"]:
			battle["salvage"][cause] = int(battle["salvage"][cause]) + 1

func _nearest_cover(p: Vector2) -> Dictionary:
	var closest: Dictionary = {}
	var best = INF
	for cover in battle.get("cover",[]):
		if cover.get("destroyed",false):
			continue
		var d = p.distance_to(Vector2(float(cover["x"]),float(cover["y"])))
		if d < float(cover["radius"]) and d < best:
			closest = cover
			best = d
	return closest

func _hit(h: Dictionary, damage: float, attacker: Dictionary = {}) -> void:
	if not _alive(h):
		return
	# Cover can absorb 40% of a non-melee hit until it is genuinely destroyed.
	# DART's finisher is piercing; close-range strikes bypass this barrier.
	if not attacker.is_empty() and str(attacker.get("type","")) != "dart":
		var distance = Vector2(float(attacker.get("x",h["x"])),float(attacker.get("y",h["y"]))).distance_to(Vector2(float(h["x"]),float(h["y"])))
		if distance >= 42.0:
			var cover = _nearest_cover(Vector2(float(h["x"]),float(h["y"])))
			if not cover.is_empty():
				var diverted = minf(float(cover["hp"]),damage*0.40)
				_damage_cover(cover,diverted,str(attacker.get("team","")))
				damage -= diverted
	# Bulwark's plate is genuinely tankier; shield logic remains inherited.
	var armour = 0.83 if h["type"] == "bulwark" else 1.0
	var actual_damage = damage * armour * (0.57 if float(h["shield"]) > 0 else 1.0)
	h["hp"] = float(h["hp"]) - actual_damage
	combat_events.append({"kind":"number","value":roundi(actual_damage),"p":Vector2(float(h["x"]),float(h["y"]))-Vector2(0,86),"color":RED if h["team"] == "blue" else BLUE,"age":0.0,"ttl":0.84,"size":1.0})
	h["flash"] = 0.20
	if float(h["hp"]) <= 0:
		h["hp"] = 0.0
		h["leaving"] = true
		h["death"] = 1.15
		var slot: Dictionary = battle["slots"][h["team"]][h["type"]]
		slot["active"] = 0
		slot["ready_at"] = float(battle["elapsed"]) + 7.0
		_burst(Vector2(h["x"],h["y"]),_team_color(h["team"]),24)
		_event("ripple", Vector2(h["x"],h["y"]), _team_color(h["team"]), 1.2)
		if battle.has("salvage"):
			battle["salvage"]["blue" if h["team"] == "red" else "red"] += 1

func _land(h: Dictionary) -> void:
	h["flight"] = {}
	h["z"] = 0.0
	h["age"] = 0.0
	var p = Vector2(h["x"],h["y"])
	_burst(p,_team_color(h["team"]),34)
	for z in battle["zones"]:
		if p.distance_to(_zone_position(z)) < float(z["r"]) + 24.0:
			var polarity = 1.0 if h["team"] == "blue" else -1.0
			z["control"] = clampf(float(z["control"]) + polarity * (18.0 if h["type"] == "dart" else 9.0),-100,100)
			h["order"] = z["id"]
			break
	match h["type"]:
		"bulwark":
			_register_scar(p,h["team"])
			# Heavy landing shatters actual terrain and removes future cover.
			for cover in battle.get("cover",[]):
				if not cover.get("destroyed",false) and p.distance_to(Vector2(float(cover["x"]),float(cover["y"]))) < float(cover["radius"]) + 42.0:
					_damage_cover(cover,32.0,h["team"])
			for other in battle["heroes"]:
				if other["team"] != h["team"] and _alive(other) and other["flight"].is_empty() and p.distance_to(Vector2(other["x"],other["y"])) < 110:
					var push = (Vector2(other["x"],other["y"]) - p).normalized()
					_hit(other,27.0)
					other["x"] = float(other["x"]) + push.x * 48.0
					other["y"] = float(other["y"]) + push.y * 48.0
			_toast("BULWARK • SHOCKWAVE")
		"warden":
			for other in battle["heroes"]:
				if other["team"] == h["team"] and _alive(other) and other["flight"].is_empty() and p.distance_to(Vector2(other["x"],other["y"])) < 135:
					other["shield"] = maxf(float(other["shield"]),6.0)
					other["hp"] = minf(float(other["maxhp"]),float(other["hp"]) + 15.0)
			h["shield"] = 8.0
			_toast("WARDEN • AEGIS FIELD")
		"dart":
			h["speed_boost"] = 5.0
			_event("slash",p,_team_color(h["team"]),1.6)
			_toast("DART • QUICK CLAIM")
	# New mission orders: genuine AI-follow behaviour rather than a manual escort-only test.
	if str(battle.get("operation","SECTOR")) == "CONVOY":
		h["order"] = "ESCORT" if h["team"] == "blue" else "INTERCEPT"
	elif str(battle.get("operation","SECTOR")) == "BEACON":
		h["order"] = "DEFEND_BEACON" if h["team"] == "blue" else "RAID_BEACON"
	if (h["x"] > 249.0 and h["x"] < 319.0) or (h["x"] > 887.0 and h["x"] < 960.0):
		if h["type"] != "bulwark" and h["type"] != "dart":
			_hit(h,12.0)

func _recall(kind: String) -> void:
	var slot: Dictionary = battle["slots"]["blue"][kind]
	var h = _get_hero(int(slot["active"]))
	if h.is_empty() or not h["flight"].is_empty():
		_toast("NO CHAMPION TO RECALL")
		return
	h["leaving"] = true
	h["death"] = 0.4
	h["hp"] = 0.0
	slot["active"] = 0
	slot["ready_at"] = float(battle["elapsed"]) + 4.0
	_burst(Vector2(h["x"],h["y"]),BLUE,14)
	_toast("%s EXTRACTED" % kind.to_upper())

func _issue_order(point: Vector2) -> void:
	if str(battle.get("operation","SECTOR")) == "BEACON" and point.distance_to(BEACON_AT) < 105.0:
		var defenders = 0
		for hero in battle["heroes"]:
			if hero["team"] == "blue" and _alive(hero) and hero["flight"].is_empty() and (rally or hero["type"] == selected):
				hero["order"] = "DEFEND_BEACON"
				defenders += 1
		rally = false
		_toast("DEFENDERS TO CORE: %d" % defenders if defenders > 0 else "DEPLOY A DEFENDER")
		return
	if str(battle.get("operation","SECTOR")) == "CONVOY":
		var cargo: Dictionary = battle["convoy"]
		if point.distance_to(Vector2(float(cargo["x"]),float(cargo["y"]))) < 100.0:
			var assigned = 0
			for hero in battle["heroes"]:
				if hero["team"] == "blue" and _alive(hero) and hero["flight"].is_empty():
					hero["order"] = "ESCORT"
					assigned += 1
			rally = false
			_toast("%d CHAMPIONS ESCORTING CARGO" % assigned if assigned > 0 else "DEPLOY A CHAMPION FIRST")
			return
	var target: Dictionary = {}
	var min_distance = INF
	for z in battle["zones"]:
		var d = point.distance_to(_zone_position(z))
		if d < min_distance:
			min_distance = d
			target = z
	if min_distance > 155:
		_toast("AIM FOR A CAPTURE ZONE")
		return
	var count = 0
	for h in battle["heroes"]:
		if h["team"] == "blue" and _alive(h) and h["flight"].is_empty() and (rally or h["type"] == selected):
			h["order"] = target["id"]
			count += 1
	rally = false
	_toast("%s → %s" % ["SQUAD RALLY" if count > 1 else "MOVE ORDER",target["id"]] if count > 0 else "NO READY CHAMPIONS")

func _enemy_step(dt: float) -> void:
	# Beacon operation owns its attack waves; do not inject regular zone raiders.
	if str(battle.get("operation","SECTOR")) == "BEACON":
		return
	next_enemy -= dt
	if next_enemy > 0.0:
		return
	next_enemy = rng.randf_range(3.3,5.1)
	var ready: Array = []
	for kind in ORDER:
		var slot: Dictionary = battle["slots"]["red"][kind]
		if int(slot["active"]) == 0 and float(slot["ready_at"]) <= float(battle["elapsed"]) and float(battle["energy"]["red"]) >= positive_cost(kind):
			ready.append(kind)
	if ready.is_empty():
		return
	# Exposed rival intent: prioritise defended or nearly captured objectives.
	var candidates: Array = []
	var highest = -INF
	for zone in battle["zones"]:
		var blue_count = 0
		for hero in battle["heroes"]:
			if hero["team"] == "blue" and _alive(hero) and hero["flight"].is_empty() and _zone_position(zone).distance_to(Vector2(float(hero["x"]),float(hero["y"]))) < float(zone["r"]) + 36.0:
				blue_count += 1
		var pressure = float(zone["control"]) + 22.0*blue_count + (25.0 if zone["id"] == "SUPPLY" else 0.0)
		if pressure > highest:
			highest = pressure
			candidates = [zone]
		elif is_equal_approx(pressure, highest):
			candidates.append(zone)
	var zone: Dictionary = candidates[rng.randi_range(0,candidates.size()-1)]
	var opposing: String = ""
	for hero in battle["heroes"]:
		if hero["team"] == "blue" and _alive(hero) and hero["flight"].is_empty() and _zone_position(zone).distance_to(Vector2(float(hero["x"]),float(hero["y"]))) < float(zone["r"]) + 60.0:
			opposing = str(hero["type"])
			break
	# Counterroles rather than random interchangeable fighters.
	var counter = "warden" if opposing == "bulwark" else "dart" if opposing == "warden" else "bulwark" if opposing == "dart" else "dart"
	var kind: String = counter if counter in ready else ready[rng.randi_range(0,ready.size()-1)]
	battle["enemy_plan"] = "COUNTER " + opposing.to_upper() if opposing != "" else "CLAIM " + str(zone["id"])
	var target = _zone_position(zone) + Vector2(rng.randf_range(-33,33),rng.randf_range(-31,31))
	if str(battle.get("operation","SECTOR")) == "CONVOY":
		var cargo: Dictionary = battle["convoy"]
		if not bool(cargo["complete"]):
			var cargo_position = Vector2(float(cargo["x"]),float(cargo["y"]))
			target = cargo_position + Vector2(rng.randf_range(-53,53),rng.randf_range(-42,42))
			battle["enemy_plan"] = "INTERCEPT CARGO"
	_launch("red",kind,target)

func _signature_attack(h: Dictionary, enemy: Dictionary) -> void:
	var p = Vector2(float(h["x"]),float(h["y"]))
	var target = Vector2(float(enemy["x"]),float(enemy["y"]))
	var c = _team_color(h["team"])
	battle["signatures"][h["team"]] += 1
	h["signature"] = 0.8
	h["combo"] = 0
	match h["type"]:
		"bulwark":
			_event("ripple",p,c,1.7)
			for cover in battle.get("cover",[]):
				if not cover.get("destroyed",false) and p.distance_to(Vector2(float(cover["x"]),float(cover["y"]))) < 124.0:
					_damage_cover(cover,24.0,h["team"])
			for other in battle["heroes"]:
				if other["team"] != h["team"] and _alive(other) and other["flight"].is_empty() and p.distance_to(Vector2(other["x"],other["y"])) < 119:
					_hit(other,19.0)
					other["stun"] = 0.65
			_toast("BULWARK // SIEGE PULSE",1.2)
		"dart":
			# Dart's finisher actually repositions and pierces target health.
			var step = (target - p).normalized() * 24.0
			h["x"] = clampf(float(h["x"]) + step.x,235,973)
			h["y"] = clampf(float(h["y"]) + step.y,92,615)
			_hit(enemy,23.0)
			_event("slash",target,c,2.15)
			_toast("DART // RAZOR RUSH",1.2)
		"warden":
			for ally in battle["heroes"]:
				if ally["team"] == h["team"] and _alive(ally) and ally["flight"].is_empty() and p.distance_to(Vector2(ally["x"],ally["y"])) < 145:
					ally["hp"] = minf(float(ally["maxhp"]),float(ally["hp"]) + 16.0)
					ally["shield"] = maxf(float(ally["shield"]),3.5)
			_hit(enemy,8.0)
			_event("ripple",p,c,1.4)
			_toast("WARDEN // RESTORATION WAVE",1.2)

func _combat_step(dt: float) -> void:
	for h in battle["heroes"]:
		if h["leaving"]:
			h["death"] = float(h["death"]) - dt
			continue
		if not h["flight"].is_empty():
			var f: Dictionary = h["flight"]
			f["t"] = minf(float(f["total"]),float(f["t"]) + dt)
			var u = float(f["t"]) / float(f["total"])
			h["x"] = lerpf(float(f["sx"]),float(f["tx"]) + float(f.get("drift",0.0)),u)
			h["y"] = lerpf(float(f["sy"]),float(f["ty"]),u)
			h["z"] = maxf(0.0,515.0 * float(f["total"]) * float(f["t"]) * 0.5 - 257.5 * pow(float(f["t"]),2))
			h["trail"].append([h["x"],h["y"],h["z"]])
			if h["trail"].size() > 13:
				h["trail"].pop_front()
			if u >= 1.0:
				_land(h)
			continue
		_ensure_living_hero(h)
		h["life"] = float(h["life"]) + dt
		h["moving"] = false
		h["signature"] = maxf(0.0,float(h["signature"]) - dt)
		h["support_cd"] = maxf(0.0,float(h["support_cd"]) - dt)
		h["stun"] = maxf(0.0,float(h.get("stun",0.0)) - dt)
		if float(h["stun"]) > 0:
			continue
		h["cool"] = maxf(0.0,float(h["cool"]) - dt)
		h["shield"] = maxf(0.0,float(h["shield"]) - dt)
		h["speed_boost"] = maxf(0.0,float(h["speed_boost"]) - dt)
		h["flash"] = maxf(0.0,float(h.get("flash",0.0)) - dt)
		h["attack"] = maxf(0.0,float(h.get("attack",0.0)) - dt)
		if float(h["life"]) > 43.0:
			var slot: Dictionary = battle["slots"][h["team"]][h["type"]]
			slot["active"] = 0
			slot["ready_at"] = float(battle["elapsed"]) + 4.0
			h["leaving"] = true
			h["death"] = 0.4
			continue
		var enemy: Dictionary = {}
		var min_dist = INF
		var here = Vector2(h["x"],h["y"])
		for other in battle["heroes"]:
			if other["team"] == h["team"] or not _alive(other) or not other["flight"].is_empty():
				continue
			var d = here.distance_to(Vector2(other["x"],other["y"]))
			if d < min_dist:
				enemy = other
				min_dist = d
		var stats: Dictionary = TYPES[h["type"]]
		# A true ranged support role and a mobile skirmisher, not three melee reskins.
		var reach = float(stats["range"]) * (1.30 if h["type"] == "warden" else 1.0)
		if h["type"] == "warden" and float(h["support_cd"]) <= 0:
			h["support_cd"] = 6.5
			for ally in battle["heroes"]:
				if ally["team"] == h["team"] and _alive(ally) and ally["flight"].is_empty() and here.distance_to(Vector2(ally["x"],ally["y"])) < 125.0:
					var before = float(ally["hp"])
					ally["hp"] = minf(float(ally["maxhp"]),before + 7.0)
					if float(ally["hp"]) > before:
						_event("link",Vector2(ally["x"],ally["y"]),_team_color(h["team"]),0.85)
		if not enemy.is_empty() and min_dist < reach:
			if float(h["cool"]) <= 0:
				_hit(enemy,float(stats["dmg"]),h)
				h["cool"] = float(stats["cool"])
				h["attack"] = 0.22
				h["combo"] = int(h["combo"]) + 1
				_event("slash" if h["type"] == "dart" else "link" if h["type"] == "warden" else "impact",Vector2(enemy["x"],enemy["y"]),_team_color(h["team"]),1.1)
				_burst(Vector2(enemy["x"],enemy["y"]),_team_color(h["team"]),6)
				if int(h["combo"]) >= SIGNATURE_THRESHOLD and _alive(enemy):
					_signature_attack(h, enemy)
			continue
		var cargo_order = str(battle.get("operation","SECTOR")) == "CONVOY" and str(h.get("order","")) in ["ESCORT","INTERCEPT"]
		var beacon_order = str(battle.get("operation","SECTOR")) == "BEACON" and str(h.get("order","")) in ["DEFEND_BEACON","RAID_BEACON"]
		var destination = Vector2.ZERO
		var arrival_radius = 28.0
		if cargo_order:
			var cargo_pos = Vector2(float(battle["convoy"]["x"]),float(battle["convoy"]["y"]))
			destination = cargo_pos + (Vector2(-28,30) if h["team"] == "blue" else Vector2(36,-24))
		elif beacon_order:
			# The core is physical territory: attackers press into it, defenders form a perimeter.
			destination = BEACON_AT + (Vector2(-35,44) if h["team"] == "blue" else Vector2(21,-19))
			arrival_radius = 34.0
		else:
			var zone: Dictionary = {}
			for z in battle["zones"]:
				if z["id"] == h["order"]:
					zone = z
					break
			if zone.is_empty():
				zone = _nearest_zone(h)
				h["order"] = zone["id"]
			if zone["owner"] == h["team"] and float(h["life"]) > 3:
				h["move_tick"] = float(h["move_tick"]) + dt
				if float(h["move_tick"]) > 4.4:
					h["move_tick"] = 0.0
					for z in battle["zones"]:
						if z["owner"] != h["team"]:
							zone = z
							h["order"] = z["id"]
							break
			destination = _zone_position(zone)
			arrival_radius = float(zone["r"]) * 0.62
		var displacement = destination - here
		if displacement.length() > arrival_radius:
			h["moving"] = true
			var speed = float(stats["speed"]) * (1.55 if float(h["speed_boost"]) > 0 else 1.0)
			var in_wire = (h["x"] > 270.0 and h["x"] < 315.0) or (h["x"] > 905.0 and h["x"] < 952.0)
			if in_wire and h["type"] == "warden":
				speed *= 0.58
			for scar in battle.get("scars",[]):
				if scar["team"] != h["team"] and here.distance_to(Vector2(float(scar["x"]),float(scar["y"]))) < float(scar["radius"]):
					speed *= 0.72
			h["direction"] = 1.0 if displacement.x >= 0 else -1.0
			var movement = displacement.normalized() * speed * dt
			h["x"] = clampf(float(h["x"]) + movement.x,235,973)
			h["y"] = clampf(float(h["y"]) + movement.y,92,615)
	battle["heroes"] = battle["heroes"].filter(func(h): return not h["leaving"] or float(h["death"]) > 0)

func _capture_step(dt: float) -> void:
	for z in battle["zones"]:
		var blue_power = 0.0
		var red_power = 0.0
		var center = _zone_position(z)
		for h in battle["heroes"]:
			if not _alive(h) or not h["flight"].is_empty() or center.distance_to(Vector2(h["x"],h["y"])) > float(z["r"]):
				continue
			if h["team"] == "blue":
				blue_power += float(TYPES[h["type"]]["power"])
			else:
				red_power += float(TYPES[h["type"]]["power"])
		if blue_power > 0 or red_power > 0:
			z["control"] = clampf(float(z["control"]) + (blue_power-red_power)*14.0*dt,-100.0,100.0)
		else:
			z["control"] = float(z["control"]) * pow(0.999,dt*60)
		var owner: String = z["owner"]
		z["owner"] = "blue" if float(z["control"]) >= 52 else "red" if float(z["control"]) <= -52 else ""
		if z["owner"] != "" and owner != z["owner"]:
			battle["captures"][z["owner"]] = int(battle["captures"][z["owner"]]) + 1
			_burst(center,_team_color(z["owner"]),35)
			_toast("%s %s" % [z["id"], "SECURED" if z["owner"] == "blue" else "LOST"])
		if z["owner"] != "":
			battle["score"][z["owner"]] = float(battle["score"][z["owner"]]) + float(z["mult"])*dt*1.15

func _ion_impact(mark: Dictionary) -> void:
	var pos = Vector2(float(mark["x"]),float(mark["y"]))
	var radius = float(mark["radius"])
	_event("ripple",pos,Color("a8eaff"),2.2)
	_burst(pos,Color("bcf0ff"),24)
	for hero in battle["heroes"]:
		if _alive(hero) and hero["flight"].is_empty() and pos.distance_to(Vector2(float(hero["x"]),float(hero["y"]))) < radius:
			_hit(hero,ION_STRIKE_DAMAGE)
			hero["stun"] = maxf(float(hero.get("stun",0.0)),0.25)
	for cover in battle.get("cover",[]):
		if not cover.get("destroyed",false) and pos.distance_to(Vector2(float(cover["x"]),float(cover["y"]))) < radius + float(cover["radius"])*0.45:
			_damage_cover(cover,14.0)

func _living_field_step(dt: float) -> void:
	# Weather is deterministically scheduled and saved through match state.
	var phase = int(float(battle["elapsed"]) / 28.0) % 3
	var new_event = "CLEAR" if phase == 0 else "CROSSWIND" if phase == 1 else "ION STORM"
	if battle["field_event"] != new_event:
		battle["field_event"] = new_event
		_toast("WEATHER SHIFT • " + new_event,1.7)
		if new_event != "ION STORM":
			battle["ion_marks"] = []
			battle["ion_tick"] = 0.0
	# Supply stays meaningful: zone ownership yields actual energy.
	battle["supply_tick"] = float(battle["supply_tick"]) + dt
	while float(battle["supply_tick"]) >= 3.0:
		battle["supply_tick"] = float(battle["supply_tick"]) - 3.0
		for zone in battle["zones"]:
			if zone["id"] == "SUPPLY" and zone["owner"] != "":
				var side: String = zone["owner"]
				battle["energy"][side] = minf(100.0,float(battle["energy"][side]) + 4.0)
				_event("ripple",_zone_position(zone),_team_color(side),1.25)
	# An ion mark telegraphs danger before any damage happens; no arbitrary instant hits.
	if new_event == "ION STORM":
		# Tick only hazards that existed before this frame. Newly warned zones
		# can NEVER strike on the same simulation step, even under lag.
		for mark in battle["ion_marks"]:
			mark["countdown"] = float(mark["countdown"]) - dt
			if float(mark["countdown"]) <= 0.0:
				_ion_impact(mark)
		battle["ion_marks"] = battle["ion_marks"].filter(func(mark):return float(mark["countdown"]) > 0.0)
		battle["ion_tick"] = float(battle["ion_tick"]) + dt
		while float(battle["ion_tick"]) >= 5.0:
			battle["ion_tick"] = float(battle["ion_tick"]) - 5.0
			var index = int(battle["ion_index"]) % 3
			battle["ion_index"] = int(battle["ion_index"]) + 1
			var zone = battle["zones"][index]
			battle["ion_marks"].append({"x":zone["x"],"y":zone["y"],"radius":float(zone["r"])*0.80,"countdown":ION_WARNING_SECONDS})
			_toast("ION STRIKE INCOMING • " + str(zone["id"]),0.9)
	for scar in battle["scars"]:
		scar["ttl"] = float(scar["ttl"]) - dt
	battle["scars"] = battle["scars"].filter(func(scar):return float(scar["ttl"]) > 0)

func _convoy_step(dt: float) -> void:
	# Second operation: moving world objective, still using the original deployment,
	# champion combat, supply capture, weather, collision and save systems.
	if str(battle.get("operation","SECTOR")) != "CONVOY":
		return
	var cargo: Dictionary = battle["convoy"]
	if bool(cargo.get("complete",false)) or float(cargo["hull"]) <= 0.0:
		return
	var pos = Vector2(float(cargo["x"]),float(cargo["y"]))
	var friends = 0
	var enemies = 0
	var wardens = 0
	for hero in battle["heroes"]:
		if not _alive(hero) or not hero["flight"].is_empty():
			continue
		var distance = pos.distance_to(Vector2(float(hero["x"]),float(hero["y"])))
		if hero["team"] == "blue" and distance < CONVOY_ESCORT_RADIUS:
			friends += 1
			if hero["type"] == "warden":
				wardens += 1
		elif hero["team"] == "red" and distance < CONVOY_INTERCEPT_RADIUS:
			enemies += 1
	cargo["escorts"] = friends
	cargo["interceptors"] = enemies
	if enemies > 0:
		cargo["hull"] = maxf(0.0,float(cargo["hull"]) - dt * (7.0 * enemies))
		if float(cargo["hull"]) <= 0.0:
			_event("ripple",pos,RED,2.9)
			_toast("CONVOY DESTROYED",1.8)
			return
	# Wardens meaningfully repair the objective, not just nearby combatants.
	if wardens > 0:
		cargo["hull"] = minf(CONVOY_MAX_HULL,float(cargo["hull"]) + dt * 3.5 * wardens)
	# A lone escort can make progress; superiority over interceptors earns speed.
	if friends <= 0 or enemies >= friends:
		return
	var speed = (46.0 + 15.0 * minf(float(friends-1),2.0)) * dt
	var target = CONVOY_ROUTE[mini(int(cargo["waypoint"]),CONVOY_ROUTE.size()-1)]
	var delta_pos = target-pos
	if delta_pos.length() <= speed:
		cargo["x"] = target.x
		cargo["y"] = target.y
		cargo["waypoint"] = int(cargo["waypoint"]) + 1
		cargo["checkpoints"] = int(cargo["checkpoints"]) + 1
		cargo["progress"] = float(cargo["checkpoints"]) / float(CONVOY_ROUTE.size()-1)
		_event("ripple",target,BLUE,1.7)
		_burst(target,BLUE,22)
		if int(cargo["waypoint"]) >= CONVOY_ROUTE.size():
			cargo["complete"] = true
			_toast("CARGO EXTRACTED • ROUTE COMPLETE",2.0)
		else:
			battle["energy"]["blue"] = minf(100.0,float(battle["energy"]["blue"]) + 14.0)
			battle["salvage"]["blue"] = int(battle["salvage"]["blue"]) + 1
			battle["score"]["blue"] = float(battle["score"]["blue"]) + 12.0
			_toast("CHECKPOINT %d • +14 ENERGY" % int(cargo["checkpoints"]),1.3)
	else:
		var new_pos = pos+delta_pos.normalized()*speed
		cargo["x"] = new_pos.x
		cargo["y"] = new_pos.y
		cargo["progress"] = clampf((float(int(cargo["waypoint"])-1) + 1.0 - new_pos.distance_to(target) / maxf(1.0,CONVOY_ROUTE[int(cargo["waypoint"])-1].distance_to(target))) / float(CONVOY_ROUTE.size()-1),0,1)
	cargo["pulse"] = float(cargo["pulse"]) + dt


func _beacon_spawn_wave() -> bool:
	var core: Dictionary = battle["beacon"]
	var index = int(core["wave"])
	if index >= BEACON_WAVES.size():
		return false
	var kind: String = BEACON_WAVES[index]
	var slot: Dictionary = battle["slots"]["red"][kind]
	if int(slot["active"]) != 0 or float(slot["ready_at"]) > float(battle["elapsed"]):
		return false
	battle["energy"]["red"] = maxf(float(battle["energy"]["red"]),positive_cost(kind))
	if not _launch("red",kind,BEACON_AT+Vector2(48,-25)):
		return false
	core["wave"] = index + 1
	core["cooldown"] = 0.0
	core["paid"] = false
	battle["enemy_plan"] = "WAVE %d  //  %s" % [index + 1,kind.to_upper()]
	_event("ripple",BEACON_AT,RED,2.8)
	_toast("INCOMING WAVE %d / 3 — %s" % [index+1,kind.to_upper()],2.0)
	return true

func _beacon_hit(damage: float) -> float:
	var core: Dictionary = battle["beacon"]
	if bool(core["complete"]) or float(core["hull"]) <= 0.0:
		return 0.0
	var absorbed = minf(float(core["charge"]),damage * 0.65)
	core["charge"] = maxf(0.0,float(core["charge"])-absorbed)
	var taken = maxf(0.0,damage-absorbed)
	core["hull"] = maxf(0.0,float(core["hull"])-taken)
	core["last_hit"] = 0.35
	_event("impact",BEACON_AT,RED,1.2)
	if float(core["hull"]) <= 0.0:
		_toast("SIGNAL CORE DESTROYED",2.0)
	return taken

func _beacon_step(dt: float) -> void:
	if str(battle.get("operation","SECTOR")) != "BEACON":
		return
	var core: Dictionary = battle["beacon"]
	if bool(core["complete"]) or float(core["hull"]) <= 0.0:
		return
	core["last_hit"] = maxf(0.0,float(core["last_hit"])-dt)
	var raiders = 0
	var defenders = 0
	for hero in battle["heroes"]:
		if not _alive(hero):
			continue
		if hero["team"] == "red":
			raiders += 1  # Every launched invader must be defeated before the next wave.
			if hero["flight"].is_empty() and BEACON_AT.distance_to(Vector2(float(hero["x"]),float(hero["y"]))) < BEACON_DEFENSE_RADIUS:
				hero["beacon_cd"] = maxf(0.0,float(hero.get("beacon_cd",0.0))-dt)
				if float(hero["beacon_cd"]) <= 0.0:
					var strike = 14.0 if hero["type"] == "bulwark" else 9.0 if hero["type"] == "dart" else 6.0
					_beacon_hit(strike)
					hero["beacon_cd"] = 1.1 if hero["type"] == "dart" else 1.5
					if hero["type"] == "warden":
						core["charge"] = maxf(0.0,float(core["charge"])-12.0)
		else:
			if hero["flight"].is_empty() and BEACON_AT.distance_to(Vector2(float(hero["x"]),float(hero["y"]))) < BEACON_DEFENSE_RADIUS:
				defenders += 1
				if hero["type"] == "warden":
					var old_hp = float(core["hull"])
					core["hull"] = minf(BEACON_MAX_HULL,old_hp+dt*4.0)
					core["repairs"] = float(core["repairs"]) + (float(core["hull"])-old_hp)
	core["raiders"] = raiders
	core["defenders"] = defenders
	# Capturing CROSSROADS actively charges the core's damage-absorbing buffer.
	if str(battle["zones"][1]["owner"]) == "blue":
		core["charge"] = minf(60.0,float(core["charge"])+dt*3.0)
	elif str(battle["zones"][1]["owner"]) == "red":
		core["charge"] = maxf(0.0,float(core["charge"])-dt*2.0)
	if float(core["hull"]) <= 0.0:
		return
	if raiders > 0:
		return
	# Clear a wave exactly once: real earned reinforcement and no free completion.
	if int(core["wave"]) > 0 and not bool(core["paid"]):
		core["paid"] = true
		battle["energy"]["blue"] = minf(100.0,float(battle["energy"]["blue"])+12.0)
		battle["salvage"]["blue"] = int(battle["salvage"]["blue"])+2
		core["cooldown"] = 5.0
		_toast("WAVE %d CLEARED • RESUPPLY +12" % int(core["wave"]),1.6)
	core["cooldown"] = float(core["cooldown"])-dt
	if float(core["cooldown"]) <= 0.0:
		if int(core["wave"]) < BEACON_WAVES.size():
			if not _beacon_spawn_wave():
				core["cooldown"] = 0.7
		else:
			core["complete"] = true
			_toast("SIGNAL CORE SECURED • THREE WAVES CLEARED",2.1)
			_event("ripple",BEACON_AT,BLUE,3.1)

func _finish() -> void:
	battle["ended"] = true
	var blue = float(battle["score"]["blue"])
	var red = float(battle["score"]["red"])
	var won = blue >= WIN_SCORE or (float(battle["elapsed"]) >= MATCH_TIME and blue >= red and red < WIN_SCORE)
	if str(battle.get("operation","SECTOR")) == "CONVOY":
		won = bool(battle["convoy"]["complete"]) and float(battle["convoy"]["hull"]) > 0.0
		if won:
			profile["escorts"] = int(profile.get("escorts",0)) + 1
	elif str(battle.get("operation","SECTOR")) == "BEACON":
		won = bool(battle["beacon"]["complete"]) and float(battle["beacon"]["hull"]) > 0.0
		if won:
			profile["defenses"] = int(profile.get("defenses",0))+1
	profile["matches"] = int(profile["matches"]) + 1
	profile["wins" if won else "losses"] = int(profile["wins" if won else "losses"]) + 1
	profile["best"] = maxi(int(profile["best"]),int(round(blue)))
	var scrap = roundi(12.0 + (26.0 if won else 8.0) + float(battle["captures"]["blue"]) * 5.0 + floorf(blue/25.0)*2.0)
	scrap += int(battle.get("salvage",{}).get("blue",0)) * 2
	if str(battle.get("operation","SECTOR")) == "CONVOY" and won:
		scrap += 16
	if str(battle.get("operation","SECTOR")) == "BEACON":
		scrap += int(battle["beacon"]["wave"])*5 + (20 if won else 0)
	profile["scrap"] = int(profile["scrap"]) + scrap
	battle["earned"] = scrap
	battle["won"] = won
	_save_profile()
	_delete_battle_file()
	mode = "result"

func _process(delta: float) -> void:
	var dt = minf(delta,0.05)
	vfx_time += dt
	message_time -= dt
	screenshake = maxf(0.0,screenshake-dt*3)
	for event in combat_events:
		event["age"] = float(event["age"]) + dt
	combat_events = combat_events.filter(func(event):return float(event["age"]) < float(event["ttl"]))
	for f in effects:
		f["ttl"] = float(f["ttl"]) - dt
		f["pos"] = f["pos"] + f["vel"] * dt
		f["vel"] = f["vel"] * 0.95
	effects = effects.filter(func(f):return f["ttl"] > 0)
	for flake in weather:
		flake["x"] = fmod(float(flake["x"]) + float(flake["v"]) * dt,W)
	if mode == "playing":
		battle["elapsed"] = float(battle["elapsed"]) + dt
		battle["energy"]["blue"] = minf(100.0,float(battle["energy"]["blue"]) + dt * (7.2 if int(profile["level"]) >= 3 else 6.2))
		battle["energy"]["red"] = minf(100.0,float(battle["energy"]["red"]) + dt*6.6)
		_enemy_step(dt)
		_combat_step(dt)
		_capture_step(dt)
		_living_field_step(dt)
		_convoy_step(dt)
		_beacon_step(dt)
		if str(battle.get("operation","SECTOR")) == "BEACON":
			if bool(battle["beacon"]["complete"]) or float(battle["beacon"]["hull"]) <= 0.0 or float(battle["elapsed"]) >= MATCH_TIME:
				_finish()
		elif str(battle.get("operation","SECTOR")) == "CONVOY":
			if bool(battle["convoy"]["complete"]) or float(battle["convoy"]["hull"]) <= 0.0 or float(battle["elapsed"]) >= MATCH_TIME:
				_finish()
		elif float(battle["elapsed"]) >= MATCH_TIME or float(battle["score"]["blue"]) >= WIN_SCORE or float(battle["score"]["red"]) >= WIN_SCORE:
			_finish()
		save_timer += dt
		if save_timer > 4.0:
			save_timer = 0.0
			_save_battle()
	queue_redraw()

func _burst(pos: Vector2, col: Color, amount: int) -> void:
	for i in range(mini(amount,48)):
		var angle = rng.randf_range(0,TAU)
		var speed = rng.randf_range(25,165)
		effects.append({"pos":pos,"vel":Vector2.from_angle(angle)*speed,"ttl":rng.randf_range(0.35,0.90),"color":col,"radius":rng.randf_range(2,5)})
	if effects.size() > 240:
		effects = effects.slice(effects.size()-240)

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE and mode in ["playing","paused"]:
			_toggle_pause()
		elif mode == "playing":
			if event.keycode >= KEY_1 and event.keycode <= KEY_3:
				selected = ORDER[event.keycode-KEY_1]
			elif event.keycode == KEY_R and int(profile["level"]) >= 2:
				rally = not rally
		return
	if event is InputEventScreenTouch:
		var p = _to_world(event.position)
		if event.pressed:
			touch_id = event.index
			_pointer_down(p)
		elif event.index == touch_id:
			_pointer_up(p)
			touch_id = -1
		get_viewport().set_input_as_handled()
	elif event is InputEventScreenDrag and event.index == touch_id:
		_pointer_move(_to_world(event.position))
		get_viewport().set_input_as_handled()
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			_pointer_down(_to_world(event.position))
		else:
			_pointer_up(_to_world(event.position))
		get_viewport().set_input_as_handled()
	elif event is InputEventMouseMotion and dragging:
		_pointer_move(_to_world(event.position))

func _to_world(position: Vector2) -> Vector2:
	return (position-world_offset)/world_scale

func _pointer_down(p: Vector2) -> void:
	down_point = p
	aim_point = p
	dragging = true

func _pointer_move(p: Vector2) -> void:
	aim_point = p

func _pointer_up(p: Vector2) -> void:
	if not dragging:
		return
	dragging = false
	aim_point = p
	if not Rect2(0,0,W,H).has_point(p):
		return
	if mode != "playing":
		_process_screen_button(p)
		return
	# UI actions work on a tap / release, while field gestures preserve drag-to-fling.
	if p.y > 608:
		if p.x >= 40 and p.x < 770:
			var index = clampi(int((p.x-40)/244),0,2)
			selected = ORDER[index]
			return
		if p.x >= 777 and p.x < 957:
			_recall(selected)
			return
		if p.x >= 965:
			if int(profile["level"]) >= 2:
				rally = not rally
			else:
				_toast("SIGNAL ROOM UNLOCKS RALLY")
			return
	if p.y < 84 and p.x > 1060:
		_toggle_pause()
		return
	# Direct tap on the power core orders defense, never unintentionally deploys.
	if str(battle.get("operation","SECTOR")) == "BEACON" and p.distance_to(BEACON_AT) < 92.0:
		var any_defender = false
		for hero in battle["heroes"]:
			if hero["team"] == "blue" and _alive(hero) and hero["flight"].is_empty():
				any_defender = true
				break
		if any_defender:
			_issue_order(p)
			return
	# Direct cargo-tap is an escort command if any ally is already deployed;
	# never silently launch a different selected champion instead of obeying.
	if str(battle.get("operation","SECTOR")) == "CONVOY" and p.distance_to(Vector2(float(battle["convoy"]["x"]),float(battle["convoy"]["y"]))) < 100.0:
		var ally_present = false
		for hero in battle["heroes"]:
			if hero["team"] == "blue" and _alive(hero) and hero["flight"].is_empty():
				ally_present = true
				break
		if ally_present:
			_issue_order(p)
			return
	if rally or int(battle["slots"]["blue"][selected]["active"]) != 0:
		_issue_order(p)
		return
	if p.x < 250 or p.x > 956 or p.y < 80 or p.y > 629:
		_toast("AIM FOR THE CONTESTED FIELD")
		return
	if not _launch("blue",selected,p):
		_toast("CHAMPION BUSY / RECOVERING / ENERGY LOW")
	else:
		for candidate in ORDER:
			var slot: Dictionary = battle["slots"]["blue"][candidate]
			if int(slot["active"]) == 0 and float(slot["ready_at"]) <= float(battle["elapsed"]):
				selected = candidate
				break

func _toggle_pause() -> void:
	if mode == "playing":
		mode = "paused"
		_save_battle()
	elif mode == "paused":
		mode = "playing"

func _process_screen_button(p: Vector2) -> void:
	match mode:
		"menu":
			if p.y >= 395 and p.y <= 431 and p.x >= 375 and p.x <= 825:
				operation_selected = OPERATIONS[(OPERATIONS.find(operation_selected)+1) % OPERATIONS.size()]
				return
			if p.y >= 438 and p.y <= 507:
				if p.x >= 224 and p.x <= 460:
					start_battle()
				elif p.x >= 474 and p.x <= 796:
					if resume_available:
						resume_battle()
					else:
						mode = "bunker"
				elif p.x >= 810 and p.x <= 1014:
					mode = "bunker"
		"bunker":
			if p.y >= 520 and p.y <= 593:
				if p.x >= 230 and p.x <= 757:
					_upgrade()
				elif p.x >= 776 and p.x <= 969:
					mode = "menu"
		"paused":
			if p.y >= 430 and p.y <= 515:
				if p.x >= 294 and p.x <= 732:
					mode = "playing"
				elif p.x >= 745 and p.x <= 980:
					mode = "menu"
		"result":
			if p.y >= 445 and p.y <= 532:
				if p.x >= 217 and p.x <= 506:
					start_battle()
				elif p.x >= 516 and p.x <= 866:
					mode = "bunker"
				elif p.x >= 877 and p.x <= 1025:
					mode = "menu"

func _upgrade() -> void:
	var lv = int(profile["level"])
	if lv >= 3:
		_toast("THREE CURRENT ROOMS RESTORED")
		return
	var price = 45 if lv == 1 else 90
	if int(profile["scrap"]) < price:
		_toast("NEED %d SCRAP" % price)
		return
	profile["scrap"] = int(profile["scrap"]) - price
	profile["level"] = lv + 1
	_save_profile()
	_toast("NEW ROOM RESTORED")

func _exit_tree() -> void:
	_save_battle()

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_PAUSED and mode == "playing":
		_toggle_pause()

# Rendering — no external textures needed. Everything remains offline.
func _rect(x: float,y: float,w: float,h: float,color: Color,outline = Color.TRANSPARENT,thick = 1.0) -> void:
	draw_rect(Rect2(x,y,w,h),color,true)
	if outline.a > 0.0:
		draw_rect(Rect2(x,y,w,h),outline,false,thick)

func _circle(p: Vector2,radius:float,col:Color) -> void:
	draw_circle(p,radius,col)

func _line(a:Vector2,b:Vector2,col:Color,thickness=1.0) -> void:
	draw_line(a,b,col,thickness,true)

func _poly(v:Array,col:Color) -> void:
	draw_colored_polygon(PackedVector2Array(v),col)

func _txt(content:String,x:float,y:float,size_px:int,col:Color=SAND,center=true) -> void:
	var font: Font = ThemeDB.fallback_font
	if center:
		draw_string(font,Vector2(x-450,y),content,HORIZONTAL_ALIGNMENT_CENTER,900,size_px,col)
	else:
		draw_string(font,Vector2(x,y),content,HORIZONTAL_ALIGNMENT_LEFT,-1,size_px,col)

func _panel(rect:Rect2,fill:Color=Color("142b36"),edge:Color=Color("567174")) -> void:
	_rect(rect.position.x,rect.position.y,rect.size.x,rect.size.y,fill,edge,1.5)
	_line(rect.position+Vector2(9,8),rect.position+Vector2(43,8),BLUE.darkened(0.15),2.0)

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO,last_view),NIGHT)
	draw_set_transform(world_offset,0,Vector2.ONE*world_scale)
	_draw_land()
	if battle.has("zones") and mode in ["playing","paused","result"]:
		_draw_scars()
		_draw_ion_telegraphs()
		_draw_zones()
		_draw_convoy()
		_draw_beacon()
		_draw_champions()
		_draw_combat_events()
		if dragging and mode == "playing" and down_point.y < 607:
			_draw_arc(aim_point)
	for fx in effects:
		_circle(fx["pos"],fx["radius"] * maxf(0.1,fx["ttl"]),Color(fx["color"].r,fx["color"].g,fx["color"].b,clampf(float(fx["ttl"]),0,1)))
	if mode == "playing":
		_draw_hud()
	else:
		_draw_overlay()
	if message_time > 0 and mode == "playing":
		_panel(Rect2(350,90,500,43),Color("1c3540"),BLUE)
		_txt(message,600,118,18,BLUE)
	draw_set_transform(Vector2.ZERO,0,Vector2.ONE)
	if last_view.y > last_view.x:
		draw_string(ThemeDB.fallback_font,Vector2(14,maxf(28,world_offset.y-8)),"SLINGFALL • TURN LANDSCAPE FOR LARGER CONTROLS",HORIZONTAL_ALIGNMENT_LEFT,-1,13,SAND)

func _draw_land() -> void:
	_rect(0,0,W,H,Color("102a32"))
	# Atmospheric sky / ridge silhouettes
	_poly([Vector2(0,0),Vector2(1200,0),Vector2(1200,185),Vector2(1050,145),Vector2(890,170),Vector2(760,126),Vector2(610,159),Vector2(457,122),Vector2(312,154),Vector2(110,113),Vector2(0,151)],Color("182f3a"))
	_circle(Vector2(1007,88),57,Color("b69a75",0.10))
	_circle(Vector2(1007,88),38,Color("f5bd7c",0.15))
	for i in range(9):
		var y = 178.0+i*55
		var tint = Color("3b443b") if i%2==0 else Color("34443f")
		_rect(0,y,1200,55,tint.darkened(i*0.025))
	for i in range(37):
		var x = float((i*149+51)%1200)
		var y = float(151+(i*239)%510)
		_line(Vector2(x,y),Vector2(x+75,y+8),Color("948769",0.16),2.0)
		_circle(Vector2(x+16,y-9),float(5+i%6),Color("547062",0.33))
	# Animated remote searchlights and signal routes behind the active battlefield.
	for tower in [Vector2(330,161),Vector2(847,143)]:
		var sweep = sin(vfx_time*0.5 + tower.x*0.01)
		_poly([tower, tower+Vector2(-35+sweep*35,405),tower+Vector2(98+sweep*55,405)],Color("a0ccbf",0.025))
		_rect(tower.x-7,tower.y-30,14,45,Color("26383e"),Color("7f9d91"),1.4)
		_circle(tower+Vector2(0,-33),9,Color("ffe8a3",0.48))
	# Worn central thoroughfare and scoring landmarks
	_poly([Vector2(280,305),Vector2(950,273),Vector2(950,419),Vector2(280,436)],Color("786e55",0.15))
	for i in range(13):
		var y = 160.0+i*34
		_line(Vector2(268,y),Vector2(927,y+10),Color("c5bc8f",0.055),1.0)
	# Trenches and launch decks
	for side in [0,1]:
		var x = 0.0 if side==0 else 982.0
		_rect(x,0,218,700,Color("102e39") if side==0 else Color("44302c"),Color("345c60") if side==0 else Color("6a5149"),3.0)
		for i in range(13):
			var y = float(i*62-9)
			_line(Vector2(x+16,y),Vector2(x+203,y+23),Color("9c9580",0.16),6)
			_line(Vector2(x+20,y+8),Vector2(x+203,y+31),Color("101b25",0.25),2)
		var c = BLUE if side==0 else RED
		_rect(x+46,310,129,67,Color("10222d"),c.darkened(0.4),3)
		_circle(Vector2(x+111,347),46,Color(c.r,c.g,c.b,0.12))
		_circle(Vector2(x+111,347),30,c.darkened(0.4))
		_circle(Vector2(x+111,347),21,Color("253840"))
		for a in range(8):
			var direction = Vector2.from_angle(a*TAU/8.0)
			_line(Vector2(x+111,347)+direction*19,Vector2(x+111,347)+direction*31,c,3)
	# Barbed-wire frames (deliberately physical instead of flat dividers)
	for gx in [269.0,936.0]:
		_line(Vector2(gx,103),Vector2(gx,586),Color("151d24"),9)
		_line(Vector2(gx+10,103),Vector2(gx+10,586),Color("abb0a0",0.5),2)
		for y in range(116,580,29):
			_line(Vector2(gx-13,y),Vector2(gx+24,y+13),Color("c6b99b",0.7),1.6)
			_line(Vector2(gx-12,y+13),Vector2(gx+24,y),Color("cab08f",0.6),1.5)
	var active_weather = str(battle.get("field_event", "CLEAR")) if battle.has("field_event") else "CLEAR"
	for flake in weather:
		var source = Vector2(float(flake["x"]),float(flake["y"]))
		if active_weather == "ION STORM":
			_line(source,source+Vector2(-17,18),Color("9bcce4",0.30),1.6)
		elif active_weather == "CROSSWIND":
			_line(source,source+Vector2(25,4),Color("e8dbbb",0.28),1.4)
		else:
			_circle(source,float(flake["r"]),Color("dddbbb",0.18))
	if active_weather == "ION STORM":
		_rect(215,111,764,495,Color(0.13,0.24,0.37,0.085+0.025*sin(vfx_time*8)))
		for e in range(10):
			var px = 268.0+float((e*157)%650)
			var py = 140.0+float((e*167)%420)
			_line(Vector2(px,py),Vector2(px+5,py+22),Color("b7d8e6",0.14),1.0)
	elif active_weather == "CROSSWIND":
		_rect(215,111,764,495,Color(0.67,0.50,0.32,0.055))
	# Destructible cover: never purely decorative—health, cracks and rubble mirror game state.
	if battle.has("cover"):
		for cover in battle["cover"]:
			var pos = Vector2(float(cover["x"]),float(cover["y"]))
			var radius = float(cover["radius"])
			var health = float(cover["hp"]) / maxf(1.0,float(cover["maxhp"]))
			if cover.get("destroyed",false):
				_poly([pos+Vector2(-radius,-2),pos+Vector2(-radius*0.45,-13),pos+Vector2(4,-5),pos+Vector2(radius*0.75,-15),pos+Vector2(radius,2),pos+Vector2(17,13),pos+Vector2(-radius*0.60,12)],Color("554a43"))
				for shard in range(4):
					var off = float(shard*19-28)
					_line(pos+Vector2(off,-4),pos+Vector2(off+7,9),Color("edb983",0.38),2)
				continue
			var r = radius
			_poly([pos+Vector2(-r,-r*0.42),pos+Vector2(r*0.75,-r*0.52),pos+Vector2(r,-r*0.24),pos+Vector2(r*0.94,r*0.44),pos+Vector2(-r*0.85,r*0.43)],Color("283d40"))
			_poly([pos+Vector2(-r,-r*0.46),pos+Vector2(-r*0.70,-r*0.75),pos+Vector2(r*0.65,-r*0.76),pos+Vector2(r,-r*0.44),pos+Vector2(r*0.90,r*0.20),pos+Vector2(-r*0.90,r*0.20)],Color("768078").darkened((1.0-health)*0.37))
			_line(pos+Vector2(-r*0.77,-r*0.49),pos+Vector2(r*0.70,-r*0.54),Color("dfd3ad",0.58),3)
			for n in range(3):
				var sx = -r*0.5+float(n)*r*0.52
				_line(pos+Vector2(sx,-r*0.41),pos+Vector2(sx+6+(1.0-health)*12,r*0.11),Color("1b292c",0.5+(1.0-health)*0.45),1.5+(1.0-health)*1.9)
			_rect(pos.x-r*0.66,pos.y+r*0.27,r*1.32,5,Color("16282b"))
			_rect(pos.x-r*0.64,pos.y+r*0.29,r*1.28*health,3,Color("f5c982"))

func _draw_convoy() -> void:
	if str(battle.get("operation","SECTOR")) != "CONVOY":
		return
	var cargo: Dictionary = battle["convoy"]
	for i in range(CONVOY_ROUTE.size()-1):
		var route_color = Color("c1a97c",0.36) if i >= int(cargo["waypoint"]) else Color(BLUE.r,BLUE.g,BLUE.b,0.48)
		_line(CONVOY_ROUTE[i],CONVOY_ROUTE[i+1],route_color,9)
		_line(CONVOY_ROUTE[i],CONVOY_ROUTE[i+1],Color("253c40"),4)
	for i in range(1,CONVOY_ROUTE.size()):
		var node = CONVOY_ROUTE[i]
		_circle(node,17,BLUE if i <= int(cargo["checkpoints"]) else Color("847d6a"))
		_circle(node,10,Color("152b32"))
		_txt(str(i),node.x,node.y+5,15,SAND)
	var p = Vector2(float(cargo["x"]),float(cargo["y"]))
	var hp_fraction = float(cargo["hull"]) / CONVOY_MAX_HULL
	var phase = vfx_time*6.5
	_circle(p+Vector2(0,15),52,Color("081820",0.50))
	_circle(p,61,Color(BLUE.r,BLUE.g,BLUE.b,0.04+0.04*sin(phase)))
	# A cargo vehicle with an unmistakable silhouette, actual animated running gear,
	# illuminated cabin, convoy crest and destructible health indicator.
	for dx in [-31.0,31.0]:
		_circle(p+Vector2(dx,21),17,Color("101e26"))
		_circle(p+Vector2(dx,21),9,Color("c7b78c"))
		_line(p+Vector2(dx-7,21),p+Vector2(dx+7,21),Color("263841"),3)
	_poly([p+Vector2(-53,5),p+Vector2(-45,-22),p+Vector2(-18,-29),p+Vector2(45,-27),p+Vector2(58,-8),p+Vector2(50,19),p+Vector2(-46,19)],Color("8e9582"))
	_poly([p+Vector2(-46,-16),p+Vector2(-16,-38),p+Vector2(20,-38),p+Vector2(37,-20),p+Vector2(36,-11),p+Vector2(-42,-8)],Color("314d50"))
	_poly([p+Vector2(-13,-35),p+Vector2(16,-35),p+Vector2(29,-19),p+Vector2(-20,-19)],Color("68c6bb",0.85))
	_rect(p.x-31,p.y-9,62,13,Color("32444a"),Color("b8c8af"),2)
	_circle(p+Vector2(0,-8),9,BLUE)
	_line(p+Vector2(-10,-8),p+Vector2(10,-8),Color("132c33"),3)
	_line(p+Vector2(0,-18),p+Vector2(0,2),Color("132c33"),3)
	if int(cargo["interceptors"]) > 0:
		draw_arc(p,69,0,TAU,40,RED,4.0)
	if int(cargo["escorts"]) > 0:
		draw_arc(p,72,PI,TAU*1.85,40,BLUE,3.0)
	_rect(p.x-53,p.y-64,106,10,Color("10252b"),Color("718b82"),1.3)
	_rect(p.x-51,p.y-62,102*hp_fraction,6,BLUE if hp_fraction > 0.35 else RED)
	_txt("CARGO %d%%" % roundi(hp_fraction*100),p.x,p.y-73,13,SAND)

func _draw_beacon() -> void:
	if str(battle.get("operation","SECTOR")) != "BEACON":
		return
	var core: Dictionary = battle["beacon"]
	var energy: float = clampf(float(core["charge"])/60.0,0.0,1.0)
	var health: float = clampf(float(core["hull"])/BEACON_MAX_HULL,0.0,1.0)
	var breathing = sin(vfx_time*3.5)
	var p = BEACON_AT
	# Raised signal-platform, three-dimensional pedestal, live conduit flow.
	_circle(p+Vector2(0,18),101,Color("06121b",0.6))
	for i in range(3):
		var phase = fmod(vfx_time*(0.19+i*0.06),1.0)
		draw_arc(p,61+i*13+phase*10,0,TAU,60,Color(BLUE.r,BLUE.g,BLUE.b,(0.18+energy*0.22)*(1.0-phase)),2.2)
	_poly([p+Vector2(-48,19),p+Vector2(-34,-24),p+Vector2(30,-25),p+Vector2(49,18),p+Vector2(30,43),p+Vector2(-30,43)],Color("213b40"))
	_poly([p+Vector2(-33,-27),p+Vector2(-17,-52),p+Vector2(18,-52),p+Vector2(34,-27),p+Vector2(18,1),p+Vector2(-18,1)],Color("819c9b").darkened((1.0-health)*0.4))
	_poly([p+Vector2(-15,-62),p+Vector2(0,-85-breathing*4),p+Vector2(15,-62),p+Vector2(0,-41)],Color(BLUE.r,BLUE.g,BLUE.b,0.75+energy*0.25))
	_line(p+Vector2(-24,-38),p+Vector2(24,-38),Color("e7d6a8"),3)
	for side in [-1,1]:
		var px = p.x + 53.0*side
		_poly([Vector2(px-14,p.y+7),Vector2(px-15,p.y-38),Vector2(px,p.y-55),Vector2(px+15,p.y-38),Vector2(px+15,p.y+8)],Color("536d70"))
		_circle(Vector2(px,p.y-35),7.0+breathing*1.3,BLUE if health>0.30 else RED)
	if float(core["last_hit"]) > 0.0:
		_circle(p,68,Color(1,0.32,0.25,0.3*float(core["last_hit"])/0.35))
	_rect(p.x-65,p.y-104,130,11,Color("0a222c"),SAND,1.2)
	_rect(p.x-63,p.y-102,126*health,7,BLUE if health>0.34 else RED)
	_rect(p.x-65,p.y-90,130*energy,3,Color("ffe29d"))
	_txt("SIGNAL CORE  •  %d%%" % roundi(health*100),p.x,p.y-115,13,SAND)
	_txt("WAVE %d / 3  •  RAIDERS %d" % [int(core["wave"]),int(core["raiders"])],p.x,p.y+66,14,BLUE if int(core["raiders"])==0 else RED)

func _draw_ion_telegraphs() -> void:
	for mark in battle.get("ion_marks",[]):
		var p = Vector2(float(mark["x"]),float(mark["y"]))
		var r = float(mark["radius"])
		var remaining = clampf(float(mark["countdown"]) / ION_WARNING_SECONDS,0,1)
		var pulse = 0.20+0.20*sin(vfx_time*17.0)
		_circle(p,r,Color(0.66,0.83,1.0,0.10+pulse*0.20))
		draw_arc(p,r,0,TAU,60,Color("aee9ff",0.45+0.5*(1.0-remaining)),4.5)
		_line(p+Vector2(-r,0),p+Vector2(r,0),Color("cbefff",0.70),2.4)
		_line(p+Vector2(0,-r),p+Vector2(0,r),Color("cbefff",0.70),2.4)
		_txt("ION %.1f" % float(mark["countdown"]),p.x,p.y-45,15,Color("ccefff"))

func _draw_scars() -> void:
	for scar in battle.get("scars",[]):
		var p = Vector2(float(scar["x"]),float(scar["y"]))
		var r = float(scar["radius"])
		var a = clampf(float(scar["ttl"]) / SCAR_LIFETIME,0,1)
		_circle(p,r,Color(0.06,0.10,0.12,0.33*a))
		draw_arc(p,r,0,TAU,42,Color(0.95,0.55,0.28,0.40*a),3)
		for j in range(7):
			var dir = Vector2.from_angle(j*TAU/7.0)
			_line(p+dir*12,p+dir*(r*(0.52+0.10*(j%3))),Color(0.97,0.67,0.33,a*0.35),2)

func _draw_combat_events() -> void:
	for e in combat_events:
		var p: Vector2 = e["p"]
		var c: Color = e["color"]
		var u = clampf(float(e["age"]) / float(e["ttl"]),0,1)
		var a = 1.0-u
		var sz = float(e["size"])
		match e["kind"]:
			"number":
				_txt("-%d" % int(e.get("value",0)),p.x,p.y-28*u,17,Color(c.r,c.g,c.b,a))
			"ripple":
				draw_arc(p,10+90*u*sz,0,TAU,48,Color(c.r,c.g,c.b,a*0.85),maxf(1.0,6.0*a))
				_circle(p,14+45*u*sz,Color(c.r,c.g,c.b,0.08*a))
			"slash":
				draw_arc(p,25+18*u*sz,-PI*0.72+u,-PI*0.08+u,24,Color(c.r,c.g,c.b,a),5*a+1)
				draw_arc(p,32+19*u*sz,PI*0.18+u,PI*0.65+u,24,Color(1,0.94,0.62,a*0.75),3*a+1)
			"link":
				for n in range(4):
					var dir = Vector2.from_angle(float(n)*TAU/4+vfx_time)
					_line(p+dir*(6+9*u),p+dir*(21+20*u),Color(c.r,c.g,c.b,a),3)
			"impact":
				_circle(p,25*u*sz+6,Color(1,0.75,0.35,0.26*a))
				for n in range(7):
					var dir = Vector2.from_angle(n*TAU/7)
					_line(p+dir*(8+10*u),p+dir*(21+24*u)*sz,Color(c.r,c.g,c.b,a),3)

func _draw_zones() -> void:
	for z in battle["zones"]:
		var pos = _zone_position(z)
		var r = float(z["r"])
		var ctrl = float(z["control"])
		var c = BLUE if ctrl >= 0 else RED
		_circle(pos,r+17,Color(c.r,c.g,c.b,0.085))
		# Landmarks read differently at a glance, not three identical circles.
		if z["id"] == "RIDGE":
			_poly([pos+Vector2(-17,-45),pos+Vector2(0,-62),pos+Vector2(17,-45),pos+Vector2(11,-28),pos+Vector2(-11,-28)],Color("987c64",0.45))
			_line(pos+Vector2(0,-64),pos+Vector2(0,-77),Color("e7cc89",0.74),2)
		elif z["id"] == "CROSSROADS":
			for off in [-1,1]:
				_line(pos+Vector2(-27,off*24),pos+Vector2(27,-off*24),Color("b6a076",0.24),7)
		elif z["id"] == "SUPPLY":
			for side in [-1,1]:
				_rect(pos.x+side*26-11,pos.y-51,22,20,Color("886e52",0.66),Color("d5bd8d",0.52),1)
				_circle(pos+Vector2(side*26,-53),4,Color(c.r,c.g,c.b,0.7))
		_circle(pos,r,Color("121c23",0.46))
		draw_arc(pos,r,0,TAU,70,Color("bba981",0.38),3.0,true)
		if absf(ctrl) > 0.5:
			draw_arc(pos,r+6,-PI/2,-PI/2+TAU*(absf(ctrl)/100.0),64,c,7.0,true)
		_circle(pos,35,Color(c.r,c.g,c.b,0.09))
		for i in range(8):
			var a = float(i)/8*TAU + vfx_time*0.06
			var st = pos+Vector2.from_angle(a)*float(r-5)
			_line(st,st+Vector2.from_angle(a)*8,Color("e0cc9d",0.6),2)
		_txt(z["id"],pos.x,pos.y-5,16,SAND)
		_txt("%s %d%%" % ["BLUE" if ctrl>=0 else "RED",roundi(absf(ctrl))],pos.x,pos.y+19,12,c)
		_circle(pos+Vector2(0,35),4,c)

func _draw_arc(target:Vector2) -> void:
	var origin = Vector2(155,345)
	if battle.has("heroes") and int(battle["slots"]["blue"][selected]["active"]) != 0:
		return
	if target.x < 250 or target.x > 956 or target.y < 70 or target.y > 620:
		return
	var duration = clampf(origin.distance_to(target)/385.0,1.03,2.25)
	var drift = CROSSWIND_DRIFT if battle.get("field_event","CLEAR") == "CROSSWIND" else 0.0
	var actual = target + Vector2(drift,0.0)
	for i in range(28):
		var u = float(i)/27
		var p = origin.lerp(actual,u)
		p.y -= 515*duration*duration*0.5*u*(1.0-u)*0.57
		_circle(p,4.8-u*2.5,Color(BLUE.r,BLUE.g,BLUE.b,0.42+u*0.55))
	_circle(actual,20,Color(BLUE.r,BLUE.g,BLUE.b,0.20))
	draw_arc(actual,24,vfx_time*2,vfx_time*2+5.2,25,BLUE,2.8)
	if drift != 0.0:
		_line(target,actual,Color("f9ce84",0.92),2.0)
		_txt("WIND +26",actual.x,actual.y-36,12,Color("f9ce84"))

func _draw_champions() -> void:
	var sorted: Array = battle["heroes"].duplicate()
	sorted.sort_custom(func(a,b):return float(a["y"]) < float(b["y"]))
	for h in sorted:
		if h.get("leaving",false):
			continue
		_draw_champion(h)

func _draw_champion(h: Dictionary) -> void:
	var kind: String = h["type"]
	var team: String = h["team"]
	var c = _team_color(team)
	var airborne = not h["flight"].is_empty()
	var x = float(h["x"])
	var ground = float(h["y"])
	var z = float(h["z"])
	var y = ground-z*0.57
	# Airborne ghost trail and post-landing shadow
	if airborne:
		var idx = 0
		for tr in h["trail"]:
			var a = float(idx+1)/maxf(1,h["trail"].size())
			_circle(Vector2(float(tr[0]),float(tr[1])-float(tr[2])*0.57-22),5+a*5,Color(c.r,c.g,c.b,a*0.18))
			idx += 1
	_circle(Vector2(x,ground+9),25+z*0.05,Color("090d18",0.30 if airborne else 0.50))
	# Movement-aware gait (idle breathing differs from fast traversal); attack recoil adds weight.
	var moving: bool = bool(h.get("moving",false))
	var gait = sin(vfx_time*(18.0 if kind=="dart" else 10.0)+float(h["anim"])) * (5.7 if moving and not airborne else 1.2 if not airborne else 1.0)
	var pose = Vector2(x,y-30+gait)
	var body = Color("83938d") if kind=="bulwark" else Color("497d80") if kind=="dart" else Color("9faeb3")
	var cloak = Color("255b60") if team=="blue" else Color("924638")
	if float(h.get("signature",0.0)) > 0:
		var flare = 0.22 + sin(vfx_time*20)*0.11
		_circle(pose,48,Color(c.r,c.g,c.b,flare))
	if float(h["shield"]) > 0:
		_circle(pose,40+sin(vfx_time*6)*2,Color(c.r,c.g,c.b,0.17))
		draw_arc(pose,40,0,TAU,48,Color(c.r,c.g,c.b,0.58),2.4)
	# Boots / independently articulated legs
	for flip in [-1,1]:
		var px = pose.x+float(flip)*11
		_poly([Vector2(px-7,pose.y+21),Vector2(px+5,pose.y+21),Vector2(px+7+gait*flip*0.4,pose.y+42),Vector2(px-9,pose.y+43)],Color("182b35"))
		_rect(px-10,pose.y+39,19,8,Color("0d1c25"))
	# cloak, armor and silhouette
	_poly([pose+Vector2(-22,-14),pose+Vector2(16,-18),pose+Vector2(32,30),pose+Vector2(0,32),pose+Vector2(-30,22)],cloak)
	_rect(pose.x-19,pose.y-17,38,41,body,Color("22303c"),3)
	_rect(pose.x-18,pose.y-14,36,9,c.darkened(0.28))
	if kind == "bulwark":
		# Heavy, squat titan plating + shield gauntlets + dorsal cannon
		_poly([pose+Vector2(-28,-20),pose+Vector2(-12,-34),pose+Vector2(17,-34),pose+Vector2(30,-19),pose+Vector2(11,-10),pose+Vector2(-10,-10)],Color("bcc3a6"))
		_rect(pose.x-37,pose.y-15,19,37,Color("8d968a"),Color("202f39"),2)
		_rect(pose.x+18,pose.y-15,19,37,Color("8d968a"),Color("202f39"),2)
		_rect(pose.x-26,pose.y-8,52,7,Color("284652"))
		_rect(pose.x-7,pose.y-40,14,17,Color("464d4d"))
		_circle(pose+Vector2(0,1),9,Color(c.r,c.g,c.b,0.7))
		_line(pose+Vector2(-27,-9),pose+Vector2(-36,-17),c,3)
	elif kind == "dart":
		# Arrowhead cowl, far thinner frame, paired electric blades
		_poly([pose+Vector2(-17,-38),pose+Vector2(0,-68),pose+Vector2(19,-37)],c.darkened(0.45))
		_poly([pose+Vector2(-8,-44),pose+Vector2(0,-57),pose+Vector2(8,-44)],Color("deede4"))
		for sign in [-1,1]:
			_line(pose+Vector2(sign*19,-7),pose+Vector2(sign*35,-35+gait),Color("f7dca3"),4)
			_line(pose+Vector2(sign*35,-35+gait),pose+Vector2(sign*41,-47+gait),c,5)
		_line(pose+Vector2(-12,17),pose+Vector2(12,17),Color("1a3d3e"),4)
	else:
		# Warden staff, luminous aegis to the side, hood and medical insignia
		_circle(pose+Vector2(26,-1),23,Color(c.r,c.g,c.b,0.36))
		_circle(pose+Vector2(26,-1),17,Color("203944"))
		draw_arc(pose+Vector2(26,-1),18,0,TAU,34,Color("dce7bc"),2.4)
		_line(pose+Vector2(18,-1),pose+Vector2(34,-1),SAND,4)
		_line(pose+Vector2(26,-9),pose+Vector2(26,7),SAND,4)
		_line(pose+Vector2(-24,24),pose+Vector2(-33,-59),Color("b1ac8d"),4)
		_circle(pose+Vector2(-33,-60),10,Color(c.r,c.g,c.b,0.7))
		_poly([pose+Vector2(-16,-37),pose+Vector2(0,-51),pose+Vector2(16,-37)],Color("b3b2a0"))
	# Each silhouette carries an animated class-specific accessory.
	if kind == "bulwark":
		_poly([pose+Vector2(-9,-47),pose+Vector2(0,-63),pose+Vector2(9,-47)],Color("e0ca96"))
		_line(pose+Vector2(-29,-14),pose+Vector2(-33,-34-sin(vfx_time*4)*2),Color("d1b888"),6)
	elif kind == "dart":
		_line(pose+Vector2(-15,-23),pose+Vector2(-37-gait,-10),Color("87e3c5",0.8),3)
		_line(pose+Vector2(13,-23),pose+Vector2(38+gait,-12),Color("f4dba0",0.8),3)
	else:
		for i in range(3):
			var orb = pose+Vector2.from_angle(vfx_time*1.8+i*TAU/3.0)*Vector2(32,19)+Vector2(0,-21)
			_circle(orb,3.2,Color(c.r,c.g,c.b,0.72))
	# Face and identifying visor
	_circle(pose+Vector2(0,-29),16,Color("1a303a"))
	_circle(pose+Vector2(0,-28),12,Color("bea98d"))
	_rect(pose.x-13,pose.y-34,26,8,c.darkened(0.45))
	_line(pose+Vector2(-7,-27),pose+Vector2(7,-27),Color("f3eed3"),2.0)
	if float(h.get("attack",0.0)) > 0:
		var strike = clampf(float(h["attack"]) / 0.22,0,1)
		if kind == "bulwark":
			_circle(pose+Vector2(29,-4),14+strike*18,Color(c.r,c.g,c.b,0.24*strike))
			draw_arc(pose+Vector2(29,-4),32,-PI*0.57,PI*0.42,25,Color("f7d68a",strike),6)
		elif kind == "dart":
			for r in range(2):
				_line(pose+Vector2(-45,-40+r*23),pose+Vector2(48,-14-r*23),Color(c.r,c.g,c.b,strike),4)
		else:
			draw_arc(pose+Vector2(26,-1),30+strike*10,0,TAU,32,Color(c.r,c.g,c.b,strike*0.8),3)
			_line(pose+Vector2(-33,-59),pose+Vector2(16,-12),Color("e9edc4",strike),3)
	if float(h.get("flash",0.0)) > 0:
		_circle(pose,29,Color(1,1,1,0.2))
	if not airborne:
		_rect(x-27,ground-68,54,7,Color("16262b"),Color("111e23"),1)
		_rect(x-25,ground-66,50*clampf(float(h["hp"])/float(h["maxhp"]),0,1),3,c)
		# Signature gauge, three strikes to a role-specific consequence.
		for tick in range(3):
			_rect(x-25+tick*17,ground-76,15,3,Color("f9d887") if tick < int(h.get("combo",0)) else Color("2c434b"))

func _draw_hud() -> void:
	_panel(Rect2(17,12,273,73))
	_txt("SLINGFALL",30,49,31,SAND,false)
	_txt("CONVOY FRONT  /  %s" % str(battle.get("operation","SECTOR")),30,73,12,BLUE,false)
	_panel(Rect2(395,12,409,73))
	_txt(str(roundi(battle["score"]["blue"])),450,51,30,BLUE)
	_txt("vs",600,48,18,SAND)
	_txt(str(roundi(battle["score"]["red"])),750,51,30,RED)
	_txt("%02d:%02d  •  %s" % [int(int(maxf(0,MATCH_TIME-float(battle["elapsed"]))) / 60),int(maxf(0,MATCH_TIME-float(battle["elapsed"]))) % 60,"ESCORT CARGO" if str(battle.get("operation","SECTOR")) == "CONVOY" else "DEFEND CORE" if str(battle.get("operation","SECTOR")) == "BEACON" else "HOLD ZONES"],600,76,14,SAND)
	_panel(Rect2(836,12,212,73))
	_txt("ENERGY",851,38,12,SAND,false)
	_txt(str(battle.get("field_event","CLEAR")),851,81,11,Color("f3d08a"),false)
	var intact = 0
	for cover in battle.get("cover",[]):
		if not cover.get("destroyed",false):
			intact += 1
	_txt("COVER %d/4  •  %s" % [intact,str(battle.get("enemy_plan","CONTEST"))],310,108,12,Color("f0d6a7"),false)
	if str(battle.get("operation","SECTOR")) == "CONVOY":
		var cargo: Dictionary = battle["convoy"]
		_txt("OPERATION CONVOY  •  ROUTE %d%%  •  ESCORT %d / INTERCEPT %d" % [roundi(100.0*float(cargo["progress"])),int(cargo["escorts"]),int(cargo["interceptors"])],306,129,13,BLUE,false)
	if str(battle.get("operation","SECTOR")) == "BEACON":
		var core: Dictionary = battle["beacon"]
		_txt("BEACON %d%%  •  WAVE %d/3  •  CHARGE %d" % [roundi(float(core["hull"])/BEACON_MAX_HULL*100),int(core["wave"]),roundi(core["charge"])],306,129,13,BLUE,false)
	_rect(851,50,180,16,Color("09171c"),Color("6f9790"),1)
	_rect(853,52,176*float(battle["energy"]["blue"])/100.0,12,BLUE)
	_txt(str(roundi(battle["energy"]["blue"])),1016,38,17,BLUE)
	_panel(Rect2(1063,12,120,73),Color("3e3030"),RED)
	_txt("Ⅱ PAUSE",1122,57,17,SAND)
	# Lower selection HUD: all buttons tap-sized in a horizontal layout.
	_rect(0,605,1200,95,Color("091923",0.94),Color("698c89",0.64),2)
	for i in range(3):
		var kind: String = ORDER[i]
		var x = 40.0+i*244.0
		var highlighted = kind == selected
		var edge = BLUE if highlighted else Color("4e7778")
		_panel(Rect2(x,618,229,70),Color("1d3943") if highlighted else Color("152b32"),edge)
		var tex = portrait_textures.get(kind)
		if tex is Texture2D:
			draw_texture_rect(tex,Rect2(x+7,620,61,65),false)
		var slot:Dictionary = battle["slots"]["blue"][kind]
		var label = "READY • %d ENERGY" % int(positive_cost(kind))
		if int(slot["active"]) != 0:
			label = "ON FIELD"
		elif float(slot["ready_at"]) > float(battle["elapsed"]):
			label = "RECOVER %.0fs" % maxf(0,float(slot["ready_at"])-float(battle["elapsed"]))
		_txt(kind.to_upper(),x+79,647,17,SAND,false)
		_txt(label,x+79,675,12,BLUE if label.begins_with("READY") else Color("c8b18a"),false)
	_panel(Rect2(780,618,174,70),Color("253539"),SAND)
	_txt("↶ RECALL",868,660,20,SAND)
	_panel(Rect2(966,618,200,70),Color("293a40"),BLUE if rally else Color("627d7a"))
	_txt("SQUAD RALLY" if int(profile["level"]) >= 2 else "RALLY LOCKED",1066,660,17,BLUE if rally else SAND)
	if float(battle["elapsed"]) < 12:
		_txt("TAP CORE TO DEFEND  •  CLEAR 3 WAVES  •  CAPTURE CROSSROADS TO CHARGE" if str(battle.get("operation","SECTOR")) == "BEACON" else "TAP CARGO TO ESCORT  •  TAP A ZONE TO REASSIGN  •  FLING CHAMPIONS" if str(battle.get("operation","SECTOR")) == "CONVOY" else "SELECT A HERO  •  DRAG / TAP FIELD TO FLING  •  TAP A ZONE TO ORDER",600,591,13,SAND)

func _draw_overlay() -> void:
	_rect(0,0,W,H,Color("091721",0.80))
	_panel(Rect2(160,98,880,525),Color("122832",0.94),Color("93aa9b"))
	if mode == "menu":
		_txt("JM  //  FRONTLINE SYSTEMS",600,148,15,BLUE)
		_txt("SLINGFALL",600,221,59,SAND)
		_txt("BEACONFALL  //  THREE OPERATIONS",600,252,22,BLUE)
		_txt("Capture territory. Escort cargo. Defend the signal core from three raids.",600,310,17,SAND)
		_txt("BULWARK = SHOCKWAVE     •     DART = QUICK CLAIM     •     WARDEN = AEGIS + HEAL",600,344,15,Color("9bcac2"))
		_txt("%d WINS     •     %d SCRAP     •     %d ESCORTS     •     BUNKER %d" % [profile["wins"],profile["scrap"],profile.get("escorts",0),profile["level"]],600,378,17,SAND)
		_panel(Rect2(375,395,450,37),Color("213d40"),BLUE)
		_txt("◀   MISSION: %s   ▶" % ("BEACON DEFENSE" if operation_selected == "BEACON" else "CONVOY EXTRACTION" if operation_selected == "CONVOY" else "CLASSIC ZONE SIEGE"),600,420,17,BLUE)
		_panel(Rect2(224,438,236,69),Color("1c604f"),BLUE)
		_txt("▶ DEPLOY",342,481,23,SAND)
		_panel(Rect2(474,438,322,69),Color("24444b"),BLUE)
		_txt("↻ RESUME MATCH" if resume_available else "▤ COMMAND BUNKER",635,480,19,SAND)
		_panel(Rect2(810,438,204,69),Color("293e42"),SAND)
		_txt("▤ BUNKER",912,481,21,SAND)
		_txt("Offline • Godot 4 • Android-first • v0.2 saves inherited • Original HTML preserved",600,572,13,Color("8baaa8"))
	elif mode == "paused":
		_txt("FIELD COMMAND",600,170,19,BLUE)
		_txt("SKIRMISH PAUSED",600,282,51,SAND)
		_txt("Match, zone and champion state saved on your device.",600,345,18,SAND)
		_panel(Rect2(294,430,438,85),Color("1c604f"),BLUE)
		_txt("▶ CONTINUE",513,483,27,SAND)
		_panel(Rect2(745,430,235,85),Color("483533"),RED)
		_txt("⌂ HOME",862,484,24,SAND)
	elif mode == "result":
		var won:bool = battle["won"]
		_txt("AFTER ACTION REPORT  //  SECTOR 01",600,161,16,BLUE)
		_txt(("CORE SECURED" if won else "CORE LOST") if str(battle.get("operation","SECTOR")) == "BEACON" else ("EXTRACTION COMPLETE" if won else "CARGO LOST") if str(battle.get("operation","SECTOR")) == "CONVOY" else ("VICTORY" if won else "DEFEAT"),600,249,43 if str(battle.get("operation","SECTOR")) == "CONVOY" else 65,BLUE if won else RED)
		_txt("%d — %d   •   %d CAPTURES   •   +%d SCRAP" % [int(battle["score"]["blue"]),int(battle["score"]["red"]),int(battle["captures"]["blue"]),int(battle["earned"])],600,345,24,SAND)
		_txt("SIGNATURES %d   •   SALVAGE %d   •   %s" % [int(battle.get("signatures",{}).get("blue",0)),int(battle.get("salvage",{}).get("blue",0)),("WAVES %d / 3" % int(battle["beacon"]["wave"])) if str(battle.get("operation","SECTOR")) == "BEACON" else ("CHECKPOINTS %d / 4" % int(battle["convoy"]["checkpoints"])) if str(battle.get("operation","SECTOR")) == "CONVOY" else "BATTLEFIELD EVOLVED"],600,388,17,BLUE)
		_panel(Rect2(217,445,289,87),Color("1c604f"),BLUE)
		_txt("↻ REMATCH",361,498,25,SAND)
		_panel(Rect2(516,445,350,87),Color("24434b"),SAND)
		_txt("▤ BUNKER",690,498,25,SAND)
		_panel(Rect2(877,445,148,87),Color("443331"),RED)
		_txt("HOME",951,499,24,SAND)
	elif mode == "bunker":
		_txt("JM  //  THE UNDERGROUND WAR",600,149,17,BLUE)
		_txt("COMMAND BUNKER",600,211,42,SAND)
		_txt("%d SCRAP  •  LEVEL %d / 3 CURRENT ROOMS" % [profile["scrap"],profile["level"]],600,251,19,BLUE)
		var rooms = ["FORWARD POST   •   3 champion launch array","SIGNAL ROOM   •   Issue full-squad rally orders","LAUNCH BAY   •   Faster energy regeneration, -4 launch cost"]
		for i in range(3):
			var enabled = int(profile["level"]) >= i+1
			_panel(Rect2(230,282+i*64,739,53),Color("1c4242") if enabled else Color("253137"),BLUE if enabled else Color("4e595e"))
			_txt("✓  " if enabled else "◇  ",252,315+i*64,20,BLUE if enabled else SAND,false)
			_txt(rooms[i],292,314+i*64,18,SAND,false)
		var price = 45 if int(profile["level"]) == 1 else 90
		_panel(Rect2(230,520,527,73),Color("24534d"),BLUE)
		_txt("RESTORE NEXT  •  %d SCRAP" % price if int(profile["level"]) < 3 else "ALL CURRENT ROOMS RESTORED",493,566,19,SAND)
		_panel(Rect2(776,520,193,73),Color("4b3a39"),RED)
		_txt("← BACK",870,565,20,SAND)
