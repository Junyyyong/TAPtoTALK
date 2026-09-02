import { describe, expect, it } from "vitest";
import { checkSequenceTap, createAlphabetBoard } from "./alphabetGame";
import { ALPHABET_ROUNDS } from "../../content/prompts";

describe("Korean Alphabet sequence game", () => {
  it("teaches consonants, vowels, syllables, then complex sound words", () => {
    expect(ALPHABET_ROUNDS.map((round) => round.id)).toEqual(["consonants", "vowels", "syllables", "sounds"]);
    expect(ALPHABET_ROUNDS[0]!.sequence.slice(0, 4)).toEqual(["ㄱ", "ㄴ", "ㄷ", "ㄹ"]);
    expect(ALPHABET_ROUNDS[1]!.sequence).toEqual(["ㅏ", "ㅑ", "ㅓ", "ㅕ", "ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ", "ㅣ"]);
    expect(ALPHABET_ROUNDS[3]!.sequence.slice(0, 3)).toEqual(["쾅", "쿵", "꽥"]);
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
