extends Node3D
## The real-time 3D boss arena. The app runs the battle (HP, rules, rewards) and tells this scene what to draw:
##   init {boss: {id, element, name}, region, students: [...], status, reduced}
##   students {students: [...]}           pictures arriving, outfits changing, someone joining
##   attack {rid, studentId, amount, super, fast}      a creature attacks
##   team {rid, ids, amount, mission, fast}             everyone attacks together
##   strike {rid, studentId, amount, fast}              the boss strikes back
##   status {status: active | paused | won}
## It answers: ready, hit {rid} (at the moment of impact, for the HP bar), done {rid}, tap {studentId}.

const BOSS_SCALE := 1.05
const BOSS_POS := Vector3(2.7, 0.08, -0.6)
const BOSS_TURN := -32.0                  # the boss faces the class, three quarters to the camera

var boss_id := "grumblethorn"
var boss_element := "nature"
var region := "verdant"
var boss: Node3D
var boss_anim: AnimationPlayer
var boss_aura: CPUParticles3D
var boss_light: OmniLight3D
var cam: Camera3D
var cam_base := Transform3D()
var cam_target := Vector3(-0.9, 0.85, 0.0)
var shake := 0.0
var creatures := {}                       # student id -> Creature3D
var dazed := {}                           # student id -> stars node
var status := "active"
var reduced := false
var _turn_back_at := 0.0
var _closeup := false
var _noise := FastNoiseLite.new()
var _set: Node3D
# the camera frames the same part of the arena on every screen: what 50 degrees across shows at 16:9. Wider screens
# (a projector, a wide window) see more at the sides, narrower ones more above and below, so nothing is cut off
const TAN_ACROSS := 0.4663      # tan(25 degrees)
const TAN_UP := 0.2623          # tan(25 degrees) / (16 / 9)
var fov_base := 29.4
var fov_k := 1.0                # zooms scale the framing


func _ready() -> void:
	_noise.frequency = 2.0
	get_viewport().physics_object_picking = true
	cam = Camera3D.new()
	cam.keep_aspect = Camera3D.KEEP_HEIGHT
	cam.fov = fov_base
	add_child(cam)
	_place_camera(false)
	Bridge.message.connect(_on_message)
	get_viewport().size_changed.connect(func() -> void: _place_camera(false))
	Bridge.send("ready", {"scene": "arena"})


func _on_message(msg: Dictionary) -> void:
	match str(msg.get("type")):
		"init": _setup(msg)
		"students": _students(msg.get("students", []))
		"pictures": _pictures(msg.get("list", []))
		"attack": _attack(msg)
		"team": _team(msg)
		"strike": _strike(msg)
		"status": _status(str(msg.get("status", "active")))


# --- setting up ------------------------------------------------------------------------------------
func _setup(msg: Dictionary) -> void:
	var b: Dictionary = msg.get("boss", {})
	boss_id = str(b.get("id", "grumblethorn"))
	boss_element = str(b.get("element", "nature"))
	region = str(msg.get("region", "verdant"))
	reduced = bool(msg.get("reduced", false))
	Stage3D.light(self, region)
	var set_path := "res://models/arena/%s.glb" % region
	if ResourceLoader.exists(set_path):
		_set = (load(set_path) as PackedScene).instantiate()
		Toon.apply(_set, 0.0)
		add_child(_set)
		for mi in _set.find_children("*", "MeshInstance3D", true, false):
			(mi as MeshInstance3D).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	else:
		Stage3D.ground(self, Color("#9ccf6a"))
	_load_boss()
	_students(msg.get("students", []))
	_status(str(msg.get("status", "active")))


func _load_boss() -> void:
	var path := "res://models/bosses/%s.glb" % boss_id
	if not ResourceLoader.exists(path):
		path = "res://models/bosses/grumblethorn.glb"
	boss = (load(path) as PackedScene).instantiate()
	Toon.apply(boss)
	boss.scale = Vector3.ONE * BOSS_SCALE
	boss.position = BOSS_POS
	boss.rotation_degrees.y = BOSS_TURN
	add_child(boss)
	for mi in boss.find_children("*", "MeshInstance3D", true, false):
		(mi as MeshInstance3D).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	boss_anim = boss.find_child("AnimationPlayer", true, false) as AnimationPlayer
	if boss_anim:
		for n in ["idle", "walk", "happy"]:
			if boss_anim.has_animation(n):
				boss_anim.get_animation(n).loop_mode = Animation.LOOP_LINEAR
		boss_anim.animation_finished.connect(func(_n: StringName) -> void: _boss_rest())
		boss_anim.play("idle")
	# its element round it: drifting motes and a soft coloured light
	boss_aura = Fx.emitter(boss_element, 1.6, 28, 1.3)
	boss_aura.position = BOSS_POS + Vector3(0, 1.2, 0)
	add_child(boss_aura)
	boss_aura.emitting = not reduced
	boss_light = OmniLight3D.new()
	boss_light.light_color = Fx.colors(boss_element)[1]
	boss_light.light_energy = 0.6
	boss_light.omni_range = 4.5
	boss_light.position = BOSS_POS + Vector3(-0.6, 1.4, 1.2)
	add_child(boss_light)


func _students(list: Array) -> void:
	var keep := {}
	var n := list.size()
	var cols := clampi(ceili(sqrt(n * 1.7)), 3, 9)
	var rows := ceili(float(n) / cols)
	var height := clampf(0.95 - 0.02 * n, 0.55, 0.9)
	for i in n:
		var info: Dictionary = list[i]
		var id := str(info.get("id"))
		keep[id] = true
		var r := i / cols
		var c := i % cols
		var pos := Vector3(-4.9 + (c + (0.5 if r % 2 == 1 else 0.0)) * (4.4 / max(1, cols - 1)) * 0.95, 0.08, 2.3 - r * (3.3 / max(1, rows)) )
		pos.x = min(pos.x, 0.4)
		var cr: Creature3D = creatures.get(id)
		if cr == null:
			cr = Creature3D.new()
			add_child(cr)
			info["energy"] = 0.35 if reduced else 1.0
			cr.setup(info, height * (0.85 + 0.05 * float(info.get("stage", 3))))
			_add_tap_area(cr)
			creatures[id] = cr
		elif info.has("picture") and str(info.get("picture")) != "":
			cr.set_picture(str(info.get("picture")))
		cr.position = pos
		cr.face(1.0)
		if bool(info.get("dazed", false)):
			_daze(cr, 5.0)
	for id in creatures.keys():
		if not keep.has(id):
			creatures[id].queue_free()
			creatures.erase(id)


func _pictures(list: Array) -> void:
	for p in list:
		var cr: Creature3D = creatures.get(str(p.get("id")))
		if cr:
			cr.set_picture(str(p.get("picture", "")))


func _add_tap_area(cr: Creature3D) -> void:
	var area := Area3D.new()
	area.input_ray_pickable = true
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(cr.body_height * 0.8, cr.body_height, 0.4)
	shape.shape = box
	shape.position.y = cr.body_height * 0.5
	area.add_child(shape)
	cr.add_child(area)
	var id := cr.student_id
	area.input_event.connect(func(_c: Node, ev: InputEvent, _p: Vector3, _n: Vector3, _i: int) -> void:
		if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
			Bridge.send("tap", {"studentId": id})
			cr.act("hop"))


# --- camera ------------------------------------------------------------------------------------------
func _place_camera(animated: bool) -> void:
	var size := get_viewport().get_visible_rect().size
	var aspect := size.x / maxf(1.0, size.y)
	fov_base = rad_to_deg(2.0 * atan(maxf(TAN_UP, TAN_ACROSS / aspect)))
	var pos := Vector3(-1.0, 3.9, 11.8)
	var look := cam_target
	if _closeup:
		pos = BOSS_POS + Vector3(-2.2, 1.7, 4.2)
		look = BOSS_POS + Vector3(0, 1.3, 0)
	var t := Transform3D(Basis(), pos).looking_at(look, Vector3.UP)
	if animated and not reduced:
		var start := cam_base
		var tw := create_tween()
		tw.tween_method(func(k: float) -> void: cam_base = start.interpolate_with(t, k), 0.0, 1.0, 1.4).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	else:
		cam_base = t


func _process(delta: float) -> void:
	var t := Time.get_ticks_msec() / 1000.0
	var drift := Vector3(sin(t * 0.25) * 0.25, sin(t * 0.33) * 0.08, 0.0) if not reduced else Vector3.ZERO
	var jolt := Vector3.ZERO
	if shake > 0.0:
		jolt = Vector3(_noise.get_noise_2d(t * 40.0, 0.0), _noise.get_noise_2d(0.0, t * 40.0), 0.0) * shake * 0.35
		shake = max(0.0, shake - delta * 2.6)
	cam.transform = Transform3D(cam_base.basis, cam_base.origin + drift + jolt)
	cam.fov = fov_base * fov_k
	if boss_light:
		boss_light.light_energy = 0.55 + 0.15 * sin(t * 2.2)
	if _turn_back_at > 0.0 and t > _turn_back_at:
		_turn_back_at = 0.0
		_turn_boss_to(BOSS_TURN)


func _bump(amount: float) -> void:
	if not reduced:
		shake = max(shake, amount)


func _zoom(fov: float, back_after: float) -> void:
	if reduced:
		return
	var tw := create_tween()
	# fov is given against the 50 degrees of the usual framing
	tw.tween_property(self, "fov_k", fov / 50.0, 0.22).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	tw.tween_interval(back_after)
	tw.tween_property(self, "fov_k", 1.0, 0.6).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)


# --- the boss ----------------------------------------------------------------------------------------
func _boss_play(name: String) -> void:
	if boss_anim and boss_anim.has_animation(name):
		boss_anim.play(name, 0.12)


func _boss_rest() -> void:
	if not boss_anim:
		return
	var rest := "happy" if status == "won" else "idle"
	if boss_anim.current_animation != rest:
		boss_anim.play(rest, 0.2)


## Turn the boss (round the up axis) to an angle in degrees, or toward a creature.
func _turn_boss_to(deg: float) -> void:
	if boss == null:
		return
	var tw := create_tween()
	tw.tween_property(boss, "rotation_degrees:y", deg, 0.35).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)


func _face_creature(cr: Creature3D) -> void:
	if boss == null or cr == null:
		return
	var d := cr.global_position - boss.global_position
	var deg := rad_to_deg(atan2(d.x, d.z))
	_turn_boss_to(clampf(deg, -95.0, 20.0))
	_turn_back_at = Time.get_ticks_msec() / 1000.0 + 2.2


func _boss_point(which: String) -> Vector3:
	var top := 2.1 * BOSS_SCALE
	match which:
		"head": return BOSS_POS + Vector3(0, top + 0.2, 0)
		"from": return BOSS_POS + Vector3(-0.5, top * 0.55, 0.4)
	return BOSS_POS + Vector3(0, top * 0.48, 0.2)


# --- moves -------------------------------------------------------------------------------------------
func _attack(msg: Dictionary) -> void:
	var rid = msg.get("rid")
	var fast := bool(msg.get("fast", false))
	var sup := bool(msg.get("super", false))
	var cr: Creature3D = creatures.get(str(msg.get("studentId", "")))
	var element := cr.element if cr else boss_element
	var from := cr.aim_point() if cr else Vector3(-2.5, 1.0, 1.0)
	if cr:
		cr.act("hop")
		_face_creature(cr)
	await get_tree().create_timer(0.12 if fast else 0.22).timeout
	await Fx.shot(self, from, _boss_point("hit") + Vector3(randf_range(-0.2, 0.2), randf_range(-0.2, 0.2), 0), element, 0.38 if fast else 0.55, 1.3 if sup else 1.0)
	Fx.burst(self, _boss_point("hit"), element, 1.4 if sup else 1.0, 60 if sup else 40)
	_boss_play("hurt")
	_bump(0.9 if sup else 0.5)
	if sup:
		_zoom(40.0, 0.5)
	Fx.number(self, _boss_point("head"), ("-%d SUPER!" if sup else "-%d") % int(msg.get("amount", 0)), Color("#ffd23f") if sup else Color.WHITE, 1.2 if sup else 1.0)
	Bridge.send("hit", {"rid": rid})
	await get_tree().create_timer(0.45 if fast else 0.8).timeout
	Bridge.send("done", {"rid": rid})


func _team(msg: Dictionary) -> void:
	var rid = msg.get("rid")
	var fast := bool(msg.get("fast", false))
	var ids: Array = msg.get("ids", [])
	var i := 0
	for id in ids:
		var cr: Creature3D = creatures.get(str(id))
		if cr:
			get_tree().create_timer((i % 12) * 0.045).timeout.connect(func() -> void: if is_instance_valid(cr): cr.act("hop"))
			i += 1
	_zoom(56.0, 1.2)
	await get_tree().create_timer(0.45).timeout
	var shooters := ids.duplicate()
	shooters.shuffle()
	shooters = shooters.slice(0, 4 if fast else 8)
	var k := 0
	for id in shooters:
		var cr: Creature3D = creatures.get(str(id))
		if cr == null:
			continue
		var to := _boss_point("hit") + Vector3(randf_range(-0.5, 0.5), randf_range(-0.4, 0.4), 0)
		get_tree().create_timer(k * 0.11).timeout.connect(func() -> void:
			if is_instance_valid(cr): Fx.shot(self, cr.aim_point(), to, cr.element, 0.55))
		k += 1
	await get_tree().create_timer(k * 0.11 + 0.6).timeout
	for e in (["fire", "electric", "water", "nature", "cosmic"] if msg.get("mission", false) else ["light"]):
		Fx.burst(self, _boss_point("hit") + Vector3(randf_range(-0.4, 0.4), randf_range(-0.2, 0.6), 0), e, 1.6, 50)
	_boss_play("hurt")
	_bump(1.1)
	Fx.number(self, _boss_point("head"), "-%d" % int(msg.get("amount", 0)), Color("#ffd23f"), 1.3)
	Bridge.send("hit", {"rid": rid})
	await get_tree().create_timer(0.9).timeout
	Bridge.send("done", {"rid": rid})


func _strike(msg: Dictionary) -> void:
	var rid = msg.get("rid")
	var fast := bool(msg.get("fast", false))
	var cr: Creature3D = creatures.get(str(msg.get("studentId", "")))
	if cr:
		_face_creature(cr)
	_boss_play("attack")
	await get_tree().create_timer(0.3 if fast else 0.42).timeout
	var target := cr.aim_point() if cr else Vector3(-2.5, 0.8, 1.0)
	await Fx.shot(self, _boss_point("from"), target, boss_element, 0.36 if fast else 0.48, 1.1)
	Fx.burst(self, target, boss_element, 0.9, 36)
	_bump(0.6)
	if cr:
		cr.act("flinch")
		_daze(cr, 5.0)
	var amount := int(msg.get("amount", 0))
	if amount > 0:
		Fx.number(self, _boss_point("head"), "+%d" % amount, Color("#7fe08a"))
	Bridge.send("hit", {"rid": rid})
	await get_tree().create_timer(0.55 if fast else 0.85).timeout
	Bridge.send("done", {"rid": rid})


func _daze(cr: Creature3D, seconds: float) -> void:
	var id := cr.student_id
	if dazed.has(id) and is_instance_valid(dazed[id]):
		dazed[id].queue_free()
	var stars := Fx.emitter("light", 0.7, 10, 0.18)
	stars.position = Vector3(0, cr.body_height + 0.1, 0)
	stars.gravity = Vector3.ZERO
	stars.orbit_velocity_min = 0.6
	stars.orbit_velocity_max = 0.9
	stars.lifetime = 0.9
	cr.add_child(stars)
	dazed[id] = stars
	cr.set_param("brightness", 0.85)
	get_tree().create_timer(seconds).timeout.connect(func() -> void:
		if is_instance_valid(stars): stars.queue_free()
		if is_instance_valid(cr): cr.set_param("brightness", 1.0)
		dazed.erase(id))


func _status(s: String) -> void:
	var was := status
	status = s
	if s == "won":
		_boss_play("happy")
		_turn_boss_to(-12.0)
		_closeup = true
		_place_camera(was != "won")
		if was != "won":
			for e in ["light", "nature", "fire", "water", "cosmic"]:
				Fx.burst(self, _boss_point("head") + Vector3(randf_range(-0.8, 0.8), randf_range(-0.6, 0.3), 0), e, 1.0, 36)
		for cr in creatures.values():
			(cr as Creature3D).act("happy")
	else:
		_closeup = false
		_place_camera(was == "won")
		_boss_rest()
		for cr in creatures.values():
			(cr as Creature3D).act("idle")
		if boss_anim:
			boss_anim.speed_scale = 0.45 if s == "paused" else 1.0
