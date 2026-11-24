class_name Toon
extends RefCounted
## The boss models and sets come from Blender with flat colours and a dark outline shell (faces turned inside out).
## Here they get cartoon shading: toon diffuse, no shine, the outline unlit, and back faces culled (the outline
## shell only shows where it peeks out round the silhouette).

const INK := Color("#2b2140")


static func apply(root: Node, rim := 0.12) -> void:
	for node in root.find_children("*", "MeshInstance3D", true, false):
		var mi := node as MeshInstance3D
		if mi.mesh == null:
			continue
		for i in mi.mesh.get_surface_count():
			var src := mi.get_active_material(i)
			if not (src is BaseMaterial3D):
				continue
			var m: BaseMaterial3D = src.duplicate()
			m.cull_mode = BaseMaterial3D.CULL_BACK
			var c := m.albedo_color
			if abs(c.r - INK.r) + abs(c.g - INK.g) + abs(c.b - INK.b) < 0.12:
				m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
				m.albedo_color = INK
			else:
				# toon light is all-or-nothing, so the lit side would glare at full strength: start a little darker
				m.albedo_color = Color(c.r * 0.8, c.g * 0.8, c.b * 0.8, c.a)
				m.diffuse_mode = BaseMaterial3D.DIFFUSE_TOON
				m.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
				m.roughness = 1.0
				m.metallic = 0.0
				if rim > 0.0:
					m.rim_enabled = true
					m.rim = rim
					m.rim_tint = 0.4
			mi.set_surface_override_material(i, m)


## Grey stone for statues.
static func stone(root: Node) -> void:
	for node in root.find_children("*", "MeshInstance3D", true, false):
		var mi := node as MeshInstance3D
		for i in mi.mesh.get_surface_count():
			var m := mi.get_active_material(i)
			if m is BaseMaterial3D and (m as BaseMaterial3D).shading_mode != BaseMaterial3D.SHADING_MODE_UNSHADED:
				var s: BaseMaterial3D = m.duplicate()
				var v := s.albedo_color.get_luminance()
				s.albedo_color = Color(0.55, 0.53, 0.6).lerp(Color(0.85, 0.84, 0.9), v)
				mi.set_surface_override_material(i, s)
