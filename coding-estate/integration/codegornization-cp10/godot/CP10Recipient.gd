extends "res://CP09Recipient.gd"
## CP10: actual Codifying + Kocodifying + JMLogic build-stage donor results
## enter the original native game as a source-bounded, user-triggered contact.
## Existing SLINGFALL, CP02, CP03, CP08, CP09 bodies remain untouched.
const KO_SEAL = preload("res://KOSeal.gd")
var ko_readout: Label

func _ready() -> void:
	super._ready()
	var rail: HBoxContainer = get_node("CooperationRail")
	var contact_button = Button.new()
	contact_button.name = "KOContactButton"
	contact_button.text = "KO AEGIS · 12 ENERGY"
	contact_button.custom_minimum_size = Vector2(190,58)
	contact_button.pressed.connect(_ko_contact_pressed)
	rail.add_child(contact_button)
	_fit_native_controls()
	ko_readout = Label.new()
	ko_readout.position = Vector2(14,316)
	ko_readout.add_theme_font_size_override("font_size",14)
	ko_readout.add_theme_color_override("font_color",Color("b7eedb"))
	ko_readout.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ko_readout.text = "KO BODIES READY · CODIFY / KOCODIFY / JMLOGIC → NATIVE"
	add_child(ko_readout)
	_sync_native_rails()

func _sync_native_rails() -> void:
	super._sync_native_rails()
	if is_instance_valid(ko_readout):
		ko_readout.visible = mode == "playing"
		if mode == "playing":
			ko_readout.text = str(battle.get("ko_visible","KO BODIES READY · CODIFY / KOCODIFY / JMLOGIC → NATIVE"))

func _ko_contact_pressed() -> void:
	var envelope = JSON.parse_string(FileAccess.get_file_as_string("res://packets/ko_aegis.json"))
	var result = accept_ko_contact(envelope)
	if is_instance_valid(ko_readout):
		ko_readout.text = str(battle.get("ko_visible","KO HOLD: "+str(result.get("error","unknown"))))
	if is_instance_valid(contact_label):
		contact_label.text = "KO AEGIS · LIVE NATIVE RETURN" if result.get("applied",false) else "KO HOLD · "+str(result.get("error","unknown"))

func accept_ko_contact(envelope: Variant) -> Dictionary:
	# Explicitly no native contact merely from game startup or a cosmetic label.
	if mode != "playing" or battle.is_empty() or str(battle.get("operation","SECTOR")) != "SECTOR":
		return {"applied":false,"error":"NOT_ACTIVE_SECTOR"}
	if int(battle.get("ko_applied",0)) != 0:
		return {"applied":false,"error":"CONTACT_ALREADY_USED"}
	if not envelope is Dictionary or str(envelope.get("schema","")) != "jm.ko-contact.transport/1" or not envelope.get("payload") is String:
		return {"applied":false,"error":"KO_ENVELOPE_SCHEMA"}
	var text: String = envelope["payload"]
	if text.length() > 30000 or text.sha256_text() != str(envelope.get("payloadSHA256","")) or text.sha256_text() != KO_SEAL.PACKET_SHA:
		return {"applied":false,"error":"KO_SOURCE_BYTES"}
	var packet = JSON.parse_string(text)
	if not packet is Dictionary or str(packet.get("schema","")) != "jm.ko-contact.typed/1":
		return {"applied":false,"error":"KO_PACKET_SCHEMA"}
	var source: Dictionary = packet.get("source",{})
	var identities: Dictionary = packet.get("identities",{})
	var binding: Dictionary = packet.get("binding",{})
	var execution: Dictionary = packet.get("execution",{})
	var contact: Dictionary = packet.get("contact",{})
	if str(source.get("codifier","")) != KO_SEAL.SOURCE_CODIFIER or str(source.get("logic","")) != KO_SEAL.SOURCE_LOGIC or bool(source.get("historicalKocodifyingOriginal",true)):
		return {"applied":false,"error":"KO_SOURCE_AUTHORITY"}
	if str(identities.get("left","")) != "KOCODIFIER" or str(identities.get("right","")) != "SLINGFALL" or str(binding.get("status","")) != "synced" or str(binding.get("ownerIntent","")) != "AEGIS" or str(binding.get("recipientIntent","")) != "AEGIS":
		return {"applied":false,"error":"KO_BINDING_HOLD"}
	if not bool(execution.get("Kocodifying",false)) or not bool(execution.get("Codifying",false)) or not bool(execution.get("JMLogic",false)) or not bool(execution.get("allowed",false)):
		return {"applied":false,"error":"KO_EXECUTION_HOLD"}
	if str(contact.get("intent","")) != "AEGIS" or str(contact.get("effect","")) != "ALLY_SHIELD" or int(contact.get("energy",-1)) != 12 or int(contact.get("uses",-1)) != 1 or float(contact.get("shield_seconds",-1)) != 6.0:
		return {"applied":false,"error":"KO_CONTRACT_HOLD"}
	var targets: Array = []
	for hero in battle.get("heroes",[]):
		if str(hero.get("team","")) == "blue" and _alive(hero) and hero["flight"].is_empty():
			targets.append(hero)
	if targets.is_empty():
		return {"applied":false,"error":"NO_GROUNDED_ALLY"}
	var cost: float = float(contact["energy"])
	if float(battle["energy"]["blue"]) < cost:
		return {"applied":false,"error":"INSUFFICIENT_ENERGY"}
	var before_energy: float = float(battle["energy"]["blue"])
	var before_shield: Array = targets.map(func(hero):return {"id":int(hero["id"]),"shield":float(hero["shield"])})
	battle["energy"]["blue"] = before_energy-cost
	for hero in targets:
		hero["shield"] = maxf(float(hero["shield"]),float(contact["shield_seconds"]))
		_event("ripple",Vector2(float(hero["x"]),float(hero["y"])),BLUE,2.3)
	battle["ko_applied"] = 1
	battle["ko_visible"] = "KO CONTACT · %d ALLIES SHIELDED · -12 ENERGY · RECEIPT LIVE" % targets.size()
	var after_shield: Array = targets.map(func(hero):return {"id":int(hero["id"]),"shield":float(hero["shield"])})
	var receipt = {"schema":"jm.ko-native-return/1","sourceSHA256":text.sha256_text(),
		"participants":["Codifying","Kocodifying","JMLogic","SLINGFALL_GODOT"],
		"distinctIdentities":identities,"before":{"energy":before_energy,"shields":before_shield},
		"after":{"energy":float(battle["energy"]["blue"]),"shields":after_shield},
		"appliedActors":targets.size(),"effect":"ALLY_SHIELD","contactIndex":1,
		"engine":Engine.get_version_info()["string"],"host":OS.get_name()}
	battle["ko_return"] = receipt
	_save_battle()
	queue_redraw()
	return {"applied":true,"receipt":receipt}
