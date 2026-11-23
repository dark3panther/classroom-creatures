"""The face every boss shares (eyes, brows, mouths for four moods) and the five clips.

Moods: grumpy (idle and walk), attack, hurt, happy (befriended). Each mood is a set of parts
switched on by scaling their bone to 1 (the rest stay at 0). Bones a boss adds for itself can
join in through `extra(clip, frame)`, which returns more keys for that moment.
"""
import math
from mathutils import Euler, Matrix, Vector

import kit
from kit import INK

MOODS = ('grumpy', 'attack', 'hurt', 'happy')
FACE_TOGGLES = ['EyeL', 'EyeR', 'BrowGrumpy', 'BrowAttack', 'BrowHurt', 'BrowHappy', 'ShutHappy', 'ShutHurt',
                'MouthGrumpy', 'MouthAttack', 'MouthHurt', 'MouthHappy', 'Sweat', 'HappyOnly', 'GrumpyOnly']
MOOD_BONES = {}          # a boss's own parts shown in some moods: bone -> set of moods
SHOW_OVERRIDE = {}       # a boss that reads its moods differently (the robot's visor): mood -> set of bones


def reset():
    MOOD_BONES.clear(); SHOW_OVERRIDE.clear()


def mood_bone(name, head, moods, parent='Body'):
    kit.bone(name, head, parent, toggle=True); MOOD_BONES[name] = set(moods)


SHOW = {
    'grumpy': {'EyeL', 'EyeR', 'BrowGrumpy', 'MouthGrumpy', 'GrumpyOnly'},
    'attack': {'EyeL', 'EyeR', 'BrowAttack', 'MouthAttack', 'GrumpyOnly'},
    'hurt': {'ShutHurt', 'BrowHurt', 'MouthHurt', 'Sweat', 'GrumpyOnly'},
    'happy': {'ShutHappy', 'BrowHappy', 'MouthHappy', 'HappyOnly'},
}


class Surface:
    """where the face sits: a sphere (centre, radius) seen from the front, or a flat plane at y"""
    def __init__(self, center=None, r=None, plane_y=None, tilt=0):
        self.c = Vector(center) if center else None; self.r = r; self.y = plane_y; self.tilt = tilt

    def at(self, x, z):
        """face coords (x right, z up, from the sphere centre / plane origin) -> (point, normal)"""
        if self.c is not None:
            dx, dz = x, z; q = max(1e-4, self.r ** 2 - dx * dx - dz * dz)
            p = self.c + Vector((dx, -math.sqrt(q), dz)); return p, (p - self.c).normalized()
        n = Vector((0, -1, 0)); n.rotate(Euler((math.radians(self.tilt), 0, 0)))
        return Vector((x, self.y, z)), n


def orient(o, p, n, out=0.0):
    """an object built at the origin facing -Y (front), turned to face n and moved onto p"""
    q = Vector((0, -1, 0)).rotation_difference(n)
    o.data.transform(Matrix.Translation(p + n * out) @ q.to_matrix().to_4x4()); o.data.update(); return o


def face(surf, esurf=None, ex=0.26, ez=0.08, er=0.15, eh=1.2, mz=-0.24, mw=0.2, cheeks='#f29bb0', parent='Body',
         white='#ffffff', pupil=INK, brow_gap=0.1, brows=True, cheek_dx=None, sweat=True, wide_mouth=1.0, eye_out=0.0, ink=INK):
    """the shared face on `surf`: eyes at (±ex, ez) of radius er (eh: taller than wide), the mouth at (0, mz) mw wide;
    `esurf`: where the eyes, brows and closed eyes sit when that is not the mouth's surface (eyes on stalks, on bumps)"""
    mouth_surf = surf; surf = esurf or surf
    for side, sx in (('L', -1), ('R', 1)):
        x = sx * ex; p, n = surf.at(x, ez)
        kit.bone(f'Eye{side}', p, parent, toggle=True)
        eye = kit.sphere(er, scale=(1, 0.5, eh), name=f'eye{side}'); kit.paint(eye, white)
        pu = kit.sphere(er * 0.6, loc=(sx * -er * 0.12, -er * 0.3, -er * 0.08), scale=(1, 0.5, eh * 0.95), name='pupil'); kit.paint(pu, pupil)
        hi = kit.sphere(er * 0.2, loc=(sx * -er * 0.12 - er * 0.18, -er * 0.55, er * 0.3), scale=(1, 0.6, 1), name='hi'); kit.paint(hi, '#ffffff')
        kit.part(orient(kit.join([eye, pu, hi], f'eye{side}'), p, n, eye_out), f'Eye{side}', ol=0.016)

    # brows: four moods, each a pair of strokes above the eyes
    def brow_pair(name, inner, outer, curve=0.0, lift=0.0, w=0.034):
        objs = []
        for sx in (-1, 1):
            xi, xo = sx * (ex - er * 0.9), sx * (ex + er * 1.0)
            zi, zo = ez + er * eh + brow_gap + inner + lift, ez + er * eh + brow_gap + outer + lift
            pts = []
            for i in range(9):
                t = i / 8; x = xi + (xo - xi) * t; z = zi + (zo - zi) * t + curve * math.sin(math.pi * t)
                p, n = surf.at(x, z); pts.append(p + n * 0.015)
            objs.append(kit.tube(pts, w, name='brow'))
        return kit.ink(kit.join(objs, name), name, ink)
    if brows:
        top = surf.at(0, ez + er * eh + brow_gap)[0]
        for nm in ('BrowGrumpy', 'BrowAttack', 'BrowHurt', 'BrowHappy'): kit.bone(nm, top, parent, toggle=True)
        brow_pair('BrowGrumpy', -0.05, 0.05)
        brow_pair('BrowAttack', -0.09, 0.07, lift=-0.02, w=0.04)
        brow_pair('BrowHurt', 0.06, -0.04)
        brow_pair('BrowHappy', 0.03, 0.0, curve=0.04, lift=0.03, w=0.028)

    # closed eyes: ^^ (happy) and >< (hurt)
    mid = surf.at(0, ez)[0]
    kit.bone('ShutHappy', mid, parent, toggle=True); kit.bone('ShutHurt', mid, parent, toggle=True)
    hap, hur = [], []
    for sx in (-1, 1):
        cx = sx * ex
        pts = []
        for i in range(13):
            a = math.radians(15 + 150 * i / 12); x = cx + math.cos(a) * er * 0.95; z = ez - er * 0.25 + math.sin(a) * er * 0.75
            p, n = surf.at(x, z); pts.append(p + n * 0.02)
        hap.append(kit.tube(pts, 0.032, name='shut'))
        tipx = cx + sx * -er * 0.55; backx = cx + sx * er * 0.7
        for dz in (er * 0.6, -er * 0.6):
            a = surf.at(backx, ez + dz); b = surf.at(tipx, ez)
            hur.append(kit.capsule(a[0] + a[1] * 0.02, b[0] + b[1] * 0.02, 0.03, name='chev'))
    kit.ink(kit.join(hap, 'shutHappy'), 'ShutHappy', ink); kit.ink(kit.join(hur, 'shutHurt'), 'ShutHurt', ink)

    # mouths
    surf = mouth_surf
    mp, mn = surf.at(0, mz)
    for nm in ('MouthGrumpy', 'MouthAttack', 'MouthHurt', 'MouthHappy'): kit.bone(nm, mp, parent, toggle=True)
    w = mw * wide_mouth
    pts = []
    for i in range(13):                       # a frown: the top of an ellipse
        a = math.radians(25 + 130 * i / 12); x = math.cos(a) * w * 0.55; z = mz - w * 0.2 + math.sin(a) * w * 0.32
        p, n = surf.at(x, z); pts.append(p + n * 0.02)
    kit.ink(kit.tube(pts, 0.03, name='frown'), 'MouthGrumpy', ink)
    pts = []
    for i in range(17):                       # a wobbly line (hurt)
        t = i / 16; x = (t - 0.5) * w * 1.1; z = mz + math.sin(t * math.pi * 3) * w * 0.09
        p, n = surf.at(x, z); pts.append(p + n * 0.02)
    kit.ink(kit.tube(pts, 0.027, name='wobble'), 'MouthHurt', ink)

    def open_mouth(name, poly, inner='#8c2f3c', extra=()):
        sh = kit.extrude_shape(poly, depth=0.05, bevel=0.012, name=name); kit.paint(sh, inner)
        objs = [sh] + [kit.paint(e[0], e[1]) for e in extra]
        o = kit.join(objs, name)
        kit.part(orient(o, mp, mn, 0.01), name, ol=0.014)
    # attack: a wide toothy grin, flat on top, two little fangs
    ww = w * 0.62
    grin = [(-ww, 0.02), *[(math.cos(math.radians(a)) * ww, math.sin(math.radians(a)) * w * 0.42 + 0.02) for a in range(180, 361, 15)][1:-1], (ww, 0.02)]
    fang = lambda x: kit.extrude_shape([(x - 0.035, 0.0), (x + 0.035, 0.0), (x, -0.06)], depth=0.02, bevel=0, loc=(0, -0.03, 0.015), name='fang')
    open_mouth('MouthAttack', grin, extra=[(fang(-ww * 0.5), '#ffffff'), (fang(ww * 0.5), '#ffffff')])
    # happy: an open smile with a pink tongue
    hw = w * 0.5
    smile = [(math.cos(math.radians(a)) * hw, -math.sin(math.radians(a)) * w * 0.38 + 0.015) for a in range(0, 181, 15)]
    smile = list(reversed(smile))
    tongue = kit.sphere(hw * 0.55, loc=(0, -0.03, -w * 0.25), scale=(1, 0.3, 0.55), name='tongue')
    open_mouth('MouthHappy', smile, extra=[(tongue, '#f27f95')])

    # cheeks (always) and a sweat drop (hurt)
    if cheeks:
        cdx = cheek_dx if cheek_dx is not None else ex + er * 0.9
        for sx in (-1, 1):
            p, n = surf.at(sx * cdx, ez - er * 1.35)
            c = kit.sphere(er * 0.62, scale=(1, 0.25, 0.55), name='cheek'); kit.paint(c, cheeks)
            kit.part(orient(c, p, n, 0.0), parent, outline=False)
    if sweat:
        p, n = surf.at(ex + er * 1.5, ez + er * eh + 0.06)
        kit.bone('Sweat', p, parent, toggle=True)
        d = kit.sphere(0.06, scale=(0.8, 0.5, 1.0), name='drop'); dt = kit.cone(0.045, 0, 0.07, loc=(0, 0, 0.03), scale=(0.8, 0.45, 1), name='droptip')
        kit.part(orient(kit.join([kit.paint(d, '#8fd3f4'), kit.paint(dt, '#8fd3f4')], 'sweat'), p, n, 0.03), 'Sweat', ol=0.012)


def ensure_toggles(where=(0, 0, 1)):
    """bones every boss must have even when it has no part on them (HappyOnly, GrumpyOnly, Sweat ...)"""
    for nm in FACE_TOGGLES:
        if nm not in kit.BONES: kit.bone(nm, where, 'Body', toggle=True)


def mood_keys(mood, blink=False):
    on = SHOW_OVERRIDE.get(mood, SHOW[mood]); out = {}
    for nm in FACE_TOGGLES + list(MOOD_BONES):
        if nm not in kit.BONES: continue
        s = 1.0 if (nm in on or mood in MOOD_BONES.get(nm, ())) else 0.0
        if blink and nm in ('EyeL', 'EyeR') and s: out[nm] = {'scale': (1, 0.12, 1)}
        else: out[nm] = {'scale': (s, s, s)}
    return out


def wave(f, period, amp, phase=0.0):
    return amp * math.sin(2 * math.pi * (f / period + phase))


def clips(arm, extra=lambda clip, f, mood: {}, hop=0.12, lunge=0.35, feet=True):
    """idle 48f loop, walk 24f loop, attack 24f, hurt 16f, happy 32f loop"""
    def make(name, length, mood_at, body_at, step=2, blinks=()):
        c = kit.Clip(arm, name, length)
        for f in range(0, length + 1, step):
            m = mood_at(f)
            for b, v in body_at(f).items(): c.at(f, b, **v)
            for b, v in extra(name, f, m).items():
                if b in kit.BONES: c.at(f, b, **v)
        def base(f):
            m = mood_at(f); return mood_keys(m, blink=any(a <= f < b for a, b in blinks))
        for a, b in blinks:          # the blink's own two keys (eyes shut, then open again)
            c.poses.setdefault(a, {}); c.poses.setdefault(b, {})
        c.done(base)

    def foot(f, period, amt):
        if not feet: return {}
        out = {}
        for nm, ph in (('FootL', 0.0), ('FootR', 0.5)):
            if nm in kit.BONES:
                u = max(0.0, math.sin(2 * math.pi * (f / period + ph)))
                out[nm] = {'loc': (0, amt * u, -amt * 0.4 * u)}
        return out

    # idle: breathing, a blink
    make('idle', 48, lambda f: 'grumpy',
         lambda f: {'Body': {'scale': (1 + wave(f, 48, 0.02), 1 - wave(f, 48, 0.025), 1 + wave(f, 48, 0.02)), 'loc': (0, wave(f, 48, 0.01, 0.25) + 0.01, 0)}},
         blinks=((36, 39),))
    # walk: a heavy hop on the spot
    def walk_body(f):
        u = abs(math.sin(math.pi * f / 12)); land = 1 - u
        out = {'Body': {'loc': (0, hop * u, 0), 'scale': (1 + 0.06 * land - 0.02 * u, 1 - 0.07 * land + 0.04 * u, 1 + 0.06 * land - 0.02 * u),
                        'rot': (0, 0, 4 * math.sin(2 * math.pi * f / 24))}}
        out.update(foot(f, 24, 0.12)); return out
    make('walk', 24, lambda f: 'grumpy', walk_body)

    # attack: wind up, lunge at the viewer, back
    K = {0: dict(loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)),
         6: dict(loc=(0, -0.02, -0.12), rot=(-12, 0, 0), scale=(1.08, 0.9, 1.08)),
         8: dict(loc=(0, 0.0, -0.14), rot=(-14, 0, 0), scale=(1.1, 0.88, 1.1)),
         11: dict(loc=(0, 0.1, lunge), rot=(14, 0, 0), scale=(0.93, 1.1, 0.93)),
         14: dict(loc=(0, 0.06, lunge * 0.9), rot=(10, 0, 0), scale=(1.04, 0.97, 1.04)),
         19: dict(loc=(0, 0.0, 0.08), rot=(2, 0, 0), scale=(1.02, 0.98, 1.02)),
         24: dict(loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1))}
    def keyed(table, f):
        ks = sorted(table)
        for a, b in zip(ks, ks[1:]):
            if a <= f <= b:
                t = (f - a) / (b - a); t = t * t * (3 - 2 * t)
                return {k: tuple(table[a][k][i] + (table[b][k][i] - table[a][k][i]) * t for i in range(3)) for k in table[a]}
        return table[ks[-1]]
    make('attack', 24, lambda f: 'attack' if 4 <= f <= 21 else 'grumpy', lambda f: {'Body': keyed(K, f)}, step=1)

    # hurt: knocked back, a shake
    H = {0: dict(loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)),
         3: dict(loc=(0, 0.04, -0.22), rot=(-12, 0, 5), scale=(1.1, 0.88, 1.1)),
         5: dict(loc=(0, 0.02, -0.2), rot=(-10, 0, -6), scale=(0.96, 1.05, 0.96)),
         7: dict(loc=(0, 0.0, -0.16), rot=(-8, 0, 5), scale=(1.04, 0.96, 1.04)),
         9: dict(loc=(0, 0.0, -0.12), rot=(-6, 0, -4), scale=(1.0, 1.0, 1.0)),
         12: dict(loc=(0, 0, -0.05), rot=(-2, 0, 2), scale=(1.01, 0.99, 1.01)),
         16: dict(loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1))}
    make('hurt', 16, lambda f: 'hurt' if 2 <= f <= 14 else 'grumpy', lambda f: {'Body': keyed(H, f)}, step=1)

    # happy: two little hops and a sway
    def happy_body(f):
        u = abs(math.sin(math.pi * f / 16)); land = 1 - u
        out = {'Body': {'loc': (0, hop * 1.2 * u, 0), 'scale': (1 + 0.05 * land - 0.02 * u, 1 - 0.06 * land + 0.05 * u, 1 + 0.05 * land - 0.02 * u),
                        'rot': (0, 0, 6 * math.sin(2 * math.pi * f / 32))}}
        out.update(foot(f, 16, 0.08)); return out
    make('happy', 32, lambda f: 'happy', happy_body)
