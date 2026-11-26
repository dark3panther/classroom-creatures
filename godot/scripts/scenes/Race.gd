extends Node3D
## Class relay (a reward game, about a minute): every creature runs one leg of the track in turn, and each one's
## points today make its leg faster. The class runs as one team against a boss, so nobody is ranked against a
## classmate: either the class beats the boss together or the boss wins this time.
##   init {students: [{..., points}], boss: {id, element}, reduced}  ·  start
## It answers: ready, leg {studentId, index}, result {classTime, bossTime, win}.

var TRACK := 220.0
const BASE := 3.0          # metres a second with no points today
const BOOST := 0.35        # more per point today
const MAX_BOOST := 2.6
const BOSS_SPEED := 3.45

var students: Array = []
var runners: Array[Creature3D] = []
var legs: Array = []          # [start x, end x, speed]
var boss: Node3D
var boss_anim: AnimationPlayer
var cam: Camera3D
var running := false
var t := 0.0
var leg := 0
var x_runner := 0.0
var x_boss := 0.0
var finished_class := -1.0
var finished_boss := -1.0
var countdown: Label3D
var reduced := false


func _ready() -> void:
	Stage3D.light(self, "verdant")
	_track()
	cam = Camera3D.new()
	cam.fov = 42
	add_child(cam)
	cam.position = Vector3(2, 3.2, 10)
	cam.look_at(Vector3(4, 0.8, 0))
	countdown = Label3D.new()
	countdown.font_size = 220
	countdown.outline_size = 48
	countdown.modulate = Color("#ffd23f")
	countdown.outline_modulate = Color("#13253f")
	countdown.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	countdown.no_depth_test = true
	countdown.pixel_size = 0.01
	countdown.visible = false
	add_child(countdown)
	Bridge.message.connect(_on_message)
	Bridge.send("ready", {"scene": "race"})


func _on_message(msg: Dictionary) -> void:
	match str(msg.get("type")):
		"init": _setup(msg)
		"start": _start()
		"pictures":
			for p in msg.get("list", []):
				for r in runners:
					if r.student_id == str(p.get("id")):
						r.set_picture(str(p.get("picture", "")), p.get("rig"))


func _track() -> void:
	var ground := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = Vector3(TRACK + 200.0, 0.2, 90.0)     # wide and deep enough that its edges stay out of sight
	ground.mesh = box
	var gm := StandardMaterial3D.new()
	gm.albedo_color = Color("#6fae48")
	ground.material_override = gm
	ground.position = Vector3(TRACK * 0.5, -0.1, -30.0)
	add_child(ground)
	for z in [0.0, 2.2]:            # two lanes: the class (front) and the boss (back)
		var lane := MeshInstance3D.new()
		var lb := BoxMesh.new()
		lb.size = Vector3(TRACK + 6.0, 0.04, 1.6)
		lane.mesh = lb
		var lm := StandardMaterial3D.new()
		lm.albedo_color = Color("#d8a467") if z == 0.0 else Color("#c79457")
		lane.material_override = lm
		lane.position = Vector3(TRACK * 0.5, 0.0, -z)
		add_child(lane)
	for x in range(0, int(TRACK) + 12, 6):   # trees and posts along the far side
		_tree(Vector3(x + randf_range(-1.5, 1.5), 0, -4.5 - randf_range(0.0, 2.0)), randf_range(0.8, 1.3))
	for xx in [0.0, TRACK]:
		for z in [1.0, -3.2]:
			var post := MeshInstance3D.new()
			var c := CylinderMesh.new()
			c.top_radius = 0.07
			c.bottom_radius = 0.07
			c.height = 2.6
			post.mesh = c
			var pm := StandardMaterial3D.new()
			pm.albedo_color = Color("#ffffff")
			post.material_override = pm
			post.position = Vector3(xx, 1.3, z)
			add_child(post)
		var banner := Label3D.new()
		banner.text = "START" if xx == 0.0 else "FINISH"
		banner.font_size = 96
		banner.outline_size = 24
		banner.modulate = Color("#ffffff")
		banner.outline_modulate = Color("#e5655a")
		banner.pixel_size = 0.012
		banner.position = Vector3(xx, 2.9, -1.1)
		add_child(banner)


func _tree(p: Vector3, s: float) -> void:
	var trunk := MeshInstance3D.new()
	var c := CylinderMesh.new()
	c.top_radius = 0.15 * s
	c.bottom_radius = 0.18 * s
	c.height = 1.2 * s
	trunk.mesh = c
	var tm := StandardMaterial3D.new()
	tm.albedo_color = Color("#8a5a34")
	tm.diffuse_mode = BaseMaterial3D.DIFFUSE_TOON
	trunk.material_override = tm
	trunk.position = p + Vector3(0, 0.6 * s, 0)
	add_child(trunk)
	var crown := MeshInstance3D.new()
	var sp := SphereMesh.new()
	sp.radius = 0.9 * s
	sp.height = 1.6 * s
	crown.mesh = sp
	var cm := StandardMaterial3D.new()
	cm.albedo_color = Color("#4c9a3c")
	cm.diffuse_mode = BaseMaterial3D.DIFFUSE_TOON
	crown.material_override = cm
	crown.position = p + Vector3(0, 1.7 * s, 0)
	add_child(crown)


func _setup(msg: Dictionary) -> void:
	reduced = bool(msg.get("reduced", false))
	students = msg.get("students", [])
	if msg.has("track") and float(msg.get("track")) != TRACK:
		TRACK = float(msg.get("track"))
		for c in get_children():
			if c is MeshInstance3D or c is Label3D and c != countdown: c.queue_free()
		_track()
	var n := maxi(1, students.size())
	var leg_len := TRACK / n
	for i in students.size():
		var info: Dictionary = students[i]
		var cr := Creature3D.new()
		add_child(cr)
		cr.setup(info, 0.85)
		# everyone waits at the start of their own leg, along the front lane
		cr.position = Vector3(i * leg_len, 0.02, 0.0)
		cr.face(1.0)
		runners.append(cr)
		var pts := float(info.get("points", 0))
		legs.append([i * leg_len, (i + 1) * leg_len, BASE + min(MAX_BOOST, max(0.0, pts) * BOOST)])
	var b: Dictionary = msg.get("boss", {})
	var path := "res://models/bosses/%s.glb" % str(b.get("id", "grumblethorn"))
	if ResourceLoader.exists(path):
		boss = (load(path) as PackedScene).instantiate()
		Toon.apply(boss)
		boss.scale = Vector3.ONE * 0.75
		boss.rotation_degrees.y = 90.0
		boss.position = Vector3(0, 0.02, -2.2)
		add_child(boss)
		boss_anim = boss.find_child("AnimationPlayer", true, false) as AnimationPlayer
		if boss_anim:
			for nm in ["idle", "walk", "happy"]:
				if boss_anim.has_animation(nm): boss_anim.get_animation(nm).loop_mode = Animation.LOOP_LINEAR
			boss_anim.play("idle")


func _start() -> void:
	if running or runners.is_empty():
		return
	countdown.visible = true
	for k in [3, 2, 1]:
		countdown.text = str(k)
		countdown.position = cam.position + (Vector3(4, 0.8, 0) - cam.position).normalized() * 6.0
		countdown.scale = Vector3.ONE * 1.4
		create_tween().tween_property(countdown, "scale", Vector3.ONE, 0.3)
		await get_tree().create_timer(0.8).timeout
	countdown.text = "GO!"
	get_tree().create_timer(0.6).timeout.connect(func() -> void: countdown.visible = false)
	running = true
	t = 0.0
	leg = 0
	x_runner = 0.0
	x_boss = 0.0
	runners[0].act("walk")
	if boss_anim and boss_anim.has_animation("walk"): boss_anim.play("walk")
	Bridge.send("leg", {"studentId": runners[0].student_id, "index": 0})


func _process(delta: float) -> void:
	if not running:
		return
	t += delta
	# the class: the runner of this leg runs to the next one, who sets off
	if finished_class < 0.0:
		var l: Array = legs[leg]
		x_runner = min(float(l[1]), x_runner + float(l[2]) * delta)
		runners[leg].position.x = x_runner
		if x_runner >= float(l[1]) - 0.001:
			runners[leg].act("happy")
			leg += 1
			if leg >= legs.size():
				finished_class = t
				Fx.burst(self, runners[leg - 1].aim_point(), "light", 1.4, 50)
			else:
				runners[leg].act("walk")
				Fx.burst(self, runners[leg].aim_point(), runners[leg].element, 0.6, 18)
				Bridge.send("leg", {"studentId": runners[leg].student_id, "index": leg})
	if finished_boss < 0.0 and boss:
		x_boss = min(TRACK, x_boss + BOSS_SPEED * delta)
		boss.position.x = x_boss
		if x_boss >= TRACK:
			finished_boss = t
			if boss_anim: boss_anim.play("idle")
	var lead := maxf(x_runner, x_boss * 0.98)
	cam.position = cam.position.lerp(Vector3(lead - 1.5, 3.2, 10.0), min(1.0, delta * 3.0))
	cam.look_at(Vector3(cam.position.x + 3.5, 0.8, -1.0))
	if finished_class >= 0.0 and (finished_boss >= 0.0 or finished_class < t - 0.01):
		running = false
		var win := finished_boss < 0.0 or finished_class <= finished_boss
		var boss_time := finished_boss if finished_boss >= 0.0 else TRACK / BOSS_SPEED
		if win:
			for r in runners: r.act("happy")
			for e in ["fire", "water", "nature", "cosmic", "light"]:
				Fx.burst(self, Vector3(TRACK, 2.0, 0) + Vector3(randf_range(-2, 2), randf_range(0, 1.5), 0), e, 1.4, 40)
		elif boss_anim and boss_anim.has_animation("happy"):
			boss_anim.play("happy")
		Bridge.send("result", {"classTime": snappedf(finished_class, 0.1), "bossTime": snappedf(boss_time, 0.1), "win": win})
