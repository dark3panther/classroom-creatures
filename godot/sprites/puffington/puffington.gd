extends Node2D
## puffington, written by SpriteCast's export.py. The node's position is the point between the feet (on a seat: where the body rests).
##   play("walk", "south-east")      facings: south, south-east, east, north-east, north, north-west, west, south-west
## Each animation has its own frame size, so the Body's, the Shadow's and the Effect's offsets are set per animation, from the table below.
## Effect: what a swing leaves in the air (water, flame, leaves ...), over the body; it runs at its own pace beside the body's frames.

const OFFSETS := {   # animation: [body offset, shadow offset, effect offset] from the feet, px
	&"walk_south": [Vector2(-59.1, -105.4), Vector2(-59.1, -20.400000000000006), Vector2(-59.1, -105.4)],
	&"idle_south": [Vector2(-59.1, -105.4), Vector2(-59.1, -19.400000000000006), Vector2(-59.1, -105.4)],
	&"walk_south_east": [Vector2(-59.1, -105.4), Vector2(-59.1, -21.400000000000006), Vector2(-59.1, -105.4)],
	&"idle_south_east": [Vector2(-59.1, -105.4), Vector2(-59.1, -19.400000000000006), Vector2(-59.1, -105.4)],
	&"walk_east": [Vector2(-59.1, -105.4), Vector2(-59.1, -24.400000000000006), Vector2(-59.1, -105.4)],
	&"idle_east": [Vector2(-59.1, -105.4), Vector2(-59.1, -23.400000000000006), Vector2(-59.1, -105.4)],
	&"walk_north_east": [Vector2(-59.1, -105.4), Vector2(-59.1, -21.400000000000006), Vector2(-59.1, -105.4)],
	&"idle_north_east": [Vector2(-59.1, -105.4), Vector2(-59.1, -20.400000000000006), Vector2(-59.1, -105.4)],
	&"walk_north": [Vector2(-59.1, -105.4), Vector2(-59.1, -21.400000000000006), Vector2(-59.1, -105.4)],
	&"idle_north": [Vector2(-59.1, -105.4), Vector2(-59.1, -20.400000000000006), Vector2(-59.1, -105.4)],
	&"walk_north_west": [Vector2(-59.1, -105.4), Vector2(-59.1, -22.400000000000006), Vector2(-59.1, -105.4)],
	&"idle_north_west": [Vector2(-59.1, -105.4), Vector2(-59.1, -21.400000000000006), Vector2(-59.1, -105.4)],
	&"walk_west": [Vector2(-59.1, -105.4), Vector2(-59.1, -22.400000000000006), Vector2(-59.1, -105.4)],
	&"idle_west": [Vector2(-59.1, -105.4), Vector2(-59.1, -20.400000000000006), Vector2(-59.1, -105.4)],
	&"walk_south_west": [Vector2(-59.1, -105.4), Vector2(-59.1, -21.400000000000006), Vector2(-59.1, -105.4)],
	&"idle_south_west": [Vector2(-59.1, -105.4), Vector2(-59.1, -20.400000000000006), Vector2(-59.1, -105.4)],
}

@onready var body: AnimatedSprite2D = $Body
@onready var shadow: AnimatedSprite2D = $Shadow
@onready var effect: AnimatedSprite2D = $Effect

func _ready() -> void:
	body.frame_changed.connect(func(): shadow.frame = body.frame)
	play_named(&"idle_south")

func has(action: String, facing: String) -> bool:
	return OFFSETS.has(StringName((action + "_" + facing).replace("-", "_")))

func play(action: String, facing: String, restart := false) -> void:
	play_named(StringName((action + "_" + facing).replace("-", "_")), restart)

func play_named(anim: StringName, restart := false) -> void:
	if not OFFSETS.has(anim) or (body.animation == anim and body.is_playing() and not restart):
		return
	body.offset = OFFSETS[anim][0]
	shadow.offset = OFFSETS[anim][1]
	shadow.visible = shadow.sprite_frames.get_frame_count(anim) > 0
	shadow.animation = anim
	effect.offset = OFFSETS[anim][2]
	effect.visible = effect.sprite_frames.get_frame_count(anim) > 0
	body.play(anim)
	body.frame = 0
	shadow.frame = 0
	if effect.visible:
		effect.play(anim)
		effect.frame = 0
