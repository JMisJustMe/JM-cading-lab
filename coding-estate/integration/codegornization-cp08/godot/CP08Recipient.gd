extends "res://CP03Recipient.gd"
## CP8 extends protected CP03 touch cancellation repair. No base file is rewritten.
const CP8_TACTICS = preload("res://CP08Tactics.gd")
var cp8_label: Label

func _ready() -> void:
	super._ready()
	cp8_label = Label.new()
	cp8_label.text = "RIVAL INTENT · BULWARK BREAK / DART FLANK / WARDEN RESTORE"
	cp8_label.position = Vector2(14,248)
	cp8_label.add_theme_font_size_override("font_size",14)
	cp8_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(cp8_label)

func _enemy_step(dt: float) -> void:
	if battle.is_empty():
		return
	var before: int = battle["heroes"].size()
	# Parent retains operation waves, spawn timing, counterrole selection,
	# energy costs, battle physics and its native target/route safety.
	super._enemy_step(dt)
	if mode != "playing" or str(battle.get("operation","SECTOR")) != "SECTOR":
		return
	for i in range(before,battle["heroes"].size()):
		var rival: Dictionary = battle["heroes"][i]
		if str(rival.get("team","")) != "red":
			continue
		var decision = CP8_TACTICS.choose(battle["zones"],battle["heroes"],str(rival["type"]))
		if str(decision["zone"]).is_empty():
			continue
		# The original combat step consumes hero.order after landing, so this
		# changes actual rival movement rather than just the HUD description.
		rival["order"] = str(decision["zone"])
		rival["cp8_directive"] = str(decision["directive"])
		match str(rival["type"]):
			"dart":
				rival["speed_boost"] = maxf(float(rival["speed_boost"]),2.2)
			"bulwark":
				rival["shield"] = maxf(float(rival["shield"]),1.5)
			"warden":
				rival["support_cd"] = minf(float(rival["support_cd"]),1.5)
		battle["enemy_plan"] = "RIVAL " + str(decision["directive"]) + " / " + str(decision["zone"])
		if is_instance_valid(cp8_label):
			cp8_label.text = battle["enemy_plan"]
		_save_battle()
