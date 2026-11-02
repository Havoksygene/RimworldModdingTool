"""Builds tiny fake RimWorld folders (placeholder art, NOT real game assets) for testing.
usage: python3 make_fake_game.py <outdir> [structured|flat|defs]
  structured : Data/Core/Textures/Things/... + Data/Core/Defs (a mod / loose-texture layout)
  flat       : <outdir>/Texture2D/*.png with no sub-folders (what extraction tools write)
  defs       : Data/Core/Defs only (what a real install looks like when art is packed in game files)"""
import os, sys
from PIL import Image, ImageDraw

out = sys.argv[1]
mode = sys.argv[2] if len(sys.argv) > 2 else "structured"

W = (235, 235, 235, 255)

def body(facing):
    def f(d, s):
        w = 56 if facing in ("south", "north") else 40
        d.ellipse([64 - w // 2, 40, 64 + w // 2, 110], fill=W, outline=(90, 90, 90, 255))
        if facing == "east": d.rectangle([64, 60, 90, 70], fill=W)
    return f
def head(facing):
    def f(d, s):
        d.ellipse([34, 30, 94, 96], fill=W, outline=(90, 90, 90, 255))
        if facing == "south": d.ellipse([48, 58, 56, 66], fill=(30, 30, 30, 255)); d.ellipse([72, 58, 80, 66], fill=(30, 30, 30, 255))
        if facing == "east": d.ellipse([68, 58, 76, 66], fill=(30, 30, 30, 255))
    return f
def hair(facing):
    def f(d, s):
        d.pieslice([30, 22, 98, 90], 180, 360, fill=W, outline=(90, 90, 90, 255))
    return f
def shirt(facing):
    def f(d, s):
        w = 62 if facing in ("south", "north") else 46
        d.rectangle([64 - w // 2, 60, 64 + w // 2, 104], fill=(200, 60, 60, 255), outline=(90, 20, 20, 255))
    return f
def revolver(d, s):
    d.rectangle([30, 62, 96, 72], fill=(120, 120, 130, 255)); d.rectangle([30, 70, 48, 92], fill=(90, 60, 40, 255))

def save(base, rel, draw_fn, size=(128, 128)):
    p = os.path.join(base, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(im), size)
    im.save(p)

def write_defs(core):
    os.makedirs(os.path.join(core, "Defs", "BodyTypeDefs"), exist_ok=True)
    with open(os.path.join(core, "Defs", "BodyTypeDefs", "BodyTypes.xml"), "w") as f:
        f.write("""<?xml version="1.0" encoding="utf-8"?>
<Defs>
  <BodyTypeDef>
    <defName>Male</defName>
    <bodyNakedGraphicPath>Things/Pawn/Humanoid/Bodies/Naked_Male</bodyNakedGraphicPath>
    <headOffset>(0, 0.34)</headOffset>
  </BodyTypeDef>
  <BodyTypeDef>
    <defName>Fat</defName>
    <bodyNakedGraphicPath>Things/Pawn/Humanoid/Bodies/Naked_Fat</bodyNakedGraphicPath>
    <headOffset>(0, 0.30)</headOffset>
  </BodyTypeDef>
</Defs>
""")

if mode == "structured":
    core = os.path.join(out, "Data", "Core")
    tex = os.path.join(core, "Textures", "Things")
    for fc in ("south", "east", "north"):
        save(tex, f"Pawn/Humanoid/Bodies/Naked_Male_{fc}.png", body(fc))
        save(tex, f"Pawn/Humanoid/Heads/Male/Male_Average_Normal_{fc}.png", head(fc))
        save(tex, f"Pawn/Humanoid/Hairs/Bob_{fc}.png", hair(fc))
        save(tex, f"Pawn/Humanoid/Hairs/Shaved_{fc}.png", hair(fc))
        save(tex, f"Apparel/Shirt/Shirt_Basic_{fc}.png", shirt(fc))
    save(tex, "Item/Equipment/WeaponRanged/Revolver.png", revolver)
    write_defs(core)
elif mode == "flat":
    d = os.path.join(out, "Texture2D")
    for fc in ("south", "east", "north"):
        save(d, f"Naked_Male_{fc}.png", body(fc))
        save(d, f"Male_Average_Normal_{fc}.png", head(fc))
        save(d, f"Afro_{fc}.png", hair(fc))        # hair has no telltale in a flat dump -> lands in Other
        save(d, f"ShirtBasic_{fc}.png", shirt(fc))
    save(d, "Revolver.png", revolver)
elif mode == "defs":
    write_defs(os.path.join(out, "Data", "Core"))
print("fake", mode, "at", out)
