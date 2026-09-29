import { expect, it } from "vitest";
import { createSyllableGameJourney, createSyllablePractice, learningStageAt, SYLLABLE_GAME_TARGETS } from "./learningJourney";

it("uses every word once per bag and never repeats across bag boundaries", () => {
  for (const rng of [Math.random, () => 0, () => .999]) {
    const next = createSyllableGameJourney(rng);
    let previous = "닭";
    for (let cycle = 0; cycle < 20; cycle++) {
      const words = Array.from({ length: 100 }, (_, n) => {
        const word = next(30 + cycle * 100 + n, previous);
        expect(word).not.toBe(previous); previous = word; return word;
      });
      expect(new Set(words)).toEqual(new Set(SYLLABLE_GAME_TARGETS));
    }
  }
});

it("keeps unfinished targets and remaining bag across rounds and board sizes", () => {
  const next = createSyllableGameJourney(() => .4), practice = createSyllablePractice();
  const seen: string[] = [];
  for (let i = 30; i < 130; i++) {
    const stage = learningStageAt("syllable", i, seen.at(-1) ?? "", Math.random, 1, practice, next);
    const resumed = learningStageAt("syllable", i, stage.target, Math.random, 2, practice, next);
    expect(resumed.target).toBe(stage.target);
    expect(stage.boardSide).toBe(6); expect(resumed.boardSide).toBe(8);
    seen.push(stage.target);
  }
  expect(new Set(seen).size).toBe(100);
});

it("new sessions start with a fresh independent bag", () => {
  const first = createSyllableGameJourney(() => 0);
  const initial = first(30, ""); first(31, initial);
  expect(createSyllableGameJourney(() => 0)(30, "")).toBe(initial);
});

it("preserves an older small bag, then refills from the expanded 100-word pool", () => {
  const next = createSyllableGameJourney(() => .4, [], { bag: ["강", "물"], history: ["산"], currentIndex: 45, current: "산" });
  expect(next(45, "산")).toBe("산");
  expect(next(46, "산")).toBe("강");
  expect(next(47, "강")).toBe("물");
  const words = Array.from({ length: 100 }, (_, n) => next(48 + n, ""));
  expect(new Set(words)).toEqual(new Set(SYLLABLE_GAME_TARGETS));
});

it("avoids the last ten targets across practice and shuffled bags", () => {
  for (const rng of [Math.random, () => 0, () => .999]) {
    const practice = createSyllablePractice(rng);
    expect(new Set(practice.map(s => s.target)).size).toBe(18);
    const history = practice.slice(-10).map(s => s.target);
    const next = createSyllableGameJourney(rng, history);
    for (let index = 30; index < 530; index++) {
      const word = next(index, history.at(-1)!);
      expect(history.slice(-10)).not.toContain(word);
      history.push(word);
    }
  }
});
