"""Measure accessory anchor points on every illustrated creature image.

usage: python3 scripts/creature-anchors.py   (reads public/creatures/*.webp)
Writes src/data/creatureArt.json (with an eyelid per measured eye, for blinking; hand corrections in scripts/creature-anchor-overrides.json are applied last): { "<id>-<stage>": {top, bottom, left, right, cx, headW, eyes:[[x,y],[x,y]] | null} }
in 512px image coordinates. Eyes are found as the two largest dark, filled blobs in the
upper body (thin outlines are removed first), which is what glasses need to line up.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

def hexc(c):
    return '#%02x%02x%02x' % tuple(int(v) for v in c)

def eye_box(lum, a, x, y, maxr):
    """Bounding box of the dark eye shape around (x, y), at the first darkness level that gives a sane size."""
    for thr in (90, 120, 150, 180):
        dark = ndimage.binary_opening((lum < thr) & a, iterations=2)
        lab, n = ndimage.label(dark)
        if not n:
            continue
        win = lab[max(0, y - 8): y + 9, max(0, x - 8): x + 9]
        ids, counts = np.unique(win[win > 0], return_counts=True)
        if not len(ids):
            continue
        sl = ndimage.find_objects((lab == ids[np.argmax(counts)]).astype(int))[0]
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if 6 <= w <= 2 * maxr and 6 <= h <= 2 * maxr:
            return sl
    return None

def dominant(px):
    """The most common colour in a set of pixels (the skin, not highlights, outlines or blush mixed in)."""
    q = (px // 24).astype(int)
    keys = q[:, 0] * 10000 + q[:, 1] * 100 + q[:, 2]
    vals, counts = np.unique(keys, return_counts=True)
    return np.median(px[keys == vals[np.argmax(counts)]], axis=0)

def lid_for(im, a, lum, x, y, maxr, r=None):
    """An eyelid that covers one eye: ellipse radii a little larger than the dark eye shape, the skin
    colour above and below it (sampled on a ring around the eye, outliers such as outlines, crowns and
    blush dropped), and a lash colour from the eye's darkest pixels."""
    if r:  # eye size given by hand (dark fur the eye cannot be told apart from)
        x0, x1, y0, y1 = x - r[0], x + r[0], y - r[1], y + r[1]
    else:
        sl = eye_box(lum, a, x, y, maxr)
        if sl is None:
            return None
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    rx, ry = (x1 - x0) / 2 * 1.3 + 2, (y1 - y0) / 2 * 1.28 + 2
    yy, xx = np.mgrid[0:512, 0:512]
    d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
    ring = (d > 1.2 ** 2) & (d < 1.8 ** 2) & a & (lum > 60) & (lum < 244)
    if ring.sum() < 30:
        return None
    px = im[..., :3][ring].astype(float)
    med = np.median(px, axis=0)
    keep = np.linalg.norm(px - med, axis=1) < 55
    ys = yy[ring][keep]
    px = px[keep]
    if len(px) < 20:
        return None
    return dict(cx=round(cx, 1), cy=round(cy, 1), rx=round(rx, 1), ry=round(ry, 1), _up=px[ys < cy], _low=px[ys >= cy],
                _lash=lash_of(im, a, lum, y0, y1, x0, x1))

def lash_of(im, a, lum, y0, y1, x0, x1):
    region = im[y0:y1, x0:x1, :3][a[y0:y1, x0:x1]]
    l = lum[y0:y1, x0:x1][a[y0:y1, x0:x1]]
    return np.median(region[l <= np.percentile(l, 12)], axis=0) * 0.85

def finish_lids(lids):
    """Both eyelids take the same skin colours, from the rings around both eyes together: a far eye near
    the edge of the face would otherwise pick up highlights, beaks or the background glow."""
    up = np.concatenate([l['_up'] for l in lids]); low = np.concatenate([l['_low'] for l in lids])
    top = dominant(up) if len(up) > 8 else dominant(np.concatenate([up, low]))
    bot = dominant(low) if len(low) > 8 else top
    out = []
    for l in lids:
        out.append(dict(cx=l['cx'], cy=l['cy'], rx=l['rx'], ry=l['ry'], top=hexc(top), bottom=hexc(bot), lash=hexc(l['_lash'])))
    return out

# hand corrections for images the measurement misreads (e.g. storm clouds widening the head band)
ov_path = Path('scripts/creature-anchor-overrides.json')
OVERRIDES = {k: v for k, v in json.loads(ov_path.read_text()).items() if not k.startswith('_')} if ov_path.exists() else {}

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
    eye_boxes = None
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
                cents.append((ndimage.center_of_mass(dark, lab, i + 1), sizes[i], sl))
        best = None
        for i in range(len(cents)):
            for j in range(i + 1, len(cents)):
                (y1, x1), s1, b1 = cents[i]; (y2, x2), s2, b2 = cents[j]
                mid = (x1 + x2) / 2
                if (abs(y1 - y2) < h * 0.08 and 0.06 * 512 < abs(x1 - x2) < 0.8 * headW
                        and min(s1, s2) > 0.35 * max(s1, s2) and abs(mid - cx) < headW * 0.35 and s1 < 4000):
                    if not best or s1 + s2 > best[0]:
                        pair = sorted([(round(x1), round(y1), b1), (round(x2), round(y2), b2)], key=lambda e: e[0])
                        best = (s1 + s2, [[e[0], e[1]] for e in pair], [e[2] for e in pair])
        if best:
            eyes = best[1]; eye_boxes = best[2]; break
    if eyes is None:
        # fallback: chibi proportions, eyes on the head's widest row
        ey = top + row + int(headW * 0.04)
        eyes = [[cx - int(headW * 0.2), ey], [cx + int(headW * 0.2), ey]]
        guessed = True
    else:
        guessed = False
    entry = dict(top=top, bottom=bottom, left=left, right=right, cx=cx, headW=headW, eyes=eyes, guessed=guessed)
    entry.update(OVERRIDES.get(f.stem, {}))
    # eyelids for blinking, measured at the final eye positions; none where the eyes are only estimated
    if not entry['guessed']:
        radii = entry.pop('eyeR', None) or [None, None]
        lids = [lid_for(im, a, lum, int(ex), int(ey), max(14, entry['headW'] * 0.3), r) for (ex, ey), r in zip(entry['eyes'], radii)]
        if all(lids):
            entry['lids'] = finish_lids(lids)
    out[f.stem] = entry
Path('src/data/creatureArt.json').write_text(json.dumps(out, separators=(',', ':')))
miss = [k for k, v in out.items() if v['guessed']]
print(len(out), 'images;', len(miss), 'with estimated eyes:', ' '.join(miss))
