extends SceneTree
var scene
var checks=[]
func _initialize() -> void:call_deferred("run")
func check(name: String,ok: bool) -> void:
	checks.append({"name":name,"passed":ok})
	print("NATIVE INPUT ","PASS " if ok else "FAIL ",name)
func touch(p: Vector2,down: bool,id: int=0) -> void:
	var e=InputEventScreenTouch.new()
	e.position=p
	e.pressed=down
	e.index=id
	root.push_input(e,true)
func run() -> void:
	scene=load("res://CP03Main.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame
	scene.start_battle("BEACON")
	scene.set_process(false)
	scene.battle["energy"]["blue"]=100.0
	var p: Vector2=scene.get_node("ConductRail/Form_skyray").get_global_rect().get_center()
	touch(p,true,3)
	check("viewport touch reserves native button without field drag",scene.ui_touches.has(3) and not scene.dragging)
	touch(p,false,3)
	check("viewport touch release commits actual native form",scene.conducted_state()["revision"]==1 and scene.conducted_state()["agents"][0]["form"]=="SKYRAY")
	check("button release clears pointer",not scene.ui_touches.has(3))
	var before=JSON.stringify(scene.battle)
	touch(p,true,4)
	touch(p+Vector2(900,300),false,4)
	check("drag off button does not mutate game",JSON.stringify(scene.battle)==before and not scene.dragging)
	touch(Vector2(700,350),true)
	check("inherited field touch begins drag",scene.dragging and scene.touch_id==0)
	touch(Vector2(500,450),true,1)
	check("second pointer cannot steal fling",scene.touch_id==0)
	var e=InputEventScreenDrag.new()
	e.index=0
	e.position=Vector2(850,370)
	root.push_input(e,true)
	check("inherited native drag updates aim",scene.aim_point.distance_to(scene._to_world(e.position))<0.1)
	touch(e.position,false)
	check("fling release clears gesture",not scene.dragging and scene.touch_id==-1)
	touch(Vector2(700,350),true,5)
	var saves: int=scene.lifecycle_saves
	scene._notification(MainLoop.NOTIFICATION_APPLICATION_PAUSED)
	check("pause checkpoints and cancels gesture",scene.lifecycle_saves==saves+1 and not scene.dragging and scene.touch_id==-1 and FileAccess.file_exists(scene.SAVE_BATTLE))
	check("pause preserves committed journal",scene.conducted_state()["revision"]==1)
	check("pause requires explicit resume",scene.mode=="paused")
	scene.battle={}
	scene.resume_battle()
	scene.set_process(false)
	check("saved original resume restores companion",scene.conducted_state()["revision"]==1 and scene.conducted_state()["agents"][0]["form"]=="SKYRAY")
	var failed=checks.filter(func(c):return not c["passed"])
	var f=FileAccess.open("res://../evidence/native-input-tests.json",FileAccess.WRITE)
	f.store_string(JSON.stringify({"scope":"real Godot Linux viewport-injected touch and lifecycle notification; no physical Android input claim","passed":checks.size()-failed.size(),"total":checks.size(),"checks":checks},"  "))
	f.close()
	quit(0 if failed.is_empty() else 1)
