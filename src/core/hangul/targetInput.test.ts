import { expect, it } from "vitest";
import { composeTargetInput, requiredBoardSymbols } from "./target";
import { canAcceptInput } from "../../ui/inputCapacity";

it("shows tense initials on the next syllable throughout 아뿔사", () => {
  const taps = requiredBoardSymbols("아뿔사");
  expect(taps).toEqual(["ㅇ", "ㅣ", "ㆍ", "ㅂ", "ㅂ", "ㅡ", "ㆍ", "ㄹ", "ㅅ", "ㅣ", "ㆍ"]);
  expect(composeTargetInput("아뿔사", taps.slice(0, 4))).toBe("아ㅂ");
  expect(composeTargetInput("아뿔사", taps.slice(0, 5))).toBe("아ㅃ");
  expect(composeTargetInput("아뿔사", taps.slice(0, 7))).toBe("아뿌");
  expect(composeTargetInput("아뿔사", taps.slice(0, 8))).toBe("아뿔");
  expect(composeTargetInput("아뿔사", taps)).toBe("아뿔사");
  for (let i = 0; i < taps.length; i++) expect(canAcceptInput(i, "아뿔사")).toBe(true);
  // These spellings share a tap stream: the visible target supplies the boundary.
  expect(requiredBoardSymbols("압불사")).toEqual(taps);
  expect(composeTargetInput("아뿔사", ["ㅇ", "ㅣ", "ㆍ", "ㅂ", "ㄱ"])).not.toBe("아뿔사");
});

it("preserves correct syllable boundaries and supports undo by recomposing prefixes", () => {
  for (const word of ["오빠", "아뿔사", "깜짝이야", "꾀", "읽기", "닭"]) {
    let end = 0;
    const taps = requiredBoardSymbols(word);
    let prefix = "";
    for (const character of word) {
      prefix += character;
      end += requiredBoardSymbols(character).length;
      expect(composeTargetInput(word, taps.slice(0, end))).toBe(prefix);
    }
    expect(composeTargetInput(word, [])).toBe("");
    expect(composeTargetInput(word, [...taps, "×"])).not.toBe(word);
  }
});
