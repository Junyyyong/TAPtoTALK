import { createRandomAlphabetTargets } from "../core/hangul/alphabetGame";
import { requiredBoardSymbols } from "../core/hangul/target";
import { pickLessonTargets } from "../core/hangul/wordChallenge";
import { syllableTargetNote, SYLLABLE_MEANINGS } from "./syllableNotes";
import { ALPHABET_ORDER, ALPHABET_STAGES, WORD_LEVELS, alphabetTargetNote, type AlphabetStage } from "./prompts";

// Preserve the existing easy-to-hard lesson order, now one word per stage.
export const WORD_STAGES = WORD_LEVELS.flatMap((level) => level.targets);
export const WORD_JOURNEY_SCORE_TIME_MS = WORD_LEVELS.reduce((total, level) => total + level.durationMs * level.targets.length / 3, 0);

export type LearningMode = "alphabet" | "syllable";
export const LEARNING_TRAP_RATIO = .2;
export const LEARNING_TRANSITION_MS = 420;
export const RANDOM_ALPHABET_LENGTH = 3;

// One syllable per stage; introduce more vowels as the board grows.
const SYLLABLE_ROWS = [
  { text: "가나다라마바사아자차카타파하", side: 2 },
  { text: "아야어여오요우유으이", side: 4 },
  { text: "애에얘예와왜외워웨위의", side: 4 },
  // Five tense initials, exactly once each per practice session.
  { text: "까따빠싸짜", side: 4 },
  // Familiar standalone nouns, not isolated verb stems or exhaustive final spellings.
  { text: "산강물불눈손발집밥옷달별입몸", side: 4 },
  { text: "닭흙값삶몫", side: 4 },
] as const;

export const SYLLABLE_STAGES: readonly AlphabetStage[] = SYLLABLE_ROWS.flatMap(({ text, side }) =>
  [...text].map((target) => ({ target, boardSide: side, sequence: requiredBoardSymbols(target) })),
).map((stage, index) => ({ ...stage, id: `syllable-${index + 1}`, number: index + 1, note: syllableTargetNote(stage.target) }));

export const SYLLABLE_PRACTICE_PER_TYPE = 5;
/** Real one-syllable vocabulary only; pronunciation drills stay in practice. */
export const SYLLABLE_GAME_TARGETS = Object.keys(SYLLABLE_MEANINGS);
/** One session's shuffle bag. Rebuilding an unfinished stage must not consume a word. */
export function createSyllableGameJourney(rng: () => number = Math.random): (index: number, previous: string) => string {
  let bag: string[] = [];
  let currentIndex = -1;
  let current = "";
  return (index, previous) => {
    if (index === currentIndex) return current;
    if (!bag.length) {
      bag = pickLessonTargets(SYLLABLE_GAME_TARGETS, SYLLABLE_GAME_TARGETS.length, rng);
      if (bag[0] === previous) [bag[0], bag[1]] = [bag[1]!, bag[0]!];
    }
    currentIndex = index;
    current = bag.shift()!;
    return current;
  };
}
/** Draw once per START. Keep the six categories ordered, shuffle within each. */
export function createSyllablePractice(rng: () => number = Math.random): readonly AlphabetStage[] {
  return SYLLABLE_ROWS.flatMap(({ text, side }) =>
    pickLessonTargets([...text], SYLLABLE_PRACTICE_PER_TYPE, rng).map(target => ({
      target, boardSide: side, sequence: requiredBoardSymbols(target),
    })),
  ).map((stage, index) => ({ ...stage, id: `practice-${index + 1}`, number: index + 1, note: syllableTargetNote(stage.target) }));
}

export function learningStageAt(
  mode: LearningMode,
  index: number,
  previousTarget = "",
  rng: () => number = Math.random,
  roundNumber = 1,
  practice: readonly AlphabetStage[] = SYLLABLE_STAGES,
  syllableJourney?: (index: number, previous: string) => string,
): AlphabetStage {
  if (!Number.isSafeInteger(index) || index < 0) throw new RangeError("Invalid stage index.");
  const lessons = mode === "alphabet" ? ALPHABET_STAGES : practice;
  const fixed = lessons[index];
  if (fixed) return fixed;
  let target: string;
  if (mode === "alphabet") {
    target = createRandomAlphabetTargets([RANDOM_ALPHABET_LENGTH], ALPHABET_ORDER, rng)[0]!;
    if (target === previousTarget) target = [...target.slice(1), target[0]!].join("");
  } else {
    const candidates = SYLLABLE_GAME_TARGETS.filter(target => target !== previousTarget);
    target = syllableJourney ? syllableJourney(index, previousTarget) : candidates[Math.floor(rng() * candidates.length)]!;
  }
  const sequence = mode === "alphabet" ? [...target] : requiredBoardSymbols(target);
  return {
    id: `${mode}-random-${index + 1}`, number: index + 1,
    boardSide: mode === "syllable" && roundNumber === 1 ? 6 : 8, target, sequence,
    note: mode === "alphabet" ? sequence.map(alphabetTargetNote).join(" · ") : syllableTargetNote(target),
  };
}
