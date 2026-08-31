export interface WritingRules {
  minSyllables: number;
  minWords: number;
  completionPoints: number;
  pointsPerSyllable: number;
  maxLengthPoints: number;
  pointsPerUniqueSyllable: number;
  maxVarietyPoints: number;
  maxTimePoints: number;
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
  const lengthPoints = Math.min(rules.maxLengthPoints, syllables.length * rules.pointsPerSyllable);
  const varietyPoints = Math.min(
    rules.maxVarietyPoints,
    uniqueSyllables * rules.pointsPerUniqueSyllable,
  );
  const timeRatio = durationMs > 0 ? Math.max(0, Math.min(1, remainingMs / durationMs)) : 0;
  const timePoints = Math.floor(rules.maxTimePoints * timeRatio);

  return {
    complete,
    checks,
    score: complete ? rules.completionPoints + lengthPoints + varietyPoints + timePoints : 0,
    syllableCount: syllables.length,
    uniqueSyllables,
  };
}

