import { pickLessonTargets } from "../core/hangul/wordChallenge";
import { WORD_STAGES } from "./learningJourney";
import type { WordTarget } from "./prompts";

export const WORD_LENGTH_PRACTICE_STAGES = 10;
export const WORD_BONUS_INTERVAL = 10;
export const isWordBonusStage = (completed: number): boolean =>
  Number.isSafeInteger(completed) && completed > 0 && completed % WORD_BONUS_INTERVAL === 0;
type WordLength = 3 | 4 | 5;
const words = (length: WordLength, values: readonly (readonly [string, string])[]): readonly WordTarget[] =>
  values.map(([word, translation], index) => ({ id: `word-extra-${length}-${index + 1}`, word, translation }));

/** New vocabulary only: no overlap with the introductory words. */
export const EXTRA_WORDS: Readonly<Record<WordLength, readonly WordTarget[]>> = {
  3: words(3, [
    ["바나나", "banana"], ["토마토", "tomato"], ["고구마", "sweet potato"], ["감자탕", "pork bone soup"],
    ["비빔밥", "bibimbap"], ["김치전", "kimchi pancake"], ["강아지", "puppy"], ["고양이", "cat"],
    ["호랑이", "tiger"], ["코끼리", "elephant"], ["병아리", "chick"], ["거북이", "turtle"],
    ["개구리", "frog"], ["다람쥐", "squirrel"], ["도서관", "library"], ["운동장", "sports field"],
    ["놀이터", "playground"], ["자전거", "bicycle"], ["비행기", "airplane"], ["무지개", "rainbow"],
    ["휴대폰", "mobile phone"],
  ]),
  4: words(4, [
    ["해바라기", "sunflower"], ["민들레꽃", "dandelion"], ["카네이션", "carnation"],
    ["놀이공원", "amusement park"], ["지하철역", "subway station"], ["대한민국", "South Korea"], ["우리나라", "our country"],
    ["전화번호", "phone number"], ["손목시계", "wristwatch"], ["아주머니", "ma'am"],
    ["할아버지", "grandfather"], ["어린이집", "day care"], ["종이접기", "paper folding"], ["쓰레기통", "trash can"],
    ["횡단보도", "crosswalk"], ["저녁노을", "sunset glow"], ["두근두근", "heart beating"],
  ]),
  5: words(5, [
    ["아이스크림", "ice cream"], ["크리스마스", "Christmas"], ["엘리베이터", "elevator"], ["공기청정기", "air purifier"],
    ["전자레인지", "microwave"], ["자연박물관", "nature museum"], ["과학박물관", "science museum"],
    ["재활용봉투", "recycling bag"], ["쓰레기봉투", "trash bag"], ["분리수거함", "recycling bin"], ["고무줄놀이", "rubber band game"],
    ["오렌지주스", "orange juice"], ["토마토주스", "tomato juice"], ["초콜릿우유", "chocolate milk"], ["바나나우유", "banana milk"],
    ["비상연락망", "emergency contacts"], ["주민등록증", "ID card"], ["운전면허증", "driver's license"], ["전기자동차", "electric car"],
  ]),
};

export function wordLengthAt(index: number): WordLength | undefined {
  if (!Number.isSafeInteger(index) || index < 0) throw new RangeError("Invalid word stage index.");
  const extra = index - WORD_STAGES.length;
  return extra < 0 ? undefined : extra < WORD_LENGTH_PRACTICE_STAGES ? 3 : extra < WORD_LENGTH_PRACTICE_STAGES * 2 ? 4 : 5;
}

/** One bounded shuffle bag per length; reset by creating a new journey. */
export function createWordJourney(rng: () => number = Math.random): () => WordTarget {
  let index = 0;
  let previous = "";
  const bags = new Map<WordLength, WordTarget[]>();
  return () => {
    const length = wordLengthAt(index);
    if (length === undefined) return WORD_STAGES[index++]!;
    let bag = bags.get(length);
    if (!bag?.length) {
      bag = pickLessonTargets(EXTRA_WORDS[length], EXTRA_WORDS[length].length, rng);
      // Avoid an immediate repeat across the boundary between two shuffled rounds.
      if (bag[0]!.word === previous) [bag[0], bag[1]] = [bag[1]!, bag[0]!];
      bags.set(length, bag);
    }
    const target = bag.shift()!;
    previous = target.word;
    index += 1;
    return target;
  };
}
