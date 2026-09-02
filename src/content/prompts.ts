import { decomposeAlphabetTarget } from "../core/hangul/alphabetGame";

export interface SentencePrompt {
  id: string;
  text: string;
  translation: string;
  difficulty: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  tags?: readonly string[];
}

export interface AlphabetLevel {
  id: string;
  number: number;
  name: string;
  durationMs: number;
  trapChance: number;
  sequence: readonly string[];
  tapGroups: readonly (readonly string[])[];
  pool: readonly string[];
}

export interface AlphabetCourse {
  id: "consonants" | "vowels" | "syllables";
  name: string;
  description: string;
  levels: readonly AlphabetLevel[];
}

const BASIC_CONSONANTS = [..."ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ"];
const CHEONJIIN_TAPS: Readonly<Record<string, readonly string[]>> = {
  "ㅏ": ["ㅣ", "ㆍ"], "ㅑ": ["ㅣ", "ㆍ", "ㆍ"], "ㅓ": ["ㆍ", "ㅣ"], "ㅕ": ["ㆍ", "ㆍ", "ㅣ"],
  "ㅗ": ["ㆍ", "ㅡ"], "ㅛ": ["ㆍ", "ㆍ", "ㅡ"], "ㅜ": ["ㅡ", "ㆍ"], "ㅠ": ["ㅡ", "ㆍ", "ㆍ"],
  "ㅡ": ["ㅡ"], "ㅣ": ["ㅣ"], "ㆍ": ["ㆍ"],
};
const consonantTaps = (labels: readonly string[]): readonly (readonly string[])[] => labels.map((label) => [...label]);
const vowelTaps = (labels: readonly string[]): readonly (readonly string[])[] => labels.map((label) => [...label].flatMap((vowel) => CHEONJIIN_TAPS[vowel] ?? [vowel]));
const syllableTaps = (labels: readonly string[]): readonly (readonly string[])[] => labels.map((label) => [...label].flatMap(decomposeAlphabetTarget));
const level = (number: number, name: string, durationMs: number, trapChance: number, sequence: readonly string[], tapGroups: readonly (readonly string[])[], pool: readonly string[]): AlphabetLevel => ({
  id: `alphabet-${number}`, number, name, durationMs, trapChance, sequence, tapGroups, pool,
});

const CONSONANT_LEVELS: readonly AlphabetLevel[] = [
  level(1, "Basic Order", 45_000, .05, ["ㄱㄴㄷㄹ", "ㅁㅂㅅㅇ", "ㅈㅊㅋㅌ", "ㅍㅎ", "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ"], consonantTaps(["ㄱㄴㄷㄹ", "ㅁㅂㅅㅇ", "ㅈㅊㅋㅌ", "ㅍㅎ", "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ"]), BASIC_CONSONANTS),
  level(2, "Added Strokes", 55_000, .08, ["ㄱㅋ", "ㄴㄷㅌ", "ㅁㅂㅍ", "ㅅㅈㅊ", "ㅇㅎ"], consonantTaps(["ㄱㅋ", "ㄴㄷㅌ", "ㅁㅂㅍ", "ㅅㅈㅊ", "ㅇㅎ"]), BASIC_CONSONANTS),
  level(3, "Short Memory", 70_000, .10, ["ㄷㅁ", "ㅋㅅ", "ㅎㄹㅊ", "ㅂㅇㄱㅈ", "ㅌㄴㅍㅅㅋ"], consonantTaps(["ㄷㅁ", "ㅋㅅ", "ㅎㄹㅊ", "ㅂㅇㄱㅈ", "ㅌㄴㅍㅅㅋ"]), BASIC_CONSONANTS),
  level(4, "Long Memory", 90_000, .12, ["ㄱㅁㅅㅈㅋㅍ", "ㅎㄴㅂㅊㄹㅌㅇ", "ㄷㅍㄱㅅㅎㅁㅈㅋ", "ㅊㄴㅌㅂㅇㄹㅅㄱㅎ", "ㅁㅋㄷㅎㅅㅂㄴㅈㅍ"], consonantTaps(["ㄱㅁㅅㅈㅋㅍ", "ㅎㄴㅂㅊㄹㅌㅇ", "ㄷㅍㄱㅅㅎㅁㅈㅋ", "ㅊㄴㅌㅂㅇㄹㅅㄱㅎ", "ㅁㅋㄷㅎㅅㅂㄴㅈㅍ"]), BASIC_CONSONANTS),
];

const VOWEL_LEVEL_SEQUENCES = [
  ["ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅏㅓㅗㅜ"],
  ["ㅑ", "ㅕ", "ㅛ", "ㅠ", "ㅑㅕㅛㅠ"],
  ["ㅏㅑ", "ㅓㅕ", "ㅗㅛ", "ㅜㅠ", "ㅏㅑㅓㅕㅗㅛㅜㅠ"],
  ["ㅗㅏ", "ㅠㅓㅑ", "ㅕㅜㅏㅛ", "ㅑㅗㅠㅓㅡㅣ", "ㅏㅕㅗㅠㅓㅛㅜㅡㅣ"],
] as const;
const VOWEL_LEVELS: readonly AlphabetLevel[] = VOWEL_LEVEL_SEQUENCES.map((sequence, index) =>
  level(index + 5, ["One Dot", "Two Dots", "Vowel Families", "Vowel Memory"][index]!, [50_000, 60_000, 75_000, 100_000][index]!, 0, sequence, vowelTaps(sequence), ["ㆍ", "ㅡ", "ㅣ"]),
);

const SYLLABLE_LEVEL_SEQUENCES = [
  ["가나다라", "마바사아", "자차카타", "파하", "가나다라마바사"],
  ["가갸거겨", "고교구규", "나냐너녀", "노뇨누뉴", "다댜더뎌"],
  ["각난달밤공", "문법책상꽃", "산강길집문", "밥옷손발눈", "한글공부방"],
  ["쾅쿵", "꽥쨍", "뿅뻥", "탁휙", "쾅쿵꽥쨍뿅"],
] as const;
const SYLLABLE_LEVELS: readonly AlphabetLevel[] = SYLLABLE_LEVEL_SEQUENCES.map((sequence, index) => {
  const tapGroups = syllableTaps(sequence);
  return level(index + 9, ["Basic Syllables", "Changing Vowels", "Final Consonants", "Sound Words"][index]!, [120_000, 140_000, 160_000, 180_000][index]!, [.06, .08, .10, .12][index]!, sequence, tapGroups, [...new Set(tapGroups.flat())]);
});

export const ALPHABET_COURSES: readonly AlphabetCourse[] = [
  { id: "consonants", name: "Consonants", description: "Lv.1–4 · order, added strokes, and memory", levels: CONSONANT_LEVELS },
  { id: "vowels", name: "Vowels", description: "Lv.5–8 · build vowels with ㆍ ㅡ ㅣ", levels: VOWEL_LEVELS },
  { id: "syllables", name: "Syllables", description: "Lv.9–12 · build syllables from jamo", levels: SYLLABLE_LEVELS },
];

export interface SentenceLevel {
  id: string;
  name: string;
  description: string;
  targetMs: number;
  prompts: readonly SentencePrompt[];
}

type TranslatedPrompt = readonly [text: string, translation: string];
const prompts = (level: number, values: readonly TranslatedPrompt[]): readonly SentencePrompt[] =>
  values.map(([text, translation], index) => ({ id: `sentence-${level}-${index + 1}`, text, translation, difficulty: Math.max(1, level) as SentencePrompt["difficulty"] }));

/** Eight sequential Sentence Copy lessons. targetMs is the five-phrase OH MY GOD cutoff. */
export const SENTENCE_LEVELS: readonly SentenceLevel[] = [
  { id: "level-1", name: "Lv.1", description: "Words without final consonants", targetMs: 40_000, prompts: prompts(1, [["아기", "baby"], ["나비", "butterfly"], ["우유", "milk"], ["모자", "hat"], ["오빠", "older brother"]]) },
  { id: "level-2", name: "Lv.2", description: "Words with final consonants", targetMs: 60_000, prompts: prompts(2, [["사랑", "love"], ["친구", "friend"], ["공부", "study"], ["학교", "school"], ["행복", "happiness"]]) },
  { id: "level-3", name: "Lv.3", description: "Short everyday phrases", targetMs: 90_000, prompts: prompts(3, [["안녕!", "Hello!"], ["잘 가!", "Goodbye!"], ["고마워!", "Thank you!"], ["미안해!", "I'm sorry!"], ["또 만나!", "See you again!"]]) },
  { id: "level-4", name: "Lv.4", description: "Particles and polite endings", targetMs: 120_000, prompts: prompts(4, [["저는 학생이에요.", "I am a student."], ["학교에 가요.", "I go to school."], ["친구를 만나요.", "I meet a friend."], ["책을 읽어요.", "I read a book."], ["집에서 쉬어요.", "I rest at home."]]) },
  { id: "level-5", name: "Lv.5", description: "Formal polite endings", targetMs: 150_000, prompts: prompts(5, [["반갑습니다.", "Nice to meet you."], ["감사합니다.", "Thank you."], ["저는 학생입니다.", "I am a student."], ["학교에 갑니다.", "I go to school."], ["책을 읽습니다.", "I read a book."]]) },
  { id: "level-6", name: "Lv.6", description: "Tense, negatives, and honorifics", targetMs: 180_000, prompts: prompts(6, [["어제 공부했습니다.", "I studied yesterday."], ["오늘 학교에 가지 않아요.", "I am not going to school today."], ["선생님께서 오십니다.", "The teacher is coming."], ["내일 친구를 만날 거예요.", "I will meet a friend tomorrow."], ["저는 매운 음식을 못 먹어요.", "I cannot eat spicy food."]]) },
  { id: "level-7", name: "Lv.7", description: "Adjectives, adverbs, and connectors", targetMs: 210_000, prompts: prompts(7, [["오늘 날씨가 아주 좋아요.", "The weather is very nice today."], ["이 가방은 정말 가벼워요.", "This bag is really light."], ["천천히 또박또박 말해요.", "Speak slowly and clearly."], ["피곤하지만 숙제를 했어요.", "I was tired, but I did my homework."], ["비가 와서 길이 미끄러워요.", "The road is slippery because it is raining."]]) },
  { id: "level-8", name: "Lv.8", description: "Practical complex sentences", targetMs: 240_000, prompts: prompts(8, [["시간이 있으면 같이 만나요.", "If you have time, let's meet."], ["길을 모르면 물어보세요.", "If you do not know the way, please ask."], ["식사가 끝난 후에 연락해 주세요.", "Please contact me after the meal."], ["비가 와도 약속 장소에 갈 거예요.", "Even if it rains, I will go to the meeting place."], ["배울수록 자신감이 생겨요.", "The more I learn, the more confident I become."]]) },
];

export const SENTENCE_PROMPTS: readonly SentencePrompt[] = SENTENCE_LEVELS.flatMap((level) => level.prompts);

export const WORD_MODE_CONFIG = {
  durationMs: 60_000,
} as const;

export interface WordTarget {
  id: string;
  word: string;
  translation: string;
}

/** Easy Korean words for the timed word challenge. */
export const WORD_TARGETS: readonly WordTarget[] = [
  { id: "love", word: "사랑", translation: "love" },
  { id: "friendship", word: "우정", translation: "friendship" },
  { id: "study", word: "공부", translation: "study" },
  { id: "friend", word: "친구", translation: "friend" },
  { id: "family", word: "가족", translation: "family" },
  { id: "travel", word: "여행", translation: "travel" },
  { id: "today", word: "오늘", translation: "today" },
  { id: "dream", word: "꿈", translation: "dream" },
  { id: "book", word: "책", translation: "book" },
  { id: "spring", word: "봄", translation: "spring" },
  { id: "heart", word: "마음", translation: "heart" },
  { id: "sky", word: "하늘", translation: "sky" },
  { id: "flower", word: "꽃", translation: "flower" },
  { id: "school", word: "학교", translation: "school" },
  { id: "smile", word: "미소", translation: "smile" },
  { id: "happiness", word: "행복", translation: "happiness" },
  { id: "sea", word: "바다", translation: "sea" },
  { id: "tree", word: "나무", translation: "tree" },
  { id: "sunlight", word: "햇살", translation: "sunlight" },
  { id: "song", word: "노래", translation: "song" },
  { id: "laughter", word: "웃음", translation: "laughter" },
  { id: "courage", word: "용기", translation: "courage" },
  { id: "promise", word: "약속", translation: "promise" },
  { id: "time", word: "시간", translation: "time" },
  { id: "day", word: "하루", translation: "day" },
  { id: "peace", word: "평화", translation: "peace" },
  { id: "health", word: "건강", translation: "health" },
  { id: "play", word: "놀이", translation: "play" },
  { id: "picture", word: "그림", translation: "picture" },
  { id: "music", word: "음악", translation: "music" },
  { id: "hope", word: "희망", translation: "hope" },
];
