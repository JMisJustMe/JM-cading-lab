extends "res://CP16Recipient.gd"
## CP17 builds directly on all six playable CP16 tactics, preserving safe/power
## and inherited controls. Founding JudgeMaker/Jangle/Jour execute in CI on
## native Linux returns, NOT in Android. Device view is an honest LIVE REVIEW,
## not an invented owner-device original-donor execution or remote approval.
var cp17_audit_button: Button
var cp17_audit_text: Label
var cp17_audit_open: bool=false

func _ready() -> void:
	super._ready()
	var col: VBoxContainer = cp15_dock.get_child(0)
	cp17_audit_button=Button.new()
	cp17_audit_button.name="CP17LiveAudit"
	cp17_audit_button.text="CONTACT REVIEW"
	cp17_audit_button.custom_minimum_size=Vector2(166,36)
	cp17_audit_button.focus_mode=Control.FOCUS_NONE
	cp17_audit_button.add_theme_font_size_override("font_size",12)
	cp17_audit_button.pressed.connect(_cp17_toggle_audit)
	col.add_child(cp17_audit_button)
	cp17_audit_text=Label.new()
	cp17_audit_text.name="CP17NativeReceiptStatus"
	cp17_audit_text.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	cp17_audit_text.custom_minimum_size=Vector2(166,70)
	cp17_audit_text.add_theme_font_size_override("font_size",11)
	cp17_audit_text.add_theme_color_override("font_color",Color("a9e9ce"))
	col.add_child(cp17_audit_text)
	_fit_native_controls()
	_sync_native_rails()

func _cp17_toggle_audit() -> void:
	if mode!="playing":
		return
	cp17_audit_open=not cp17_audit_open
	_sync_native_rails()

func _cp17_last_receipt() -> Dictionary:
	if battle.is_empty():
		return {}
	var power: Dictionary=battle.get("cp16_return",{})
	var safe: Dictionary=battle.get("cp15_return",{})
	if power.is_empty():
		return safe
	if safe.is_empty():
		return power
	return power if int(power.get("index",0))>=int(safe.get("index",0)) else safe

func cp17_review_summary() -> String:
	if mode!="playing" or battle.is_empty():
		return "NO ACTIVE NATIVE CONTACT"
	var receipt: Dictionary=_cp17_last_receipt()
	if receipt.is_empty():
		return "LIVE NATIVE: NO ROUTE USED\nJUDGE / JANGLE / JOUR: CI TESTED\nTHIS DEVICE: UNREVIEWED"
	var schema: String=str(receipt.get("schema",""))
	var accepted_schema: bool=schema=="jm.cp16-power-native-return/1" or schema=="jm.jourmaze-player-native-return/1"
	var packet: String=str(receipt.get("routePacketSHA256",""))
	var expected_packet: String=CP16_SEAL.PACKET_SHA if schema=="jm.cp16-power-native-return/1" else CP15_SEAL.PACKET_SHA
	var source_ok: bool=accepted_schema and packet==expected_packet and str(receipt.get("originalJourMazeSHA256",""))==CP16_SEAL.ORIGINAL_JOURMAZE_SHA and str(receipt.get("ko11PolicySHA256",""))==CP16_SEAL.KO11_POLICY_SHA
	var before: Dictionary=receipt.get("before",{})
	var after: Dictionary=receipt.get("after",{})
	var cost: float=float(receipt.get("cost",0.0))
	var spent: float=float(before.get("energy",0.0))-float(after.get("energy",0.0))
	if not source_ok or not is_equal_approx(cost,spent) or not after.get("targets",[]) is Array or after["targets"].is_empty():
		return "LOCAL RECEIPT · HOLD\nSOURCE OR NATIVE STATE INVALID\nJUDGE / JANGLE / JOUR: NOT RUN HERE"
	return "NATIVE "+str(receipt.get("variant",""))+" · "+str(receipt.get("selected",""))+"\nENERGY "+str(int(float(before.get("energy",0))))+" → "+str(int(float(after.get("energy",0))))+" · "+str(after["targets"].size())+" TARGET\nLOCAL SEAL: CHECKED\nJUDGE / JANGLE / JOUR: CI QUALIFIED\nTHIS LIVE DEVICE EVENT: NOT INDEPENDENTLY JUDGED"

func _fit_native_controls() -> void:
	super._fit_native_controls()
	if is_instance_valid(cp17_audit_text) and is_instance_valid(cp15_dock):
		_fit_cp17_deck(get_viewport_rect().size)

func _fit_cp17_deck(screen: Vector2) -> void:
	if not is_instance_valid(cp15_dock):
		return
	var extra: float=95.0 if cp17_audit_open else 45.0
	var height: float=318.0+extra
	var width: float=minf(210.0,maxf(160.0,screen.x-20.0))
	cp15_dock.custom_minimum_size=Vector2(width,height)
	cp15_dock.size=Vector2(width,height)
	cp15_dock.position=Vector2(maxf(8.0,screen.x-width-10.0),maxf(8.0,screen.y-height-12.0))

func _sync_native_rails() -> void:
	super._sync_native_rails()
	if not is_instance_valid(cp17_audit_button) or not is_instance_valid(cp17_audit_text):
		return
	var active: bool=mode=="playing" and not battle.is_empty()
	cp17_audit_button.visible=active
	cp17_audit_text.visible=active and cp17_audit_open
	if active and cp17_audit_open:
		cp17_audit_text.text=cp17_review_summary()
	if is_instance_valid(cp15_dock):
		_fit_cp17_deck(get_viewport_rect().size)
