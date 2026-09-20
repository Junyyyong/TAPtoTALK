import { expect, it } from "vitest";
import { createSyllablePractice, learningStageAt, SYLLABLE_STAGES, SYLLABLE_GAME_TARGETS } from "./learningJourney";
import { stageSection } from "./timedStages";

it("keeps five initial examples and shortens second practice to thirteen", () => {
  const groups = ["가나다라마바사아자차카타파하", "아야어여오요우유으이", "애에얘예와왜외워웨위의", "까따빠싸짜", "산강물불눈손발집밥옷달별입몸", "닭흙값삶몫"];
  for (let run = 0; run < 50; run++) {
    const practice = createSyllablePractice();
    expect(practice).toHaveLength(18);
    let offset = 0;
    const counts = [5,3,3,2,3,2];
    groups.forEach((group, index) => {
      const selected = practice.slice(offset, offset + counts[index]!);
      expect(new Set(selected.map(s => s.target)).size).toBe(counts[index]);
      offset += counts[index]!;
      expect(selected.every(s => group.includes(s.target))).toBe(true);
      expect(selected.every(s => s.boardSide === (index === 0 ? 2 : 4))).toBe(true);
    });
  }
});
it("redraws on a new session without mutating the full candidate list", () => {
  const first = createSyllablePractice(() => 0);
  const second = createSyllablePractice(() => .99);
  expect(first.map(s => s.target)).not.toEqual(second.map(s => s.target));
  expect(SYLLABLE_STAGES).toHaveLength(59);
  for (let i = 0; i < 18; i++) expect(learningStageAt("syllable", i, "", Math.random, 1, first)).toBe(first[i]);
});
it("ends sections after 5 and 18, then draws main-game targets from the vocabulary pool", () => {
  const practice = createSyllablePractice(() => 0);
  expect(stageSection("syllable", 0, 1, practice)).toMatchObject({ side: 2, end: 5, tutorial: true });
  expect(stageSection("syllable", 5, 1, practice)).toMatchObject({ side: 4, end: 18, tutorial: true });
  expect(stageSection("syllable", 18, 1, practice)).toMatchObject({ side: 6, tutorial: false });
  expect(stageSection("syllable", 18, 2, practice)).toMatchObject({ side: 8, tutorial: false });
  const candidates = SYLLABLE_GAME_TARGETS.map((_, i) => learningStageAt("syllable", 18, "", () => (i + .5) / SYLLABLE_GAME_TARGETS.length, 1, practice).target);
  expect(new Set(candidates)).toEqual(new Set(SYLLABLE_GAME_TARGETS));
});
