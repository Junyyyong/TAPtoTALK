import { expect, it } from "vitest";
import { mainStageNumber } from "../content/stageNumber";
import { ALPHABET_STAGES } from "../content/prompts";
import { PersistentStore } from "./persistentStore";
import { RECORDS_KEY, TALK_STORAGE_KEYS } from "./talkStorage";
import { validateTalkSave } from "./talkProgress";
import { recordReachedStage } from "./stageRecords";

const browser = (data: Map<string, string>) => ({ getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } });
it("numbers only timed problems, with the saved tutorial length rather than a new default", () => {
  for (let i = 0; i < ALPHABET_STAGES.length; i++) expect(mainStageNumber("alphabet", i)).toBe(0);
  expect(mainStageNumber("alphabet", ALPHABET_STAGES.length)).toBe(1);
  expect(mainStageNumber("alphabet", ALPHABET_STAGES.length + 9)).toBe(10);
  for (const length of [18, 30]) {
    expect(mainStageNumber("syllable", length - 1, length)).toBe(0);
    expect(mainStageNumber("syllable", length, length)).toBe(1);
    expect(mainStageNumber("syllable", length + 999, length)).toBe(1000);
  }
  expect(mainStageNumber("word", 0)).toBe(1);
  expect(mainStageNumber("word", 9999)).toBe(10000);
  for (const value of [-1, .5, Infinity, NaN]) expect(() => mainStageNumber("word", value)).toThrow();
});
it("keeps independent, monotonic best stages across browser restarts", async () => {
  const data = new Map<string, string>(), store = new PersistentStore(() => browser(data));
  await store.initialize(TALK_STORAGE_KEYS, validateTalkSave);
  expect(recordReachedStage("alphabet", 0, store)).toBe(0);
  expect(data.has(RECORDS_KEY)).toBe(false);
  expect(recordReachedStage("alphabet", 10, store)).toBe(10);
  expect(recordReachedStage("syllable", 5, store)).toBe(5);
  expect(recordReachedStage("word", 1000, store)).toBe(1000);
  expect(recordReachedStage("alphabet", 3, store)).toBe(10);
  const restarted = new PersistentStore(() => browser(data));
  await restarted.initialize(TALK_STORAGE_KEYS, validateTalkSave);
  expect(recordReachedStage("alphabet", 0, restarted)).toBe(10);
  expect(recordReachedStage("syllable", 0, restarted)).toBe(5);
  expect(recordReachedStage("word", 0, restarted)).toBe(1000);
});
it("validates records and recovers the previous valid best instead of silently resetting", async () => {
  const valid = JSON.stringify({ version: 1, alphabet: 10, syllable: 7, word: 99 });
  for (const patch of [{version: 2}, {word: -1}, {alphabet: "10"}, {syllable: .1}]) {
    expect(() => validateTalkSave(RECORDS_KEY, JSON.stringify({...JSON.parse(valid), ...patch}))).toThrow();
  }
  const data = new Map([[RECORDS_KEY, '{"version":1}'], [`${RECORDS_KEY}.backup`, valid]]);
  const store = new PersistentStore(() => browser(data));
  await store.initialize(TALK_STORAGE_KEYS, validateTalkSave);
  expect(recordReachedStage("word", 2, store)).toBe(99);
  expect(data.get(RECORDS_KEY)).toBe(valid);
});
it("persists best stages through native Preferences, not just WebView localStorage", async () => {
  const native = new Map<string, string>();
  const preferences = { get: async ({key}: {key: string}) => ({value: native.get(key) ?? null}), set: async ({key,value}: {key: string; value: string}) => { native.set(key, value); } };
  const store = new PersistentStore(() => browser(new Map()), preferences);
  await store.initialize(TALK_STORAGE_KEYS, validateTalkSave);
  recordReachedStage("alphabet", 23, store); await store.flush();
  const reopened = new PersistentStore(() => browser(new Map()), preferences);
  await reopened.initialize(TALK_STORAGE_KEYS, validateTalkSave);
  expect(recordReachedStage("alphabet", 0, reopened)).toBe(23);
});
