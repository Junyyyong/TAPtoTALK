import { describe, expect, it } from "vitest";
import { INTRO_MARKS } from "./introMarks";

describe("serif intro marks", () => {
  it("renders all three as bundled outlines without a font or image request", () => {
    expect(Object.keys(INTRO_MARKS)).toEqual(["alphabet", "syllable", "word"]);
    for (const svg of Object.values(INTRO_MARKS)) {
      expect(svg).toContain('viewBox="0 0 140 140"');
      expect(svg).toContain('<path fill="currentColor"');
      expect(svg).not.toMatch(/<text|<image|href=|font-family/);
    }
  });
});
