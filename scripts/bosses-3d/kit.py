"""Modelling kit for the boss models (headless Blender, `bpy`).

Each boss is built from simple rounded shapes, each one bound rigidly to one bone, with a dark
"inverted hull" outline baked into the geometry so the toon renders read like the painted art.
Faces change by scaling expression parts to zero: every boss has the same expression bones, so
one set of clips (idle, walk, attack, hurt, happy) can be written once for all of them.

Blender's front is -Y and up is +Z; the glTF export turns that into three.js's front +Z, up +Y,
which is the "south" facing SpriteCast renders.
"""
import math
import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

INK = '#2b2140'          # the painted art's outline colour
OUTLINE = 0.022          # outline thickness, in model units (the bosses are ~2.2 units tall)
FPS = 24
TS = 10                  # keys at 10x the frame rate: the glTF export samples linearly, so a face switch blends over 1/240 s, not 1/24

PARTS = []               # (object, bone)
BONES = {}               # name -> (head, parent, tail_offset)
TOGGLES = set()          # bones that only switch on and off (scaled to 0 or 1, never in between)


# --- scene -----------------------------------------------------------------------------------
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    PARTS.clear(); BONES.clear(); TOGGLES.clear()
    bpy.context.scene.render.fps = FPS * TS


def lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def mat(hex_):
    """one flat material a colour (the glTF base colour is linear)"""
    name = 'm' + hex_.lstrip('#').lower()
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    h = hex_.lstrip('#'); rgb = [lin(int(h[i:i + 2], 16)) for i in (0, 2, 4)]
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Roughness'].default_value = 0.8
    m.diffuse_color = (*rgb, 1)
    return m


def _obj(me, name):
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o); return o


def _bm_obj(bm, name):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); return _obj(me, name)


def place(o, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    """bake a transform into the mesh (rotation in degrees, XYZ)"""
    m = Matrix.Translation(Vector(loc)) @ Euler([math.radians(a) for a in rot], 'XYZ').to_matrix().to_4x4() @ Matrix.Diagonal((*scale, 1))
    o.data.transform(m); o.data.update(); return o


def smooth(o, on=True):
    for p in o.data.polygons: p.use_smooth = on
    return o


# --- primitives (all closed meshes, so the outline shell has no holes) -------------------------
def sphere(r=1, loc=(0, 0, 0), scale=(1, 1, 1), rot=(0, 0, 0), seg=40, rings=20, name='sphere'):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    return smooth(place(_bm_obj(bm, name), loc, rot, scale))


def ico(r=1, loc=(0, 0, 0), scale=(1, 1, 1), rot=(0, 0, 0), sub=3, name='ico'):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    return smooth(place(_bm_obj(bm, name), loc, rot, scale))


def cone(r1=0.2, r2=0.0, depth=0.5, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), seg=16, name='cone', smooth_=True):
    """along +Z from its base at loc (not its middle)"""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=True, segments=seg, radius1=r1, radius2=max(r2, 1e-4), depth=depth)
    bmesh.ops.translate(bm, vec=(0, 0, depth / 2), verts=bm.verts)
    if r2 <= 0:                                   # one point at the tip, not a tiny ring
        tip = [v for v in bm.verts if v.co.z > depth - 1e-3]
        bmesh.ops.pointmerge(bm, verts=tip, merge_co=Vector((0, 0, depth)))
    o = place(_bm_obj(bm, name), loc, rot, scale)
    return smooth(o, smooth_)


def cyl(r=0.2, depth=0.5, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), seg=24, name='cyl', smooth_=True):
    return cone(r, r, depth, loc, rot, scale, seg, name, smooth_)


def box(size=(1, 1, 1), loc=(0, 0, 0), rot=(0, 0, 0), bevel=0.08, name='box'):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    if bevel:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=4, affect='EDGES', profile=0.5)
    o = place(_bm_obj(bm, name), loc, rot)
    return smooth(o)


def capsule(a, b, r=0.05, seg=16, name='capsule'):
    """a rounded stick from a to b"""
    a, b = Vector(a), Vector(b); d = b - a; L = d.length
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(8, seg // 2), radius=r)
    for v in bm.verts:                          # stretch the sphere's top half up by L: a pill along +Z
        if v.co.z > 0: v.co.z += L
    o = _bm_obj(bm, name)
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    o.data.transform(Matrix.Translation(a) @ q.to_matrix().to_4x4()); o.data.update()
    return smooth(o)


def tube(points, r=0.04, seg=12, name='tube', caps=True, taper=None):
    """a round tube through points (a poly line), with round ends; taper(t) scales the radius along it"""
    pts = [Vector(p) for p in points]
    bm = bmesh.new(); rings = []
    for i, p in enumerate(pts):
        t = i / (len(pts) - 1)
        d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        q = Vector((0, 0, 1)).rotation_difference(d)
        rr = r * (taper(t) if taper else 1)
        ring = [bm.verts.new(p + q @ Vector((math.cos(2 * math.pi * k / seg) * rr, math.sin(2 * math.pi * k / seg) * rr, 0))) for k in range(seg)]
        rings.append((ring, p, d, rr))
    for (ra, _, _, _), (rb, _, _, _) in zip(rings, rings[1:]):
        for k in range(seg):
            bm.faces.new((ra[k], ra[(k + 1) % seg], rb[(k + 1) % seg], rb[k]))
    for end, sgn in ((rings[0], -1), (rings[-1], 1)):   # a dome on each end
        ring, p, d, rr = end
        tip = bm.verts.new(p + d * sgn * rr * (1 if caps else 0.01))
        for k in range(seg):
            f = (ring[k], ring[(k + 1) % seg], tip) if sgn > 0 else (ring[(k + 1) % seg], ring[k], tip)
            bm.faces.new(f)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return smooth(_bm_obj(bm, name))


def arc(center, rx, ry, a0, a1, r=0.03, n=18, plane='XZ', name='arc', taper=None):
    """a stroke along an ellipse arc (degrees, 0 = +X, 90 = up) in the XZ plane (a face's plane), centred at center"""
    c = Vector(center); pts = []
    for i in range(n + 1):
        a = math.radians(a0 + (a1 - a0) * i / n)
        pts.append(c + Vector((math.cos(a) * rx, 0, math.sin(a) * ry)))
    return tube(pts, r, name=name, taper=taper)


def extrude_shape(poly, depth=0.08, loc=(0, 0, 0), rot=(0, 0, 0), bevel=0.02, name='shape'):
    """a flat 2D outline (x, z points, counter-clockwise seen from the front) given thickness along Y"""
    bm = bmesh.new()
    vs = [bm.verts.new((x, 0, z)) for x, z in poly]
    f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    nv = [g for g in r['geom'] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, depth, 0), verts=nv)
    bmesh.ops.translate(bm, vec=(0, -depth / 2, 0), verts=bm.verts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bevel:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=2, affect='EDGES', profile=0.5, clamp_overlap=True)
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    o = place(_bm_obj(bm, name), loc, rot)
    return smooth(o, False)


def join(objs, name='part'):
    """several shapes into one object (each keeps its material)"""
    bm = bmesh.new()
    mats = []
    for o in objs:
        me = o.data
        for m in me.materials:
            if m not in mats: mats.append(m)
        tmp = bmesh.new(); tmp.from_mesh(me)
        remap = [mats.index(m) for m in me.materials] if me.materials else [0]
        for f in tmp.faces: f.material_index = remap[f.material_index] if f.material_index < len(remap) else 0
        me2 = bpy.data.meshes.new('t'); tmp.to_mesh(me2); tmp.free()
        bm.from_mesh(me2); bpy.data.meshes.remove(me2)
        bpy.data.objects.remove(o)
    out = _bm_obj(bm, name)
    for m in mats: out.data.materials.append(m)
    return out


def paint(o, hex_):
    o.data.materials.clear(); o.data.materials.append(mat(hex_)); return o


def on_sphere(center, r, az, el, out=0.0):
    """a point on a sphere's surface: az degrees round from the front (+ to the character's left = screen right... no:
    + toward +X, which is screen right from the front), el degrees up from the equator"""
    a, e = math.radians(az), math.radians(el)
    d = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    return Vector(center) + d * (r + out), d


def facing(d):
    """rotation (degrees XYZ) that turns +Z to direction d"""
    q = Vector((0, 0, 1)).rotation_difference(Vector(d).normalized())
    return [math.degrees(a) for a in q.to_euler('XYZ')]


# --- binding -------------------------------------------------------------------------------------
def bone(name, head, parent='Body', tail=(0, 0, 0.15), toggle=False):
    BONES[name] = (Vector(head), parent, Vector(tail))
    if toggle: TOGGLES.add(name)


def part(o, bone_name, hex_=None, outline=True, ol=None):
    """an object bound to one bone, with its outline shell (unless it is dark ink itself)"""
    if hex_: paint(o, hex_)
    if outline:
        t = ol if ol is not None else OUTLINE
        bm = bmesh.new(); bm.from_mesh(o.data); bm.normal_update()
        n0 = len(bm.verts)
        shell = bmesh.new(); shell.from_mesh(o.data); shell.normal_update()
        for v in shell.verts: v.co += v.normal * t
        bmesh.ops.reverse_faces(shell, faces=shell.faces)
        for f in shell.faces: f.material_index = 0; f.smooth = True
        me2 = bpy.data.meshes.new('s'); shell.to_mesh(me2); shell.free()
        ink = mat(INK)
        if ink.name not in [m.name for m in o.data.materials]: o.data.materials.append(ink)
        idx = [m.name for m in o.data.materials].index(ink.name)
        tmp = bmesh.new(); tmp.from_mesh(me2); bpy.data.meshes.remove(me2)
        for f in tmp.faces: f.material_index = idx
        me3 = bpy.data.meshes.new('s3'); tmp.to_mesh(me3); tmp.free()
        bm.from_mesh(me3); bpy.data.meshes.remove(me3)
        bm.to_mesh(o.data); bm.free()
    PARTS.append((o, bone_name))
    return o


def ink(o, bone_name, hex_=INK):
    """a dark stroke (brows, closed eyes, mouths): no outline"""
    return part(o, bone_name, hex_, outline=False)


def rig():
    """the armature from BONES, every part bound to its bone"""
    arm_data = bpy.data.armatures.new('Rig'); arm = _obj(arm_data, 'Rig')
    bpy.context.view_layer.objects.active = arm; arm.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    order = []
    def add(n):
        if n in order or n not in BONES: return
        p = BONES[n][1]
        if p and p in BONES: add(p)
        order.append(n)
    for n in BONES: add(n)
    for n in order:
        head, parent, tail = BONES[n]
        eb = arm_data.edit_bones.new(n); eb.head = head; eb.tail = head + (tail if tail.length > 1e-4 else Vector((0, 0, 0.15)))
        eb.roll = 0
        if parent and parent in arm_data.edit_bones: eb.parent = arm_data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    for o, b in PARTS:
        vg = o.vertex_groups.new(name=b); vg.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
        o.parent = arm; md = o.modifiers.new('Armature', 'ARMATURE'); md.object = arm
    for pb in arm.pose.bones: pb.rotation_mode = 'XYZ'
    return arm


# --- animation -----------------------------------------------------------------------------------
class Clip:
    """keys on pose bones; every bone gets a key at every keyed frame so clips never leak into each other"""
    def __init__(self, arm, name, length):
        self.arm, self.name, self.length = arm, name, length
        self.act = bpy.data.actions.new(name); self.act.use_fake_user = True
        arm.animation_data_create(); arm.animation_data.action = self.act
        self.poses = {}          # frame -> {bone: (loc, rot, scale)}

    def at(self, f, bone_name, loc=None, rot=None, scale=None):
        self.poses.setdefault(f, {}).setdefault(bone_name, {}).update({k: v for k, v in (('loc', loc), ('rot', rot), ('scale', scale)) if v is not None})
        return self

    def done(self, base):
        """base(frame) -> {bone: {...}} the default pose at a frame (the face for that moment); keyed values override it"""
        arm = self.arm; frames = sorted(set(self.poses) | {0, self.length})
        last = {}
        for f in frames:
            pose = {}
            for n in BONES: pose[n] = {'loc': (0, 0, 0), 'rot': (0, 0, 0), 'scale': (1, 1, 1)}
            for n, v in base(f).items(): pose[n].update(v)
            for n, v in self.poses.get(f, {}).items(): pose[n].update(v)
            for n, v in pose.items():
                pb = arm.pose.bones[n]
                pb.location = v['loc']; pb.rotation_euler = [math.radians(a) for a in v['rot']]
                s = v['scale']; pb.scale = (s, s, s) if isinstance(s, (int, float)) else s
                for path in ('location', 'rotation_euler', 'scale'): pb.keyframe_insert(path, frame=f * TS, group=n)
        for fc in fcurves(self.act):
            on = any(f'"{n}"' in fc.data_path for n in TOGGLES) and fc.data_path.endswith('scale')
            for k in fc.keyframe_points:
                k.interpolation = 'CONSTANT' if on else 'BEZIER'
                if not on: k.handle_left_type = k.handle_right_type = 'AUTO_CLAMPED'
            fc.update()
        ad = arm.animation_data
        tr = ad.nla_tracks.new(); tr.name = self.name
        st = tr.strips.new(self.name, 0, self.act); st.name = self.name
        ad.action = None
        for pb in arm.pose.bones: pb.location = (0, 0, 0); pb.rotation_euler = (0, 0, 0); pb.scale = (1, 1, 1)


def fcurves(act):
    try:
        return list(act.fcurves)
    except Exception:
        out = []
        for layer in act.layers:
            for strip in layer.strips:
                for cb in strip.channelbags: out += list(cb.fcurves)
        return out


def export(path):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animation_mode='NLA_TRACKS', export_force_sampling=False,
                              export_optimize_animation_size=False, export_apply=True, export_yup=True, export_skins=True,
                              export_def_bones=False, export_materials='EXPORT', export_extras=False)
