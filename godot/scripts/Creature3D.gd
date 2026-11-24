class_name Creature3D
extends Node3D
## A student's creature on the 3D stage: its painting in its outfit (sent by the app) on a card shaded by
## creature.gdshader, a soft shadow at its feet and its owner's first name. act() plays a move on it.

const SHADER := preload("res://shaders/creature.gdshader")
const ELEMENTS := ["fire", "water", "nature", "electric", "ice", "earth", "shadow", "light", "cosmic", "air"]
const ACTIONS := {"idle": 0, "hop": 1, "lunge": 2, "flinch": 3, "happy": 4, "walk": 5, "sleep": 6}

var student_id := ""
var element := "nature"
var body_height := 0.8
var mat: ShaderMaterial
var card: MeshInstance3D
var label: Label3D
var shadow: MeshInstance3D
var _aspect := 1.0
var _pad := 0.2
var _info := {}
var _action_until := 0.0


static func element_index(e: String) -> int:
	var i := ELEMENTS.find(e)
	return i if i >= 0 else 2


func setup(info: Dictionary, height: float, show_name := true) -> void:
	_info = info
	student_id = str(info.get("id", ""))
	element = str(info.get("element", "nature"))
	body_height = height
	mat = ShaderMaterial.new()
	mat.shader = SHADER
	mat.set_shader_parameter("element", element_index(element))
	mat.set_shader_parameter("glow_color", Color(str(info.get("glow", "#ffd27a"))))
	mat.set_shader_parameter("mythic", 1.0 if info.get("mythic", false) else 0.0)
	mat.set_shader_parameter("seed", randf() * 10.0)
	mat.set_shader_parameter("pixelated", 1.0 if info.get("pixel", false) else 0.0)
	mat.set_shader_parameter("energy", float(info.get("energy", 1.0)))
	mat.set_shader_parameter("pad", _pad)
	card = MeshInstance3D.new()
	card.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	card.material_override = mat
	add_child(card)
	_resize(1.0)
	shadow = MeshInstance3D.new()
	var q := QuadMesh.new()
	q.size = Vector2(height * 0.9, height * 0.36)
	q.orientation = PlaneMesh.FACE_Y
	shadow.mesh = q
	var sm := StandardMaterial3D.new()
	sm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	sm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	var g := GradientTexture2D.new()
	g.fill = GradientTexture2D.FILL_RADIAL
	g.fill_from = Vector2(0.5, 0.5)
	g.fill_to = Vector2(1.0, 0.5)
	var grad := Gradient.new()
	grad.set_color(0, Color(0.05, 0.1, 0.2, 0.32))
	grad.set_color(1, Color(0.05, 0.1, 0.2, 0.0))
	g.gradient = grad
	sm.albedo_texture = g
	shadow.material_override = sm
	shadow.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	shadow.position.y = 0.012
	add_child(shadow)
	if show_name and str(info.get("name", "")) != "":
		label = Label3D.new()
		label.text = str(info.get("name"))
		label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		label.no_depth_test = true
		label.font_size = 40
		label.outline_size = 12
		label.modulate = Color("#13253f")
		label.outline_modulate = Color(1, 1, 1, 0.95)
		label.pixel_size = 0.0042 * clamp(height / 0.8, 0.75, 1.3)
		label.position = Vector3(0, 0.02, 0.35)
		label.offset = Vector2(0, -14)
		label.render_priority = 2
		add_child(label)
	var url := str(info.get("picture", info.get("art", "")))
	Art.texture(url, _on_art)


## Swap in a new picture (the creature in a new outfit, or its next form).
func set_picture(url: String) -> void:
	Art.texture(url, _on_art)


func _on_art(tex: Texture2D) -> void:
	if tex == null or not is_instance_valid(self):
		return
	mat.set_shader_parameter("art", tex)
	mat.set_shader_parameter("art_next", tex)
	_resize(float(tex.get_width()) / max(1.0, float(tex.get_height())))


func _resize(aspect: float) -> void:
	_aspect = aspect
	var q := QuadMesh.new()
	var k := 1.0 / (1.0 - 2.0 * _pad)
	q.size = Vector2(body_height * aspect * k, body_height * k)
	q.subdivide_width = 8
	q.subdivide_depth = 12
	# the feet (the bottom of the painting) at the node's origin
	q.center_offset = Vector3(0, body_height * k * 0.5 - body_height * _pad * k, 0)
	card.mesh = q


## Play a move: hop, lunge (toward dir: 1 right, -1 left), flinch, happy (keeps going), walk, sleep, idle.
func act(name: String, dir := 1.0) -> void:
	if not mat:
		return
	mat.set_shader_parameter("action", ACTIONS.get(name, 0))
	mat.set_shader_parameter("t0", Time.get_ticks_msec() / 1000.0)
	mat.set_shader_parameter("lunge_dir", dir)
	var dur: float = {"hop": 0.6, "lunge": 0.65, "flinch": 0.8}.get(name, 0.0)
	_action_until = Time.get_ticks_msec() / 1000.0 + dur if dur > 0.0 else 0.0


func face(dir: float) -> void:
	if mat:
		mat.set_shader_parameter("facing", -1.0 if dir < 0.0 else 1.0)


func set_param(key: String, value: Variant) -> void:
	if mat:
		mat.set_shader_parameter(key, value)


func _process(_delta: float) -> void:
	# one-shot moves fall back to standing (the shader's own clock is TIME, which matches ticks closely enough)
	if _action_until > 0.0 and Time.get_ticks_msec() / 1000.0 > _action_until:
		_action_until = 0.0
		mat.set_shader_parameter("action", 0)


## The point a shot should aim at (the middle of the body).
func aim_point() -> Vector3:
	return global_position + Vector3(0, body_height * 0.55, 0)
