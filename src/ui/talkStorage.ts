import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { PersistentStore } from "./persistentStore";

// These names are storage contracts, not release numbers. Never bump them for an update.
export const PREFERENCES_KEY = "taptotalk.preferences.v1";
export const PROGRESS_KEYS = {
  alphabet: "taptotalk.progress.v1.alphabet",
  syllable: "taptotalk.progress.v1.syllable",
  word: "taptotalk.progress.v1.word",
} as const;
export const TALK_STORAGE_KEYS = [PREFERENCES_KEY, ...Object.values(PROGRESS_KEYS)];
export const talkStore = new PersistentStore(() => localStorage, Capacitor.isNativePlatform() ? Preferences : undefined);
