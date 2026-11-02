"""Builds a folder of PLACEHOLDER gene sprites (not RimWorld art) with presets.json, so gene layers can be tested
before the real Biotech art is available. Positions are guesses, not game values.
usage: python3 test/make_gene_fixtures.py <outdir>"""
import json, os, sys
from PIL import Image, ImageDraw

out = sys.argv[1]
tex = os.path.join(out, 'Textures', 'Things', 'Pawn', 'Humanlike')
W = (235, 235, 235, 255); OL = (80, 80, 80, 255)
S = 128

def save(rel, fn):
    for f in ('south', 'east', 'north'):
        im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im); fn(d, f)
        p = os.path.join(tex, rel + '_' + f + '.png'); os.makedirs(os.path.dirname(p), exist_ok=True); im.save(p)

def tail(d, f):
    if f == 'south':   d.ellipse([54, 96, 74, 126], fill=W, outline=OL, width=2)
    elif f == 'north': d.ellipse([54, 76, 74, 112], fill=W, outline=OL, width=2)
    else:              d.ellipse([30, 74, 66, 100], fill=W, outline=OL, width=2)
def bushy_tail(d, f):
    if f == 'south':   d.ellipse([46, 92, 82, 127], fill=W, outline=OL, width=2)
    elif f == 'north': d.ellipse([46, 72, 82, 114], fill=W, outline=OL, width=2)
    else:              d.ellipse([22, 70, 68, 104], fill=W, outline=OL, width=2)
def ears_pointed(d, f):
    if f in ('south', 'north'):
        d.polygon([(34, 52), (14, 26), (46, 40)], fill=W, outline=OL); d.polygon([(94, 52), (114, 26), (82, 40)], fill=W, outline=OL)
    else:
        d.polygon([(58, 44), (38, 18), (74, 36)], fill=W, outline=OL)
def ears_cat(d, f):
    if f in ('south', 'north'):
        d.polygon([(38, 42), (34, 14), (62, 32)], fill=W, outline=OL); d.polygon([(90, 42), (94, 14), (66, 32)], fill=W, outline=OL)
    else:
        d.polygon([(60, 36), (58, 10), (82, 30)], fill=W, outline=OL)
def horns_mini(d, f):
    g = (170, 160, 140, 255)
    if f in ('south', 'north'):
        d.polygon([(44, 40), (38, 20), (54, 36)], fill=g, outline=OL); d.polygon([(84, 40), (90, 20), (74, 36)], fill=g, outline=OL)
    else:
        d.polygon([(62, 34), (60, 14), (74, 32)], fill=g, outline=OL)
def horns_center(d, f):
    g = (170, 160, 140, 255)
    if f in ('south', 'north'): d.polygon([(58, 36), (64, 6), (70, 36)], fill=g, outline=OL)
    else:                       d.polygon([(62, 34), (74, 6), (80, 32)], fill=g, outline=OL)
def wings(d, f):
    g = (210, 210, 220, 255)
    if f == 'south':
        d.ellipse([4, 40, 40, 100], fill=g, outline=OL, width=2); d.ellipse([88, 40, 124, 100], fill=g, outline=OL, width=2)
    elif f == 'north':
        d.ellipse([10, 36, 56, 104], fill=g, outline=OL, width=2); d.ellipse([72, 36, 118, 104], fill=g, outline=OL, width=2)
    else:
        d.ellipse([26, 40, 66, 106], fill=g, outline=OL, width=2)
def body_markings(d, f):
    c = (120, 90, 70, 200)
    for y in (60, 72, 84): d.line([(48, y), (80, y)], fill=c, width=4)
def head_markings(d, f):
    c = (120, 90, 70, 200)
    if f == 'south': d.line([(44, 50), (56, 54)], fill=c, width=3); d.line([(84, 50), (72, 54)], fill=c, width=3)
    elif f == 'east': d.line([(66, 48), (78, 52)], fill=c, width=3)
    else: pass

ITEMS = {
 'BodyAttachments/PH_Tail': (tail, dict(followHead=False, tintMode='hair', drawSize=1.0)),
 'BodyAttachments/PH_BushyTail': (bushy_tail, dict(followHead=False, tintMode='hair', drawSize=1.0)),
 'BodyAttachments/PH_Wings': (wings, dict(followHead=False, tintMode='none', drawSize=1.5)),
 'BodyAttachments/PH_BodyMarkings': (body_markings, dict(followHead=False, tintMode='none', drawSize=1.5)),
 'HeadAttachments/PH_Ears_Pointed': (ears_pointed, dict(followHead=True, tintMode='skin', drawSize=1.5)),
 'HeadAttachments/PH_Ears_Cat': (ears_cat, dict(followHead=True, tintMode='hair', drawSize=1.5)),
 'HeadAttachments/PH_Horns_Mini': (horns_mini, dict(followHead=True, tintMode='none', drawSize=1.5)),
 'HeadAttachments/PH_Horns_Center': (horns_center, dict(followHead=True, tintMode='none', drawSize=1.5)),
 'HeadAttachments/PH_HeadMarkings': (head_markings, dict(followHead=True, tintMode='none', drawSize=1.5)),
}
presets = {}
for rel, (fn, pre) in ITEMS.items():
    save(rel, fn)
    p = dict(pre)
    if rel.startswith('BodyAttachments/PH_') and 'Tail' in rel:
        # GUESS: tails sit behind the body when seen from the sides and the front; in front when seen from behind
        p['behind'] = {'south': True, 'east': True, 'north': False, 'west': True}
    if rel.endswith('Wings'):
        p['behind'] = {'south': True, 'east': True, 'north': False, 'west': True}
    presets['Things/Pawn/Humanlike/' + rel] = p
with open(os.path.join(out, 'presets.json'), 'w') as fh: json.dump(presets, fh, indent=1)
open(os.path.join(out, 'READ-ME.txt'), 'w').write(
 'PLACEHOLDER gene sprites for testing the viewer. These are NOT RimWorld art and the default positions are guesses.\n'
 'In the viewer: Add folder as... then choose Genes, and point it at this folder.\n'
 'Layers: tails and wings are drawn behind the body, head attachments follow the head.\n')
print('ok', len(ITEMS), 'sprites ->', out)
