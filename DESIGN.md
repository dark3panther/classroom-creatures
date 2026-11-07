---
name: Classroom Creatures
description: A class's creatures kept as a living naturalist's field guide, bound in green bookcloth.
colors:
  cloth-950: "#0d2e23"
  cloth-800: "#1d5643"
  cloth-700: "#2a6d56"
  endpaper: "#e5ecdc"
  rule: "#c3d0b8"
  wash: "#eef3e8"
  paper: "#ffffff"
  ink: "#16241c"
  ink-soft: "#46584c"
  gilt: "#f4b631"
  gilt-deep: "#c98a0c"
  gilt-ink: "#3b2800"
  gilt-pale: "#fdf0cc"
  gilt-text: "#f6cb62"
  leaf: "#1c7240"
  leaf-pale: "#e1f1e5"
  brick: "#b8432d"
  brick-pale: "#f8e4df"
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
  card: "14px"
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
    backgroundColor: "#f7c04a"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  button-ghost-hover:
    backgroundColor: "{colors.wash}"
  button-cloth:
    backgroundColor: "{colors.cloth-800}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  button-cloth-hover:
    backgroundColor: "{colors.cloth-700}"
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
    textColor: "{colors.cloth-800}"
    rounded: "{rounded.pill}"
  option-selected:
    backgroundColor: "{colors.gilt-pale}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
---

# Design System: Classroom Creatures

## Overview

**Creative North Star: "The Living Field Guide"**

The class is a naturalist's field guide that fills up as the year goes on. The shell is woven bookcloth in deep green with a gilt title; every page sits on a sage endpaper printed with faint leaves, tracks and paw prints; each student's creature is a numbered specimen on a white plate, standing on a watercolour wash painted in its element colour with a pooled darker edge. The teacher is the curator: the interface frames specimens and gets out of their way.

The system is light, bright and dense enough to show a whole class at a glance, and loud only at the scale where the room needs it. Present mode, the profile and the big moments set names, levels and XP at monumental scale on bookcloth or white, one message per band. Everything else is quiet ink on paper, so the one marigold thing on screen is always the thing happening now.

It refuses both the dark game HUD with glowing pills it replaced and the grey admin table. It must not read as toddler pastel: colour comes from the painted plates and the creatures, not from tinted chrome.

**Key Characteristics:**
- Green bookcloth shell (header, Present bands, celebrations) with a real woven texture, gilt type on top.
- Sage endpaper ground with a faint printed naturalist pattern; white plates with a rule hairline on it.
- Watercolour washes per element behind every creature; plate art is raster, never CSS gradients.
- Marigold gilt reserved for "now": selection, current tab, primary action, the just-rewarded ribbon.
- Field numbers (No. 001 to 030) on every species surface, set in tabular figures.
- One drawn 24px stroke icon set; emoji only as the teacher's own content.

## Colors

A green-and-paper book with one marigold signal and two plain state colours; element colours belong to the creatures, not the chrome.

### Primary
- **Bookcloth Green** (cloth-800): the shell. Header, Present top and bottom bands, the cloth button, the active segment of in-panel tab bars, level-tab rings and numerals, focus outlines on paper (cloth-700). Always carries the woven linen overlay when used as a surface.
- **Deep Bookcloth** (cloth-950): the big-moment surface (evolution, whole-class celebration, night-toned modal) and the modal scrim at 55%.
- **Lifted Bookcloth** (cloth-700): hover for cloth buttons, focus outline and input focus border on paper.

### Secondary
- **Marigold Gilt** (gilt): the "now" colour. Primary button, current main-nav underline, selected plate glow, the just-rewarded ribbon, selection check, focus outline on cloth.
- **Gilt Deep** (gilt-deep): border of a selected plate and ring of a selected option.
- **Gilt Ink** (gilt-ink): text on gilt fills.
- **Gilt Pale** (gilt-pale): fill of a selected option tile (stage, wardrobe item, icon picker).
- **Gilt Type** (gilt-text): the title on bookcloth (wordmark, Present class name, celebration headlines, selected count).

### Tertiary
- **Award Leaf** (leaf / leaf-pale): positive XP figures, owned items, toggles on, positive activity rows.
- **Reminder Brick** (brick / brick-pale): deductions and destructive actions. Deductions are a small pale-brick square beside the awards, never a red banner.
- **Coin Ochre** (coin): coin counts and the drawn coin, kept apart from gilt so currency never reads as "now".
- **Berry** (berry) and **Sky** (sky): content tags only (demo-data chip, challenge period chip, tear drops). Never chrome.

### Neutral
- **Endpaper Sage** (endpaper): the page ground, under the printed pattern tile.
- **Rule** (rule): plate hairlines, input borders, dividers, ring on light chips.
- **Wash** (wash): hover fill on paper, unselected option tiles, the modal close button.
- **Paper** (paper): plates, panels, inputs, award tiles, level tabs.
- **Ink** (ink) and **Ink Soft** (ink-soft): primary text and secondary meta text.

### Element colours
Each of the ten elements keeps a fixed colour (src/data/elements.ts) used as the plate's 3px ribbon above the name, its progress bar fill, its stage pips and its element icon. Element badges tint a chip with 15% of the colour on white and a 45% inset ring. Behaviour colours chosen by the teacher are mixed the same way (15 to 22% fill, 45 to 55% ring, icon at 70% mixed toward ink), so labels always stay ink.

### Named Rules
**The Marigold Means Now Rule.** Gilt appears only on the active thing: the primary action, the current tab, the current selection, the most recent award. Never as decoration, never on a resting surface. If two unrelated things are marigold, one of them is wrong.

**The Tinted Not Painted Rule.** Any colour that is not part of the book (element, behaviour, content tag) enters chrome only as a tint on white with a ring of the same hue; text on it stays ink.

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

Content sits in a centred column up to 1600px with 16px side padding (24px from the small breakpoint). The classroom page leads with the class name left and the class goal meter right on one wrapping row, a ruled divider, then a single toolbar row (actions left, search and filters right on large screens). Below it, a plate grid of auto-filling 184px-minimum columns (two fixed columns on phones, 12px gaps, 16px from the small breakpoint) beside a 320px activity column from the xl breakpoint; below xl the column drops under the grid.

Plates are dense: 8px inset for the wash, 12px internal padding, a 48px row of award buttons at the foot. Award tiles auto-fill at 176px minimum (158px compact). Present mode removes chrome to two bookcloth bands with a centred plate grid between them on the endpaper. Modals become bottom sheets on phones and centred sheets above the small breakpoint. The main nav wraps to its own scrollable row below md with a fade mask.

## Elevation & Depth

Paper lifted slightly off cloth-dyed endpaper: soft, ink-tinted, long-falloff shadows, never hard offsets. Plates and panels rest on a three-layer card shadow; hover lifts them 3px with a deeper shadow; modals and pop-overs use the lift shadow. Bookcloth bands cast a soft dark-green shadow down onto the page. The selected plate gets a 3px gilt ring with a warm glow.

### Shadow Vocabulary
- **Card** (`0 1px 0 rgb(22 36 28 / .04), 0 1px 2px rgb(22 36 28 / .08), 0 10px 24px -14px rgb(22 36 28 / .35)`): plates, panels, award tiles at rest.
- **Lift** (`0 2px 4px rgb(22 36 28 / .08), 0 18px 34px -16px rgb(22 36 28 / .42)`): hovered plates, modals, deduction pop-over.
- **Glow** (`0 0 0 3px gilt, 0 12px 28px -12px rgb(201 138 12 / .7)`): the selected plate only.
- **Cloth band** (`0 8px 20px -14px rgb(13 46 35 / .9)`): header and Present top band.

### Named Rules
**The Paper On Endpaper Rule.** Depth is one sheet thick. A plate never sits on another plate; tiles inside a sheet use rings and tints, not shadows.

## Shapes

Gently rounded sheets (14px) for plates, panels and modals; 12px for tiles and inputs inside them; 8px for the wash inset in a plate. Every action, chip, tab bar and level tab is a full pill. Borders are 1px rule hairlines on sheets and 1.5px inset rings on buttons and tinted tiles. The irregular shape belongs to the watercolour wash alone: its pooled ragged edge is the only non-geometric silhouette, set against the plate's clean corners. Two drawn marks complete the book: the ribbon (a gilt bookmark with a notched tail) and the round level seal.

## Components

### Buttons
Tactile and rounded, set in the display face.
- **Shape:** full pill (999px), 10px by 18px padding, 8px icon gap; press nudges down 1px and scales to 0.98.
- **Primary:** gilt with gilt-ink text, an inner top highlight and a warm drop shadow. One per view region (Present, Award whole class, Pick a student, Hooray).
- **Ghost:** transparent with a 1.5px ink ring at 22%; on bookcloth it turns white with a white ring at 30%.
- **Light:** white with a rule ring, used for secondary actions on endpaper.
- **Cloth:** bookcloth fill, white text, for confirming actions inside paper.
- **Danger:** brick fill, white text, destructive confirmations only.
- **Disabled:** 45% opacity.

### Chips
- **Style:** pill, 12px bold, 2px by 10px. Tinted by the colour they name (element, mood, demo data, coins) on white, with a matching ring.
- **State:** chips are labels, not controls.

### Plates (signature)
The specimen card. White sheet, rule hairline, card shadow, 14px corners. Inside: an 8px-rounded watercolour wash (144px tall, 160px from small) holding the creature, the level tab top-left, a mood chip bottom-left when the mood is not calm. Under it: a 3px ribbon in the element colour, the name at title size, a meta line (element icon, field number, species in bold), an element-coloured progress bar with into/span figures, stage pips, XP and coins. The foot is a row of 48px-tall award buttons tinted by behaviour colour, then a small pale-brick deduct square that opens a pop-over. Hover lifts the plate. Selecting replaces the award row with a round check top-right; a selected plate takes the gilt-deep border and glow. The just-rewarded plate wears the gilt ribbon from the top edge until the next award.

### Watercolour Wash
Rasters in public/plates/<element>-<1|2|3>.webp, rendered by scripts/plates/. Each species keeps its wash by its index within its element, so a creature's plate never changes. Unlockable backgrounds are painted inside the same wash shape as a mask, with the wash multiplied over at 35%.

### Level Tab
White pill with a 2px bookcloth ring and bookcloth numeral, a small "Lv" before the number. The large size becomes a 56px round seal.

### Inputs / Fields
- **Style:** white, 1.5px rule border, 12px radius, 10px by 14px padding; selects use a drawn chevron.
- **Hover:** border darkens to a sage grey.
- **Focus:** border goes to cloth-700 with a 4px cloth halo at 18%.

### Navigation
- **Main nav:** on bookcloth, display face 16px semibold, white at 75% resting and full white current, with a 3px gilt underline pill under the current tab.
- **In-panel tabs:** a pill track on wash; the current segment is filled bookcloth with white text.
- **Selected option tiles:** gilt-pale fill with a 2px gilt-deep ring; unselected are wash with a rule ring.

### Award Tiles
White 12px tiles with a rule ring and the card shadow; a 44px tinted icon square, the behaviour name in bold ink, the XP in leaf (or brick for deductions, which also take a brick ring). Hover lifts 2px; tap scales to 0.96.

### Icons
One drawn set on a 24px grid with 2px round strokes. A behaviour's emoji is shown through its drawn twin when one exists. The coin has its own two-tone ochre drawing.

### Big Moments
Evolution and whole-class celebrations take the full screen in deep bookcloth with linen. The new form sits on a large plate with a rotated round seal (gilt ring, field number, roman stage); headline in gilt display type; actions are a ghost Replay and a gilt primary.

### Motion
Creatures idle with CSS loops (bob, float, hop, sway, breathe) chosen per species; UI uses Framer springs (plates stiffness 400, modals 320) and 120 to 150ms transitions on buttons and inputs. Every loop stops under Reduce Motion, from the OS or the in-app setting.

## Do's and Don'ts

### Do:
- **Do** keep marigold gilt for the one active thing on screen: primary action, current tab, selection, the latest award.
- **Do** put every creature on its watercolour wash inside a white plate with the field number beside the species name.
- **Do** use bookcloth with the linen texture for the shell and for big moments, with gilt type for titles on it.
- **Do** tint element and behaviour colours onto white with a ring of the same hue and keep the text ink.
- **Do** set changeable numbers in tabular figures and give monumental numerals one message per band in Present and the profile.
- **Do** use the drawn 24px stroke icon set for every control.

### Don't:
- **Don't** use gilt on a resting surface, a decorative border or a heading on paper.
- **Don't** return to a dark night-sky ground with glowing pills, or to a grey admin table.
- **Don't** paint chrome in element colours or pastels; colour belongs to the creatures and their plates.
- **Don't** use hard offset shadows or stacked sheets; one paper layer on the endpaper.
- **Don't** build hierarchy from uppercase or letterspaced labels; use the size scale.
- **Don't** put emoji in chrome; emoji appear only as the teacher's own behaviour, prize and badge content.
- **Don't** let coins borrow gilt; currency is ochre.
