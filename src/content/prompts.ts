export interface SentencePrompt {
  id: string;
  text: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  tags?: readonly string[];
}

export interface SentenceLevel {
  id: string;
  name: string;
  prompts: readonly SentencePrompt[];
}

const prompts = (level: number, values: readonly string[]): readonly SentencePrompt[] =>
  values.map((text, index) => ({ id: `sentence-${level}-${index + 1}`, text, difficulty: Math.max(1, level) as SentencePrompt["difficulty"] }));

/** Six sequential Sentence Copy lessons, from first words to formal phrases. */
export const SENTENCE_LEVELS: readonly SentenceLevel[] = [
  { id: "beginner", name: "왕초보 입문", prompts: prompts(0, ["아가", "엄마", "아빠", "누나", "오빠"]) },
  { id: "level-1", name: "제1단계", prompts: prompts(1, ["안녕!", "잘 가!", "미안!", "좋아!", "그래!"]) },
  { id: "level-2", name: "제2단계", prompts: prompts(2, ["사랑해~", "미안해~", "고마워~", "또 보자~", "잘 있어~"]) },
  { id: "level-3", name: "제3단계", prompts: prompts(3, ["안녕하세요?", "고맙습니다!", "다시 만나요~", "오랜만입니다.", "반갑습니다!"]) },
  { id: "level-4", name: "제4단계", prompts: prompts(4, ["처음 뵙겠습니다.", "잘 먹겠습니다.", "이것은 얼마입니까?", "안녕히 가세요!", "여기는 어디입니까?"]) },
  { id: "level-5", name: "제5단계", prompts: prompts(5, ["제 이름은 토마스입니다.", "대단히 감사했습니다.", "다음에 다시 만납시다.", "항상 건강하시기 바랍니다.", "언제나 행복하시길 기원합니다."]) },
];

export const SENTENCE_PROMPTS: readonly SentencePrompt[] = SENTENCE_LEVELS.flatMap((level) => level.prompts);

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
  { id: "happiness", word: "행복" },
  { id: "sea", word: "바다" },
  { id: "tree", word: "나무" },
  { id: "sunlight", word: "햇살" },
  { id: "song", word: "노래" },
  { id: "laughter", word: "웃음" },
  { id: "courage", word: "용기" },
  { id: "promise", word: "약속" },
  { id: "time", word: "시간" },
  { id: "day", word: "하루" },
  { id: "peace", word: "평화" },
  { id: "health", word: "건강" },
  { id: "play", word: "놀이" },
  { id: "picture", word: "그림" },
  { id: "music", word: "음악" },
  { id: "hope", word: "희망" },
];
