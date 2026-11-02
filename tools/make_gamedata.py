#!/usr/bin/env python3
"""Reads the game's Data folder (Core + DLC Defs) and writes renderer/gamedata.js: real lists of stats, research, materials,
workbenches, projectiles and shot sounds, so the mod builder's pick lists come from the actual game.
usage: python3 -I tools/make_gamedata.py <Data folder> <out gamedata.js> [out apparel_slots.json]"""
import sys, os, json, re
import xml.etree.ElementTree as ET

root, out = sys.argv[1], sys.argv[2]
defs = {}   # (tag, defName) -> element ; plus named abstract bases
named = {}  # Name attr -> element
src_of = {}
for mod in sorted(os.listdir(root)):
    dd = os.path.join(root, mod, 'Defs')
    if not os.path.isdir(dd): continue
    for dp, _, fs in os.walk(dd):
        for f in fs:
            if not f.endswith('.xml'): continue
            try: t = ET.parse(os.path.join(dp, f)).getroot()
            except Exception: continue
            for d in t:
                if d.get('Name'): named[d.get('Name')] = d
                dn = d.find('defName')
                if dn is not None and dn.text:
                    defs[(d.tag, dn.text.strip())] = d; src_of[(d.tag, dn.text.strip())] = mod

def chain(d):
    seen = 0
    while d is not None and seen < 20:
        yield d; seen += 1
        p = d.get('ParentName'); d = named.get(p) if p else None

def inherited(d, path):
    for e in chain(d):
        r = e.find(path)
        if r is not None: return r
    return None

def pretty(n): return re.sub(r'([a-z0-9])([A-Z])', r'\1 \2', n).replace('_', ' ')
def label(d, n):
    l = d.find('label')
    t = (l.text or '').strip() if l is not None and l.text else ''
    return (t[:1].upper() + t[1:]) if t else pretty(n)
def entry(tag, n, group):
    d = defs[(tag, n)]
    return {'id': n, 'label': label(d, n), 'group': group, 'src': src_of[(tag, n)]}

res = {}
res['research'] = sorted([entry('ResearchProjectDef', n, 'Research') for (t, n) in defs if t == 'ResearchProjectDef'], key=lambda e: e['label'])
stats = []
for (t, n) in defs:
    if t != 'StatDef': continue
    d = defs[(t, n)]; c = d.find('category')
    stats.append(entry(t, n, pretty(c.text.strip()) if c is not None and c.text else 'Other'))
res['stats'] = sorted(stats, key=lambda e: (e['group'], e['label']))
mats = {}
for (t, n) in defs:
    if t != 'ThingDef': continue
    d = defs[(t, n)]
    if d.get('Abstract') == 'True': continue
    sp = inherited(d, 'stuffProps/categories')   # child stuffProps merge with the parent's, so look for the categories list itself
    if sp is None: continue
    for li in sp.findall('li'):
        mats.setdefault(li.text.strip(), []).append(entry(t, n, li.text.strip()))
res['stuff'] = {k: sorted(v, key=lambda e: e['label']) for k, v in mats.items()}
def cls(d):
    c = inherited(d, 'thingClass'); return c.text.strip() if c is not None and c.text else ''
res['workbenches'] = sorted([entry('ThingDef', n, 'Workbenches') for (t, n) in defs if t == 'ThingDef' and defs[(t, n)].get('Abstract') != 'True' and cls(defs[(t, n)]) in ('Building_WorkTable', 'Building_WorkTableHeatPush') ], key=lambda e: e['label'])
res['projectiles'] = sorted([entry('ThingDef', n, 'Projectiles') for (t, n) in defs if t == 'ThingDef' and defs[(t, n)].get('Abstract') != 'True' and inherited(defs[(t, n)], 'projectile') is not None], key=lambda e: e['id'])
sounds = {'shot': [], 'work': [], 'explosion': []}
expl_used = {g.text.strip() for d in defs.values() for g in d.iter('soundExplode') if g.text}
for (t, n) in defs:
    if t != 'SoundDef': continue
    if n.startswith('Shot_'): sounds['shot'].append({'id': n, 'label': pretty(n[5:]) + ' shot', 'group': 'Shot sounds', 'src': src_of[(t, n)]})
    elif n.startswith('Explosion_') or n in expl_used: sounds['explosion'].append({'id': n, 'label': pretty(re.sub(r'^Explosion_', '', n)) + ' explosion', 'group': 'Explosion sounds', 'src': src_of[(t, n)]})
    elif n.startswith('Recipe_'): sounds['work'].append({'id': n, 'label': pretty(n[7:]) + ' work sound', 'group': 'Work sounds', 'src': src_of[(t, n)]})
res['sounds'] = {k: sorted(v, key=lambda e: e['id']) for k, v in sounds.items()}
res['effecters'] = sorted([{'id': n, 'label': pretty(n), 'group': 'Work animations', 'src': src_of[(t, n)]} for (t, n) in defs if t == 'EffecterDef' and n in ('Tailor', 'Smith', 'Cook', 'Drill', 'Sculpt', 'Research', 'Clean', 'Repair')], key=lambda e: e['id'])
res['designations'] = sorted([entry('DesignationCategoryDef', n, 'Build menu tabs') for (t, n) in defs if t == 'DesignationCategoryDef'], key=lambda e: e['label'])
# names the game already uses, so the builder can stop a mod item from clashing with a vanilla defName
res['names'] = {t: sorted(n for (tt, n) in defs if tt == t and defs[(tt, n)].get('Abstract') != 'True') for t in ('ThingDef', 'HairDef', 'BeardDef', 'HeadTypeDef', 'BodyTypeDef', 'BiomeDef', 'TerrainDef', 'HediffDef', 'GeneDef', 'XenotypeDef')}

def cat(d):
    c = inherited(d, 'category'); return c.text.strip() if c is not None and c.text else ''
res['damages'] = sorted([dict(entry('DamageDef', n, 'Damage types'), named=(defs[(t, n)].get('Name') == n)) for (t, n) in defs if t == 'DamageDef' and defs[(t, n)].get('Abstract') != 'True'], key=lambda e: e['label'])
def trait_label(n):
    d = defs[('TraitDef', n)]; l = d.find('degreeDatas/li/label')
    t = (l.text or '').strip() if l is not None and l.text else ''
    return (t[:1].upper() + t[1:]) if t else pretty(n)
res['traits'] = sorted([{'id': n, 'label': trait_label(n), 'group': 'Traits', 'src': src_of[(t, n)]} for (t, n) in defs if t == 'TraitDef'], key=lambda e: e['label'])
def gene_group(n):
    c = defs[('GeneDef', n)].find('displayCategory'); return pretty(c.text.strip()) if c is not None and c.text else 'Genes'
res['genes'] = sorted([{'id': n, 'label': label(defs[(t, n)], n), 'group': gene_group(n), 'src': src_of[(t, n)]} for (t, n) in defs if t == 'GeneDef' and defs[(t, n)].get('Abstract') != 'True' and defs[(t, n)].find('label') is not None], key=lambda e: (e['group'], e['label']))
res['mentalStates'] = sorted([entry('MentalStateDef', n, 'Mental states') for (t, n) in defs if t == 'MentalStateDef' and defs[(t, n)].get('Abstract') != 'True' and defs[(t, n)].find('label') is not None], key=lambda e: e['label'])
res['hediffs'] = sorted([entry('HediffDef', n, 'Conditions') for (t, n) in defs if t == 'HediffDef' and defs[(t, n)].get('Abstract') != 'True'], key=lambda e: e['label'])
# things a projectile explosion could leave behind: filth, items, buildings, plants (never pawns)
spawn = []
for (t, n) in defs:
    if t != 'ThingDef': continue
    d = defs[(t, n)]
    if d.get('Abstract') == 'True' or d.find('label') is None and not any(e.find('label') is not None for e in chain(d)): continue
    c = cat(d); g = {'Item': 'Items', 'Building': 'Buildings', 'Plant': 'Plants', 'Filth': 'Filth'}.get(c)
    if g is None and cls(d) in ('Filth',): g = 'Filth'
    if g is None or inherited(d, 'projectile') is not None: continue
    spawn.append(entry(t, n, g))
res['spawnables'] = sorted(spawn, key=lambda e: (e['group'], e['label']))
gases = set()
for (t, n), d in defs.items():
    for g in d.iter('postExplosionGasType'):
        if g.text: gases.add(g.text.strip())
res['gasTypes'] = sorted(gases)
# ---- biome data: wild animals / plants (with their numeric stats, for "all animals with stat >= X" rules), terrains, weather, diseases ----
def stat_map(d):
    out = {}
    for e in reversed(list(chain(d))):          # parents first, the child's own values win
        sb = e.find('statBases')
        if sb is None: continue
        for s in sb:
            try: out[s.tag] = float((s.text or '').strip())
            except ValueError: pass
    return out
def real(t, n): return defs[(t, n)].get('Abstract') != 'True'
animals = []
for (t, n) in defs:
    if t != 'PawnKindDef': continue
    r = defs[(t, n)].find('race')
    race = defs.get(('ThingDef', r.text.strip())) if r is not None and r.text else None
    if race is None: continue
    intel = inherited(race, 'race/intelligence')
    # RaceProperties.intelligence defaults to Animal; humanlikes and mechs set it (or the Mechanoid flesh) explicitly
    if intel is not None and (intel.text or '').strip() != 'Animal': continue
    ft = inherited(race, 'race/fleshType')
    if ft is not None and (ft.text or '').strip() == 'Mechanoid': continue
    if inherited(race, 'race/hasGenders') is None and inherited(race, 'race/thinkTreeMain') is None: continue
    animals.append(dict(entry(t, n, 'Animals'), stats=stat_map(race)))
races = []
for (t, n) in defs:
    if t != 'ThingDef' or not real(t, n): continue
    d = defs[(t, n)]
    if inherited(d, 'race') is None: continue
    intel = inherited(d, 'race/intelligence'); ft = inherited(d, 'race/fleshType')
    mech = ft is not None and (ft.text or '').strip() == 'Mechanoid'
    grp = 'Mechanoids' if mech else ('People' if intel is not None and (intel.text or '').strip() == 'Humanlike' else 'Animals')
    if inherited(d, 'label') is None and d.find('label') is None: continue
    races.append(entry(t, n, grp))
res['races'] = sorted(races, key=lambda e: (e['group'], e['label']))
res['bodyParts'] = sorted([entry('BodyPartDef', n, 'Body parts') for (t, n) in defs if t == 'BodyPartDef'], key=lambda e: e['label'])
res['animals'] = sorted(animals, key=lambda e: e['label'])
plants = []
for (t, n) in defs:
    if t != 'ThingDef' or not real(t, n): continue
    d = defs[(t, n)]
    if inherited(d, 'plant') is None or cat(d) != 'Plant': continue
    plants.append(dict(entry(t, n, 'Plants'), stats=stat_map(d)))
res['plants'] = sorted(plants, key=lambda e: e['label'])
res['terrains'] = sorted([entry('TerrainDef', n, 'Terrain') for (t, n) in defs if t == 'TerrainDef' and real(t, n)], key=lambda e: e['label'])
res['weathers'] = sorted([entry('WeatherDef', n, 'Weather') for (t, n) in defs if t == 'WeatherDef' and real(t, n)], key=lambda e: e['label'])
res['diseaseIncidents'] = sorted([entry('IncidentDef', n, 'Diseases') for (t, n) in defs if t == 'IncidentDef' and n.startswith('Disease_')], key=lambda e: e['label'])
res['ambientSounds'] = sorted([entry('SoundDef', n, 'Ambient sounds') for (t, n) in defs if t == 'SoundDef' and n.startswith('Ambient_')], key=lambda e: e['label'])
res['biomeWorkers'] = sorted({(d.find('workerClass').text or '').strip() for (t, n), d in defs.items() if t == 'BiomeDef' and d.find('workerClass') is not None} - {''})
res['biomes'] = sorted([entry('BiomeDef', n, 'Biomes') for (t, n) in defs if t == 'BiomeDef'], key=lambda e: e['label'])

res['_counts'] = {k: (len(v) if isinstance(v, list) else {a: len(b) for a, b in v.items()}) for k, v in res.items()}
js = "// generated by tools/make_gamedata.py from the game's Data folder; do not edit by hand\n(function (r, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else r.GameData = f(); })(typeof self !== 'undefined' ? self : this, function () { return " + json.dumps(res, separators=(',', ':'), ensure_ascii=False) + '; });\n'
open(out, 'w', encoding='utf-8').write(js)
print(res['_counts'], len(js) // 1024, 'KB')

# apparel item folder -> "head" or "body", used by the art importer to sort Apparel into Apparel-Head / Apparel-Body.
if len(sys.argv) > 3:
    slots = {}
    for (t, n), d in defs.items():
        if t != 'ThingDef' or d.get('Abstract') == 'True': continue
        w = inherited(d, 'apparel/wornGraphicPath')
        if w is None or not w.text: continue
        m = re.search(r'Apparel/([^/]+)', w.text.replace('\\', '/'))
        if not m: continue
        layers = inherited(d, 'apparel/layers'); groups = inherited(d, 'apparel/bodyPartGroups')
        ls = {li.text.strip() for li in (layers.findall('li') if layers is not None else [])}
        gs = {li.text.strip() for li in (groups.findall('li') if groups is not None else [])}
        head = bool(ls & {'Overhead', 'EyeCover'}) or bool(gs & {'UpperHead', 'FullHead', 'Eyes', 'Mouth'})
        k = m.group(1).lower()
        slots[k] = 'head' if (head or slots.get(k) == 'head') else 'body'
    json.dump(slots, open(sys.argv[3], 'w'), indent=0, sort_keys=True)
    print('apparel slots:', len(slots), 'head:', sum(1 for v in slots.values() if v == 'head'))


# ---- every vanilla / DLC thing with its resolved stats, ingredients, workbenches and research, for the patch editor (defdata.js next to gamedata.js)
def merged(d, path):
    out = {}
    for e in reversed(list(chain(d))):           # oldest parent first, child overrides
        node = e.find(path)
        if node is None: continue
        for c in node:
            if c.tag is ET.Comment or c.text is None: continue
            out[c.tag] = (c.text or '').strip()
    return out
KIND_SKIP = ('Projectile', 'Filth', 'Mote', 'Gas', 'Ethereal', 'Attachment', 'Unknown')
things = {}
for (t, n) in defs:
    if t != 'ThingDef' or not real(t, n): continue
    d = defs[(t, n)]
    if d.find('label') is None and inherited(d, 'label') is None: continue
    cat = inherited(d, 'category'); cat = cat.text.strip() if cat is not None and cat.text else ''
    if cat in KIND_SKIP or not cat: continue
    israce = inherited(d, 'race') is not None
    kind = 'Animals and pawns' if israce else ('Weapons' if inherited(d, 'weaponTags') is not None or inherited(d, 'equipmentType') is not None else ('Apparel' if inherited(d, 'apparel') is not None else ('Plants' if cat == 'Plant' else ('Buildings' if cat == 'Building' else 'Items'))))
    st = merged(d, 'statBases'); cost = merged(d, 'costList')
    rm = inherited(d, 'recipeMaker')
    users = None; research = ''
    if rm is not None:
        ru = inherited(d, 'recipeMaker/recipeUsers')
        users = [li.text.strip() for li in ru.findall('li')] if ru is not None else []
        rp = inherited(d, 'recipeMaker/researchPrerequisite'); research = (rp.text or '').strip() if rp is not None and rp.text else ''
    if kind in ('Animals and pawns',) and not st: continue
    e = {'l': label(d, n), 'k': kind, 'src': src_of[(t, n)]}
    if st: e['s'] = {k: v for k, v in st.items() if v}
    tx = inherited(d, 'graphicData/texPath'); gcn = inherited(d, 'graphicData/graphicClass')
    if tx is not None and tx.text:
        e['tx'] = tx.text.strip().replace('\\', '/')
        if gcn is not None and gcn.text: e['gc'] = gcn.text.strip().replace('Graphic_', '')
    if kind == 'Apparel':
        wp = inherited(d, 'apparel/wornGraphicPath')
        if wp is not None and wp.text and wp.text.strip():
            e['wp'] = wp.text.strip().replace('\\', '/')
            layers = inherited(d, 'apparel/layers'); groups = inherited(d, 'apparel/bodyPartGroups')
            ls = {li.text.strip() for li in (layers.findall('li') if layers is not None else [])}
            gs = {li.text.strip() for li in (groups.findall('li') if groups is not None else [])}
            e['bd'] = not (bool(ls & {'Overhead', 'EyeCover'}) or bool(gs & {'UpperHead', 'FullHead', 'Eyes', 'Mouth'}))
    if cost: e['c'] = {k: v for k, v in cost.items() if v}
    if users is not None: e['w'] = users
    if research: e['r'] = research
    things[n] = e
outd = os.path.join(os.path.dirname(os.path.abspath(out)), 'defdata.js')
with open(outd, 'w') as f:
    f.write('// generated by tools/make_gamedata.py; do not edit by hand\n(function (r, f) { if (typeof module === "object" && module.exports) module.exports = f(); else r.DefData = f(); })(typeof self !== "undefined" ? self : this, function () { return ' + json.dumps({'things': things}, separators=(',', ':')) + '; });\n')
print('defdata things:', len(things), os.path.getsize(outd) // 1024, 'KB')


# ---- sounds and head position of vanilla animals, for "copy from" in the animal builder (goes into defdata.js too)
profiles = {}
for (t, n) in defs:
    if t != 'ThingDef' or not real(t, n): continue
    d = defs[(t, n)]
    ra = inherited(d, 'race')
    if ra is None: continue
    intel = inherited(d, 'race/intelligence'); ft = inherited(d, 'race/fleshType')
    if (intel is not None and (intel.text or '').strip() != 'Animal') or (ft is not None and (ft.text or '').strip() == 'Mechanoid'): continue
    if inherited(d, 'race/thinkTreeMain') is None: continue
    ls = inherited(d, 'race/lifeStageAges')
    snd = {}
    if ls is not None:
        for li in ls.findall('li'):
            for k, tag in (('wounded', 'soundWounded'), ('death', 'soundDeath'), ('call', 'soundCall'), ('angry', 'soundAngry')):
                e = li.find(tag)
                if e is not None and e.text: snd[k] = e.text.strip()
    if len(snd) < 4: continue
    m = {}
    for k, tag in (('hitPawn', 'soundMeleeHitPawn'), ('hitBuilding', 'soundMeleeHitBuilding'), ('miss', 'soundMeleeMiss'), ('eating', 'soundEating')):
        e = inherited(d, 'race/' + tag)
        if e is not None and e.text: m[k] = e.text.strip()
    hp = inherited(d, 'race/headPosPerRotation')
    h = [li.text.strip() for li in hp.findall('li')] if hp is not None else []
    profiles[n] = {'l': label(d, n), 'src': src_of[(t, n)], 'snd': snd, 'm': m, 'h': h}
with open(outd) as f: txt = f.read()
txt = txt.replace('{"things":', '{"profiles":' + json.dumps(profiles, separators=(',', ':')) + ',"things":', 1)
with open(outd, 'w') as f: f.write(txt)
print('animal profiles:', len(profiles))
