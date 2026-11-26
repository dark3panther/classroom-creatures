extends Node3D
## Memory match (a brain break, two or three minutes): picture cards of creatures from the class's field guide lie
## face down on a table. Turn two over; a pair stays up and shines, two different ones turn back. No words on the
## cards: the pictures are the game. The table is seen from straight above and always fits the screen.
##   init {cards: [{key, picture, element, pixel}], reduced}  ·  start
## It answers: ready, pair {key, found, total}, result {seconds, turns}.

const CARD_W := 1.5
const CARD_H := 2.0
const GAP := 0.32
const CARD_SHADER := preload("res://shaders/card.gdshader")

var cam: Camera3D
var cards: Array = []            # {node, key, up, done, front}
var open: Array = []
var turns := 0
var found := 0
var t0 := 0.0
var busy := false
var running := false
var reduced := false
var grid := Vector2(4, 4)


func _ready() -> void:
	Stage3D.light(self, "world")
	var table := MeshInstance3D.new()
	var b := BoxMesh.new()
	b.size = Vector3(60, 0.3, 40)
	table.mesh = b
	var tm := StandardMaterial3D.new()
	tm.albedo_color = Color("#3d8f68")
	table.material_override = tm
	table.position.y = -0.15
	add_child(table)
	cam = Camera3D.new()
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	cam.keep_aspect = Camera3D.KEEP_HEIGHT
	add_child(cam)
	cam.position = Vector3(0, 20, 0)
	cam.rotation_degrees = Vector3(-90, 0, 0)
	get_viewport().physics_object_picking = true
	get_viewport().size_changed.connect(_fit)
	Bridge.message.connect(_on_message)
	Bridge.send("ready", {"scene": "memory"})


func _on_message(msg: Dictionary) -> void:
	match str(msg.get("type")):
		"init":
			reduced = bool(msg.get("reduced", false))
			_deal(msg.get("cards", []))
		"start":
			running = true
			t0 = Time.get_ticks_msec() / 1000.0


## The columns and rows that show the cards biggest on this screen.
func _layout(n: int) -> Vector2:
	var size := get_viewport().get_visible_rect().size
	var aspect := size.x / maxf(1.0, size.y)
	var best := Vector2(n, 1)
	var best_s := 0.0
	for cols in range(2, n + 1):
		var rows := ceili(float(n) / cols)
		var w := cols * CARD_W + (cols - 1) * GAP + 1.0
		var h := rows * CARD_H + (rows - 1) * GAP + 1.0
		var s := minf(aspect / w, 1.0 / h)
		if s > best_s:
			best_s = s
			best = Vector2(cols, rows)
	return best


## Zoom the camera so the whole table of cards fits, whatever the screen's shape.
func _fit() -> void:
	var size := get_viewport().get_visible_rect().size
	var aspect := size.x / maxf(1.0, size.y)
	var w := grid.x * CARD_W + (grid.x - 1) * GAP + 1.0
	var h := grid.y * CARD_H + (grid.y - 1) * GAP + 1.0
	cam.size = maxf(h, w / aspect)


func _side(colours: Array, back: bool, info: Dictionary) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var q := QuadMesh.new()
	q.size = Vector2(CARD_W, CARD_H)
	mi.mesh = q
	var m := ShaderMaterial.new()
	m.shader = CARD_SHADER
	m.set_shader_parameter("aspect", CARD_W / CARD_H)
	m.set_shader_parameter("top_color", colours[0])
	m.set_shader_parameter("bottom_color", colours[1])
	m.set_shader_parameter("border_color", colours[2])
	m.set_shader_parameter("pattern", 1.0 if back else 0.0)
	mi.material_override = m
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	if not back:
		m.set_shader_parameter("pixel_art", 1.0 if info.get("pixel", false) else 0.0)
		Art.texture(str(info.get("picture", "")), func(tex: Texture2D) -> void:
			if tex == null:
				return
			m.set_shader_parameter("picture", tex)
			m.set_shader_parameter("picture_px", tex)
			m.set_shader_parameter("pic_aspect", float(tex.get_width()) / maxf(1.0, float(tex.get_height())))
			m.set_shader_parameter("has_picture", 1.0))
	return mi


func _deal(list: Array) -> void:
	var deck: Array = []
	for c in list:
		deck.append(c)
		deck.append(c)
	deck.shuffle()
	var n := deck.size()
	grid = _layout(n)
	_fit()
	var cols := int(grid.x)
	var rows := int(grid.y)
	var back_colours := [Color("#3a6fd8"), Color("#2a3f9e"), Color("#ffd23f")]
	for i in n:
		var info: Dictionary = deck[i]
		var card := Node3D.new()
		var col := i % cols
		var row := i / cols
		var in_row := mini(cols, n - row * cols)        # a short last row sits in the middle
		var x := (col - (in_row - 1) / 2.0) * (CARD_W + GAP)
		var z := (row - (rows - 1) / 2.0) * (CARD_H + GAP)
		card.position = Vector3(x, 0.04, z)
		add_child(card)
		# face down to start: the back looks up, the front looks down at the table
		var back := _side(back_colours, true, info)
		back.rotation_degrees.x = -90
		card.add_child(back)
		var pal := Fx.colors(str(info.get("element", "light")))
		var front := _side([(pal[0] as Color).lerp(Color.WHITE, 0.72), (pal[1] as Color).lerp(Color.WHITE, 0.35), Color.WHITE], false, info)
		front.rotation_degrees = Vector3(90, 180, 0)     # face down, the right way round once the card rolls over
		front.position.y = -0.01
		card.add_child(front)
		var area := Area3D.new()
		area.input_ray_pickable = true
		var shape := CollisionShape3D.new()
		var box := BoxShape3D.new()
		box.size = Vector3(CARD_W, 0.3, CARD_H)
		shape.shape = box
		area.add_child(shape)
		card.add_child(area)
		var entry := {"node": card, "key": str(info.get("key")), "up": false, "done": false, "front": front.material_override}
		cards.append(entry)
		area.input_event.connect(func(_c: Node, ev: InputEvent, _p: Vector3, _n: Vector3, _i: int) -> void:
			if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT: _pick(entry))
		# dealt one after another
		if not reduced:
			card.scale = Vector3.ONE * 0.01
			var tw := card.create_tween()
			tw.tween_interval(0.04 * i)
			tw.tween_property(card, "scale", Vector3.ONE, 0.25).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


## Turn a card over: it lifts, rolls over its long side and settles.
func _flip(e: Dictionary, up: bool) -> void:
	e.up = up
	var n: Node3D = e.node
	var tw := n.create_tween()
	var t := 0.12 if reduced else 0.32
	tw.tween_property(n, "position:y", 0.04 if reduced else 0.9, t * 0.5).set_trans(Tween.TRANS_SINE)
	tw.parallel().tween_property(n, "rotation_degrees:z", 180.0 if up else 0.0, t).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tw.tween_property(n, "position:y", 0.04, t * 0.5).set_trans(Tween.TRANS_SINE)


func _pick(e: Dictionary) -> void:
	if not running or busy or e.up or e.done:
		return
	_flip(e, true)
	open.append(e)
	if open.size() < 2:
		return
	turns += 1
	busy = true
	var a: Dictionary = open[0]
	var b: Dictionary = open[1]
	open.clear()
	await get_tree().create_timer(0.5).timeout
	if a.key == b.key:
		a.done = true
		b.done = true
		found += 1
		for x in [a, b]:
			(x.front as ShaderMaterial).set_shader_parameter("glow", 1.0)
			Fx.burst(self, (x.node as Node3D).position + Vector3(0, 0.6, 0), "light", 1.1, 26)
			var pop := (x.node as Node3D).create_tween()
			pop.tween_property(x.node, "scale", Vector3.ONE * 1.12, 0.12)
			pop.tween_property(x.node, "scale", Vector3.ONE, 0.18)
		Bridge.send("pair", {"key": a.key, "found": found, "total": cards.size() / 2})
		if found * 2 >= cards.size():
			running = false
			for e2 in ["fire", "water", "nature", "cosmic", "light"]:
				Fx.burst(self, Vector3(randf_range(-4, 4), 1.5, randf_range(-2, 2)), e2, 1.5, 40)
			Bridge.send("result", {"seconds": snappedf(Time.get_ticks_msec() / 1000.0 - t0, 1.0), "turns": turns})
	else:
		await get_tree().create_timer(0.6).timeout
		_flip(a, false)
		_flip(b, false)
	busy = false
