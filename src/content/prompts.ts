export interface SentencePrompt {
  id: string;
  text: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  tags?: readonly string[];
}

/** Content only. New sentences must not be embedded in UI or game rules. */
export const SENTENCE_PROMPTS: readonly SentencePrompt[] = [
  { id: "love-001", text: "나는 너를 사랑해", difficulty: 1, tags: ["starter"] },
  { id: "hello-001", text: "오늘도 반가워", difficulty: 1, tags: ["starter"] },
  { id: "thanks-001", text: "고마운 마음을 전해요", difficulty: 2 },
];

export const FREE_MODE_CONFIG = {
  durationMs: 60_000,
  minSyllables: 8,
  minWords: 2,
  completionPoints: 100,
  pointsPerSyllable: 3,
  maxLengthPoints: 60,
  pointsPerUniqueSyllable: 2,
  maxVarietyPoints: 30,
  maxTimePoints: 10,
} as const;

export interface WritingTopic {
  id: string;
  keyword: string;
}

/** The keyword gives free writing a visible goal and is guaranteed on the board. */
export const WRITING_TOPICS: readonly WritingTopic[] = [
  { id: "love", keyword: "사랑" },
  { id: "today", keyword: "오늘" },
  { id: "friend", keyword: "친구" },
  { id: "travel", keyword: "여행" },
  { id: "dream", keyword: "꿈" },
];
