"""Renders generated PDF samples to PNG for visual inspection."""

import sys
from pathlib import Path

import pypdfium2 as pdfium

SAMPLES = Path("/root/workspace/tax/docs/pdf-samples")

targets = {
    "W9.pdf": [0],
    "W4.pdf": [0],
    "W8BEN.pdf": [0],
    "W8BENE.pdf": [0, 1, 7],
}

for file_name, pages in targets.items():
    pdf = pdfium.PdfDocument(SAMPLES / file_name)
    for index in pages:
        page = pdf[index]
        bitmap = page.render(scale=1.7)
        image = bitmap.to_pil()
        out = SAMPLES / f"{file_name.replace('.pdf', '')}-p{index + 1}.png"
        image.save(out)
        print(f"{out} {image.size}")
    pdf.close()

sys.exit(0)
