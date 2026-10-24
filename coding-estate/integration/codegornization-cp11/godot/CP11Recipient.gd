extends "res://CP10Recipient.gd"
## CP11 actual runtime decision on native battlefield conditions using a four-row
## JMLogic-generated table. The original JS KO sources run in the Node builder,
## not on Android. Preserve original and CP02/03/08/09/10 class hierarchy.
const KO11_SEAL = preload("res://KO11Seal.gd")
var ko11_policy: Dictionary = {}
var ko11_label: Label

func _ready() -> void:
	super._ready()
	ko11_policy = _ko11_load()
	ko11_label = Label.new()
	ko11_label.position = Vector2(14,352)
	ko11_label.add_theme_font_size_override("font_size",14)
	ko11_label.add_theme_color_override("font_color",Color("b1eedc"))
	ko11_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(ko11_label)
	_sync_native_rails()

func _ko11_load() -> Dictionary:
	var envelope = JSON.parse_string(FileAccess.get_file_as_string("res://packets/ko_live_policy.json"))
	if not envelope is Dictionary or str(envelope.get("schema","")) != "jm.ko-live.transport/1":
		return {}
	var text: String = str(envelope.get("payload",""))
	if text.length() > 50000 or text.sha256_text() != KO11_SEAL.POLICY_SHA or str(envelope.get("payloadSHA256","")) != KO11_SEAL.POLICY_SHA:
		return {}
	var policy=JSON.parse_string(text)
	if not policy is Dictionary or str(policy.get("schema","")) != "jm.ko-live-decision-table/1":
		return {}
	var source: Dictionary=policy.get("source",{})
	var identities: Dictionary=policy.get("identities",{})
	if str(source.get("codifying","")) != KO11_SEAL.SOURCE_CODE or str(source.get("kocodifying","")) != KO11_SEAL.SOURCE_CODE or str(source.get("jmlogic","")) != KO11_SEAL.SOURCE_LOGIC or bool(source.get("historicalOriginal",true)):
		return {}
	if str(identities.get("left","")) != "KOCODIFIER" or str(identities.get("right","")) != "SLINGFALL":
		return {}
	var rows: Dictionary=policy.get("table",{})
	var actions: Dictionary=policy.get("actions",{})
	if rows.get("00")!="AEGIS" or rows.get("01")!="COUNTER" or rows.get("10")!="TRIAGE" or rows.get("11")!="TRIAGE":
		return {}
	if not actions.has("AEGIS") or not actions.has("TRIAGE") or not actions.has("COUNTER"):
		return {}
	policy["transportSHA256"]=KO11_SEAL.POLICY_SHA
	return policy

func _ko11_facts() -> Dictionary:
	var blue: Array=[]
	var red: Array=[]
	for hero in battle.get("heroes",[]):
		if not _alive(hero) or not hero["flight"].is_empty():
			continue
		if str(hero.get("team",""))=="blue":
			blue.append(hero)
		elif str(hero.get("team",""))=="red":
			red.append(hero)
	var wounded: bool=false
	var enemy_near: bool=false
	for ally in blue:
		if float(ally.get("maxhp",0))-float(ally.get("hp",0))>=15.0:
			wounded=true
		var p=Vector2(float(ally["x"]),float(ally["y"]))
		for opponent in red:
			if p.distance_to(Vector2(float(opponent["x"]),float(opponent["y"])))<=145.0:
				enemy_near=true
	return {"blue":blue,"red":red,"wounded":wounded,"enemy_near":enemy_near}

func _ko11_choice(facts: Dictionary) -> String:
	if ko11_policy.is_empty():
		return "HOLD"
	var key=("1" if bool(facts.get("wounded",false)) else "0")+("1" if bool(facts.get("enemy_near",false)) else "0")
	return str(ko11_policy["table"].get(key,"HOLD"))

func _sync_native_rails() -> void:
	super._sync_native_rails()
	var active: bool=mode=="playing" and not battle.is_empty()
	var info: String="KO LIVE SOURCE HOLD"
	if active and not ko11_policy.is_empty():
		var facts=_ko11_facts()
		var action=_ko11_choice(facts)
		var choices: Dictionary=ko11_policy["actions"]
		if not facts["blue"].is_empty() and choices.has(action):
			info="KO LIVE: "+action+" / "+str(choices[action]["cost"])+" ENERGY"
		else:
			info="KO LIVE: DEPLOY A CHAMPION"
	if has_node("CooperationRail/KOContactButton"):
		get_node("CooperationRail/KOContactButton").text="KO LIVE · "+info.trim_prefix("KO LIVE: ")
	if is_instance_valid(ko11_label):
		ko11_label.visible=active
		ko11_label.text="KO LINEAGE · KOCODIFYING → CODIFYING → JMLOGIC → GODOT"
	if is_instance_valid(ko_readout) and active:
		ko_readout.text=str(battle.get("ko11_visible",info))

func _ko_contact_pressed() -> void:
	var result=accept_ko_live()
	if is_instance_valid(contact_label):
		contact_label.text="KO LIVE APPLIED · "+str(result.get("action","")) if result.get("applied",false) else "KO LIVE HOLD · "+str(result.get("error","unknown"))
	if is_instance_valid(ko_readout):
		ko_readout.text=str(battle.get("ko11_visible","KO LIVE HOLD · "+str(result.get("error","unknown"))))

func accept_ko_live(override_policy: Variant=null) -> Dictionary:
	if mode!="playing" or battle.is_empty() or str(battle.get("operation","SECTOR"))!="SECTOR":
		return {"applied":false,"error":"NOT_ACTIVE_SECTOR"}
	var policy: Dictionary=ko11_policy
	if override_policy!=null:
		if not override_policy is Dictionary or str(override_policy.get("transportSHA256","")) != KO11_SEAL.POLICY_SHA:
			return {"applied":false,"error":"UNTRUSTED_POLICY"}
		# Never accept caller-defined rules. Only sealed loaded policy is authoritative.
		if JSON.stringify(override_policy)!=JSON.stringify(ko11_policy):
			return {"applied":false,"error":"POLICY_DRIFT"}
		policy=override_policy
	if policy.is_empty():
		return {"applied":false,"error":"POLICY_NOT_LOADED"}
	if int(battle.get("ko11_count",0)) >= 3:
		return {"applied":false,"error":"CONTACT_LIMIT"}
	if float(battle.get("ko11_last_time",-10000.0))+6.0>float(battle.get("elapsed",0.0)):
		return {"applied":false,"error":"RECOVERING"}
	var facts: Dictionary=_ko11_facts()
	if facts["blue"].is_empty():
		return {"applied":false,"error":"DEPLOY_FIRST"}
	var selected: String=_ko11_choice(facts)
	var actions: Dictionary=policy["actions"]
	if not actions.has(selected):
		return {"applied":false,"error":"NO_KO_ACTION"}
	var spec: Dictionary=actions[selected]
	if str(spec.get("action",""))!=selected:
		return {"applied":false,"error":"KO_ACTION_DRIFT"}
	var cost: float=float(spec.get("cost",-1))
	if cost<=0.0 or cost>25.0 or float(battle["energy"]["blue"])<cost:
		return {"applied":false,"error":"KO_ENERGY_HOLD"}
	var targets: Array=[]
	if selected=="TRIAGE":
		var best: Dictionary={}
		var missing: float=0.0
		for ally in facts["blue"]:
			var injury=float(ally["maxhp"])-float(ally["hp"])
			if injury>=15.0 and injury>missing:
				missing=injury
				best=ally
		if best.is_empty() or float(spec.get("heal",-1)) != 19.0:
			return {"applied":false,"error":"KO_TRIAGE_DRIFT"}
		targets=[best]
	elif selected=="COUNTER":
		if not bool(facts["enemy_near"]) or float(spec.get("stun_seconds",-1))!=1.8:
			return {"applied":false,"error":"KO_COUNTER_DRIFT"}
		for enemy in facts["red"]:
			var ep=Vector2(float(enemy["x"]),float(enemy["y"]))
			for ally in facts["blue"]:
				if ep.distance_to(Vector2(float(ally["x"]),float(ally["y"])))<=145.0:
					targets.append(enemy)
					break
	elif selected=="AEGIS":
		if float(spec.get("shield_seconds",-1))!=5.0:
			return {"applied":false,"error":"KO_AEGIS_DRIFT"}
		targets=facts["blue"]
	else:
		return {"applied":false,"error":"KO_UNDECLARED_ACTION"}
	if targets.is_empty():
		return {"applied":false,"error":"KO_TARGET_HOLD"}
	var before_energy: float=float(battle["energy"]["blue"])
	var before: Array=targets.map(func(h):return {"id":int(h["id"]),"hp":float(h["hp"]),"shield":float(h["shield"]),"stun":float(h["stun"])})
	battle["energy"]["blue"]=before_energy-cost
	for h in targets:
		match selected:
			"TRIAGE":
				h["hp"]=minf(float(h["maxhp"]),float(h["hp"])+19.0)
				h["shield"]=maxf(float(h["shield"]),3.0)
			"COUNTER":
				h["stun"]=maxf(float(h["stun"]),1.8)
			"AEGIS":
				h["shield"]=maxf(float(h["shield"]),5.0)
		_event("ripple",Vector2(float(h["x"]),float(h["y"])),BLUE,1.4)
	var after: Array=targets.map(func(h):return {"id":int(h["id"]),"hp":float(h["hp"]),"shield":float(h["shield"]),"stun":float(h["stun"])})
	battle["ko11_count"]=int(battle.get("ko11_count",0))+1
	battle["ko11_last_time"]=float(battle.get("elapsed",0.0))
	battle["ko11_visible"]="KO LIVE "+selected+" · %d AFFECTED · -%d ENERGY · RECEIPT" % [targets.size(),int(cost)]
	var receipt={"schema":"jm.ko-live-native-return/1","compiledPolicySHA256":KO11_SEAL.POLICY_SHA,
		"executors":["Kocodifying","Codifying","JMLogic"],"nativeExecutor":"Godot bounded decision-table",
		"historicalOriginal":false,"liveFacts":{"wounded":facts["wounded"],"enemy_near":facts["enemy_near"]},
		"selected":selected,"identities":policy["identities"],"before":{"energy":before_energy,"targets":before},
		"after":{"energy":float(battle["energy"]["blue"]),"targets":after},"index":battle["ko11_count"],
		"engine":Engine.get_version_info()["string"]}
	battle["ko11_return"]=receipt
	_save_battle()
	queue_redraw()
	return {"applied":true,"action":selected,"receipt":receipt}
