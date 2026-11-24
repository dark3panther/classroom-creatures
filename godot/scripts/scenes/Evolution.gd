extends Node3D
## The evolution moment, behind the app's evolution overlay: the creature charges up and turns to light while its
## element swirls round it and a pillar of light rises; a flash; it dissolves and comes back as its next form, which
## hops for joy among sparkles. The app's text and buttons stay on top.
##   init {from: creature, to: creature (pictures of both forms), element, reduced}
##   start {charge, flash}      times in ms from now (the app's own timeline), so sound and words stay in step
## It answers: ready, flash, revealed.

var cr: Creature3D
var cam: Camera3D
var swirl: CPUParticles3D
var pillar: MeshInstance3D
var light: OmniLight3D
var element := "light"
var to_pic := ""
var reduced := false
var flash_rect: ColorRect


func _ready() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("#16335e")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("#cfe2ff")
	env.ambient_light_energy = 0.7
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	var key := DirectionalLight3D.new()
	key.rotation_degrees = Vector3(-35, -25, 0)
	key.light_energy = 0.55
	add_child(key)
	var floor_mesh := MeshInstance3D.new()
	var disc := CylinderMesh.new()
	disc.top_radius = 1.6
	disc.bottom_radius = 1.7
	disc.height = 0.12
	floor_mesh.mesh = disc
	var fm := StandardMaterial3D.new()
	fm.albedo_color = Color("#2a4f86")
	floor_mesh.material_override = fm
	floor_mesh.position.y = -0.06
	add_child(floor_mesh)
	cam = Camera3D.new()
	cam.fov = 34
	cam.position = Vector3(0, 1.4, 6.6)
	add_child(cam)
	cam.look_at(Vector3(0, 1.0, 0))
	var layer := CanvasLayer.new()
	flash_rect = ColorRect.new()
	flash_rect.color = Color(1, 1, 1, 0)
	flash_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	flash_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(flash_rect)
	add_child(layer)
	Bridge.message.connect(_on_message)
	Bridge.send("ready", {"scene": "evolution"})


func _on_message(msg: Dictionary) -> void:
	match str(msg.get("type")):
		"init":
			reduced = bool(msg.get("reduced", false))
			var from: Dictionary = msg.get("from", {})
			var to: Dictionary = msg.get("to", {})
			element = str(msg.get("element", from.get("element", "light")))
			to_pic = str(to.get("picture", to.get("art", "")))
			cr = Creature3D.new()
			add_child(cr)
			cr.setup(from, 1.7, false)
			Art.texture(to_pic, func(_t: Texture2D) -> void: pass)     # have the new form ready before the flash
			light = OmniLight3D.new()
			light.light_color = Fx.colors(element)[1]
			light.light_energy = 0.0
			light.omni_range = 6.0
			light.position = Vector3(0, 1.2, 1.2)
			add_child(light)
		"start": _run(float(msg.get("charge", 700)) / 1000.0, float(msg.get("flash", 3200)) / 1000.0)


func _run(charge_at: float, flash_at: float) -> void:
	if cr == null:
		return
	await get_tree().create_timer(charge_at).timeout
	var charge := maxf(0.3, flash_at - charge_at)
	# charging: it turns to light, the element swirls round it, a pillar of light rises
	swirl = Fx.emitter(element, 1.2, 60, 1.1)
	swirl.position = Vector3(0, 0.9, 0)
	swirl.orbit_velocity_min = 0.35
	swirl.orbit_velocity_max = 0.6
	swirl.gravity = Vector3(0, 0.8, 0)
	add_child(swirl)
	pillar = MeshInstance3D.new()
	var pm := QuadMesh.new()
	pm.size = Vector2(1.6, 7.0)
	pillar.mesh = pm
	var mat := Fx.particle_material(true)
	mat.billboard_mode = BaseMaterial3D.BILLBOARD_FIXED_Y
	mat.vertex_color_use_as_albedo = false
	mat.albedo_color = Color(Fx.colors(element)[0], 0.0)
	pillar.material_override = mat
	pillar.position = Vector3(0, 3.0, -0.2)
	add_child(pillar)
	var tw := create_tween().set_parallel(true)
	tw.tween_method(func(v: float) -> void: cr.set_param("silhouette", v), 0.0, 1.0, charge).set_trans(Tween.TRANS_SINE)
	tw.tween_property(light, "light_energy", 3.0, charge)
	tw.tween_property(mat, "albedo_color:a", 0.75, charge)
	if not reduced:
		tw.tween_property(cam, "fov", 28.0, charge).set_trans(Tween.TRANS_SINE)
	cr.act("walk")
	await get_tree().create_timer(charge).timeout
	# the flash: it dissolves into light and comes back as its next form
	Bridge.send("flash")
	var f := create_tween()
	f.tween_property(flash_rect, "color:a", 0.9, 0.12)
	f.tween_property(flash_rect, "color:a", 0.0, 0.6)
	cr.set_param("dissolve", 0.0)
	cr.act("idle")
	Art.texture(to_pic, func(tex: Texture2D) -> void:
		if tex: cr.set_param("art_next", tex))
	cr.set_param("use_next", 1.0)
	cr.set_picture(to_pic)
	var d := create_tween().set_parallel(true)
	d.tween_method(func(v: float) -> void: cr.set_param("silhouette", v), 1.0, 0.0, 0.9).set_delay(0.15)
	d.tween_property(light, "light_energy", 0.8, 0.9)
	d.tween_property(mat, "albedo_color:a", 0.0, 0.8)
	d.tween_property(cam, "fov", 34.0, 0.9)
	swirl.emitting = false
	for e in [element, "light", "cosmic"]:
		Fx.burst(self, Vector3(0, 1.0, 0.3), e, 1.6, 50)
	await get_tree().create_timer(0.9).timeout
	cr.act("happy")
	Bridge.send("revealed")
	var ring := Fx.emitter("light", 0.8, 20, 1.4)
	ring.position = Vector3(0, 1.0, 0)
	add_child(ring)
