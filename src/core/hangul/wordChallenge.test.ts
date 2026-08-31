import { describe, expect, it } from "vitest";
import { isWordMatch, wordCountLabel } from "./wordChallenge";

describe("word challenge", () => {
  it("accepts the exact composed Korean word", () => {
    expect(isWordMatch("사랑", "사랑")).toBe(true);
    expect(isWordMatch(" 사랑 ", "사랑")).toBe(true);
  });

  it("rejects an incomplete or different word", () => {
    expect(isWordMatch("사라", "사랑")).toBe(false);
    expect(isWordMatch("우정", "사랑")).toBe(false);
  });

  it("formats the completed word count", () => {
    expect(wordCountLabel(1)).toBe("1 word");
    expect(wordCountLabel(7)).toBe("7 words");
  });
});
