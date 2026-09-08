export interface SentencePrompt {
  id: string;
  text: string;
  translation: string;
  difficulty: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  tags?: readonly string[];
}

export interface AlphabetStage {
  id: string;
  number: number;
  boardSide: 2 | 4 | 6;
  target: string;
  note: string;
}

const CONSONANT_SOUNDS: Readonly<Record<string, string>> = {
  "ㄱ": "[k/g]", "ㄴ": "[n]", "ㄷ": "[t/d]", "ㄹ": "[ɾ/l]", "ㅁ": "[m]", "ㅂ": "[p/b]", "ㅅ": "[s/ɕ]",
  "ㅇ": "[∅/ŋ]", "ㅈ": "[tɕ/dʑ]", "ㅊ": "[tɕʰ]", "ㅋ": "[kʰ]", "ㅌ": "[tʰ]", "ㅍ": "[pʰ]", "ㅎ": "[h]",
};
const VOWEL_SOUNDS: Readonly<Record<string, string>> = {
  "ㅡ": "[ɯ]", "ㅣ": "[i]", "ㆍ": "CHEON · SKY",
};

export const ALPHABET_ORDER = [..."ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ", "ㅣ", "ㅡ", "ㆍ"] as const;
export const ALPHABET_BOARD_SIDES = [2, 4, 6] as const;

export function alphabetTargetNote(target: string): string {
  return CONSONANT_SOUNDS[target] ?? VOWEL_SOUNDS[target] ?? "";
}

/** One uninterrupted journey: every basic jamo is revisited as the board grows. */
export const ALPHABET_STAGES: readonly AlphabetStage[] = ALPHABET_BOARD_SIDES.flatMap((boardSide, phaseIndex) =>
  ALPHABET_ORDER.map((target, targetIndex) => ({
    id: `alphabet-${boardSide}x${boardSide}-${targetIndex + 1}`,
    number: phaseIndex * ALPHABET_ORDER.length + targetIndex + 1,
    boardSide,
    target,
    note: alphabetTargetNote(target),
  })),
);

export interface SentenceLevel {
  id: string;
  name: string;
  description: string;
  targetMs: number;
  prompts: readonly SentencePrompt[];
}

export const SENTENCE_ROUND_SIZE = 3;

type TranslatedPrompt = readonly [text: string, translation: string];
const prompts = (level: number, values: readonly TranslatedPrompt[]): readonly SentencePrompt[] =>
  values.map(([text, translation], index) => ({ id: `sentence-${level}-${index + 1}`, text, translation, difficulty: Math.max(1, level) as SentencePrompt["difficulty"] }));

/** Sentence Copy pools. Three prompts are sampled per run; targetMs is that run's OH MY GOD cutoff. */
export const SENTENCE_LEVELS: readonly SentenceLevel[] = [
  { id: "level-1", name: "Lv.1", description: "Short everyday phrases", targetMs: 54_000, prompts: prompts(1, [["안녕!", "Hello!"], ["잘 가!", "Goodbye!"], ["고마워!", "Thank you!"], ["미안해!", "I'm sorry!"], ["또 만나!", "See you again!"]]) },
  { id: "level-2", name: "Lv.2", description: "Particles and polite endings", targetMs: 72_000, prompts: prompts(2, [["저는 학생이에요.", "I am a student."], ["학교에 가요.", "I go to school."], ["친구를 만나요.", "I meet a friend."], ["책을 읽어요.", "I read a book."], ["집에서 쉬어요.", "I rest at home."]]) },
  { id: "level-3", name: "Lv.3", description: "Formal polite endings", targetMs: 90_000, prompts: prompts(3, [["반갑습니다.", "Nice to meet you."], ["감사합니다.", "Thank you."], ["저는 학생입니다.", "I am a student."], ["학교에 갑니다.", "I go to school."], ["책을 읽습니다.", "I read a book."]]) },
  { id: "level-4", name: "Lv.4", description: "Tense, negatives, and honorifics", targetMs: 108_000, prompts: prompts(4, [["어제 공부했습니다.", "I studied yesterday."], ["오늘 학교에 가지 않아요.", "I am not going to school today."], ["선생님께서 오십니다.", "The teacher is coming."], ["내일 친구를 만날 거예요.", "I will meet a friend tomorrow."], ["저는 매운 음식을 못 먹어요.", "I cannot eat spicy food."]]) },
  { id: "level-5", name: "Lv.5", description: "Adjectives, adverbs, and connectors", targetMs: 126_000, prompts: prompts(5, [["오늘 날씨가 아주 좋아요.", "The weather is very nice today."], ["이 가방은 정말 가벼워요.", "This bag is really light."], ["천천히 또박또박 말해요.", "Speak slowly and clearly."], ["피곤하지만 숙제를 했어요.", "I was tired, but I did my homework."], ["비가 와서 길이 미끄러워요.", "The road is slippery because it is raining."]]) },
  { id: "level-6", name: "Lv.6", description: "Practical complex sentences", targetMs: 144_000, prompts: prompts(6, [["시간이 있으면 같이 만나요.", "If you have time, let's meet."], ["길을 모르면 물어보세요.", "If you do not know the way, please ask."], ["식사가 끝난 후에 연락해 주세요.", "Please contact me after the meal."], ["비가 와도 약속 장소에 갈 거예요.", "Even if it rains, I will go to the meeting place."], ["배울수록 자신감이 생겨요.", "The more I learn, the more confident I become."]]) },
];

export const SENTENCE_PROMPTS: readonly SentencePrompt[] = SENTENCE_LEVELS.flatMap((level) => level.prompts);

export interface WordTarget {
  id: string;
  word: string;
  translation: string;
}

export interface WordLevel {
  id: string;
  name: string;
  description: string;
  durationMs: number;
  targets: readonly WordTarget[];
}

const wordTargets = (level: number, values: readonly (readonly [word: string, translation: string])[]): readonly WordTarget[] =>
  values.map(([word, translation], index) => ({ id: `word-${level}-${index + 1}`, word, translation }));

/** Five three-word lessons, moving from simple words to expressive Korean and compound vowels. */
export const WORD_LEVELS: readonly WordLevel[] = [
  { id: "word-beginner", name: "Beginner", description: "Words without final consonants", durationMs: 60_000, targets: wordTargets(0, [["아기", "baby"], ["나비", "butterfly"], ["우유", "milk"], ["모자", "hat"], ["누나", "older sister"], ["오빠", "older brother"]]) },
  { id: "word-1", name: "Lv.1", description: "Words with final consonants", durationMs: 75_000, targets: wordTargets(1, [["사랑", "love"], ["친구", "friend"], ["공부", "study"], ["학교", "school"], ["행복", "happiness"], ["가족", "family"]]) },
  { id: "word-2", name: "Lv.2", description: "Everyday exclamations", durationMs: 90_000, targets: wordTargets(2, [["어머나", "oh my"], ["아이고", "oh dear"], ["아뿔사", "oops"], ["저기요", "excuse me"], ["앗뜨거", "ouch, hot"], ["엄마야", "oh my gosh"], ["깜짝이야", "what a surprise"]]) },
  { id: "word-3", name: "Lv.3", description: "Sounds and movement words", durationMs: 100_000, targets: wordTargets(3, [["쿵", "thump"], ["쾅", "bang"], ["꽥", "squawk"], ["짹짹", "chirp chirp"], ["엉금엉금", "crawl slowly"], ["어슬렁어슬렁", "wander around"]]) },
  { id: "word-4", name: "Lv.4", description: "Compound-vowel words", durationMs: 90_000, targets: wordTargets(4, [["개", "dog"], ["게", "crab"], ["내", "my"], ["네", "yes"], ["왜", "why"], ["와", "come"], ["꾀", "wits"], ["외", "outside"]]) },
];

export const WORD_TARGETS: readonly WordTarget[] = WORD_LEVELS.flatMap((level) => level.targets);
