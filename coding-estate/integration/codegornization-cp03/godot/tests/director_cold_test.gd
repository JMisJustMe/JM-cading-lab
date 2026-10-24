extends SceneTree
var scene
var checks=[]
func _initialize() -> void:call_deferred("run")
func check(name: String,ok: bool) -> void:
	checks.append({"name":name,"passed":ok})
	print("COLD CUE ","PASS " if ok else "FAIL ",name)
func run() -> void:
	scene=load("res://CP03Main.tscn").instantiate()
	root.add_child(scene)
	var file=FileAccess.open(scene.SAVE_BATTLE,FileAccess.WRITE)
	file.store_string(FileAccess.get_file_as_string("res://../evidence/cue-mid-checkpoint.json"))
	file.close()
	scene.resume_battle()
	scene.set_process(false)
	check("fresh process restores pending source sequence",scene.battle["cue"]["next"]==1 and not scene.battle["cue"]["complete"])
	scene.step_forms(0.45)
	check("fresh process executes next healing phase exactly once",is_equal_approx(scene.battle["heroes"][0]["hp"],58.0) and scene.battle["cue"]["next"]==2)
	scene.step_forms(0.45)
	check("fresh process completes remaining sequence",scene.battle["cue"]["complete"] and scene.battle["cue"]["events"].size()==3)
	scene.step_forms(0.5)
	check("completed scheduler does not replay healing",is_equal_approx(scene.battle["heroes"][0]["hp"],58.0))
	var failed=checks.filter(func(c):return not c["passed"])
	var f=FileAccess.open("res://../evidence/cold-cue-tests.json",FileAccess.WRITE)
	f.store_string(JSON.stringify({"scope":"fresh native Linux process uses original save path with transferred mid-sequence checkpoint; no Android lifecycle claim","passed":checks.size()-failed.size(),"total":checks.size(),"checks":checks},"  "))
	f.close()
	quit(0 if failed.is_empty() else 1)
