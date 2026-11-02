# RimWorld Sprite Viewer (v0.1)

A visual checker for RimWorld modders. Load the game's own sprites, drop your custom
body / head / hair / apparel / gene overlay / weapon art on top, and see how it lines up in all
four facings before you ever launch the game.

It only reads image files and the body-type XML, so the engine change in RimWorld 1.7 (Waylith) doesn't
affect the viewer itself. Getting the vanilla art out of the game is the one extra step: see below.

## Run it (Windows)

**Easiest: the setup package.** Unzip `RimWorldSpriteViewer-setup.zip`, double-click `Install.bat`
(it downloads the official Electron runtime once, about 130 MB, checks its SHA-256, and builds the app
folder), then run `RimWorldSpriteViewer\RimWorldSpriteViewer.exe`. Windows SmartScreen may warn about an
unsigned app: click "More info" then "Run anyway".

**Or from source:**

1. Install Node.js (LTS) from nodejs.org.
2. In this folder: `npm install`, then `npm start`.
3. To build a standalone folder with an `.exe`: `npm run pack:win` (output in `dist/`).

## Run it (Linux / Bazzite)

Unzip `RimWorldSpriteViewer-setup.zip`, then run the installer from a terminal:

    cd ~/Downloads
    unzip RimWorldSpriteViewer-setup.zip      # or: python3 -m zipfile -e RimWorldSpriteViewer-setup.zip .
    bash RimWorldSpriteViewer-setup/install-linux.sh

It installs under your home folder only (no sudo, nothing system-wide, fine on immutable systems like
Bazzite). It downloads the official Electron runtime once (about 110 MB, SHA-256 checked) and adds
"RimWorld Sprite Viewer" to your application menu, plus a `rimworld-sprite-viewer` command in `~/.local/bin`.
Re-running the script after replacing the `app` folder updates the app without downloading again.

If the window won't open and the error mentions the sandbox, start it with
`RSV_NO_SANDBOX=1 rimworld-sprite-viewer`.

Uninstall: `rm -rf ~/.local/share/rimworld-sprite-viewer ~/.local/bin/rimworld-sprite-viewer ~/.local/share/applications/rimworld-sprite-viewer.desktop ~/.config/rimworld-sprite-viewer`

The folder picker defaults to nothing: use **Add folder...** and pick your RimWorld folder
(Steam: `~/.local/share/Steam/steamapps/common/RimWorld`; Flatpak Steam:
`~/.var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps/common/RimWorld`). Both are also
tried automatically on first launch.

## Getting the vanilla sprites in (important)

RimWorld keeps most of its art **packed inside its game data files**, not as loose PNGs. Extract it with
a tool such as AssetStudio (see the wiki page "Modding Tutorials/Assets"), then:

1. **Add folder as...** your RimWorld install folder (Auto-detect). It is only read, never changed, and
   supplies the body-type XML (head offsets). It is tried automatically on first launch.
2. **Add folder as...** each folder of extracted sprites. Pick what it contains in the box next to the
   button (Bodies, Heads, Hair, Apparel, Weapons, Genes, Other, or Auto-detect). Every sprite in that
   folder is filed under that category, so you do not depend on name guessing. The category can be
   changed later from the drop-down on the folder's row.
3. **`.png.dds` files are read directly** (DXT1/DXT3/DXT5, uncompressed, and BC7 through the GPU).
   No GIMP conversion. If a DDS looks upside-down, tick "DDS files are upside-down".
4. **Facings are grouped automatically.** `Naked_Female_south.png.dds`, `_east`, `_north` (and `_west`
   if present) become ONE sprite. If a PNG twin exists, the PNG is used. "Add from file..." and
   drag-and-drop accept several files and DDS; picking any one facing finds its siblings.

Click an asset in the library to edit its settings (type, hat or not, hides hair, sits on the head,
draw size); double-click it or press "Add to pawn" to put it on the pawn. Ctrl/Shift+click selects several
assets so one setting applies to all. The settings are remembered. Delete removes the selected layer.
No name guessing is done for hats: set each one once.

Other tools: "Save as asset default" (layer panel) remembers an asset's offsets, size and tint for every
facing; the **Body types** view shows your pawn and clothes on every body type side by side; the head and
hair arrows step through the library; skin and hair colour presets; "Export asset settings" backs up
everything you set per asset.

If a sprite is invisible, the app now says why (undecodable, unsupported DDS format, fully transparent).
"Copy diagnostics" puts a report on the clipboard that you can paste back to me.

I could not confirm what texture format 1.7 uses, nor whether extraction tools support 1.7 yet.

## Using it

- **Library** (left): browse the game's bodies, heads, hair, apparel and weapons, click to add a layer.
- **Add from file...**: add your own sprite. Pick any one facing; the `_south`, `_east`, `_north`
  (and `_west`) siblings are found automatically. Saving the PNG in your art program refreshes
  the preview live.
- **Layers** (right): visibility, order, tint (skin / hair / custom), draw size, per-facing
  offset and angle, "draw behind body", "follow head offset", flip.
- **Drag** the selected layer in the viewport, or use the arrow keys (Shift = bigger steps).
  West is mirrored from East unless you provide a `_west` sprite, like the game does.
- A warning appears on layers missing a facing, or whose facings have different pixel sizes.
- **Undo / redo** with Ctrl+Z / Ctrl+Y (drags, nudges, edits, add/remove, reorder).
- **Sort like the game** puts layers in the usual draw order (body, torso apparel, head, genes,
  hair, headgear, weapon). Apparel has a "Worn on" setting, and headgear can be set to
  **hide hair** to check hat/hair clipping.
- **Opacity** per layer, mouse-wheel zoom, and drag-and-drop of PNGs from Explorer onto the window.
- **Copy XML values** gives draw size and per-facing offsets as a starting snippet. The field
  names there are from memory and not verified against 1.7, so compare with a vanilla def
  before using them.
- Zoom, background, grid and colours are remembered between launches.
- **Save / Open project** (JSON) and **Export PNG** (all four facings).

## Known limits of v0.1

- The preview is an approximation of RimWorld's renderer: layer order, tinting and offsets are
  simplified, so confirm final values in game once. Treat the numbers as a starting point.
- Gene overlays, hair-behind-body and apparel use the same generic layer model; there are no
  per-body-type offset tables yet.
- No mod generation yet. That is the planned next step (weapons / apparel / recipes first).

## Tests

- `npm test` : indexer tests against a generated fake game folder (placeholder art only).
- `node test/render_check.js <fakeGameDir> out.png` : loads the real UI in Chromium
  (needs `playwright`), draws a pawn and fails on any script error.
- `node test/real_install_check.js <scratchDir>` : the real-install scenario (XML-only game folder + flat
  dump of extracted sprites, adding/removing folders, Other tab, Shift+click).
- `node test/behavior_check.js <fakeGameDir> <scratchDir>` : checks undo/redo, dragging,
  hat-hides-hair, sort order, XML values, the size warning, zoom and saved settings.
  (Fake folders: `python3 test/make_fake_game.py <dir> structured|flat|defs`.)

These tests run the interface in Chromium with the Electron bridge stubbed. The real Electron
window, folder picker, file watching and drag-and-drop paths have not been run yet.

## Mod builder (first foundation)

Press **Mod builder** in the toolbar (or **Send to mod builder** on a layer). It builds a mod folder with
`About/About.xml`, `Defs/...` and `Textures/...` for **apparel, weapons, hair, heads and bodies**:
- apparel: worn-as presets (shirt, jacket, shell, pants, belt, hat, helmet, eyewear), stats, extra stats,
  stat offsets, tech level, tags, recipe (workbench, research, skill, materials or fixed ingredients);
- weapons: ranged (projectile, range, burst...) or melee (attacks), same stats and recipe options;
- sprites come from the viewer's selected layer, library selection, or files; DDS is converted to PNG on export;
- every list has a custom defName field for modded benches, resources, stats or research;
- the right panel lists problems and previews each generated file before you export.

The vanilla defNames (benches, materials, parents like ApparelMakeableBase / BaseHumanMakeableGun) and XML
fields are written from memory of RimWorld 1.4-1.6 and are **not verified for 1.7**: the files say so.
Body types are experimental. Genes and quests are not built yet.

## Mod builder: lists and custom entries
Every list in the mod builder (stats, workbenches, resources, research, projectiles, sounds, tags, body parts) is a searchable
pick list with friendly names. A "?" next to a name means it was not verified in the 1.7 game files. Each list has an
"add your own ID" form (for modded stats, benches, resources...). Your entries are saved either in the project file or in a
personal list used by every project, and can be edited or removed from the same list.
"Item properties" are values of the item itself (armour, mass...). "Bonuses to the wearer" are added to whoever uses it.
"How it is made" picks the unfinished item, work sound and animation (Tailoring, Machining, High-tech armour, Gunsmithing, Smithing).
Your app folders (Library, Mods) are created in Documents/RimWorldSpriteViewer; the buttons in the left panel open them.

## Buildings (updates 1-2 of 5)
The mod builder has a Building item: decoration, table, chair, workbench or other. Structure copied from vanilla 1.7 defs (BuildingBase,
FurnitureBase, TableBase, BenchBase, DiningChair, Table2x2c, HandTailoringBench). Workbenches can use power. Not loaded in game yet.
Pick lists now come from the game's own Data folder (`tools/make_gamedata.py` writes `renderer/gamedata.js`): all stats, research, materials, workbenches, projectiles.

### Walls and boosters
"Kind of building" also offers **Wall** and **Booster**. A wall takes one sheet of 16 connecting pieces (4 x 4 cells; "smooth corners" uses the vanilla 320 x 320 sheet with 80 px cells, "plain" uses 256 x 256 like sandbags). Cell number = which sides connect (up 1, right 2, down 4, left 8), counted from the bottom-left. Optionally one sheet per material look (smooth / bricks / planks, `Graphic_Appearances`). Custom stats work on walls too. A **Booster** writes `CompProperties_Facility` (stat offsets, how many count, must touch, reach). Boosters targeting a building of the same mod add the matching `CompProperties_AffectedByFacilities` directly; vanilla or other targets get a small `Patches/Boosters_<target>.xml` (a conditional add, skipped silently when the target has no booster list of its own). Structure copied from the vanilla Wall, Sandbags, VitalsMonitor and tool cabinet; the file names for per-material sheets follow the vanilla `Wall/Wall_Atlas_Smooth` pattern. Not loaded in game yet.

### Items
Mod builder ▸ "+ Item": a **resource** (like steel or components: stack size, storage category, drop sound, value, mass, hit points, flammability, deterioration, custom stats) or a **chunk** (like slag, with optional smelting products). A resource can also be a building / weapon / apparel **material** (category, wall look, colour, armour / insulation / damage strength, effect on buildings) and/or **underground ore** (deep drill commonality, amount, lump size). Items of the mod show up in the "Fixed ingredients" and smelting pickers as "(this mod)". Structure copied from vanilla ResourceBase, Steel, ComponentIndustrial, ChunkBase and ChunkSlagSteel; not loaded in game yet. Rock chunks that cut into stone blocks are not covered.

### Biomes (stage 1 of 3)
Mod builder ▸ "+ Biome": world-map picture (512 x 512), travel difficulty, settlement weight, plant and animal density, plant regrowth, foraging, wild plants and animals with commonality, pack animals, ground by fertility, noise patches (ponds, other floors), weather, diseases, ambient sounds. In the wild lists, a **Rule** row ("every animal with Y at least X") is resolved at export time against the game data plus the mods you scanned ("Scan other mods…" reads their Defs; the animals and plants with their `statBases` are kept in the project file); a specific entry always wins over a rule, and DLC things get `MayRequire`. The game cannot evaluate such rules at runtime, so mods you did not scan are not included until you rescan and re-export. A biome without a vanilla "placed like" choice is written with `generatesNaturally=false` (copied from Underground); picking a vanilla one reuses its placement program, so it competes with that biome. Structure copied from the vanilla temperate forest; not loaded in game yet. `tools/make_gamedata.py` now also reads animals, plants, terrains, weather, diseases and ambient sounds. Stage 2: approximate preview map. Stage 3: own floors, plants and rocks.

## Roadmap (not built yet)
- Custom projectiles: own picture, explosive or not, effect on the target (toxic buildup or a custom effect). Weapons pick them from the Projectile list.
- Melee weapons: effect on hit (same idea as projectiles).
- Design rule for all of these: easy options first, always an "own ID" / own XML way for people who know what they are doing.
- Stat changes per quality or per material (needs a decision on how: patch, own stat, or code).
- Genes with real data, tail/wing layering, weapon holding positions, Assets.zip import button, Windows installer test.

## Import the game's art
Button "Import RimWorld art" (left panel; "…" lets you pick the RimWorld folder). It finds your install (usual Steam locations, or asks), reads `Assets.zip`
of the core game (in the game folder) and of each DLC (`Data/<DLC>/Assets.zip`), and copies bodies, heads, hair, beards, apparel (sorted into Apparel-Head /
Apparel-Body using the game's own definitions), weapons and genes into the Library folders. `X.png.dds.split` is renamed `X.png.dds` (they are ordinary DDS images).
Sounds, shaders, buildings and colour masks are skipped. Safe to run again: files already there are left alone.

## Your own XML (all items)
Every item has an optional "Your own XML" box (for advanced users, or XML written by an AI). It is pasted inside the item's definition, checked for
well-formedness while you type, and the builder warns if it repeats a tag the builder already writes.

## Adjusting pictures (square fit)
"Adjust picture…" in the mod builder opens a small editor: drag to move, wheel/slider to zoom, "Fit whole picture", "Fill the square", ±10%. Anything outside the
square frame is cut off at export; your original file is never changed. The viewer's size (±10%, draw size) and per-view offsets are baked in automatically
when you send a layer to the builder, so the game shows what you saw (they only changed the viewer's drawing before). Weapons keep their draw size in the def.

## Interface notes
Long explanations now live in small ⓘ bubbles (click to open, click elsewhere or Esc to close): next to "Asset folders", the Mod builder title, and beside every mod-builder field that has a hint. Rarely used buttons (DDS upside-down, Copy diagnostics, Export/Import asset settings) are under the collapsed "Tools & backup" section in the left panel.

## Projectiles
Mod builder ▸ "+ Projectile" makes a projectile with your own picture: damage type and amount, speed, stopping power, armour penetration, arc, glow, and optional explosion (radius, a thing left before and/or after the blast, a gas cloud). "Also inflicts this condition on hit" (toxic buildup, food poisoning, or any modded condition by ID) writes a small custom damage type based on the damage type you pick (the same way the vanilla toxic bullet is made). Spawnable things are items, filth, buildings and plants (not living creatures). Weapons list the projectiles of your mod in their Projectile picker. Structure follows vanilla Bullet_Revolver, the incendiary and smoke launcher shells and the Biotech toxic bullet damage type; not yet loaded in game.

## Unsaved work
Closing the app with unsaved changes (pawn preview or mod project) asks first. Opening or starting a new mod project asks too. Saving clears it.

## Your own sounds, explosion colours, unfinished items
- **Own sound file:** wherever the builder asks for a sound (gun shot, projectile explosion, crafting work sound) there is "Use my own sound file…" (.wav or .ogg, up to 1.5 MB; short clips). The builder writes the SoundDef and copies the file into the mod's Sounds folder. A volume box and a Play button appear next to it. The audio is stored inside the project file. Structure follows the vanilla Shot_Revolver, Explosion_Bomb and Recipe_Tailor sound defs; not yet tested in game.
- **Explosion colours** (projectiles): centre and edge colour; makes a custom damage type based on the one you choose.
- **Own unfinished item picture** (recipe section of apparel and weapons): makes a new unfinished item from the vanilla UnfinishedBase and uses it on the bench.

## For developers: how the code is organised
Renderer scripts are plain scripts that share globals; the order is in `renderer/index.html`.
- Viewer: `core.js` (state, image loading), `layers.js` (layers, undo), `render.js`, `library.js`, `panels.js` (layer list and properties), `interaction.js`, `project.js` (save/load/PNG), `startup.js`, `help.js` (ⓘ bubbles, unsaved-work check).
- Mod builder: `modschema.js` (what exists: item types, fields, lists), `modgen.js` (items -> XML files), `picker.js` (pick lists), then `modui.js` (shared state, helpers), `modsprites.js` (pictures, adjust window, PNG export), `modcontrols.js` (one function per form control type), `modbuilder.js` (screens, export, buttons).
- Main process: `main.js`, `preload.js`, `lib/` (indexer, importer, zip reader).
- Game data lists are generated: `python3 -I tools/make_gamedata.py <Data folder> renderer/gamedata.js lib/apparel_slots.json`.
- Tests: `bash test/run_all.sh <scratch dir>` (needs Playwright; the scratch dir holds the fake game from `test/make_fake_game.py`). Code style: `prettier --write` with the `.prettierrc.json` in the repo root.

## RimWorld 1.7 ".dds.split" textures
The newer game stores most BC7 art as `X.png.dds.split` (a lossless rearrangement of the compressed blocks). The viewer and the
"Import RimWorld art" button now rebuild these into normal DDS automatically (read from the game's own Waylith.dll; checked on
real samples). Masks and other BC1/BC4/BC5 splits are not rebuilt yet; the importer skips them (masks were skipped already).

## Biome preview (stage 2)
The biome form has an approximate preview map (ground from the fertility bands, patches, plants and animals scattered by density and
commonality, with a summary). It is a look-and-mix preview, not the game's real map generator.

## Floors (biome stage 3, part 1)
New "Floor" type: a floor players build (picture, cost, beauty, research) or natural ground for biomes (fertility, walking cost,
edge). Floors made in the mod can be picked as ground in a biome's "Ground by fertility" and patches. Generated from the structure of
vanilla concrete and sand; not yet loaded in the game.

## Plants and natural rock (biome stage 3, part 2)
- New "Plant" type: grass or flower, bush, tree (picture, growing numbers, what harvesting gives, optional sowing). Plants made in the
  mod can be picked in a biome's "Wild plants".
- Wall builder: tick "Natural rock" to make mountain rock (stone that drops a chunk, or an ore vein that drops a resource). Build-only
  fields (cost, materials, build menu, research) are hidden. The game decides where rocks appear on maps in its own program, so a modded
  rock is mined normally but spawns only through other mods or patches.
Generated from vanilla grass / berry bush / oak and Granite / compacted steel; not yet loaded in the game.

## Crafting: chunks to blocks, item recipes, crafted buildings
- Chunk items have "Cutting it at the stonecutter gives" (the blocks item and how many). Put the chunk in the "StoneChunks" storage category and the normal stonecutter recipe cuts it.
- Items can be crafted: tick "Can be crafted" for ingredients, number made, bench, research, skill and work (the recipe goes inside the item's XML).
- Building kind "Crafted at a workbench, then placed (like a sculpture)": made at a bench (default the sculpting table) and installed afterwards; no build menu entry.
Not yet loaded in the game.

## Genes (basic)
New "Gene" type. "Body attachment" genes (tail, wings...) take a picture per direction with a layer and shift for each direction, so a tail can sit behind
the body facing south/east and in front facing north (copied from the vanilla furry/smooth tail genes). Also: category, complexity / metabolic /
archite cost, exclusion tags, stat offsets and factors, body abilities. Needs Biotech; not yet loaded in the game. Not included yet: abilities,
hair/skin colour genes, forced traits.

## Abilities
New "Ability" type, modular: pick how it is aimed (distance, touch, ground spot, self), range, warmup, cooldown, optional hemogen cost and
needed body ability, then add effect modules: give conditions (hediffs, any ID), launch a projectile (this mod's projectiles are listed),
put a thing on the ground. A gene's "Gives these abilities" picks abilities made in the mod (or any ID). Not loaded in the game yet.
More effect modules (jump, teleport, heal, mental state...) can be added one at a time.

## Conditions (hediffs)
New "Condition (hediff)" type: good or bad, lasts N hours (or until removed), changes body abilities (add / multiply), stats (add / multiply), pain
and hunger. Conditions made in the mod appear in the ability builder's "gives these conditions" list. One stage only for now; not loaded in game yet.

## Implants and bionic parts

"+ Implant / bionic part" makes three linked things at once: the item (made at a bench), the condition it puts on the pawn, and the surgery to install it. Pick **Replacement part** (like a bionic arm: replaces the natural part, with efficiency) or **Add-on implant** (like a painstopper). Set the body part(s), body-ability / stat / pain / hunger effects, optionally abilities granted (made in this mod or any ID) and a picture drawn on the pawn with per-direction layers (same system as genes). Humans only for now. The XML copies vanilla's structure but has not been loaded in game yet.

## Where a picture sits on the pawn (genes and implants)

Genes (body attachment) and implants (picture on the pawn) have a "Where it sits on the pawn" list: Tail, Wings, Back item, Extra arm, Chest overlay, On the head, or Custom. Picking one fills in the layers, offsets, size and colour per direction (you can still edit them). Tail numbers come from the vanilla furry tail; the rest are estimates, so nudge them for your picture. "On the head" uses the vanilla ear structure (head attachment, layer 70) and writes pictures to HeadAttachments. Not yet tested in game.

## Colour genes, forced traits, xenotypes

Gene "Kind of gene" now also offers **Hair colour** and **Skin colour** (pick one colour; vanilla colour icon used if you give none). Any gene can list **forced traits** (number = degree, empty if the trait has none). **+ Xenotype** makes a full xenotype: icon, short description, genes (vanilla, this mod's, or any typed ID), inheritable, list order, how often free pawns of that type appear, optional name generators. Needs Biotech. Not tested in game yet.

## More ability effects, quick delete

Abilities can now **jump** to a spot (copied from the vanilla Biotech longjump), put the target in a **mental state** (berserk, daze..., optional goodwill change), and **teleport** the target to a chosen spot or a random one nearby (copied from the Royalty skip abilities). A heal is done with a condition (stat "injury healing factor") given by the ability. Each item in the item list has a ✕ button for a quick delete (with confirmation).

## Melee on-hit effects

Melee weapons: **extra damage on every hit** (Flame, EMP, Stun... with amount and optional chance, copied from the vanilla bladelink / ultratech weapons) and **a condition given on hit** (copied from the vanilla toxic bite setup: the generator writes a copy of the attack's damage type that also adds the condition, plus a matching attack type and maneuver). Works for Cut, Stab, Blunt and Poke attacks. Not tested in game yet.

## Implants for animals and other races

Implants have a "Who it can be installed on" list (default Human colonist; 158 vanilla races from the game data, or any ID): animals, mechanoids, other mods' races. The surgery is added to those races (recipeUsers). The body parts list now holds all 141 vanilla body parts (animals have Leg, Eye, Jaw, Tail...; no Shoulder or Hand). Not tested in game yet.

## Your own XML files, patch editor and retextures

"+ Your own XML (Defs / Patch)" adds a file to the mod, in one of four ways:
- **Change an existing thing**: pick any of the ~1400 items, weapons, apparel, buildings, plants and animals of the game and its expansions (list built from the game data), see its current stats, ingredients and workbenches, and type new values (or tick "remove", add a stat / ingredient / workbench, change research, name or description). Only what you change is written, as standard PatchOperationConditional / Replace / Add / Remove operations (works whether the value is on the thing itself or inherited). Things from other mods can be typed by ID. Optionally only if a named mod is loaded.
- **Retexture**: in the same form, give a new picture; it is written to the texture path the game already uses, which overrides the original (single-picture things, things drawn per direction, and worn clothing for every body type). Things with several picture variants or linked sheets (walls, many plants) are not supported.
- **Quick patch** (one value by its path), **Patch file** and **Definitions file** (hand-written XML, wrapper added if missing, checked for well-formedness).
Files are written as `Patches/Own_<name>.xml` / `Defs/Own_<name>.xml`. Not tested in game yet; "remove" cannot remove entries a thing only inherits.
Regenerate the data with `python3 -I tools/make_gamedata.py <Data folder> renderer/gamedata.js lib/apparel_slots.json` (also writes renderer/defdata.js).

## Animals

"+ Animal" makes the race (ThingDef) and its PawnKindDef in one file. Presets (small pet like a cat, farm herd animal like a cow, wild predator like a timber wolf, bird like a chicken) fill typical vanilla numbers, attacks, sounds and trade tags; everything stays editable: body shape (its body parts), size, health, hunger, food, leather, stats (plus custom stats), training, pet-ness, life span, litter, attacks with their body part, milk or wool, combat power, wild group size and where traders sell it. Pictures: south / east / north (dessicated corpse optional). Sounds and head position are copied from a vanilla animal you choose. The animal appears in the biome builder's wild animal list. Also: separate female, baby and juvenile pictures with their names (bull / cow / calf), **eggs that hatch** (unfertilized and fertilized egg items, laying and hatching times, your own egg picture) and caravan riding speed. Not supported: animal-specific abilities. Vanilla has no mounts other than caravan riding. Not tested in game yet.

## Food, meals and drugs

In the item builder, "Kind of item" now offers **Raw food**, **Meal** and **Drug**. Raw food and meals have nutrition, food type, how much pawns like them, eating sound/animation, mood memory, recreation and days before rotting. A **meal** ticked craftable is made by a cook at a stove (FueledStove / ElectricStove by default) from the ingredients you list. A **drug** has a category (for drug policies) and a **high** that you describe: duration, mood, consciousness, movement, pain and hunger; the builder writes the condition and the mood thought for it. Tick **Can cause tolerance and addiction** on a drug to get a chemical, a need, a tolerance condition, a dependence condition and a withdrawal mood thought (chance, tolerance per dose, fade rate, withdrawal effects), copied from vanilla smokeleaf. Structure copied from vanilla MealBase, PlantFoodRawBase, DrugBase and the smokeleaf joint; not yet loaded in game.

## Research projects

**+ Research project** makes a ResearchProjectDef: cost, tech level, projects that must be researched first (vanilla, this mod's, or another mod's by ID), research bench (like the hi-tech bench), facilities such as the multi-analyzer, and its position on the research screen. By default it gets a research tab of its own named after your mod (the tab is made for you); untick that to use the Main tab or another tab's ID. Positions left empty are arranged for you: columns follow the prerequisite chain inside your mod. Items, buildings and genes already have a "Research needed" box where the projects of this mod now appear. Copied from vanilla research defs; not yet loaded in game.

## Recipes and bills

**+ Recipe (bill at a bench)** makes a RecipeDef with ingredients (specific things, or any item of a category), products, work amount, work speed and skill (with an optional minimum level), animation, sound, benches and research. "Also add a x4 bulk version" adds a second recipe using four times as much. The bill options players see (do X times, until you have X, forever) are part of the game, not of the recipe. The second kind, **Add an existing recipe to another bench**, writes a patch that adds a vanilla or modded recipe (by its ID) to more benches. Copied from vanilla pemmican and slag smelting; not yet loaded in game.

## Mechanoids (Biotech)

**+ Mechanoid (Biotech)** makes a controllable mech: a race (copied from vanilla militor, lancer and centipede), its pawn kind, and a gestation recipe that a patch adds to the mech gestator (light) or the large mech gestator (medium and heavy). Presets for Light, Medium and Heavy fill the body shape, size, armour, bandwidth, control time, attacks, guns, scrap, gestation cost, cycles and research. You give the three facing pictures, pick the sounds of a vanilla mech, and choose the work it can do (hauling, construction...). Custom stats work as usual. The faction colour overlay of vanilla mechs is not made, so the picture is drawn as is. Not yet loaded in game; the body shape must contain the body part named in each attack.

## Traits and thoughts

**+ Trait** makes a TraitDef with one degree: name, description (use {PAWN_nameDef} so the game fills in the pawn's name), how often new colonists get it, conflicts with other traits or tags, stat additions and multipliers, skill gains, refused work (like Violent for a pacifist), social fight chance, and an optional constant mood effect (written as an always-active thought for pawns with the trait). Traits with several degrees (industrious / hard worker / lazy) are not supported yet. **+ Thought (mood effect)** makes a ThoughtDef: a **memory** (remembered some days, stackable: choose it as "Mood memory after eating" on a food item), a thought **while the pawn has a condition**, or an **always** thought for pawns with certain traits or genes. Copied from vanilla; not yet loaded in game.

## Events (random incidents)

**+ Event (random incident)** makes something the storyteller can pick at random. Two kinds: a **weather / sky condition** (a new condition with your name and text that behaves like a vanilla eclipse, solar flare, aurora, toxic fallout, volcanic winter, heat wave or cold snap), and a **disease outbreak** that gives a chosen condition (yours or a vanilla disease) to a share of colonists or tame animals. Both have a chance, a minimum time between events, a first day, a letter (title, text, colour) and optional biomes. Not covered: raids, trader visits and animal arrivals (they need faction, trader and quest definitions); the Defs / Patches editor can retune the vanilla ones. Not yet loaded in game.

## Name check before you build

After building, the warnings list also names things the generated XML uses that exist neither in the vanilla game data nor in your mod: ingredients and products, benches, research projects and conditions. It is only a warning (the name may come from another mod), but it catches typos that would give an error in game.

## Game log reader

The mod builder's right column has two tabs: **Check & preview** and **Game log**. After testing your mod in RimWorld, open the Game log tab and click **Find the game log** (it looks in the usual places on Linux, Steam Flatpak, Proton, Windows and Mac), or **Choose a file…** (Player.log), or paste text. The errors about your mod are explained in plain words with what to do, and each one links to the item that caused it (found through its ID, picture path or file name). Messages from the base game or other mods are counted but kept out of the way. "Copy report for Claude" puts a short summary on the clipboard. The explanations are based on the message shapes RimWorld usually prints; unknown ones appear as "Other error" with the original text, so nothing is hidden. It has only been tested on made-up logs so far.

## Tidier mod builder
- One **+ Add item…** button opens a searchable menu of every kind of item, grouped (Gear, Things and buildings, People and looks…). Enter picks the first match, Esc closes it.
- With 8 or more items the list is grouped by kind with fold-able headers and a filter box.
- The **Mod** card folds away, and each item form has **Fold all sections / Unfold all**.

## Download, updates and releases
- Download the latest build from the **Releases** page of the GitHub repository: `RimWorldModdingTool-<version>-windows-Setup.exe` (installer) or `...-portable.exe` on Windows, `...-linux.AppImage` or `.tar.gz` on Linux.
- On start the app checks GitHub (once, silently, nothing is sent except the request itself) and shows a green **Update available** button when a newer release exists. It opens the download page; it does not install anything by itself.
- To publish a new version: raise `version` in `package.json`, commit, then `git tag v0.2.0 && git push origin v0.2.0`. The workflow in `.github/workflows/release.yml` runs the tests, builds both platforms and attaches the files to a new release.
- Not signed: Windows shows "protected your PC" (More info, then Run anyway).
