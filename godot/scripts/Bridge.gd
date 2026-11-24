extends Node
## Messages between this stage and the app around it (the page holding it in an iframe).
## Both ways they are JSON strings sent with window.postMessage: {"type": ..., ...}.
## The app sends {"toGodot": true, ...}; the stage answers {"fromGodot": true, ...}.
## The app keeps every rule, point and reward: the stage only draws what it is told.

signal message(msg: Dictionary)

var params := {}
var _window: JavaScriptObject
var _on_message: JavaScriptObject


func _ready() -> void:
	if not OS.has_feature("web"):
		return
	_window = JavaScriptBridge.get_interface("window")
	_on_message = JavaScriptBridge.create_callback(_received)
	_window.addEventListener("message", _on_message)
	# no JavaScriptBridge.eval: the desktop app's content policy forbids evaluating strings
	var search := str(JavaScriptBridge.get_interface("location").search)
	for part in search.trim_prefix("?").split("&", false):
		var kv := part.split("=")
		params[kv[0].uri_decode()] = kv[1].uri_decode() if kv.size() > 1 else ""


func _received(args: Array) -> void:
	var text = args[0].data
	if typeof(text) != TYPE_STRING:
		return
	var msg = JSON.parse_string(text)
	if typeof(msg) == TYPE_DICTIONARY and msg.get("toGodot", false):
		message.emit(msg)


## Tell the app something ("ready", "tap", "hit", "done", ...).
func send(type: String, data: Dictionary = {}) -> void:
	var msg := data.duplicate()
	msg["type"] = type
	msg["fromGodot"] = true
	if _window:
		_window.parent.postMessage(JSON.stringify(msg), "*")


func param(key: String, fallback: String = "") -> String:
	return params.get(key, fallback)
