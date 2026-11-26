extends Node3D
## Element bubbles (one minute, a brain break): bubbles float up, each carrying one of the class's creatures. The
## screen names an element ("Pop the water creatures!") and the class pops the bubbles whose creature has it; the
## element changes every few seconds. A wrong bubble only wobbles. Teaches the elements with the class's own
## creatures; pass the mouse round the class.
##   init {students: [creature info], seconds, reduced}  ·  pictures {list}  ·  start
## It answers: ready, target {element}, score {popped}, result {popped}.

const SWITCH_EVERY := 12.0

var cam: Camera3D
var creatures: Array = []          # creature infos from the app
var picture_of := {}               # student id -> picture data URL
var rig_of := {}                   # student id -> its puppet layout
var bubbles: Array = []            # {node, cr, element, speed, phase, popped}
var running := false
var seconds := 60.0
var t := 0.0
var spawn_in := 0.0
var target := ""
var switch_in := 0.0
var popped := 0
var reduced := false
var half_w := 6.0


func _ready() -> void:
	Stage3D.light(self, "lagoon", false)
	var back := MeshInstance3D.new()
	var q := QuadMesh.new()
	q.size = Vector2(60, 30)
	back.mesh = q
	var bm := StandardMaterial3D.new()
	bm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	var g := GradientTexture2D.new()
	g.fill_from = Vector2(0.5, 0.0)
	g.fill_to = Vector2(0.5, 1.0)
	var grad := Gradient.new()
	grad.set_color(0, Color("#7fd3ff"))
	grad.set_color(1, Color("#2a6fd0"))
	g.gradient = grad
	bm.albedo_texture = g
	back.material_override = bm
	back.position = Vector3(0, 0, -3)
	add_child(back)
	cam = Camera3D.new()
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	cam.keep_aspect = Camera3D.KEEP_HEIGHT
	cam.size = 9.0
	cam.position = Vector3(0, 0, 12)
	add_child(cam)
	_fit()
	get_viewport().size_changed.connect(_fit)
	get_viewport().physics_object_picking = true
	Bridge.message.connect(_on_message)
	Bridge.send("ready", {"scene": "bubbles"})


func _fit() -> void:
	var size := get_viewport().get_visible_rect().size
	half_w = cam.size * 0.5 * size.x / maxf(1.0, size.y) - 0.8


func _on_message(msg: Dictionary) -> void:
	match str(msg.get("type")):
		"init":
			reduced = bool(msg.get("reduced", false))
			creatures = msg.get("students", [])
			seconds = float(msg.get("seconds", 60))
		"pictures":
			for p in msg.get("list", []):
				picture_of[str(p.get("id"))] = str(p.get("picture", ""))
				rig_of[str(p.get("id"))] = p.get("rig")
				for b in bubbles:
					if (b.cr as Creature3D).student_id == str(p.get("id")):
						(b.cr as Creature3D).set_picture(str(p.get("picture", "")), p.get("rig"))
		"start":
			if not running and not creatures.is_empty():
				running = true
				t = 0.0
				_new_target()


## A new element to pop: one that some creature in the class has (and not the one just played).
func _new_target() -> void:
	var elements: Array = []
	for c in creatures:
		var e := str(c.get("element", "light"))
		if e not in elements:
			elements.append(e)
	if elements.size() > 1:
		elements.erase(target)
	target = str(elements[randi() % elements.size()])
	switch_in = SWITCH_EVERY
	Bridge.send("target", {"element": target})


func _spawn() -> void:
	# one bubble in two (or so) carries a creature of the element being played, so there is always something to pop
	var pool: Array = creatures
	var match_pool := creatures.filter(func(c: Dictionary) -> bool: return str(c.get("element")) == target)
	if not match_pool.is_empty() and randf() < 0.5:
		pool = match_pool
	var info: Dictionary = pool[randi() % pool.size()]
	var node := Node3D.new()
	node.position = Vector3(randf_range(-half_w, half_w), -5.6, 0)
	add_child(node)
	var sphere := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.85
	sm.height = 1.7
	sphere.mesh = sm
	var mat := StandardMaterial3D.new()
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color = Color(1, 1, 1, 0.16)
	mat.rim_enabled = true
	mat.rim = 1.0
	mat.rim_tint = 0.2
	mat.metallic_specular = 1.0
	mat.roughness = 0.1
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_PER_PIXEL
	sphere.material_override = mat
	sphere.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	node.add_child(sphere)
	var cr := Creature3D.new()
	node.add_child(cr)
	var copy := info.duplicate()
	copy["energy"] = 0.4 if reduced else 1.0
	cr.setup(copy, 1.05, false)
	cr.position = Vector3(0, -0.55, 0.1)
	cr.shadow.visible = false
	var pic := str(picture_of.get(str(info.get("id")), ""))
	if pic != "":
		cr.set_picture(pic, rig_of.get(str(info.get("id"))))
	var area := Area3D.new()
	area.input_ray_pickable = true
	var shape := CollisionShape3D.new()
	var s := SphereShape3D.new()
	s.radius = 0.9
	shape.shape = s
	area.add_child(shape)
	node.add_child(area)
	var entry := {"node": node, "cr": cr, "element": str(info.get("element", "light")), "speed": randf_range(1.0, 1.6) * (0.6 if reduced else 1.0), "phase": randf() * TAU, "popped": false, "x": node.position.x}
	bubbles.append(entry)
	area.input_event.connect(func(_c: Node, ev: InputEvent, _p: Vector3, _n: Vector3, _i: int) -> void:
		if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT: _pop(entry))


func _pop(b: Dictionary) -> void:
	if not running or b.popped:
		return
	var node: Node3D = b.node
	if str(b.element) == target:
		b.popped = true
		popped += 1
		Fx.burst(self, node.position, str(b.element), 1.3, 36)
		Fx.number(self, node.position + Vector3(0, 0.6, 0.5), "+1", Color("#ffd23f"), 0.9)
		var tw := node.create_tween()
		tw.tween_property(node, "scale", Vector3.ONE * 1.3, 0.08)
		tw.tween_property(node, "scale", Vector3.ONE * 0.01, 0.12)
		tw.tween_callback(node.queue_free)
		Bridge.send("score", {"popped": popped})
	else:
		var tw := node.create_tween()
		tw.tween_property(node, "scale", Vector3(1.15, 0.85, 1), 0.08)
		tw.tween_property(node, "scale", Vector3(0.9, 1.1, 1), 0.08)
		tw.tween_property(node, "scale", Vector3.ONE, 0.1)


func _process(delta: float) -> void:
	if not running:
		return
	t += delta
	switch_in -= delta
	if switch_in <= 0.0:
		_new_target()
	spawn_in -= delta
	if spawn_in <= 0.0 and t < seconds:
		_spawn()
		spawn_in = randf_range(0.45, 0.8) * (1.4 if reduced else 1.0)
	for b in bubbles.duplicate():
		if b.popped or not is_instance_valid(b.node):
			bubbles.erase(b)
			continue
		var node: Node3D = b.node
		node.position.y += float(b.speed) * delta
		node.position.x = float(b.x) + sin(t * 1.3 + float(b.phase)) * 0.35
		if node.position.y > 5.8:
			node.queue_free()
			bubbles.erase(b)
	if t >= seconds and bubbles.is_empty():
		running = false
		for e in ["water", "light", "cosmic"]:
			Fx.burst(self, Vector3(randf_range(-3, 3), randf_range(-1, 2), 0.5), e, 1.6, 40)
		Bridge.send("result", {"popped": popped})
	elif t >= seconds + 6.0:
		for b in bubbles:
			if is_instance_valid(b.node):
				(b.node as Node3D).queue_free()
		bubbles.clear()
