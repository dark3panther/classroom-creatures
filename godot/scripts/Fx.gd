class_name Fx
extends RefCounted
## Effects for the stage: element particles, shots that fly from a creature to the boss (and back), impacts,
## floating numbers, camera shake. All CPU particles and plain materials, so they run in the web build.

const PALETTE := {
	"fire": [Color("#ffcf4a"), Color("#ff8a2b"), Color("#f2542d")],
	"water": [Color("#bdf0ff"), Color("#5ab8f0"), Color("#2b8fd6")],
	"nature": [Color("#e3ff9e"), Color("#7fcf6a"), Color("#3e9d3a")],
	"electric": [Color("#ffffff"), Color("#fff07a"), Color("#ffd23f")],
	"ice": [Color("#ffffff"), Color("#c6f4ff"), Color("#7fd0ff")],
	"earth": [Color("#f4d9a0"), Color("#c99a5a"), Color("#8a5a2b")],
	"shadow": [Color("#d9c6ff"), Color("#8f66e6"), Color("#4a2f8a")],
	"light": [Color("#ffffff"), Color("#fff1a8"), Color("#ffd23f")],
	"cosmic": [Color("#ffffff"), Color("#c6a8ff"), Color("#5a3fb0")],
	"air": [Color("#ffffff"), Color("#dff6ff"), Color("#a8dcf0")],
	"love": [Color("#ffffff"), Color("#ffb3cf"), Color("#ff6b9a")],
}

static var _dot: Texture2D


static func colors(element: String) -> Array:
	return PALETTE.get(element, PALETTE["light"])


static func dot_texture() -> Texture2D:
	if _dot == null:
		var g := GradientTexture2D.new()
		g.width = 64
		g.height = 64
		g.fill = GradientTexture2D.FILL_RADIAL
		g.fill_from = Vector2(0.5, 0.5)
		g.fill_to = Vector2(1.0, 0.5)
		var grad := Gradient.new()
		grad.offsets = PackedFloat32Array([0.0, 0.35, 1.0])
		grad.colors = PackedColorArray([Color(1, 1, 1, 1), Color(1, 1, 1, 0.7), Color(1, 1, 1, 0)])
		g.gradient = grad
		_dot = g
	return _dot


static func particle_material(additive := true) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD if additive else BaseMaterial3D.BLEND_MODE_MIX
	m.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	m.vertex_color_use_as_albedo = true
	m.albedo_texture = dot_texture()
	m.no_depth_test = false
	return m


static func ramp(element: String, alpha_end := 0.0) -> Gradient:
	var c := colors(element)
	var g := Gradient.new()
	g.offsets = PackedFloat32Array([0.0, 0.4, 1.0])
	var last: Color = c[2]
	last.a = alpha_end
	g.colors = PackedColorArray([c[0], c[1], last])
	return g


## A burst of particles in an element's colours at `pos` (an impact, a sparkle). Frees itself.
static func burst(parent: Node, pos: Vector3, element: String, size := 1.0, amount := 40) -> void:
	var p := CPUParticles3D.new()
	var q := QuadMesh.new()
	q.size = Vector2(0.16, 0.16) * size
	q.material = particle_material(element != "shadow" and element != "earth")
	p.mesh = q
	p.amount = amount
	p.one_shot = true
	p.explosiveness = 0.92
	p.lifetime = 0.9
	p.direction = Vector3(0, 1, 0)
	p.spread = 180.0
	p.initial_velocity_min = 1.2 * size
	p.initial_velocity_max = 3.4 * size
	p.gravity = Vector3(0, -2.5 if element in ["earth", "water", "ice"] else -0.4, 0)
	p.damping_min = 1.5
	p.damping_max = 3.0
	p.scale_amount_min = 0.5
	p.scale_amount_max = 1.6
	p.color_ramp = ramp(element)
	if element == "fire":
		p.gravity = Vector3(0, 1.8, 0)
	elif element == "electric":
		p.lifetime = 0.45
		p.initial_velocity_max = 5.0 * size
	parent.add_child(p)
	p.global_position = pos
	p.emitting = true
	_flash(parent, pos, colors(element)[1], 2.5 * size, 0.35)
	parent.get_tree().create_timer(p.lifetime + 0.4).timeout.connect(p.queue_free)


## A short flash of coloured light.
static func _flash(parent: Node, pos: Vector3, color: Color, energy: float, time: float) -> void:
	var l := OmniLight3D.new()
	l.light_color = color
	l.light_energy = energy
	l.omni_range = 3.5
	parent.add_child(l)
	l.global_position = pos
	var tw := l.create_tween()
	tw.tween_property(l, "light_energy", 0.0, time)
	tw.tween_callback(l.queue_free)


## A continuous emitter in an element's colours (an aura round a boss, a trail behind a shot).
static func emitter(element: String, size := 1.0, amount := 24, spread := 0.5) -> CPUParticles3D:
	var p := CPUParticles3D.new()
	var q := QuadMesh.new()
	q.size = Vector2(0.12, 0.12) * size
	q.material = particle_material(element != "shadow")
	p.mesh = q
	p.amount = amount
	p.lifetime = 1.1
	p.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
	p.emission_sphere_radius = spread
	p.direction = Vector3(0, 1, 0)
	p.spread = 40.0
	p.initial_velocity_min = 0.2
	p.initial_velocity_max = 0.7
	p.gravity = Vector3(0, 0.6 if element in ["fire", "light", "air", "shadow"] else -0.3, 0)
	p.scale_amount_min = 0.5
	p.scale_amount_max = 1.4
	p.color_ramp = ramp(element)
	return p


## A shot flying from `from` to `to` along a low arc, with a glowing core and a trail. Await the returned signal.
static func shot(parent: Node, from: Vector3, to: Vector3, element: String, seconds := 0.55, size := 1.0) -> Signal:
	var holder := Node3D.new()
	parent.add_child(holder)
	holder.global_position = from
	var core := MeshInstance3D.new()
	var s := SphereMesh.new()
	s.radius = 0.13 * size
	s.height = 0.26 * size
	core.mesh = s
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = colors(element)[0]
	m.emission_enabled = true
	m.emission = colors(element)[1]
	core.material_override = m
	core.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	holder.add_child(core)
	var glow := MeshInstance3D.new()
	var gq := QuadMesh.new()
	gq.size = Vector2(0.7, 0.7) * size
	var gm := particle_material(true)
	gm.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	gm.vertex_color_use_as_albedo = false
	gm.albedo_color = colors(element)[1]
	gq.material = gm
	glow.mesh = gq
	holder.add_child(glow)
	var trail := emitter(element, size * 0.9, 40, 0.08)
	trail.lifetime = 0.5
	trail.local_coords = false
	holder.add_child(trail)
	var light := OmniLight3D.new()
	light.light_color = colors(element)[1]
	light.light_energy = 1.6
	light.omni_range = 2.2
	holder.add_child(light)
	var arc := from.distance_to(to) * 0.22
	var tw := holder.create_tween()
	tw.tween_method(func(k: float) -> void:
		if is_instance_valid(holder):
			holder.global_position = from.lerp(to, k) + Vector3(0, sin(PI * k) * arc, 0), 0.0, 1.0, seconds).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN)
	tw.tween_callback(func() -> void:
		core.visible = false
		glow.visible = false
		trail.emitting = false
		light.visible = false)
	tw.tween_interval(0.6)
	tw.tween_callback(holder.queue_free)
	return tw.step_finished


## A number floating up from `pos` and fading ("-5", "+2", "-6 SUPER!").
static func number(parent: Node, pos: Vector3, text: String, color: Color, size := 1.0, rise := 1.1) -> void:
	var l := Label3D.new()
	l.text = text
	l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	l.no_depth_test = true
	l.font_size = int(96 * size)
	l.outline_size = int(28 * size)
	l.modulate = color
	l.outline_modulate = Color("#13253f")
	l.pixel_size = 0.006
	l.render_priority = 10
	parent.add_child(l)
	l.global_position = pos
	l.scale = Vector3.ONE * 0.4
	var tw := l.create_tween().set_parallel(true)
	tw.tween_property(l, "scale", Vector3.ONE, 0.25).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_property(l, "global_position", pos + Vector3(0, rise, 0), 1.4).set_ease(Tween.EASE_OUT)
	tw.chain().tween_property(l, "modulate:a", 0.0, 0.35)
	tw.chain().tween_callback(l.queue_free)
