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
  { id: "friend-001", text: "친구와 함께 웃는 날", difficulty: 1, tags: ["starter"] },
  { id: "thanks-001", text: "고마운 마음을 전해요", difficulty: 2 },
  { id: "travel-001", text: "우리 함께 여행을 떠나요", difficulty: 2 },
  { id: "dream-001", text: "작은 꿈도 소중히 키워요", difficulty: 2 },
  { id: "today-001", text: "오늘의 이야기를 들려줘", difficulty: 3 },
];

export const WORD_MODE_CONFIG = {
  durationMs: 60_000,
} as const;

export interface WordTarget {
  id: string;
  word: string;
}

/** Easy Korean words for the timed word challenge. */
export const WORD_TARGETS: readonly WordTarget[] = [
  { id: "love", word: "사랑" },
  { id: "friendship", word: "우정" },
  { id: "study", word: "공부" },
  { id: "friend", word: "친구" },
  { id: "family", word: "가족" },
  { id: "travel", word: "여행" },
  { id: "today", word: "오늘" },
  { id: "dream", word: "꿈" },
  { id: "book", word: "책" },
  { id: "spring", word: "봄" },
  { id: "heart", word: "마음" },
  { id: "sky", word: "하늘" },
  { id: "flower", word: "꽃" },
  { id: "school", word: "학교" },
  { id: "smile", word: "미소" },
];
