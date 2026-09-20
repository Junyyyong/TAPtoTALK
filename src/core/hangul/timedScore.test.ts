import { expect, it } from "vitest";
import { timedScore } from "./timedScore";
import { stageSection, POINTS_PER_TARGET, SCORE_GRADES, tutorialReward } from "../../content/timedStages";
it("scores completed targets without a cap and reaches OMG at 10/10/7", () => {
 for (const mode of ["alphabet","syllable","word"] as const) {
  for (const n of [0,1,6,7,9,10,11,100])
   expect(timedScore(n,POINTS_PER_TARGET[mode])).toBe(n*(mode==="word"?225:150));
  const threshold=mode==="word"?7:10;
  expect(timedScore(threshold-1,POINTS_PER_TARGET[mode])).toBeLessThan(1500);
  expect(timedScore(threshold,POINTS_PER_TARGET[mode])).toBeGreaterThanOrEqual(1500);
 }
 for (const n of [-1,.9,NaN,Infinity]) expect(timedScore(n,150)).toBe(0);
 expect(timedScore(1,0)).toBe(0);
 expect(timedScore(1,NaN)).toBe(0);
});
it("advances tutorial video tiers", () => {
 expect([2,4,6,8].map(side=>tutorialReward(side).at)).toEqual([300,600,1000,1500]);
});
it("keeps all fixed board sizes unscored and starts timed play at 8x8", () => {
  expect(stageSection("alphabet", 0)).toMatchObject({ end: 17, side: 2, tutorial: true });
  expect(stageSection("alphabet", 17)).toMatchObject({ end: 23, side: 4, tutorial: true });
  expect(stageSection("alphabet", 23)).toMatchObject({ end: 27, side: 6, tutorial: true });
  expect(stageSection("alphabet", 27)).toMatchObject({ side: 8, tutorial: false });
  expect(stageSection("syllable", 0)).toMatchObject({ end: 14, tutorial: true });
  expect(stageSection("syllable", 14)).toMatchObject({ end: 59, tutorial: true, side: 4 });
  expect(stageSection("syllable", 58)).toMatchObject({ end: 59, tutorial: true, side: 4 });
  expect(stageSection("syllable", 59)).toMatchObject({ side: 6, tutorial: false });
  expect(stageSection("syllable", 59, 2)).toMatchObject({ side: 8, tutorial: false });
  expect(stageSection("word", 0).tutorial).toBe(false);
});
it("uses all six grade boundaries", () => {
  for (const [score, text] of [[0,"NOT BAD"],[1,"GOOD TRY"],[299,"GOOD TRY"],[300,"GREAT!"],[599,"GREAT!"],[600,"AMAZING!"],[999,"AMAZING!"],[1000,"UNBELIEVABLE!!"],[1399,"UNBELIEVABLE!!"],[1400,"UNBELIEVABLE!!"],[1499,"UNBELIEVABLE!!"],[1500,"OH MY GOD~!"]] as const) {
    expect(SCORE_GRADES.find(g => score >= g.at)?.text).toBe(text);
  }
});
