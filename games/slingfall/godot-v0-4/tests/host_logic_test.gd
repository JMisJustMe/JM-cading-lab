extends SceneTree
## Native Godot 4.7+ offline integration checks — executes inherited SLINGFALL scene.
var failures := 0
var checks := 0

func _initialize() -> void:
	call_deferred("run_all")

func check(name: String, result: bool) -> void:
	checks += 1
	if result:
		print("SLINGFALL GODOT HOST PASS: ",name)
	else:
		failures += 1
		printerr("SLINGFALL GODOT HOST FAIL: ",name)

func run_all() -> void:
	print("SLINGFALL NATIVE TEST START")
	var packed: PackedScene = load("res://Main.tscn")
	check("Godot scene loads",packed != null)
	if packed == null:
		quit(1)
		return
	var game: Control = packed.instantiate()
	root.add_child(game)
	check("Native inherited script opens",game != null and game.has_method("start_battle"))
	game.profile["level"] = 1
	game.start_battle()
	check("Menu to playing scene",game.mode == "playing")
	check("All three original contested zones",game.battle["zones"].size() == 3)
	check("Three original champion classes",game.ORDER.size() == 3)
	check("Source match score and time",game.WIN_SCORE == 105.0 and game.MATCH_TIME == 140.0)
	check("v0.2 launch costs inherited",is_equal_approx(game.positive_cost("bulwark"),32.0) and is_equal_approx(game.positive_cost("dart"),26.0) and is_equal_approx(game.positive_cost("warden"),28.0))
	var launched: bool = game._launch("blue","bulwark",Vector2(448,216))
	check("Blue launch consumes actual energy",launched and is_equal_approx(float(game.battle["energy"]["blue"]),68.0))
	var bulwark: Dictionary = game.battle["heroes"][0]
	check("Launch travels before touchdown",not bulwark["flight"].is_empty())
	bulwark["x"] = 448.0
	bulwark["y"] = 216.0
	game._land(bulwark)
	check("Landfall creates tactical scar",game.battle["scars"].size() == 1 and game.battle["scars"][0]["team"] == "blue")
	check("Original capture modifier preserved",is_equal_approx(float(game.battle["zones"][0]["control"]),9.0))
	var hp_before = float(bulwark["hp"])
	game._hit(bulwark,10.0)
	check("Bulwark genuinely absorbs physical damage",is_equal_approx(float(bulwark["hp"]),hp_before-8.3))
	game.battle["energy"]["red"] = 100.0
	check("Independent opposing champion launch",game._launch("red","dart",Vector2(480,230)))
	var foe: Dictionary = game.battle["heroes"][1]
	foe["flight"] = {}
	foe["x"] = 480.0
	foe["y"] = 230.0
	bulwark["combo"] = 2
	bulwark["cool"] = 0.0
	game._combat_step(0.07)
	check("Third natural hit triggers siege signature",int(game.battle["signatures"]["blue"]) >= 1 and int(bulwark["combo"]) == 0)
	check("Signature visual event emitted",game.combat_events.size() > 0)
	check("Siege pulse stuns enemy",float(foe.get("stun",0.0)) > 0.0)
	game.battle["energy"]["blue"] = 100.0
	check("Warden real player deployment",game._launch("blue","warden",Vector2(457,237)))
	var warden: Dictionary = game.battle["heroes"][2]
	warden["flight"] = {}
	warden["x"] = 448.0
	warden["y"] = 221.0
	warden["support_cd"] = 0.0
	bulwark["hp"] = 55.0
	game._combat_step(0.07)
	check("Warden support restores actual ally HP",float(bulwark["hp"]) > 55.0)
	# Exercise the OTHER role signatures through their normal 3-hit trigger path.
	foe["stun"] = 0.0
	foe["cool"] = 0.0
	foe["combo"] = 2
	warden["cool"] = 0.0
	warden["combo"] = 2
	var dart_start_x: float = float(foe["x"])
	game._combat_step(0.07)
	check("Dart third strike executes Razor Rush reposition",int(game.battle["signatures"]["red"]) >= 1 and float(foe["x"]) < dart_start_x)
	check("Warden third strike executes Restoration Wave",int(game.battle["signatures"]["blue"]) >= 2 and int(warden["combo"]) == 0)
	game.battle["energy"]["blue"] = 50.0
	game.battle["zones"][2]["owner"] = "blue"
	game._living_field_step(3.1)
	check("Supply ownership grants real energy",is_equal_approx(float(game.battle["energy"]["blue"]),54.0))
	game._living_field_step(18.1)
	check("Battle scars expire and retire",game.battle["scars"].is_empty())
	game.battle["elapsed"] = 29.0
	game._living_field_step(0.1)
	check("Environment shifts to crosswind",game.battle["field_event"] == "CROSSWIND")
	game.battle["elapsed"] = 60.0
	game._living_field_step(0.1)
	check("Environment shifts to ion storm",game.battle["field_event"] == "ION STORM")
	game.profile["level"] = 3
	check("Launch Bay exact flat -4 energy remains",is_equal_approx(game.positive_cost("bulwark"),28.0))
	game._save_battle()
	check("Recoverable battle written",FileAccess.file_exists(game.SAVE_BATTLE))
	var old_battle = game.battle.duplicate(true)
	for k in ["scars","signatures","salvage","supply_tick","field_event"]:
		old_battle.erase(k)
	game._save_file(game.SAVE_BATTLE,{"version":2,"battle":old_battle,"selected":"warden","next_enemy":2.8,"uid":game.uid})
	game.resume_battle()
	check("v0.2 battle schema resumes unchanged",game.mode == "playing" and game.battle.has("scars") and game.battle.has("salvage") and game.battle.has("signatures"))
	check("Recovered chosen champion retained",game.selected == "warden")
	game._toggle_pause()
	check("Pause saves battle",game.mode == "paused")
	game._toggle_pause()
	check("Resume restores play",game.mode == "playing")
	game.battle["score"]["blue"] = 106.0
	game._finish()
	check("Actual match resolution enters result",game.mode == "result" and game.battle["won"] == true)
	check("Salvage and signatures retained at result",game.battle.has("earned") and game.battle.has("signatures"))
	check("Match save cleared at result",not FileAccess.file_exists(game.SAVE_BATTLE))
	# v0.4 — real consequential terrain/weather/opposition, not graphical-only changes.
	game.start_battle()
	check("V04 new field has four live barricades",game.battle["cover"].size() == 4 and game.battle["cover"][0]["destroyed"] == false)
	var cover: Dictionary = game.battle["cover"][0]
	var start_cover_hp = float(cover["hp"])
	game.battle["energy"]["blue"] = 100.0
	check("V04 Warden deploys for cover test",game._launch("blue","warden",Vector2(392,347)))
	var guarded: Dictionary = game.battle["heroes"][0]
	guarded["flight"] = {}
	guarded["x"] = 392.0
	guarded["y"] = 347.0
	guarded["shield"] = 0.0
	var hp_guarded = float(guarded["hp"])
	game._hit(guarded,20.0,{"type":"bulwark","team":"red","x":454.0,"y":347.0})
	check("V04 cover genuinely absorbs incoming ranged force",is_equal_approx(float(guarded["hp"]),hp_guarded-12.0) and is_equal_approx(float(cover["hp"]),start_cover_hp-8.0))
	var red_salvage = int(game.battle["salvage"]["red"])
	game._damage_cover(cover,200.0,"red")
	check("V04 barrage breaks barricade and earns salvage",cover["destroyed"] and int(game.battle["salvage"]["red"]) == red_salvage + 1)
	var hp_after = float(guarded["hp"])
	game._hit(guarded,20.0,{"type":"bulwark","team":"red","x":454.0,"y":347.0})
	check("V04 ruined barricade can no longer protect hero",is_equal_approx(float(guarded["hp"]),hp_after-20.0))
	var fresh_cover: Dictionary = game.battle["cover"][1]
	guarded["x"] = float(fresh_cover["x"])
	guarded["y"] = float(fresh_cover["y"])
	var cover_before_pierce = float(fresh_cover["hp"])
	var hp_before_pierce = float(guarded["hp"])
	game._hit(guarded,10.0,{"type":"dart","team":"red","x":733.0,"y":208.0})
	check("V04 Dart bypasses intact tactical cover",is_equal_approx(float(guarded["hp"]),hp_before_pierce-10.0) and is_equal_approx(float(fresh_cover["hp"]),cover_before_pierce))
	game.battle["energy"]["blue"] = 100.0
	game._launch("blue","bulwark",Vector2(653,208))
	var breach_maker: Dictionary = game.battle["heroes"][1]
	breach_maker["x"] = 653.0
	breach_maker["y"] = 208.0
	game._land(breach_maker)
	check("V04 Bulwark landing causes real barricade damage",float(fresh_cover["hp"]) < cover_before_pierce)
	game.battle["field_event"] = "CROSSWIND"
	game.battle["energy"]["blue"] = 100.0
	check("V04 crosswind field launch accepted",game._launch("blue","dart",Vector2(577,310)))
	var dart: Dictionary = game.battle["heroes"][2]
	check("V04 crosswind recorded with incoming projectile",is_equal_approx(float(dart["flight"].get("drift",0.0)),game.CROSSWIND_DRIFT))
	dart["flight"]["t"] = float(dart["flight"]["total"])-0.01
	game._combat_step(0.02)
	check("V04 crosswind bends actual landing position",is_equal_approx(float(dart["x"]),603.0) and dart["flight"].is_empty())
	# DART attacks pierce protection; blocked vs unblocked paths have separate consequences.
	game.start_battle()
	game.battle["energy"]["blue"] = 100.0
	game._launch("blue","warden",Vector2(448,216))
	var ion_victim: Dictionary = game.battle["heroes"][0]
	ion_victim["flight"] = {}
	ion_victim["x"] = 448.0
	ion_victim["y"] = 216.0
	ion_victim["shield"] = 0.0
	game.battle["elapsed"] = 60.0
	game._living_field_step(5.0)
	check("V04 ion weather creates a telegraphed hazard",game.battle["ion_marks"].size() == 1)
	var ion_hp = float(ion_victim["hp"])
	game._living_field_step(0.5)
	check("V04 telegraph never applies premature damage",is_equal_approx(float(ion_victim["hp"]),ion_hp))
	game._living_field_step(0.95)
	check("V04 resolved ion storm damages and stuns live hero",float(ion_victim["hp"]) < ion_hp and float(ion_victim.get("stun",0.0)) > 0.0 and game.battle["ion_marks"].is_empty())
	game.start_battle()
	game._launch("blue","bulwark",Vector2(608,351))
	var frontliner: Dictionary = game.battle["heroes"][0]
	frontliner["flight"] = {}
	frontliner["x"] = 608.0
	frontliner["y"] = 351.0
	game.battle["zones"][1]["control"] = 35.0
	game.battle["energy"]["red"] = 100.0
	game._enemy_step(3.0)
	check("V04 rival reveals counter-class strategic intent",game.battle["enemy_plan"] == "COUNTER BULWARK" and int(game.battle["slots"]["red"]["warden"]["active"]) > 0)
	var legacy: Dictionary = game.battle.duplicate(true)
	for field in ["cover","ion_marks","ion_tick","ion_index","enemy_plan"]:
		legacy.erase(field)
	game._save_file(game.SAVE_BATTLE,{"version":2,"battle":legacy,"selected":"bulwark","next_enemy":2.8,"uid":game.uid})
	game.resume_battle()
	check("V04 v0.2/v0.3 saves acquire additive siege fields",game.battle.has("cover") and game.battle["cover"].size() == 4 and game.battle.has("ion_marks") and game.battle.has("enemy_plan"))
	game.queue_free()
	print("SLINGFALL GODOT NATIVE: ",checks," checks / ",failures," failures")
	quit(0 if failures == 0 else 1)
