import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(file, "utf8");

describe("reference-preserving web/native presentation", () => {
  it("preserves the device UI stack and intentional learning fonts", () => {
    expect(read("src/ui/styles/tokens.css")).toContain('font-family: "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif;');
    expect(read("index.html")).not.toContain('rel="preload" href="./assets/fonts/NotoSansKR-Variable.woff2"');
    expect(read("src/ui/styles/talk.css")).toContain('font-family: "TAP Serif KR", serif;');
    expect(read("src/ui/styles/talk.css")).toContain('font-family: "TAP Sans KR"');
  });

  it("keeps the recorded menu values and original short-screen breakpoints", () => {
    const title = read("src/ui/styles/title.css");
    expect(title).toContain("--reference-brand-width: min(calc(68 * var(--layout-vw, 1vw)), 250px)");
    expect(title).toMatch(/\.mode-name\s*\{[^}]*font-size: 21px;[^}]*font-weight: 800/s);
    expect(title).toMatch(/\.mode-desc\s*\{[^}]*font-size: 13px;[^}]*font-weight: 700/s);
    expect(title).toContain("max-height: 700px");
    expect(title).toContain("max-height: 580px");
  });

  it("keeps a square board inside the available height above editing controls", () => {
    const css = read("src/ui/styles/talk.css");
    expect(read("index.html")).toContain('class="letter-board-space"');
    expect(css).toContain("container-type: size");
    expect(css).toContain("width: min(100cqw,100cqh,calc(52 * var(--layout-vh, 1vh)))");
    expect(css).toContain("aspect-ratio: 1 / 1");
  });

  it("uses remaining native insets or browser env without adding them twice", () => {
    const tokens = read("src/ui/styles/tokens.css");
    for (const [edge, alias] of [["top","top"], ["right","right"], ["bottom","bottom"], ["left","left"]]) {
      expect(tokens).toContain(`--safe-${alias}: var(--safe-area-inset-${edge}, env(safe-area-inset-${edge}, 0px))`);
    }
    for (const name of ["title", "talk", "overlay", "legal", "storage"]) {
      expect(read(`src/ui/styles/${name}.css`)).toContain("var(--safe-bottom)");
    }
  });
});
