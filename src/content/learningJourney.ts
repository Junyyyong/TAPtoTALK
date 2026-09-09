import { createRandomAlphabetTargets } from "../core/hangul/alphabetGame";
import { requiredBoardSymbols } from "../core/hangul/target";
import { ALPHABET_ORDER, ALPHABET_STAGES, alphabetTargetNote, type AlphabetStage } from "./prompts";

export type LearningMode = "alphabet" | "syllable";
export const LEARNING_TRAP_RATIO = .2;
export const LEARNING_TRANSITION_MS = 420;
export const RANDOM_ALPHABET_LENGTH = 3;

// One syllable per stage; introduce more vowels as the board grows.
const SYLLABLE_ROWS = [
  { text: "가나다라마바사아자차카타파하", side: 2 },
  { text: "거너더러머버서어저처커터퍼허", side: 4 },
  { text: "고노도로모보소오조초코토포호", side: 4 },
  { text: "구누두루무부수우주추쿠투푸후", side: 6 },
  { text: "기니디리미비시이지치키티피히", side: 6 },
  { text: "개게내네왜와위꾀귀돼뭐예", side: 6 },
] as const;

export const SYLLABLE_STAGES: readonly AlphabetStage[] = SYLLABLE_ROWS.flatMap(({ text, side }) =>
  [...text].map((target) => ({ target, boardSide: side, sequence: requiredBoardSymbols(target) })),
).map((stage, index) => ({ ...stage, id: `syllable-${index + 1}`, number: index + 1, note: "" }));

export function learningStageAt(
  mode: LearningMode,
  index: number,
  previousTarget = "",
  rng: () => number = Math.random,
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
    id: `${mode}-random-${index + 1}`, number: index + 1, boardSide: 8, target, sequence,
    note: mode === "alphabet" ? sequence.map(alphabetTargetNote).join(" · ") : "",
  };
}
