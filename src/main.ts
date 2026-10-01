import "./ui/styles/index.css";
import { APP_CONFIG } from "./config/app";
import { TalkApp } from "./ui/talkApp";
import { trackViewport } from "./ui/viewport";
import { trackNativeFrame } from "./ui/nativeFrame";
import { trackTalkTitleLayout } from "./ui/talkLayout";
import { Capacitor } from "@capacitor/core";
import { TALK_STORAGE_KEYS, talkStore } from "./ui/talkStorage";
import { validateTalkSave } from "./ui/talkProgress";
import { StorageNotice } from "./ui/storageNotice";

document.querySelector<HTMLImageElement>(".studio-splash-cover")!.src = APP_CONFIG.assets.studioSplash;
document.querySelector<HTMLImageElement>(".splash-cover")!.src = APP_CONFIG.assets.splash;
document.querySelector<HTMLImageElement>(".brand-mark")!.src = APP_CONFIG.assets.logo;
trackViewport();
trackNativeFrame(Capacitor.getPlatform() === "android");
trackTalkTitleLayout(Capacitor.getPlatform() === "android");
const storageNotice = new StorageNotice();
talkStore.onSaveFailure = failed => failed
  ? storageNotice.show(false, () => talkStore.flush()) : storageNotice.hide();
async function start(): Promise<void> {
  try { await talkStore.initialize(TALK_STORAGE_KEYS, validateTalkSave); }
  catch { storageNotice.show(true, start); return; }
  storageNotice.hide();
  new TalkApp();
  const flush = () => { void talkStore.flush().catch(() => {}); };
  document.addEventListener("visibilitychange", flush);
  window.addEventListener("pagehide", flush);
  window.addEventListener("focus", flush);
}
void start();
