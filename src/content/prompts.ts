export interface SentencePrompt {
  id: string;
  text: string;
  difficulty: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  tags?: readonly string[];
}

export interface SentenceLevel {
  id: string;
  name: string;
  description: string;
  targetMs: number;
  prompts: readonly SentencePrompt[];
}

const prompts = (level: number, values: readonly string[]): readonly SentencePrompt[] =>
  values.map((text, index) => ({ id: `sentence-${level}-${index + 1}`, text, difficulty: Math.max(1, level) as SentencePrompt["difficulty"] }));

/** Eight sequential Sentence Copy lessons. targetMs is the five-phrase OH MY GOD cutoff. */
export const SENTENCE_LEVELS: readonly SentenceLevel[] = [
  { id: "level-1", name: "Lv.1", description: "Words without final consonants", targetMs: 40_000, prompts: prompts(1, ["아기", "나비", "우유", "모자", "오빠"]) },
  { id: "level-2", name: "Lv.2", description: "Words with final consonants", targetMs: 60_000, prompts: prompts(2, ["사랑", "친구", "공부", "학교", "행복"]) },
  { id: "level-3", name: "Lv.3", description: "Short everyday phrases", targetMs: 90_000, prompts: prompts(3, ["안녕!", "잘 가!", "고마워!", "미안해!", "또 만나!"]) },
  { id: "level-4", name: "Lv.4", description: "Particles and polite endings", targetMs: 120_000, prompts: prompts(4, ["저는 학생이에요!", "학교에 가요!", "친구를 만나요!", "책을 읽어요!", "집에서 쉬어요!"]) },
  { id: "level-5", name: "Lv.5", description: "Formal polite endings", targetMs: 150_000, prompts: prompts(5, ["반갑습니다!", "감사합니다!", "저는 학생입니다!", "학교에 갑니다!", "책을 읽습니다!"]) },
  { id: "level-6", name: "Lv.6", description: "Tense, negatives, and honorifics", targetMs: 180_000, prompts: prompts(6, ["어제 공부했습니다!", "오늘 학교에 가지 않아요!", "선생님께서 오십니다!", "내일 친구를 만날 거예요!", "매운 음식을 못 먹어요?"]) },
  { id: "level-7", name: "Lv.7", description: "Adjectives, adverbs, and connectors", targetMs: 210_000, prompts: prompts(7, ["오늘 날씨가 아주 좋아요!", "이 가방은 정말 가벼워요!", "천천히 또박또박 말해요!", "피곤하지만 숙제를 했어요!", "비가 와서 길이 미끄러워요!"]) },
  { id: "level-8", name: "Lv.8", description: "Practical complex sentences", targetMs: 240_000, prompts: prompts(8, ["시간이 있으면 같이 만나요!", "길을 모르면 물어보세요!", "식사가 끝난 후에 연락해 주세요!", "비가 와도 약속 장소에 갈 거예요!", "배울수록 자신감이 생겨요!"]) },
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
