import { describe, expect, it } from "vitest";
import { createLetterBoard } from "./board";
import { composeTokens } from "./compose";
import { BOARD_SYMBOLS, CHEONJIIN_STROKES, CONSONANTS, PUNCTUATION_SYMBOLS } from "./keys";
import { materializeTargetTokens, requiredBoardSymbols, targetToTokens } from "./target";
import { SENTENCE_LEVELS } from "../../content/prompts";

describe("TAPtoTALK Hangul domain", () => {
  it("gives every consonant, Cheonjiin stroke, and punctuation mark its own board symbol", () => {
    expect(BOARD_SYMBOLS).toHaveLength(27);
    expect(new Set(BOARD_SYMBOLS).size).toBe(27);
    expect(BOARD_SYMBOLS).toEqual([...CONSONANTS, ...CHEONJIIN_STROKES, ...PUNCTUATION_SYMBOLS]);
  });

  it("round-trips a target sentence through Cheonjiin board taps", () => {
    const target = "나는 너를 사랑해";
    const input = materializeTargetTokens(targetToTokens(target));
    expect(composeTokens(input)).toBe(target);
  });

  it("builds tense and aspirated consonants from independent tiles", () => {
    const target = "까 타 빠 싸 짜 차";
    expect(composeTokens(materializeTargetTokens(targetToTokens(target)))).toBe(target);
  });

  it("keeps ㄱ, ㅋ, and ㄲ as three independent board choices", () => {
    expect(BOARD_SYMBOLS).toContain("ㄱ");
    expect(BOARD_SYMBOLS).toContain("ㅋ");
    expect(BOARD_SYMBOLS).toContain("ㄲ");
    expect(targetToTokens("까")[0]).toBe("ㄲ");
  });

  it("composes combined final consonants in entered order", () => {
    expect(composeTokens(["ㅂ", "ㅡ", "ㆍ", "ㆍ", "ㅣ", "ㅣ", "ㄹ", "ㄱ"])).toBe("뷁");
    expect(composeTokens(materializeTargetTokens(targetToTokens("뷁")))).toBe("뷁");
  });

  it("reserves every symbol needed by the target and fills 81 cells", () => {
    const target = "나는 너를 사랑해";
    const board = createLetterBoard(target, () => 0.42);
    const needed = requiredBoardSymbols(target);
    const reserved = board.filter((tile) => tile.required).map((tile) => tile.symbol);

    expect(board).toHaveLength(81);
    expect(reserved.sort()).toEqual([...needed].sort());
  });

  it("rejects a target that cannot fit on one board", () => {
    expect(() => createLetterBoard("가".repeat(41))).toThrow(RangeError);
  });

  it("keeps every lesson phrase solvable on one 81-block board", () => {
    expect(SENTENCE_LEVELS).toHaveLength(6);
    for (const level of SENTENCE_LEVELS) {
      expect(level.prompts).toHaveLength(5);
      for (const prompt of level.prompts) expect(() => createLetterBoard(prompt.text)).not.toThrow();
    }
  });
});
