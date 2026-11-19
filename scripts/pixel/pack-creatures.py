#!/usr/bin/env python3
"""Packs the Pixel Pals animations (claude-pxl output) into one sprite sheet per form and measures them.

  public/creatures-pixel/<id>-<stage>.png   8 columns x 6 rows of 64 x 66 frames:
                                            idle, blink, happy, attack, sleep, hurt (shorter rows are padded)
  src/data/pixelPals.json                   per form: bounds, eyes, mouth, accessory anchors (in the 512 px
                                            space the painted art uses) and, per animation frame, how far the
                                            head moved (so hats and glasses follow it)

Eyes and mouths are found by their reserved colours (scripts/pixel/creatures.px.js). Needs Pillow.
usage: pack-creatures.py <claude-pxl out dir> <repo root>
"""
import json, os, sys
from PIL import Image

src, root = sys.argv[1], sys.argv[2]
ANIMS = [('idle', 8, 7), ('blink', 8, 7), ('happy', 8, 10), ('attack', 8, 9), ('sleep', 4, 3), ('hurt', 4, 8)]
FW, FH = 64, 66
EYE, MOUTH = (0x14, 0x0c, 0x26), (0x7a, 0x22, 0x35)
IDS = sorted({f.split('-')[1] for f in os.listdir(os.path.join(src, 'anims')) if f.startswith('pc-') and f.endswith('.png')})
out_dir = os.path.join(root, 'public', 'creatures-pixel')
os.makedirs(out_dir, exist_ok=True)

def pixels_of(fr, rgb):
    px = fr.load()
    return [(x, y) for y in range(FH) for x in range(FW) if px[x, y][3] and px[x, y][:3] == rgb]

def top_at(fr, x0, x1):
    px = fr.load()
    for y in range(FH):
        if any(px[x, y][3] for x in range(max(0, x0), min(FW, x1))): return y
    return None

to512x = lambda x: round(x * 8, 1)
to512y = lambda y: round((y * 222 / FH - 6) * 512 / 216, 1)

meta = {'frame': [FW, FH], 'anims': {name: {'row': i, 'frames': n, 'fps': fps} for i, (name, n, fps) in enumerate(ANIMS)}, 'forms': {}}
for sid in IDS:
    for st in range(1, 6):
        sheet = Image.new('RGBA', (FW * 8, FH * len(ANIMS)), (0, 0, 0, 0))
        frames = {}
        for r, (name, n, _) in enumerate(ANIMS):
            strip = Image.open(os.path.join(src, 'anims', f'pc-{sid}-{st}-{name}.png')).convert('RGBA')
            frames[name] = [strip.crop((i * FW, 0, i * FW + FW, FH)) for i in range(n)]
            for i, fr in enumerate(frames[name]): sheet.paste(fr, (i * FW, r * FH))
        sheet.save(os.path.join(out_dir, f'{sid}-{st}.png'), optimize=True)
        base = frames['idle'][0]
        bb = base.getbbox()  # left, top, right, bottom
        eyes = pixels_of(base, EYE)
        xs = sorted({x for x, _ in eyes})
        # two eyes: split at the widest gap between eye columns
        gap = max(range(1, len(xs)), key=lambda i: xs[i] - xs[i - 1]) if len(xs) > 1 else 1
        left = [p for p in eyes if p[0] < xs[gap]]; right = [p for p in eyes if p[0] >= xs[gap]]
        c = lambda pts: [round(sum(p[0] for p in pts) / len(pts), 1), round(sum(p[1] for p in pts) / len(pts), 1)]
        eye_l, eye_r = c(left or eyes), c(right or eyes)
        mouth_px = pixels_of(base, MOUTH)
        mouth = c(mouth_px) if mouth_px else [eye_r[0] + 2, eye_r[1] + 4]
        ecx = round((eye_l[0] + eye_r[0]) / 2)
        top0 = top_at(base, ecx - 3, ecx + 4)
        # head width: the run of solid pixels through the eyes on their row
        y0, x0 = round(eye_r[1]), round((eye_l[0] + eye_r[0]) / 2)
        lo = x0
        while lo > 0 and base.getpixel((lo - 1, y0))[3]: lo -= 1
        hi = x0
        while hi < FW - 1 and base.getpixel((hi + 1, y0))[3]: hi += 1
        head_w = hi - lo + 1
        base_cx = sum(p[0] for p in eyes) / len(eyes)
        # the body's middle, where clothes go: over the feet (the lowest quarter of the creature), between the
        # eyes and the ground. A side-on pal's body is behind its head, a front-on pal's is under it.
        h = bb[3] - bb[1]
        feet = [x for y in range(bb[3] - max(2, round(h * 0.25)), bb[3]) for x in range(FW) if base.getpixel((x, y))[3]]
        body = [to512x(sum(feet) / len(feet)), to512y((eye_r[1] + bb[3] - 1) / 2)]
        offsets = {}
        for name, n, _ in ANIMS:
            o = []
            for fr in frames[name]:
                e = pixels_of(fr, EYE)
                dx = round(sum(p[0] for p in e) / len(e) - base_cx) if e else 0
                t = top_at(fr, ecx + dx - 3, ecx + dx + 4)
                o.append([dx, (t - top0) if (t is not None and top0 is not None) else 0])
            offsets[name] = o
        meta['forms'][f'{sid}-{st}'] = {
            'box': [bb[0], bb[1], bb[2] - 1, bb[3] - 1], 'eyes': [eye_l, eye_r], 'mouth': mouth, 'offsets': offsets,
            'anchor': {'top': to512y(top0 if top0 is not None else bb[1]), 'bottom': to512y(bb[3] - 1), 'left': to512x(bb[0]), 'right': to512x(bb[2] - 1),
                       'cx': to512x((bb[0] + bb[2] - 1) / 2), 'headW': round(head_w * 8, 1), 'body': body, 'eyes': [[to512x(eye_l[0]), to512y(eye_l[1])], [to512x(eye_r[0]), to512y(eye_r[1])]]},
        }
with open(os.path.join(root, 'src', 'data', 'pixelPals.json'), 'w') as f:
    json.dump(meta, f, separators=(',', ':'))
print(f'{len(meta["forms"])} forms -> public/creatures-pixel/, src/data/pixelPals.json', file=sys.stderr)
