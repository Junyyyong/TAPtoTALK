import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TALK_STORAGE_KEYS } from "../src/ui/talkStorage";

const read = (path: string) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const privacy = read("public/privacy.html");

describe("bundled release documents", () => {
  it.each(["english", "korean"])("uses the owner-confirmed contact in %s", language => {
    const section = privacy.match(new RegExp(`<section id="${language}"[^>]*>([\\s\\S]*?)</section>`))?.[1];
    expect(section).toBeDefined();
    expect(section!.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g))
      .toEqual(["wnsdydtml@gmail.com", "wnsdydtml@gmail.com"]);
  });
  it("describes TALK data, not the copied numeric game's records", () => {
    expect(privacy).toContain("TAPtoTALK");
    expect(privacy).toContain("TapeeTepee openstudio");
    expect(privacy).toContain("highest reached stage");
    expect(privacy).toContain("current board and tile input");
    expect(privacy).toContain("Vercel");
    expect(privacy).toContain("Google Gmail");
    expect(privacy).not.toMatch(/TAPtoTEN|daily play records|best scores and times|wsndydtml/);
  });
  it.each(["public/privacy.html", "public/licenses.html"])("%s is static and readable without external navigation", file => {
    const html = read(file);
    expect(html).not.toMatch(/<script\b|<form\b|<iframe\b|\b(?:href|src)="(?:https?:|\/\/|mailto:)/i);
    expect(html).toContain('./legal/legal.css');
  });
  it("bundles both fonts, Capacitor, Android and sampled-instrument notices", () => {
    const html = read("public/licenses.html");
    for (const text of ["Noto Sans KR", "Noto Serif KR", "SIL OPEN FONT LICENSE", "@capacitor/preferences", "@capacitor/core", "Apache License", "CC0 1.0 Universal", "VCSL"]) expect(html).toContain(text);
    const inventory = JSON.parse(read("public/legal/dependencies.json"));
    expect(inventory).toContainEqual({group:"org.apache.cordova", name:"framework", version:"14.0.1", license:"Apache-2.0"});
    expect(existsSync(new URL("../public/assets/fonts/NotoSansKR-Variable.woff2", import.meta.url))).toBe(true);
  });
  it("keeps documents in a local, script-disabled modal with a close control", () => {
    const html = read("index.html"), source = read("src/ui/screens/legalDocuments.ts");
    expect(html).toContain('id="legal-dialog" aria-labelledby="legal-title"');
    expect(html).toContain('sandbox="allow-same-origin"');
    expect(html).toContain('id="btn-legal-close"');
    expect(source).toContain('"./privacy.html"');
    expect(source).toContain('"./licenses.html"');
    expect(source).not.toMatch(/(?:localStorage|talkStore|Preferences|fetch)\b/);
  });
});

describe("release identity and storage contract", () => {
  it("does not change the installed app identity", () => {
    const id = "io.github.junyyyong.taptotalk";
    expect(read("capacitor.config.ts")).toContain(`appId: "${id}"`);
    expect(read("android/app/build.gradle")).toContain(`applicationId "${id}"`);
    expect(read("android/app/build.gradle")).toContain(`namespace = "${id}"`);
    expect(read("android/app/src/main/res/values/strings.xml")).toContain(id);
    expect(read("capacitor.config.ts")).not.toMatch(/server\s*:/);
  });
  it("retains the exact progress/preferences/record keys across releases", () => {
    expect(TALK_STORAGE_KEYS).toEqual([
      "taptotalk.preferences.v1", "taptotalk.progress.v1.alphabet",
      "taptotalk.progress.v1.syllable", "taptotalk.progress.v1.word", "taptotalk.records.v1",
    ]);
  });
});
