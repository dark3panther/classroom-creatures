"""Build boss models as rigged, animated GLBs (headless Blender):

    blender -b -P scripts/bosses-3d/build.py -- grumblethorn [more ids ...] [--out art/bosses-3d]

Each boss lands in <out>/<id>/<id>.glb with clips idle, walk, attack, hurt and happy, ready for
SpriteCast (`"rig_glb"` with `"draw": false`).
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kit       # noqa: E402
import common    # noqa: E402
import bosses    # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
out = os.path.join(HERE, '..', '..', 'art', 'bosses-3d')
if '--out' in argv:
    i = argv.index('--out'); out = argv[i + 1]; argv = argv[:i] + argv[i + 2:]
ids = argv or list(bosses.BUILDERS)
for bid in ids:
    kit.reset(); common.reset()
    extra = bosses.BUILDERS[bid]()
    arm = kit.rig()
    common.clips(arm, extra)
    d = os.path.join(out, bid); os.makedirs(d, exist_ok=True)
    kit.export(os.path.join(d, f'{bid}.glb'))
    print(f'built {bid}: {len(kit.PARTS)} parts, {len(kit.BONES)} bones -> {d}/{bid}.glb')
