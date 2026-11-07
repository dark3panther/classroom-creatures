---
version: 1
slug: "src-views-dashboard-tsx"
primary_target: "src/views/Dashboard.tsx"
related_targets: ["src/App.tsx","src/views/Present.tsx"]
---

# Classroom (dashboard) and app shell

Scope: the Classroom dashboard is the first surface; every view (Creatures, Rewards, Settings, Profile, Present, overlays) inherits its world. Mode: Operate. Replacement world (the dark purple night sky is retired).

Audience and job: a Grade 2-3 English teacher at the front of a lit classroom, app on a projector or whiteboard; awards points in one tap while students watch from 6-8 m away. Proof: the class's own creatures, names, XP and coins. Constraints: keep creature art, app icon, pixelfx; all functions preserved; not babyish, not school-admin.

## Direction contract

THESIS: The class is a living field guide. Every student's creature is a numbered specimen on its own painted plate; the teacher curates the guide. Refuses the category default of a dark game HUD with glowing pills, and its opposite, a grey admin table.

OWN-WORLD: Bookcloth-green shell (deep cloth #1d5643 header with gilt title), endpaper-sage ground printed with a faint tracks-and-leaves pattern, white plates with an ink hairline, ink green-black text, marigold reserved for "now" (selection, current tab, just-rewarded plate, primary action), leaf green for awards, brick for reminders. Each creature sits on a watercolor wash in its element colour with a pooled darker edge. Bricolage Grotesque display, Atkinson Hyperlegible Next for UI. Drawn SVG icons, no emoji in chrome.

STORY: The teacher sees the whole class at a glance, taps a plate's award button, and the creature reacts on its plate while the class watches; progress reads as a field journal filling up.

FIRST VIEWPORT: Green cloth header (icon + "Classroom Creatures" in gilt, class picker, tabs, Present in marigold). Below on sage endpaper: class title at display scale left, class goal meter and totals right; one toolbar row (award whole class, select, add; search and filters right). Then a dense grid of plates (5 across at 1440), recent-activity journal as a right column.

FORM: Naturalist's creature field guide, candidate 6 of 7 on the ordered list (sticker album, trading-card binder, adventure map, teacher stamp card, sports day, field guide, bulletin board). seed:d4bf6eaaae2a8ebf

Raises:
- From the orienteering map (declined): marigold is reserved for the active thing only, never decoration.
- From the catalog sleeve (declined): every species carries a field number (No. 001-030) used identically on plates, the dex and the profile, and the dex is ordered by it.
- From the airport wayfinding (competitive, clarity): Present mode and the profile set level and XP numerals at monumental scale, one message per band.
- From the character goods catalog (competitive, identification): each species keeps fixed furniture (field number, name, one-line field note) and its element colour as a fixed ribbon on every surface.
- From the boarding pass (declined): the just-awarded plate keeps a marigold mark until the next award, so a change stays lit until noticed.
- From the type specimen (declined): hierarchy by scale contrast alone, on one strict type scale, no tracked-caps labels.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
