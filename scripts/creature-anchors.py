"""Measure accessory anchor points on every illustrated creature image.

usage: python3 scripts/creature-anchors.py   (reads public/creatures/*.webp)
Writes src/data/creatureArt.json: { "<id>-<stage>": {top, bottom, left, right, cx, headW, eyes:[[x,y],[x,y]] | null} }
in 512px image coordinates. Eyes are found as the two largest dark, filled blobs in the
upper body (thin outlines are removed first), which is what glasses need to line up.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

out = {}
for f in sorted(Path('public/creatures').glob('*.webp')):
    im = np.array(Image.open(f).convert('RGBA')).astype(int)
    a = im[..., 3] > 128
    ys, xs = np.where(a)
    top, bottom, left, right = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
    h = bottom - top
    # head: the body rows a little below the very top (skip crowns/flames by using the
    # widest band in the top 45% as the head)
    band = a[top: top + int(h * 0.45)]
    widths = band.sum(1)
    row = int(np.argmax(widths[int(len(widths) * 0.2):]) + int(len(widths) * 0.2))
    cols = np.where(band[row])[0]
    cx = int((cols.min() + cols.max()) / 2) if len(cols) else (left + right) // 2
    headW = int(cols.max() - cols.min()) if len(cols) else right - left
    # eyes: dark filled blobs in the top 60% (try a few darkness levels: eye colours vary)
    lum = 0.299 * im[..., 0] + 0.587 * im[..., 1] + 0.114 * im[..., 2]
    eyes = None
    for thr in (90, 120, 150, 180):
        dark = (lum < thr) & a
        dark[top + int(h * 0.62):] = False
        dark = ndimage.binary_opening(dark, iterations=3)
        lab, n = ndimage.label(dark)
        if n < 2: continue
        sizes = ndimage.sum(dark, lab, range(1, n + 1))
        order = np.argsort(sizes)[::-1][:10]
        # anime eyes have a bright catch-light inside the dark iris: require one
        bright = (lum > 225) & a
        cents = []
        boxes = ndimage.find_objects(lab)
        for i in order:
            sl = boxes[i]
            ys0, ys1 = max(0, sl[0].start - 3), sl[0].stop + 3
            xs0, xs1 = max(0, sl[1].start - 3), sl[1].stop + 3
            if bright[ys0:ys1, xs0:xs1].sum() >= 6:
                cents.append((ndimage.center_of_mass(dark, lab, i + 1), sizes[i]))
        best = None
        for i in range(len(cents)):
            for j in range(i + 1, len(cents)):
                (y1, x1), s1 = cents[i]; (y2, x2), s2 = cents[j]
                mid = (x1 + x2) / 2
                if (abs(y1 - y2) < h * 0.08 and 0.06 * 512 < abs(x1 - x2) < 0.8 * headW
                        and min(s1, s2) > 0.35 * max(s1, s2) and abs(mid - cx) < headW * 0.35 and s1 < 4000):
                    if not best or s1 + s2 > best[0]:
                        best = (s1 + s2, sorted([[round(x1), round(y1)], [round(x2), round(y2)]]))
        if best:
            eyes = best[1]; break
    if eyes is None:
        # fallback: chibi proportions, eyes on the head's widest row
        ey = top + row + int(headW * 0.04)
        eyes = [[cx - int(headW * 0.2), ey], [cx + int(headW * 0.2), ey]]
        guessed = True
    else:
        guessed = False
    out[f.stem] = dict(top=top, bottom=bottom, left=left, right=right, cx=cx, headW=headW, eyes=eyes, guessed=guessed)
Path('src/data/creatureArt.json').write_text(json.dumps(out, separators=(',', ':')))
miss = [k for k, v in out.items() if v['guessed']]
print(len(out), 'images;', len(miss), 'with estimated eyes:', ' '.join(miss))
