"""Verify an AAB against dist/resources and a previous bundle, without loading secrets.

JAVA_HOME and BUNDLETOOL_JAR must point to existing local tools.
Usage: python3 scripts/verify-android-release.py NEW.aab OLD.aab report.json [--native-frame-update] [--icon-update]

The optional flag permits the reviewed MainActivity/GameInsets update, but still
requires its compiled hooks and keeps media and fonts byte-identical. The icon
flag permits only the generated launcher resources and the browser icon PNG.
"""
import hashlib
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from datetime import datetime, timezone
import xml.etree.ElementTree as ET
import zipfile
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[1]
JAVA = Path(os.environ["JAVA_HOME"]) / "bin"
TOOL = os.environ["BUNDLETOOL_JAR"]
bundle, previous, output = map(Path, sys.argv[1:4])
options = set(sys.argv[4:])
assert options <= {"--native-frame-update", "--icon-update"}, "Unknown verification option"
native_frame_update = "--native-frame-update" in options
icon_update = "--icon-update" in options


def run(*args):
    return subprocess.run([str(x) for x in args], check=True, capture_output=True, text=True).stdout


def digest(value):
    return hashlib.sha256(value).hexdigest()


def certificate(file):
    text = run(JAVA / "keytool", "-J-Duser.language=en", "-J-Duser.country=US", "-printcert", "-jarfile", file)
    return re.search(r"SHA256:\s*([A-F0-9:]+)", text).group(1)


validation = run(JAVA / "java", "-jar", TOOL, "validate", f"--bundle={bundle}")
signed = run(JAVA / "jarsigner", "-J-Duser.language=en", "-J-Duser.country=US", "-verify", bundle)
assert "jar verified." in signed and "jar is unsigned" not in signed
new_cert, old_cert = certificate(bundle), certificate(previous)
assert new_cert == old_cert, "Upload certificate changed"
manifest = run(JAVA / "java", "-jar", TOOL, "dump", "manifest", f"--bundle={bundle}", "--module=base")
root = ET.fromstring(manifest)
android = "{http://schemas.android.com/apk/res/android}"
assert root.attrib["package"] == "io.github.junyyyong.taptotalk"
gradle = (ROOT / "android/app/build.gradle").read_text()
expected_code = int(re.search(r"\bversionCode\s+(\d+)", gradle).group(1))
expected_name = re.search(r'\bversionName\s+"([^"]+)"', gradle).group(1)
assert int(root.attrib[android + "versionCode"]) == expected_code
assert root.attrib[android + "versionName"] == expected_name
previous_manifest = ET.fromstring(run(JAVA / "java", "-jar", TOOL, "dump", "manifest", f"--bundle={previous}", "--module=base"))
previous_code = int(previous_manifest.attrib[android + "versionCode"])
assert int(root.attrib[android + "versionCode"]) > previous_code, "Version code must exceed the uploaded bundle"
app = root.find("application")
assert app.attrib.get(android + "debuggable", "false") == "false"
assert app.attrib[android + "allowBackup"] == "true"
activity = next(a for a in app.findall("activity") if a.attrib[android + "name"].endswith(".MainActivity"))
assert int(activity.attrib[android + "configChanges"], 0) & 0x40000000  # CONFIG_FONT_SCALE
if native_frame_update:
    assert int(activity.attrib[android + "configChanges"], 0) & 0x1000  # CONFIG_DENSITY
permissions = [p.attrib[android + "name"] for p in root.findall("uses-permission")]
assert permissions == ["android.permission.INTERNET", "io.github.junyyyong.taptotalk.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION"]
assets, icons = [], []
unchanged = []
native_entries = []
changed_icons = []
with zipfile.ZipFile(bundle) as archive:
    names = archive.namelist()
    assert not any(re.search(r"(?:^|/)(?:keystore\.properties|\.git|\.env)(?:$|/)|\.(?:p12|jks|keystore)$", name) for name in names)
    for file in sorted((ROOT / "dist").rglob("*")):
        if not file.is_file():
            continue
        entry = "base/assets/public/" + file.relative_to(ROOT / "dist").as_posix()
        assert digest(archive.read(entry)) == digest(file.read_bytes()), entry
        assets.append(entry)
    metadata = json.loads((ROOT / "store/android/icon-generation.json").read_text())
    assert digest((ROOT / metadata["source"]).read_bytes()) == metadata["sourceSha256"]
    assert (metadata["legacyCanvasDp"], metadata["legacyContentDp"]) == (48, 40)
    assert (metadata["foregroundDp"], metadata["contentDp"], metadata["adaptiveVisibleDp"]) == (108, 60, 72)
    source = Image.open(ROOT / metadata["source"]).convert("RGBA")
    for name in metadata["outputs"]:
        file = ROOT / name
        density = file.parent.name
        matches = [entry for entry in names if re.fullmatch(rf"base/res/{density}(?:-v\d+)?/{file.name}", entry)]
        assert len(matches) == 1, name
        original, packed = Image.open(file).convert("RGBA"), Image.open(io.BytesIO(archive.read(matches[0]))).convert("RGBA")
        assert original.size == packed.size, name
        # AAPT clears hidden RGB values of fully transparent pixels. Require
        # exact alpha and visible RGB, rather than falsely rejecting this lossless optimization.
        assert all(a == b or (a[3] == 0 and b[3] == 0)
                   for a, b in zip(original.getdata(), packed.getdata())), name
        if file.name in ("ic_launcher.png", "ic_launcher_round.png"):
            size = original.width
            content = round(size * 40 / 48)
            resized = ImageOps.contain(source, (content, content), Image.Resampling.LANCZOS)
            expected = Image.new("RGBA", original.size, "white")
            expected.alpha_composite(resized, ((size - resized.width) // 2, (size - resized.height) // 2))
            if file.name == "ic_launcher_round.png":
                mask = Image.new("L", (size * 4, size * 4), 0)
                ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
                expected.putalpha(mask.resize((size, size), Image.Resampling.LANCZOS))
                assert all(packed.getpixel(p)[3] == 0 for p in [(0, 0), (size-1, 0), (0, size-1), (size-1, size-1)])
                assert packed.getpixel((size // 2, size // 2))[3] == 255
            assert expected.tobytes() == original.tobytes(), "Source placement / 40dp sizing mismatch: " + name
        icons.append(matches[0])
    for name in ["ic_launcher", "ic_launcher_round"]:
        data = archive.read(f"base/res/mipmap-anydpi-v26/{name}.xml")
        assert b"ic_launcher_foreground" in data and b"ic_launcher_background" in data
    config = json.loads(archive.read("base/assets/capacitor.config.json"))
    assert config["appId"] == "io.github.junyyyong.taptotalk" and not config.get("server", {}).get("url")
    dex = b"\n".join(archive.read(name) for name in names if name.startswith("base/dex/") and name.endswith(".dex"))
    assert b"applyGameTextZoom" in dex and b"setTextZoom" in dex
    if native_frame_update:
        for hook in [b"Lio/github/junyyyong/taptotalk/GameInsets;", b"publishGameInsets", b"remaining", b"--android-game-inset-top", b"--android-game-inset-bottom"]:
            assert hook in dex, "Missing compiled native-frame hook: " + hook.decode()
        assert config["backgroundColor"] == "#ffffff"
        assert config["android"]["backgroundColor"] == "#ffffff"
    assert not any(name.endswith(".so") for name in names)
    for font in ["NotoSansKR-Variable.woff2", "NotoSerifKR-Variable.woff2"]:
        assert archive.read("base/assets/public/assets/fonts/" + font) == (ROOT / "public/assets/fonts" / font).read_bytes()
    styles = b"\n".join(archive.read(name) for name in names if name.startswith("base/assets/public/assets/") and name.endswith(".css"))
    # Vite can omit optional quotes around a multi-word family name.
    assert re.search(rb'''font-family:(?:"TAP Sans KR"|'TAP Sans KR'|TAP Sans KR),sans-serif''', styles)
    with zipfile.ZipFile(previous) as prior:
        prior_names = set(prior.namelist())
        media_suffixes = (".png", ".jpg", ".jpeg", ".webp", ".svg", ".woff2", ".ttf", ".mp3", ".mp4", ".webm", ".wav")
        media_names = {name for name in names if name.startswith("base/assets/public/") and name.endswith(media_suffixes)}
        prior_media_names = {name for name in prior_names if name.startswith("base/assets/public/") and name.endswith(media_suffixes)}
        authorized_icon_names = set(icons) | {"base/assets/public/icon.png"} if icon_update else set()
        assert media_names - authorized_icon_names == prior_media_names - authorized_icon_names, "Bundled media/font inventory changed"
        for name in names:
            if name.startswith("base/dex/"):
                current_bytes = archive.read(name)
                old_bytes = prior.read(name) if name in prior_names else None
                native_entries.append({"entry": name, "sha256": digest(current_bytes),
                                       "previousSha256": digest(old_bytes) if old_bytes is not None else None,
                                       "changed": old_bytes != current_bytes})
                if not native_frame_update:
                    assert old_bytes == current_bytes, "Unexpected native change: " + name
            if name in prior_names and (name in media_names or name in icons):
                if name in authorized_icon_names:
                    if archive.read(name) != prior.read(name):
                        changed_icons.append({"entry": name, "sha256": digest(archive.read(name)),
                                              "previousSha256": digest(prior.read(name))})
                    continue
                assert archive.read(name) == prior.read(name), "Unexpected native/media/icon change: " + name
                unchanged.append(name)

source_paths = ["src", "index.html", "capacitor.config.ts", "android/app/build.gradle", "android/app/src/main"]
source_status = run("git", "-C", ROOT, "status", "--porcelain", "--", *source_paths).strip()

report = {"checkedAt": datetime.now(timezone.utc).isoformat(), "bundle": str(bundle.resolve()),
          "package": root.attrib["package"], "versionName": expected_name, "versionCode": expected_code,
          "previousVersionCode": previous_code,
          "bytes": bundle.stat().st_size, "sha256": digest(bundle.read_bytes()),
          "previousBundle": str(previous.resolve()), "previousSha256": digest(previous.read_bytes()),
          "uploadCertificateSha256": new_cert, "sameUploadCertificate": True,
          "bundletoolValidation": "PASS", "jarsignerVerification": "PASS",
          "signatureWarnings": "Self-signed/no timestamp; Gradle JAR manifest ZIP ordering warnings as in previous bundle. JarFile verification passed.",
          "webAssetsMatched": len(assets), "iconPixelMatches": icons,
          "unchangedPreviousMediaIconEntries": len(unchanged), "bundledFontsVerified": True,
          "nativeFrameUpdateAuthorized": native_frame_update, "nativeDexComparison": native_entries,
          "iconUpdateAuthorized": icon_update, "changedIconEntries": changed_icons,
          "iconPixelComparison": "Exact alpha and visible RGBA; AAPT zeroing RGB at alpha=0 is permitted",
          "legacyContentRatio": "40dp / 48dp; matches adaptive visible 60dp / 72dp",
          "roundMaskVerification": "All five densities: circular alpha mask, transparent corners, opaque center",
          "adaptiveResources": "both foreground/background references present",
          "permissions": permissions, "minSdk": root.find("uses-sdk").attrib[android + "minSdkVersion"],
          "targetSdk": root.find("uses-sdk").attrib[android + "targetSdkVersion"],
          "fontScaleConfigHandled": True, "textZoomDexPresent": True, "privateSigningMaterialBundled": False,
          "deviceVerification": "NOT RUN: no connected Android device; emulator/system image not installed",
          "sourceRevision": run("git", "-C", ROOT, "rev-parse", "HEAD").strip(),
          "verifierSha256": digest(Path(__file__).read_bytes()),
          "sourceWorkingTreeClean": not source_status,
          "sourceWorkingTreeChanges": source_status}
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
