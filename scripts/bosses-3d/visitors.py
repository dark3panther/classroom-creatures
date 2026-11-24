"""Befriended bosses visiting the class world (Godot stage): each boss's walk and stand in all eight facings, small,
exported for Godot by SpriteCast's own exporter (export.py), into godot/sprites/<id>/.

    python3 scripts/bosses-3d/visitors.py [ids...]      (SPRITECAST_PY and CHARPIPE as for render_all.sh)

It packs the finished renders at 112 px (`charpipe.py pack --px 112`), then hands export.py a copy of that sheet that
lists only the walk and the stand (the other actions stay home), so the stage carries a few hundred KB a boss.
"""
import json, os, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ART, OUT = ROOT / 'art' / 'bosses-3d', ROOT / 'godot' / 'sprites'
PY = os.environ.get('SPRITECAST_PY', str(Path.home() / '.cache/spritecast/venv/bin/python'))
SC = Path(os.environ.get('CHARPIPE', str(ROOT.parent / 'dark3panther/spritecast/skills/spritecast/scripts/charpipe.py'))).parent
PX = 112

ids = sys.argv[1:] or sorted(p.stem for p in ART.glob('*.json'))
for bid in ids:
    subprocess.run([PY, str(SC / 'charpipe.py'), 'pack', f'{bid}.json', '--px', str(PX)], cwd=ART, check=True, capture_output=True)
    src = ART / bid / f'out-{PX}px'; walk = ART / bid / f'out-{PX}px-walk'
    shutil.rmtree(walk, ignore_errors=True); (walk / 'shadows').mkdir(parents=True)
    meta = json.loads((src / 'character.json').read_text()); meta.pop('actions', None)
    for f in list(meta['walk'].values()) + list(meta['idle'].values()): shutil.copy(src / f, walk / f)
    for kind in ('walk', 'idle'):
        for v in meta['shadows'][kind].values():
            for s in (v if isinstance(v, list) else [v]): shutil.copy(src / s['file'], walk / s['file'])
    (walk / 'character.json').write_text(json.dumps(meta))
    dst = OUT / bid; shutil.rmtree(dst, ignore_errors=True)
    subprocess.run([PY, str(SC / 'export.py'), str(walk), '--to', str(dst), '--only', 'godot', '--name', bid], check=True, capture_output=True)
    # export.py writes <dst>/godot/...: keep the folder flat
    for f in (dst / 'godot').iterdir(): shutil.move(str(f), dst / f.name)
    (dst / 'godot').rmdir()
    print(f'{bid}: {sum(f.stat().st_size for f in dst.rglob("*") if f.is_file()) // 1024} KB -> {dst}')
