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
export type FixedControl = "backspace" | "space" | "punctuation" | "dot" | "aspirate" | "double";

export type ConsonantTransform = "aspirate" | "double";

export const ASPIRATED_CONSONANTS = { "ㄱ": "ㅋ", "ㄷ": "ㅌ", "ㅂ": "ㅍ", "ㅈ": "ㅊ" } as const;
export const DOUBLE_CONSONANTS = { "ㄱ": "ㄲ", "ㄷ": "ㄸ", "ㅂ": "ㅃ", "ㅅ": "ㅆ", "ㅈ": "ㅉ" } as const;

export function transformedConsonant(base: BoardSymbol, transform: ConsonantTransform): Consonant | undefined {
  const table = transform === "aspirate" ? ASPIRATED_CONSONANTS : DOUBLE_CONSONANTS;
  return table[base as keyof typeof table];
}

export function consonantInput(value: Consonant): { base: BoardSymbol; transform?: ConsonantTransform } {
  for (const transform of ["aspirate", "double"] as const) {
    const table = transform === "aspirate" ? ASPIRATED_CONSONANTS : DOUBLE_CONSONANTS;
    const entry = Object.entries(table).find(([, transformed]) => transformed === value);
    if (entry) return { base: entry[0] as BoardSymbol, transform };
  }
  return { base: value as BoardSymbol };
}

export function isBoardSymbol(value: string): value is BoardSymbol {
  return (BOARD_SYMBOLS as readonly string[]).includes(value);
}
