extends RefCounted
## JM CP8 — deterministic tactical policy, an additive role specialist.
## This policy owns only a rival's destination/stance. The original native
## projectile, collision, zones, champion cooldowns and save schema stay inherited.
const ROLE = {"bulwark":"BREAK_LINE","dart":"FLANK_UNGUARDED","warden":"RESTORE_FRONT"}

static func choose(zones: Array, heroes: Array, kind: String) -> Dictionary:
	if not ROLE.has(kind) or zones.is_empty():
		return {"zone":"","directive":"HOLD","score":0.0}
	var best = {"zone":"","directive":ROLE[kind],"score":-999999.0}
	for zone in zones:
		if not zone is Dictionary or str(zone.get("id","")).is_empty():
			continue
		var center = Vector2(float(zone.get("x",0.0)),float(zone.get("y",0.0)))
		var radius = float(zone.get("r",75.0)) + 36.0
		var blue = 0
		var red = 0
		var wounded = 0
		for hero in heroes:
			if not hero is Dictionary or bool(hero.get("leaving",false)) or float(hero.get("hp",0.0))<=0.0:
				continue
			if not hero.get("flight",{}).is_empty():
				continue
			var at = Vector2(float(hero.get("x",-9999.0)),float(hero.get("y",-9999.0)))
			if center.distance_to(at) > radius:
				continue
			if str(hero.get("team","")) == "blue":
				blue += 1
			elif str(hero.get("team","")) == "red":
				red += 1
				if float(hero.get("hp",0.0)) < 0.65 * maxf(1.0,float(hero.get("maxhp",1.0))):
					wounded += 1
		var control = float(zone.get("control",0.0))
		var owner = str(zone.get("owner",""))
		var score = 0.0
		match kind:
			"bulwark":
				# Tanks challenge defended or nearly captured ground.
				score = 42.0 * blue + 0.65 * maxf(0.0,control) + 5.0 * red
			"dart":
				# Skirmishers evade packed defences and steal neglected ground.
				score = (55.0 if owner == "blue" else 20.0 if owner == "neutral" else 0.0) - 29.0 * blue - 9.0 * red + 0.08 * maxf(0.0,control)
			"warden":
				# Support prioritises real wounded allies, not arbitrary random zones.
				score = 95.0 * wounded + 17.0 * red - 8.0 * blue + (6.0 if owner == "red" else 0.0)
		if score > float(best["score"]):
			best = {"zone":str(zone["id"]),"directive":ROLE[kind],"score":score}
	return best
