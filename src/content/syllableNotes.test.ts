import { expect, it } from "vitest";
import { syllableTargetNote } from "./syllableNotes";
import { createSyllablePractice, learningStageAt, SYLLABLE_STAGES } from "./learningJourney";

it("labels every candidate and session, including randomized main play", () => {
  for (const stage of [...SYLLABLE_STAGES, ...createSyllablePractice()]) {
    expect(stage.note).toBe(syllableTargetNote(stage.target));
    expect(stage.note.length).toBeGreaterThan(0);
  }
  for (let i = 0; i < 100; i++) {
    const stage = learningStageAt("syllable", 100 + i);
    expect(stage.note).toBe(syllableTargetNote(stage.target));
  }
});
it("uses sounds before noun lessons and meanings for noun finals", () => {
  expect(syllableTargetNote("가")).toBe("[ka]");
  expect(syllableTargetNote("으")).toBe("[ɯ]");
  expect(syllableTargetNote("까")).toBe("[k͈a]");
  expect(syllableTargetNote("발")).toBe("foot");
  expect(syllableTargetNote("닭")).toBe("chicken");
  expect(SYLLABLE_STAGES.slice(0, 40).every(s => s.note.startsWith("["))).toBe(true);
  expect(SYLLABLE_STAGES.slice(40).every(s => !s.note.startsWith("["))).toBe(true);
  expect(syllableTargetNote("unknown")).toBe("");
});
