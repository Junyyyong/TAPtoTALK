"""Check compiled icon/name resources without creating an APK or AAB."""
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import zipfile
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[3]
RES = ROOT / "android/app/build/intermediates/linked_resources_binary_format/release/processReleaseResources/linked-resources-binary-format-release.ap_"
AAPT = "/Users/scdi/Documents/ChatGPT/TAPtoTEN/.android-tools/sdk/build-tools/35.0.0/aapt2"
metadata = json.loads((ROOT / "store/android/icon-generation.json").read_text())
source = Image.open(ROOT / metadata["source"]).convert("RGBA")
assert hashlib.sha256((ROOT / metadata["source"]).read_bytes()).hexdigest() == metadata["sourceSha256"]
assert (metadata["contentDp"], metadata["adaptiveVisibleDp"], metadata["legacyContentDp"], metadata["legacyCanvasDp"]) == (72, 72, 48, 48)
checked = []
with zipfile.ZipFile(RES) as archive:
    for name in metadata["outputs"]:
        file = ROOT / name
        entries = [n for n in archive.namelist() if re.fullmatch(rf"res/{file.parent.name}(?:-v\d+)?/{file.name}", n)]
        assert len(entries) == 1, name
        original = Image.open(file).convert("RGBA")
        packed = Image.open(io.BytesIO(archive.read(entries[0]))).convert("RGBA")
        assert packed.size == original.size
        assert all(a == b or (a[3] == 0 and b[3] == 0) for a, b in zip(original.getdata(), packed.getdata()))
        size = original.width
        content = round(size * 72 / 108) if file.name == "ic_launcher_foreground.png" else size
        expected = Image.new("RGBA", original.size, metadata["background"])
        expected.alpha_composite(ImageOps.fit(source, (content, content), Image.Resampling.LANCZOS), ((size - content) // 2, (size - content) // 2))
        if file.name == "ic_launcher_round.png":
            mask = Image.new("L", (size * 4, size * 4), 0)
            ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
            expected.putalpha(mask.resize((size, size), Image.Resampling.LANCZOS))
        else:
            assert packed.getchannel("A").getextrema() == (255, 255)
        assert expected.tobytes() == original.tobytes(), name
        checked.append(entries[0])
dump = subprocess.run([AAPT, "dump", "resources", str(RES)], check=True, capture_output=True, text=True).stdout
for label in ["app_name", "title_activity_main"]:
    assert re.search(rf'string/{label}\n\s+\(\) "TAPtoTALK"', dump)
assert re.search(r'color/ic_launcher_background\n\s+\(\) #ff1d2087', dump)
report = {"passed": True, "compiledResources": str(RES), "appName": "TAPtoTALK", "background": "#1D2087",
          "iconsMatched": len(checked), "icons": checked, "sourceSha256": metadata["sourceSha256"],
          "placement": "Full-bleed 48/48 legacy; 72/72 adaptive visible viewport; opaque blue overflow",
          "actualDevice": False, "aabCreated": False}
Path(__file__).with_name("icon-verification.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
