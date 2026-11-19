#!/usr/bin/env python3
"""Pixel mode: make chunky pixel-art copies of the painted sky layers (public/sky/*.webp -> public/sky-pixel/*.png).

Each layer is shrunk so one pixel shows as about 5-7 screen pixels at the size SkyWorld draws it, its alpha is
made hard, and its colours are reduced to a small palette. The app draws them with image-rendering: pixelated.
Needs Python 3 with Pillow.
"""
import glob, os, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
SRC, DST = os.path.join(ROOT, 'public', 'sky'), os.path.join(ROOT, 'public', 'sky-pixel')
FACTOR = {'hills': 10, 'meadow': 10, 'mountains': 10, 'cloud': 12, 'island': 9}

os.makedirs(DST, exist_ok=True)
for f in sorted(glob.glob(os.path.join(SRC, '*.webp'))):
    name = os.path.splitext(os.path.basename(f))[0]
    k = next(v for key, v in FACTOR.items() if name.startswith(key))
    im = Image.open(f).convert('RGBA')
    w, h = max(1, round(im.width / k)), max(1, round(im.height / k))
    small = im.resize((w, h), Image.BOX)
    alpha = small.getchannel('A').point(lambda a: 255 if a >= 110 else 0)
    rgb = small.convert('RGB').quantize(colors=14 if name.startswith('cloud') else 20, method=Image.Quantize.MEDIANCUT).convert('RGB')
    out = rgb.convert('RGBA'); out.putalpha(alpha)
    out.save(os.path.join(DST, name + '.png'), optimize=True)
    print(f'{name}: {im.size} -> {out.size}', file=sys.stderr)
