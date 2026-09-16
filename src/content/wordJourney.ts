import { pickLessonTargets } from "../core/hangul/wordChallenge";
import { WORD_STAGES } from "./learningJourney";
import type { WordTarget } from "./prompts";
import { takeFresh } from "./recentTargets";

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
    ["소방자동차", "fire engine"],
    ["기상예보관", "weather forecaster"],
    ["피아니스트", "pianist"], ["요리연구가", "culinary researcher"],
    ["세계지도책", "world atlas"], ["도자기공예", "pottery"],
    ["스케이트장", "skating rink"], ["배드민턴장", "badminton court"],
    ["사진전시회", "photography exhibition"], ["음악연주회", "music concert"],
    ["결혼기념일", "wedding anniversary"],
    ["해바라기씨", "sunflower seeds"], ["카카오가루", "cocoa powder"],
    ["밀가루반죽", "dough"], ["고구마튀김", "fried sweet potato"],
    ["새우볶음밥", "shrimp fried rice"], ["해물칼국수", "seafood noodle soup"],
    ["아메리카노", "americano"], ["마카다미아", "macadamia nut"],
    ["블루베리잼", "blueberry jam"], ["무선이어폰", "wireless earphones"],
    ["종이비행기", "paper airplane"], ["등산안내도", "hiking map"],
    ["여행안내서", "travel guide"], ["우주정거장", "space station"],
    ["태양광발전", "solar power generation"], ["식물성기름", "vegetable oil"],
    ["일회용장갑", "disposable gloves"], ["한글맞춤법", "Korean spelling"],
  ]),
};

export function wordLengthAt(index: number): WordLength | undefined {
  if (!Number.isSafeInteger(index) || index < 0) throw new RangeError("Invalid word stage index.");
  const extra = index - WORD_STAGES.length;
  return extra < 0 ? undefined : extra < WORD_LENGTH_PRACTICE_STAGES ? 3 : extra < WORD_LENGTH_PRACTICE_STAGES * 2 ? 4 : 5;
}

/** Intro length pools, then a weighted mixed bag; reset only at a new START. */
export function createWordJourney(rng: () => number = Math.random): () => WordTarget {
  let index = 0;
  const history: string[] = [];
  const bags = new Map<WordLength, WordTarget[]>();
  const introduced = new Set<string>();
  let firstEndlessBag = true;
  let endless: WordTarget[] = [];
  return () => {
    const length = wordLengthAt(index);
    if (length === undefined) {
      const target = WORD_STAGES[index++]!; history.push(target.word); return target;
    }
    if (length === 5) {
      if (!endless.length) {
        endless = Object.values(EXTRA_WORDS).flat().filter(item => !firstEndlessBag || !introduced.has(item.word)).map(item => ({ item,
          priority: Math.pow(rng(), 1 / (item.word.length === 5 ? 4 : item.word.length === 4 ? 2 : 1)),
        })).sort((a, b) => b.priority - a.priority).map(({ item }) => item);
        firstEndlessBag = false;
      }
      const target = takeFresh(endless, history, item => item.word);
      history.push(target.word); if (history.length > 10) history.shift();
      index++; return target;
    }
    let bag = bags.get(length);
    if (!bag?.length) {
      bag = pickLessonTargets(EXTRA_WORDS[length], EXTRA_WORDS[length].length, rng);
      // Avoid an immediate repeat across the boundary between two shuffled rounds.
      bags.set(length, bag);
    }
    const target = takeFresh(bag, history, item => item.word);
    introduced.add(target.word);
    history.push(target.word); if (history.length > 10) history.shift();
    index += 1;
    return target;
  };
}
