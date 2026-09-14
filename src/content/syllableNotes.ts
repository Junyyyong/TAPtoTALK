// Broad pronunciation of isolated teaching syllables (not English spelling).
// Korean IPA: https://www.cambridge.org/core/services/aop-cambridge-core/content/view/07312FF2A7409D9C71A4FE83E12AA54D/S0025100300004758a.pdf/korean.pdf
// 외/위 use their common diphthong pronunciations; 의 is isolated [ɰi].
const SOUNDS: Readonly<Record<string, string>> = {
  가: "ka", 나: "na", 다: "ta", 라: "ɾa", 마: "ma", 바: "pa", 사: "sa",
  아: "a", 자: "tɕa", 차: "tɕʰa", 카: "kʰa", 타: "tʰa", 파: "pʰa", 하: "ha",
  야: "ja", 어: "ʌ", 여: "jʌ", 오: "o", 요: "jo", 우: "u", 유: "ju", 으: "ɯ", 이: "i",
  애: "ɛ", 에: "e", 얘: "jɛ", 예: "je", 와: "wa", 왜: "wɛ", 외: "we",
  워: "wʌ", 웨: "we", 위: "wi", 의: "ɰi",
  까: "k͈a", 따: "t͈a", 빠: "p͈a", 싸: "s͈a", 짜: "tɕ͈a",
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
};
export function syllableTargetNote(target: string): string {
  return SYLLABLE_MEANINGS[target] ?? (SOUNDS[target] ? `[${SOUNDS[target]}]` : "");
}
