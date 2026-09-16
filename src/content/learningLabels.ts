import type { AlphabetStage } from "./prompts";

const NAMES: Readonly<Record<string, string>> = {
  ㄱ: "기역", ㄴ: "니은", ㄷ: "디귿", ㄹ: "리을", ㅁ: "미음", ㅂ: "비읍", ㅅ: "시옷",
  ㅇ: "이응", ㅈ: "지읒", ㅊ: "치읓", ㅋ: "키읔", ㅌ: "티읕", ㅍ: "피읖", ㅎ: "히읗",
  "ㆍ": "아래아", "ㅡ": "으", "ㅣ": "이",
};
const VOWELS = new Set(["ㆍ", "ㅡ", "ㅣ"]);
export function alphabetLabels(stage: AlphabetStage) {
  const vowels = stage.sequence.filter(value => VOWELS.has(value)).length;
  return {
    category: vowels === 0 ? "자음 / Consonant" : vowels === stage.sequence.length ? "모음 / Vowel" : "자음·모음 / Letters",
    names: stage.sequence.map(value => NAMES[value] ?? value).join(" · "),
    note: stage.boardSide <= 4 ? stage.note : "",
  };
}
