extends SceneTree
## CP12 child-only native evidence exporter. Uses the actual inherited CP10
## recipient, without editing KO, CP10, gameplay controls, or frozen sources.

func abort(reason: String) -> void:
  push_error("CP12 NATIVE HOLD " + reason)
  print("CP12 NATIVE HOLD " + reason)
  quit(1)

func _initialize() -> void:
  call_deferred("run")

func run() -> void:
  var scene = load("res://CP10Main.tscn").instantiate()
  root.add_child(scene)
  await process_frame
  await process_frame
  scene.start_battle("SECTOR")
  scene.set_process(false)
  scene.battle["energy"]["blue"] = 100.0

  if not scene._launch("blue", "dart", Vector2(448,216)):
    abort("COULD_NOT_LAUNCH_REAL_BLUE_HERO")
    return
  var hero: Dictionary = scene.battle["heroes"].back()
  hero["x"] = 448.0
  hero["y"] = 216.0
  scene._land(hero)
  hero["shield"] = 0.0
  if not hero["flight"].is_empty():
    abort("HERO_NOT_GROUNDED")
    return

  var envelope = JSON.parse_string(FileAccess.get_file_as_string("res://packets/ko_aegis.json"))
  if not envelope is Dictionary:
    abort("NO_TYPED_PACKET")
    return
  var source_payload: String = str(envelope.get("payload",""))
  if source_payload.sha256_text() != str(envelope.get("payloadSHA256","")):
    abort("PACKET_SOURCE_BYTES_INVALID")
    return

  var denied: Dictionary = envelope.duplicate(true)
  denied["payloadSHA256"] = "0".repeat(64)
  var no_contact: Dictionary = scene.accept_ko_contact(denied)
  if bool(no_contact.get("applied",false)) or not is_equal_approx(float(scene.battle["energy"]["blue"]),100.0):
    abort("TAMPER_CHANGED_NATIVE_BATTLE")
    return

  var accepted: Dictionary = scene.accept_ko_contact(envelope)
  if not bool(accepted.get("applied",false)):
    abort("ACTUAL_NATIVE_CONTACT_FAILED_" + str(accepted.get("error","UNKNOWN")))
    return
  var receipt: Dictionary = accepted.get("receipt",{})
  if receipt.is_empty() or str(receipt.get("schema","")) != "jm.ko-native-return/1":
    abort("MISSING_NATIVE_RETURN")
    return
  if not is_equal_approx(float(scene.battle["energy"]["blue"]),88.0) or float(hero["shield"]) < 6.0:
    abort("NO_ACTUAL_NATIVE_ENERGY_SHIELD_CONSEQUENCE")
    return
  if str(receipt.get("sourceSHA256","")) != source_payload.sha256_text():
    abort("NATIVE_RECEIPT_NOT_BOUND_TO_SOURCE_PACKET")
    return
  if int(scene.battle.get("ko_applied",0)) != 1 or scene.battle.get("ko_return",{}) != receipt:
    abort("NATIVE_RETURN_NOT_COMMITTED_TO_GAME_STATE")
    return
  var replay: Dictionary = scene.accept_ko_contact(envelope)
  if bool(replay.get("applied",false)) or str(replay.get("error","")) != "CONTACT_ALREADY_USED":
    abort("DUPLICATE_NATIVE_EFFECT")
    return

  var path: String = OS.get_environment("CP12_NATIVE_RETURN_PATH")
  if path.is_empty() or not path.is_absolute_path():
    abort("ABSOLUTE_RECEIPT_DESTINATION_REQUIRED")
    return
  var file: FileAccess = FileAccess.open(path,FileAccess.WRITE)
  if file == null:
    abort("CANNOT_WRITE_NATIVE_RETURN_" + str(FileAccess.get_open_error()))
    return
  file.store_string(JSON.stringify(receipt,"\t") + "\n")
  file.close()
  print("CP12 NATIVE PASS TRUE_GODOT_AFTER_STATE ",str(receipt.get("after",{})))
  quit(0)
