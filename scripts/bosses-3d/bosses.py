"""The twelve bosses, one builder each, after the painted art in src/creatures/bosses/BossArt.tsx.

Every builder makes its parts and bones (the shared face from common.face) and returns
`extra(clip, frame, mood)`: the keys for its own bones at that moment (wings, arms, gears ...).
Units: the bosses stand about 2 to 2.3 tall on the ground (z = 0), facing -Y.
"""
import math
import random
from mathutils import Vector

import kit
import common
from common import Surface, face, orient, wave, mood_bone

ROCK_PURPLE = '#5a3fb0'


def base_rig(body_head=(0, 0, 0.05)):
    kit.bone('Hips', (0, 0, 0), None)
    kit.bone('Body', body_head, 'Hips')


def feet(pairs, hex_, parent='Body', size=(0.2, 0.26, 0.12)):
    for nm, x, y in pairs:
        kit.bone(nm, (x, y, 0.06), parent)
        kit.part(kit.sphere(1, loc=(x, y, size[2] * 0.9), scale=size, name=nm), nm, hex_)


def fib(n):
    """n directions spread evenly over a sphere"""
    g = math.pi * (3 - math.sqrt(5)); out = []
    for i in range(n):
        z = 1 - 2 * (i + 0.5) / n; r = math.sqrt(1 - z * z); a = g * i
        out.append(Vector((math.cos(a) * r, math.sin(a) * r, z)))
    return out


def is_front(d, half_angle=48, max_up=0.75):
    """a direction pointing at the viewer (where the face is)"""
    return (-d.y) > math.cos(math.radians(half_angle)) and d.z < max_up


def surface_lines(c, r, n, rng, length=(50, 110), out=0.012, width=0.026, hex_='#2f6b2a', bone='Body', avoid=None, scale=(1, 1, 1)):
    """wandering strokes over a sphere's surface (vines, lava cracks)"""
    objs = []
    for _ in range(n):
        az, el = rng.uniform(0, 360), rng.uniform(-35, 70); daz, delv = rng.uniform(-1.4, 1.4), rng.uniform(-0.6, 0.6)
        pts = []
        for i in range(int(rng.uniform(*length) / 4)):
            az += daz * 4 + rng.uniform(-3, 3); el += delv * 4 + rng.uniform(-2, 2); el = max(-50, min(80, el))
            if avoid and avoid(az, el): break
            p, d = kit.on_sphere((0, 0, 0), r, az, el, out)
            pts.append(Vector(c) + Vector((p.x * scale[0], p.y * scale[1], p.z * scale[2])))
        if len(pts) > 3: objs.append(kit.tube(pts, width, seg=8, name='line', taper=lambda t: 0.55 + 0.45 * math.sin(math.pi * t)))
    if objs: kit.part(kit.join(objs, 'lines'), bone, hex_, ol=0.01)


def front_zone(half=40, lo=-42, hi=42):
    return lambda az, el: abs((az + 180) % 360 - 180) < half and lo < el < hi


def star(r=0.08, depth=0.03, points=5, inner=0.45):
    poly = []
    for k in range(points * 2):
        a = math.radians(90 + k * 180 / points); rr = r if k % 2 == 0 else r * inner
        poly.append((math.cos(a) * rr, math.sin(a) * rr))
    return kit.extrude_shape(poly, depth=depth, bevel=0.006, name='star')


def heart(r=0.09, depth=0.04):
    poly = []
    for k in range(40):
        t = 2 * math.pi * k / 40
        x = 16 * math.sin(t) ** 3; z = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        poly.append((x * r / 16, z * r / 16))
    return kit.extrude_shape(list(reversed(poly)), depth=depth, bevel=0.008, name='heart')


def bolt(h=0.6, w=0.3, depth=0.08):
    poly = [(-0.05, 0.5), (0.35, 0.5), (0.1, 0.12), (0.32, 0.12), (-0.2, -0.5), (-0.02, -0.06), (-0.25, -0.06)]
    return kit.extrude_shape([(x * w * 2, z * h) for x, z in poly], depth=depth, bevel=0.012, name='bolt')


def swing(f, period, amp, phase=0.0):
    return wave(f, period, amp, phase)


# --- 1 Grumblethorn: a grumpy thorn bush -------------------------------------------------------
def grumblethorn():
    rng = random.Random(7)
    base_rig()
    C, R = Vector((0, 0, 1.12)), 0.95
    kit.part(kit.sphere(R, loc=C, seg=56, rings=28, name='body'), 'Body', '#4f9a3c')
    surface_lines(C, R * 0.99, 18, rng, avoid=front_zone(30, -30, 34), width=0.03)
    surface_lines(C, R * 0.99, 8, rng, avoid=front_zone(30, -30, 34), width=0.022, hex_='#6fbf4a')
    th = []
    for d in fib(46):
        if is_front(d, 52, 0.62) or d.z < -0.55: continue
        p = C + d * R * 0.96
        th.append(kit.cone(0.085, 0, 0.27 + rng.uniform(-0.04, 0.04), loc=p, rot=kit.facing(d), name='thorn'))
    kit.part(kit.join(th, 'thorns'), 'Body', '#8b5a34', ol=0.014)
    p, n = kit.on_sphere(C, R, 0, 2)
    kit.part(orient(kit.sphere(1, scale=(0.52, 0.16, 0.49), seg=40, rings=20, name='patch'), p, n, -0.075), 'Body', '#9fcf72', ol=0.014)
    face(Surface(C, R + 0.075), ex=0.2, ez=0.1, er=0.135, eh=1.22, mz=-0.21, mw=0.24, brow_gap=0.06, cheek_dx=0.33)
    feet([('FootL', -0.36, -0.12), ('FootR', 0.36, -0.12)], '#7a4a2a', size=(0.2, 0.27, 0.13))
    mood_bone('Flowers', C, ['happy'])
    fl = []
    for az, el in ((-60, 45), (55, 52), (-108, 10), (100, 18), (-20, 72), (35, -32), (-75, -25), (150, 40), (-150, 35), (120, -20)):
        p, d = kit.on_sphere(C, R, az, el, 0.02)
        petals = [kit.sphere(0.075, loc=(math.cos(math.radians(k * 72)) * 0.08, 0, math.sin(math.radians(k * 72)) * 0.08), scale=(1, 0.45, 1), name='petal') for k in range(5)]
        mid = kit.sphere(0.05, loc=(0, -0.02, 0), scale=(1, 0.6, 1), name='mid')
        fl.append(orient(kit.join([kit.paint(x, '#ff8fb1') for x in petals] + [kit.paint(mid, '#ffd23f')], 'flower'), p, d, 0.0))
    kit.part(kit.join(fl, 'flowers'), 'Flowers', ol=0.012)
    common.ensure_toggles(C)
    return lambda clip, f, mood: {}


# --- 2 Mudsnout: a muddy little hippo that won't share the pond ----------------------------------
def mudsnout():
    base_rig()
    skin, muzzle_c, mud = '#c7aeb3', '#e3c3c6', '#8a5a2b'
    kit.part(kit.sphere(1, loc=(0, 0.35, 0.74), scale=(0.9, 1.1, 0.62), name='body'), 'Body', skin)
    HC, HR = Vector((0, -0.42, 1.18)), 0.56
    kit.bone('Head', HC - Vector((0, 0, 0.3)), 'Body')
    kit.part(kit.sphere(HR, loc=HC, scale=(1.05, 1, 0.9), name='head'), 'Head', skin)
    # the big hippo muzzle under the eyes, nostrils on top of it
    MC = HC + Vector((0, -0.4, -0.3))
    mz = kit.sphere(1, loc=MC, scale=(0.5, 0.36, 0.3), name='muzzle')
    nos = [kit.paint(kit.sphere(0.05, loc=MC + Vector((sx * 0.17, -0.2, 0.22)), scale=(1, 0.8, 0.6), name='nostril'), '#7a5560') for sx in (-1, 1)]
    kit.part(kit.join([kit.paint(mz, muzzle_c)] + nos, 'muzzle'), 'Head', ol=0.016)
    for sx in (-1, 1):       # small round ears
        p = HC + Vector((sx * 0.38, 0.08, 0.4))
        kit.part(kit.sphere(1, loc=p, scale=(0.11, 0.07, 0.11), name='ear'), 'Head', skin)
        kit.part(kit.sphere(1, loc=p + Vector((0, -0.05, 0)), scale=(0.06, 0.03, 0.06), name='earin'), 'Head', '#e9a9b5', outline=False)
    spots = []
    for az, el, s in ((70, 20, 0.22), (110, -5, 0.18), (-80, 25, 0.24), (-115, 0, 0.16), (160, 35, 0.2), (40, 52, 0.15)):
        p, d = kit.on_sphere((0, 0, 0), 1, az, el)
        q = Vector((0, 0.35, 0.74)) + Vector((p.x * 0.9, p.y * 1.1, p.z * 0.62))
        spots.append(orient(kit.sphere(1, scale=(s, 0.05, s * 0.8), name='spot'), q, Vector((d.x / 0.9, d.y / 1.1, d.z / 0.62)).normalized(), -0.01))
    kit.part(kit.join(spots, 'spots'), 'Body', mud, ol=0.01)
    tuft = [kit.sphere(0.11, loc=HC + Vector((x, 0.02, HR * 0.85 + z)), scale=(1, 0.9, 0.8), name='tuft') for x, z in ((-0.1, 0.02), (0.05, 0.06), (0.15, 0.0))]
    kit.part(kit.join(tuft, 'tuft'), 'Head', '#7a4a24', ol=0.012)
    face(Surface(MC, 0.37), esurf=Surface(HC, HR), ex=0.2, ez=0.12, er=0.1, eh=1.2, mz=-0.1, mw=0.3, brow_gap=0.05, cheek_dx=0.36, wide_mouth=1.1)
    for nm, x, y in (('FootL', -0.38, -0.3), ('FootR', 0.38, -0.3)):
        kit.bone(nm, (x, y, 0.05), 'Body')
        kit.part(kit.join([kit.cyl(0.17, 0.26, loc=(x, y, 0.04), name=nm), kit.sphere(1, loc=(x, y, 0.05), scale=(0.175, 0.175, 0.06), name='hoof')], nm), nm, skin)
    for x in (-0.5, 0.5):
        kit.part(kit.join([kit.cyl(0.17, 0.26, loc=(x, 0.85, 0.04), name='leg'), kit.sphere(1, loc=(x, 0.85, 0.05), scale=(0.175, 0.175, 0.06), name='hoof')], 'leg'), 'Body', skin)
    kit.part(kit.cone(0.06, 0.02, 0.18, loc=(0, 1.38, 0.8), rot=(-100, 0, 0), name='tail'), 'Body', skin, ol=0.01)
    mood_bone('PuddleMud', (0, 0, 0), ['grumpy', 'attack', 'hurt'], parent='Hips')
    mood_bone('PuddleBlue', (0, 0, 0), ['happy'], parent='Hips')
    kit.part(kit.cyl(1.0, 0.03, loc=(0, 0.2, -0.01), scale=(1.25, 1.0, 1), seg=48, name='mud'), 'PuddleMud', '#8a5a2b', ol=0.012)
    kit.part(kit.cyl(1.0, 0.03, loc=(0, 0.2, -0.01), scale=(1.25, 1.0, 1), seg=48, name='pond'), 'PuddleBlue', '#9fd8f5', ol=0.012)
    mood_bone('Bubbles', HC, ['happy'])
    bub = [kit.sphere(r, loc=(x, -0.4, z), name='bubble') for x, z, r in ((0.85, 1.95, 0.07), (1.0, 1.7, 0.05), (-0.95, 1.85, 0.06))]
    kit.part(kit.join(bub, 'bubbles'), 'Bubbles', '#e8f7ff', ol=0.01)
    common.ensure_toggles(HC)
    return lambda clip, f, mood: {'Head': {'rot': (0, 0, swing(f, 48 if clip == 'idle' else 24, 3))}}


# --- 3 Glimmerjaw: a crystal crab ----------------------------------------------------------------
def glimmerjaw():
    rng = random.Random(3)
    base_rig()
    shell, claw_c, legs_c = '#7d55d8', '#8f66e6', ROCK_PURPLE
    C = Vector((0, 0, 0.78))
    kit.part(kit.sphere(1, loc=C, scale=(1.12, 0.82, 0.55), name='shell'), 'Body', shell)
    cr = []
    for x, h, tilt, col in ((-0.42, 0.42, -22, '#5fd4ff'), (-0.18, 0.62, -8, '#b98cff'), (0.06, 0.78, 3, '#d9b8ff'), (0.3, 0.55, 14, '#5fd4ff'), (0.52, 0.38, 26, '#b98cff'), (-0.6, 0.3, -34, '#b98cff')):
        base = Vector((x, 0.12, C.z + 0.42 - abs(x) * 0.25))
        prism = kit.cyl(0.09, h, loc=(0, 0, 0), seg=6, smooth_=False, name='prism')
        tip = kit.cone(0.09, 0, 0.16, loc=(0, 0, h), seg=6, smooth_=False, name='tip')
        o = kit.join([kit.paint(prism, col), kit.paint(tip, col)], 'crystal')
        kit.place(o, base, (rng.uniform(-8, 8), tilt, rng.uniform(0, 60)))
        cr.append(o)
    kit.part(kit.join(cr, 'crystals'), 'Body', ol=0.014)
    for sx in (-1, 1):       # eye stalks with a white ball on each (the shut eyes are drawn on it)
        top = Vector((sx * 0.36, -0.42, 1.66))
        kit.part(kit.tube([Vector((sx * 0.25, -0.3, 1.05)), Vector((sx * 0.31, -0.38, 1.38)), top], 0.055, name='stalk'), 'Body', claw_c, ol=0.012)
        kit.part(kit.sphere(0.17, loc=top + Vector((0, -0.02, 0)), name='eyeball'), 'Body', '#ffffff', ol=0.016)
    face(Surface(C, 0.84), esurf=Surface(plane_y=-0.62), ex=0.36, ez=1.68, er=0.135, eh=1.0, mz=-0.06, mw=0.3, brow_gap=0.05, cheeks=None, eye_out=0.0)
    for side, sx in (('L', -1), ('R', 1)):
        kit.bone(f'Claw{side}', (sx * 0.85, -0.25, 0.75), 'Body')
        arm = kit.tube([Vector((sx * 0.75, -0.1, 0.72)), Vector((sx * 0.9, -0.25, 0.8)), Vector((sx * 0.96, -0.4, 0.92))], 0.08, name='arm')
        big = kit.sphere(1, loc=(sx * 1.0, -0.48, 1.02), scale=(0.3, 0.27, 0.26), name='claw')
        pin = kit.sphere(1, loc=(sx * 1.12, -0.5, 1.36), scale=(0.11, 0.11, 0.22), rot=(0, sx * 28, 0), name='pincer')
        pin2 = kit.sphere(1, loc=(sx * 0.86, -0.5, 1.33), scale=(0.1, 0.1, 0.19), rot=(0, sx * -22, 0), name='pincer2')
        kit.part(kit.join([arm, big, pin, pin2], 'claw'), f'Claw{side}', claw_c)
        for k, (dy, dz) in enumerate(((-0.25, 0.0), (0.05, 0.0), (0.35, 0.0))):
            pts = [Vector((sx * 0.8, dy, 0.6)), Vector((sx * 1.05, dy - 0.05, 0.64)), Vector((sx * 1.17, dy - 0.08, 0.05))]
            kit.part(kit.tube(pts, 0.05, name='leg', taper=lambda t: 1 - 0.4 * t), 'Body', legs_c, ol=0.012)
    mood_bone('Stars', C, ['happy'])
    st = [orient(star(0.09), Vector(p), Vector((0, -1, 0))) for p in ((-0.95, -0.6, 1.8), (1.0, -0.6, 1.85), (1.15, -0.6, 0.4), (-1.15, -0.6, 0.5))]
    kit.part(kit.join([kit.paint(s, '#7fe8ff') for s in st], 'stars'), 'Stars', ol=0.012)
    common.ensure_toggles(C)

    def extra(clip, f, mood):
        out = {}
        for side, sx in (('L', -1), ('R', 1)):
            r = 0.0
            if clip == 'idle': r = swing(f, 48, 4, 0.25 if sx > 0 else 0)
            elif clip == 'walk': r = swing(f, 24, 8, 0.5 if sx > 0 else 0)
            elif clip == 'attack': r = 22 * math.sin(math.pi * min(1, max(0, (f - 4) / 14)))
            elif clip == 'happy': r = 14 + swing(f, 16, 10)
            elif clip == 'hurt': r = -10 * math.sin(math.pi * min(1, f / 14))
            out[f'Claw{side}'] = {'rot': (0, 0, -sx * r)}
        return out
    return extra


# --- 4 Murkmoth: a fluffy moth that steals light --------------------------------------------------
def murkmoth():
    rng = random.Random(4)
    base_rig()
    fur, wing_a, wing_b = '#a98ae6', '#7f5be0', '#5a3fb0'
    C, R = Vector((0, 0, 1.15)), 0.72
    kit.part(kit.sphere(R, loc=C, scale=(1, 0.95, 1.05), name='body'), 'Body', fur)
    tufts = []
    for d in fib(70):
        if is_front(d, 40, 0.7): continue
        p = C + Vector((d.x, d.y * 0.95, d.z * 1.05)) * R * 0.97
        tufts.append(kit.cone(0.13, 0, 0.15, loc=p, rot=kit.facing(d), name='tuft'))
    kit.part(kit.join(tufts, 'tufts'), 'Body', fur, ol=0.014)
    for side, sx in (('L', -1), ('R', 1)):
        kit.bone(f'Wing{side}', (sx * 0.35, 0.35, 1.35), 'Body')
        outer = [(0, 0), (0.15, 0.6), (0.42, 0.98), (0.66, 0.98), (0.74, 0.55), (0.66, 0.05), (0.45, -0.4), (0.15, -0.38)]
        poly = [(sx * x, z) for x, z in outer]
        if sx < 0: poly = list(reversed(poly))
        w = kit.extrude_shape(poly, depth=0.06, bevel=0.015, name='wing'); kit.paint(w, wing_a)
        inner = [(sx * (0.2 + x * 0.6), z * 0.6 + 0.08) for x, z in outer]
        if sx < 0: inner = list(reversed(inner))
        wi = kit.extrude_shape(inner, depth=0.04, bevel=0.01, loc=(0, -0.03, 0), name='wingin'); kit.paint(wi, wing_b)
        dm = []
        for x, z, s in ((0.42, 0.6, 0.08), (0.55, 0.25, 0.065), (0.38, -0.08, 0.055)):
            dd = kit.extrude_shape([(0, s), (-s * 0.6, 0), (0, -s), (s * 0.6, 0)], depth=0.03, bevel=0.005, loc=(sx * x, -0.06, z), name='dia')
            dm.append(kit.paint(dd, '#c6f4ff'))
        o = kit.join([w, wi] + dm, 'wing')
        kit.place(o, (sx * 0.4, 0.3, 1.34), (0, sx * 8, 0), (0.86, 0.86, 0.86))
        kit.part(o, f'Wing{side}', ol=0.014)
        ant = [Vector((sx * 0.18, -0.1, 1.82)), Vector((sx * 0.3, -0.15, 2.05)), Vector((sx * 0.45, -0.12, 2.22))]
        kit.part(kit.join([kit.tube(ant, 0.025, name='ant'), kit.sphere(0.06, loc=ant[-1], name='antball')], 'antenna'), 'Body', wing_b, ol=0.01)
    face(Surface(C, R * 0.97), ex=0.2, ez=0.12, er=0.12, eh=1.2, mz=-0.18, mw=0.2, brow_gap=0.05, cheek_dx=0.32)
    # little hands with the stolen crystal and the light orb
    kit.bone('Hands', (0, -0.6, 0.62), 'Body')
    hands = [kit.paint(kit.sphere(0.1, loc=(sx * 0.22, -0.66, 0.62), name='hand'), fur) for sx in (-1, 1)]
    cry = kit.paint(kit.join([kit.cyl(0.08, 0.26, seg=6, smooth_=False, name='c'), kit.cone(0.08, 0, 0.12, loc=(0, 0, 0.26), seg=6, smooth_=False, name='ct')], 'crys'), '#7fe0ff')
    kit.place(cry, (-0.22, -0.72, 0.58), (0, -15, 0))
    kit.part(kit.join(hands + [cry], 'hands'), 'Hands', ol=0.012)
    mood_bone('OrbDark', (0.35, -0.6, 0.45), ['grumpy', 'attack', 'hurt'])
    mood_bone('OrbLight', (0.35, -0.6, 0.45), ['happy'])
    kit.part(kit.sphere(0.24, loc=(0.38, -0.62, 0.5), name='orb'), 'OrbDark', '#4fc9c0', ol=0.014)
    kit.part(kit.sphere(0.27, loc=(0.38, -0.62, 0.5), name='orbl'), 'OrbLight', '#c6fff6', ol=0.014)
    common.ensure_toggles(C)

    def extra(clip, f, mood):
        per = {'idle': 24, 'walk': 12, 'attack': 12, 'hurt': 8, 'happy': 8}[clip]; amp = {'happy': 12, 'attack': 12}.get(clip, 8)
        out = {}
        for side, sx in (('L', -1), ('R', 1)):
            out[f'Wing{side}'] = {'rot': (0, sx * swing(f, per, amp * 1.6), sx * swing(f, per, amp * 0.35))}
        out['Body'] = {}
        return {k: v for k, v in out.items() if v}
    return extra


# --- 5 Captain Puffington: a pufferfish that puffs up when nervous -------------------------------
def puffington():
    rng = random.Random(5)
    base_rig()
    C, R = Vector((0, 0, 1.05)), 0.9
    body = kit.sphere(R, loc=C, seg=56, rings=28, name='body')
    body.data.materials.append(kit.mat('#4aa8e8')); body.data.materials.append(kit.mat('#f5cf6a'))
    for p in body.data.polygons:
        p.material_index = 0 if p.center.z > C.z + 0.02 * math.sin(p.center.x * 9) else 1
    kit.part(body, 'Body')
    mood_bone('Spikes', C, ['grumpy', 'attack', 'hurt'])
    mood_bone('Calm', C, ['happy'])
    sp, dots = [], []
    for d in fib(64):
        if is_front(d, 44, 0.55) or d.z < -0.85: continue
        p = C + d * R * 0.97
        col = '#2f78b8' if d.z > 0.02 else '#c99a35'
        sp.append(kit.paint(kit.cone(0.05, 0, 0.26, loc=p, rot=kit.facing(d), seg=10, name='spike'), col))
        dots.append(kit.paint(kit.sphere(0.04, loc=C + d * (R + 0.01), name='dot'), col))
    kit.part(kit.join(sp, 'spikes'), 'Spikes', ol=0.01)
    kit.part(kit.join(dots, 'dots'), 'Calm', outline=False)
    kit.bone('Tail', (0.85, 0.15, 1.05), 'Body')
    tail = kit.extrude_shape([(0, 0), (0.45, 0.32), (0.38, 0), (0.45, -0.32)], depth=0.1, bevel=0.03, name='tail')
    kit.part(kit.place(tail, (0.82, 0.18, 1.05), (0, 0, -20)), 'Tail', '#3f9fe0')
    for sx in (-1, 1):
        fin = kit.extrude_shape([(0, 0), (sx * 0.28, 0.14), (sx * 0.24, -0.12)][::sx], depth=0.06, bevel=0.015, name='fin')
        kit.part(kit.place(fin, (sx * 0.62, -0.55, 0.85), (0, 0, sx * -15)), 'Body', '#3f9fe0', ol=0.012)
    face(Surface(C, R), ex=0.24, ez=0.14, er=0.135, eh=1.15, mz=-0.18, mw=0.22, brow_gap=0.05, cheek_dx=0.38)
    # the captain's hat once friends
    hat = [kit.paint(kit.cyl(0.42, 0.12, loc=(0, 0, 0), scale=(1.2, 1, 1), seg=32, name='brim'), '#2b3a6b'),
           kit.paint(kit.sphere(0.36, loc=(0, 0, 0.16), scale=(1.15, 1, 0.55), name='crown'), '#2b3a6b'),
           kit.paint(kit.cyl(0.37, 0.06, loc=(0, 0, 0.1), scale=(1.18, 1, 1), seg=32, name='band'), '#ffd23f')]
    em = kit.paint(kit.sphere(0.07, loc=(0, -0.38, 0.22), scale=(1, 0.4, 1), name='emblem'), '#ffd23f')
    h = kit.join(hat + [em], 'hat'); kit.place(h, (0, 0.02, C.z + R * 0.88), (-8, 0, 0))
    kit.part(h, 'Calm', ol=0.014)
    kit.bone('Bubbles', (0, 0, 1.9), 'Body')
    bub = [kit.sphere(r, loc=(x, -0.3, z), name='bubble') for x, z, r in ((-0.95, 1.95, 0.08), (-0.75, 2.15, 0.05), (0.95, 1.85, 0.06), (1.05, 2.05, 0.04))]
    kit.part(kit.join(bub, 'bubbles'), 'Bubbles', '#e8f7ff', ol=0.01)
    common.ensure_toggles(C)

    def extra(clip, f, mood):
        per = {'idle': 48, 'walk': 12, 'attack': 6, 'hurt': 8, 'happy': 8}[clip]
        out = {'Tail': {'rot': (0, swing(f, per, 18), 0)}}
        out['Bubbles'] = {'loc': (0, (f % 24) / 24 * 0.15, 0)}
        return out
    return extra


# --- 6 Sir Snowsulk: a snowman in a royal cape ---------------------------------------------------
def snowsulk():
    base_rig()
    snow, cape, ice = '#eef7ff', '#3f78c8', '#7fd0ff'
    kit.part(kit.sphere(0.62, loc=(0, 0, 0.6), scale=(1.05, 1, 0.98), name='low'), 'Body', snow)
    kit.part(kit.sphere(0.47, loc=(0, -0.04, 1.42), name='mid'), 'Body', snow)
    HC, HR = Vector((0, -0.06, 2.08)), 0.4
    kit.bone('Head', HC - Vector((0, 0, 0.35)), 'Body')
    kit.part(kit.sphere(HR, loc=HC, name='head'), 'Head', snow)
    cp = kit.cone(0.95, 0.42, 1.8, loc=(0, 0.42, 0.04), scale=(1, 0.62, 1), seg=40, name='cape')
    kit.part(cp, 'Body', cape)
    flakes = []
    for sx in (-1, 1):
        for z in (0.4, 0.9, 1.35):
            r = 0.95 - 0.53 * (z - 0.04) / 1.8; x = sx * r * 0.86; y = 0.42 - 0.62 * r * 0.51
            n = Vector((x / r ** 2, (y - 0.42) / (0.62 * r) ** 2, 0)).normalized()
            flakes.append(orient(star(0.07, points=6, inner=0.3), Vector((x, y, z)), n, 0.01))
    kit.part(kit.join([kit.paint(f_, '#ffffff') for f_ in flakes], 'flakes'), 'Body', ol=0.008)
    cr = []
    for k in range(9):
        a = math.radians(-90 + (k - 4) * 22); d = Vector((math.cos(a) * 0.8, math.sin(a) * 0.8, 0.6)).normalized()
        base = HC + Vector((math.cos(a) * 0.22, math.sin(a) * 0.22, HR * 0.85))
        cr.append(kit.cone(0.06, 0, 0.22 + (0.08 if k % 2 == 0 else 0), loc=base, rot=kit.facing(Vector((d.x * 0.3, d.y * 0.3, 1))), seg=6, smooth_=False, name='ice'))
    cr.append(kit.cyl(0.24, 0.07, loc=HC + Vector((0, 0, HR * 0.8)), seg=24, name='band'))
    kit.part(kit.join(cr, 'crown'), 'Head', ice, ol=0.012)
    np_, nn = Surface(HC, HR).at(0, -0.02)
    kit.part(kit.cone(0.065, 0, 0.28, loc=np_ - nn * 0.02, rot=kit.facing(Vector((0.35, -1, -0.05))), name='nose'), 'Head', '#ff8a2b', ol=0.012)
    face(Surface(HC, HR), ex=0.14, ez=0.1, er=0.075, eh=1.2, mz=-0.18, mw=0.16, brow_gap=0.035, cheek_dx=0.23)
    for z, r in ((1.55, 0.47), (1.3, 0.47), (0.75, 0.62), (0.45, 0.62)):
        p, n = Surface(Vector((0, -0.04 if z > 1 else 0, 1.42 if z > 1 else 0.6)), r).at(0, z - (1.42 if z > 1 else 0.6))
        kit.part(orient(kit.extrude_shape([(0, 0.07), (-0.05, 0), (0, -0.07), (0.05, 0)], depth=0.04, bevel=0.008, name='btn'), p, n, 0.0), 'Body', '#3a6fb0', ol=0.008)
    twig = lambda pts, extra_: [kit.tube(pts, 0.035, name='stick')] + [kit.tube(e, 0.025, name='twig') for e in extra_]
    mood_bone('ArmsCross', (0, -0.4, 1.4), ['grumpy', 'attack', 'hurt'])
    cross = twig([Vector((-0.45, -0.1, 1.55)), Vector((0.05, -0.6, 1.32)), Vector((0.5, -0.56, 1.22))], [[Vector((0.4, -0.58, 1.24)), Vector((0.55, -0.6, 1.36))]]) + \
        twig([Vector((0.45, -0.1, 1.55)), Vector((-0.05, -0.65, 1.4)), Vector((-0.5, -0.6, 1.28))], [[Vector((-0.4, -0.62, 1.3)), Vector((-0.55, -0.64, 1.42))]])
    kit.part(kit.join(cross, 'armsx'), 'ArmsCross', '#7a4a2a', ol=0.01)
    mood_bone('ArmsUp', (0, 0, 1.5), ['happy'])
    up = []
    for sx in (-1, 1):
        up += twig([Vector((sx * 0.4, -0.05, 1.55)), Vector((sx * 0.75, -0.1, 1.85)), Vector((sx * 0.95, -0.12, 2.15))],
                   [[Vector((sx * 0.86, -0.12, 2.0)), Vector((sx * 1.05, -0.12, 2.0))], [Vector((sx * 0.92, -0.12, 2.1)), Vector((sx * 0.88, -0.12, 2.32))]])
    kit.part(kit.join(up, 'armsup'), 'ArmsUp', '#7a4a2a', ol=0.01)
    mood_bone('Scarf', (0, 0, 1.8), ['happy'])
    ring = [Vector((math.cos(a) * 0.38, -0.06 + math.sin(a) * 0.36, 1.78)) for a in [i * 2 * math.pi / 24 for i in range(25)]]
    sc = [kit.tube(ring, 0.07, name='scarf'), kit.tube([Vector((0.18, -0.4, 1.76)), Vector((0.26, -0.48, 1.55)), Vector((0.3, -0.5, 1.38))], 0.07, name='end')]
    kit.part(kit.join(sc, 'scarf'), 'Scarf', '#e5484d', ol=0.012)
    common.ensure_toggles(HC)
    return lambda clip, f, mood: {'Head': {'rot': (0, 0, swing(f, 48 if clip == 'idle' else 16, 4 if clip != 'happy' else 8))}}


# --- 7 Magmaw: a volcano toad ---------------------------------------------------------------------
def magmaw():
    rng = random.Random(8)
    base_rig()
    rock, belly, lava = '#5e4a52', '#ff8a2b', '#ffb43d'
    C = Vector((0, 0, 0.82))
    S = (1.18, 0.95, 0.85)
    kit.part(kit.sphere(1, loc=C, scale=S, seg=56, rings=28, name='body'), 'Body', rock)
    bp, bn = Surface(C, 0.95).at(0, -0.38)
    kit.part(orient(kit.sphere(1, scale=(0.72, 0.2, 0.36), name='belly'), bp + Vector((0, 0.1, 0)), bn, -0.02), 'Body', belly, ol=0.014)
    zig = [Vector((x, -0.0, 0.0)) for x in (-0.4, -0.25, -0.1, 0.05, 0.2, 0.35)]
    zz = [bp + Vector((x, -0.12, 0.05 * (1 if i % 2 else -1) - 0.02)) for i, x in enumerate((-0.42, -0.25, -0.08, 0.08, 0.25, 0.42))]
    kit.ink(kit.tube(zz, 0.022, name='zig'), 'Body', '#e0661a')
    surface_lines(C, 1.0, 9, rng, avoid=front_zone(42, -60, 50), width=0.03, hex_='#ff7a1a', scale=S)
    crater = [kit.paint(kit.cone(0.36, 0.24, 0.32, loc=(0, 0.1, 1.48), seg=24, name='crater'), '#3a2c32'),
              kit.paint(kit.cyl(0.22, 0.04, loc=(0, 0.1, 1.79), seg=24, name='lavatop'), lava)]
    kit.part(kit.join(crater, 'crater'), 'Body', ol=0.014)
    kit.part(kit.tube([Vector((0.12, -0.08, 1.8)), Vector((0.2, -0.16, 1.68)), Vector((0.22, -0.2, 1.56))], 0.045, name='drip'), 'Body', lava, ol=0.01)
    mood_bone('Smoke', (0, 0.1, 1.9), ['grumpy', 'attack', 'hurt'])
    sm = [kit.sphere(r, loc=(x, 0.1, z), name='puff') for x, z, r in ((0.0, 2.0, 0.14), (0.12, 2.22, 0.12), (0.25, 2.42, 0.1))]
    kit.part(kit.join(sm, 'smoke'), 'Smoke', '#9a94a0', ol=0.012)
    mood_bone('Hearts', (0, -0.3, 1.9), ['happy'])
    hs = [orient(heart(0.11), Vector(p), Vector((0, -1, 0))) for p in ((-0.85, -0.7, 1.75), (0.9, -0.7, 1.85))]
    hs += [kit.sphere(r, loc=(x, 0.1, z), name='puffw') for x, z, r in ((0.0, 2.0, 0.12), (0.1, 2.2, 0.09))]
    kit.part(kit.join([kit.paint(h_, '#ff8fb1') for h_ in hs[:2]] + [kit.paint(x, '#f4f0f6') for x in hs[2:]], 'hearts'), 'Hearts', ol=0.012)
    for sx in (-1, 1):       # the eye bumps
        kit.part(kit.sphere(0.28, loc=(sx * 0.38, -0.46, 1.58), name='bump'), 'Body', rock)
    face(Surface(C, 0.97), esurf=Surface(plane_y=-0.76), ex=0.38, ez=1.58, er=0.16, eh=1.05, mz=0.14, mw=0.34, brow_gap=0.05, cheeks=None, wide_mouth=1.1, ink='#ffc35a')
    feet([('FootL', -0.55, -0.45), ('FootR', 0.55, -0.45)], '#3a2c32', size=(0.24, 0.26, 0.12))
    common.ensure_toggles(C)

    def extra(clip, f, mood):
        return {'Smoke': {'loc': (0, (f % 24) / 24 * 0.12, 0), 'scale': 1.0 if mood != 'happy' else 0.0}} if clip in ('idle', 'walk') else {}
    return extra


# --- 8 Zapcrackle: a thundercloud with a temper ---------------------------------------------------
def zapcrackle():
    base_rig()
    C = Vector((0, 0, 1.3))
    blobs = ((0, 0, 0, 0.62), (-0.62, 0.08, -0.12, 0.44), (0.62, 0.08, -0.12, 0.44), (-0.3, 0.1, 0.48, 0.42), (0.32, 0.12, 0.45, 0.45),
             (0, 0.15, -0.3, 0.52), (-0.95, 0.15, -0.25, 0.3), (0.95, 0.15, -0.25, 0.3))
    mood_bone('CloudDark', C, ['grumpy', 'attack', 'hurt'])
    mood_bone('CloudLight', C, ['happy'])
    for nm, col, k in (('CloudDark', '#6a6488', 1.0), ('CloudLight', '#f4f6ff', 1.03)):
        objs = [kit.sphere(r * k, loc=C + Vector((x, y, z)), name='blob') for x, y, z, r in blobs]
        kit.part(kit.join(objs, nm), nm, col)
    kit.bone('Bolt', (0, -0.1, 0.62), 'Body')
    b = bolt(0.7, 0.32, 0.1); kit.paint(b, '#ffd23f')
    kit.part(kit.place(b, (0.05, -0.15, 0.4)), 'Bolt', ol=0.014)
    mood_bone('Sparks', C, ['grumpy', 'attack', 'hurt'])
    sk = [kit.place(bolt(0.22, 0.1, 0.04), (x, -0.4, z), (0, 0, r)) for x, z, r in ((-1.15, 1.75, -15), (1.2, 1.6, 15), (-0.85, 2.05, 10), (1.0, 0.75, -10))]
    kit.part(kit.join([kit.paint(s, '#ffd23f') for s in sk], 'sparks'), 'Sparks', ol=0.01)
    mood_bone('Rainbow', C, ['happy'])
    rb = []
    for sx in (-1, 1):
        for i, col in enumerate(('#ff6b6b', '#ffd23f', '#5fd47a', '#4f9ef0')):
            pts = [Vector((sx * (0.9 + 0.07 * i + 0.35 * t), -0.2, 0.95 - 0.55 * t * t)) for t in [j / 8 for j in range(9)]]
            rb.append(kit.paint(kit.tube(pts, 0.035, name='rb'), col))
    kit.part(kit.join(rb, 'rainbow'), 'Rainbow', outline=False)
    face(Surface(C, 0.62), ex=0.22, ez=0.1, er=0.12, eh=1.15, mz=-0.2, mw=0.26, brow_gap=0.05, cheek_dx=0.36, wide_mouth=1.1)
    common.ensure_toggles(C)

    def extra(clip, f, mood):
        s = 1.0
        if clip == 'attack': s = 1 + 0.35 * math.sin(math.pi * min(1, max(0, (f - 6) / 12)))
        return {'Bolt': {'scale': (s, s, s), 'rot': (0, 0, swing(f, 12, 4))}}
    return extra


# --- 9 Snorecap: a sleepy mushroom ----------------------------------------------------------------
def snorecap():
    rng = random.Random(9)
    base_rig()
    stem = '#f4e3cc'
    SC = Vector((0, 0, 0.74))
    kit.part(kit.sphere(1, loc=SC, scale=(0.5, 0.45, 0.66), name='stem'), 'Body', stem)
    kit.bone('Cap', (0, 0, 1.25), 'Body')
    CC = Vector((0, 0.06, 1.86))
    for nm, col, moods in (('CapGrumpy', '#8a5ad0', ['grumpy', 'attack', 'hurt']), ('CapHappy', '#b58af0', ['happy'])):
        mood_bone(nm, (0, 0, 1.3), moods, parent='Cap')
        kit.part(kit.sphere(1, loc=CC, scale=(1.02, 0.95, 0.56), seg=56, rings=28, name=nm), nm, col)
    spots = []
    for d in fib(26):
        if d.z < 0.05: continue
        p = CC + Vector((d.x * 1.02, d.y * 0.95, d.z * 0.56))
        n = Vector((d.x / 1.02, d.y / 0.95, d.z / 0.56)).normalized()
        s = 0.1 + rng.uniform(0, 0.06)
        spots.append(orient(kit.sphere(1, scale=(s, 0.05, s * 0.8), name='spot'), p, n, 0.0))
    kit.part(kit.join(spots, 'spots'), 'Cap', '#f6f0ff', ol=0.01)
    face(Surface(SC + Vector((0, 0, 0.1)), 0.46), ex=0.16, ez=0.1, er=0.095, eh=1.2, mz=-0.14, mw=0.17, brow_gap=0.035, cheek_dx=0.26)
    mood_bone('ArmsCross', (0, -0.4, 0.55), ['grumpy', 'attack', 'hurt'])
    ax = [kit.capsule((-0.36, -0.2, 0.62), (0.18, -0.46, 0.42), 0.075, name='a1'), kit.capsule((0.36, -0.2, 0.62), (-0.18, -0.48, 0.47), 0.075, name='a2')]
    kit.part(kit.join(ax, 'armsx'), 'ArmsCross', stem, ol=0.012)
    mood_bone('ArmsUp', (0, 0, 0.6), ['happy'])
    au = [kit.capsule((sx * 0.38, -0.1, 0.72), (sx * 0.62, -0.18, 1.02), 0.075, name='au') for sx in (-1, 1)]
    kit.part(kit.join(au, 'armsup'), 'ArmsUp', stem, ol=0.012)
    feet([('FootL', -0.2, -0.12), ('FootR', 0.2, -0.12)], '#8a5a3a', size=(0.16, 0.2, 0.1))
    sp = [kit.sphere(r, loc=(x, -0.3, z), name='spore') for x, z, r in ((-1.0, 1.9, 0.05), (1.05, 2.0, 0.06), (-1.15, 0.8, 0.04), (1.1, 0.6, 0.05), (0.85, 2.3, 0.035))]
    kit.bone('Spores', (0, 0, 1.4), 'Body')
    kit.part(kit.join(sp, 'spores'), 'Spores', '#ff9fd1', ol=0.008)
    common.ensure_toggles(SC)

    def extra(clip, f, mood):
        return {'Cap': {'rot': (0, 0, swing(f, 48 if clip == 'idle' else 16, 3)), 'scale': (1 + swing(f, 48, 0.015), 1 - swing(f, 48, 0.02), 1 + swing(f, 48, 0.015))},
                'Spores': {'loc': (0, (f % 48) / 48 * 0.2, 0), 'rot': (0, swing(f, 48, 20), 0)}}
    return extra


# --- 10 Whirlwing: a kite that tangles everything ------------------------------------------------
def whirlwing():
    base_rig()
    top, right, bottom, left, mid = (0, 2.2), (0.8, 1.38), (0, 0.55), (-0.8, 1.38), (0, 1.38)
    quads = [(mid, top, left), (mid, right, top), (mid, left, bottom), (mid, bottom, right)]
    for nm, cols, moods in (('KiteGrumpy', ['#8aa6c8', '#6a86aa', '#5a7698', '#9db6d6'], ['grumpy', 'attack', 'hurt']),
                            ('KiteHappy', ['#4f9ef0', '#ffd23f', '#ff8fb1', '#ff9f43'], ['happy'])):
        mood_bone(nm, (0, 0, 1.38), moods)
        objs = []
        for (a, b, c), col in zip(quads, cols):
            tri = [(a[0], a[1]), (b[0], b[1]), (c[0], c[1])]
            objs.append(kit.paint(kit.extrude_shape(tri, depth=0.08, bevel=0.0, name='q'), col))
        kit.part(kit.join(objs, nm), nm, ol=0.016)
    bars = [kit.capsule((0, -0.06, 2.18), (0, -0.06, 0.57), 0.03, name='v'), kit.capsule((-0.78, -0.06, 1.38), (0.78, -0.06, 1.38), 0.03, name='h')]
    kit.ink(kit.join(bars, 'bars'), 'Body', '#4a3a5a')
    kit.part(kit.cyl(0.33, 0.06, loc=(0, -0.05, 1.38), rot=(90, 0, 0), seg=40, name='faceplate'), 'Body', '#e8f0fa', ol=0.014)
    face(Surface(plane_y=-0.125), ex=0.13, ez=1.43, er=0.085, eh=1.15, mz=1.27, mw=0.16, brow_gap=0.035, cheek_dx=0.22)
    kit.bone('Tail', (0, 0, 0.55), 'Body')
    pts = [Vector((0.25 * math.sin(t * 5), -0.02, 0.55 - t * 0.5)) for t in [i / 14 for i in range(15)]]
    tail = [kit.tube(pts, 0.016, name='string')]
    bows = []
    for t in (0.3, 0.62, 0.92):
        c = Vector((0.25 * math.sin(t * 5), -0.04, 0.55 - t * 0.5))
        for sx in (-1, 1):
            bows.append(kit.paint(kit.place(kit.extrude_shape([(0, 0), (sx * 0.12, 0.06), (sx * 0.12, -0.06)][::sx], depth=0.03, bevel=0.005, name='bow'), c), '#ff8fb1' if t != 0.62 else '#7fd0ff'))
    kit.part(kit.join([kit.paint(tail[0], '#4a3a5a')], 'string'), 'Tail', outline=False)
    kit.part(kit.join(bows, 'bows'), 'Tail', ol=0.008)
    common.ensure_toggles((0, 0, 1.38))
    mood_bone('Breeze', (0, 0, 1.4), ['grumpy', 'attack', 'hurt', 'happy'])
    br = []
    for sx, z in ((-1, 1.9), (1, 1.75), (-1, 0.95), (1, 0.85)):
        pts = [Vector((sx * (1.0 + 0.18 * math.cos(a)), -0.2, z + 0.12 * math.sin(a))) for a in [math.radians(v) for v in range(0, 300, 20)]]
        br.append(kit.tube(pts, 0.02, name='swirl'))
    kit.part(kit.join(br, 'breeze'), 'Breeze', '#9fd0f0', outline=False)

    def extra(clip, f, mood):
        per = {'idle': 48, 'walk': 24, 'attack': 24, 'hurt': 16, 'happy': 16}[clip]
        return {'Tail': {'rot': (0, 0, swing(f, per, 12))}, 'Breeze': {'rot': (0, swing(f, per, 20), 0)}}
    return extra


# --- 11 The Clockwork Colossus: an ancient wind-up guardian --------------------------------------
def colossus():
    base_rig()
    common.SHOW_OVERRIDE.update({
        'grumpy': {'EyeL', 'EyeR', 'GrumpyOnly'},
        'attack': {'BrowAttack', 'GrumpyOnly'},
        'hurt': {'ShutHurt', 'Sweat', 'GrumpyOnly'},
        'happy': {'ShutHappy', 'HappyOnly'},
    })
    stone, metal, dark = '#9a8a78', '#c9a25a', '#6a5a48'
    for nm, x in (('FootL', -0.28), ('FootR', 0.28)):
        kit.bone(nm, (x, 0, 0.1), 'Body')
        kit.part(kit.join([kit.paint(kit.box((0.3, 0.36, 0.55), loc=(x, 0, 0.32), bevel=0.06), stone),
                           kit.paint(kit.box((0.36, 0.44, 0.14), loc=(x, -0.03, 0.07), bevel=0.05), dark)], nm), nm)
    kit.part(kit.join([kit.paint(kit.box((1.05, 0.72, 0.92), loc=(0, 0, 1.05), bevel=0.1), stone),
                       kit.paint(kit.box((1.12, 0.78, 0.12), loc=(0, 0, 1.4), bevel=0.05), metal),
                       kit.paint(kit.box((1.12, 0.78, 0.1), loc=(0, 0, 0.66), bevel=0.04), metal)], 'torso'), 'Body')
    dial = [kit.paint(kit.cyl(0.24, 0.06, loc=(0, -0.38, 1.02), rot=(90, 0, 0), seg=40, name='ring'), metal),
            kit.paint(kit.cyl(0.18, 0.06, loc=(0, -0.41, 1.02), rot=(90, 0, 0), seg=40, name='dialin'), dark)]
    kit.part(kit.join(dial, 'dial'), 'Body', ol=0.012)
    common.ensure_toggles((0, -0.4, 1.0))
    kit.part(orient(star(0.12, 0.03), Vector((0, -0.48, 1.02)), Vector((0, -1, 0))), 'GrumpyOnly', '#3a3040', ol=0.008)
    kit.part(orient(star(0.13, 0.03), Vector((0, -0.48, 1.02)), Vector((0, -1, 0))), 'HappyOnly', '#ff8fb1', ol=0.008)
    for side, sx in (('L', -1), ('R', 1)):
        kit.bone(f'Arm{side}', (sx * 0.7, 0, 1.38), 'Body')
        kit.part(kit.join([kit.paint(kit.box((0.28, 0.36, 0.7), loc=(sx * 0.72, 0, 1.0), bevel=0.07), stone),
                           kit.paint(kit.box((0.32, 0.4, 0.2), loc=(sx * 0.72, -0.02, 0.6), bevel=0.07), metal)], 'arm'), f'Arm{side}')
        kit.bone(f'Gear{side}', (sx * 0.72, 0.02, 1.55), 'Body')
        teeth = [kit.box((0.09, 0.1, 0.12), loc=(math.cos(a) * 0.27, 0, math.sin(a) * 0.27), rot=(0, -math.degrees(a) + 90, 0), bevel=0.02) for a in [k * math.pi / 5 for k in range(10)]]
        g = kit.join([kit.cyl(0.25, 0.1, loc=(0, 0.05, 0), rot=(90, 0, 0), seg=32, name='g')] + teeth, 'gear')
        g.data.materials.clear(); g.data.materials.append(kit.mat(metal))
        hub = kit.paint(kit.cyl(0.08, 0.12, loc=(0, -0.0, 0), rot=(90, 0, 0), seg=16, name='hub'), dark)
        kit.part(kit.place(kit.join([g, hub], 'gear'), (sx * 0.72, 0.02, 1.55)), f'Gear{side}', ol=0.012)
    HC = Vector((0, -0.02, 1.86))
    kit.bone('Head', (0, 0, 1.6), 'Body')
    kit.part(kit.join([kit.paint(kit.box((0.64, 0.56, 0.5), loc=HC, bevel=0.08), metal),
                       kit.paint(kit.box((0.5, 0.06, 0.18), loc=HC + Vector((0, -0.28, 0.04)), bevel=0.03), '#3a3040')], 'head'), 'Head')
    grille = [kit.capsule((x, -0.315, HC.z - 0.15), (x, -0.315, HC.z - 0.09), 0.016) for x in (-0.12, -0.04, 0.04, 0.12)]
    kit.ink(kit.join(grille, 'grille'), 'Head', dark)
    key = [kit.cyl(0.04, 0.22, loc=HC + Vector((0, 0.05, 0.22)), name='keystem'),
           kit.tube([HC + Vector((0.13 * math.cos(a), 0.05, 0.55 + 0.13 * math.sin(a))) for a in [i * 2 * math.pi / 20 for i in range(21)]], 0.04, name='keyring')]
    kit.bone('Key', HC + Vector((0, 0.05, 0.25)), 'Head')
    kit.part(kit.join(key, 'key'), 'Key', metal, ol=0.012)
    vy = -0.35
    def slit(cx, ang, col, w=0.14):
        a = math.radians(ang); d = Vector((math.cos(a) * w / 2, 0, math.sin(a) * w / 2)); c = Vector((cx, vy, HC.z + 0.04))
        return kit.paint(kit.capsule(c - d, c + d, 0.03, name='slit'), col)
    for side, sx in (('L', -1), ('R', 1)):
        kit.bone(f'Eye{side}', (sx * 0.12, vy, HC.z + 0.04), 'Head', toggle=True)
        kit.part(slit(sx * 0.12, sx * 14, '#ff9a2b'), f'Eye{side}', outline=False)
    kit.part(kit.join([slit(-0.12, -20, '#ff4a2b', 0.15), slit(0.12, 20, '#ff4a2b', 0.15)], 'redslits'), 'BrowAttack', outline=False)
    xs = []
    for cx in (-0.12, 0.12):
        c = Vector((cx, vy, HC.z + 0.04))
        xs += [kit.capsule(c + Vector((-0.05, 0, -0.05)), c + Vector((0.05, 0, 0.05)), 0.022), kit.capsule(c + Vector((-0.05, 0, 0.05)), c + Vector((0.05, 0, -0.05)), 0.022)]
    kit.part(kit.join([kit.paint(x, '#ff9a2b') for x in xs], 'xeyes'), 'ShutHurt', outline=False)
    hap = [kit.paint(kit.arc((cx, vy, HC.z + 0.0), 0.06, 0.05, 20, 160, r=0.022, name='hap'), '#7fe0ff') for cx in (-0.12, 0.12)]
    kit.part(kit.join(hap, 'happyeyes'), 'ShutHappy', outline=False)
    for nm in ('BrowAttack', 'ShutHurt', 'ShutHappy', 'GrumpyOnly', 'HappyOnly'):
        h, p, t = kit.BONES[nm]; kit.BONES[nm] = (h, 'Head' if nm.startswith(('Brow', 'Shut')) else 'Body', t)
    p, n = Vector((0.36, -0.3, HC.z + 0.2)), Vector((0, -1, 0))
    kit.bone('Sweat', p, 'Head', toggle=True)
    kit.part(orient(kit.join([kit.paint(kit.sphere(0.05, scale=(0.8, 0.5, 1), name='d'), '#8fd3f4')], 'sweat'), p, n), 'Sweat', ol=0.01)

    def extra(clip, f, mood):
        per = {'idle': 48, 'walk': 24, 'attack': 24, 'hurt': 16, 'happy': 32}[clip]
        spin = 360 * f / per
        out = {'GearL': {'rot': (0, 0, spin)}, 'GearR': {'rot': (0, 0, -spin)}, 'Key': {'rot': (0, spin, 0)}}
        if clip == 'walk':
            out['ArmL'] = {'rot': (swing(f, 24, 14), 0, 0)}; out['ArmR'] = {'rot': (swing(f, 24, 14, 0.5), 0, 0)}
        elif clip == 'attack':
            k = math.sin(math.pi * min(1, max(0, (f - 5) / 12)))
            out['ArmR'] = {'rot': (60 * k, 0, 10 * k)}; out['ArmL'] = {'rot': (-15 * k, 0, 0)}
        elif clip == 'happy':
            out['ArmL'] = {'rot': (0, 0, -55 - swing(f, 16, 15))}; out['ArmR'] = {'rot': (0, 0, 55 + swing(f, 16, 15))}
        elif clip == 'hurt':
            out['Head'] = {'rot': (-8 * math.sin(math.pi * min(1, f / 14)), 0, swing(f, 6, 6))}
        return out
    return extra


# --- 12 Riddlepaw: a sphinx cat who asks riddles --------------------------------------------------
def riddlepaw():
    base_rig()
    fur, blue, gold = '#f2c46b', '#2f6fd0', '#ffd23f'
    kit.part(kit.sphere(1, loc=(0, 0.25, 0.58), scale=(0.62, 0.7, 0.58), name='haunch'), 'Body', fur)
    kit.part(kit.sphere(1, loc=(0, -0.15, 0.82), scale=(0.44, 0.38, 0.55), name='chest'), 'Body', fur)
    for nm, x in (('FootL', -0.2), ('FootR', 0.2)):
        kit.bone(nm, (x, -0.5, 0.06), 'Body')
        kit.part(kit.join([kit.capsule((x, -0.3, 0.35), (x, -0.5, 0.1), 0.1), kit.sphere(1, loc=(x, -0.55, 0.08), scale=(0.13, 0.16, 0.08))], 'paw'), nm, fur)
    tail = [Vector((0.55 + 0.2 * math.sin(t * 1.2), 0.5 - 1.1 * t, 0.12 + 0.25 * t * (1 - t) * 2)) for t in [i / 14 for i in range(15)]]
    kit.bone('Tail', (0.55, 0.5, 0.12), 'Body')
    kit.part(kit.tube(tail, 0.07, name='tail', taper=lambda t: 1 - 0.3 * t), 'Tail', fur)
    kit.part(kit.sphere(0.1, loc=tail[-1], name='tip'), 'Tail', '#d99a3a', ol=0.012)
    HC, HR = Vector((0, -0.18, 1.62)), 0.46
    kit.bone('Head', (0, -0.1, 1.25), 'Body')
    kit.part(kit.sphere(HR, loc=HC, scale=(1.05, 1, 0.95), name='head'), 'Head', fur)
    nem = kit.sphere(1, loc=HC + Vector((0, 0.16, 0.06)), scale=(0.6, 0.5, 0.58), seg=48, rings=24, name='nemes')
    nem.data.materials.append(kit.mat(blue)); nem.data.materials.append(kit.mat(gold))
    for p in nem.data.polygons: p.material_index = int((p.center.z - HC.z + 1) * 9) % 2
    kit.part(nem, 'Head')
    for sx in (-1, 1):
        lap = kit.cone(0.13, 0.08, 0.5, loc=(sx * 0.4, -0.12, 1.02), scale=(1, 0.55, 1), seg=16, name='lappet')
        lap.data.materials.append(kit.mat(blue)); lap.data.materials.append(kit.mat(gold))
        for p in lap.data.polygons: p.material_index = int((p.center.z) * 10) % 2
        kit.part(lap, 'Head')
        kit.part(kit.cone(0.13, 0, 0.26, loc=HC + Vector((sx * 0.3, 0.05, 0.48)), rot=(0, sx * 18, 0), name='ear'), 'Head', fur)
        kit.part(kit.cone(0.07, 0, 0.16, loc=HC + Vector((sx * 0.3, -0.04, 0.52)), rot=(0, sx * 18, 0), name='earin'), 'Head', '#f7a8b8', outline=False)
    band = [HC + Vector((0.4 * math.cos(a), -0.4 * math.sin(a) * 0.98, 0.28)) for a in [math.radians(v) for v in range(10, 171, 10)]]
    kit.part(kit.tube(band, 0.04, name='band'), 'Head', gold, ol=0.01)
    kit.part(kit.sphere(0.07, loc=HC + Vector((0, -0.43, 0.3)), name='jewel'), 'Head', '#ff9f2b', ol=0.012)
    col = [Vector((0.42 * math.cos(a), -0.15 - 0.36 * math.sin(a), 1.22)) for a in [math.radians(v) for v in range(-10, 191, 10)]]
    kit.part(kit.join([kit.tube(col, 0.07, name='collar'), kit.tube([c + Vector((0, 0, -0.1)) for c in col], 0.05, name='collar2')], 'collar'), 'Body', gold, ol=0.012)
    face(Surface(HC, HR), ex=0.17, ez=0.04, er=0.1, eh=1.25, mz=-0.2, mw=0.16, brow_gap=0.04, cheek_dx=0.27)
    wh = []
    for sx in (-1, 1):
        for dz in (-0.02, 0.04):
            p, n = Surface(HC, HR).at(sx * 0.2, -0.16 + dz)
            wh.append(kit.capsule(p + n * 0.02, p + Vector((sx * 0.22, -0.05, dz * 2)), 0.008))
    kit.ink(kit.join(wh, 'whiskers'), 'Head', '#6a4a2a')
    common.ensure_toggles(HC)
    return lambda clip, f, mood: {'Tail': {'rot': (0, 0, swing(f, 48 if clip == 'idle' else 16, 8))},
                                  'Head': {'rot': (0, 0, swing(f, 48, 2) if clip == 'idle' else 0)}}


BUILDERS = {'grumblethorn': grumblethorn, 'mudsnout': mudsnout, 'glimmerjaw': glimmerjaw, 'murkmoth': murkmoth,
            'puffington': puffington, 'snowsulk': snowsulk, 'magmaw': magmaw, 'zapcrackle': zapcrackle,
            'snorecap': snorecap, 'whirlwing': whirlwing, 'colossus': colossus, 'riddlepaw': riddlepaw}
