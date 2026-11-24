class_name Stage3D
extends RefCounted
## Shared set-up for the 3D scenes: sky and ambient light, a sun with soft shadows, region tints.

const REGION_TINT := {
	"verdant": [Color("#cfe9ff"), Color("#8fd0ff"), Color("#fff4dc")],
	"crystal": [Color("#e4dcff"), Color("#9d8cf0"), Color("#efe6ff")],
	"lagoon": [Color("#d2f6ff"), Color("#5fc8e8"), Color("#fff6e0")],
	"frostpeak": [Color("#eef8ff"), Color("#a8d4f0"), Color("#f2f8ff")],
	"ember": [Color("#ffe2c8"), Color("#ff9a6a"), Color("#ffe0b8")],
	"hollow": [Color("#efe0ff"), Color("#b78ae6"), Color("#ffe9f6")],
	"sky": [Color("#e9f6ff"), Color("#9fd8ff"), Color("#fffbe8")],
	"ancient": [Color("#f6ecd8"), Color("#d8b880"), Color("#fff1d6")],
	"dunes": [Color("#fff0d0"), Color("#f2c46b"), Color("#fff4dc")],
	"world": [Color("#dff1ff"), Color("#9fd4ff"), Color("#fff6e6")],
}


## Sky, ambient light and a sun; returns the sun.
static func light(parent: Node, region := "verdant", shadows := true) -> DirectionalLight3D:
	var t: Array = REGION_TINT.get(region, REGION_TINT["verdant"])
	var env := Environment.new()
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = t[1]
	sky_mat.sky_horizon_color = t[0]
	sky_mat.ground_horizon_color = t[0]
	sky_mat.ground_bottom_color = t[0].darkened(0.1)
	sky_mat.sun_angle_max = 30.0
	var sky := Sky.new()
	sky.sky_material = sky_mat
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = t[0].lerp(Color.WHITE, 0.4)
	env.ambient_light_energy = 0.5
	env.reflected_light_source = Environment.REFLECTION_SOURCE_DISABLED
	env.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	var we := WorldEnvironment.new()
	we.environment = env
	parent.add_child(we)
	var sun := DirectionalLight3D.new()
	sun.light_color = t[2]
	sun.light_energy = 0.6
	sun.rotation_degrees = Vector3(-52, -38, 0)
	sun.shadow_enabled = shadows
	sun.shadow_blur = 2.0
	sun.directional_shadow_max_distance = 30.0
	parent.add_child(sun)
	return sun


## A plain round ground (used when a scene has no model of its own).
static func ground(parent: Node, color: Color, radius := 12.0) -> MeshInstance3D:
	var g := MeshInstance3D.new()
	var c := CylinderMesh.new()
	c.top_radius = radius
	c.bottom_radius = radius
	c.height = 0.2
	g.mesh = c
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = 1.0
	g.material_override = m
	g.position.y = -0.1
	parent.add_child(g)
	return g
