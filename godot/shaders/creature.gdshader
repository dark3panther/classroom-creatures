// A creature on the 3D stage: its flat painting (with its outfit) on an upright card that always faces the camera,
// brought to life without new art:
//  - movement: a deformation grid (the card is subdivided) breathes, sways, hops, lunges, flinches, wobbles, walks
//  - its element on its own body: fire heat shimmer and flicker, water light ripples, electric crackle, frost
//    sparkle, a nature pulse, shadow smoke, light rays, cosmic stars, air swirls; mythical forms glow
//  - lighting: a soft normal worked out from the painting's silhouette (blurred alpha), so stage lights shade it
//  - evolution: the creature turns to light (silhouette) and dissolves into its next form (art_next)
shader_type spatial;
// shadows_disabled: it casts a shadow but never receives one (its shadow card turns toward the sun and would
// cross its own middle)
render_mode depth_prepass_alpha, cull_disabled, shadows_disabled;

uniform sampler2D art : source_color, filter_linear_mipmap, repeat_disable;
uniform sampler2D art_next : source_color, filter_linear_mipmap, repeat_disable;
uniform float use_next = 0.0;          // 1: show art_next (after the evolution flash)
uniform float pad = 0.2;               // the card reaches this far past the painting on every side (room for auras)
uniform int element = 2;               // 0 fire 1 water 2 nature 3 electric 4 ice 5 earth 6 shadow 7 light 8 cosmic 9 air
uniform vec4 glow_color : source_color = vec4(1.0, 0.8, 0.4, 1.0);
uniform float glow = 0.6;              // strength of the element effect on the body
uniform float mythic = 0.0;            // 1: the aura of a mythical form
uniform float seed = 0.0;
uniform float energy = 1.0;            // how much the idle motion moves (Reduce Motion: small)
uniform int action = 0;                // 0 idle 1 hop 2 lunge 3 flinch 4 happy 5 walk 6 sleep
uniform float t0 = 0.0;                // when the action began (TIME)
uniform float lunge_dir = 1.0;
uniform float facing = 1.0;            // -1 mirrors it
uniform float silhouette = 0.0;        // evolution: 0 the painting .. 1 pure light
uniform float dissolve = 0.0;          // 0 whole .. 1 gone
uniform float pixelated = 0.0;         // Pixel Pals: sample on a pixel grid
uniform float pixels = 64.0;
uniform float brightness = 1.0;

varying float v_hf;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void vertex() {
	// UV.y = 0 at the top of the card; hf = height up the painting (0 at the feet, 1 at the head)
	float hf = clamp((1.0 - UV.y - pad) / (1.0 - 2.0 * pad), 0.0, 1.0);
	v_hf = hf;
	float h = 1.0;                     // the card is 1 unit tall; the node's scale sizes it
	float t = TIME - t0;
	vec3 v = VERTEX;
	// always: breathing (the chest and head rise), a slow sway from the feet
	float br = sin(TIME * 2.1 + seed * 6.3);
	v.y = v.y * (1.0 + 0.022 * energy * br * smoothstep(0.1, 0.9, hf));
	v.x = v.x * (1.0 - 0.012 * energy * br * hf);
	v.x += 0.025 * energy * sin(TIME * 1.05 + seed * 3.1) * hf * hf;
	if (action == 1) {                 // hop
		float k = clamp(t / 0.55, 0.0, 1.0);
		float up = sin(3.14159 * k);
		float squash = (1.0 - smoothstep(0.0, 0.12, k)) * 0.15;
		v.y = v.y * (1.0 - squash + 0.08 * up) + 0.32 * h * up;
		v.x *= 1.0 + squash * 0.7 - 0.04 * up;
	} else if (action == 2) {          // lunge toward its target and back
		float k = sin(3.14159 * clamp(t / 0.6, 0.0, 1.0));
		v.x += lunge_dir * 0.32 * k * (0.35 + 0.65 * hf);
		v.y *= 1.0 - 0.06 * k;
	} else if (action == 3) {          // flinch: a shudder and a squash
		float e = exp(-t * 5.5);
		v.x += sin(t * 42.0) * 0.06 * e * (0.3 + hf);
		v.y *= 1.0 - 0.12 * exp(-t * 9.0);
	} else if (action == 4) {          // happy: little hops and a wobble, over and over
		float hop = abs(sin(TIME * 5.2 + seed));
		v.y += 0.12 * hop;
		v.x += sin(TIME * 9.0 + hf * 4.0) * 0.035 * hf;
	} else if (action == 5) {          // walking: a bob and a waddle
		v.y += abs(sin(TIME * 9.0 + seed)) * 0.05;
		v.x += sin(TIME * 4.5 + seed) * 0.03 * hf;
	} else if (action == 6) {          // asleep: slow, deep breaths
		v.y *= 1.0 + 0.03 * sin(TIME * 1.1);
	}
	v.x *= facing;
	VERTEX = v;
	// stay upright and face the camera (turning round the up axis only), keeping the node's scale
	MODELVIEW_MATRIX = VIEW_MATRIX * mat4(
		vec4(normalize(cross(vec3(0.0, 1.0, 0.0), INV_VIEW_MATRIX[2].xyz)), 0.0),
		vec4(0.0, 1.0, 0.0, 0.0),
		vec4(normalize(cross(INV_VIEW_MATRIX[0].xyz, vec3(0.0, 1.0, 0.0))), 0.0),
		MODEL_MATRIX[3]);
	MODELVIEW_MATRIX = MODELVIEW_MATRIX * mat4(
		vec4(length(MODEL_MATRIX[0].xyz), 0.0, 0.0, 0.0),
		vec4(0.0, length(MODEL_MATRIX[1].xyz), 0.0, 0.0),
		vec4(0.0, 0.0, length(MODEL_MATRIX[2].xyz), 0.0),
		vec4(0.0, 0.0, 0.0, 1.0));
	MODELVIEW_NORMAL_MATRIX = mat3(MODELVIEW_MATRIX);
}

vec4 paint(vec2 auv) {
	if (auv.x < 0.0 || auv.x > 1.0 || auv.y < 0.0 || auv.y > 1.0) return vec4(0.0);
	vec4 a = texture(art, auv), b = texture(art_next, auv);
	return mix(a, b, use_next);
}
float soft(vec2 auv, float lod) {
	vec2 c = clamp(auv, vec2(0.0), vec2(1.0));
	return mix(textureLod(art, c, lod).a, textureLod(art_next, c, lod).a, use_next);
}

void fragment() {
	vec2 uv = UV;
	if (facing < 0.0) uv.x = 1.0 - uv.x;
	vec2 auv = (uv - pad) / (1.0 - 2.0 * pad);
	if (pixelated > 0.5) auv = (floor(auv * pixels) + 0.5) / pixels;
	float t = TIME;
	float hf = 1.0 - auv.y;
	// fire: the air shimmers, more toward the top
	if (element == 0) auv.x += sin(auv.y * 34.0 - t * 9.0 + seed) * 0.0045 * glow * clamp(hf, 0.0, 1.0);
	vec4 c = paint(auv);
	float body = c.a;
	// a soft roundness from the silhouette, so the stage lights shade the painting
	float e = 0.03;
	float hl = soft(auv - vec2(e, 0.0), 3.5), hr = soft(auv + vec2(e, 0.0), 3.5);
	float hd = soft(auv + vec2(0.0, e), 3.5), hu = soft(auv - vec2(0.0, e), 3.5);
	vec3 n = normalize(vec3((hl - hr) * 2.2, (hd - hu) * 2.2, 1.0));
	if (facing < 0.0) n.x = -n.x;
	NORMAL_MAP = n * 0.5 + 0.5;
	NORMAL_MAP_DEPTH = 1.0;
	// edge (just inside the outline) and halo (just outside)
	float wide = soft(auv, 4.5);
	float edge = clamp(body * (1.0 - soft(auv, 2.0)) * 3.0, 0.0, 1.0);
	float halo = clamp(wide * 1.6 - body, 0.0, 1.0);
	vec3 col = c.rgb * brightness;
	vec3 em = vec3(0.0);
	float ha = 0.0;                    // halo opacity
	vec3 gc = glow_color.rgb;
	if (element == 0) {                // fire: flickering warm rim and a heat glow rising
		float fl = noise(vec2(auv.x * 9.0, auv.y * 6.0 + t * 4.0) + seed);
		em += gc * edge * (0.7 + 0.6 * fl) * glow;
		ha = halo * fl * smoothstep(0.0, 0.9, hf + 0.2) * 0.55 * glow;
	} else if (element == 1) {         // water: bands of light rippling across the body
		float r = sin((auv.x * 7.0 + auv.y * 5.0) * 3.0 + t * 2.4 + seed) * sin((auv.x * 4.0 - auv.y * 6.0) * 2.6 - t * 1.7);
		em += gc * body * smoothstep(0.55, 1.0, r) * 0.35 * glow;
		ha = halo * 0.25 * glow;
	} else if (element == 3) {         // electric: sparks crackling on the outline
		float fl = step(0.86, noise(vec2(auv.x * 26.0 + floor(t * 12.0) * 7.0, auv.y * 26.0)));
		em += gc * edge * fl * 2.2 * glow;
		ha = halo * fl * 0.6 * glow;
	} else if (element == 4) {         // ice: a frosty rim and glints
		float g = step(0.97, hash(floor(auv * 60.0) + floor(t * 3.0)));
		em += gc * (edge * 0.45 + body * g * 1.2) * glow;
		ha = halo * 0.2 * glow;
	} else if (element == 2) {         // nature: a slow green pulse
		em += gc * edge * (0.25 + 0.25 * sin(t * 2.0 + seed)) * glow;
		ha = halo * 0.12 * glow;
	} else if (element == 6) {         // shadow: smoke curling round it
		float s = noise(vec2(auv.x * 5.0, auv.y * 5.0 - t * 0.8) + seed);
		ha = halo * s * 0.7 * glow;
		col *= 1.0 - 0.08 * glow;
	} else if (element == 7) {         // light: a warm glow and soft rays
		float a = atan(auv.y - 0.5, auv.x - 0.5);
		ha = halo * (0.45 + 0.35 * sin(a * 9.0 + t * 1.5)) * glow;
		em += gc * edge * 0.4 * glow;
	} else if (element == 8) {         // cosmic: stars twinkling over the body
		float s = step(0.985, hash(floor(auv * 48.0) + seed)) * (0.5 + 0.5 * sin(t * 6.0 + hash(floor(auv * 48.0)) * 20.0));
		em += gc * body * s * 2.0 * glow + gc * edge * 0.3 * glow;
		ha = halo * 0.3 * glow;
	} else if (element == 9) {         // air: swirls passing round it
		float s = smoothstep(0.7, 1.0, sin(atan(auv.y - 0.5, auv.x - 0.5) * 3.0 + length(auv - 0.5) * 18.0 - t * 4.0));
		ha = halo * s * 0.5 * glow;
	} else if (element == 5) {         // earth: a faint dusty rim
		em += gc * edge * 0.15 * glow;
	}
	if (mythic > 0.0) {                // a mythical form: a shimmering aura in shifting colours
		float a = atan(auv.y - 0.5, auv.x - 0.5);
		vec3 rainbow = 0.55 + 0.45 * cos(vec3(0.0, 2.1, 4.2) + a * 2.0 + t * 1.3);
		ha = max(ha, halo * (0.5 + 0.3 * sin(t * 2.5 + a * 5.0)) * mythic);
		gc = mix(gc, rainbow, 0.6 * mythic);
		em += rainbow * edge * 0.5 * mythic;
	}
	// evolution: the painting turns to light, then dissolves (a glowing edge eats it away)
	if (silhouette > 0.0) {
		col = mix(col, vec3(1.0, 0.97, 0.88), silhouette);
		em += vec3(1.0, 0.95, 0.8) * body * silhouette * 1.4;
		ha = max(ha, halo * silhouette * 0.9);
		gc = mix(gc, vec3(1.0, 0.95, 0.8), silhouette);
	}
	float alpha = body;
	if (dissolve > 0.0) {
		float d = noise(auv * 9.0 + seed) * 0.7 + noise(auv * 23.0) * 0.3;
		float cut = dissolve * 1.15 - 0.05;
		float band = smoothstep(cut, cut + 0.08, d);
		em += vec3(1.0, 0.9, 0.6) * body * (1.0 - band) * step(cut - 0.08, d) * 3.0;
		alpha *= step(cut, d);
		ha *= 1.0 - dissolve;
	}
	ALBEDO = mix(gc, col, step(0.02, body) * 1.0);
	EMISSION = em + gc * ha * 0.9;
	ALPHA = clamp(max(alpha, ha * (1.0 - alpha)), 0.0, 1.0);
	ROUGHNESS = 1.0;
	SPECULAR = 0.0;
}

void light() {
	// soft wrap-around light, so the painting is shaded but never goes dark
	float ndl = dot(NORMAL, LIGHT);
	float wrap = clamp(ndl * 0.5 + 0.5, 0.0, 1.0);
	DIFFUSE_LIGHT += mix(0.55, 1.0, wrap) * ATTENUATION * LIGHT_COLOR / PI;
}
