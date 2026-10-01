import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
describe("responsive Android presentation boundary", () => {
  it("anchors navigation to the safe screen rather than the centered content width", () => {
    const css=read("src/ui/styles/talk.css");
    expect(css).toContain(".screen > .hud > .icon-btn { position: absolute; top: calc(var(--safe-top) + 11px); }");
    expect(css).toContain(".screen > .hud > .icon-btn:first-child { left: max(12px, var(--safe-left)); }");
    expect(css).toContain(".screen > .hud > .pause-btn { right: max(12px, var(--safe-right)); }");
    expect(css).toContain(".screen > .hud > :nth-child(2) { grid-column: 2; }");
  });
  it("fills the usable aspect ratio rather than fixing a 390×844 rectangle", () => {
    const css=read("src/ui/styles/nativeFrame.css");
    expect(css).toContain("width: var(--frame-width, 390px)");
    expect(css).toContain("height: var(--frame-height, 844px)");
    expect(css).toContain("overflow: visible");
    for (const edge of ["top", "right", "bottom", "left"]) expect(css).toContain(`--safe-${edge}: 0px`);
  });
  it("extends only splash artwork behind remaining bars and retains cover proportions", () => {
    const css=read("src/ui/styles/nativeResponsive.css"),title=read("src/ui/styles/title.css");
    expect(css).toContain(".is-native-frame > .studio-splash-screen");
    expect(css).toContain(".is-native-frame > .splash-screen");
    expect(css).toContain("width: var(--frame-full-width, 100%)");
    expect(css).toContain("height: var(--frame-full-height, 100%)");
    expect(title).toMatch(/\.splash-cover\s*\{[^}]*width: 100%;[^}]*height: auto;[^}]*translateY\(-50%\)/s);
    expect(css).not.toMatch(/background(?:-image)?\s*:|linear-gradient|radial-gradient/);
  });
  it("sizes square boards to the remaining space without changing colors or effects", () => {
    const css=read("src/ui/styles/nativeResponsive.css");
    expect(css).toContain("width: min(100cqw, 100cqh, 560px)");
    expect(css).not.toMatch(/(?:color|background|shadow|animation|font-family|font-weight|line-height)\s*:/);
    expect(css).not.toContain(".letter-tile");
    expect(css).toContain(".is-native-frame .mode-name { font-size: 21px; }");
    expect(css).toContain(".is-native-frame .mode-desc { font-size: 13px; }");
  });
  it("keeps web and storage flow outside the native-only title fallback", () => {
    const js=read("src/ui/talkLayout.ts");
    expect(js).toContain("if (!enabled) return;");
    expect(js).toContain('attributeFilter: ["hidden"]');
    expect(js).toContain("screen.scrollTop = scroll");
    expect(js).not.toMatch(/localStorage|talkStore|TalkApp|setItem/);
    expect(read("src/main.ts")).toContain('trackTalkTitleLayout(Capacitor.getPlatform() === "android")');
  });
});
