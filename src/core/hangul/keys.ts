/** Every consonant is an independent tile; no repeated-tap consonant groups. */
export const CONSONANTS = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
] as const;

export const CHEONJIIN_STROKES = ["ㅣ", "ㆍ", "ㅡ"] as const;
export const PUNCTUATION_SYMBOLS = ["!", "?"] as const;

/** Every input symbol accepted by the composer. */
export const BOARD_SYMBOLS = [...CONSONANTS, ...CHEONJIIN_STROKES, ...PUNCTUATION_SYMBOLS] as const;
/** The 9×9 board excludes the three reusable Cheonjiin controls. */
export const TILE_SYMBOLS = [...CONSONANTS, ...PUNCTUATION_SYMBOLS] as const;

export type Consonant = (typeof CONSONANTS)[number];
export type CheonjiinStroke = (typeof CHEONJIIN_STROKES)[number];
export type BoardSymbol = (typeof BOARD_SYMBOLS)[number];

/** Controls never consume a random board tile. */
export type FixedControl = "backspace" | "space" | CheonjiinStroke;

export function isBoardSymbol(value: string): value is BoardSymbol {
  return (BOARD_SYMBOLS as readonly string[]).includes(value);
}
