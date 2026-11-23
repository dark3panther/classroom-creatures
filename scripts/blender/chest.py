"""The treasure chest that bursts open (headless Blender, Cycles):

    blender -b -P scripts/blender/chest.py -- [coins accessory cosmetic special] [--samples 24]

For each kind it builds a chunky cartoon chest (bevelled planks, metal bands, a lock), animates the
lid flying open with a glow, light rays and sparkles, and renders 24 frames with a transparent
background into art/chests/<kind>/####.png. scripts/blender/pack_chests.py packs them into
public/chests/<kind>.webp strips for the chest-opening moment in the app.

Look: soft painted shading (strong sky fill, one warm key) and the same dark outline the bosses
have - an inverted hull, shown only where its far side peeks out round the silhouette.
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SAMPLES = 24
if '--samples' in ARGS:
    i = ARGS.index('--samples'); SAMPLES = int(ARGS[i + 1]); ARGS = ARGS[:i] + ARGS[i + 2:]
KINDS = {
    'coins': {'body': '#b5763a', 'plank': '#9a5f2c', 'band': '#ffd23f', 'glow': '#ffd76a', 'inside': 'coins'},
    'accessory': {'body': '#3f78c8', 'plank': '#2f62a8', 'band': '#e3eaf4', 'glow': '#9fe0ff', 'inside': 'gems'},
    'cosmetic': {'body': '#ff8fb1', 'plank': '#e9759a', 'band': '#ffd23f', 'glow': '#ffd0e2', 'inside': 'hearts'},
    'special': {'body': '#7d55d8', 'plank': '#6643bd', 'band': '#ffd23f', 'glow': '#fff1a8', 'inside': 'stars'},
}
INK = '#2b2140'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'art', 'chests')
FRAMES = 24


def lin(h):
    h = h.lstrip('#'); out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1)


def mat(name, hex_, rough=0.55, emit=0.0, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = lin(hex_); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = lin(hex_); b.inputs['Emission Strength'].default_value = emit
    return m


def ray_mat(hex_):
    """a soft beam: glowing at the chest, fading to nothing at its tip (the cone runs 0..1.4 up its own Z)"""
    m = bpy.data.materials.new('ray'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); mix = nt.nodes.new('ShaderNodeMixShader')
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); mr = nt.nodes.new('ShaderNodeMapRange')
    em = nt.nodes.new('ShaderNodeEmission'); tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    em.inputs['Color'].default_value = lin(hex_); em.inputs['Strength'].default_value = 2.2
    mr.inputs['From Min'].default_value = 0.0; mr.inputs['From Max'].default_value = 1.4; mr.inputs['To Min'].default_value = 0.35; mr.inputs['To Max'].default_value = 1.0
    nt.links.new(tc.outputs['Object'], sep.inputs['Vector']); nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
    nt.links.new(mr.outputs['Result'], mix.inputs['Fac'])
    nt.links.new(em.outputs['Emission'], mix.inputs[1]); nt.links.new(tr.outputs['BSDF'], mix.inputs[2])
    nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])
    m.blend_method = 'BLEND'
    return m


def outline_mat():
    """black only where the shell's far side shows (Backfacing = 0 after the faces were turned inside out), clear elsewhere"""
    m = bpy.data.materials.new('ink'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); mix = nt.nodes.new('ShaderNodeMixShader')
    geo = nt.nodes.new('ShaderNodeNewGeometry'); em = nt.nodes.new('ShaderNodeEmission'); tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    em.inputs['Color'].default_value = lin(INK); em.inputs['Strength'].default_value = 1.0
    nt.links.new(geo.outputs['Backfacing'], mix.inputs['Fac'])
    nt.links.new(em.outputs['Emission'], mix.inputs[1]); nt.links.new(tr.outputs['BSDF'], mix.inputs[2])
    nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])
    return m


def obj_from_bm(bm, name, material, parent=None, outline=0.03):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    me.materials.append(material)
    if outline:
        sh = bmesh.new(); sh.from_mesh(me); sh.normal_update()
        for v in sh.verts: v.co += v.normal * outline
        bmesh.ops.reverse_faces(sh, faces=sh.faces)
        me2 = bpy.data.meshes.new(name + '_ink'); sh.to_mesh(me2); sh.free()
        for p in me2.polygons: p.use_smooth = True
        o2 = bpy.data.objects.new(name + '_ink', me2); bpy.context.scene.collection.objects.link(o2)
        me2.materials.append(INK_MAT); o2.parent = o
        o2.visible_shadow = False
    if parent: o.parent = parent
    return o


def rbox(size, loc, material, parent=None, bevel=0.08, outline=0.03, name='box'):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=5, affect='EDGES', profile=0.5)
    bmesh.ops.translate(bm, vec=loc, verts=bm.verts)
    return obj_from_bm(bm, name, material, parent, outline)


def half_cyl(r, length, loc, material, parent=None, outline=0.03, name='lid', seg=28):
    """a rounded lid: half a cylinder along X, flat side down, closed at both ends"""
    bm = bmesh.new(); prof = [(math.cos(math.pi * i / seg) * r, math.sin(math.pi * i / seg) * r) for i in range(seg + 1)]
    left = [bm.verts.new((-length / 2, y, z)) for y, z in prof]; right = [bm.verts.new((length / 2, y, z)) for y, z in prof]
    for i in range(seg): bm.faces.new((left[i], left[i + 1], right[i + 1], right[i]))
    bm.faces.new(list(reversed(left))); bm.faces.new(right); bm.faces.new((left[0], right[0], right[-1], left[-1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.bevel(bm, geom=[e for e in bm.edges if len(e.link_faces) == 2 and abs(e.calc_face_angle(0)) > 0.5], offset=0.04, segments=3, affect='EDGES', profile=0.5)
    bmesh.ops.translate(bm, vec=loc, verts=bm.verts)
    return obj_from_bm(bm, name, material, parent, outline)


def sphere(r, loc, material, parent=None, scale=(1, 1, 1), outline=0.0, name='s'):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=12, radius=r)
    bmesh.ops.scale(bm, vec=scale, verts=bm.verts); bmesh.ops.translate(bm, vec=loc, verts=bm.verts)
    return obj_from_bm(bm, name, material, parent, outline)


def star_mesh(r, name, material, parent=None):
    bm = bmesh.new(); pts = []
    for k in range(10):
        a = math.pi / 2 + k * math.pi / 5; rr = r if k % 2 == 0 else r * 0.45
        pts.append(bm.verts.new((math.cos(a) * rr, 0, math.sin(a) * rr)))
    f = bm.faces.new(pts); ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, vec=(0, r * 0.3, 0), verts=[g for g in ext['geom'] if isinstance(g, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(bm, name, material, parent, outline=0.014)


def key(o, frame, **kw):
    for k, v in kw.items():
        setattr(o, k, v); o.keyframe_insert(k, frame=frame)


def build(kind):
    global INK_MAT
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene; sc.render.fps = 24; sc.frame_start = 1; sc.frame_end = FRAMES
    INK_MAT = outline_mat()
    k = KINDS[kind]
    body_m, plank_m, band_m = mat('body', k['body']), mat('plank', k['plank']), mat('band', k['band'], 0.3, metal=0.3)
    dark_m = mat('dark', '#3a2a40', 0.6)
    glow_m = mat('glow', k['glow'], 0.4, emit=0.0)

    root = bpy.data.objects.new('root', None); sc.collection.objects.link(root)
    body = bpy.data.objects.new('bodyrig', None); sc.collection.objects.link(body); body.parent = root
    W, D, H = 1.6, 1.0, 0.82
    rbox((W, D, H), (0, 0, H / 2), body_m, body, name='chest')
    for z in (0.26, 0.56):        # plank grooves
        rbox((W + 0.01, D + 0.01, 0.035), (0, 0, z), plank_m, body, bevel=0.012, outline=0.0, name='groove')
    for x in (-0.55, 0.55):       # metal bands
        rbox((0.16, D + 0.06, H + 0.04), (x, 0, H / 2), band_m, body, bevel=0.04, outline=0.02, name='band')
    rbox((0.3, 0.12, 0.34), (0, -D / 2 - 0.04, H - 0.12), band_m, body, bevel=0.05, outline=0.02, name='lock')
    rbox((0.08, 0.04, 0.12), (0, -D / 2 - 0.11, H - 0.15), dark_m, body, bevel=0.02, outline=0.0, name='keyhole')
    rbox((W - 0.12, D - 0.12, 0.05), (0, 0, H - 0.03), dark_m, body, bevel=0.02, outline=0.0, name='hollow')   # the dark inside
    # what is inside, under a glow
    inside = bpy.data.objects.new('inside', None); sc.collection.objects.link(inside); inside.parent = body
    if k['inside'] == 'coins':
        cm = mat('coin', '#ffd23f', 0.25, metal=0.6)
        for i, (x, y) in enumerate([(-0.4, 0.1), (-0.15, -0.1), (0.1, 0.12), (0.35, -0.05), (-0.25, 0.25), (0.25, 0.25), (0.0, -0.2), (0.48, 0.2), (-0.5, -0.15)]):
            c = sphere(0.13, (x, y, H + 0.02 + (i % 3) * 0.03), cm, inside, scale=(1, 1, 0.3), name='coin')
            c.rotation_euler = (0.3 * (i % 2), 0.2 * (i % 3), 0)
    else:
        cols = {'gems': ['#7fe0ff', '#4f9ef0', '#c6f4ff', '#5fd4ff', '#9fb6ff'], 'hearts': ['#ff8fb1', '#ffd0e2', '#ff6b9a', '#ffc1d6', '#ff9fd1'],
                'stars': ['#ff8fb1', '#7fe0ff', '#ffd23f', '#b98cff', '#7fe08a']}[k['inside']]
        for i, (x, y) in enumerate([(-0.35, 0.05), (0.0, -0.1), (0.35, 0.1), (-0.12, 0.22), (0.2, 0.25)]):
            sphere(0.14, (x, y, H + 0.04), mat(f'gem{i}', cols[i], 0.15, emit=0.35), inside, scale=(1, 1, 0.7), outline=0.015, name='gem')
    hinge = bpy.data.objects.new('hinge', None); sc.collection.objects.link(hinge); hinge.parent = body
    hinge.location = (0, D / 2, H)
    lid = half_cyl(D / 2, W, (0, -D / 2, 0), body_m, hinge, name='lid')
    for x in (-0.55, 0.55):
        b = half_cyl(D / 2 + 0.035, 0.16, (x, -D / 2, 0), band_m, hinge, outline=0.02, name='lidband')
    rbox((0.3, 0.1, 0.16), (0, -D - 0.03, 0.06), band_m, hinge, bevel=0.04, outline=0.02, name='lidlock')
    if kind == 'special':
        sphere(0.09, (0, -D - 0.1, 0.07), mat('ruby', '#ff4f8b', 0.2, emit=0.3), hinge, outline=0.015, name='gemlock')

    # glow, rays and sparkles (hidden while closed)
    glow = bpy.data.lights.new('glow', 'POINT'); glow.color = lin(k['glow'])[:3]; glow.shadow_soft_size = 0.4
    gl = bpy.data.objects.new('glow', glow); sc.collection.objects.link(gl); gl.parent = body; gl.location = (0, 0, H + 0.25)
    rays = bpy.data.objects.new('rays', None); sc.collection.objects.link(rays); rays.parent = body; rays.location = (0, 0, H)
    ray_m = ray_mat(k['glow'])
    for i, a in enumerate((-50, -25, 0, 25, 50)):
        bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.02, radius2=0.12 + 0.03 * (i % 2), depth=1.4)
        bmesh.ops.translate(bm, vec=(0, 0, 0.7), verts=bm.verts)
        r = obj_from_bm(bm, 'ray', ray_m, rays, outline=0.0); r.visible_shadow = False; r.rotation_euler = (math.radians(-8), math.radians(a), 0)
    spark_m = mat('spark', '#ffd23f', 0.4, emit=1.2)
    sparks = []
    for i in range(9):
        a = math.radians(-70 + i * 17.5)
        s = star_mesh(0.09 + 0.03 * (i % 3), 'spark', spark_m, body); s.location = (0, -0.1, H + 0.1); sparks.append((s, a, i))

    # animation: a squash, the lid flies open (overshoot), the light pours out, sparkles burst and fade
    key(body, 1, scale=(1, 1, 1)); key(body, 3, scale=(1.05, 1.05, 0.9)); key(body, 6, scale=(0.97, 0.97, 1.06)); key(body, 9, scale=(1, 1, 1))
    for f, deg in ((1, 0), (3, 0), (5, -18), (9, -118), (12, -96), (15, -106), (18, -102), (24, -103)):
        key(hinge, f, rotation_euler=(math.radians(deg), 0, 0))
    for f, wv in ((1, 0), (4, 0), (8, 900), (12, 600), (24, 450)):
        glow.energy = wv; glow.keyframe_insert('energy', frame=f)
    for f, s in ((1, 0.0), (5, 0.0), (10, 1.15), (14, 0.95), (24, 1.0)):
        key(rays, f, scale=(s, s, s))
    for f, s in ((1, 0.0), (5, 0.0), (9, 1.0), (24, 1.0)):
        key(inside, f, scale=(s, s, s))
    for s, a, i in sparks:
        d = Vector((math.sin(a), -0.35, math.cos(a))); start = 6 + (i % 3)
        key(s, 1, scale=(0, 0, 0), location=(0, -0.1, H + 0.1)); key(s, start, scale=(0, 0, 0), location=(0, -0.1, H + 0.1))
        key(s, start + 5, scale=(1, 1, 1), location=tuple(Vector((0, -0.1, H + 0.1)) + d * 1.1))
        key(s, min(FRAMES, start + 14), scale=(0, 0, 0), location=tuple(Vector((0, -0.1, H + 0.1)) + d * 1.6 + Vector((0, 0, -0.15))))
        s.keyframe_insert('rotation_euler', frame=1); s.rotation_euler = (0, a * 2, 0); s.keyframe_insert('rotation_euler', frame=FRAMES)
    root.rotation_euler = (0, 0, math.radians(-16))

    # light, camera, film
    world = bpy.data.worlds.new('sky'); sc.world = world; world.use_nodes = True
    bg = world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = lin('#cfe6ff'); bg.inputs['Strength'].default_value = 1.1
    keyl = bpy.data.lights.new('key', 'AREA'); keyl.energy = 380; keyl.size = 3; keyl.color = lin('#fff1dc')[:3]
    ko = bpy.data.objects.new('key', keyl); sc.collection.objects.link(ko); ko.location = (-2.6, -3.0, 4.2); ko.rotation_euler = (math.radians(45), 0, math.radians(-40))
    rim = bpy.data.lights.new('rim', 'AREA'); rim.energy = 160; rim.size = 2
    ro = bpy.data.objects.new('rim', rim); sc.collection.objects.link(ro); ro.location = (2.5, 2.5, 3.0); ro.rotation_euler = (math.radians(-50), 0, math.radians(135))
    cam = bpy.data.cameras.new('cam'); cam.lens = 50
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    co.location = (0, -5.3, 3.05); co.rotation_euler = (math.radians(66), 0, 0); cam.shift_y = 0.06
    r = sc.render; r.engine = 'CYCLES'; r.film_transparent = True; r.resolution_x = r.resolution_y = 440; r.resolution_percentage = 100
    r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGBA'
    sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
    sc.cycles.transparent_max_bounces = 16; sc.cycles.max_bounces = 4
    sc.view_settings.view_transform = 'Standard'
    d = os.path.join(OUT, kind); os.makedirs(d, exist_ok=True)
    r.filepath = os.path.join(d, '')
    test = os.environ.get('CHEST_FRAMES')          # a quick look: only these frames, e.g. CHEST_FRAMES=1,9,20
    if test:
        for f in [int(x) for x in test.split(',')]:
            sc.frame_set(f); r.filepath = os.path.join(d, f'test-{f:04d}.png'); bpy.ops.render.render(write_still=True)
        return
    bpy.ops.render.render(animation=True)
    print(f'chest {kind}: {FRAMES} frames -> {d}')


for kind in (ARGS or list(KINDS)):
    build(kind)
