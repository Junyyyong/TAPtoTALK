/** The 22 symbols that may appear on the 9×9 game board. */
export const CONSONANTS = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
] as const;

export const CHEONJIIN_STROKES = ["ㅣ", "ㆍ", "ㅡ"] as const;

/** Galaxy Cheonjiin consonant keys. Repeated taps cycle within each group. */
export const BASE_CONSONANTS = ["ㄱ", "ㄴ", "ㄷ", "ㅂ", "ㅅ", "ㅇ", "ㅈ"] as const;
export const BOARD_VOWELS = ["ㅣ", "ㅡ"] as const;
export const BOARD_SYMBOLS = [...BASE_CONSONANTS, ...BOARD_VOWELS] as const;

export type Consonant = (typeof CONSONANTS)[number];
export type CheonjiinStroke = (typeof CHEONJIIN_STROKES)[number];
export type BoardSymbol = (typeof BOARD_SYMBOLS)[number];

/** Controls never consume a random board tile. */
export type FixedControl = "backspace" | "space" | "punctuation" | "dot" | "cycle";

export const CONSONANT_KEY_CYCLES = {
  "ㄱ": ["ㄱ", "ㅋ", "ㄲ"],
  "ㄴ": ["ㄴ", "ㄹ"],
  "ㄷ": ["ㄷ", "ㅌ", "ㄸ"],
  "ㅂ": ["ㅂ", "ㅍ", "ㅃ"],
  "ㅅ": ["ㅅ", "ㅎ", "ㅆ"],
  "ㅇ": ["ㅇ", "ㅁ"],
  "ㅈ": ["ㅈ", "ㅊ", "ㅉ"],
} as const satisfies Partial<Record<BoardSymbol, readonly Consonant[]>>;

export function cycleConsonant(base: BoardSymbol, tapIndex: number): Consonant | undefined {
  const cycle = CONSONANT_KEY_CYCLES[base as keyof typeof CONSONANT_KEY_CYCLES];
  return cycle?.[tapIndex % cycle.length];
}

export function consonantKeyLabel(base: BoardSymbol): string {
  return CONSONANT_KEY_CYCLES[base as keyof typeof CONSONANT_KEY_CYCLES]?.join("") ?? base;
}

export function consonantInput(value: Consonant): { base: BoardSymbol; taps: number } {
  for (const [base, cycle] of Object.entries(CONSONANT_KEY_CYCLES)) {
    const index = (cycle as readonly Consonant[]).indexOf(value);
    if (index >= 0) return { base: base as BoardSymbol, taps: index + 1 };
  }
  return { base: value as BoardSymbol, taps: 1 };
}

export function isBoardSymbol(value: string): value is BoardSymbol {
  return (BOARD_SYMBOLS as readonly string[]).includes(value);
}
