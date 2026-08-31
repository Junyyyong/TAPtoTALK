import { describe, expect, it } from "vitest";
import { createLetterBoard } from "./board";
import { composeTokens } from "./compose";
import { BOARD_SYMBOLS } from "./keys";
import { requiredBoardSymbols, targetToTokens } from "./target";

describe("TAPtoTALK Hangul domain", () => {
  it("defines exactly 22 random-board symbols", () => {
    expect(BOARD_SYMBOLS).toHaveLength(22);
    expect(new Set(BOARD_SYMBOLS).size).toBe(22);
  });

  it("round-trips a target sentence through Cheonjiin board taps", () => {
    const target = "나는 너를 사랑해";
    const input = targetToTokens(target).map((token) =>
      typeof token === "string" ? token : token.control === "space" ? " " : token.value,
    );
    expect(composeTokens(input)).toBe(target);
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
});

