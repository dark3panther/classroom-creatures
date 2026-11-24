extends Node3D
## The class world you can walk around: the island, the five places at the stage the class has built them, the
## decorations it has earned, every student's creature wandering the paths (they stop to greet each other), and the
## befriended bosses dropping by. Drag to turn round the island, scroll or pinch to zoom, tap a creature to see whose
## it is, tap a place to open it in the app.
##   init {students, places: {id: stage}, decorations: [id], visitors: [bossId], reduced}
##   students / pictures (as in the arena) · places {places} (a place that grew pops up) · decorations · visitors
## It answers: ready, tap {studentId}, place {id}.

const SPOTS := {
	"castle": Vector3(0, 0, -5.6), "arena": Vector3(-6.4, 0, -0.6), "library": Vector3(6.4, 0, -0.6),
	"sanctuary": Vector3(-4.3, 0, 4.4), "village": Vector3(4.3, 0, 4.4),
}
const TURN := {"castle": 0.0, "arena": 70.0, "library": -70.0, "sanctuary": 30.0, "village": -30.0}
const DECO_SPOTS := {"fountain": Vector3(0, 0, 0.4), "rainbow": Vector3(0, 0, 7.6), "bunting": Vector3(8.4, 0, 3.4), "lanterns": Vector3(-8.4, 0, 3.4)}
const CELL := 0.5
const HALF := Vector2i(26, 22)

var cam: Camera3D
var yaw := -0.25
var pitch := 0.62
var dist := 19.0
var _drag_from := Vector2.ZERO
var _dragging := false
var _moved := 0.0
var _idle_since := 0.0
var reduced := false
var places := {}           # id -> {stage, node}
var decos := {}
var creatures := {}        # student id -> Creature3D
var walkers := {}          # id -> {path: PackedVector3Array, i, wait, kind}
var visitors := {}         # boss id -> Node3D
var grid := AStarGrid2D.new()
var _greet_cool := {}


func _ready() -> void:
	Stage3D.light(self, "world")
	var g := load("res://models/world/ground.glb") as PackedScene
	if g:
		var island := g.instantiate()
		Toon.apply(island, 0.0)
		add_child(island)
	cam = Camera3D.new()
	cam.fov = 40
	add_child(cam)
	get_viewport().physics_object_picking = true
	_build_grid({})
	Bridge.message.connect(_on_message)
	Bridge.send("ready", {"scene": "world"})


func _on_message(msg: Dictionary) -> void:
	match str(msg.get("type")):
		"init":
			reduced = bool(msg.get("reduced", false))
			_places(msg.get("places", {}), false)
			_decorations(msg.get("decorations", []))
			_students(msg.get("students", []))
			_visitors(msg.get("visitors", []))
		"students": _students(msg.get("students", []))
		"pictures":
			for p in msg.get("list", []):
				var cr: Creature3D = creatures.get(str(p.get("id")))
				if cr: cr.set_picture(str(p.get("picture", "")))
		"places": _places(msg.get("places", {}), true)
		"decorations": _decorations(msg.get("decorations", []))
		"visitors": _visitors(msg.get("visitors", []))


# --- places ------------------------------------------------------------------------------------------
func _model(name: String) -> Node3D:
	var path := "res://models/world/%s.glb" % name
	if not ResourceLoader.exists(path):
		return Node3D.new()
	var n := (load(path) as PackedScene).instantiate() as Node3D
	Toon.apply(n, 0.0)
	for mi in n.find_children("*", "MeshInstance3D", true, false):
		(mi as MeshInstance3D).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	return n


func _places(state: Dictionary, animated: bool) -> void:
	for id in SPOTS.keys():
		var stage := int(state.get(id, places.get(id, {}).get("stage", 0)))
		var had: Dictionary = places.get(id, {})
		if had.has("node") and int(had.get("stage", -1)) == stage:
			continue
		var node := _model("%s_%d" % [id, stage] if stage > 0 else "plot")
		node.position = SPOTS[id]
		node.rotation_degrees.y = TURN[id]
		add_child(node)
		_tap_area(node, Vector3(4.6, 3.0, 4.6), func() -> void: Bridge.send("place", {"id": id}))
		if had.has("node"):
			var old: Node3D = had["node"]
			if animated and not reduced:
				var tw := old.create_tween()
				tw.tween_property(old, "scale", Vector3(1.1, 0.05, 1.1), 0.35).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_IN)
				tw.tween_callback(old.queue_free)
			else:
				old.queue_free()
		if animated and not reduced and int(had.get("stage", 0)) < stage:
			node.scale = Vector3(0.3, 0.01, 0.3)
			var tw2 := node.create_tween()
			tw2.tween_interval(0.3)
			tw2.tween_property(node, "scale", Vector3.ONE, 0.7).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
			Fx.burst(self, SPOTS[id] + Vector3(0, 0.6, 0), "earth", 2.0, 60)
			get_tree().create_timer(0.7).timeout.connect(func() -> void: Fx.burst(self, SPOTS[id] + Vector3(0, 2.5, 0), "light", 2.0, 70))
		places[id] = {"stage": stage, "node": node}
	_build_grid(places)


func _decorations(list: Array) -> void:
	for id in DECO_SPOTS.keys():
		var want: bool = id in list
		if want and not decos.has(id):
			var n := _model("deco_%s" % id)
			n.position = DECO_SPOTS[id]
			if id == "bunting": n.rotation_degrees.y = -35.0
			if id == "lanterns": n.rotation_degrees.y = 35.0
			add_child(n)
			decos[id] = n
		elif not want and decos.has(id):
			decos[id].queue_free()
			decos.erase(id)
	_build_grid(places)


# --- where creatures can walk ------------------------------------------------------------------------
func _build_grid(built: Dictionary) -> void:
	grid.region = Rect2i(-HALF.x, -HALF.y, HALF.x * 2, HALF.y * 2)
	grid.cell_size = Vector2(CELL, CELL)
	grid.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_ONLY_IF_NO_OBSTACLES
	grid.update()
	for x in range(-HALF.x, HALF.x):
		for y in range(-HALF.y, HALF.y):
			var p := Vector3(x * CELL, 0, y * CELL)
			var solid := Vector2(p.x / 11.5, p.z / 10.5).length() > 1.0
			for id in SPOTS.keys():
				var r := 2.5 if int(built.get(id, {}).get("stage", 0)) > 0 else 1.6
				if p.distance_to(SPOTS[id]) < r:
					solid = true
			if decos.has("fountain") and p.distance_to(DECO_SPOTS["fountain"]) < 1.5:
				solid = true
			grid.set_point_solid(Vector2i(x, y), solid)


func _cell(p: Vector3) -> Vector2i:
	return Vector2i(clampi(roundi(p.x / CELL), -HALF.x, HALF.x - 1), clampi(roundi(p.z / CELL), -HALF.y, HALF.y - 1))


func _free_spot() -> Vector3:
	for _i in 40:
		var c := Vector2i(randi_range(-HALF.x, HALF.x - 1), randi_range(-HALF.y, HALF.y - 1))
		if not grid.is_point_solid(c):
			return Vector3(c.x * CELL, 0, c.y * CELL)
	return Vector3(0, 0, 5.5)


func _path(from: Vector3, to: Vector3) -> PackedVector3Array:
	var a := _cell(from)
	var b := _cell(to)
	if grid.is_point_solid(a) or grid.is_point_solid(b):
		return PackedVector3Array([to])
	var pts := grid.get_point_path(a, b)
	var out := PackedVector3Array()
	for v in pts:
		out.append(Vector3(v.x, 0, v.y))
	return out


# --- creatures ---------------------------------------------------------------------------------------
func _students(list: Array) -> void:
	var keep := {}
	for info in list:
		var id := str(info.get("id"))
		keep[id] = true
		if creatures.has(id):
			continue
		var cr := Creature3D.new()
		add_child(cr)
		info["energy"] = 0.35 if reduced else 1.0
		cr.setup(info, 0.55 + 0.06 * float(info.get("stage", 3)))
		if cr.label:
			cr.label.fixed_size = true
			cr.label.pixel_size = 0.0011
			cr.label.font_size = 32
			cr.label.visible = false
		cr.position = _free_spot()
		_tap_area(cr, Vector3(cr.body_height * 0.8, cr.body_height, 0.5), func() -> void: _tapped(cr), Vector3(0, cr.body_height * 0.5, 0))
		creatures[id] = cr
		walkers[id] = {"path": PackedVector3Array(), "i": 0, "wait": randf_range(0.0, 3.0), "kind": "creature"}
	for id in creatures.keys():
		if not keep.has(id):
			creatures[id].queue_free()
			creatures.erase(id)
			walkers.erase(id)


func _tapped(cr: Creature3D) -> void:
	Bridge.send("tap", {"studentId": cr.student_id})
	cr.act("hop")
	if cr.label:
		cr.label.visible = true
		get_tree().create_timer(4.0).timeout.connect(func() -> void: if is_instance_valid(cr) and cr.label: cr.label.visible = _names_on())


func _names_on() -> bool:
	return dist < 13.0


# --- befriended bosses visiting (SpriteCast's 8-facing walk, exported for Godot) ---------------------
func _visitors(list: Array) -> void:
	for id in visitors.keys():
		if id not in list:
			visitors[id].queue_free()
			visitors.erase(id)
			walkers.erase("boss:" + id)
	for id in list:
		if visitors.has(id):
			continue
		var path := "res://sprites/%s/%s.tres" % [id, id]
		if not ResourceLoader.exists(path):
			continue
		var holder := Node3D.new()
		var spr := AnimatedSprite3D.new()
		spr.sprite_frames = load(path)
		spr.billboard = BaseMaterial3D.BILLBOARD_FIXED_Y
		spr.pixel_size = 0.016
		spr.alpha_cut = SpriteBase3D.ALPHA_CUT_DISCARD
		spr.shaded = false
		spr.centered = true
		spr.name = "Body"
		holder.add_child(spr)
		var sh := MeshInstance3D.new()
		var q := QuadMesh.new()
		q.size = Vector2(1.5, 0.6)
		q.orientation = PlaneMesh.FACE_Y
		sh.mesh = q
		var sm := StandardMaterial3D.new()
		sm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		sm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		sm.albedo_texture = Fx.dot_texture()
		sm.albedo_color = Color(0.05, 0.1, 0.2, 0.35)
		sh.material_override = sm
		sh.position.y = 0.015
		holder.add_child(sh)
		holder.position = _free_spot()
		add_child(holder)
		visitors[id] = holder
		walkers["boss:" + id] = {"path": PackedVector3Array(), "i": 0, "wait": randf_range(1.0, 4.0), "kind": "boss", "id": id}
		_play_visitor(id, "idle", Vector3.FORWARD)


const FACINGS := ["south", "south_east", "east", "north_east", "north", "north_west", "west", "south_west"]


func _play_visitor(id: String, action: String, dir: Vector3) -> void:
	var holder: Node3D = visitors.get(id)
	if holder == null:
		return
	var spr := holder.get_node("Body") as AnimatedSprite3D
	# which way it walks, seen from the camera: south is toward the viewer, east to the right of the screen
	var f := cam.global_transform.basis.z
	var r := cam.global_transform.basis.x
	var a := atan2(dir.dot(r), dir.dot(Vector3(f.x, 0, f.z).normalized()))
	var k := posmod(roundi(a / (PI / 4.0)), 8)
	var name := "%s_%s" % [action, FACINGS[k]]
	if spr.sprite_frames.has_animation(name) and spr.animation != name:
		var frame0 := spr.sprite_frames.get_frame_texture(name, 0)
		spr.play(name)
		if frame0:
			# feet on the ground: SpriteCast frames have the feet about 96 % of the way down
			spr.position = Vector3(0, frame0.get_height() * spr.pixel_size * 0.46, 0)


# --- each frame: walking, greetings, the camera ------------------------------------------------------
func _process(delta: float) -> void:
	var t := Time.get_ticks_msec() / 1000.0
	if not _dragging and t - _idle_since > 4.0 and not reduced:
		yaw += delta * 0.04
	pitch = clampf(pitch, 0.35, 1.2)
	dist = clampf(dist, 9.0, 32.0)
	var target := Vector3(0, 0.6, 0.8)
	cam.position = target + Vector3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch)) * dist
	cam.look_at(target, Vector3.UP)
	for id in walkers.keys():
		_walk(id, delta)
	_greetings(t)
	var names := _names_on()
	for cr in creatures.values():
		if cr.label and not cr.label.visible and names:
			cr.label.visible = true
		elif cr.label and cr.label.visible and not names:
			cr.label.visible = false


func _walk(id: String, delta: float) -> void:
	var w: Dictionary = walkers[id]
	var node: Node3D = creatures.get(id) if w.kind == "creature" else visitors.get(w.get("id", ""))
	if node == null:
		return
	if w.wait > 0.0:
		w.wait -= delta
		if w.wait <= 0.0:
			w.path = _path(node.position, _free_spot())
			w.i = 0
			if w.kind == "creature":
				(node as Creature3D).act("walk")
		return
	if w.i >= w.path.size():
		w.wait = randf_range(2.0, 7.0)
		if w.kind == "creature":
			var cr := node as Creature3D
			var r := randf()
			cr.act("happy" if r < 0.15 else ("sleep" if r < 0.22 else "idle"))
			if r < 0.15:
				get_tree().create_timer(1.6).timeout.connect(func() -> void: if is_instance_valid(cr): cr.act("idle"))
		else:
			_play_visitor(w.id, "idle", Vector3.FORWARD)
		return
	var goal: Vector3 = w.path[w.i]
	var to := goal - node.position
	to.y = 0
	var speed := 0.9 if w.kind == "creature" else 1.1
	if to.length() < 0.06:
		w.i += 1
		return
	var step: Vector3 = to.normalized() * minf(to.length(), speed * delta)
	node.position += step
	if w.kind == "creature":
		var screen_dx: float = step.dot(cam.global_transform.basis.x)
		if abs(screen_dx) > 0.001:
			(node as Creature3D).face(screen_dx)
	else:
		_play_visitor(w.id, "walk", step.normalized())


func _greetings(t: float) -> void:
	# two creatures meeting stop, turn to each other and wobble for joy, with a puff of hearts
	var ids := creatures.keys()
	for i in ids.size():
		var a: Creature3D = creatures[ids[i]]
		for j in range(i + 1, ids.size()):
			var b: Creature3D = creatures[ids[j]]
			if a.position.distance_to(b.position) > 0.8:
				continue
			var key := "%s|%s" % [ids[i], ids[j]]
			if t < float(_greet_cool.get(key, 0.0)):
				continue
			_greet_cool[key] = t + 25.0
			for pair in [[a, b, ids[i]], [b, a, ids[j]]]:
				var me: Creature3D = pair[0]
				var other: Creature3D = pair[1]
				me.face((other.position - me.position).dot(cam.global_transform.basis.x))
				me.act("happy")
				var w: Dictionary = walkers[pair[2]]
				w.path = PackedVector3Array()
				w.i = 0
				w.wait = 2.2
			Fx.burst(self, (a.position + b.position) * 0.5 + Vector3(0, 1.0, 0), "love", 0.6, 16)


# --- input: turn, zoom, tap --------------------------------------------------------------------------
func _unhandled_input(ev: InputEvent) -> void:
	if ev is InputEventMouseButton:
		if ev.button_index == MOUSE_BUTTON_WHEEL_UP and ev.pressed:
			dist -= 1.2
		elif ev.button_index == MOUSE_BUTTON_WHEEL_DOWN and ev.pressed:
			dist += 1.2
		elif ev.button_index == MOUSE_BUTTON_LEFT:
			_dragging = ev.pressed
			_moved = 0.0
			_idle_since = Time.get_ticks_msec() / 1000.0
	elif ev is InputEventMouseMotion and _dragging:
		yaw -= ev.relative.x * 0.006
		pitch += ev.relative.y * 0.004
		_moved += ev.relative.length()
	elif ev is InputEventMagnifyGesture:
		dist /= ev.factor
	elif ev is InputEventPanGesture:
		dist += ev.delta.y * 0.6
	elif ev is InputEventKey and ev.pressed:
		match ev.keycode:
			KEY_LEFT: yaw += 0.12
			KEY_RIGHT: yaw -= 0.12
			KEY_UP: dist -= 1.2
			KEY_DOWN: dist += 1.2
		_idle_since = Time.get_ticks_msec() / 1000.0


func _tap_area(node: Node3D, size: Vector3, on_tap: Callable, offset := Vector3(0, -1, 0)) -> void:
	var area := Area3D.new()
	area.input_ray_pickable = true
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = size
	shape.shape = box
	shape.position = offset if offset.y >= 0.0 else Vector3(0, size.y * 0.5, 0)
	area.add_child(shape)
	node.add_child(area)
	area.input_event.connect(func(_c: Node, ev: InputEvent, _p: Vector3, _n: Vector3, _i: int) -> void:
		if ev is InputEventMouseButton and not ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT and _moved < 8.0:
			on_tap.call())
