"""Generates the built-in 'Starter' sprite pack: ORIGINAL generic art, not taken from RimWorld.
Output: assets/Starter/{Textures/Things/..., Defs/BodyTypeDefs/BodyTypes.xml, presets.json}
Run:  python3 tools/make_starter_pack.py assets/Starter     (needs Pillow)

Conventions (so previews are honest about what they are):
 - Canvas is 1.5 tiles square (256 px) for pawn parts, 1 tile (128 px) for weapons.
 - Body parts are centred on the pawn; head parts are centred on the head (placed by the body type's headOffset).
 - Body / head / hair fills are near-white so the viewer's skin / hair tint multiplies correctly.
 - Weapons point to the RIGHT.
"""
import json, os, sys
from PIL import Image, ImageDraw

OUT = sys.argv[1] if len(sys.argv) > 1 else "assets/Starter"
SS = 4                      # supersampling
TILE = 256 / 1.5            # pixels per tile in the final 256 px canvas
OUTLINE = (58, 58, 66, 255)
WHITE = (247, 247, 247, 255)
SHADE = (221, 221, 226, 255)
STRAND = (205, 205, 212, 255)


class Canvas:
    def __init__(self, px=256, tile=None):
        self.px = px
        self.tile = tile or px / 1.5
        self.n = px * SS
        self.im = Image.new("RGBA", (self.n, self.n), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    # tile coords (x right, z up, origin at centre) -> big-canvas pixels
    def P(self, x, z):
        k = self.tile * SS
        return (self.n / 2 + x * k, self.n / 2 - z * k)

    def L(self, v):  # tile length -> pixels
        return v * self.tile * SS

    def ellipse(self, cx, cz, rx, rz, fill=WHITE, ow=0.012, outline=OUTLINE):
        x, y = self.P(cx, cz); a, b = self.L(rx), self.L(rz)
        if ow and outline:
            o = self.L(ow); self.d.ellipse([x - a - o, y - b - o, x + a + o, y + b + o], fill=outline)
        if fill:
            self.d.ellipse([x - a, y - b, x + a, y + b], fill=fill)

    def rrect(self, x0, z0, x1, z1, r, fill=WHITE, ow=0.012, outline=OUTLINE):
        a = self.P(x0, z1); b = self.P(x1, z0); rr = self.L(r)
        if ow and outline:
            o = self.L(ow); self.d.rounded_rectangle([a[0] - o, a[1] - o, b[0] + o, b[1] + o], rr + o, fill=outline)
        if fill:
            self.d.rounded_rectangle([a[0], a[1], b[0], b[1]], rr, fill=fill)

    def capsule(self, x0, z0, x1, z1, w, fill=WHITE, ow=0.012, outline=OUTLINE):
        p0, p1 = self.P(x0, z0), self.P(x1, z1); ww = self.L(w)
        def one(width, col):
            self.d.line([p0, p1], fill=col, width=int(width))
            for p in (p0, p1):
                self.d.ellipse([p[0] - width / 2, p[1] - width / 2, p[0] + width / 2, p[1] + width / 2], fill=col)
        if ow and outline: one(ww + 2 * self.L(ow), outline)
        if fill: one(ww, fill)

    def poly(self, pts, fill=WHITE, ow=0.012, outline=OUTLINE):
        q = [self.P(x, z) for x, z in pts]
        if ow and outline:
            self.d.polygon(q, fill=outline)
            self.d.line(q + [q[0]], fill=outline, width=int(self.L(ow) * 2), joint="curve")
        if fill:
            self.d.polygon(q, fill=fill)

    def line(self, pts, w=0.01, col=OUTLINE):
        q = [self.P(x, z) for x, z in pts]
        self.d.line(q, fill=col, width=max(1, int(self.L(w))), joint="curve")

    def erase_ellipse(self, cx, cz, rx, rz):
        x, y = self.P(cx, cz); a, b = self.L(rx), self.L(rz)
        mask = Image.new("L", (self.n, self.n), 0)
        ImageDraw.Draw(mask).ellipse([x - a, y - b, x + a, y + b], fill=255)
        clear = Image.new("RGBA", (self.n, self.n), (0, 0, 0, 0))
        self.im = Image.composite(clear, self.im, mask); self.d = ImageDraw.Draw(self.im)

    def save(self, path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        self.im.resize((self.px, self.px), Image.LANCZOS).save(path)


FACINGS = ("south", "east", "north")
TEX = os.path.join(OUT, "Textures", "Things")
presets = {}

# ---------------------------------------------------------------- bodies
# name: (half torso width, torso top, torso bottom, arm width, arm offset, head offset z, belly)
BODIES = {
    "Male":   (0.30, 0.16, -0.23, 0.115, 0.07, 0.34, 0.0),
    "Female": (0.26, 0.15, -0.22, 0.105, 0.06, 0.33, 0.0),
    "Thin":   (0.22, 0.16, -0.22, 0.085, 0.05, 0.35, 0.0),
    "Fat":    (0.38, 0.13, -0.24, 0.14, 0.09, 0.30, 0.06),
    "Hulk":   (0.36, 0.17, -0.22, 0.16, 0.08, 0.32, 0.0),
}

def draw_body(c, spec, facing, shirt=None, long_=False):
    hw, top, bot, aw, ao, _, belly = spec
    fill = shirt or WHITE
    shade = tuple(max(0, v - 38) for v in fill[:3]) + (255,) if shirt else SHADE
    if facing in ("south", "north"):
        ax = hw + ao
        for s in (-1, 1):  # arms behind torso
            c.capsule(s * ax, 0.10, s * ax, -0.16 - (0.04 if long_ else 0), aw, fill=fill)
        c.rrect(-hw, bot - (0.04 if long_ else 0), hw, top, 0.12 + belly, fill=fill)
        if belly: c.ellipse(0, -0.08, hw * 0.78, 0.17, fill=shade, ow=0)
        else: c.rrect(-hw * 0.8, bot + 0.02, hw * 0.8, -0.05, 0.08, fill=shade, ow=0)
        if facing == "north": c.line([(0, top - 0.02), (0, bot + 0.05)], 0.006, STRAND)
        else:
            for s in (-1, 1): c.ellipse(s * ax, -0.19 - (0.04 if long_ else 0), aw * 0.55, aw * 0.55, fill=WHITE if not shirt else fill)
    else:  # east
        tw = hw * 0.58
        c.rrect(-tw, bot - (0.04 if long_ else 0), tw, top, 0.11 + belly * 0.6, fill=fill)
        if belly: c.ellipse(tw * 0.5, -0.08, tw * 0.9, 0.16, fill=shade, ow=0)
        c.capsule(0.01, 0.09, 0.05, -0.16 - (0.04 if long_ else 0), aw * 0.95, fill=fill)
        if not shirt: c.ellipse(0.055, -0.19, aw * 0.5, aw * 0.5)

for name, spec in BODIES.items():
    for f in FACINGS:
        c = Canvas(); draw_body(c, spec, f); c.save(f"{TEX}/Pawn/Humanoid/Bodies/Starter_Naked_{name}_{f}.png")

# ---------------------------------------------------------------- heads (head-centred frame)
HEADS = {"Average": (0.20, 0.235), "Narrow": (0.17, 0.25)}
def draw_head(c, rx, rz, facing):
    if facing == "east":
        c.ellipse(-0.01, 0, rx * 0.95, rz)
        c.poly([(rx * 0.85, 0.0), (rx * 1.18, -0.045), (rx * 0.85, -0.075)])        # nose
        c.ellipse(0.02, -0.01, 0.036, 0.04, fill=SHADE, ow=0.006)                     # ear
        c.ellipse(rx * 0.55, 0.045, 0.022, 0.026, fill=OUTLINE, ow=0)                 # eye
        c.line([(rx * 0.55, -0.12), (rx * 0.8, -0.115)], 0.008)                       # mouth
    else:
        for s in (-1, 1): c.ellipse(s * rx * 0.98, -0.01, 0.034, 0.05, fill=SHADE)    # ears
        c.ellipse(0, 0, rx, rz)
        if facing == "south":
            for s in (-1, 1): c.ellipse(s * rx * 0.42, 0.0, 0.025, 0.03, fill=OUTLINE, ow=0)
            c.line([(0, -0.02), (-0.012, -0.075), (0.012, -0.075)], 0.007, (150, 150, 158, 255))
            c.line([(-0.05, -0.135), (0.05, -0.135)], 0.008)

for hn, (rx, rz) in HEADS.items():
    for f in FACINGS:
        c = Canvas(); draw_head(c, rx, rz, f); c.save(f"{TEX}/Pawn/Humanoid/Heads/Starter_{hn}_Normal_{f}.png")

# ---------------------------------------------------------------- hair (head-centred frame)
def hair_cap(c, f, rx, rz, depth=0.03, fill=WHITE):
    # top cap that follows the head; deeper at the back
    if f == "east":
        c.ellipse(-0.035, 0.035, rx * 1.02, rz * 0.98, fill=fill)
        c.erase_ellipse(rx * 0.62, -0.05, rx * 0.55, rz * 0.55)
    elif f == "north":
        c.ellipse(0, 0.0, rx * 1.05, rz * 1.04, fill=fill)
    else:
        c.ellipse(0, 0.045, rx * 1.05, rz * 0.98, fill=fill)
        c.erase_ellipse(0, -0.075, rx * 0.86, rz * 0.62)

def draw_hair(c, style, f, rx=0.20, rz=0.235):
    if style == "Shaved":
        a = Canvas(); hair_cap(a, f, rx * 0.97, rz * 0.97, fill=(236, 236, 240, 255))
        a.erase_ellipse(0, -0.09, rx * 1.2, rz * 0.95)
        a.im.putalpha(a.im.getchannel("A").point(lambda v: int(v * 0.7))); c.im.alpha_composite(a.im)
    elif style == "Short":
        hair_cap(c, f, rx, rz)
        for k in (-1, 0, 1): c.line([(k * 0.06, 0.2), (k * 0.09, 0.1)], 0.006, STRAND)
    elif style == "Bob":
        hair_cap(c, f, rx * 1.08, rz * 1.02)
        if f in ("south", "north"):
            for s in (-1, 1): c.rrect(min(s * rx * 0.9, s * rx * 1.14), -0.13, max(s * rx * 0.9, s * rx * 1.14), 0.10, 0.05)
        else: c.rrect(-rx * 1.1, -0.14, -rx * 0.2, 0.08, 0.06)
    elif style == "Long":
        hair_cap(c, f, rx * 1.1, rz * 1.04)
        if f == "north": c.rrect(-rx * 1.1, -0.40, rx * 1.1, 0.08, 0.10)
        elif f == "south":
            for s in (-1, 1): c.rrect(min(s * rx * 0.88, s * rx * 1.18), -0.40, max(s * rx * 0.88, s * rx * 1.18), 0.08, 0.06)
        else: c.rrect(-rx * 1.12, -0.40, -0.02, 0.08, 0.08)
        if f == "north": xs = (-0.07, 0, 0.07)
        elif f == "south": xs = (-rx * 1.03, rx * 1.03)     # side panels only, never across the face
        else: xs = (-rx * 0.6, -rx * 0.3)
        for x in xs: c.line([(x, -0.02), (x * 1.03, -0.3)], 0.006, STRAND)
    elif style == "Mohawk":
        if f == "east": c.poly([(-0.17, 0.12), (-0.02, 0.30), (0.12, 0.20), (0.10, 0.12), (-0.02, 0.18), (-0.14, 0.04)])
        else: c.rrect(-0.05, 0.02 if f == "north" else 0.08, 0.05, 0.36, 0.04)
    elif style == "Afro":
        if f == "east": c.ellipse(-0.06, 0.06, 0.30, 0.31)
        else: c.ellipse(0, 0.07, 0.31, 0.31)
        if f == "south": c.erase_ellipse(0, -0.07, rx * 0.85, rz * 0.66)
        if f == "east": c.erase_ellipse(0.17, -0.06, 0.15, 0.17)

HAIRS = ["Shaved", "Short", "Bob", "Long", "Mohawk", "Afro"]
for style in HAIRS:
    for f in FACINGS:
        c = Canvas(); draw_hair(c, style, f); c.save(f"{TEX}/Pawn/Humanoid/Hairs/Starter_{style}_{f}.png")

# ---------------------------------------------------------------- apparel (per body type, torso)
CLOTH = {"Shirt": ((72, 112, 176, 255), False), "Jacket": ((122, 84, 52, 255), True)}
for cname, (col, long_) in CLOTH.items():
    for bname, spec in BODIES.items():
        for f in FACINGS:
            c = Canvas(); draw_body(c, spec, f, shirt=col, long_=long_)
            if f == "south": c.line([(0, spec[1] - 0.01), (0, spec[2] + 0.04)], 0.007, tuple(max(0, v - 60) for v in col[:3]) + (255,))
            c.save(f"{TEX}/Apparel/Starter_{cname}_{bname}_{f}.png")
            presets[f"Things/Apparel/Starter_{cname}_{bname}"] = {"kind": "apparel", "slot": "torso", "drawSize": 1.5}

# ---------------------------------------------------------------- headgear (head-centred frame)
def draw_cap(c, f):
    col = (190, 62, 56, 255)
    if f == "east":
        c.ellipse(-0.03, 0.07, 0.21, 0.2, fill=col); c.rrect(0.06, 0.04, 0.34, 0.085, 0.02, fill=col)
    else:
        c.ellipse(0, 0.07, 0.225, 0.2, fill=col)
        if f == "south": c.rrect(-0.2, 0.035, 0.2, 0.085, 0.03, fill=col)
def draw_helmet(c, f):
    col = (96, 108, 96, 255)
    if f == "east":
        c.ellipse(-0.01, 0.0, 0.235, 0.27, fill=col); c.rrect(0.07, 0.02, 0.23, 0.07, 0.02, fill=(40, 44, 40, 255), ow=0)
    else:
        c.ellipse(0, 0.0, 0.24, 0.27, fill=col)
        if f == "south": c.rrect(-0.15, 0.0, 0.15, 0.06, 0.02, fill=(40, 44, 40, 255), ow=0)
def draw_cowboy(c, f):
    col = (140, 100, 62, 255)
    if f == "east":
        c.ellipse(0.0, 0.09, 0.30, 0.075, fill=col); c.rrect(-0.12, 0.09, 0.12, 0.27, 0.05, fill=col)
    else:
        c.ellipse(0, 0.09, 0.36, 0.1, fill=col); c.rrect(-0.14, 0.09, 0.14, 0.28, 0.06, fill=col)
HEADGEAR = {"Cap": (draw_cap, False), "Helmet": (draw_helmet, True), "CowboyHat": (draw_cowboy, False)}
for hn, (fn, hides) in HEADGEAR.items():
    for f in FACINGS:
        c = Canvas(); fn(c, f); c.save(f"{TEX}/Apparel/Starter_{hn}_{f}.png")
    presets[f"Things/Apparel/Starter_{hn}"] = {"kind": "apparel", "slot": "headgear", "followHead": True, "hidesHair": hides, "drawSize": 1.5}

# ---------------------------------------------------------------- weapons (single textures, point right, 1 tile)
STEEL = (150, 156, 166, 255); DARK = (74, 78, 88, 255); WOOD = (122, 84, 52, 255)
def weapon(name, fn):
    c = Canvas(px=128, tile=128); fn(c); c.save(f"{TEX}/Item/Equipment/Starter_{name}.png")
    presets[f"Things/Item/Equipment/Starter_{name}"] = {"kind": "weapon", "drawSize": 1.0}
weapon("Pistol", lambda c: (c.rrect(-0.10, -0.01, 0.26, 0.08, 0.02, fill=STEEL), c.rrect(-0.12, -0.20, -0.02, 0.02, 0.025, fill=WOOD), c.rrect(-0.02, -0.04, 0.05, 0.0, 0.01, fill=DARK, ow=0)))
weapon("Rifle", lambda c: (c.rrect(-0.46, -0.05, -0.14, 0.04, 0.02, fill=WOOD), c.rrect(-0.20, -0.04, 0.46, 0.05, 0.015, fill=STEEL), c.rrect(-0.08, -0.15, -0.0, -0.03, 0.02, fill=DARK), c.rrect(0.06, 0.05, 0.22, 0.09, 0.01, fill=DARK)))
weapon("Sword", lambda c: (c.poly([(-0.02, -0.035), (0.46, -0.02), (0.5, 0.0), (0.46, 0.02), (-0.02, 0.035)], fill=(214, 220, 228, 255)), c.rrect(-0.07, -0.12, -0.02, 0.12, 0.012, fill=DARK), c.rrect(-0.30, -0.025, -0.07, 0.025, 0.01, fill=WOOD), c.ellipse(-0.32, 0, 0.03, 0.03, fill=DARK)))
weapon("Mace", lambda c: (c.rrect(-0.40, -0.02, 0.22, 0.02, 0.01, fill=WOOD), c.ellipse(0.30, 0, 0.12, 0.12, fill=STEEL), c.ellipse(0.30, 0, 0.05, 0.05, fill=DARK, ow=0)))

# ---------------------------------------------------------------- gene overlay examples
GENES = f"{TEX}/Pawn/Humanoid/Genes"
def ears(c, f):
    col = WHITE
    if f == "east":
        c.poly([(-0.10, 0.16), (-0.04, 0.40), (0.07, 0.20)], fill=col); c.poly([(-0.06, 0.22), (-0.04, 0.33), (0.02, 0.23)], fill=(235, 190, 190, 255), ow=0)
    else:
        for s in (-1, 1):
            c.poly([(s * 0.04, 0.2), (s * 0.12, 0.42), (s * 0.20, 0.17)], fill=col)
            if f == "south": c.poly([(s * 0.08, 0.22), (s * 0.12, 0.35), (s * 0.16, 0.2)], fill=(235, 190, 190, 255), ow=0)
def horns(c, f):
    col = (222, 212, 190, 255)
    if f == "east": c.poly([(-0.06, 0.18), (-0.14, 0.36), (-0.02, 0.44), (-0.04, 0.30), (0.04, 0.2)], fill=col)
    else:
        for s in (-1, 1): c.poly([(s * 0.08, 0.2), (s * 0.20, 0.30), (s * 0.15, 0.46), (s * 0.12, 0.31), (s * 0.04, 0.22)], fill=col)
def tail(c, f):   # body-centred frame, bushy tail
    if f == "south": c.capsule(0.12, -0.26, 0.30, -0.02, 0.15, fill=WHITE)
    elif f == "north": c.capsule(0.0, -0.18, 0.1, -0.44, 0.17, fill=WHITE)
    else: c.capsule(-0.12, -0.12, -0.42, 0.04, 0.16, fill=WHITE)
GENEDEFS = {
    "CatEars": (ears, {"followHead": True, "tintMode": "hair"}),
    "Horns": (horns, {"followHead": True, "tintMode": "none"}),
    "FoxTail": (tail, {"followHead": False, "tintMode": "hair", "behind": {"south": True, "east": True, "north": False, "west": True}}),
}
for gname, (fn, extra) in GENEDEFS.items():
    for f in FACINGS:
        c = Canvas(); fn(c, f); c.save(f"{GENES}/Starter_{gname}_{f}.png")
    presets[f"Things/Pawn/Humanoid/Genes/Starter_{gname}"] = {"kind": "gene", "drawSize": 1.5, **extra}

# ---------------------------------------------------------------- body types + presets
os.makedirs(os.path.join(OUT, "Defs", "BodyTypeDefs"), exist_ok=True)
with open(os.path.join(OUT, "Defs", "BodyTypeDefs", "BodyTypes.xml"), "w") as fh:
    fh.write('<?xml version="1.0" encoding="utf-8"?>\n<Defs>\n')
    for name, spec in BODIES.items():
        fh.write(f"  <BodyTypeDef>\n    <defName>Starter_{name}</defName>\n"
                 f"    <bodyNakedGraphicPath>Things/Pawn/Humanoid/Bodies/Starter_Naked_{name}</bodyNakedGraphicPath>\n"
                 f"    <headOffset>(0, {spec[5]})</headOffset>\n  </BodyTypeDef>\n")
    fh.write("</Defs>\n")
with open(os.path.join(OUT, "presets.json"), "w") as fh:
    json.dump(presets, fh, indent=1)
with open(os.path.join(OUT, "README.txt"), "w") as fh:
    fh.write("Built-in Starter pack: original, generic placeholder art made for RimWorld Sprite Viewer.\n"
             "It is NOT RimWorld art. Free to use and modify. Regenerate with tools/make_starter_pack.py.\n")
print("starter pack written to", OUT, "-", sum(len(f) for _, _, f in os.walk(OUT)), "files")
