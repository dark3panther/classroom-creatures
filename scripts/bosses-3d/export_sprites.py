"""Pack SpriteCast's boss strips for the app.

From art/bosses-3d/<id>/out/ (written by `charpipe.py finish`) this takes the front-facing
actions (breathe -> idle, attack, hurt, happy) and the side walks (walk-east, walk-west), saves
each strip as WebP in public/bosses3d/<id>/, and writes src/data/bossSprites.json: per boss a
stage (the box every action fits in, feet on one spot) and per action its frames and where its
frame sits on the stage. Every action of a boss is drawn at the same scale.
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / 'art' / 'bosses-3d'
PUB = ROOT / 'public' / 'bosses3d'
MANIFEST = ROOT / 'src' / 'data' / 'bossSprites.json'
QUALITY = 82
# stored size of each strip against the render's (the walks only ever show in a small lane)
STORE = {'walkEast': 0.36, 'walkWest': 0.36}
FRONT = 0.9
# app name -> (SpriteCast action, facing); "walk" lives in the character's own walk strips
TAKE = {'idle': ('breathe', 'south'), 'attack': ('attack', 'south'), 'hurt': ('hurt', 'south'), 'happy': ('happy', 'south'),
        'walkEast': ('walk', 'south-east'), 'walkWest': ('walk', 'south-west')}   # three-quarter views: the face stays in sight


def main():
    out = {}
    for spec in sorted(ART.glob('*.json')):
        bid = spec.stem; meta_p = ART / bid / 'out' / 'character.json'
        if not meta_p.exists(): continue
        meta = json.loads(meta_p.read_text()); (PUB / bid).mkdir(parents=True, exist_ok=True)
        acts = {}
        for name, (src, facing) in TAKE.items():
            if src == 'walk':
                if facing not in meta['walk']: continue
                fw, fh = meta['frame']; ax, ay = meta['anchor']; n = len(range(0, Image.open(ART / bid / 'out' / meta['walk'][facing]).width, fw))
                strip, fps, loop = ART / bid / 'out' / meta['walk'][facing], meta['fps'], True
            else:
                a = (meta.get('actions') or {}).get(src)
                if not a or facing not in a['strips']: continue
                fw, fh = a['frame']; ax, ay = a['anchor']; n = a['frames']
                strip, fps, loop = ART / bid / 'out' / a['strips'][facing], a['fps'], a['loop']
            im = Image.open(strip).convert('RGBA')
            k = STORE.get(name, FRONT); sw, sh = max(1, round(fw * k)), max(1, round(fh * k))
            if k != 1: im = im.resize((sw * n, sh), Image.LANCZOS)
            im.save(PUB / bid / f'{name}.webp', 'WEBP', quality=QUALITY, method=6, alpha_quality=88)
            # w, h, ax, ay: in render units (every action of a boss shares them); s: stored pixels per unit
            acts[name] = {'file': f'bosses3d/{bid}/{name}.webp', 'frames': n, 'fps': fps, 'loop': loop, 'w': fw, 'h': fh,
                          'ax': round(ax * fw, 1), 'ay': round(ay * fh, 1), 's': round(sw / fw, 5), 'sw': sw, 'sh': sh}
        if 'idle' not in acts: continue
        front = [a for k, a in acts.items() if not k.startswith('walk')]
        L = max(a['ax'] for a in front); R = max(a['w'] - a['ax'] for a in front)
        T = max(a['ay'] for a in front); B = max(a['h'] - a['ay'] for a in front)
        for a in acts.values():          # where each frame's top-left sits on the stage (feet on the stage's anchor)
            a['x'] = round(L - a['ax'], 1); a['y'] = round(T - a['ay'], 1)
        idle = acts['idle']
        out[bid] = {'stage': [round(L + R), round(T + B)], 'anchor': [round(L, 1), round(T, 1)], 'body': [idle['w'], idle['h']], 'actions': acts}
        size = sum((PUB / bid / f'{k}.webp').stat().st_size for k in acts) / 1024
        print(f'{bid}: {len(acts)} strips, stage {out[bid]["stage"]}, {size:.0f} KB')
    MANIFEST.write_text(json.dumps(out, indent=1) + '\n')
    print(f'manifest: {MANIFEST} ({len(out)} bosses)')


if __name__ == '__main__':
    main()
