"""SpriteCast specs for the bosses (art/bosses-3d/<id>.json), one per built model.

"draw": false - the toon renders of our own rigged model are the frames, so every step is free.
The clips come from common.clips: idle (a breathing loop, shown as the action "breathe"), walk,
attack, hurt and happy. "pitch": 12 - the bosses face the class, seen nearly from the front.
"""
import json
import sys
from pathlib import Path

ART = Path(__file__).resolve().parents[2] / 'art' / 'bosses-3d'
NAMES = {
    'grumblethorn': 'Grumblethorn, a round grumpy thorn bush with a pale green face and brown thorns',
    'mudsnout': 'Mudsnout, a muddy pink pig standing in a mud puddle',
    'glimmerjaw': 'Glimmerjaw, a purple crab with crystals on its shell and eyes on stalks',
    'murkmoth': 'Murkmoth, a fluffy purple moth holding a crystal and a light orb',
    'puffington': 'Captain Puffington, a blue and yellow pufferfish with spikes',
    'snowsulk': 'Sir Snowsulk, a snowman with an ice crown and a blue cape',
    'magmaw': 'Magmaw, a volcano toad with an orange belly and lava cracks',
    'zapcrackle': 'Zapcrackle, a grumpy thundercloud with a lightning bolt',
    'snorecap': 'Snorecap, a sleepy purple mushroom with crossed arms',
    'whirlwing': 'Whirlwing, a diamond kite with a face and a bow tail',
    'colossus': 'The Clockwork Colossus, a wind-up robot with gears on its shoulders',
    'riddlepaw': 'Riddlepaw, a sphinx cat in a blue and gold headdress',
}


def spec(bid):
    return {
        'name': bid,
        'description': NAMES[bid],
        'design': f'{bid}/render/idle-south.png',
        'rig_glb': f'{bid}/{bid}.glb',
        'draw': False,
        'pitch': 12,
        'frames': 8,
        'frame_px': 448,
        'render_px': 1024,
        'head_up': 0, 'shoulder_up': 0, 'shoulder_wide': 1,
        'walk': {'clip': 'walk', 't0': 0, 't1': 1.0},
        'idle': {'clip': 'idle', 't': 0},
        'actions': [
            {'name': 'breathe', 'clip': 'idle', 'frames': 12, 'loop': True},
            {'name': 'attack', 'clip': 'attack', 'frames': 12, 'loop': False, 'canvas': 640},
            {'name': 'hurt', 'clip': 'hurt', 'frames': 9, 'loop': False, 'canvas': 640},
            {'name': 'happy', 'clip': 'happy', 'frames': 12, 'loop': True, 'canvas': 640},
        ],
    }


if __name__ == '__main__':
    ids = sys.argv[1:] or list(NAMES)
    for bid in ids:
        (ART / f'{bid}.json').write_text(json.dumps(spec(bid), indent=2) + '\n')
    print(f'specs: {len(ids)} written to {ART}')
