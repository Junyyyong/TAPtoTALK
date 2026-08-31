/** The 22 symbols that may appear on the 9×9 game board. */
export const CONSONANTS = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
] as const;

export const CHEONJIIN_STROKES = ["ㅣ", "ㆍ", "ㅡ"] as const;

/** Only primitive, consumable tiles. Dot and stroke-addition are fixed keys. */
export const BASE_CONSONANTS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅎ"] as const;
export const BOARD_VOWELS = ["ㅣ", "ㅡ"] as const;
export const BOARD_SYMBOLS = [...BASE_CONSONANTS, ...BOARD_VOWELS] as const;

export type Consonant = (typeof CONSONANTS)[number];
export type CheonjiinStroke = (typeof CHEONJIIN_STROKES)[number];
export type BoardSymbol = (typeof BOARD_SYMBOLS)[number];

/** Controls never consume a random board tile. */
export type FixedControl = "backspace" | "space" | "punctuation" | "dot" | "stroke";

export const CONSONANT_CYCLES = {
  "ㄱ": ["ㄱ", "ㄲ", "ㅋ"],
  "ㄷ": ["ㄷ", "ㄸ", "ㅌ"],
  "ㅂ": ["ㅂ", "ㅃ", "ㅍ"],
  "ㅅ": ["ㅅ", "ㅆ"],
  "ㅈ": ["ㅈ", "ㅉ", "ㅊ"],
} as const satisfies Partial<Record<BoardSymbol, readonly Consonant[]>>;

export function transformedConsonant(base: BoardSymbol, steps: number): Consonant | undefined {
  const cycle = CONSONANT_CYCLES[base as keyof typeof CONSONANT_CYCLES];
  return cycle?.[steps];
}

export function consonantInput(value: Consonant): { base: BoardSymbol; strokes: number } {
  for (const [base, cycle] of Object.entries(CONSONANT_CYCLES)) {
    const strokes = (cycle as readonly Consonant[]).indexOf(value);
    if (strokes >= 0) return { base: base as BoardSymbol, strokes };
  }
  return { base: value as BoardSymbol, strokes: 0 };
}

export function isBoardSymbol(value: string): value is BoardSymbol {
  return (BOARD_SYMBOLS as readonly string[]).includes(value);
}
