import { describe, expect, it } from "vitest";
import { createSyllablePractice, learningStageAt } from "./learningJourney";
describe("Syllable category labels", () => {
  it("keeps six English labels through randomized practice and main play", () => {
    const practice = createSyllablePractice();
    const labels = ["Letter Combinations", "Basic Vowels", "Compound Vowels", "Double Consonants", "Final Consonants", "Double Finals"];
    practice.forEach((stage, index) => expect(stage.category).toBe(labels[Math.floor(index / 5)]));
    expect(learningStageAt("syllable", 30, "", Math.random, 1, practice).category).toBe("One-Syllable Words");
  });
});
