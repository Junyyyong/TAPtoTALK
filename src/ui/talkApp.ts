import { createLetterBoard, type LetterTile } from "../core/hangul/board";
import { composeTokens } from "../core/hangul/compose";
import { CONSONANTS, transformedConsonant, type BoardSymbol } from "../core/hangul/keys";
import { evaluateWriting, scoreFromTime, type WritingEvaluation } from "../core/hangul/writing";
import { FREE_MODE_CONFIG, SENTENCE_PROMPTS, WRITING_TOPICS, type SentencePrompt, type WritingTopic } from "../content/prompts";
import { el } from "./dom";
import { feedback } from "./feedback";
import { Cheer } from "./screens/cheer";
import { loadTalkPreferences, saveTalkPreferences, type TalkPreferences } from "./talkPreferences";

type Mode = "sentence" | "free";
interface TypedToken { value: string; tileId?: number; base?: BoardSymbol; strokeSteps?: number }

const formatTime = (ms: number): string => {
  const tenths = Math.floor(ms / 100) % 10;
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60_000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
};

const cheerFor = (score: number): string => {
  if (score >= 700) return "AMAZING!";
  if (score >= 350) return "GREAT!";
  return "NICE!";
};

const TUTORIAL_STEPS = [
  { title: "Build a syllable", body: "Tap in order: ㅊ → ㅣ → ㄴ", keys: ["ㅊ", "ㅣ", "ㄴ"], result: "친" },
  { title: "Make a vowel", body: "Tap ㅣ, then the Cheonjiin dot.", keys: ["ㅣ", "ㆍ"], result: "ㅏ" },
  { title: "Add a stroke", body: "Tap ㅅ, then Add stroke to make ㅆ.", keys: ["ㅅ", "stroke"], result: "ㅆ" },
  { title: "Finish a sentence", body: "Add a space and punctuation, then submit.", keys: ["여행", " ", "좋아", "!", "submit"], result: "완료" },
] as const;

/** Thin UI coordinator. Hangul behavior stays in core/hangul. */
export class TalkApp {
  private readonly cheer = new Cheer();
  private readonly splash = el("screen-splash");
  private readonly title = el("screen-title");
  private readonly game = el("screen-game");
  private readonly board = el("letter-board");
  private readonly targetLabel = el("target-label");
  private readonly targetText = el("target-text");
  private readonly targetHint = el("target-hint");
  private readonly typedText = el("typed-text");
  private readonly clock = el("run-clock");
  private readonly runMode = el("run-mode");
  private readonly result = el("result-layer");
  private readonly resultTitle = el("result-title");
  private readonly resultDetail = el("result-detail");
  private readonly submitRow = el("writing-submit-row");
  private readonly submitButton = el("btn-submit");
  private readonly writingFeedback = el("writing-feedback");
  private readonly help = el("help-layer");
  private readonly helpTitle = el("help-title");
  private readonly helpBody = el("help-body");
  private readonly tutorialNav = el("tutorial-nav");
  private readonly tutorialDots = el("tutorial-dots");
  private preferences: TalkPreferences = loadTalkPreferences();
  private tutorialStep = 0;
  private tutorialProgress = 0;
  private tutorialSolved = false;
  private mode: Mode = "sentence";
  private prompt: SentencePrompt = SENTENCE_PROMPTS[0]!;
  private topic: WritingTopic = WRITING_TOPICS[0]!;
  private tiles: LetterTile[] = [];
  private used = new Set<number>();
  private input: TypedToken[] = [];
  private startedAt = 0;
  private elapsedMs = 0;
  private frame?: number;

  constructor() {
    el("mode-sentence").addEventListener("click", () => this.start("sentence"));
    el("mode-free").addEventListener("click", () => this.start("free"));
    el("btn-back").addEventListener("click", () => this.showTitle());
    this.setupBackspace();
    el("btn-dot").addEventListener("click", () => this.typeFixed("ㆍ"));
    el("btn-stroke").addEventListener("click", () => this.addStroke());
    document.querySelectorAll<HTMLButtonElement>(".punctuation").forEach((button) => button.addEventListener("click", () => this.typeFixed(button.dataset.value ?? "")));
    el("btn-space").addEventListener("click", () => this.typeFixed(" "));
    el("btn-submit").addEventListener("click", () => this.submitWriting());
    el("btn-again").addEventListener("click", () => this.start(this.mode));
    el("btn-result-menu").addEventListener("click", () => this.showTitle());
    el("btn-title-tutorial").addEventListener("click", () => this.showTutorial());
    el("btn-title-settings").addEventListener("click", () => this.showSettings());
    el("btn-title-rules").addEventListener("click", () => this.showRules());
    el("btn-help-close").addEventListener("click", () => this.closeHelp());
    el("btn-tutorial-prev").addEventListener("click", () => this.moveTutorial(-1));
    el("btn-tutorial-next").addEventListener("click", () => this.moveTutorial(1));
    document.addEventListener("pointerdown", () => { this.cheer.unlock(); feedback.unlock(); }, { capture: true });
    this.applyPreferences();
    window.setTimeout(() => this.showTitle(), 900);
  }

  private showTitle(): void {
    this.stopClock(); this.cheer.stop();
    this.result.classList.add("hidden"); this.help.classList.add("hidden"); this.splash.classList.add("hidden"); this.game.classList.add("hidden"); this.title.classList.remove("hidden");
  }

  private start(mode: Mode): void {
    this.cheer.stop();
    this.mode = mode;
    if (mode === "sentence") this.prompt = SENTENCE_PROMPTS[Math.floor(Math.random() * SENTENCE_PROMPTS.length)]!;
    else this.topic = WRITING_TOPICS[Math.floor(Math.random() * WRITING_TOPICS.length)]!;
    this.input = []; this.used.clear();
    const requiredText = mode === "sentence" ? this.prompt.text : this.topic.keyword;
    this.tiles = createLetterBoard(requiredText);
    this.targetLabel.textContent = mode === "sentence" ? "TARGET" : "WORD";
    this.targetText.textContent = mode === "sentence" ? this.prompt.text : this.topic.keyword;
    this.targetHint.textContent = mode === "sentence" ? "Copy this sentence." : "Use this word in a short sentence.";
    this.typedText.dataset.empty = mode === "sentence"
      ? "Type the target sentence."
      : "Write a short sentence using the word.";
    this.runMode.textContent = mode === "sentence" ? "Sentence Copy" : "Short Writing";
    this.game.classList.toggle("is-free-mode", mode === "free");
    this.submitRow.classList.toggle("hidden", mode !== "free");
    this.submitButton.classList.toggle("hidden", mode !== "free");
    this.result.classList.add("hidden"); this.title.classList.add("hidden"); this.splash.classList.add("hidden"); this.game.classList.remove("hidden");
    this.renderBoard(); this.renderInput(); this.startClock();
  }

  private renderBoard(): void {
    const fragment = document.createDocumentFragment();
    for (const tile of this.tiles) {
      const button = document.createElement("button");
      button.className = "letter-tile"; button.type = "button"; button.textContent = tile.symbol;
      button.classList.add(CONSONANTS.includes(tile.symbol as never) ? "letter-tile--consonant" : "letter-tile--vowel");
      button.dataset.tileId = String(tile.id); button.setAttribute("aria-label", tile.symbol);
      button.addEventListener("click", () => this.typeTile(tile.id, tile.symbol)); fragment.append(button);
    }
    this.board.replaceChildren(fragment);
  }

  private typeTile(tileId: number, value: BoardSymbol): void {
    if (this.used.has(tileId)) return;
    feedback.pick(this.input.length + 1);
    this.used.add(tileId); this.input.push({ value, tileId, base: value, strokeSteps: 0 });
    this.board.querySelector<HTMLButtonElement>(`[data-tile-id="${tileId}"]`)!.disabled = true; this.renderInput();
  }
  private typeFixed(value: string): void { feedback.tap(); this.input.push({ value }); this.renderInput(); }
  private addStroke(): void {
    const last = this.input[this.input.length - 1];
    if (!last?.base || !CONSONANTS.includes(last.value as never)) { feedback.reject(); return; }
    const nextSteps = (last.strokeSteps ?? 0) + 1;
    const transformed = transformedConsonant(last.base, nextSteps);
    if (!transformed) { feedback.reject(); return; }
    feedback.item();
    last.value = transformed; last.strokeSteps = nextSteps; this.renderInput();
  }
  private backspace(): void {
    const last = this.input[this.input.length - 1];
    if (last?.base && (last.strokeSteps ?? 0) > 0) {
      const previousSteps = (last.strokeSteps ?? 0) - 1;
      last.strokeSteps = previousSteps;
      last.value = transformedConsonant(last.base, previousSteps) ?? last.base;
      feedback.tap(); this.renderInput(); return;
    }
    const removed = this.input.pop();
    if (removed?.tileId !== undefined) { this.used.delete(removed.tileId); this.board.querySelector<HTMLButtonElement>(`[data-tile-id="${removed.tileId}"]`)!.disabled = false; }
    feedback.tap(); this.renderInput();
  }

  private setupBackspace(): void {
    const button = el<HTMLButtonElement>("btn-backspace");
    let delay: number | undefined;
    let repeat: number | undefined;
    let repeated = false;
    const stop = (): void => {
      if (delay !== undefined) window.clearTimeout(delay);
      if (repeat !== undefined) window.clearInterval(repeat);
      delay = undefined; repeat = undefined;
    };
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault(); repeated = false;
      button.setPointerCapture?.(event.pointerId);
      delay = window.setTimeout(() => {
        repeated = true; this.backspace();
        repeat = window.setInterval(() => this.backspace(), 90);
      }, 420);
    });
    button.addEventListener("pointerup", () => { stop(); if (!repeated) this.backspace(); });
    button.addEventListener("pointercancel", stop);
    button.addEventListener("lostpointercapture", stop);
  }

  private renderInput(): void {
    const text = composeTokens(this.input.map((token) => token.value));
    this.typedText.textContent = text; this.typedText.classList.toggle("is-empty", text.length === 0);
    this.typedText.classList.toggle("is-correct", this.mode === "sentence" && this.prompt.text.startsWith(text) && text.length > 0);
    this.typedText.classList.toggle("is-wrong", this.mode === "sentence" && !this.prompt.text.startsWith(text));
    if (this.mode === "sentence" && text === this.prompt.text) this.finishSentence();
    if (this.mode === "free") this.renderWritingFeedback();
  }

  private startClock(): void {
    this.stopClock(); this.startedAt = performance.now();
    const update = (): void => {
      this.elapsedMs = performance.now() - this.startedAt;
      if (this.mode === "free") {
        const remaining = Math.max(0, FREE_MODE_CONFIG.durationMs - this.elapsedMs); this.clock.textContent = formatTime(remaining);
        if (remaining === 0) { this.finishWriting(false); return; }
      } else this.clock.textContent = formatTime(this.elapsedMs);
      this.frame = requestAnimationFrame(update);
    };
    update();
  }
  private stopClock(): void { if (this.frame !== undefined) cancelAnimationFrame(this.frame); this.frame = undefined; }
  private finishSentence(): void {
    this.stopClock();
    feedback.complete();
    const score = scoreFromTime(this.elapsedMs, FREE_MODE_CONFIG.durationMs);
    this.showResult("Sentence complete!", `${score} points · ${this.prompt.text} · ${formatTime(this.elapsedMs)}`, score);
  }
  private writingEvaluation(text = composeTokens(this.input.map((token) => token.value))): WritingEvaluation {
    const remainingMs = Math.max(0, FREE_MODE_CONFIG.durationMs - this.elapsedMs);
    return evaluateWriting(text, this.topic.keyword, remainingMs, FREE_MODE_CONFIG.durationMs, FREE_MODE_CONFIG);
  }
  private renderWritingFeedback(): void {
    this.writingFeedback.textContent = "Write a short sentence using the word.";
    this.writingFeedback.classList.remove("needs-work");
  }
  private submitWriting(): void {
    const evaluation = this.writingEvaluation();
    this.renderWritingFeedback();
    if (evaluation.complete) this.finishWriting(true);
    else {
      feedback.reject();
      this.writingFeedback.textContent = "Use the word and finish the sentence.";
      this.writingFeedback.classList.add("needs-work");
    }
  }
  private finishWriting(submitted: boolean): void {
    this.stopClock();
    const text = composeTokens(this.input.map((token) => token.value));
    const evaluation = this.writingEvaluation(text);
    if (!evaluation.complete) {
      feedback.fail();
      this.showResult("Not finished yet", text ? "Use the word and finish the sentence." : "Write a short sentence first.");
      return;
    }
    feedback.complete();
    this.showResult(
      submitted ? "Sentence sent!" : "Time is up!",
      `${evaluation.score} points · ${formatTime(this.elapsedMs)}`, evaluation.score,
    );
  }
  private showResult(title: string, detail: string, score?: number): void {
    const reveal = (): void => {
      this.resultTitle.textContent = title;
      this.resultDetail.textContent = detail;
      this.result.classList.remove("hidden");
    };
    if (score !== undefined && score > 0) this.cheer.play(title, score, cheerFor(score), reveal);
    else reveal();
  }

  private openHelp(title: string): void {
    feedback.tap();
    this.helpTitle.textContent = title;
    this.help.classList.remove("hidden");
  }

  private closeHelp(): void {
    feedback.tap();
    this.help.classList.add("hidden");
  }

  private showTutorial(): void {
    this.tutorialStep = 0;
    this.tutorialProgress = 0;
    this.tutorialSolved = false;
    this.tutorialNav.classList.remove("hidden");
    this.openHelp("How to play");
    this.renderTutorial();
  }

  private renderTutorial(): void {
    const step = TUTORIAL_STEPS[this.tutorialStep]!;
    this.helpBody.innerHTML = `<article class="tutorial-card"><p class="help-kicker">훈민정음 익히기 · ${this.tutorialStep + 1}/${TUTORIAL_STEPS.length}</p><h3>${step.title}</h3><p>${step.body}</p><div class="tutorial-practice"><p class="tutorial-output" id="tutorial-output">직접 눌러 보세요</p><div class="tutorial-keys" id="tutorial-keys"></div></div></article>`;
    const keys = el("tutorial-keys");
    [...new Set(step.keys)].forEach((key) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `tutorial-key${key === "stroke" || key === "submit" ? " tutorial-key--action" : ""}`;
      button.textContent = key === "stroke" ? "Add stroke" : key === "submit" ? "Submit" : key === " " ? "Space" : key;
      button.addEventListener("click", () => this.playTutorialKey(key));
      keys.append(button);
    });
    this.tutorialDots.replaceChildren(...TUTORIAL_STEPS.map((_, index) => {
      const dot = document.createElement("span");
      dot.className = `dot${index === this.tutorialStep ? " now" : index < this.tutorialStep ? " done" : ""}`;
      return dot;
    }));
    el<HTMLButtonElement>("btn-tutorial-prev").disabled = this.tutorialStep === 0;
    el<HTMLButtonElement>("btn-tutorial-next").disabled = !this.tutorialSolved;
    el("btn-tutorial-next").textContent = this.tutorialStep === TUTORIAL_STEPS.length - 1 ? "Start" : "Next";
  }

  private playTutorialKey(key: string): void {
    const step = TUTORIAL_STEPS[this.tutorialStep]!;
    if (key !== step.keys[this.tutorialProgress]) {
      feedback.reject();
      this.tutorialProgress = 0;
      el("tutorial-output").textContent = "순서대로 다시 눌러 보세요";
      return;
    }
    feedback.tap();
    this.tutorialProgress += 1;
    const entered = step.keys.slice(0, this.tutorialProgress);
    let output = "";
    if (this.tutorialStep < 2) output = composeTokens(entered.filter((value) => value !== "stroke"));
    else if (this.tutorialStep === 2) output = this.tutorialProgress === 2 ? "ㅆ" : "ㅅ";
    else output = entered.filter((value) => value !== "submit").join("");
    if (this.tutorialProgress === step.keys.length) {
      this.tutorialSolved = true;
      output = step.result;
      feedback.complete();
      el<HTMLButtonElement>("btn-tutorial-next").disabled = false;
    }
    el("tutorial-output").textContent = output || "·";
  }

  private moveTutorial(direction: number): void {
    feedback.tap();
    if (direction > 0 && this.tutorialStep === TUTORIAL_STEPS.length - 1) {
      this.preferences.tutorialDone = true;
      saveTalkPreferences(this.preferences);
      this.closeHelp();
      return;
    }
    this.tutorialStep = Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, this.tutorialStep + direction));
    this.tutorialProgress = 0;
    this.tutorialSolved = false;
    this.renderTutorial();
  }

  private showRules(): void {
    this.tutorialNav.classList.add("hidden");
    this.openHelp("Rules");
    this.helpBody.innerHTML = `<div class="rules-list"><p><b>Sentence Copy</b><span>Type the Korean sentence exactly.</span></p><p><b>Short Writing</b><span>Use the Korean word and finish a short sentence.</span></p><p><b>One block, one use</b><span>A used block stays as a light mark on the board.</span></p><p><b>Score</b><span>Finish faster to get more points.</span></p></div>`;
  }

  private showSettings(): void {
    this.tutorialNav.classList.add("hidden");
    this.openHelp("Settings");
    const canVibrate = typeof navigator.vibrate === "function";
    this.helpBody.innerHTML = `<div class="switch-list"><button class="switch-row" id="talk-sound"><span class="switch-text"><b>Sound</b><small>Button sounds and finish sounds</small></span><span class="switch" role="switch" aria-checked="${this.preferences.soundOn}"><span class="switch-knob"></span></span></button><button class="switch-row" id="talk-haptics"><span class="switch-text"><b>Vibration</b><small>Short feedback when you tap</small></span><span class="switch" role="switch" aria-checked="${this.preferences.hapticsOn}"><span class="switch-knob"></span></span></button>${canVibrate ? "" : '<p class="settings-note">Vibration may not work in this browser.</p>'}</div>`;
    el("talk-sound").addEventListener("click", () => this.changePreference("soundOn"));
    el("talk-haptics").addEventListener("click", () => this.changePreference("hapticsOn"));
  }

  private changePreference(key: "soundOn" | "hapticsOn"): void {
    this.preferences[key] = !this.preferences[key];
    saveTalkPreferences(this.preferences);
    this.applyPreferences();
    this.showSettings();
    feedback.item();
  }

  private applyPreferences(): void {
    feedback.setSound(this.preferences.soundOn);
    feedback.setHaptics(this.preferences.hapticsOn);
    this.cheer.setSound(this.preferences.soundOn);
  }
}
