import { beforeEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
const store = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("./talkStorage", () => ({ PREFERENCES_KEY: "taptotalk.preferences.v1", talkStore: store }));
import { loadTalkPreferences, saveTalkPreferences } from "./talkPreferences";

beforeEach(() => { vi.clearAllMocks(); store.read.mockReturnValue(null); });
it("defaults to vibration disabled without changing the music/sound defaults", () => {
  expect(loadTalkPreferences()).toEqual({musicOn: true, soundOn: true, hapticsOn: false, tutorialDone: false});
});
it.each([true, false])("ignores legacy vibration=%s and preserves other saved settings", hapticsOn => {
  store.read.mockReturnValue(JSON.stringify({musicOn: false, soundOn: false, hapticsOn, tutorialDone: true}));
  expect(loadTalkPreferences()).toEqual({musicOn: false, soundOn: false, hapticsOn: false, tutorialDone: true});
  expect(store.write).not.toHaveBeenCalled();
});
it("writes the same storage key with vibration disabled", () => {
  saveTalkPreferences({musicOn: false, soundOn: true, hapticsOn: true, tutorialDone: true});
  expect(store.write).toHaveBeenCalledWith("taptotalk.preferences.v1", JSON.stringify({musicOn: false, soundOn: true, hapticsOn: false, tutorialDone: true}));
});
it("removes the active vibration UI and disables feedback even for legacy data", () => {
  const app = readFileSync("src/ui/talkApp.ts", "utf8");
  expect(app).not.toMatch(/talk-haptics|navigator\.vibrate|Vibration/);
  expect(app).toContain("feedback.setHaptics(false)");
  expect(app).toContain('private changePreference(key: "musicOn" | "soundOn")');
});
