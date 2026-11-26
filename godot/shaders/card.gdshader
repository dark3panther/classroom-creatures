// One side of a picture card (memory match, shadow quiz): a rounded card with a border, drawn on a flat quad.
//  - front: a soft wash in the creature's element colours with its picture on it, no words
//  - back (pattern = 1): deep blue with a dotted pattern and a gold star
// The quad is the card; corners and border are cut in here, so cards stay crisp at any size.
shader_type spatial;
render_mode unshaded, blend_mix, cull_back, depth_draw_opaque;

uniform vec4 top_color : source_color = vec4(0.95, 0.97, 1.0, 1.0);
uniform vec4 bottom_color : source_color = vec4(0.8, 0.88, 1.0, 1.0);
uniform vec4 border_color : source_color = vec4(1.0);
uniform float aspect = 0.75;           // width / height of the card
uniform float radius = 0.09;           // corner radius, in card heights
uniform float border = 0.035;
uniform float pattern = 0.0;           // 1: the card back
uniform sampler2D picture : source_color, hint_default_transparent, filter_linear_mipmap, repeat_disable;
uniform sampler2D picture_px : source_color, hint_default_transparent, filter_nearest, repeat_disable;
uniform float pixel_art = 0.0;         // 1: a Pixel Pal, sampled crisp
uniform float has_picture = 0.0;
uniform float pic_aspect = 1.0;        // width / height of the picture
uniform float silhouette = 0.0;        // the shadow quiz: 1 shows the creature as a dark shape
uniform float glow = 0.0;              // a found pair shines

float rounded_box(vec2 p, vec2 half_size, float r) {
	vec2 q = abs(p) - half_size + r;
	return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float star5(vec2 p, float r, float rf) {
	const vec2 k1 = vec2(0.809016994375, -0.587785252292);
	const vec2 k2 = vec2(-k1.x, k1.y);
	p.x = abs(p.x);
	p -= 2.0 * max(dot(k1, p), 0.0) * k1;
	p -= 2.0 * max(dot(k2, p), 0.0) * k2;
	p.x = abs(p.x);
	p.y -= r;
	vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
	float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
	return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}

void fragment() {
	vec2 c = vec2((UV.x - 0.5) * aspect, UV.y - 0.5);          // card space: height 1, centred
	float d = rounded_box(c, vec2(0.5 * aspect, 0.5), radius);
	float aa = max(fwidth(d), 1e-4);
	float inside = 1.0 - smoothstep(-aa, aa, d);
	if (inside <= 0.0) discard;
	vec3 col = mix(top_color.rgb, bottom_color.rgb, smoothstep(0.0, 1.0, UV.y));
	if (pattern > 0.5) {
		// the back: rows of dots and a gold star in a ring
		vec2 g = c * 9.0;
		g.x += step(1.0, mod(floor(g.y), 2.0)) * 0.5;
		float dots = 1.0 - smoothstep(0.1, 0.16, length(fract(g) - 0.5));
		col = mix(col, col * 1.25 + 0.04, dots * 0.5);
		float ring = abs(length(c) - 0.24) - 0.018;
		col = mix(col, vec3(1.0, 0.82, 0.25), 1.0 - smoothstep(-aa, aa, ring));
		float s = star5(vec2(c.x, -c.y), 0.17, 0.45);
		col = mix(col, vec3(1.0, 0.86, 0.3), 1.0 - smoothstep(-aa, aa, s));
	} else {
		// the front: a soft light behind the creature, then the creature
		col = mix(col, vec3(1.0), 0.35 * (1.0 - smoothstep(0.05, 0.42, length(c - vec2(0.0, -0.02)))));
		if (has_picture > 0.5) {
			vec2 box = vec2(aspect - 0.16, 0.84);
			float h = min(box.y, box.x / pic_aspect);
			vec2 size = vec2(h * pic_aspect, h);
			vec2 origin = vec2(-0.5 * size.x, 0.42 - size.y);       // stands on the lower part of the card
			vec2 puv = (c - origin) / size;
			if (puv.x >= 0.0 && puv.x <= 1.0 && puv.y >= 0.0 && puv.y <= 1.0) {
				vec4 pc = pixel_art > 0.5 ? texture(picture_px, puv) : texture(picture, puv);
				vec3 pcol = mix(pc.rgb, vec3(0.08, 0.12, 0.25), silhouette);
				col = mix(col, pcol, pc.a);
			}
		}
	}
	float edge = smoothstep(-border - aa, -border + aa, d);
	col = mix(col, border_color.rgb, edge);
	col += vec3(1.0, 0.85, 0.4) * glow * (0.25 + 0.25 * sin(TIME * 5.0));
	ALBEDO = col;
	ALPHA = inside;
}
