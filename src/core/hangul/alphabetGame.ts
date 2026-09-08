import { trapTransformFor, trapTransformsFor, type GlyphTransform } from "./board";
import { FINAL_PARTS, TENSE_PARTS } from "./layout";

export interface AlphabetTile {
  id: number;
  value: string;
  required: boolean;
  transform?: GlyphTransform;
}

export interface SequenceTapResult {
  correct: boolean;
  nextIndex: number;
  complete: boolean;
}

const INITIAL_JAMO = [..."ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"];
const VOWEL_JAMO = [..."ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"];
const FINAL_JAMO = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const splitTense = (jamo: string): readonly string[] => TENSE_PARTS[jamo] ?? [jamo];

/** Break one complete Hangul syllable into visible compatibility-jamo blocks. */
export function decomposeAlphabetTarget(value: string): string[] {
  const code = value.codePointAt(0);
  if (code === undefined || value.length !== 1 || code < 0xac00 || code > 0xd7a3) return [value];
  const offset = code - 0xac00;
  const initial = Math.floor(offset / 588);
  const vowel = Math.floor((offset % 588) / 28);
  const final = offset % 28;
  const initialJamo = INITIAL_JAMO[initial]!;
  const finalJamo = FINAL_JAMO[final]!;
  return [
    ...splitTense(initialJamo),
    VOWEL_JAMO[vowel]!,
    ...(finalJamo ? FINAL_PARTS[finalJamo as keyof typeof FINAL_PARTS].flatMap(splitTense) : []),
  ];
}

const shuffle = <T>(values: T[], rng: () => number): T[] => {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [values[index], values[other]] = [values[other]!, values[index]!];
  }
  return values;
};

const TRAP_GLYPHS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅂ", "ㅅ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"] as const;

function trapCandidates(targets: readonly string[]): readonly { value: string; transform: GlyphTransform }[] {
  const targetTransforms = targets.flatMap((target) =>
    trapTransformsFor(target as never).map((transform) => ({ value: target, transform })),
  );
  const otherTransforms = TRAP_GLYPHS
    .filter((value) => !targets.includes(value))
    .flatMap((value) => trapTransformsFor(value).map((transform) => ({ value, transform })));
  return [...targetTransforms, ...otherTransforms];
}

/**
 * Build one ordered find-the-jamo board for the continuous Alphabet journey.
 * The 2×2 opening deliberately contains one answer, one ordinary distractor,
 * and two visibly mirrored traps. Larger boards preserve the single answer
 * while increasing both ordinary choices and mirrored traps.
 */
export function createAlphabetStageBoard(
  sequence: readonly string[],
  pool: readonly string[],
  boardSide: 2 | 4 | 6,
  rng: () => number = Math.random,
): AlphabetTile[] {
  const size = boardSide * boardSide;
  if (sequence.length === 0 || sequence.length > size) throw new RangeError("Alphabet stage sequence must fit on its board.");
  const distractors = pool.filter((value) => !sequence.includes(value));
  if (distractors.length === 0) throw new RangeError("Alphabet stages need at least one distractor different from the target.");

  const tiles: AlphabetTile[] = sequence.map((value, id) => ({ id, value, required: true }));
  const trapCount = boardSide === 2 ? 2 : Math.max(2, Math.round(size * .22));
  const normalCount = size - sequence.length - trapCount;
  const traps = trapCandidates(sequence);
  for (let index = 0; index < normalCount; index += 1) {
    tiles.push({ id: tiles.length, value: distractors[index % distractors.length]!, required: false });
  }
  for (let index = 0; index < trapCount; index += 1) {
    const trap = traps[index % traps.length]!;
    tiles.push({ id: tiles.length, value: trap.value, required: false, transform: trap.transform });
  }
  return shuffle(tiles, rng);
}

/** Create memory targets of the requested lengths, without repeated jamo inside one target. */
export function createRandomAlphabetTargets(
  lengths: readonly number[],
  pool: readonly string[],
  rng: () => number = Math.random,
): string[] {
  if (pool.length === 0) throw new RangeError("Random alphabet targets need at least one jamo.");
  return lengths.map((length) => {
    if (length < 1 || length > pool.length) throw new RangeError(`Target length ${length} must be between 1 and ${pool.length}.`);
    return shuffle([...pool], rng).slice(0, length).join("");
  });
}

export function createAlphabetBoard(
  sequence: readonly string[],
  pool: readonly string[],
  size = 81,
  rng: () => number = Math.random,
  trapChance = 0,
  trapPool: readonly string[] = [],
): AlphabetTile[] {
  if (sequence.length > size) throw new RangeError(`Sequence needs ${sequence.length} tiles; maximum is ${size}.`);
  if (pool.length === 0) throw new RangeError("Alphabet board needs at least one filler value.");
  const tiles: AlphabetTile[] = sequence.map((value, id) => ({ id, value, required: true }));
  while (tiles.length < size) {
    let value = pool[Math.floor(rng() * pool.length)]!;
    let transform: GlyphTransform | undefined;
    if (rng() < trapChance) {
      if (trapPool.length) value = trapPool[Math.floor(rng() * trapPool.length)]!;
      else transform = trapTransformFor(value as never);
    }
    tiles.push({ id: tiles.length, value, required: false, ...(transform ? { transform } : {}) });
  }
  return shuffle(tiles, rng);
}

export function checkSequenceTap(sequence: readonly string[], index: number, value: string): SequenceTapResult {
  const correct = sequence[index] === value;
  const nextIndex = correct ? Math.min(sequence.length, index + 1) : index;
  return { correct, nextIndex, complete: nextIndex === sequence.length };
}
