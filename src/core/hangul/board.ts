import { BOARD_SYMBOLS, PUNCTUATION_SYMBOLS, type BoardSymbol } from "./keys";
import { requiredBoardSymbols } from "./target";

export const BOARD_SIZE = 81;
export const TARGET_SYMBOL_BUFFER = 1.5;
export const MIRROR_TRAP_CHANCE = 0.2;
export type GlyphTransform = "flip-x" | "flip-y" | "rotate-90" | "rotate-270";

/** Only transformations that visibly change the glyph are offered as traps. */
const TRAP_TRANSFORMS: Readonly<Partial<Record<BoardSymbol, readonly GlyphTransform[]>>> = {
  "ㄱ": ["flip-x", "flip-y"], "ㄲ": ["flip-x", "flip-y"], "ㄴ": ["flip-x", "flip-y"],
  "ㄷ": ["flip-x", "rotate-90", "rotate-270"], "ㄸ": ["flip-x", "rotate-90", "rotate-270"],
  "ㄹ": ["flip-x", "flip-y", "rotate-90", "rotate-270"],
  "ㅂ": ["rotate-90"], "ㅃ": ["rotate-90"],
  "ㅅ": ["flip-y", "rotate-90", "rotate-270"], "ㅆ": ["flip-y", "rotate-90", "rotate-270"],
  "ㅈ": ["flip-y", "rotate-90", "rotate-270"], "ㅉ": ["flip-y", "rotate-90", "rotate-270"],
  "ㅊ": ["flip-y", "rotate-90", "rotate-270"], "ㅋ": ["flip-x", "flip-y"],
  "ㅌ": ["rotate-90"], "ㅍ": ["rotate-90"], "ㅎ": ["flip-y", "rotate-90", "rotate-270"],
};

export function trapTransformsFor(symbol: BoardSymbol): readonly GlyphTransform[] {
  return TRAP_TRANSFORMS[symbol] ?? [];
}

export function trapTransformFor(symbol: BoardSymbol): GlyphTransform | undefined {
  return trapTransformsFor(symbol)[0];
}

export interface LetterTile {
  id: number;
  symbol: BoardSymbol;
  /** True when this copy was reserved to make the target solvable. */
  required: boolean;
  /** Punctuation-free word boards may show a visibly transformed spare consonant. */
  transform?: GlyphTransform;
}

export const MIRROR_TRAP_TOKEN = "×";

export function inputValueForTile(tile: Pick<LetterTile, "symbol" | "transform">): BoardSymbol | typeof MIRROR_TRAP_TOKEN {
  return tile.transform ? MIRROR_TRAP_TOKEN : tile.symbol;
}

export type SymbolWeights = Readonly<Partial<Record<BoardSymbol, number>>>;

/** Common Korean letters receive more of the board's spare positions. */
export const DEFAULT_SYMBOL_WEIGHTS: SymbolWeights = {
  "ㄱ": 8, "ㄲ": 2, "ㄴ": 12, "ㄷ": 6, "ㄸ": 2, "ㄹ": 9, "ㅁ": 7,
  "ㅂ": 6, "ㅃ": 2, "ㅅ": 10, "ㅆ": 3, "ㅇ": 14, "ㅈ": 6, "ㅉ": 2,
  "ㅊ": 4, "ㅋ": 3, "ㅌ": 3, "ㅍ": 3, "ㅎ": 7,
  "ㅣ": 12, "ㆍ": 14, "ㅡ": 9,
  ".": 1, "!": 1, "?": 1,
};

function weightedPick(rng: () => number, weights: SymbolWeights, symbols: readonly BoardSymbol[]): BoardSymbol {
  const entries = symbols.map((symbol) => [symbol, Math.max(0, weights[symbol] ?? 2)] as const);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = rng() * total;
  for (const [symbol, weight] of entries) {
    cursor -= weight;
    if (cursor <= 0) return symbol;
  }
  return symbols[symbols.length - 1]!;
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
  const targetSymbols = requiredBoardSymbols(target);
  const punctuationFree = !targetSymbols.some((symbol) =>
    (PUNCTUATION_SYMBOLS as readonly string[]).includes(symbol),
  );
  const dealSymbols = punctuationFree
    ? BOARD_SYMBOLS.filter((symbol) => !(PUNCTUATION_SYMBOLS as readonly string[]).includes(symbol))
    : BOARD_SYMBOLS;
  const bufferedCount = Math.ceil(targetSymbols.length * TARGET_SYMBOL_BUFFER);
  const required = [...targetSymbols];
  for (let index = required.length; index < bufferedCount; index += 1) {
    required.push(targetSymbols[index % targetSymbols.length]!);
  }
  if (required.length > BOARD_SIZE) {
    throw new RangeError(`Target needs ${required.length} buffered board symbols; maximum is ${BOARD_SIZE}.`);
  }

  const tiles: LetterTile[] = required.map((symbol, id) => ({ id, symbol, required: true }));
  while (tiles.length < BOARD_SIZE) {
    const symbol = weightedPick(rng, weights, dealSymbols);
    const transform = punctuationFree && rng() < MIRROR_TRAP_CHANCE ? trapTransformFor(symbol) : undefined;
    tiles.push({ id: tiles.length, symbol, required: false, ...(transform ? { transform } : {}) });
  }
  return shuffle(tiles, rng);
}
