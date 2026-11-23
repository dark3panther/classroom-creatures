#!/usr/bin/env bash
# Boss sprites, end to end: Blender builds each rigged model, SpriteCast renders it ("draw": false,
# free: the toon renders are the frames), then export_sprites.py packs the front-facing strips
# into public/bosses3d/ for the app.
#
#   BLENDER=/path/to/blender SPRITECAST_PY=~/.cache/spritecast/venv/bin/python scripts/bosses-3d/render_all.sh [ids...]
#
# JOBS (default 3) renders that many bosses at once.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"; ART="$ROOT/art/bosses-3d"
BLENDER="${BLENDER:-blender}"
PY="${SPRITECAST_PY:-$HOME/.cache/spritecast/venv/bin/python}"
CHARPIPE="${CHARPIPE:-$ROOT/../dark3panther/spritecast/skills/spritecast/scripts/charpipe.py}"
JOBS="${JOBS:-3}"
IDS=("$@"); [ ${#IDS[@]} -eq 0 ] && IDS=(grumblethorn mudsnout glimmerjaw murkmoth puffington snowsulk magmaw zapcrackle snorecap whirlwing colossus riddlepaw)

"$BLENDER" -b --python-exit-code 1 -P "$HERE/build.py" -- "${IDS[@]}" 2>&1 | grep -E '^built|Error|Traceback' || true
python3 "$HERE/specs.py" "${IDS[@]}"

one() {
  local id="$1"
  ( cd "$ART" && "$PY" "$CHARPIPE" render "$id.json" && "$PY" "$CHARPIPE" finish "$id.json" ) > "$ART/$id.log" 2>&1 \
    && echo "rendered $id" || { echo "FAILED $id (see $ART/$id.log)"; return 1; }
}
export -f one; export ART PY CHARPIPE
printf '%s\n' "${IDS[@]}" | xargs -P "$JOBS" -I{} bash -c 'one {}'
python3 "$HERE/export_sprites.py"
