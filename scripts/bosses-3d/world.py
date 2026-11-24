"""The class world for the Godot stage (headless Blender): the island and every place at every stage.

    blender -b -P scripts/bosses-3d/world.py [-- --out godot/models/world]

Writes ground.glb (the island: grass, a winding path, a pond, trees round the edge), plot.glb (an empty plot with
stakes and a sign), <place>_<stage>.glb for the Creature Sanctuary, Fantasy Village, Magical Library, Training
Arena and Royal Castle at stages 1 to 3, and deco_<id>.glb for the bunting, lantern string, wishing fountain and
rainbow arch. Each place is built round its own origin, about 5 m across; the stage puts it on the island.
Same kit, colours and outline as the bosses. Blender's front is -Y (toward the camera).
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kit       # noqa: E402
from mathutils import Vector  # noqa: E402
from arenas import static, tree, bush, rock, flowers, pine, mushroom, export_static, crystal  # noqa: E402

WOOD, WOOD_D, STONE, STONE_D, ROOF_R, ROOF_B, ROOF_P, GOLD, CREAM = '#c08a52', '#8a5a34', '#cfc6b8', '#a39a8e', '#e5655a', '#4f86d0', '#8a5ad0', '#ffd23f', '#fff4e0'
V = Vector


def cottage(p, w=1.6, d=1.4, h=1.1, wall=CREAM, roof=ROOF_R, rot=0):
    o = [kit.paint(kit.box((w, d, h), loc=(0, 0, h / 2), bevel=0.05), wall),
         kit.paint(kit.box((0.36, 0.06, 0.6), loc=(0, -d / 2 - 0.02, 0.3), bevel=0.02), WOOD_D),
         kit.paint(kit.box((0.32, 0.06, 0.3), loc=(w * 0.28, -d / 2 - 0.02, h * 0.62), bevel=0.02), '#9fd8f5')]
    # a gabled roof: a triangular prism
    r = kit.extrude_shape([(-w / 2 - 0.15, 0), (w / 2 + 0.15, 0), (0, 0.75)], depth=d + 0.3, bevel=0.03, name='roof')
    kit.place(r, (0, 0, h))
    o.append(kit.paint(r, roof))
    o.append(kit.paint(kit.box((0.22, 0.22, 0.5), loc=(w * 0.25, d * 0.15, h + 0.55), bevel=0.02), STONE_D))
    c = kit.join(o, 'cottage')
    kit.place(c, p, (0, 0, rot))
    static(c, ol=0.025)


def tower(p, r=0.7, h=2.6, wall=STONE, roof=ROOF_B, flag=True):
    static(kit.cyl(r, h, loc=p, seg=20, name='tower'), wall)
    static(kit.cyl(r + 0.08, 0.18, loc=p + V((0, 0, h)), seg=20, name='rim'), STONE_D, ol=0.02)
    static(kit.cone(r + 0.18, 0, r * 1.6, loc=p + V((0, 0, h + 0.18)), seg=20, name='spire'), roof)
    static(kit.box((0.3, 0.06, 0.45), loc=p + V((0, -r + 0.01, h * 0.55)), bevel=0.03), '#3a3040', ol=0.0)
    if flag:
        top = p + V((0, 0, h + 0.18 + r * 1.6))
        static(kit.cyl(0.025, 0.6, loc=top, seg=6, name='pole'), WOOD_D, ol=0.0)
        static(kit.extrude_shape([(0, 0), (0.45, 0.12), (0, 0.24)], depth=0.02, bevel=0, loc=top + V((0, 0, 0.36))), ROOF_R, ol=0.01)


def tent(p, r=0.9, h=1.3, c='#ff9f43', stripe=CREAM):
    static(kit.cone(r, 0.04, h, loc=p, seg=8, name='tent', smooth_=False), c)
    static(kit.cone(r * 0.35, 0.02, h * 0.5, loc=p + V((0, -r * 0.62, 0)), seg=3, rot=(0, 0, 30), name='door', smooth_=False), '#5a3a2a', ol=0.0)
    static(kit.cyl(0.03, 0.4, loc=p + V((0, 0, h)), seg=6, name='pole'), WOOD_D, ol=0.0)


def fence_ring(p, r=2.2, n=14, gap=(240, 300)):
    for i in range(n):
        a = 360 * i / n
        if gap[0] <= a <= gap[1]: continue
        q = p + V((math.cos(math.radians(a)) * r, math.sin(math.radians(a)) * r, 0))
        static(kit.box((0.12, 0.12, 0.55), loc=q + V((0, 0, 0.27)), bevel=0.02), WOOD, ol=0.015)
    pts = [p + V((math.cos(math.radians(a)) * r, math.sin(math.radians(a)) * r, 0.38)) for a in range(gap[1], gap[0] + 361, 12)]
    static(kit.tube(pts, 0.035, seg=6, name='rail'), WOOD, ol=0.01)


def pond(p, r=0.9, sx=1.4):
    static(kit.cyl(r, 0.04, loc=p + V((0, 0, 0.0)), scale=(sx, 1, 1), seg=32, name='pond'), '#7fc8f0', ol=0.03)
    for a in range(0, 360, 40):
        q = p + V((math.cos(math.radians(a)) * r * sx * 1.02, math.sin(math.radians(a)) * r * 1.02, 0))
        rock(q, 0.25, '#b8b0a4', seed=a)


def dummy(p):
    static(kit.cyl(0.05, 1.0, loc=p, seg=8, name='post'), WOOD_D, ol=0.01)
    static(kit.sphere(0.28, loc=p + V((0, 0, 0.75)), scale=(1, 1, 1.3), seg=14, rings=8, name='straw'), '#e8c86a', ol=0.02)
    static(kit.cyl(0.04, 0.8, loc=p + V((-0.4, 0, 0.8)), rot=(0, 90, 0), seg=6, name='arms'), WOOD_D, ol=0.01)


def banner_pole(p, c=ROOF_R, h=1.8):
    static(kit.cyl(0.04, h, loc=p, seg=6, name='pole'), WOOD_D, ol=0.01)
    static(kit.box((0.5, 0.03, 0.7), loc=p + V((0.27, 0, h - 0.45)), bevel=0.01), c, ol=0.01)


def books(p, rng, n=4):
    for i in range(n):
        static(kit.box((0.35, 0.26, 0.08), loc=p + V((rng.uniform(-0.05, 0.05), 0, 0.04 + i * 0.085)), rot=(0, 0, rng.uniform(-20, 20)), bevel=0.01),
               ['#e5655a', '#4f86d0', '#7fcf6a', '#ffd23f', '#b58af0'][i % 5], ol=0.01)


def stall(p, c=ROOF_R):
    static(kit.box((1.2, 0.7, 0.6), loc=p + V((0, 0, 0.3)), bevel=0.03), WOOD, ol=0.02)
    for x in (-0.55, 0.55):
        static(kit.cyl(0.04, 1.2, loc=p + V((x, -0.3, 0)), seg=6, name='post'), WOOD_D, ol=0.0)
    static(kit.box((1.4, 0.9, 0.08), loc=p + V((0, -0.1, 1.25)), rot=(12, 0, 0), bevel=0.02), c, ol=0.02)
    for i, col in enumerate(('#ff6b6b', '#ffd23f', '#7fcf6a')):
        static(kit.sphere(0.1, loc=p + V((-0.35 + i * 0.35, -0.2, 0.68)), seg=10, rings=6), col, ol=0.0)


def well(p):
    static(kit.cyl(0.45, 0.5, loc=p, seg=16, name='well'), STONE, ol=0.025)
    static(kit.cyl(0.36, 0.05, loc=p + V((0, 0, 0.5)), seg=16, name='water'), '#7fc8f0', ol=0.0)
    for x in (-0.38, 0.38):
        static(kit.cyl(0.04, 0.8, loc=p + V((x, 0, 0.5)), seg=6, name='post'), WOOD_D, ol=0.0)
    r = kit.extrude_shape([(-0.6, 0), (0.6, 0), (0, 0.35)], depth=0.6, bevel=0.02, name='wroof')
    static(kit.place(r, p + V((0, 0, 1.25))), ROOF_R, ol=0.02)


def lamp(p):
    static(kit.cyl(0.04, 1.4, loc=p, seg=6, name='lamppost'), '#3a3040', ol=0.0)
    static(kit.sphere(0.13, loc=p + V((0, 0, 1.48)), seg=12, rings=6, name='lamp'), '#ffe08a', ol=0.015)


def arch(p, w=1.6, h=1.8, c=STONE):
    pts = [p + V((math.cos(math.radians(a)) * w / 2, 0, h - w / 2 + math.sin(math.radians(a)) * w / 2)) for a in range(0, 181, 15)]
    static(kit.tube([p + V((w / 2, 0, 0))] + pts + [p + V((-w / 2, 0, 0))], 0.13, seg=10, name='arch'), c, ol=0.02)


# --- the places -------------------------------------------------------------------------------------
def sanctuary(stage, rng):
    o = V((0, 0, 0))
    fence_ring(o, 2.3)
    pond(V((0.6, 0.6, 0)), 0.7)
    tent(V((-1.1, 0.4, 0)), 0.7, 1.0, '#7fcf6a')
    static(kit.sphere(0.4, loc=(-0.2, -0.9, 0.12), scale=(1, 1, 0.4), seg=14, rings=8, name='nest'), WOOD, ol=0.02)
    if stage >= 2:
        arch(V((0, -2.3, 0)), 1.2, 1.6, '#7fcf6a')
        for p in (V((1.4, -1.2, 0)), V((-1.5, -1.0, 0))): flowers(p, rng)
        tree(V((1.5, 1.4, 0)), 0.9)
        static(kit.box((0.8, 0.7, 0.6), loc=(1.5, 1.4, 1.6), bevel=0.05), WOOD, ol=0.02)
    if stage >= 3:
        tree(V((-1.2, 1.5, 0)), 1.5, crown='#9fe08a')
        crystal(V((-1.2, 1.0, 0)), 0.5, seed=3)
        for a in range(0, 360, 60):
            static(kit.sphere(0.06, loc=(-1.2 + math.cos(math.radians(a)) * 0.9, 1.5 + math.sin(math.radians(a)) * 0.9, 2.6), seg=8, rings=4), '#fff6a8', ol=0.0)
        bush(V((1.9, -0.2, 0)), 0.7, '#7fcf6a')


def village(stage, rng):
    cottage(V((-0.9, 0.5, 0)), roof=ROOF_R, rot=8)
    cottage(V((1.0, 0.7, 0)), 1.4, 1.2, 1.0, roof=ROOF_B, rot=-10)
    if stage >= 2:
        cottage(V((0.1, 2.0, 0)), 1.5, 1.3, 1.2, roof='#7fcf6a')
        stall(V((-1.3, -1.2, 0)))
        well(V((0.9, -1.1, 0)))
    if stage >= 3:
        cottage(V((2.2, -0.6, 0)), 1.3, 1.2, 1.0, roof=ROOF_P, rot=-30)
        stall(V((-0.1, -1.9, 0)), ROOF_B)
        for p in (V((-2.0, 0.0, 0)), V((1.8, 1.9, 0)), V((-0.6, -0.5, 0))): lamp(p)


def library(stage, rng):
    if stage == 1:
        tent(V((0, 0.4, 0)), 1.2, 1.6, ROOF_P)
        static(kit.cyl(0.9, 0.03, loc=(0, -0.9, 0.0), scale=(1.4, 1, 1), seg=24, name='rug'), '#e5655a', ol=0.01)
        books(V((-1.0, -0.8, 0)), rng); books(V((1.0, -0.6, 0)), rng, 3)
    else:
        tower(V((0, 0.5, 0)), 0.95, 3.2 if stage == 2 else 3.8, CREAM, ROOF_P, flag=stage == 2)
        cottage(V((1.3, 0.2, 0)), 1.1, 1.1, 0.9, roof=ROOF_P, rot=-90)
        books(V((-1.3, -0.9, 0)), rng)
    if stage == 3:
        static(kit.sphere(0.8, loc=(0, 0.5, 4.3), scale=(1, 1, 0.75), seg=24, rings=12, name='dome'), '#4f86d0', ol=0.03)
        static(kit.cyl(0.12, 1.1, loc=(0.3, 0.3, 4.6), rot=(0, 55, 20), seg=10, name='telescope'), GOLD, ol=0.015)
        for i in range(5):
            a = math.radians(i * 72)
            static(kit.box((0.3, 0.22, 0.07), loc=(math.cos(a) * 1.6, 0.5 + math.sin(a) * 1.6, 2.0 + 0.3 * math.sin(a * 2)), rot=(20, 0, i * 40), bevel=0.01),
                   ['#e5655a', '#4f86d0', '#7fcf6a', '#ffd23f', '#b58af0'][i], ol=0.01)


def arena(stage, rng):
    static(kit.cyl(2.0, 0.05, loc=(0, 0, 0.0), seg=32, name='sand'), '#f2d9a0', ol=0.02)
    dummy(V((-0.8, 0.4, 0))); dummy(V((0.8, 0.6, 0)))
    if stage == 1:
        for a in range(0, 360, 45):
            static(kit.cyl(0.05, 0.6, loc=(math.cos(math.radians(a)) * 2.0, math.sin(math.radians(a)) * 2.0, 0), seg=6), WOOD_D, ol=0.0)
    if stage >= 2:
        for a in range(0, 360, 20):
            if 240 < a < 300: continue
            q = V((math.cos(math.radians(a)) * 2.25, math.sin(math.radians(a)) * 2.25, 0))
            static(kit.box((0.6, 0.35, 0.6 if stage == 2 else 1.3), loc=q + V((0, 0, 0.3 if stage == 2 else 0.65)), rot=(0, 0, a + 90), bevel=0.04), STONE, ol=0.02)
        banner_pole(V((-2.4, -1.5, 0)), ROOF_R); banner_pole(V((2.4, -1.5, 0)), ROOF_B)
        static(kit.cyl(0.4, 0.06, loc=(0, 1.3, 0.9), rot=(90, 0, 0), seg=20, name='target'), '#e5655a', ol=0.015)
    if stage >= 3:
        for a in range(10, 360, 40):
            if 230 < a < 310: continue
            q = V((math.cos(math.radians(a)) * 2.25, math.sin(math.radians(a)) * 2.25, 1.3))
            arch(q, 0.5, 0.9, STONE_D)
        for a in (60, 120): banner_pole(V((math.cos(math.radians(a)) * 2.3, math.sin(math.radians(a)) * 2.3, 1.3)), GOLD, 1.2)


def castle(stage, rng):
    if stage == 1:
        tower(V((0, 0.3, 0)), 0.8, 3.0)
        static(kit.box((1.6, 0.4, 0.6), loc=(0, -0.4, 0.3), bevel=0.04), STONE, ol=0.02)
        return
    static(kit.box((2.0, 1.8, 2.4), loc=(0, 0.4, 1.2), bevel=0.06), STONE, ol=0.03)
    for x in (-0.8, -0.27, 0.27, 0.8):
        static(kit.box((0.32, 0.32, 0.3), loc=(x, -0.5, 2.55), bevel=0.03), STONE, ol=0.015)
    static(kit.box((0.6, 0.08, 0.95), loc=(0, -0.52, 0.48), bevel=0.05), WOOD_D, ol=0.0)
    corners = [V((-1.2, -0.6, 0)), V((1.2, -0.6, 0))] if stage == 2 else [V((-1.4, -0.7, 0)), V((1.4, -0.7, 0)), V((-1.4, 1.5, 0)), V((1.4, 1.5, 0))]
    for c in corners: tower(c, 0.5, 3.0 if stage == 2 else 3.4, STONE, ROOF_B if stage == 2 else ROOF_R)
    if stage == 3:
        tower(V((0, 0.5, 2.4)), 0.55, 1.5, STONE, GOLD)
        for x in (-2.0, 2.0):
            static(kit.box((0.5, 2.4, 1.0), loc=(x, 0.4, 0.5), bevel=0.04), STONE_D, ol=0.02)
        for x in (-0.7, 0.7): banner_pole(V((x, -0.9, 0)), ROOF_R if x < 0 else ROOF_B, 1.6)


def plot(rng):
    static(kit.cyl(1.6, 0.03, loc=(0, 0, 0.0), seg=24, name='dirt'), '#c9a26a', ol=0.015)
    for x, y in ((-1.2, -1.2), (1.2, -1.2), (1.2, 1.2), (-1.2, 1.2)):
        static(kit.box((0.1, 0.1, 0.5), loc=(x, y, 0.25), bevel=0.02), WOOD, ol=0.01)
    pts = [V((-1.2, -1.2, 0.4)), V((1.2, -1.2, 0.4)), V((1.2, 1.2, 0.4)), V((-1.2, 1.2, 0.4)), V((-1.2, -1.2, 0.4))]
    static(kit.tube(pts, 0.02, seg=5, name='rope'), CREAM, ol=0.0)
    static(kit.cyl(0.05, 0.9, loc=(0.6, -1.5, 0), seg=6, name='signpost'), WOOD_D, ol=0.0)
    static(kit.box((0.7, 0.06, 0.4), loc=(0.6, -1.52, 0.8), bevel=0.02), WOOD, ol=0.015)


def ground(rng):
    static(kit.cyl(15.5, 1.6, loc=(0, 0, -1.75), seg=64, name='cliff'), '#b09068', ol=0.06)    # its top below the grass (no flicker)
    static(kit.cyl(15.3, 0.3, loc=(0, 0, -0.3), seg=64, name='grass'), '#8fcf5e', ol=0.03)
    pts = [V((math.cos(t) * 8.2 + 0.6 * math.sin(3 * t), math.sin(t) * 6.4 + 0.5 * math.cos(2 * t), 0.012)) for t in [i * math.pi * 2 / 64 for i in range(65)]]
    static(kit.tube(pts, 0.6, seg=6, name='path'), '#f0dca8', ol=0.0)
    for t in (0.0, math.pi / 2, math.pi, 3 * math.pi / 2):        # spokes to the middle
        static(kit.tube([V((0, 0, 0.01)), V((math.cos(t) * 8.0, math.sin(t) * 6.3, 0.01))], 0.45, seg=6, name='spoke'), '#f0dca8', ol=0.0)
    for i in range(22):
        a = rng.uniform(0, math.tau); r = rng.uniform(12.0, 14.5)
        p = V((math.cos(a) * r, math.sin(a) * r, 0))
        (tree if i % 3 else pine)(p, rng.uniform(0.8, 1.3))
    for i in range(14):
        a = rng.uniform(0, math.tau); r = rng.uniform(10.5, 13.5)
        bush(V((math.cos(a) * r, math.sin(a) * r, 0)), rng.uniform(0.6, 1.0))
    for i in range(8):
        a = rng.uniform(0, math.tau); r = rng.uniform(3.5, 12)
        flowers(V((math.cos(a) * r, math.sin(a) * r, 0)), rng)
    mushroom(V((-11.5, -3.5, 0)), 0.6)


def deco(which, rng):
    if which == 'bunting':
        for x in (-1.6, 1.6): static(kit.cyl(0.05, 2.2, loc=(x, 0, 0), seg=6), WOOD_D, ol=0.0)
        pts = [V((x, 0, 2.1 - 0.4 * (1 - (x / 1.6) ** 2))) for x in [i * 0.2 - 1.6 for i in range(17)]]
        static(kit.tube(pts, 0.015, seg=4, name='string'), CREAM, ol=0.0)
        for i, p in enumerate(pts[1:-1:2]):
            static(kit.extrude_shape([(-0.12, 0), (0.12, 0), (0, -0.28)], depth=0.02, bevel=0, loc=p), ['#e5655a', '#ffd23f', '#4f86d0', '#7fcf6a'][i % 4], ol=0.008)
    elif which == 'lanterns':
        for x in (-2.0, 2.0): static(kit.cyl(0.05, 2.2, loc=(x, 0, 0), seg=6), WOOD_D, ol=0.0)
        pts = [V((x, 0, 2.1 - 0.35 * (1 - (x / 2.0) ** 2))) for x in [i * 0.25 - 2.0 for i in range(17)]]
        static(kit.tube(pts, 0.015, seg=4, name='string'), '#3a3040', ol=0.0)
        for i, p in enumerate(pts[2:-1:3]):
            static(kit.sphere(0.13, loc=p + V((0, 0, -0.2)), scale=(1, 1, 1.25), seg=12, rings=6), ['#ff9f43', '#ffd23f', '#ff6b9a'][i % 3], ol=0.012)
    elif which == 'fountain':
        static(kit.cyl(1.2, 0.45, loc=(0, 0, 0), seg=28, name='basin'), STONE, ol=0.03)
        static(kit.cyl(1.0, 0.06, loc=(0, 0, 0.42), seg=28, name='water'), '#7fc8f0', ol=0.0)
        static(kit.cyl(0.22, 1.1, loc=(0, 0, 0.4), seg=12, name='column'), STONE, ol=0.02)
        static(kit.cyl(0.55, 0.15, loc=(0, 0, 1.45), seg=20, name='bowl'), STONE, ol=0.02)
        static(kit.sphere(0.25, loc=(0, 0, 1.75), seg=14, rings=8, name='jet'), '#bfe8ff', ol=0.015)
    elif which == 'rainbow':
        for i, c in enumerate(('#ff6b6b', '#ff9f43', '#ffd23f', '#7fcf6a', '#4f86d0', '#b58af0')):
            r = 2.4 - i * 0.18
            pts = [V((math.cos(math.radians(a)) * r, 0, math.sin(math.radians(a)) * r)) for a in range(0, 181, 10)]
            static(kit.tube(pts, 0.1, seg=6, name='band'), c, ol=0.0)
        for x in (-2.5, 2.5): static(kit.sphere(0.45, loc=(x, 0, 0.2), seg=14, rings=8), '#ffffff', ol=0.02)


PLACES = {'sanctuary': sanctuary, 'village': village, 'library': library, 'arena': arena, 'castle': castle}

if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    out = os.path.join(HERE, '..', '..', 'godot', 'models', 'world')
    if '--out' in argv: out = argv[argv.index('--out') + 1]
    os.makedirs(out, exist_ok=True)
    jobs = [('ground', lambda r: ground(r)), ('plot', lambda r: plot(r))]
    jobs += [(f'{pid}_{st}', (lambda f, st: lambda r: f(st, r))(f, st)) for pid, f in PLACES.items() for st in (1, 2, 3)]
    jobs += [(f'deco_{d}', (lambda d: lambda r: deco(d, r))(d)) for d in ('bunting', 'lanterns', 'fountain', 'rainbow')]
    for name, fn in jobs:
        kit.reset()
        fn(random.Random(sum(map(ord, name))))
        export_static(os.path.join(out, f'{name}.glb'))
        print(f'world {name}: {len(kit.PARTS)} parts')
