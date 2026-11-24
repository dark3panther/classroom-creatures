extends Node
## Picks the scene the app asked for (stage.html?scene=arena | world | race | stars | memory | evolution | test).

const SCENES := ["arena", "world", "race", "stars", "memory", "evolution", "test"]


func _ready() -> void:
	var name := Bridge.param("scene", "test")
	if name not in SCENES:
		name = "test"
	var script: GDScript = load("res://scripts/scenes/%s.gd" % name.capitalize())
	var scene: Node = script.new()
	scene.name = name.capitalize()
	add_child(scene)
