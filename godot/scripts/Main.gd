extends Node
## Picks the scene the app asked for (stage.html?scene=arena | world | race | stars | memory | evolution | test), and
## with pixel=1 (the app's Pixel mode) draws it as pixel art.

const SCENES := ["arena", "world", "race", "stars", "memory", "quiz", "bubbles", "evolution", "test"]


func _ready() -> void:
	var name := Bridge.param("scene", "test")
	if name not in SCENES:
		name = "test"
	var script: GDScript = load("res://scripts/scenes/%s.gd" % name.capitalize())
	var scene: Node = script.new()
	scene.name = name.capitalize()
	if Bridge.param("pixel", "") == "1":
		# Pixel mode: the scene renders into a small viewport that is blown up without smoothing, so the 3D stage
		# looks like the rest of the app in Pixel mode (input and picking pass through the container)
		var box := SubViewportContainer.new()
		box.set_anchors_preset(Control.PRESET_FULL_RECT)
		box.stretch = true
		box.stretch_shrink = 3
		box.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		box.mouse_filter = Control.MOUSE_FILTER_STOP
		add_child(box)
		var view := SubViewport.new()
		view.msaa_3d = Viewport.MSAA_DISABLED
		view.handle_input_locally = true
		view.audio_listener_enable_3d = true
		box.add_child(view)
		view.add_child(scene)
	else:
		add_child(scene)
