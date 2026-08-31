import { BOARD_SYMBOLS, type BoardSymbol } from "./keys";
import { requiredBoardSymbols } from "./target";

export const BOARD_SIZE = 81;

export interface LetterTile {
  id: number;
  symbol: BoardSymbol;
  /** True when this copy was reserved to make the target solvable. */
  required: boolean;
}

export type SymbolWeights = Readonly<Partial<Record<BoardSymbol, number>>>;

/** Common Korean letters receive more of the board's spare positions. */
export const DEFAULT_SYMBOL_WEIGHTS: SymbolWeights = {
  "ㄱ": 8, "ㄴ": 8, "ㄹ": 7, "ㅁ": 6, "ㅂ": 4, "ㅅ": 8, "ㅇ": 10,
  "ㅈ": 5, "ㅎ": 5, "ㅣ": 12, "ㆍ": 12, "ㅡ": 9,
};

function weightedPick(rng: () => number, weights: SymbolWeights): BoardSymbol {
  const entries = BOARD_SYMBOLS.map((symbol) => [symbol, Math.max(0, weights[symbol] ?? 2)] as const);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = rng() * total;
  for (const [symbol, weight] of entries) {
    cursor -= weight;
    if (cursor <= 0) return symbol;
  }
  return BOARD_SYMBOLS[BOARD_SYMBOLS.length - 1]!;
}

function shuffle<T>(values: T[], rng: () => number): T[] {
  for (let index = values.length - 1; index > 0; index--) {
    const other = Math.floor(rng() * (index + 1));
    [values[index], values[other]] = [values[other]!, values[index]!];
  }
  return values;
}

export function createLetterBoard(
  target: string,
  rng: () => number = Math.random,
  weights: SymbolWeights = DEFAULT_SYMBOL_WEIGHTS,
): LetterTile[] {
  const required = requiredBoardSymbols(target);
  if (required.length > BOARD_SIZE) {
    throw new RangeError(`Target needs ${required.length} board taps; maximum is ${BOARD_SIZE}.`);
  }

  const tiles: LetterTile[] = required.map((symbol, id) => ({ id, symbol, required: true }));
  while (tiles.length < BOARD_SIZE) {
    tiles.push({ id: tiles.length, symbol: weightedPick(rng, weights), required: false });
  }
  return shuffle(tiles, rng);
}

