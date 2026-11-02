#!/usr/bin/env bash
# Runs every check. usage: bash test/run_all.sh <scratchDir>   (scratchDir holds the fake game "g" and "s", see make_fake_game.py)
S="${1:?scratch dir}"; cd "$(dirname "$0")/.."; fail=0
run() { name="$1"; shift; out=$(timeout 180 "$@" 2>&1 | tail -1); case "$out" in *_OK|*ok|*OK*|*passed*) printf '  ok   %s\n' "$name";; *) printf '  FAIL %s: %s\n' "$name" "$out"; fail=1;; esac; }
for t in lists_check walls_check floors_check plants_check crafting_check gene_builder_check ability_check hediff_check food_check research_check recipe_check mech_check trait_check incident_check refaudit_check loganalyzer_check log_ui_check animal_check xmlfile_check melee_effects_check implant_check xenotype_check items_check biome_check biome_ui_check walls_ui_check buildings_check fit_check scroll_check builder_check empty_check projectile_check sounds_check undo_check update_check update_ui_check; do run $t node test/$t.js "$S"; done
run round_check node test/round_check.js "$S/g"
for t in modbuilder_check behavior_check variants_check beard_check layers_check stretch_check asset_edit_check; do run $t node test/$t.js "$S/g" "$S/s"; done
run dds_ui_check node test/dds_ui_check.js "$S/g" "$S/s"
run genes_check node test/genes_check.js "$S/g" "$S/gp" "$S/ge.png"
run render_check node test/render_check.js "$S/g" "$S/rc.png"
run importer.test node test/importer.test.js "$S"
run modgen.test node test/modgen.test.js
run dds.test node test/dds.test.js
run unsplit.test node test/unsplit.test.js
run indexer.test node test/indexer.test.js "$S"
exit $fail
