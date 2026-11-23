"""Pack the Blender chest renders (art/chests/<kind>/0001.png ...) into one WebP strip per kind
(public/chests/<kind>.webp) and src/data/chestSprites.json. Every kind is cropped to one shared box,
so the chests line up whichever opens."""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ART, PUB, MANIFEST = ROOT / 'art' / 'chests', ROOT / 'public' / 'chests', ROOT / 'src' / 'data' / 'chestSprites.json'
HEIGHT = 300


def main():
    kinds = {d.name: sorted(d.glob('[0-9]*.png')) for d in sorted(ART.iterdir()) if d.is_dir()}
    kinds = {k: v for k, v in kinds.items() if v}
    box = None
    for files in kinds.values():
        for f in files:
            b = Image.open(f).getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
            if b: box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    box = (box[0] - 6, box[1] - 6, box[2] + 6, box[3] + 6)
    k = HEIGHT / (box[3] - box[1]); fw, fh = round((box[2] - box[0]) * k), HEIGHT
    PUB.mkdir(parents=True, exist_ok=True); out = {'frame': [fw, fh], 'fps': 24, 'kinds': {}}
    for kind, files in kinds.items():
        st = Image.new('RGBA', (fw * len(files), fh), (0, 0, 0, 0))
        for i, f in enumerate(files): st.alpha_composite(Image.open(f).convert('RGBA').crop(box).resize((fw, fh), Image.LANCZOS), (i * fw, 0))
        st.save(PUB / f'{kind}.webp', 'WEBP', quality=86, method=6, alpha_quality=90)
        out['kinds'][kind] = {'file': f'chests/{kind}.webp', 'frames': len(files)}
        print(f'{kind}: {len(files)} frames {fw}x{fh}, {(PUB / f"{kind}.webp").stat().st_size / 1024:.0f} KB')
    MANIFEST.write_text(json.dumps(out, indent=1) + '\n')


if __name__ == '__main__':
    main()
