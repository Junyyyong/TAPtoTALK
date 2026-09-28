import { PREFERENCES_KEY, talkStore } from "./talkStorage";
export interface TalkPreferences {
  musicOn: boolean;
  soundOn: boolean;
  hapticsOn: boolean;
  tutorialDone: boolean;
}

export function loadTalkPreferences(): TalkPreferences {
  const value = JSON.parse(talkStore.read(PREFERENCES_KEY) ?? "{}") as Partial<TalkPreferences>;
  return {
    musicOn: value.musicOn !== false,
    soundOn: value.soundOn !== false,
    hapticsOn: value.hapticsOn !== false,
    tutorialDone: value.tutorialDone === true,
  };
}

export function saveTalkPreferences(preferences: TalkPreferences): void {
  talkStore.write(PREFERENCES_KEY, JSON.stringify(preferences));
}
