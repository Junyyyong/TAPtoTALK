// Product-owner supplied reading hints, not a standard IPA transcription.
// Other vowel hints are retained until a replacement is requested.
const SOUNDS: Readonly<Record<string, string>> = {
  가: "ga/ka", 나: "na", 다: "da/ta", 라: "la/ra", 마: "ma", 바: "ba/va", 사: "sa",
  아: "a", 자: "ja", 차: "tcha", 카: "ka", 타: "ta", 파: "pa", 하: "ha",
  야: "ja", 어: "ʌ", 여: "jʌ", 오: "o", 요: "jo", 우: "u", 유: "ju", 으: "ɯ", 이: "i",
  애: "ɛ", 에: "e", 얘: "jɛ", 예: "je", 와: "wa", 왜: "wɛ", 외: "we",
  워: "wʌ", 웨: "we", 위: "wi", 의: "ɰi",
  까: "gga", 따: "dda", 빠: "bba", 싸: "ssa", 짜: "zza",
};
export const SYLLABLE_MEANINGS: Readonly<Record<string, string>> = {
  산: "mountain", 강: "river", 물: "water", 불: "fire", 눈: "eye", 손: "hand", 발: "foot",
  집: "house", 밥: "meal", 옷: "clothes", 달: "moon", 별: "star", 입: "mouth", 몸: "body",
  닭: "chicken", 흙: "soil", 값: "price", 삶: "life", 몫: "share",
  개: "dog", 게: "crab", 귀: "ear", 꿈: "dream", 뼈: "bone", 쌀: "rice", 땀: "sweat",
  코: "nose", 피: "blood", 턱: "chin", 목: "neck", 팔: "arm", 등: "back", 배: "belly",
  폐: "lung", 간: "liver", 뇌: "brain", 혀: "tongue",
  꽃: "flower", 풀: "grass", 숲: "forest", 돌: "stone", 섬: "island", 땅: "ground", 길: "path",
  책: "book", 문: "door", 컵: "cup", 빵: "bread", 콩: "bean", 팥: "red bean",
  힘: "strength", 꾀: "wit", 소: "cow", 말: "horse", 술: "alcohol", 춤: "dance", 해: "sun", 비: "rain", 밤: "night", 낮: "daytime",
  봄: "spring", 벌: "bee", 뱀: "snake", 새: "bird", 쥐: "mouse", 곰: "bear", 양: "sheep", 용: "dragon", 왕: "king", 돈: "money",
  금: "gold", 은: "silver", 철: "iron", 실: "thread", 줄: "string", 끈: "cord", 천: "cloth", 솜: "cotton", 빗: "comb", 붓: "paintbrush",
  떡: "rice cake", 죽: "porridge", 국: "soup", 면: "noodles", 잣: "pine nut", 꿀: "honey", 잎: "leaf", 싹: "sprout", 논: "rice paddy", 밭: "field",
  늪: "swamp", 굴: "cave", 빛: "light", 맛: "taste", 뿔: "horn", 알: "egg", 볼: "cheek", 짐: "luggage", 잠: "sleep", 일: "work",
};
export function syllableTargetNote(target: string): string {
  return SYLLABLE_MEANINGS[target] ?? (SOUNDS[target] ? `[${SOUNDS[target]}]` : "");
}
