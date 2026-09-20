import { describe, expect, it } from "vitest";
import { createSyllablePractice, learningStageAt } from "./learningJourney";
describe("Syllable category labels", () => {
  it("uses six bilingual practice labels while keeping main play unchanged", () => {
    const practice = createSyllablePractice();
    const labels = ["자음·모음 조합 / Letter Combinations", "기본 모음 / Basic Vowels", "복모음 / Compound Vowels", "쌍자음 / Double Consonants", "받침 / Final Consonants", "겹받침 / Double Finals"];
    expect(practice.map(stage => stage.category)).toEqual(labels.flatMap((label,index)=>Array([5,3,3,2,3,2][index]).fill(label)));
    expect(learningStageAt("syllable", 30, "", Math.random, 1, practice).category).toBe("One-Syllable Words");
  });
});
