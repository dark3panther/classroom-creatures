"""docs/screenshots/boss-sprites.gif: every boss at once, from the shipped strips (public/bosses3d/), going
through its moods: idle, hurt, idle, attack, then the befriended hop. And docs/screenshots/chest-open.gif from
the chest strips (public/chests/)."""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
PUB, DOCS = ROOT / 'public', ROOT / 'docs' / 'screenshots'
ORDER = ['grumblethorn', 'mudsnout', 'glimmerjaw', 'murkmoth', 'puffington', 'snowsulk', 'magmaw', 'zapcrackle', 'snorecap', 'whirlwing', 'colossus', 'riddlepaw']
NAMES = {'puffington': 'Captain Puffington', 'snowsulk': 'Sir Snowsulk', 'colossus': 'Clockwork Colossus'}
FPS = 10
PLAN = [('idle', 1.2), ('hurt', None), ('idle', 0.5), ('attack', None), ('idle', 0.4), ('happy', 2.2)]
CELL, COLS, LABEL = 190, 4, 22
BG = (226, 240, 255)


def font(size):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf'):
        if Path(f).exists(): return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def frames_of(entry, act, im, t):
    a = entry['actions'][act]; i = int(t * a['fps'])
    return a, (i % a['frames'] if a['loop'] else min(a['frames'] - 1, i))


def bosses():
    man = json.loads((ROOT / 'src' / 'data' / 'bossSprites.json').read_text())
    ids = [b for b in ORDER if b in man]
    strips = {b: {k: Image.open(PUB / a['file']).convert('RGBA') for k, a in man[b]['actions'].items() if not k.startswith('walk')} for b in ids}
    timeline = []                         # (action, seconds into it) for each output frame
    for act, dur in PLAN:
        if dur is None:
            a = man[ids[0]]['actions'][act]; dur = a['frames'] / a['fps']
        for k in range(round(dur * FPS)): timeline.append((act, k / FPS))
    rows = (len(ids) + COLS - 1) // COLS; W, H = CELL * COLS, (CELL + LABEL) * rows
    f = font(15); out = []
    for act, t in timeline:
        fr = Image.new('RGBA', (W, H), BG + (255,)); d = ImageDraw.Draw(fr)
        for n, b in enumerate(ids):
            e = man[b]; idle = e['actions']['idle']; a, i = frames_of(e, act, strips[b][act], t)
            k = min(CELL * 0.74 / idle['h'], CELL * 0.92 / idle['w'])
            ox, oy = (n % COLS) * CELL, (n // COLS) * (CELL + LABEL)
            footx, footy = ox + CELL / 2, oy + CELL * 0.93
            src = strips[b][act].crop((i * a['sw'], 0, (i + 1) * a['sw'], a['sh']))
            src = src.resize((max(1, round(a['w'] * k)), max(1, round(a['h'] * k))), Image.LANCZOS)
            sh = Image.new('RGBA', (int(CELL * 0.5), int(CELL * 0.08)), (0, 0, 0, 0)); ImageDraw.Draw(sh).ellipse((0, 0, sh.width - 1, sh.height - 1), fill=(14, 42, 82, 40))
            fr.alpha_composite(sh, (int(footx - sh.width / 2), int(footy - sh.height / 2)))
            fr.alpha_composite(src, (round(footx - a['ax'] * k), round(footy - a['ay'] * k)))
            name = NAMES.get(b, b.capitalize()); tw = d.textlength(name, font=f)
            d.text((ox + (CELL - tw) / 2, oy + CELL + 1), name, font=f, fill=(27, 44, 80))
        out.append(fr.convert('RGB').quantize(colors=200, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE))
    out[0].save(DOCS / 'boss-sprites.gif', save_all=True, append_images=out[1:], duration=round(1000 / FPS), loop=0, optimize=True)
    print(f'boss-sprites.gif: {len(out)} frames, {(DOCS / "boss-sprites.gif").stat().st_size / 1024:.0f} KB')


def chest(kind='special'):
    man = json.loads((ROOT / 'src' / 'data' / 'chestSprites.json').read_text())
    c = man['kinds'].get(kind)
    if not c: return
    st = Image.open(PUB / c['file']).convert('RGBA'); fw, fh = man['frame']; out = []
    seq = [0] * 8 + list(range(c['frames'])) + [c['frames'] - 1] * 14
    for i in seq:
        fr = Image.new('RGBA', (fw, fh), BG + (255,)); fr.alpha_composite(st.crop((i * fw, 0, (i + 1) * fw, fh)))
        out.append(fr.convert('RGB').quantize(colors=200, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE))
    out[0].save(DOCS / 'chest-open.gif', save_all=True, append_images=out[1:], duration=round(1000 / man['fps']), loop=0, optimize=True)
    print(f'chest-open.gif: {len(out)} frames, {(DOCS / "chest-open.gif").stat().st_size / 1024:.0f} KB')


if __name__ == '__main__':
    bosses(); chest()
