extends Node3D
## A check that the stage runs: "ping" is answered with "pong"; "creatures" lays out creatures in a row, each doing
## its moves in turn (the shader check).

var row: Array[Creature3D] = []
var cam: Camera3D
var k := 0


func _ready() -> void:
	Stage3D.light(self, "verdant")
	Stage3D.ground(self, Color("#9ccf6a"))
	cam = Camera3D.new()
	cam.fov = 38
	cam.position = Vector3(0, 1.4, 4.2) if Bridge.param("close") == "1" else Vector3(0, 2.2, 8.5)
	add_child(cam)
	cam.look_at(Vector3(0, 0.7, 0))
	Bridge.message.connect(_on_message)
	var t := Timer.new()
	t.wait_time = 1.4
	t.autostart = true
	t.timeout.connect(_cycle)
	add_child(t)
	Bridge.send("ready", {"scene": "test"})


func _on_message(msg: Dictionary) -> void:
	match msg.get("type"):
		"ping":
			Bridge.send("pong", {"echo": msg.get("value")})
		"creatures":
			for c in row:
				c.queue_free()
			row.clear()
			var list: Array = msg.get("list", [])
			var n := list.size()
			for i in n:
				var c := Creature3D.new()
				add_child(c)
				c.position = Vector3((i - (n - 1) / 2.0) * 1.35, 0, (i % 2) * 0.6)
				c.setup(list[i], 1.0)
				row.append(c)


func _cycle() -> void:
	k += 1
	var moves := ["hop", "lunge", "flinch", "happy", "walk", "idle"]
	for i in row.size():
		row[i].act(moves[(k + i) % moves.size()], 1.0 if i % 2 == 0 else -1.0)
