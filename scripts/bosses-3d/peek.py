"""A quick look at built bosses through SpriteCast's own renderer (render_char.html), front only:
one row a boss, the moments that matter (idle, attack, hurt, happy). Much quicker than a full
`charpipe.py render` (8 facings, every frame) while a model is still being shaped.

    python scripts/bosses-3d/peek.py out.png grumblethorn mudsnout ...   (SpriteCast's venv python)
"""
import base64
import io
import os
import sys
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

SC = Path(os.environ.get('SPRITECAST') or Path(__file__).resolve().parents[3] / 'dark3panther' / 'spritecast' / 'skills' / 'spritecast' / 'scripts')
ART = Path(os.environ.get('BOSS_ART') or Path(__file__).resolve().parents[2] / 'art' / 'bosses-3d')
SHOTS = [('idle', 0), ('idle', 1.55), ('attack', 0.48), ('hurt', 0.22), ('happy', 0.33), ('walk', 0.25)]
out, ids = sys.argv[1], sys.argv[2:]
pitch = float(os.environ.get('PITCH', 12)); facing = os.environ.get('FACING', 'south')


def run():
    rows = []
    with sync_playwright() as pw:
        sys.path.insert(0, str(SC)); import browser
        br = browser.launch(pw)
        for bid in ids:
            glb = ART / bid / f'{bid}.glb'
            pg = br.new_page()
            def serve(route, *_):
                p = route.request.url.split('spritecast.local/', 1)[1]
                if p == 'asset/rig.glb': return route.fulfill(path=str(glb), content_type='model/gltf-binary')
                f = (SC / p.split('?')[0]).resolve()
                if not f.is_file(): print('peek: missing', p, flush=True); return route.abort()
                route.fulfill(path=str(f), content_type='text/html' if f.suffix == '.html' else 'text/javascript')
            pg.on('console', lambda m: print('page:', m.text, flush=True)); pg.on('pageerror', lambda e: print('page error:', e, flush=True))
            pg.route('http://spritecast.local/**', serve); pg.goto('http://spritecast.local/render_char.html')
            pg.wait_for_function('window.ready === true', timeout=30000)
            pg.evaluate('([u, p]) => window.load(u, p, "right")', ['http://spritecast.local/asset/rig.glb', pitch])
            ims = []
            for clip, t in SHOTS:
                u = pg.evaluate('(a) => window.frames(...a)', [clip, facing, 1, t, t + 1e-4, 0, 0, 1, False])[0]
                ims.append(Image.open(io.BytesIO(base64.b64decode(u.split(',', 1)[1]))).convert('RGBA'))
            rows.append(ims); pg.close()
        br.close()
    W = 300
    sheet = Image.new('RGBA', (W * len(SHOTS), W * len(rows)), (238, 233, 224, 255))
    for r, ims in enumerate(rows):
        for c, im in enumerate(ims): sheet.alpha_composite(im.resize((W, W), Image.LANCZOS), (c * W, r * W))
    sheet.convert('RGB').save(out); print(out)


run()
