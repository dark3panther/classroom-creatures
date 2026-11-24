"""The 3D arena sets for the Godot stage, one per region (headless Blender):

    blender -b -P scripts/bosses-3d/arenas.py -- [verdant crystal ...] [--out godot/models/arena]

Each set is a round stage (the battle floor in the middle, a rim and a skirt of ground) dressed with that region's
things at the back and the sides, where they frame the fight without hiding anyone: round trees in Verdant Valley,
crystal clusters in the Crystal Caverns, coral in the Coral Lagoon, snowy pines in Frostpeak, lava rocks and smoking
vents in the Ember Kingdom, giant mushrooms in Mushroom Hollow, clouds and floating rocks on the Sky Islands, broken
pillars in the Ancient Kingdom and dunes and cacti in the Sunstone Desert. Same kit and outline as the bosses.
Blender's front is -Y: the camera looks from there, so "back" is +Y.
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bpy      # noqa: E402
import kit      # noqa: E402
from mathutils import Vector  # noqa: E402

S = 1.0          # metres; the bosses are about 2.2 m tall, the creatures about 0.8 m


def static(o, hex_=None, ol=0.03):
    """a part of the set: coloured, outlined, never rigged"""
    if hex_: kit.paint(o, hex_)
    kit.part(o, 'none', ol=ol)
    return o


def ground(top, rim, skirt, floor):
    static(kit.cyl(10.5, 0.5, loc=(0, 0, -0.5), seg=64, name='skirt'), skirt, ol=0.05)
    static(kit.cyl(9.6, 0.12, loc=(0, 0, -0.06), seg=64, name='ground'), top, ol=0.0)
    static(kit.cyl(5.9, 0.08, loc=(0, -0.6, 0.0), scale=(1.15, 0.85, 1), seg=64, name='floor'), floor, ol=0.03)
    static(kit.cyl(6.1, 0.05, loc=(0, -0.6, -0.01), scale=(1.15, 0.85, 1), seg=64, name='rim'), rim, ol=0.0)


def ring(n, r0, r1, back_only=True, rng=None, ymin=2.5):
    """spots round the stage, at the back half and the far sides"""
    rng = rng or random.Random(1)
    out = []
    for i in range(n):
        a = math.radians(rng.uniform(15, 165) if back_only else rng.uniform(0, 360))
        r = rng.uniform(r0, r1)
        p = Vector((math.cos(a) * r * 1.1, math.sin(a) * r, 0))
        if p.y < ymin and abs(p.x) < 7.2: p.y = ymin + rng.uniform(0, 2)
        out.append(p)
    return out


# --- props -----------------------------------------------------------------------------------------
def tree(p, s=1.0, crown='#5fb04a', trunk='#8a5a34'):
    static(kit.cyl(0.18 * s, 1.3 * s, loc=p, name='trunk'), trunk)
    for dx, dz, r in ((0, 1.7, 0.9), (-0.45, 1.4, 0.6), (0.5, 1.45, 0.62)):
        static(kit.sphere(r * s, loc=p + Vector((dx * s, 0, dz * s)), seg=18, rings=10, name='crown'), crown)


def bush(p, s=1.0, c='#6cbf52'):
    for dx, r in ((-0.3, 0.42), (0.25, 0.5), (0.0, 0.36)):
        static(kit.sphere(r * s, loc=p + Vector((dx * s, 0, r * s * 0.6)), scale=(1, 1, 0.85), seg=14, rings=8, name='bush'), c)


def rock(p, s=1.0, c='#9a95a8', seed=0):
    rng = random.Random(seed)
    static(kit.ico(0.6 * s, loc=p + Vector((0, 0, 0.3 * s)), scale=(1.1, 0.9, 0.7), rot=(rng.uniform(0, 30), 0, rng.uniform(0, 90)), sub=2, name='rock'), c)


def crystal(p, s=1.0, cols=('#5fd4ff', '#b98cff', '#d9b8ff'), seed=0):
    rng = random.Random(seed)
    for i in range(5):
        h = rng.uniform(0.8, 1.9) * s; c = cols[i % len(cols)]
        o = kit.join([kit.cyl(0.18 * s, h, seg=6, smooth_=False, name='p'), kit.cone(0.18 * s, 0, 0.35 * s, loc=(0, 0, h), seg=6, smooth_=False, name='t')], 'crystal')
        kit.place(o, p + Vector((rng.uniform(-0.4, 0.4) * s, rng.uniform(-0.3, 0.3) * s, 0)), (rng.uniform(-18, 18), rng.uniform(-22, 22), rng.uniform(0, 60)))
        static(o, c, ol=0.025)


def coral(p, s=1.0, c='#ff8fb1', seed=0):
    rng = random.Random(seed)
    for i in range(4):
        a = math.radians(rng.uniform(0, 360)); top = p + Vector((math.cos(a) * 0.5 * s, math.sin(a) * 0.3 * s, rng.uniform(0.9, 1.6) * s))
        mid = p.lerp(top, 0.5) + Vector((0, 0, 0.1))
        static(kit.tube([p + Vector((0, 0, 0)), mid, top], 0.12 * s, name='coral', taper=lambda t: 1.0 - 0.3 * t), c, ol=0.02)
        static(kit.sphere(0.17 * s, loc=top, seg=14, rings=8, name='tip'), c, ol=0.02)


def shell(p, s=1.0, c='#ffe0c8'):
    static(kit.sphere(0.35 * s, loc=p + Vector((0, 0, 0.12 * s)), scale=(1, 0.8, 0.45), seg=18, rings=9, name='shell'), c, ol=0.02)


def pine(p, s=1.0, c='#3f8a5a', snow='#f4fbff'):
    static(kit.cyl(0.14 * s, 0.6 * s, loc=p, name='trunk'), '#7a4a2a')
    for i, (r, z) in enumerate(((0.95, 0.5), (0.75, 1.15), (0.5, 1.75))):
        static(kit.cone(r * s, 0, 1.0 * s, loc=p + Vector((0, 0, z * s)), seg=16, name='tier'), c, ol=0.025)
        static(kit.cone(r * s * 0.55, 0, 0.5 * s, loc=p + Vector((0, 0, (z + 0.5) * s)), seg=16, name='snow'), snow, ol=0.0)


def lava_rock(p, s=1.0, seed=0):
    rock(p, s, '#4a3a40', seed)
    rng = random.Random(seed + 9)
    pts = [p + Vector((rng.uniform(-0.4, 0.4) * s, -0.45 * s, rng.uniform(0.2, 0.7) * s)) for _ in range(4)]
    static(kit.tube(pts, 0.05 * s, name='crack'), '#ff7a1a', ol=0.0)


def vent(p, s=1.0):
    static(kit.cone(0.7 * s, 0.35 * s, 0.8 * s, loc=p, seg=20, name='vent'), '#3a2c32')
    static(kit.cyl(0.32 * s, 0.05 * s, loc=p + Vector((0, 0, 0.8 * s)), seg=20, name='lava'), '#ffb43d', ol=0.0)
    for i, (dz, r) in enumerate(((1.15, 0.28), (1.55, 0.24), (1.95, 0.2))):
        static(kit.sphere(r * s, loc=p + Vector((0.08 * i * s, 0, dz * s)), name='smoke'), '#a39ca8', ol=0.02)


def mushroom(p, s=1.0, cap='#b58af0', spots='#f6f0ff'):
    static(kit.cyl(0.22 * s, 1.0 * s, loc=p, name='stem'), '#f4e3cc')
    cc = p + Vector((0, 0, 1.15 * s))
    static(kit.sphere(0.8 * s, loc=cc, scale=(1, 1, 0.55), seg=28, rings=14, name='cap'), cap)
    for a in range(0, 360, 72):
        q = cc + Vector((math.cos(math.radians(a)) * 0.45 * s, math.sin(math.radians(a)) * 0.45 * s, 0.32 * s))
        static(kit.sphere(0.11 * s, loc=q, scale=(1, 1, 0.4), seg=12, rings=6, name='spot'), spots, ol=0.0)


def cloud(p, s=1.0, c='#ffffff'):
    for dx, dz, r in ((0, 0, 0.7), (-0.7, -0.15, 0.5), (0.75, -0.1, 0.55), (0.3, 0.35, 0.45)):
        static(kit.sphere(r * s, loc=p + Vector((dx * s, 0, dz * s)), seg=20, rings=10, name='cloud'), c, ol=0.02)


def floating(p, s=1.0):
    static(kit.cone(0.9 * s, 0.05 * s, 1.0 * s, loc=p, rot=(180, 0, 0), seg=10, name='rockbase', smooth_=False), '#a08870')
    static(kit.cyl(0.95 * s, 0.25 * s, loc=p, seg=20, name='grass'), '#7fcf6a', ol=0.02)
    tree(p + Vector((0, 0, 0.25 * s)), 0.45 * s)


def pillar(p, s=1.0, h=2.4, broken=False, c='#e8dcc0'):
    hh = h * (0.55 if broken else 1.0)
    static(kit.box((0.75 * s, 0.75 * s, 0.25 * s), loc=p + Vector((0, 0, 0.12 * s)), bevel=0.04), c)
    static(kit.cyl(0.28 * s, hh * s, loc=p + Vector((0, 0, 0.25 * s)), seg=16, name='column'), c)
    if not broken:
        static(kit.box((0.8 * s, 0.8 * s, 0.25 * s), loc=p + Vector((0, 0, (hh + 0.37) * s)), bevel=0.04), c)


def cactus(p, s=1.0):
    c = '#4fa05a'
    static(kit.capsule(p + Vector((0, 0, 0.2 * s)), p + Vector((0, 0, 1.7 * s)), 0.26 * s), c)
    static(kit.tube([p + Vector((0.2 * s, 0, 0.9 * s)), p + Vector((0.55 * s, 0, 0.95 * s)), p + Vector((0.6 * s, 0, 1.4 * s))], 0.15 * s, name='arm'), c)
    static(kit.tube([p + Vector((-0.2 * s, 0, 0.7 * s)), p + Vector((-0.5 * s, 0, 0.75 * s)), p + Vector((-0.55 * s, 0, 1.1 * s))], 0.13 * s, name='arm'), c)


def dune(p, s=1.0, c='#f2cf86'):
    static(kit.sphere(2.2 * s, loc=p, scale=(1.5, 1, 0.35), seg=32, rings=16, name='dune'), c, ol=0.03)


def pyramid(p, s=1.0):
    static(kit.cone(2.2 * s, 0, 2.6 * s, loc=p, seg=4, rot=(0, 0, 45), smooth_=False, name='pyramid'), '#e8c27a', ol=0.04)


def flowers(p, rng, cols=('#ff8fb1', '#ffd23f', '#ffffff')):
    for i in range(6):
        q = p + Vector((rng.uniform(-0.8, 0.8), rng.uniform(-0.5, 0.5), 0))
        static(kit.sphere(0.07, loc=q + Vector((0, 0, 0.12)), seg=10, rings=6, name='flower'), cols[i % len(cols)], ol=0.0)


# --- the nine sets ---------------------------------------------------------------------------------
def verdant(rng):
    ground('#8fcf5e', '#c8e8a0', '#6a9a4a', '#a8dc78')
    for i, p in enumerate(ring(9, 7.2, 9.0, rng=rng)): tree(p, rng.uniform(0.9, 1.3))
    for p in ring(8, 6.0, 8.0, rng=rng): bush(p, rng.uniform(0.7, 1.1))
    for p in ring(5, 6.2, 8.5, rng=rng): flowers(p, rng)


def crystal_caverns(rng):
    ground('#8e86b0', '#c8c0e8', '#5a4f80', '#a69cc8')
    for i, p in enumerate(ring(8, 6.8, 9.0, rng=rng)): crystal(p, rng.uniform(0.9, 1.5), seed=i)
    for i, p in enumerate(ring(6, 6.0, 8.5, rng=rng)): rock(p, rng.uniform(0.8, 1.4), '#7d7698', seed=i)


def lagoon(rng):
    ground('#f2dca8', '#fff0c8', '#5fc8e8', '#f8e6b8')
    static(kit.cyl(10.9, 0.3, loc=(0, 0, -0.62), seg=64, name='sea'), '#5fc8e8', ol=0.0)
    for i, p in enumerate(ring(9, 6.8, 9.0, rng=rng)): coral(p, rng.uniform(0.9, 1.3), ['#ff8fb1', '#ff9f43', '#b98cff', '#7fe08a'][i % 4], seed=i)
    for p in ring(6, 6.0, 8.0, rng=rng): shell(p, rng.uniform(0.7, 1.2), ['#ffe0c8', '#ffc1d6'][rng.randrange(2)])


def frostpeak(rng):
    ground('#eef6ff', '#ffffff', '#a8c8e8', '#f6faff')
    for p in ring(10, 7.0, 9.2, rng=rng): pine(p, rng.uniform(0.9, 1.4))
    for i, p in enumerate(ring(5, 6.2, 8.0, rng=rng)): rock(p, rng.uniform(0.7, 1.1), '#c6e2f4', seed=i)


def ember(rng):
    ground('#6a5048', '#9a7060', '#3a2c32', '#8a6a5a')
    for i, p in enumerate(ring(7, 6.6, 9.0, rng=rng)): lava_rock(p, rng.uniform(0.9, 1.5), seed=i)
    for p in ring(3, 7.5, 9.0, rng=rng): vent(p, rng.uniform(0.9, 1.3))
    static(kit.cyl(1.4, 0.04, loc=(-6.5, 6.0, 0.0), scale=(1.4, 0.8, 1), seg=32, name='lavapool'), '#ffb43d', ol=0.02)


def hollow(rng):
    ground('#9a86b8', '#c8b8e0', '#5e4a80', '#b0a0cc')
    for i, p in enumerate(ring(8, 6.8, 9.0, rng=rng)): mushroom(p, rng.uniform(0.9, 1.7), ['#b58af0', '#ff8fb1', '#8a5ad0', '#7fd6ff'][i % 4])
    for p in ring(10, 6.0, 8.0, rng=rng):
        static(kit.sphere(0.07, loc=p + Vector((0, 0, rng.uniform(0.6, 2.2))), seg=10, rings=6, name='spore'), '#ff9fd1', ol=0.0)


def sky(rng):
    ground('#bfe6a0', '#e8f6d8', '#d8eaff', '#d2efb8')
    for p in ring(8, 7.5, 10.0, back_only=False, rng=rng):
        if p.y > -2: cloud(p + Vector((0, 0, rng.uniform(-0.8, 0.6))), rng.uniform(0.9, 1.6))
    for p in ring(3, 8.5, 10.0, rng=rng): floating(p + Vector((0, 0, rng.uniform(2.0, 3.5))), rng.uniform(0.8, 1.2))


def ancient(rng):
    ground('#d8c8a0', '#efe2c0', '#a08860', '#e4d6b0')
    for i, p in enumerate(ring(9, 6.8, 9.0, rng=rng)): pillar(p, rng.uniform(0.9, 1.2), broken=i % 3 == 1)
    for i, p in enumerate(ring(4, 6.0, 8.0, rng=rng)): rock(p, rng.uniform(0.6, 0.9), '#c8b890', seed=i)


def dunes(rng):
    ground('#f2cf86', '#fbe4b0', '#d8a860', '#f8dca0')
    for p in ring(5, 8.0, 10.0, rng=rng): dune(p, rng.uniform(0.8, 1.2))
    for p in ring(6, 6.4, 8.5, rng=rng): cactus(p, rng.uniform(0.8, 1.2))
    pyramid(Vector((5.5, 8.5, 0)), 1.0)


SETS = {'verdant': verdant, 'crystal': crystal_caverns, 'lagoon': lagoon, 'frostpeak': frostpeak, 'ember': ember,
        'hollow': hollow, 'sky': sky, 'ancient': ancient, 'dunes': dunes}


def export_static(path):
    for o in bpy.context.scene.objects:
        for m in o.data.materials if o.type == 'MESH' else []:
            m.use_backface_culling = True      # the outline shell relies on it
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True, export_materials='EXPORT',
                              export_animations=False, export_skins=False)


if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    out = os.path.join(HERE, '..', '..', 'godot', 'models', 'arena')
    if '--out' in argv:
        i = argv.index('--out'); out = argv[i + 1]; argv = argv[:i] + argv[i + 2:]
    os.makedirs(out, exist_ok=True)
    for rid in (argv or list(SETS)):
        kit.reset()
        SETS[rid](random.Random(sum(map(ord, rid))))
        export_static(os.path.join(out, f'{rid}.glb'))
        print(f'arena set {rid}: {len(kit.PARTS)} parts')
