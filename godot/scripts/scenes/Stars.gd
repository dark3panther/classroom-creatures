extends Node3D
## Catch the stars (a brain break, a minute): one creature at the bottom follows the pointer (or the arrow keys)
## and catches the stars falling from the sky. Gold stars are worth three.
##   init {student, seconds, reduced}  ·  start
## It answers: ready, score {stars}, result {stars}.

var hero: Creature3D
var cam: Camera3D
var stars: Array = []             # [node, speed, value]
var running := false
var left := 60.0
var seconds := 60.0
var score := 0
var spawn_in := 0.0
var target_x := 0.0
var _star_mesh: ArrayMesh
var _keys := 0.0
const W := 7.0                    # half the width of the play area


func _ready() -> void:
	Stage3D.light(self, "sky", false)
	var g := Stage3D.ground(self, Color("#bfe6a0"), 30.0)
	g.position.z = -2.0
	cam = Camera3D.new()
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	cam.size = 10.5
	cam.keep_aspect = Camera3D.KEEP_HEIGHT
	cam.position = Vector3(0, 4.6, 12)
	add_child(cam)
	cam.look_at(Vector3(0, 4.2, 0))
	for i in 6:                                   # drifting clouds behind
		var c := MeshInstance3D.new()
		var sp := SphereMesh.new()
		sp.radius = randf_range(0.8, 1.5)
		sp.height = sp.radius * 1.3
		c.mesh = sp
		var m := StandardMaterial3D.new()
		m.albedo_color = Color(1, 1, 1)
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		c.material_override = m
		c.position = Vector3(randf_range(-9, 9), randf_range(5.5, 9.0), -6)
		add_child(c)
	_star_mesh = _make_star()
	Bridge.message.connect(_on_message)
	Bridge.send("ready", {"scene": "stars"})


func _make_star() -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var pts: Array[Vector3] = []
	for k in 10:
		var a := PI / 2.0 + k * PI / 5.0
		var r := 0.42 if k % 2 == 0 else 0.18
		pts.append(Vector3(cos(a) * r, sin(a) * r, 0))
	for k in 10:
		for face in [1.0, -1.0]:
			st.set_normal(Vector3(0, 0, face))
			st.add_vertex(Vector3(0, 0, 0.08 * face))
			st.add_vertex(pts[k] if face > 0 else pts[(k + 1) % 10])
			st.add_vertex(pts[(k + 1) % 10] if face > 0 else pts[k])
	return st.commit()


func _on_message(msg: Dictionary) -> void:
	match str(msg.get("type")):
		"init":
			seconds = float(msg.get("seconds", 60))
			left = seconds
			hero = Creature3D.new()
			add_child(hero)
			hero.setup(msg.get("student", {}), 1.4, false)
			hero.position = Vector3(0, 0.0, 0.5)
		"start": _start()
		"pictures":
			for p in msg.get("list", []):
				if hero and hero.student_id == str(p.get("id")): hero.set_picture(str(p.get("picture", "")))


func _start() -> void:
	if running:
		return
	score = 0
	left = seconds
	running = true
	hero.act("idle")


func _unhandled_input(ev: InputEvent) -> void:
	if ev is InputEventMouseMotion or (ev is InputEventMouseButton and ev.pressed):
		var vp := get_viewport().get_visible_rect().size
		var from := cam.project_ray_origin(ev.position)
		target_x = clampf(from.x, -W, W)
	elif ev is InputEventKey:
		if ev.keycode == KEY_LEFT: _keys = -1.0 if ev.pressed else 0.0
		if ev.keycode == KEY_RIGHT: _keys = 1.0 if ev.pressed else 0.0


func _process(delta: float) -> void:
	for s in stars:
		(s[0] as Node3D).rotate_z(delta * 2.0)
	if not running or hero == null:
		return
	left -= delta
	target_x = clampf(target_x + _keys * delta * 8.0, -W, W)
	var dx := target_x - hero.position.x
	if abs(dx) > 0.05:
		hero.face(dx)
		hero.position.x += clampf(dx, -9.0 * delta, 9.0 * delta)
	spawn_in -= delta
	var pace := 1.0 - left / seconds                          # it gets a little busier as it goes
	if spawn_in <= 0.0:
		spawn_in = lerpf(0.75, 0.38, pace)
		_spawn(randf() < 0.12)
	var catch_at := hero.position + Vector3(0, 1.0, 0)
	for s in stars.duplicate():
		var n: Node3D = s[0]
		n.position.y -= float(s[1]) * delta
		if n.position.distance_to(catch_at) < 0.85:
			score += int(s[2])
			Fx.burst(self, n.position, "light", 0.8 if s[2] == 1 else 1.4, 18)
			Fx.number(self, n.position, "+%d" % s[2], Color("#ffd23f"), 0.7)
			hero.act("hop")
			n.queue_free()
			stars.erase(s)
			Bridge.send("score", {"stars": score})
		elif n.position.y < -0.5:
			n.queue_free()
			stars.erase(s)
	if left <= 0.0:
		running = false
		for s in stars: (s[0] as Node3D).queue_free()
		stars.clear()
		hero.act("happy")
		for e in ["light", "cosmic", "fire"]:
			Fx.burst(self, hero.aim_point() + Vector3(randf_range(-1, 1), 1, 0), e, 1.4, 40)
		Bridge.send("result", {"stars": score})


func _spawn(gold: bool) -> void:
	var n := MeshInstance3D.new()
	n.mesh = _star_mesh
	var m := StandardMaterial3D.new()
	m.albedo_color = Color("#ffd23f") if gold else Color("#fff1a8")
	m.emission_enabled = true
	m.emission = Color("#ffb000") if gold else Color("#ffe066")
	m.emission_energy_multiplier = 0.6
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	n.material_override = m
	n.scale = Vector3.ONE * (1.6 if gold else 1.0)
	n.position = Vector3(randf_range(-W, W), 9.5, 0.5)
	add_child(n)
	stars.append([n, randf_range(2.4, 3.6) * (0.85 if gold else 1.0), 3 if gold else 1])
