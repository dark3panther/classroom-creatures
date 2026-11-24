extends Node3D
## Memory match (a brain break, two or three minutes): cards with creature forms from the class's field guide lie
## face down on a table. Turn two over; a pair stays up with a sparkle, two different ones turn back.
##   init {cards: [{key, art, name}], reduced}  ·  start
## It answers: ready, pair {key, found, total}, result {seconds, turns}.

var cam: Camera3D
var cards: Array = []            # {node, key, up, done}
var open: Array = []
var turns := 0
var found := 0
var t0 := 0.0
var busy := false
var running := false


func _ready() -> void:
	Stage3D.light(self, "world")
	var table := MeshInstance3D.new()
	var b := BoxMesh.new()
	b.size = Vector3(16, 0.3, 10)
	table.mesh = b
	var tm := StandardMaterial3D.new()
	tm.albedo_color = Color("#2f7a5a")
	table.material_override = tm
	table.position.y = -0.15
	add_child(table)
	cam = Camera3D.new()
	cam.fov = 45
	cam.keep_aspect = Camera3D.KEEP_WIDTH
	add_child(cam)
	cam.position = Vector3(0, 9.5, 5.5)
	cam.look_at(Vector3(0, 0, 0.3))
	get_viewport().physics_object_picking = true
	Bridge.message.connect(_on_message)
	Bridge.send("ready", {"scene": "memory"})


func _on_message(msg: Dictionary) -> void:
	match str(msg.get("type")):
		"init": _deal(msg.get("cards", []))
		"start":
			running = true
			t0 = Time.get_ticks_msec() / 1000.0


func _deal(list: Array) -> void:
	var deck: Array = []
	for c in list:
		deck.append(c)
		deck.append(c)
	deck.shuffle()
	var n := deck.size()
	var cols := 4 if n <= 12 else (5 if n <= 20 else 6)
	var rows := ceili(float(n) / cols)
	for i in n:
		var info: Dictionary = deck[i]
		var card := Node3D.new()
		var x := (i % cols - (cols - 1) / 2.0) * 2.1
		var z := (i / cols - (rows - 1) / 2.0) * 2.7
		card.position = Vector3(x, 0.05, z)
		add_child(card)
		var body := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(1.7, 0.08, 2.3)
		body.mesh = bm
		var back := StandardMaterial3D.new()
		back.albedo_color = Color("#4f86d0")
		body.material_override = back
		card.add_child(body)
		var star := Label3D.new()             # the back: a star on blue
		star.text = "?"
		star.font_size = 160
		star.outline_size = 0
		star.modulate = Color("#ffd23f")
		star.rotation_degrees.x = -90
		star.position.y = 0.05
		star.pixel_size = 0.006
		card.add_child(star)
		var face := MeshInstance3D.new()       # the front (down): cream with the creature on it
		var q := QuadMesh.new()
		q.size = Vector2(1.6, 2.2)
		face.mesh = q
		var fm := StandardMaterial3D.new()
		fm.albedo_color = Color("#fff8e8")
		fm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		face.material_override = fm
		face.rotation_degrees.x = -90
		face.position.y = 0.05
		face.visible = false
		card.add_child(face)
		var pic := MeshInstance3D.new()
		var pq := QuadMesh.new()
		pq.size = Vector2(1.4, 1.4)
		pic.mesh = pq
		var pm := StandardMaterial3D.new()
		pm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		pm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		pic.material_override = pm
		pic.rotation_degrees.x = -90
		pic.position = Vector3(0, 0.06, -0.2)
		pic.visible = false
		card.add_child(pic)
		var name := Label3D.new()
		name.text = str(info.get("name", ""))
		name.font_size = 44
		name.modulate = Color("#13253f")
		name.outline_size = 0
		name.rotation_degrees = Vector3(-90, 0, 0)
		name.position = Vector3(0, 0.07, 0.85)
		name.visible = false
		name.pixel_size = 0.005
		card.add_child(name)
		Art.texture(str(info.get("art", "")), func(tex: Texture2D) -> void: if tex: pm.albedo_texture = tex)
		var area := Area3D.new()
		area.input_ray_pickable = true
		var shape := CollisionShape3D.new()
		var box := BoxShape3D.new()
		box.size = Vector3(1.7, 0.3, 2.3)
		shape.shape = box
		area.add_child(shape)
		card.add_child(area)
		var entry := {"node": card, "key": str(info.get("key")), "up": false, "done": false, "back": [star], "front": [face, pic, name], "body": back}
		cards.append(entry)
		area.input_event.connect(func(_c: Node, ev: InputEvent, _p: Vector3, _n: Vector3, _i: int) -> void:
			if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT: _pick(entry))


## Turn a card over: up on its edge, show the other side, back down.
func _flip(e: Dictionary, up: bool) -> void:
	e.up = up
	var n: Node3D = e.node
	var tw := n.create_tween()
	tw.tween_property(n, "position:y", 0.5, 0.1)
	tw.parallel().tween_property(n, "rotation_degrees:z", 90.0, 0.14).set_trans(Tween.TRANS_SINE)
	tw.tween_callback(func() -> void:
		for x in e.back: (x as Node3D).visible = not up
		for x in e.front: (x as Node3D).visible = up
		(e.body as StandardMaterial3D).albedo_color = Color("#fff8e8") if up else Color("#4f86d0"))
	tw.tween_property(n, "rotation_degrees:z", 0.0, 0.14).set_trans(Tween.TRANS_SINE)
	tw.parallel().tween_property(n, "position:y", 0.05, 0.14)


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
	await get_tree().create_timer(0.45).timeout
	if a.key == b.key:
		a.done = true
		b.done = true
		found += 1
		Fx.burst(self, (a.node as Node3D).position + Vector3(0, 0.5, 0), "light", 1.0, 24)
		Fx.burst(self, (b.node as Node3D).position + Vector3(0, 0.5, 0), "light", 1.0, 24)
		Bridge.send("pair", {"key": a.key, "found": found, "total": cards.size() / 2})
		if found * 2 >= cards.size():
			running = false
			for e2 in ["fire", "water", "nature", "cosmic"]:
				Fx.burst(self, Vector3(randf_range(-4, 4), 1.5, randf_range(-2, 2)), e2, 1.5, 40)
			Bridge.send("result", {"seconds": snappedf(Time.get_ticks_msec() / 1000.0 - t0, 1.0), "turns": turns})
	else:
		await get_tree().create_timer(0.5).timeout
		_flip(a, false)
		_flip(b, false)
	busy = false
