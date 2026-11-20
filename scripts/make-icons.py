# 앱 아이콘 생성: 파란 배경 + 흰 말풍선
import sys
from PIL import Image, ImageDraw

def icon(size):
    s = size / 512
    img = Image.new("RGB", (size, size), (47, 111, 222))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([96*s, 120*s, 416*s, 352*s], radius=64*s, fill="white")
    d.polygon([(170*s, 340*s), (150*s, 420*s), (250*s, 345*s)], fill="white")
    for cx in (186, 256, 326):
        d.ellipse([(cx-22)*s, 214*s, (cx+22)*s, 258*s], fill=(47, 111, 222))
    return img

out = sys.argv[1]
for n in (180, 192, 512):
    icon(n).save(f"{out}/icon-{n}.png")
