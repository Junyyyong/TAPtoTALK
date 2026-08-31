export interface WritingRules {
  minSyllables: number;
  minWords: number;
}

export interface WritingChecks {
  keyword: boolean;
  syllables: boolean;
  words: boolean;
  punctuation: boolean;
  composed: boolean;
}

export interface WritingEvaluation {
  complete: boolean;
  checks: WritingChecks;
  score: number;
  syllableCount: number;
  uniqueSyllables: number;
}

/** One scoring rule for both modes: a completed answer is worth 100–1000 points based only on time. */
export function scoreFromTime(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return 100;
  const remainingRatio = 1 - Math.max(0, Math.min(1, elapsedMs / durationMs));
  return 100 + Math.round(900 * remainingRatio);
}

/** Objective, offline-checkable writing criteria. Semantic feedback can be added later. */
export function evaluateWriting(
  text: string,
  keyword: string,
  remainingMs: number,
  durationMs: number,
  rules: WritingRules,
): WritingEvaluation {
  const syllables = text.match(/[가-힣]/g) ?? [];
  const words = text.trim().split(/\s+/).filter((word) => /[가-힣]/.test(word));
  const checks: WritingChecks = {
    keyword: text.includes(keyword),
    syllables: syllables.length >= rules.minSyllables,
    words: words.length >= rules.minWords,
    punctuation: /[.!?]$/.test(text.trim()),
    composed: !/[ㄱ-ㅎㅏ-ㅣㆍ]/.test(text),
  };
  const complete = Object.values(checks).every(Boolean);
  const uniqueSyllables = new Set(syllables).size;
  const elapsedMs = Math.max(0, durationMs - remainingMs);

  return {
    complete,
    checks,
    score: complete ? scoreFromTime(elapsedMs, durationMs) : 0,
    syllableCount: syllables.length,
    uniqueSyllables,
  };
}
