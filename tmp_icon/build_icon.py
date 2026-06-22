"""黑底白放大镜图标 —— 遵循 macOS Big Sur 规范：1024 画布内容居中 824。"""
import os
import math
from PIL import Image, ImageDraw

OUT_DIR = "assets/icon.iconset"
CANVAS = 1024
TILE = 824                        # macOS 标准图标内容尺寸
PAD = (CANVAS - TILE) // 2        # 100px 透明 padding
RADIUS = 185                      # 824 画布对应的标准圆角（约 824*0.225）
BG_COLOR = (24, 28, 30, 255)
GLYPH_COLOR = (255, 255, 255, 255)

# 放大镜几何（在 824 tile 内）
RING_OUTER_R = 185
RING_INNER_R = 135
RING_CENTER = (346, 346)          # tile 内坐标（左上 0,0 到 824,824）
HANDLE_END = (612, 612)
HANDLE_WIDTH = 56


def draw_canvas(scale: float = 2.0):
    size = int(CANVAS * scale)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    pad = PAD * scale
    tile = TILE * scale
    radius = RADIUS * scale

    # 黑底（仅在 tile 区域）
    d.rounded_rectangle(
        (pad, pad, pad + tile - 1, pad + tile - 1),
        radius=radius,
        fill=BG_COLOR,
    )

    # 把手
    cx = (PAD + RING_CENTER[0]) * scale
    cy = (PAD + RING_CENTER[1]) * scale
    hx = (PAD + HANDLE_END[0]) * scale
    hy = (PAD + HANDLE_END[1]) * scale
    dx, dy = hx - cx, hy - cy
    dist = math.hypot(dx, dy)
    ux, uy = dx / dist, dy / dist
    sx = cx + ux * (RING_OUTER_R * scale - 4)
    sy = cy + uy * (RING_OUTER_R * scale - 4)
    d.line([(sx, sy), (hx, hy)], fill=GLYPH_COLOR, width=int(HANDLE_WIDTH * scale))
    d.ellipse(
        (
            hx - HANDLE_WIDTH * scale / 2,
            hy - HANDLE_WIDTH * scale / 2,
            hx + HANDLE_WIDTH * scale / 2,
            hy + HANDLE_WIDTH * scale / 2,
        ),
        fill=GLYPH_COLOR,
    )

    # 白色外圆 → 内圆挖回底色
    outer = RING_OUTER_R * scale
    d.ellipse((cx - outer, cy - outer, cx + outer, cy + outer), fill=GLYPH_COLOR)
    inner = RING_INNER_R * scale
    bg_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(bg_layer).ellipse(
        (cx - inner, cy - inner, cx + inner, cy + inner), fill=BG_COLOR
    )
    img = Image.alpha_composite(img, bg_layer)

    if scale != 1.0:
        img = img.resize((CANVAS, CANVAS), Image.LANCZOS)
    return img


canvas = draw_canvas(scale=2.0)

os.makedirs(OUT_DIR, exist_ok=True)
sizes = [
    ("icon_16x16.png", 16),
    ("icon_16x16@2x.png", 32),
    ("icon_32x32.png", 32),
    ("icon_32x32@2x.png", 64),
    ("icon_128x128.png", 128),
    ("icon_128x128@2x.png", 256),
    ("icon_256x256.png", 256),
    ("icon_256x256@2x.png", 512),
    ("icon_512x512.png", 512),
    ("icon_512x512@2x.png", 1024),
]
for name, sz in sizes:
    canvas.resize((sz, sz), Image.LANCZOS).save(os.path.join(OUT_DIR, name))
canvas.save("assets/appicon_1024.png")
canvas.resize((512, 512), Image.LANCZOS).save("assets/dock_icon_512.png")
canvas.resize((512, 512), Image.LANCZOS).save("assets/icon-512.png")
canvas.resize((1024, 1024), Image.LANCZOS).save("assets/icon-512@2x.png")
canvas.resize((256, 256), Image.LANCZOS).save("assets/icon-256.png")
canvas.resize((512, 512), Image.LANCZOS).save("assets/icon-256@2x.png")
canvas.resize((128, 128), Image.LANCZOS).save("assets/icon-128.png")
canvas.resize((256, 256), Image.LANCZOS).save("assets/icon-128@2x.png")
canvas.resize((32, 32), Image.LANCZOS).save("assets/icon-32.png")
canvas.resize((64, 64), Image.LANCZOS).save("assets/icon-32@2x.png")
canvas.resize((16, 16), Image.LANCZOS).save("assets/icon-16.png")
canvas.resize((32, 32), Image.LANCZOS).save("assets/icon-16@2x.png")
print("OK")
