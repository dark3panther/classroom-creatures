extends Node3D
## Whose shadow? (a brain break, two or three minutes): a creature from the class's field guide shows as a dark
## silhouette on a big card; three or four picture cards wait underneath. The class calls out the answer and the
## teacher taps it: the right card lights up and the silhouette turns into the creature; a wrong card only wobbles
## (no one loses anything) and the class tries again.
##   init {rounds: [{answer, options: [key]}], pictures: {key: {picture, element, pixel}}, reduced}  ·  start
## It answers: ready, round {index, total}, answer {correct, first}, result {first, rounds}.

const CARD_SHADER := preload("res://shaders/card.gdshader")
const BIG := Vector2(3.0, 4.0)
const SMALL := Vector2(1.9, 2.5)

var cam: Camera3D
var rounds: Array = []
var pictures: Dictionary = {}
var index := -1
var first := 0
var tried := false
var busy := false
var reduced := false
var main: MeshInstance3D
var main_mat: ShaderMaterial
var options: Array = []            # {node, key, mat}
var spot: MeshInstance3D


func _ready() -> void:
	Stage3D.light(self, "world", false)
	var wall := MeshInstance3D.new()
	var wq := QuadMesh.new()
	wq.size = Vector2(60, 30)
	wall.mesh = wq
	var wm := StandardMaterial3D.new()
	wm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	wm.albedo_color = Color("#2a3f7e")
	wall.material_override = wm
	wall.position = Vector3(0, 0, -1.0)
	add_child(wall)
	# a soft spotlight behind the big card
	spot = MeshInstance3D.new()
	var sq := QuadMesh.new()
	sq.size = Vector2(7.5, 7.5)
	spot.mesh = sq
	var sm := StandardMaterial3D.new()
	sm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	sm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	var g := GradientTexture2D.new()
	g.fill = GradientTexture2D.FILL_RADIAL
	g.fill_from = Vector2(0.5, 0.5)
	g.fill_to = Vector2(1.0, 0.5)
	var grad := Gradient.new()
	grad.set_color(0, Color(1.0, 0.92, 0.6, 0.55))
	grad.set_color(1, Color(1.0, 0.92, 0.6, 0.0))
	g.gradient = grad
	sm.albedo_texture = g
	spot.material_override = sm
	spot.position = Vector3(0, 1.4, -0.9)
	add_child(spot)
	cam = Camera3D.new()
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	cam.keep_aspect = Camera3D.KEEP_HEIGHT
	cam.position = Vector3(0, 0, 12)
	add_child(cam)
	_fit()
	get_viewport().size_changed.connect(_fit)
	get_viewport().physics_object_picking = true
	main = _card(BIG, false)
	main_mat = main.material_override
	main.position = Vector3(0, 1.4, 0)
	main.visible = false
	add_child(main)
	Bridge.message.connect(_on_message)
	Bridge.send("ready", {"scene": "quiz"})


func _fit() -> void:
	var size := get_viewport().get_visible_rect().size
	var aspect := size.x / maxf(1.0, size.y)
	cam.size = maxf(8.4, 10.0 / aspect)
	cam.position.y = -0.4


func _on_message(msg: Dictionary) -> void:
	match str(msg.get("type")):
		"init":
			reduced = bool(msg.get("reduced", false))
			rounds = msg.get("rounds", [])
			pictures = msg.get("pictures", {})
		"start":
			if index < 0 and not rounds.is_empty():
				_next()


func _card(size: Vector2, back: bool) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var q := QuadMesh.new()
	q.size = size
	mi.mesh = q
	var m := ShaderMaterial.new()
	m.shader = CARD_SHADER
	m.set_shader_parameter("aspect", size.x / size.y)
	m.set_shader_parameter("pattern", 1.0 if back else 0.0)
	mi.material_override = m
	return mi


func _paint(m: ShaderMaterial, key: String, big: bool) -> void:
	var info: Dictionary = pictures.get(key, {})
	var pal := Fx.colors(str(info.get("element", "light")))
	if big:
		m.set_shader_parameter("top_color", Color("#fff6d8"))
		m.set_shader_parameter("bottom_color", Color("#ffd27a"))
		m.set_shader_parameter("border_color", Color("#ffd23f"))
	else:
		m.set_shader_parameter("top_color", (pal[0] as Color).lerp(Color.WHITE, 0.72))
		m.set_shader_parameter("bottom_color", (pal[1] as Color).lerp(Color.WHITE, 0.35))
		m.set_shader_parameter("border_color", Color.WHITE)
	m.set_shader_parameter("pixel_art", 1.0 if info.get("pixel", false) else 0.0)
	m.set_shader_parameter("has_picture", 0.0)
	m.set_shader_parameter("glow", 0.0)
	Art.texture(str(info.get("picture", "")), func(tex: Texture2D) -> void:
		if tex == null:
			return
		m.set_shader_parameter("picture", tex)
		m.set_shader_parameter("picture_px", tex)
		m.set_shader_parameter("pic_aspect", float(tex.get_width()) / maxf(1.0, float(tex.get_height())))
		m.set_shader_parameter("has_picture", 1.0))


func _next() -> void:
	index += 1
	for o in options:
		(o.node as Node3D).queue_free()
	options.clear()
	if index >= rounds.size():
		main.visible = false
		for e in ["fire", "water", "nature", "cosmic", "light"]:
			Fx.burst(self, Vector3(randf_range(-4, 4), randf_range(-1, 2.5), 0.5), e, 1.6, 40)
		Bridge.send("result", {"first": first, "rounds": rounds.size()})
		return
	var r: Dictionary = rounds[index]
	tried = false
	busy = false
	_paint(main_mat, str(r.get("answer")), true)
	main_mat.set_shader_parameter("silhouette", 1.0)
	main.visible = true
	main.scale = Vector3.ONE * 0.6
	main.create_tween().tween_property(main, "scale", Vector3.ONE, 0.3 if not reduced else 0.01).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	var keys: Array = r.get("options", [])
	var n := keys.size()
	for i in n:
		var key := str(keys[i])
		var node := Node3D.new()
		node.position = Vector3((i - (n - 1) / 2.0) * (SMALL.x + 0.35), -2.55, 0)
		add_child(node)
		var c := _card(SMALL, false)
		node.add_child(c)
		var m: ShaderMaterial = c.material_override
		_paint(m, key, false)
		var area := Area3D.new()
		area.input_ray_pickable = true
		var shape := CollisionShape3D.new()
		var box := BoxShape3D.new()
		box.size = Vector3(SMALL.x, SMALL.y, 0.2)
		shape.shape = box
		area.add_child(shape)
		node.add_child(area)
		var entry := {"node": node, "key": key, "mat": m}
		options.append(entry)
		area.input_event.connect(func(_c: Node, ev: InputEvent, _p: Vector3, _n: Vector3, _i: int) -> void:
			if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT: _pick(entry))
		if not reduced:
			node.scale = Vector3.ONE * 0.01
			var tw := node.create_tween()
			tw.tween_interval(0.15 + 0.08 * i)
			tw.tween_property(node, "scale", Vector3.ONE, 0.25).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	Bridge.send("round", {"index": index, "total": rounds.size()})


func _pick(e: Dictionary) -> void:
	if busy or index < 0 or index >= rounds.size():
		return
	var r: Dictionary = rounds[index]
	var node: Node3D = e.node
	if str(e.key) == str(r.get("answer")):
		busy = true
		if not tried:
			first += 1
		(e.mat as ShaderMaterial).set_shader_parameter("glow", 1.0)
		var tw := create_tween()
		tw.tween_method(func(v: float) -> void: main_mat.set_shader_parameter("silhouette", v), 1.0, 0.0, 0.5 if not reduced else 0.05)
		Fx.burst(self, main.position + Vector3(0, 0, 0.5), str((pictures.get(str(e.key), {}) as Dictionary).get("element", "light")), 1.8, 60)
		Fx.burst(self, node.position + Vector3(0, 0, 0.5), "light", 1.0, 24)
		main.create_tween().tween_property(main, "scale", Vector3.ONE * 1.08, 0.15).set_trans(Tween.TRANS_SINE)
		Bridge.send("answer", {"correct": true, "first": not tried})
		await get_tree().create_timer(1.8).timeout
		_next()
	else:
		tried = true
		(e.mat as ShaderMaterial).set_shader_parameter("top_color", Color("#c9ced8"))
		(e.mat as ShaderMaterial).set_shader_parameter("bottom_color", Color("#9aa3b2"))
		var x := node.position.x
		var tw := node.create_tween()
		for k in 3:
			tw.tween_property(node, "position:x", x + 0.12, 0.05)
			tw.tween_property(node, "position:x", x - 0.12, 0.05)
		tw.tween_property(node, "position:x", x, 0.05)
		Bridge.send("answer", {"correct": false, "first": false})
