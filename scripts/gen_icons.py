"""
生成 PWA 图标：蓝白圆角方块 + 白色「资」字
用法：python scripts/gen_icons.py
输出：public/icons/icon-192.png / icon-512.png / icon-maskable-512.png / apple-touch-icon.png
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "icons")

# 找一个能渲染中文的字体
FONT_CANDIDATES = [
    "C:/Windows/Fonts/msyhbd.ttc",   # 微软雅黑 Bold
    "C:/Windows/Fonts/msyh.ttc",     # 微软雅黑
    "C:/Windows/Fonts/simhei.ttf",   # 黑体
    "C:/Windows/Fonts/simsun.ttc",   # 宋体
]


def find_font() -> str | None:
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            return p
    return None


def make_icon(size: int, maskable: bool = False) -> Image.Image:
    # maskable 需要铺满整块（系统裁切成圆形时不露白边）
    pad = int(size * 0.14) if maskable else 0
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # 背景：蓝色渐变（竖向）
    for y in range(size):
        t = y / max(size - 1, 1)
        r = int(59 + (29 - 59) * t)
        g = int(130 + (78 - 130) * t)
        b = int(246 + (216 - 246) * t)
        d.line([(0, y), (size, y)], fill=(r, g, b, 255))

    if not maskable:
        # 圆角：把外部像素透明
        mask = Image.new("L", (size, size), 0)
        md = ImageDraw.Draw(mask)
        radius = int(size * 0.22)
        md.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
        img.putalpha(mask)

    # 中间「资」字
    font_path = find_font()
    font_size = int((size - pad * 2) * 0.52)
    if font_path:
        try:
            font = ImageFont.truetype(font_path, font_size)
        except OSError:
            font = ImageFont.load_default()
    else:
        print("! 未找到中文字体，退回默认字体（可能显示为方块）", file=sys.stderr)
        font = ImageFont.load_default()

    text = "资"
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    cx, cy = size / 2, size / 2
    x = cx - tw / 2 - bbox[0]
    y = cy - th / 2 - bbox[1]

    # 阴影（向下偏移一点）
    d.text((x + size * 0.012, y + size * 0.014), text, font=font, fill=(0, 0, 0, 46))
    d.text((x, y), text, font=font, fill=(255, 255, 255, 255))

    return img


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    targets = [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-maskable-512.png", 512, True),
        ("apple-touch-icon.png", 180, False),
    ]
    for name, size, maskable in targets:
        img = make_icon(size, maskable)
        path = os.path.join(OUT, name)
        img.save(path, "PNG", optimize=True)
        kb = os.path.getsize(path) / 1024
        print(f"OK {name} ({size}x{size}, {kb:.1f} KB)")
    print(f"输出目录 -> {OUT}")


if __name__ == "__main__":
    main()