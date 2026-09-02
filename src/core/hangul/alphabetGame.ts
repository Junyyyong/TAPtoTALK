export interface AlphabetTile {
  id: number;
  value: string;
  required: boolean;
}

export interface SequenceTapResult {
  correct: boolean;
  nextIndex: number;
  complete: boolean;
}

const INITIAL_JAMO = [..."ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"];
const VOWEL_JAMO = [..."ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"];
const FINAL_JAMO = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

/** Break one complete Hangul syllable into visible compatibility-jamo blocks. */
export function decomposeAlphabetTarget(value: string): string[] {
  const code = value.codePointAt(0);
  if (code === undefined || value.length !== 1 || code < 0xac00 || code > 0xd7a3) return [value];
  const offset = code - 0xac00;
  const initial = Math.floor(offset / 588);
  const vowel = Math.floor((offset % 588) / 28);
  const final = offset % 28;
  return [INITIAL_JAMO[initial]!, VOWEL_JAMO[vowel]!, ...(final ? [FINAL_JAMO[final]!] : [])];
}

const shuffle = <T>(values: T[], rng: () => number): T[] => {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [values[index], values[other]] = [values[other]!, values[index]!];
  }
  return values;
};

export function createAlphabetBoard(
  sequence: readonly string[],
  pool: readonly string[],
  size = 81,
  rng: () => number = Math.random,
): AlphabetTile[] {
  if (sequence.length > size) throw new RangeError(`Sequence needs ${sequence.length} tiles; maximum is ${size}.`);
  if (pool.length === 0) throw new RangeError("Alphabet board needs at least one filler value.");
  const tiles: AlphabetTile[] = sequence.map((value, id) => ({ id, value, required: true }));
  while (tiles.length < size) {
    tiles.push({ id: tiles.length, value: pool[Math.floor(rng() * pool.length)]!, required: false });
  }
  return shuffle(tiles, rng);
}

export function checkSequenceTap(sequence: readonly string[], index: number, value: string): SequenceTapResult {
  const correct = sequence[index] === value;
  const nextIndex = correct ? Math.min(sequence.length, index + 1) : index;
  return { correct, nextIndex, complete: nextIndex === sequence.length };
}
