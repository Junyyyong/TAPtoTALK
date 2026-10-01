"""Mechanical PNG resize/padding only. Never crop, redraw or alter source artwork."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/icon-source/ICON-TAPtoTALK.png"
RES = ROOT / "android/app/src/main/res"
OUT = ROOT / "store/android"


def contained(source, size, content, background):
    canvas = Image.new("RGBA", (size, size), background)
    image = ImageOps.contain(source, (content, content), Image.Resampling.LANCZOS)
    canvas.alpha_composite(image, ((size - image.width) // 2, (size - image.height) // 2))
    return canvas


def main():
    source = Image.open(SOURCE).convert("RGBA")
    OUT.mkdir(parents=True, exist_ok=True)
    metadata = {"source": str(SOURCE.relative_to(ROOT)), "sourceSha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
                "sourceSize": list(source.size), "foregroundDp": 108, "contentDp": 60,
                "adaptiveVisibleDp": 72, "legacyCanvasDp": 48, "legacyContentDp": 40,
                "background": "#FFFFFF", "outputs": {}}
    for density, scale in [("mdpi", 1), ("hdpi", 1.5), ("xhdpi", 2), ("xxhdpi", 3), ("xxxhdpi", 4)]:
        folder = RES / f"mipmap-{density}"
        folder.mkdir(parents=True, exist_ok=True)
        fg_size, content = round(108 * scale), round(60 * scale)
        foreground = contained(source, fg_size, content, (0, 0, 0, 0))
        foreground.save(folder / "ic_launcher_foreground.png")
        # Match the adaptive icon's VISIBLE 60/72 ratio, not its full 60/108 layer.
        # Like TEN/TEST, legacy is 40dp content on a 48dp canvas. Only the launcher
        # circle masks the square's corners; the source itself is never cropped.
        size = round(48 * scale)
        legacy = contained(source, size, round(40 * scale), "white")
        legacy.save(folder / "ic_launcher.png")
        mask = Image.new("L", (size * 4, size * 4), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
        rounded = legacy.copy()
        rounded.putalpha(mask.resize((size, size), Image.Resampling.LANCZOS))
        rounded.save(folder / "ic_launcher_round.png")
        for name in ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"]:
            file = folder / name
            metadata["outputs"][str(file.relative_to(ROOT))] = {
                "size": list(Image.open(file).size), "sha256": hashlib.sha256(file.read_bytes()).hexdigest()}
    contained(source, 512, 512, "white").convert("RGB").save(OUT / "taptotalk-play-icon-512.png")
    # Neutral gray makes the round PNG's transparent corners visible in a preview.
    round_icon = Image.open(RES / "mipmap-xxxhdpi/ic_launcher_round.png").convert("RGBA")
    round_preview = Image.new("RGBA", (256, 256), "#DCE1E8")
    round_preview.alpha_composite(round_icon, (32, 32))
    round_preview.convert("RGB").save(OUT / "taptotalk-legacy-round-preview.png")

    # Explicit mask previews, NOT device screenshots. The underlying foreground
    # PNG retains the full source; masking represents launcher behavior only.
    fg = contained(source, 864, 480, (0, 0, 0, 0))
    adaptive = Image.alpha_composite(Image.new("RGBA", fg.size, "white"), fg)
    for name, shape in [("circle", "circle"), ("rounded", "rounded")]:
        mask = Image.new("L", fg.size, 0)
        drawer = ImageDraw.Draw(mask)
        if shape == "circle":
            drawer.ellipse((144, 144, 719, 719), fill=255)  # 72dp mask on 108dp layer
        else:
            drawer.rounded_rectangle((144, 144, 719, 719), radius=128, fill=255)
        preview = adaptive.copy()
        preview.putalpha(mask)
        preview.save(OUT / f"taptotalk-adaptive-{name}-preview.png")
    (OUT / "icon-generation.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(f"Generated 15 density PNGs, a 512px store icon and labeled mask-preview files from {source.size} source.")


if __name__ == "__main__":
    main()
