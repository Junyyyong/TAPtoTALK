import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const read = (path: string) => readFileSync(path, "utf8");
describe("Android release presentation contract", () => {
  it("reapplies text zoom after Capacitor lifecycle hooks without overriding OS scale", () => {
    const java = read("android/app/src/main/java/io/github/junyyyong/taptotalk/MainActivity.java");
    for (const method of ["onCreate", "onResume", "onConfigurationChanged"]) {
      expect(java).toMatch(new RegExp(`super\\.${method}\\([^;]*;\\s*applyGameTextZoom\\(\\);`));
    }
    expect(java).toContain("GAME_TEXT_ZOOM = 100");
    expect(java).toContain("webView.post(");
    expect(java).not.toMatch(/fontScale\s*=|densityDpi\s*=|updateConfiguration\(|setInitialScale\(|clearData\(|clearCache\(/);
    expect(read("android/app/src/main/AndroidManifest.xml")).toContain("density|fontScale");
  });
  it("supplements text zoom with CSS text autosizing at 100 percent", () => {
    const css = read("src/ui/styles/tokens.css");
    expect(css).toContain("-webkit-text-size-adjust: 100%");
    expect(css).toContain("text-size-adjust: 100%");
  });
  it("keeps app identity, release signing and backup while increasing the version", () => {
    const gradle = read("android/app/build.gradle");
    expect(gradle).toContain('applicationId "io.github.junyyyong.taptotalk"');
    expect(gradle).toContain("versionCode 5");
    expect(gradle).toContain('versionName "1.0.3"');
    expect(gradle).toContain("signingConfig signingConfigs.release");
    expect(read("android/app/src/main/AndroidManifest.xml")).toContain('android:allowBackup="true"');
  });
  it("requires explicit native-frame validation without weakening signature or media checks", () => {
    const verifier = read("scripts/verify-android-release.py");
    expect(verifier).toContain('--native-frame-update');
    expect(verifier).toContain('--icon-update');
    expect(verifier).toContain('authorized_icon_names');
    expect(verifier).toContain('b"Lio/github/junyyyong/taptotalk/GameInsets;"');
    expect(verifier).toContain('b"publishGameInsets"');
    expect(verifier).toContain('assert new_cert == old_cert');
    expect(verifier).toContain('assert archive.read(name) == prior.read(name)');
    expect(verifier).toContain('"sourceWorkingTreeClean": not source_status');
  });
  it("packages generated icons with their recorded dimensions and source hash", () => {
    const metadata = JSON.parse(read("store/android/icon-generation.json"));
    const hash = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
    expect(hash(metadata.source)).toBe(metadata.sourceSha256);
    expect(metadata.foregroundDp).toBe(108);
    expect(metadata.contentDp).toBe(60);
    expect(metadata.adaptiveVisibleDp).toBe(72);
    expect(metadata.legacyCanvasDp).toBe(48);
    expect(metadata.legacyContentDp).toBe(40);
    expect(metadata.legacyContentDp / metadata.legacyCanvasDp).toBe(metadata.contentDp / metadata.adaptiveVisibleDp);
    expect(Object.keys(metadata.outputs)).toHaveLength(15);
    for (const [path, info] of Object.entries(metadata.outputs) as [string, { size: number[]; sha256: string }][]) {
      const bytes = readFileSync(path);
      expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual(info.size);
      expect(hash(path)).toBe(info.sha256);
    }
    const store = readFileSync("store/android/taptotalk-play-icon-512.png");
    expect([store.readUInt32BE(16), store.readUInt32BE(20)]).toEqual([512, 512]);
    expect(readFileSync("public/icon.png")).toEqual(store);
    expect(read("index.html")).toContain('rel="icon" type="image/png" href="./icon.png"');
    expect(read("android/app/src/main/res/values/ic_launcher_background.xml")).toContain("#FFFFFF");
    for (const icon of ["ic_launcher", "ic_launcher_round"]) {
      expect(read(`android/app/src/main/res/mipmap-anydpi-v26/${icon}.xml`)).toContain('@mipmap/ic_launcher_foreground');
    }
  });
});
