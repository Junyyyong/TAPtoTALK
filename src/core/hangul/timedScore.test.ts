import { expect, it } from "vitest";
import { timedScore } from "./timedScore";
import { stageSection, FULL_SCORE_TARGETS, SCORE_CAPS, SCORE_GRADES } from "../../content/timedStages";
it("awards 150 points per Alphabet target without an upper cap", () => {
  for (const n of [0, 1, 6, 10, 11, 12, 100]) {
    expect(timedScore(n, FULL_SCORE_TARGETS.alphabet, SCORE_CAPS.alphabet)).toBe(n * 150);
  }
  expect(SCORE_GRADES.find(g => 1800 >= g.at)?.text).toBe("OH MY GOD~!");
});
it("scores completed targets only and caps at 1500", () => {
  for (const target of Object.values(FULL_SCORE_TARGETS)) {
    expect(timedScore(0, target)).toBe(0);
    expect(timedScore(Math.floor(target / 2), target)).toBe(Math.floor(target / 2) / target * 1500);
    expect(timedScore(target, target)).toBe(1500);
    expect(timedScore(target * 2, target)).toBe(1500);
    expect(timedScore(.9, target)).toBe(0);
  }
  expect(timedScore(-1, 10)).toBe(0);
  expect(timedScore(NaN, 10)).toBe(0);
  expect(timedScore(1, 0)).toBe(0);
});
it("keeps all fixed board sizes unscored and starts timed play at 8x8", () => {
  expect(stageSection("alphabet", 0)).toMatchObject({ end: 17, side: 2, tutorial: true });
  expect(stageSection("alphabet", 17)).toMatchObject({ end: 23, side: 4, tutorial: true });
  expect(stageSection("alphabet", 23)).toMatchObject({ end: 27, side: 6, tutorial: true });
  expect(stageSection("alphabet", 27)).toMatchObject({ side: 8, tutorial: false });
  expect(stageSection("syllable", 0)).toMatchObject({ end: 14, tutorial: true });
  expect(stageSection("syllable", 14)).toMatchObject({ end: 24, tutorial: true });
  expect(stageSection("syllable", 24)).toMatchObject({ end: 35, tutorial: true });
  expect(stageSection("syllable", 35)).toMatchObject({ side: 8, tutorial: false });
  expect(stageSection("word", 0).tutorial).toBe(false);
});
it("uses all six grade boundaries", () => {
  for (const [score, text] of [[0,"NOT BAD"],[1,"GOOD TRY"],[299,"GOOD TRY"],[300,"GREAT!"],[599,"GREAT!"],[600,"AMAZING!"],[999,"AMAZING!"],[1000,"UNBELIEVABLE!!"],[1399,"UNBELIEVABLE!!"],[1400,"OH MY GOD~!"],[1500,"OH MY GOD~!"]] as const) {
    expect(SCORE_GRADES.find(g => score >= g.at)?.text).toBe(text);
  }
});
