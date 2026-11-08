# Prompts for the painted mythical forms

Model: Google Gemini **Nano Banana Pro** (`gemini-3-pro-image`), run as an image edit with the species' Legendary
art (`public/creatures/<id>-5.webp`) as the only reference. Four variations each; pick the one closest to the
original face and pose, then cut it out with `scripts/art/cut-white.py` and run `scripts/creature-anchors.py`.

Painted: emberpup, splashlet, orbitoad. Still to paint: sproutling, zipzap, frostnib, pebblet, duskit, glowbun, puffwhirl.

## Template

> Edit the provided image. It shows {NAME}'s Legendary form "{LEGENDARY TITLE}" from a children's classroom creature
> game: {WHAT THE LEGENDARY LOOKS LIKE}. Transform it into its mythical alternate final form, "{MYTHIC TITLE}":
> {MYTHIC DESCRIPTION}.
>
> Change: {CHANGE}
>
> Keep exactly: the same creature and species, its silhouette, body shape and proportions, standing pose, facing
> direction, face, big glossy eyes and happy expression, and its size and centred position in the frame with the
> whole body visible. Keep the same art style: a cute, original children's-game creature illustration with clean soft
> dark outlines, soft cel shading, gentle gradients and glossy highlights. It must stay an original design that does
> not resemble any existing franchise character.
>
> Background: plain flat pure white with nothing else: no ground, no cast shadow, no scenery, no glow spilling onto
> the background, no text, no border.

## Per creature

| id | Looks like (Legendary) | Mythic | Change |
|---|---|---|---|
| emberpup ✓ | a fox-like creature made of orange fire, with a flaming mane, a flaming tail, flame markings on its legs and floating embers | Frostflame Warden: its fire has turned ice-blue, cold flames that warm only its friends | every flame (mane, tail, leg flames and the floating embers) becomes cool ice-blue fire in pale cyan (#5fd4ff), frosty white (#e6fbff) and deep blue (#1f6fa8), with a few tiny snowflake sparks among the flames; its orange fur becomes pale icy blue-white with soft cyan markings; add a small crown of frozen flame shards on its head |
| splashlet ✓ | a blue axolotl-like water creature with pink frilly gills, a small crown of water drops with a pearl, coral pieces, swirling water streams and pearls | Stormtide Herald: it rides thunderclouds over the sea, crackling with violet lightning | its blue body becomes indigo and violet (#a77bff, #4b2a9c) with a pale lavender belly (#efe4ff); its pink gills become lavender with small lightning-bolt tips; the water streams become swirling stormy sea water in deep violet with two small dark storm clouds; the pearls become glowing violet orbs; small violet lightning bolts crackle around it; the water-drop crown becomes a crown of tiny storm clouds and a lightning bolt |
| orbitoad ✓ | a teal toad-like cosmic creature with a small crown, orbiting planets and a galaxy-patterned back | Nebula Prince: wrapped in pink star-dust from a faraway nebula | its teal body becomes soft lavender-blue with swirling nebula patterns in hot pink and magenta (#ff7ac8, #ffe1f3, #9a1f6e) and tiny twinkling stars; a flowing shawl of glowing pink nebula star-dust drapes over its shoulders and back; the gold crown becomes a pink crystal star crown; the orbiting planets become pink and violet nebula orbs with sparkling star-dust rings |
| sproutling | a green fawn-like nature creature with branch antlers covered in pink blossoms, leafy chest fur and a leaf tail | Autumn Elder: its leaves turned gold and red, and every step drops a falling leaf | its green fur and leaves become warm autumn orange, russet and gold (#f08a24, #9a3d12, #ffe0a3); the antler branches carry orange, red and golden autumn leaves and a few small acorns instead of pink blossoms; its leafy chest fur and leaf tail turn autumn red-gold; a few autumn leaves drift around its feet |
| zipzap | a yellow beetle-like electric creature with antennae, a blue shell on its back, blue lightning stripes, big blue lightning wings and a crackling blue electric aura with spark orbs | Voidvolt: lightning from the edge of the night sky, purple and silent | its yellow body becomes deep violet and midnight purple (#3a1466, #c06bff) with a pale lilac belly (#f1dcff); its stripes, lightning wings and electric aura become glowing purple lightning with tiny stars inside, like a piece of the night sky; the blue spark orbs become small purple-white star sparks; its shell becomes dark starry purple |
| frostnib | a blue and white penguin-like ice creature with ice-crystal wings, an ice-crystal crest, a white fur collar and floating snowflakes | Sunfrost Monarch: ice that holds sunlight inside, glowing gold at dawn | its ice crystals (wings, crest and collar points) become golden-amber ice crystals glowing with warm sunlight inside (#ffc94a, #fff5cf, #a86a00); its blue body becomes soft warm cream-gold with a white belly; the snowflakes become small golden sparkling snowflakes; add a small sun-shaped crystal crown on its crest |
| pebblet | a grey stone bear-like earth creature with teal-green crystals on its head and back, glowing teal cracks over its body and small floating rocks | Amethyst Heart: its stones became violet crystal that hums softly when it is happy | its green crystals become violet amethyst crystals (#b06cf0, #5a2591) and its glowing cracks glow soft lilac (#f0deff); its grey stone body takes a cool lavender-grey stone tint; the floating rocks become small floating amethyst geodes with violet crystals inside |
| duskit | a purple cat-like shadow creature with a long flowing mane and tail like night mist, a crescent moon on its forehead, a dark starry cloak with a crescent-moon clasp and small golden stars | Dawn Watcher: it stayed awake until sunrise and caught the first light in its fur | its purple fur becomes warm sunrise colours, soft peach, apricot and golden orange (#ffb347, #fff1cc, #c0651a); the night-mist mane and tail become flowing wisps of warm golden morning light; the starry cloak becomes a sunrise-sky cloak in a pink, orange and gold gradient with tiny golden sparkles; the crescent moons on its forehead and clasp become small rising-sun emblems |
| glowbun | a cream and gold rabbit-like light creature with golden feathered wings, a golden halo, a fluffy tail, golden markings and golden sparkles | Moonbringer: it shines silver instead of gold and guides lost travellers home | its golden fur, wings and markings become silver, moonlight white and soft periwinkle blue (#cfe3ff, #ffffff, #5a6fa8), with the wing feathers tipped in periwinkle; the golden halo becomes a silver crescent-moon halo; the golden sparkles become small silver-blue stars; add a small crescent-moon emblem on its chest. Ask for outlines in a darker periwinkle so the pale body stays outlined on white. |
| puffwhirl | a pale blue and white cloud-and-wind spirit with cloud wings, swirl patterns on its body, a curl on its head and wind ribbons spiralling around it | Tempest Monarch: a storm-cloud crown and wind that hums like thunder | its pale sky-blue cloud body becomes storm grey-blue and slate (#8fa6c8, #33415e) with pale silver highlights (#e8eef8); its cloud wings become dark storm clouds with silver edges; a crown of small dark storm clouds with tiny yellow lightning sparks sits on its head; the wind ribbons become swirling grey storm winds with a few small raindrops |

Cost on ElevenLabs (November 2026): 1,827 credits per Nano Banana Pro image, about 7,300 credits for four variations.
