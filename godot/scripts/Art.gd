extends Node
## Pictures the app hands the stage: creature paintings (with their outfits), as an http(s) URL of the app's own
## files or as a data: URL. Each is loaded once, with mipmaps (the creature shader reads blurred alpha from them).

var _cache := {}
var _waiting := {}


func texture(url: String, done: Callable) -> void:
	if url == "":
		return
	# a data: URL is its own (long) key: keep a short one instead
	var key := ("data#%d#%d" % [url.hash(), url.length()]) if url.begins_with("data:") else url
	if _cache.has(key):
		done.call(_cache[key])
		return
	if _waiting.has(key):
		_waiting[key].append(done)
		return
	_waiting[key] = [done]
	if url.begins_with("data:"):
		var comma := url.find(",")
		var bytes := Marshalls.base64_to_raw(url.substr(comma + 1))
		_finish(key, bytes, url.substr(5, comma - 5))
		return
	var req := HTTPRequest.new()
	add_child(req)
	req.request_completed.connect(func(_result: int, code: int, headers: PackedStringArray, body: PackedByteArray) -> void:
		req.queue_free()
		var kind := ""
		for h in headers:
			if h.to_lower().begins_with("content-type:"):
				kind = h.substr(13).strip_edges()
		if code >= 400:
			body = PackedByteArray()
		var ext := url.get_extension().to_lower().split("?")[0]
		_finish(key, body, ext if ext in ["webp", "png", "jpg", "jpeg"] else kind))
	if req.request(url) != OK:
		_finish(url, PackedByteArray(), "")


func _finish(url: String, bytes: PackedByteArray, kind: String) -> void:
	var img := Image.new()
	var err := ERR_FILE_UNRECOGNIZED
	if bytes.size() > 0:
		if "webp" in kind:
			err = img.load_webp_from_buffer(bytes)
		elif "png" in kind:
			err = img.load_png_from_buffer(bytes)
		elif "jpeg" in kind or "jpg" in kind:
			err = img.load_jpg_from_buffer(bytes)
		else:
			err = img.load_png_from_buffer(bytes)
			if err != OK:
				err = img.load_webp_from_buffer(bytes)
	var tex: Texture2D = null
	if err == OK:
		if img.get_format() != Image.FORMAT_RGBA8:
			img.convert(Image.FORMAT_RGBA8)
		img.generate_mipmaps()
		tex = ImageTexture.create_from_image(img)
		_cache[url] = tex
	else:
		push_warning("stage: could not load a picture (%s)" % url.left(80))
	for cb in _waiting.get(url, []):
		cb.call(tex)
	_waiting.erase(url)
