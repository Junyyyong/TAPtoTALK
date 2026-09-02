import { describe, expect, it } from "vitest";
import { SENTENCE_PROMPTS, WORD_TARGETS } from "./prompts";

describe("Korean prompt translations", () => {
  it("gives every word and sentence one concise English translation", () => {
    for (const target of WORD_TARGETS) expect(target.translation.trim().length).toBeGreaterThan(0);
    for (const prompt of SENTENCE_PROMPTS) expect(prompt.translation.trim().length).toBeGreaterThan(0);
  });

  it("keeps word translations short enough for the inline target", () => {
    for (const target of WORD_TARGETS) expect(target.translation.length).toBeLessThanOrEqual(16);
  });
});
