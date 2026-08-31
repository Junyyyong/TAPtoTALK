/** The 22 symbols that may appear on the 9×9 game board. */
export const CONSONANTS = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
] as const;

export const CHEONJIIN_STROKES = ["ㅣ", "ㆍ", "ㅡ"] as const;

/** Only primitive, consumable tiles. Cheonjiin and consonant transforms are fixed keys. */
export const BASE_CONSONANTS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅎ"] as const;
export const BOARD_VOWELS = ["ㅣ", "ㅡ"] as const;
export const BOARD_SYMBOLS = [...BASE_CONSONANTS, ...BOARD_VOWELS] as const;

export type Consonant = (typeof CONSONANTS)[number];
export type CheonjiinStroke = (typeof CHEONJIIN_STROKES)[number];
export type BoardSymbol = (typeof BOARD_SYMBOLS)[number];

/** Controls never consume a random board tile. */
export type FixedControl = "backspace" | "space" | "punctuation" | "dot" | "aspirate";

export type ConsonantTransform = "aspirate";

export const ASPIRATED_CONSONANTS = { "ㄱ": "ㅋ", "ㄷ": "ㅌ", "ㅂ": "ㅍ", "ㅈ": "ㅊ" } as const;
export const DOUBLE_CONSONANTS = { "ㄱ": "ㄲ", "ㄷ": "ㄸ", "ㅂ": "ㅃ", "ㅅ": "ㅆ", "ㅈ": "ㅉ" } as const;

export function transformedConsonant(base: BoardSymbol): Consonant | undefined {
  return ASPIRATED_CONSONANTS[base as keyof typeof ASPIRATED_CONSONANTS];
}

export function consonantInput(value: Consonant): { base: BoardSymbol; repeats: number; transform?: ConsonantTransform } {
  const aspirated = Object.entries(ASPIRATED_CONSONANTS).find(([, transformed]) => transformed === value);
  if (aspirated) return { base: aspirated[0] as BoardSymbol, repeats: 1, transform: "aspirate" };
  const doubled = Object.entries(DOUBLE_CONSONANTS).find(([, transformed]) => transformed === value);
  if (doubled) return { base: doubled[0] as BoardSymbol, repeats: 2 };
  return { base: value as BoardSymbol, repeats: 1 };
}

export function isBoardSymbol(value: string): value is BoardSymbol {
  return (BOARD_SYMBOLS as readonly string[]).includes(value);
}
