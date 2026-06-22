import os
import subprocess
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(__file__))
SRC_LOGOS = os.path.join(ROOT, 'logos', 'icon-512@2x.png')
SRC_ASSETS = os.path.join(ROOT, 'assets', 'icon-512@2x.png')
ASSETS = os.path.join(ROOT, 'assets')
ICONSET = os.path.join(ASSETS, 'icon.iconset')
ICNS = os.path.join(ASSETS, 'icon.icns')
DOCK_ICON = os.path.join(ASSETS, 'dock_icon_512.png')


def _pick_src():
    if os.path.exists(SRC_LOGOS):
        return SRC_LOGOS
    if os.path.exists(SRC_ASSETS):
        return SRC_ASSETS
    raise FileNotFoundError('No source icon found: expected logos/icon_512x512@2x.png or assets/icon-512@2x.png')


def remove_white_bg(img, tolerance=28):
    """Remove near-white background using color distance to corner average.
    Produces transparent background with smoother edges to reduce jaggies.
    """
    img = img.convert('RGBA')
    w, h = img.size
    pix = img.load()
    # average corner RGB as background reference
    corners = [pix[0,0], pix[w-1,0], pix[0,h-1], pix[w-1,h-1]]
    br = sum(p[0] for p in corners) / 4.0
    bg = sum(p[1] for p in corners) / 4.0
    bb = sum(p[2] for p in corners) / 4.0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            dist = ((r-br)**2 + (g-bg)**2 + (b-bb)**2) ** 0.5
            if dist <= tolerance:
                pix[x, y] = (r, g, b, 0)
    # light blur to alpha by blurring image slightly, reduces fringe artifacts
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    return img


def make_base(size=1024):
    return Image.new('RGBA', (size, size), (0, 0, 0, 0))


def compose_icon():
    src = _pick_src()
    os.makedirs(ASSETS, exist_ok=True)

    base = make_base()
    clean_logo = remove_white_bg(Image.open(src))

    target = int(1024 * 0.85)
    logo_sized = clean_logo.resize((target, target), Image.LANCZOS)
    x = (1024 - target) // 2
    y = (1024 - target) // 2
    base.paste(logo_sized, (x, y), logo_sized)

    out1024 = os.path.join(ASSETS, 'appicon_1024.png')
    base.save(out1024)

    os.makedirs(ICONSET, exist_ok=True)
    iconset_sizes = [
        (16, 'icon_16x16.png'), (32, 'icon_16x16@2x.png'),
        (32, 'icon_32x32.png'), (64, 'icon_32x32@2x.png'),
        (128, 'icon_128x128.png'), (256, 'icon_128x128@2x.png'),
        (256, 'icon_256x256.png'), (512, 'icon_256x256@2x.png'),
        (512, 'icon_512x512.png'), (1024, 'icon_512x512@2x.png'),
    ]
    for sz, name in iconset_sizes:
        clean_logo.resize((sz, sz), Image.LANCZOS).save(os.path.join(ICONSET, name))

    export_sizes = [
        (16, 'icon-16.png'), (32, 'icon-32.png'),
        (128, 'icon-128.png'), (256, 'icon-256.png'),
        (512, 'icon-512.png'),
        (32, 'icon-16@2x.png'), (64, 'icon-32@2x.png'),
        (256, 'icon-128@2x.png'), (512, 'icon-256@2x.png'),
        (1024, 'icon-512@2x.png'),
    ]
    for sz, name in export_sizes:
        clean_logo.resize((sz, sz), Image.LANCZOS).save(os.path.join(ASSETS, name))

    return out1024


def generate_icns():
    if os.path.exists(ICONSET):
        try:
            subprocess.run(['iconutil', '-c', 'icns', ICONSET, '-o', ICNS], check=True)
        except Exception:
            pass


if __name__ == '__main__':
    compose_icon()
    generate_icns()

    base = make_base(size=512)
    src = _pick_src()
    clean_logo = remove_white_bg(Image.open(src))
    target = int(512 * 0.75)
    logo_sized = clean_logo.resize((target, target), Image.LANCZOS)
    x = (512 - target) // 2
    y = (512 - target) // 2
    base.paste(logo_sized, (x, y), logo_sized)
    base.save(DOCK_ICON)
    print('Generated icon.iconset ->', ICONSET)
    print('Generated icns ->', ICNS)
    print('Generated dock icon ->', DOCK_ICON)
