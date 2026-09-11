import { createRandomAlphabetTargets } from "../core/hangul/alphabetGame";
import { requiredBoardSymbols } from "../core/hangul/target";
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
  { text: "까따빠싸짜", side: 4 },
  { text: "각간갇갈감갑갓강갖갗갘같갚갛", side: 4 },
  { text: "넋앉많읽삶넓곬핥읊싫값밖있", side: 4 },
] as const;

export const SYLLABLE_STAGES: readonly AlphabetStage[] = SYLLABLE_ROWS.flatMap(({ text, side }) =>
  [...text].map((target) => ({ target, boardSide: side, sequence: requiredBoardSymbols(target) })),
).map((stage, index) => ({ ...stage, id: `syllable-${index + 1}`, number: index + 1, note: "" }));

export function learningStageAt(
  mode: LearningMode,
  index: number,
  previousTarget = "",
  rng: () => number = Math.random,
  roundNumber = 1,
): AlphabetStage {
  if (!Number.isSafeInteger(index) || index < 0) throw new RangeError("Invalid stage index.");
  const lessons = mode === "alphabet" ? ALPHABET_STAGES : SYLLABLE_STAGES;
  const fixed = lessons[index];
  if (fixed) return fixed;
  let target: string;
  if (mode === "alphabet") {
    target = createRandomAlphabetTargets([RANDOM_ALPHABET_LENGTH], ALPHABET_ORDER, rng)[0]!;
    if (target === previousTarget) target = [...target.slice(1), target[0]!].join("");
  } else {
    const candidates = SYLLABLE_STAGES.filter((stage) => stage.target !== previousTarget);
    target = candidates[Math.floor(rng() * candidates.length)]!.target;
  }
  const sequence = mode === "alphabet" ? [...target] : requiredBoardSymbols(target);
  return {
    id: `${mode}-random-${index + 1}`, number: index + 1,
    boardSide: mode === "syllable" && roundNumber === 1 ? 6 : 8, target, sequence,
    note: mode === "alphabet" ? sequence.map(alphabetTargetNote).join(" · ") : "",
  };
}
