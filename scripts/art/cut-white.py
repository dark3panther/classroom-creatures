#!/usr/bin/env python3
"""Cut a generated creature off a plain white background and fit it to the app's 512x512 art.

usage: python3 scripts/art/cut-white.py <generated.png> public/creatures/<id>-5b.webp public/creatures/<id>-5.webp
needs: pip install "rembg[cpu]" scipy pillow numpy   (downloads the isnet-anime model on first run)

The model matte is merged with a colour-to-alpha matte against white, so glows, star dust and floating
parts the model drops are kept; shapes closed by an outline are made solid. The result is scaled to the
reference (Legendary) art's height and floor line so both final forms read at the same size.
"""
import sys
import numpy as np
from PIL import Image
from rembg import new_session, remove

session = new_session('isnet-anime')

def cut(src, dst, ref=None, size=512, fill=0.86, max_w=500):
    im = Image.open(src).convert('RGB')
    m = remove(im, session=session, only_mask=True)            # model matte (L)
    a = np.asarray(m).astype(np.float32) / 255.0
    rgb = np.asarray(im).astype(np.float32)
    # colour-to-alpha against white: exact for glows, dust and floating parts the model may drop
    ca = (255.0 - rgb).max(axis=2) / 255.0
    ca = np.clip((ca - 0.035) / (1 - 0.035), 0, 1)
    # drop isolated specks (compression noise) from the colour matte
    from scipy import ndimage
    lab, n = ndimage.label(ca > 0.12)
    if n:
        sizes = ndimage.sum(np.ones_like(ca), lab, range(1, n + 1))
        small = np.isin(lab, np.where(sizes < 40)[0] + 1)
        ca[small] = 0
    a2 = np.maximum(a, ca)
    # shapes closed by an outline (floating orbs, gems) are solid, not see-through: fill coloured holes
    solid = a2 > 0.6
    filled = ndimage.binary_fill_holes(solid)
    holes, nh = ndimage.label(filled & ~solid)
    if nh:
        means = ndimage.mean(ca, holes, range(1, nh + 1))
        for i, m in enumerate(means):
            if m > 0.10:
                a2[holes == i + 1] = 1.0
    a2[a2 < 0.02] = 0
    safe = np.maximum(a2, 1e-3)[..., None]
    col = np.clip((rgb - (1 - a2[..., None]) * 255.0) / safe, 0, 255)
    col = np.where(a2[..., None] > 0.995, rgb, col)
    out = np.dstack([col, a2 * 255]).astype(np.uint8)
    img = Image.fromarray(out, 'RGBA')
    ys, xs = np.where(a2 > 0.08)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    img = img.crop(box)
    w, h = img.size
    floor = size - round(size * 0.018)
    if ref:  # match the Legendary art: same height and floor line, so the two forms read at the same scale
        ra = np.asarray(Image.open(ref).convert('RGBA'))[..., 3] > 128
        rys, rxs = np.where(ra)
        target_h, floor = rys.max() - rys.min() + 1, rys.max() + 1
        k = min(target_h / h, max_w / w, (floor - 4) / h)
    else:
        k = (size * fill) / max(w, h)
    img = img.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    x = (size - img.width) // 2
    y = floor - img.height
    canvas.alpha_composite(img, (x, max(0, y)))
    canvas.save(dst, 'WEBP', quality=90, method=6)
    return box

if __name__ == '__main__':
    print(cut(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None))
