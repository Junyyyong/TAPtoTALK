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

export const FREE_MODE_CONFIG = {
  durationMs: 60_000,
  minSyllables: 8,
  minWords: 2,
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
  { id: "family", keyword: "가족" },
  { id: "book", keyword: "책" },
  { id: "spring", keyword: "봄" },
];
