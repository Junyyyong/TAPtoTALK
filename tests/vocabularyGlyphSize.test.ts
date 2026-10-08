import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vocabulary glyph sizing contract", () => {
  const css = readFileSync("src/ui/styles/talk.css", "utf8");

  it("uses the actual tile as the glyph size container, only in Vocabulary", () => {
    expect(css).toContain(".is-word-mode .letter-tile { container-type: inline-size; }");
    expect(css).toContain(".is-word-mode .letter-tile .letter-glyph { font-size: min(1em,57cqi); }");
  });

  it("retains the original glyph masks and individual symbol scale factors", () => {
    expect(css).toContain(".uploaded-glyph { display: block; width: 1em; height: 1em;");
    expect(css).toContain(".uploaded-glyph--dot-trap { transform: scale(1.331); }");
    expect(css).toContain(".letter-tile .uploaded-glyph--double-ieung { scale: 1.2; }");
    expect(css).toContain(".letter-tile .uploaded-glyph--triangle { scale: 1.1; }");
    expect(css).toContain(".letter-tile--cheonjiin-dot .uploaded-glyph { transform: scale(1.21); }");
  });
});
