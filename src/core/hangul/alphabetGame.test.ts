import { describe, expect, it } from "vitest";
import { checkSequenceTap, createAlphabetBoard, decomposeAlphabetTarget } from "./alphabetGame";
import { ALPHABET_ROUNDS } from "../../content/prompts";

describe("Korean Alphabet sequence game", () => {
  it("teaches consonants, vowels, syllables, then complex sound words", () => {
    expect(ALPHABET_ROUNDS.map((round) => round.id)).toEqual(["consonants", "vowels", "syllables", "sounds"]);
    expect(ALPHABET_ROUNDS.map((round) => round.durationMs)).toEqual([40_000, 40_000, 120_000, 90_000]);
    expect(ALPHABET_ROUNDS[0]!.sequence.slice(0, 4)).toEqual(["ㄱ", "ㄴ", "ㄷ", "ㄹ"]);
    expect(ALPHABET_ROUNDS[1]!.sequence).toEqual(["ㅏ", "ㅑ", "ㅓ", "ㅕ", "ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ", "ㅣ"]);
    expect(ALPHABET_ROUNDS[3]!.sequence.slice(0, 3)).toEqual(["쾅", "쿵", "꽥"]);
    expect(ALPHABET_ROUNDS[2]!.tapGroups.slice(0, 2)).toEqual([["ㄱ", "ㅏ"], ["ㄴ", "ㅏ"]]);
    expect(ALPHABET_ROUNDS[3]!.tapGroups.slice(0, 3)).toEqual([["ㅋ", "ㅘ", "ㅇ"], ["ㅋ", "ㅜ", "ㅇ"], ["ㄲ", "ㅙ", "ㄱ"]]);
  });

  it("decomposes complete syllables into jamo blocks", () => {
    expect(decomposeAlphabetTarget("가")).toEqual(["ㄱ", "ㅏ"]);
    expect(decomposeAlphabetTarget("쾅")).toEqual(["ㅋ", "ㅘ", "ㅇ"]);
    expect(decomposeAlphabetTarget("ㄱ")).toEqual(["ㄱ"]);
  });

  it("never places complete syllable blocks in the syllable lesson", () => {
    const round = ALPHABET_ROUNDS[2]!;
    const board = createAlphabetBoard(round.tapGroups.flat(), round.pool, 81, () => 0.42);
    expect(board.some((tile) => round.sequence.includes(tile.value))).toBe(false);
    expect(round.tapGroups.flat().slice(0, 4)).toEqual(["ㄱ", "ㅏ", "ㄴ", "ㅏ"]);
    expect(board.filter((tile) => tile.required)).toHaveLength(round.tapGroups.flat().length);
  });
  it("reserves every ordered target while filling an 81-tile board", () => {
    const sequence = ["ㄱ", "ㄴ", "ㄷ", "ㄹ"];
    const board = createAlphabetBoard(sequence, ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ"], 81, () => 0.42);
    expect(board).toHaveLength(81);
    expect(board.filter((tile) => tile.required).map((tile) => tile.value).sort()).toEqual([...sequence].sort());
  });

  it("advances only when the expected symbol is tapped", () => {
    const sequence = ["ㄱ", "ㄴ"];
    expect(checkSequenceTap(sequence, 0, "ㄷ")).toEqual({ correct: false, nextIndex: 0, complete: false });
    expect(checkSequenceTap(sequence, 0, "ㄱ")).toEqual({ correct: true, nextIndex: 1, complete: false });
    expect(checkSequenceTap(sequence, 1, "ㄴ")).toEqual({ correct: true, nextIndex: 2, complete: true });
  });
});
