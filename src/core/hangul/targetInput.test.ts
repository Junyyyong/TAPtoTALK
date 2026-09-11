import { expect, it } from "vitest";
import { COMMIT_BOUNDARY, composeTokens, deleteLastInput } from "./compose";
import { canInsertWordSpace, composeTargetInput, composedCharacterProgress, requiredBoardSymbols } from "./target";
import { isWordMatch } from "./wordChallenge";

it("distinguishes direct 거또 from committed 걷도 without using the prompt", () => {
  const direct = requiredBoardSymbols("걷도");
  expect(composeTargetInput("걷도", direct)).toBe("거또");
  expect(composeTargetInput("거또", direct)).toBe("거또");
  const input = requiredBoardSymbols("걷").map(value => ({ value: value as string }));
  input.push({ value: " " });
  expect(composeTokens(input.map(t => t.value))).toBe("걷 ");
  deleteLastInput(input);
  expect(input.at(-1)?.value).toBe(COMMIT_BOUNDARY);
  input.push(...requiredBoardSymbols("도").map(value => ({ value })));
  expect(composeTokens(input.map(t => t.value))).toBe("걷도");
  expect(isWordMatch("걷 도", "걷도")).toBe(false);
  expect(composedCharacterProgress("걷도", "거또").some(p => p.state === "wrong")).toBe(true);
});
it("double consonants become tense initials while compound finals remain possible", () => {
  for (const word of ["아뿔사", "오빠", "꾀", "읽", "닭", "깜짝이야"]) {
    expect(composeTargetInput("unrelated", requiredBoardSymbols(word))).toBe(word);
  }
  expect(composeTokens(requiredBoardSymbols("아뿔사").slice(0, 4))).toBe("압");
});
it("space deletion returns no tile, later deletes return original tile ids and clear boundaries", () => {
  const input = requiredBoardSymbols("걷").map((value, tileId) => ({ value: value as string, tileId: tileId as number | undefined }));
  input.push({ value: " ", tileId: undefined });
  expect(deleteLastInput(input)?.tileId).toBeUndefined();
  expect(deleteLastInput(input)?.tileId).toBe(3);
  expect(composeTokens(input.map(t => t.value))).toBe("거");
  while (input.length) deleteLastInput(input);
  expect(input).toEqual([]);
  expect(deleteLastInput(input)).toBeUndefined();
});
it("space commits wrong input too, independent of the target", () => {
  expect(canInsertWordSpace("거또", requiredBoardSymbols("걷"))).toBe(true);
  expect(canInsertWordSpace("가", [])).toBe(false);
  expect(canInsertWordSpace("가", ["ㄱ", " "])).toBe(false);
  expect(composeTargetInput("가", ["ㄴ"])).toBe("ㄴ");
});
