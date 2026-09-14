import { expect, it } from "vitest";
import { syllableTargetNote } from "./syllableNotes";
import { createSyllablePractice, learningStageAt, SYLLABLE_STAGES } from "./learningJourney";
import { SYLLABLE_GAME_TARGETS, WORD_STAGES } from "./learningJourney";
import { composeTokens } from "../core/hangul/compose";
import { requiredBoardSymbols } from "../core/hangul/target";

it("uses only meaningful, composable single syllables after practice", () => {
  expect(SYLLABLE_GAME_TARGETS).toHaveLength(26);
  for (const target of SYLLABLE_GAME_TARGETS) {
    expect(target).toHaveLength(1);
    expect(syllableTargetNote(target)).not.toMatch(/^\[/);
    expect(composeTokens(requiredBoardSymbols(target))).toBe(target);
    expect(learningStageAt("syllable", 100, target, () => 0).target).not.toBe(target);
  }
  for (const target of ["워", "외", "웨", "까"]) expect(SYLLABLE_GAME_TARGETS).not.toContain(target);
  expect(syllableTargetNote("외")).toBe("[we]");
  expect(syllableTargetNote("밥")).toBe("meal");
  expect(syllableTargetNote("흙")).toBe("soil");
  for (const word of ["샤워", "의자", "웨이터", "외국"]) expect(WORD_STAGES.some(s => s.word === word)).toBe(true);
  expect(WORD_STAGES.some(s => s.word === "외")).toBe(false);
});

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
