"""Cut a 5-stage evolution lineup (transparent PNG) into stage images.

usage: python3 scripts/slice-lineup.py <lineup.png> <species-id> [outdir]
Writes <outdir>/<species-id>-<1..5>.webp: square 512px canvases, creature bottom-aligned.
Creatures are found as connected shapes; shapes that touch are split at their narrowest
column; small loose bits (embers, sparkles) join the nearest creature.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

src, sid = sys.argv[1], sys.argv[2]
out = Path(sys.argv[3] if len(sys.argv) > 3 else 'public/creatures')
out.mkdir(parents=True, exist_ok=True)
im = Image.open(src).convert('RGBA')
A = np.array(im)[:, :, 3]
H, W = A.shape

body = A > 200                                  # solid creature pixels (excludes soft glow)
body = ndimage.binary_opening(body, iterations=2)
lab, n = ndimage.label(body)
sizes = ndimage.sum(body, lab, range(1, n + 1))
big = [i + 1 for i, s in enumerate(sizes) if s > body.sum() * 0.02]

# column extent of every large shape
spans = []
for i in big:
    xs = np.where((lab == i).any(0))[0]
    spans.append([xs.min(), xs.max() + 1, i])
spans.sort()
# merge shapes that overlap a lot horizontally (e.g. wings drawn as separate shapes)
merged = []
for s in spans:
    if merged and s[0] < merged[-1][1] - 0.5 * (s[1] - s[0]):
        merged[-1][1] = max(merged[-1][1], s[1])
    else:
        merged.append(s[:2])

proj = body.sum(0).astype(float)
def split_widest(segs):
    k = max(range(len(segs)), key=lambda j: segs[j][1] - segs[j][0])
    l, r = segs[k]
    inner = proj[l + (r - l) // 6: r - (r - l) // 6]
    cut = l + (r - l) // 6 + int(np.argmin(ndimage.uniform_filter1d(inner, 25)))
    return segs[:k] + [[l, cut], [cut, r]] + segs[k + 1:]

while len(merged) < 5:
    merged = split_widest(merged)
while len(merged) > 5:  # join the narrowest into its closest neighbour
    k = min(range(len(merged)), key=lambda j: merged[j][1] - merged[j][0])
    j = k - 1 if k == len(merged) - 1 or (k > 0 and merged[k][0] - merged[k - 1][1] <= merged[k + 1][0] - merged[k][1]) else k + 1
    lo, hi = sorted((k, j)); merged[lo] = [merged[lo][0], merged[hi][1]]; del merged[hi]

widths = [r - l for l, r in merged]
if min(widths) < W * 0.06:
    sys.exit(f'{sid}: suspicious split {merged} — needs a manual look')

# column ownership: boundaries halfway between creature extents (or at the split point)
bounds = []
for i, (l, r) in enumerate(merged):
    lb = 0 if i == 0 else (merged[i - 1][1] + l) // 2 if merged[i - 1][1] <= l else l
    rb = W if i == 4 else (r + merged[i + 1][0]) // 2 if r <= merged[i + 1][0] else r
    bounds.append((lb, rb))

# every soft shape (glows, sparkles) belongs to the stage its centre falls in;
# a shape spanning two stages (touching creatures) is cut at the boundary instead
soft = A > 24
slab, sn = ndimage.label(soft)
objs = ndimage.find_objects(slab)
owner = np.full(sn + 1, -1)
spanning = np.zeros(sn + 1, bool)
for k, sl in enumerate(objs, 1):
    x0, x1 = sl[1].start, sl[1].stop
    cx = (x0 + x1) / 2
    owner[k] = next(i for i, (lb, rb) in enumerate(bounds) if lb <= cx < rb or i == 4)
    inside = [max(0, min(x1, rb) - max(x0, lb)) / (rb - lb) for lb, rb in bounds]
    spanning[k] = sum(v > 0.15 for v in inside) >= 2
rgba = np.array(im)
cols = np.arange(W)
crops = []
for i, (lb, rb) in enumerate(bounds):
    own = owner[slab] == i
    span = spanning[slab] & (cols >= lb)[None, :] & (cols < rb)[None, :]
    keep = (own & ~spanning[slab]) | span
    arr = rgba.copy(); arr[..., 3] = np.where(keep, arr[..., 3], 0)
    ys, xs = np.where(arr[..., 3] > 24)
    if len(xs) < 2000:
        sys.exit(f'{sid}: stage {i + 1} came out empty — needs a manual look')
    crops.append(Image.fromarray(arr).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)))

S = 512
k = S * 0.92 / max(max(c.width, c.height) for c in crops)
for n_, c in enumerate(crops, 1):
    kk = k * (1 + 0.55 * (5 - n_) / 4)          # babies a bit larger so they read on cards
    kk = min(kk, S * 0.92 / max(c.width, c.height))
    c2 = c.resize((max(1, round(c.width * kk)), max(1, round(c.height * kk))), Image.LANCZOS)
    canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    canvas.paste(c2, ((S - c2.width) // 2, S - c2.height - 8), c2)
    canvas.save(out / f'{sid}-{n_}.webp', 'WEBP', quality=88, method=6)
print(f'{sid}: ok', bounds)
