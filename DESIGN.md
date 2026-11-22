---
name: Classroom Creatures
description: A class's creatures living in a bright painted sky world, with sun, drifting clouds and floating islands.
colors:
  azure-950: "#0e2a52"
  azure-800: "#1b4f97"
  azure-700: "#2563b8"
  azure-600: "#3b7fd3"
  sky-top: "#5bb8f0"
  sky-mid: "#a9dcf8"
  sky-horizon: "#fff1d6"
  mist: "#e9f4fd"
  rule: "#cddfee"
  wash: "#f2f8fe"
  paper: "#ffffff"
  ink: "#13253f"
  ink-soft: "#4a5d78"
  gilt: "#ffc23d"
  gilt-deep: "#d99400"
  gilt-ink: "#3a2700"
  gilt-pale: "#fff3cc"
  gilt-text: "#ffd166"
  leaf: "#157a40"
  leaf-pale: "#e0f4e7"
  buy: "#1f9653"
  brick: "#c8412f"
  brick-pale: "#fbe5e0"
  coin: "#8a5d07"
  berry: "#a3245a"
  sky: "#1f7fbf"
typography:
  display:
    fontFamily: "Bricolage Grotesque Variable, Atkinson Hyperlegible Next Variable, system-ui, sans-serif"
    fontSize: "88px"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Bricolage Grotesque Variable, Atkinson Hyperlegible Next Variable, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Bricolage Grotesque Variable, Atkinson Hyperlegible Next Variable, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Atkinson Hyperlegible Next Variable, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Atkinson Hyperlegible Next Variable, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.25
  button:
    fontFamily: "Bricolage Grotesque Variable, Atkinson Hyperlegible Next Variable, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.1
rounded:
  wash: "8px"
  tile: "12px"
  card: "18px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.gilt}"
    textColor: "{colors.gilt-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "#ffcf5a"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  button-ghost-hover:
    backgroundColor: "{colors.wash}"
  button-azure:
    backgroundColor: "{colors.azure-700}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  button-azure-hover:
    backgroundColor: "{colors.azure-600}"
  button-buy:
    backgroundColor: "{colors.buy}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  button-danger:
    backgroundColor: "{colors.brick}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  plate:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
    padding: "10px 14px"
  chip:
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  award-tile:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
  level-tab:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.azure-800}"
    rounded: "{rounded.pill}"
  option-selected:
    backgroundColor: "{colors.gilt-pale}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
---

# Design System: Classroom Creatures

## Overview

**Creative North Star: "The Sky World"**

The class lives in a bright, painted daytime world. Behind every screen is a watercolour landscape (painted with p5.brush, scripts/sky): a blue sky warming to gold at the horizon, the sun with turning rays, clouds drifting across, far periwinkle mountains, floating islands that bob gently, hills and a flower meadow. anime.js keeps it alive: clouds cross the screen at their own speeds, now and then a little winged creature flies past, pollen floats up, and every layer shifts slightly with the pointer. Each student's creature still stands on its own watercolour plate inside a white card that floats on that sky.

The world is the visual, the interface is clear in front of it. Cards are solid white for reading from the back of the room; the header and the floating summary cards are frosted glass so the sky shows through; headings set straight on the sky carry a soft white halo. Big moments and Present bands use deep azure, a daytime blue, never a night sky.

It refuses the dark purple night-sky HUD of v1 and the green bookcloth field guide of v1.3. It must not read as toddler pastel: the sky is real painting with depth, and colour in the chrome stays disciplined.

**Key Characteristics:**
- An animated painted sky world behind every screen (components/SkyWorld.tsx), still under Reduce Motion or with "Animated background" off.
- White cards on the sky; frosted glass for the header and floating summaries; azure for filled controls, Present bands and big moments.
- Watercolour washes per element behind every creature; plate art is raster, never CSS gradients.
- Sun gold reserved for "now": selection, current tab, primary action, the just-rewarded ribbon.
- Everything moves with springs (anime.js): buttons squash and spring back, cards tilt toward the pointer, numbers roll.
- One drawn 24px stroke icon set; emoji only as the teacher's own content.

## Colors

A painted daytime sky, white cards, one deep azure for weight, sun gold for "now", and plain state colours; element colours belong to the creatures.

### Primary
- **Azure** (azure-700, a gradient from azure-600): filled controls (the azure button, the selected tab pill, selection-mode button, the dressing-room and Evolutions buttons), focus outlines, level-tab rings and numerals.
- **Deep Azure** (azure-800 to azure-950 radial): Present top and bottom bands, the selection bar, the lock screen, big moments (evolution, whole-class celebration) and the modal scrim at 45%.

### Secondary
- **Sun Gold** (gilt): the "now" colour. Primary button (with a lighter top), the sliding main-nav underline, selected plate glow, the just-rewarded ribbon, the class-goal bar in Present.
- **Gilt Deep / Ink / Pale**: selected plate border, text on gold, fill of a selected option tile.
- **Gilt Type** (gilt-text): titles on azure (Present class name, celebration headlines).

### Tertiary
- **Buy Green** (buy): the purchase button only, kept green as asked in 1.4.
- **Award Leaf** (leaf / leaf-pale): positive XP figures, owned items, toggles on.
- **Reminder Brick** (brick / brick-pale): deductions and destructive actions.
- **Coin Ochre** (coin): coin counts and the drawn coin, never gold.
- **Berry** and **Sky** (data): content tags only.

### Neutral
- **Sky Top / Mid / Horizon**: the background gradient under the painting (also the instant fallback before it loads).
- **Mist** and **Wash**: insets and hover fills inside cards. **Rule**: hairlines and input borders, a cool blue-grey.
- **Paper**: cards, panels, inputs, award tiles. **Ink** (deep navy) and **Ink Soft**: text.

### Element colours
Each of the ten elements keeps a fixed colour (src/data/elements.ts) used as the plate's 3px ribbon, its progress bar, its stage pips and its element icon. Element and behaviour colours enter chrome only as a 15 to 22% tint on white with a 45 to 55% ring; labels stay ink.

### Named Rules
**The Gold Means Now Rule.** Sun gold appears only on the active thing: the primary action, the current tab, the current selection, the most recent award. If two unrelated things are gold, one is wrong.

**The World Behind, Words In Front Rule.** Text never sits directly on a busy part of the painting without help: on cards, on glass, or with the sky halo (`.on-sky`, and the automatic halo for headings set on the sky).

## Typography

**Display Font:** Bricolage Grotesque Variable (with Atkinson Hyperlegible Next, system-ui)
**Body Font:** Atkinson Hyperlegible Next Variable (with system-ui)

**Character:** Bricolage carries names, numbers and actions with a chunky, friendly confidence that is not childish; Atkinson Hyperlegible keeps every UI line readable for young non-native readers and across a projected room.

### Hierarchy
- **Display** (800, 84 to 88px, 0.9, -0.03em): monumental single messages. Present spotlight and picker name, profile level numeral; celebration headlines run 48 to 72px in gilt on cloth.
- **Headline** (800, 44px, 34px on small screens, 1.05, -0.02em): page title (the class name), Present class name at 56px; XP total on the profile at 52px.
- **Title** (700, 20 to 22px, -0.01em): plate names (20px), section titles (22px), dialog titles (24px).
- **Body** (400, 16px): UI text and the specimen field note; long notes cap at 40ch.
- **Label** (700, 12 to 13px): meta lines (field number, XP-into-level, time ago), chips at 12px, the smallest at 11px.
- **Button** (650, 16px, Bricolage): every button and tab.

### Named Rules
**The Scale Contrast Rule.** Hierarchy comes from size jumps on one scale (13, 16, 20, 44, 88), not from colour, caps or tracking. Display type is tightened (-0.01 to -0.03em); nothing is letterspaced open.

**The Tabular Figures Rule.** Every number that can change or be compared (XP, coins, levels, field numbers, counts) is set in tabular figures.

## Layout

Content sits in a centred column up to 1600px with 16px side padding (24px from the small breakpoint). The classroom page leads with the class name set straight on the sky (with its halo) and the class goal on a floating glass card to the right, then a toolbar row (actions left, search and filters right on large screens), leaving a band of open sky at the top where the sun, clouds, islands and flyers show. Below it, a card grid of auto-filling 184px-minimum columns (two on phones) beside a 320px activity column from the xl breakpoint.

Present mode fills the screen: a deep azure top band, the creature cards fitted to the space between (they scroll on a phone), the awards ticker and an azure control band, with the sky world visible all around the cards. Modals are bottom sheets on phones and centred sheets above the small breakpoint. The main nav wraps to its own scrollable row below md.

## Elevation & Depth

White cards float on the sky with soft, blue-tinted, long-falloff shadows; hover lifts them with a deeper shadow and cards lean slightly toward the pointer. The header is frosted glass (78% white, 14px blur) with a soft blue shadow. The painting itself has depth: its layers move at different speeds (parallax) from the far mountains to the meadow.

### Shadow Vocabulary
- **Card** (`0 1px 0 rgb(19 37 63 / .04), 0 2px 4px rgb(19 37 63 / .06), 0 14px 30px -16px rgb(27 79 151 / .45)`): cards, panels, award tiles at rest.
- **Lift** (`0 4px 8px rgb(19 37 63 / .08), 0 24px 44px -18px rgb(27 79 151 / .55)`): hovered cards, modals, pop-overs.
- **Glow** (`0 0 0 3px gilt, 0 12px 28px -12px rgb(217 148 0 / .7)`): the selected card only.

### Named Rules
**The One Sheet Rule.** A card never sits on another card; tiles inside a card use rings and tints, not shadows.

## Shapes

Softly rounded cards (18px) for plates, panels and modals; 12px for tiles and inputs; 8px for the wash inset in a plate. Every action, chip, tab bar and level tab is a full pill. The irregular shapes belong to the paintings: the watercolour washes behind creatures and the painted clouds, islands and hills. Two drawn marks remain: the gold ribbon bookmark and the round level seal.

## Components

### Buttons
Tactile and rounded, set in the display face. Their feel comes from anime.js (lib/interactions.ts): pressed buttons squash to 93% and spring back past rest; under the mouse they lift 2px; primary and buy buttons throw a few sparks on click.
- **Shape:** full pill (999px), 10px by 18px padding, 8px icon gap.
- **Primary:** sun gold with a lighter top, gilt-ink text, an inner highlight and a warm shadow. One per view region (Present, Award whole class, Pick a student, Hooray).
- **Azure:** azure gradient, white text, for confirming and selected actions inside cards.
- **Buy:** grass green gradient, white text, for "Buy and wear" only.
- **Light:** white with a rule ring; the default secondary action, also on the open sky.
- **Ghost:** transparent with an ink ring at 22%; on azure it turns white with a white ring.
- **Danger:** brick fill, white text, destructive confirmations only.
- **Disabled:** 45% opacity, no motion.

### Chips
- **Style:** pill, 12px bold, 2px by 10px. Tinted by the colour they name (element, mood, demo data, coins) on white, with a matching ring.
- **State:** chips are labels, not controls.

### Plates (signature)
The specimen card. White sheet, rule hairline, card shadow, 18px corners. Inside: an 8px-rounded watercolour wash (144px tall, 160px from small) holding the creature, the level tab top-left, a mood chip bottom-left when the mood is not calm. Under it: a 3px ribbon in the element colour, the name at title size, a meta line (element icon, field number, species in bold), an element-coloured progress bar with into/span figures, stage pips, XP and coins. The foot is a row of 48px-tall award buttons tinted by behaviour colour, then a small pale-brick deduct square that opens a pop-over. Hover lifts the plate. Selecting replaces the award row with a round check top-right; a selected plate takes the gilt-deep border and glow. The just-rewarded plate wears the gilt ribbon from the top edge until the next award.

### Watercolour Wash
Rasters in public/plates/<element>-<1|2|3>.webp, rendered by scripts/plates/. Each species keeps its wash by its index within its element, so a creature's plate never changes. Unlockable backgrounds are painted inside the same wash shape as a mask, with the wash multiplied over at 35%.

### Level Tab
White pill with a 2px azure ring and azure numeral, a small "Lv" before the number. The large size becomes a 56px round seal.

### Inputs / Fields
- **Style:** white, 1.5px rule border, 12px radius, 10px by 14px padding; selects use a drawn chevron.
- **Hover:** border darkens to a sage grey.
- **Focus:** border goes to azure-700 with a 4px azure halo at 18%.

### Navigation
- **Main nav:** in the glass header, display face 16px semibold, ink soft resting and azure-800 current, with a sun-gold underline that slides from tab to tab (anime.js).
- **In-panel tabs:** a white pill track; an azure pill slides behind the current tab (`slidePill` in lib/motion.ts).
- **Selected option tiles:** gilt-pale fill with a 2px gilt-deep ring; unselected are wash with a rule ring.

### Award Tiles
White 12px tiles with a rule ring and the card shadow; a 44px tinted icon square, the behaviour name in bold ink, the XP in leaf (or brick for deductions, which also take a brick ring). Hover lifts 2px; tap scales to 0.96.

### Icons
One drawn set on a 24px grid with 2px round strokes. A behaviour's emoji is shown through its drawn twin when one exists. The coin has its own two-tone ochre drawing.

### Big Moments
Evolution and whole-class celebrations take the full screen in deep azure. An evolution charges first: the plate darkens to the element colour, the creature turns to white light under a pixel pillar in the element palette, the caption (field number, species, current stage) sits on a deep azure pill above the effect layer, and a white flash hands over to the reveal. The new form then sits on a large plate beside the old one, with a rotated round seal (gilt ring, field number, roman stage); a mythical form adds a rarity-tinted path chip; headline in gilt display type; actions are a ghost Replay and a gilt primary. Skip is always offered.

### Creature Profile
A two-column page on the sky. Left: one large plate holding the creature on its wash, a mood chip, the evolve badge, and a row of light buttons (Pet, Feed, Play, Sing) with the Dressing room as the azure action. Feed and Play open a wash tray of pixel snacks and toys. Right: a stack of paper sheets: level and XP as monumental numerals over an element-coloured bar; the evolution line as five small plates (the current one gilt-pale with a gilt-deep ring, undiscovered ones as silhouettes); personality; abilities; achievements; forms revealed. Coins sit top-right in the ochre coin pill.

### Dressing Room
Category list on the left (light pills with a count, the current one azure), the creature on a large plate in the middle with the selected item tried on and an action panel under it, item cards on the right. The worn items are chips with a remove button under the plate. Item cards: white, the item shown on the student's own creature, name in the display face, one state chip (Wearing in leaf, Owned in leaf-pale, a coin price in ochre, Locked in ink-soft). Rare cards take a gilt-deep ring and a gilt Rare chip; seasonal cards say until when. Buying is always the green buy button ("Buy and wear · 60"), never gold.

### Ability Tree
Four rows joined by a thin rule spine. Each row: a pixel icon tile, the name at title size with its tier, a one-line description, rank diamonds, and the action (gilt "Awaken · 1 point" or "Rank up", light "Use"). Asleep abilities are dimmed with the level they wake at.

### Field Guide Cards
Plates without the award foot: the creature (or its ink silhouette on the wash until discovered), field number, forms found, name or "???", element chip, rarity stars, and a mythical-path chip in berry when the species has one. Class milestones are four wide sheets above the grid; a reached one takes a gilt ring and says so.

### Teacher Tables
The progression table is a paper sheet with a wash header row, rule dividers, tabular numerals right-aligned, a 36px creature thumbnail per row and small light actions (Profile, Adjust XP, Reset in brick text). Confirmations that cannot be undone ask for the student's name and use the danger button.

### Pixel Layer
Pixel art is the RPG layer around the illustrated creatures: effects from the vendored pixelfx library, trail particles, snacks, toys, ability icons and painted pixel scenes. All of it runs on one shared animation clock and loads on first use. On large views (profile, dressing room, spotlight) the pixels get big, so an effect must never cover the creature's face: full-body effects keep only their rim (a radial mask) or move beside the creature, mood effects use a smaller stand-in whose head sits at the creature's head, and floating pickups drop their floor shadow. Mythical forms wear drifting particles, not a full-body aura.

### World of Adventures
A pixel-art layer inside the sky world: islands, region places, bosses, chests, relics and class-world buildings drawn in code with claude-pxl (scripts/pixel, one shared palette) and shown crisp (`.pixel`). Pixel art always sits on a paper card or inside a framed map (`.adv-map`: card radius, lift shadow, a white inner rim) so it reads as an object on the painting; everything around it is the normal interface. The world map is a sea image with six island images over it, each bobbing and lifting under the pointer, locked ones greyed under white fog with an ink chip ("40 points"); a gold marching route joins open regions; the same regions repeat as a card list below. The map is sized to fit one projector screen. Bosses are only ever grumpy or befriended, never hurt: activity is a wobble, a white flash and a floating "+N", and the meter is Friendship (pink to gold) that fills. Chests show their contents before opening, a ready one wiggles and takes the gilt ring, and opening is a shake then the open chest with what was inside. Region pages lead with the region's place art on a plate beside a paper sheet of facts. The Adventure section uses the slidePill tab row, StudentChip (creature + first name) for whose page it is, and the compass AP pill.

### Pixel Mode (1.5.1)
An optional second look, switched in the top bar or Settings; `html.pixel-mode` carries it (index.css). Same colours, layout and behaviour, drawn in pixels: one pixel unit (4px) in ink #1d1a2f; square corners everywhere; stepped frames that leave the corners open (four offset box-shadows) with a hard drop shadow; buttons in flat colour with a light bevel top-left and a dark bevel bottom-right, pressed by sinking; progress bars in whole blocks; the sky in hard colour bands with pixel copies of the painted layers that move a whole pixel at a time; Jersey 10 for display and Tiny5 for text, sized by x-height (`font-size-adjust`) so they match the painted sizes, and chosen for unmistakable digits. Creatures are sprites made at run time from the painting plus everything worn (pixelSprite.ts: 4× raster, alpha-weighted blocks, hard alpha, a 22-colour median-cut palette, a one-pixel selective outline), 64 × 66 to keep the plate geometry; they breathe like hand-animated sprites (the upper body up a pixel, the chest a row taller) and blink at random moments. Creature plates become pixel places (the region scenes and pixel scenes). Element auras and attacks are pixelfx effects drawn on the creature's own pixel grid, at most at the sprite's pixel size; breath attacks start at the mouth, ground attacks in front. Effects never sit on the face.

### Pixel Pals (1.5.2)
Ten species drawn as pixel art from the start (scripts/pixel/creatures.px.js, claude-pxl), shown as pixel sprites in both looks. Same 64 × 66 frame and ink outline as the Pixel mode sprites, chunky readable shapes (eyes 2 to 3 px wide, a pink blush, a one-pixel highlight), cel shading in three tones, and a palette per species that matches its element. Each form has six animations at their own frame rates (idle 7 fps, blink 7, happy 10, attack 9, sleep 3, hurt 8): motion moves whole parts a whole pixel at a time (breath lifts the head, tails and ears swing, wings flap) rather than sliding. Worn items follow the head offset measured per frame; body items sit on the body, back items behind the pal.

### Bosses and the battle arena (1.6)
Bosses are painted in code (BossArt.tsx) in the creature art's language: dark outlines (#2b2140, 5 units in a 400 box), radial light from the top left, a soft blurred highlight, big eyes with two catch-lights, and four faces (grumpy: low lids and brows; hurt: squeezed eyes and a wobbly mouth; attack: narrow eyes and an open shout; happy: smiling eyes and an open smile, plus the befriended change: flowers, a hat back on, a cleaned coat). They blink and face three quarters left, towards the class. The arena is a 16:9 stage: a soft painted place per region (ArenaBackdrop.tsx; low contrast, landmarks at the edges), the class standing in rows on the left (back rows smaller, names on white pills), the boss on the right, and two white glass cards at the top (the mission, the boss's HP and clock). Effects are pixelfx at one pixel size for the whole arena (about 1/400 of its width per effect pixel) so they never balloon with the boss; impacts fade out within two seconds. Banners: gold for the mission and befriending, azure for team attacks, brick (smaller) for strikes back. Numbers float off the boss's head: white for hits, gold for super effective and team attacks, green for what the boss recovers.

### Motion
anime.js (src/vendor/animejs, from dark3panther/anime) drives the interface through lib/motion.ts and lib/interactions.ts: springy presses, hover lifts and click sparks on every button; cards that lean toward the pointer; screens whose sections rise in one after another, with card grids rippling in; numbers (XP, coins, levels, class XP) that roll to new values; a card that bounces when it gets an award while "+5 XP" springs up out of it; pop-ups that spring up and sink away; progress bars that spring to length; tab pills that slide; the card grid gliding to its new order when re-sorted. The sky world (components/SkyWorld.tsx) uses the same engine for drifting clouds, bobbing islands, the turning sun, pollen, passing flyers and pointer parallax.

Painted creatures blink (a feathered eyelid every 2.5 to 7 seconds per creature, sometimes twice; shut while sleepy) and large views breathe under the species idle loop (CSS). The evolution sequence and a few exit animations still use Framer Motion. Under Reduce Motion (OS or setting) every one of these stands down: changes happen at once, the sky is a still painting. "Animated background" off stills only the sky.

## Do's and Don'ts

### Do:
- **Do** keep sun gold for the one active thing on screen: primary action, current tab, selection, the latest award.
- **Do** put every creature on its watercolour wash inside a white card with the field number beside the species name.
- **Do** let the sky world show: leave open sky at the top of pages and around Present's cards; use glass for floating summaries.
- **Do** give text on the painting help: a card, glass or the sky halo.
- **Do** use deep azure with gold type for Present bands and big moments.
- **Do** tint element and behaviour colours onto white with a ring of the same hue and keep the text ink.
- **Do** set changeable numbers in tabular figures and let them roll (CountUp) when they change.
- **Do** route new motion through lib/motion.ts so it respects Reduce Motion.
- **Do** keep purchases deterministic and visible: the price on the card, the student's coins in view, one green button to buy.
- **Do** check a pixel effect on the largest view it can appear in before shipping it.
- **Do** frame pixel art (paper card or map frame) and keep it crisp; scale it by whole steps where you can.
- **Do** show what a reward or chest contains before it is collected; nothing is random.
- **Do** check new screens with Pixel mode on as well: a hard-coded rounded shape, gradient or smooth font shows up at once there.

### Don't:
- **Don't** use gold on a resting surface, a decorative border or a heading.
- **Don't** return to a dark night-sky ground, to green bookcloth, or to a grey admin table.
- **Don't** put small text straight on busy parts of the painting.
- **Don't** paint chrome in element colours or pastels; colour belongs to the creatures, their plates and the sky.
- **Don't** use hard offset shadows or stack cards on cards.
- **Don't** animate with CSS transitions on transform where anime.js already moves the element; they fight.
- **Don't** build hierarchy from uppercase or letterspaced labels; use the size scale.
- **Don't** show a boss being hurt or defeated, or a student being knocked out of anything; bosses are befriended.
- **Don't** smooth pixel art (no bilinear scaling, no blur), and don't put it straight on the painted sky without a frame.
- **Don't** put emoji in chrome; emoji appear only as the teacher's own behaviour, prize and badge content.
- **Don't** let coins borrow gold; currency is ochre.
- **Don't** add loot boxes, random rolls for money or anything that can be bought twice.
- **Don't** let a pixel effect sit on a creature's face, or replace creature art with emoji.
