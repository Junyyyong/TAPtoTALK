import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/ui/styles/neutral.css", "utf8");
describe("neutral ordinary UI boundary", () => {
  it("uses the requested neutral palette without replacing gameplay tokens", () => {
    for (const [name, value] of Object.entries({ background: "#ffffff", surface: "#f5f6f8", border: "#cdd2da", ink: "#363c46", muted: "#626b78" })) {
      expect(css).toContain(`--ui-${name}: ${value}`);
    }
    for (const property of css.matchAll(/(--[\w-]+)\s*:/g)) expect(property[1]).toMatch(/^--ui-/);
    expect(css).not.toContain(".letter-tile");
    expect(css).not.toContain(".uploaded-glyph");
  });
  it("does not change typography or layout dimensions", () => {
    expect(css).not.toMatch(/(?:font(?:-size|-family|-weight)?|line-height|letter-spacing|width|height|padding|margin|gap|position|transform)\s*:/);
    expect(css).toContain(".brand-mark { filter: none; }");
  });
  it("removes ordinary gloss only, not primary actions or guidance/feedback", () => {
    expect(css).toContain(".control-btn::before { display: none; }");
    expect(css).not.toMatch(/\.wood-btn|\.submit-btn|\.switch\[|\.switch-knob/);
    expect(css).not.toMatch(/animation(?:-\w+)?\s*:/);
    expect(css).not.toMatch(/\.is-(?:done|current|wrong-pick|mistake-feedback)\s*\{/);
    expect(css).toContain(":not(.is-current):not(.is-done):not(.is-wrong)");
  });
  it("lets the original emphasis colours and effects through", () => {
    for (const selector of [".mode-name", ".alphabet-intro-mark", ".intro-mark-caption", ".settings-screen h2", ".target-label", ".cheer-score", ".cheer-headline", ".result-kicker"]) {
      expect(css).not.toContain(selector);
    }
    expect(css).not.toMatch(/(?:^|,)\s*\.text-btn\s*[,\{]/m);
    expect(css).toContain(".learning-intro-stats dd { color: var(--cool); }");
  });
  it("orders the neutral skin after storage while keeping native fit last", () => {
    const entry = readFileSync("src/ui/styles/index.css", "utf8");
    expect(entry.indexOf('"./storage.css"')).toBeLessThan(entry.indexOf('"./neutral.css"'));
    expect(entry.indexOf('"./neutral.css"')).toBeLessThan(entry.indexOf('"./nativeFrame.css"'));
  });
  it("does not add a surface or outline behind records and the clock", () => {
    expect(css).not.toContain(".run-stat-number");
    expect(css).not.toMatch(/\.learning-intro-stats\s*\{/);
    expect(css).toContain(".learning-intro-stats dd { color: var(--cool); }");
  });
});
