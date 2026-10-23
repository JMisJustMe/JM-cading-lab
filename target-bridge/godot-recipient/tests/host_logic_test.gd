extends SceneTree
## Actual Godot headless test. Requires Godot binary. Exits nonzero on error.
var fails = 0
var count = 0
func check(ok: bool, label: String) -> void:
	count += 1
	if not ok:
		fails += 1
		push_error("GODOT HOST TEST FAIL: " + label)
	else:
		print("GODOT HOST TEST PASS: " + label)

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var scene: Control = load("res://Main.tscn").instantiate()
	root.add_child(scene)
	check(scene.marks.size() == 9, "nine registered semantics")
	check(not scene.complete, "no automatic complete at load")
	check(scene.spin == 100.0 and scene.integrity == 100.0, "initial canonical meters")
	scene.spin = 7.0
	scene.trigger_kic()
	check(scene.marks["signal.kic"] == "WAIT", "KIC below cost guard")
	scene.reset_contact()
	scene.trigger_kic()
	check(is_equal_approx(scene.spin, 95.8), "exact -4.2 KIC")
	check(scene.marks["signal.kic"] == "PASS" and scene.marks["kic.spin_cost"] == "PASS", "KIC trace")
	scene.trigger_kic()
	check(is_equal_approx(scene.spin, 95.8), "bounded KIC no double application")
	scene.trigger_wake()
	check(is_equal_approx(scene.spin, 100.0), "WAKE spin capped to 100")
	check(is_equal_approx(scene.stability, 100.0), "WAKE stability capped to 100")
	check(is_equal_approx(scene.integrity, 96.5), "WAKE integrity -3.5")
	scene.trigger_wake()
	check(is_equal_approx(scene.integrity, 96.5), "WAKE one-use guard")
	check(not scene.complete, "requires physical overlap, not button-only proof")
	scene.keyboard_actions["RIGHT"] = true
	for i in range(260):
		scene._process(1.0 / 60.0)
	check(scene.marks["signal.route_right"] == "PASS" and scene.marks["move.you"] == "PASS", "right route and movement")
	check(scene.marks["contact.you_rival_a"] == "PASS", "actual geometric collision")
	check(scene.complete, "nine-semantic completion gate")
	check(scene.events.size() == 9, "unique real event trace count")
	check(scene.receipt_data()["result"] == "PASS", "runtime receipt")
	check(scene.receipt_data()["runtime"] == OS.get_name(), "runtime OS is measured")
	var file = FileAccess.open("user://JM_TARGET_BRIDGE_GODOT_RETURN_RECEIPT.json", FileAccess.READ)
	check(file != null, "runtime JSON file written")
	if file != null:
		var payload = JSON.parse_string(file.get_as_text())
		check(payload is Dictionary and payload.get("result") == "PASS", "runtime receipt parses")
	check(scene.SOURCE_SHA == "1fde14e48737e3f7cf9331a3d774e06958c670b81c0932409e4dc2c1d7db9d4c", "exact source identity")
	print("GODOT NATIVE TEST: %d checks, %d failures" % [count, fails])
	quit(0 if fails == 0 else 1)
