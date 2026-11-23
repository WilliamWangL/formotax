"""Generates a reproducible handwritten-style signature PNG for PDF tests."""

from PIL import Image, ImageDraw

WIDTH, HEIGHT = 600, 200
image = Image.new("RGBA", (WIDTH, HEIGHT), (255, 255, 255, 0))
draw = ImageDraw.Draw(image)

points = [
    (60, 140), (90, 90), (110, 60), (120, 120), (135, 160),
    (150, 90), (170, 70), (185, 120), (200, 155), (215, 100),
    (235, 75), (255, 115), (275, 150), (295, 95), (320, 70),
    (340, 110), (360, 150), (385, 100), (405, 70), (420, 120),
    (440, 155), (460, 95), (480, 75), (500, 120), (520, 140),
]
draw.line(points, fill=(15, 30, 90, 255), width=5, joint="curve")

draw.line([(60, 168), (540, 162)], fill=(15, 30, 90, 255), width=3)

image.save("/root/workspace/tax/docs/signature-sample.png")
print("wrote docs/signature-sample.png")
