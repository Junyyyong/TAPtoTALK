import { createLetterBoard, type LetterTile } from "../core/hangul/board";
import { composeTokens } from "../core/hangul/compose";
import { CONSONANTS, consonantKeyLabel, cycleConsonant, type BoardSymbol } from "../core/hangul/keys";
import { targetToTokens } from "../core/hangul/target";
import { isWordMatch, wordCountLabel } from "../core/hangul/wordChallenge";
import { scoreFromTime } from "../core/hangul/writing";
import { SENTENCE_LEVELS, SENTENCE_PROMPTS, WORD_MODE_CONFIG, WORD_TARGETS, type SentencePrompt, type WordTarget } from "../content/prompts";
import { el } from "./dom";
import { feedback } from "./feedback";
import { Cheer } from "./screens/cheer";
import { loadSentenceProgress, saveSentenceProgress } from "./sentenceProgress";
import { loadTalkPreferences, saveTalkPreferences, type TalkPreferences } from "./talkPreferences";

type Mode = "sentence" | "word";
interface TypedToken { value: string; tileId?: number; base?: BoardSymbol; tapIndex?: number; punctuation?: boolean }

const PUNCTUATION = [".", ",", "!", "?", "~"] as const;

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
  { title: "Cycle a consonant", body: "Tap the ㄱㅋㄲ block twice to make ㅋ.", keys: ["ㄱㅋㄲ", "ㄱㅋㄲ"], result: "ㅋ" },
  { title: "Build a syllable", body: "Tap ㅈㅊㅉ twice, then ㅣ and ㄴㄹ.", keys: ["ㅈㅊㅉ", "ㅈㅊㅉ", "ㅣ", "ㄴㄹ"], result: "친" },
  { title: "Make a vowel", body: "Tap ㅣ, then the Cheonjiin dot.", keys: ["ㅣ", "ㆍ"], result: "ㅏ" },
  { title: "Add punctuation", body: "Tap the punctuation block until you see !", keys: [".,!?~", ".,!?~", ".,!?~"], result: "!" },
  { title: "Submit a word", body: "Make the target word, then tap Submit.", keys: ["사랑", "submit"], result: "1 word" },
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
  private readonly punctuationButton = el("btn-punctuation");
  private readonly controls = document.querySelector<HTMLElement>(".fixed-controls")!;
  private readonly writingFeedback = el("writing-feedback");
  private readonly help = el("help-layer");
  private readonly helpTitle = el("help-title");
  private readonly helpBody = el("help-body");
  private readonly tutorialNav = el("tutorial-nav");
  private readonly tutorialDots = el("tutorial-dots");
  private preferences: TalkPreferences = loadTalkPreferences();
  private sentenceProgress = loadSentenceProgress();
  private tutorialStep = 0;
  private tutorialProgress = 0;
  private tutorialSolved = false;
  private mode: Mode = "sentence";
  private prompt: SentencePrompt = SENTENCE_PROMPTS[0]!;
  private wordTarget: WordTarget = WORD_TARGETS[0]!;
  private wordCount = 0;
  private sentenceLevel = 0;
  private sentenceIndex = 0;
  private sentenceRunScore = 0;
  private inputLocked = true;
  private paused = false;
  private sentenceTimer?: number;
  private tiles: LetterTile[] = [];
  private used = new Set<number>();
  private input: TypedToken[] = [];
  private startedAt = 0;
  private elapsedMs = 0;
  private frame?: number;

  constructor() {
    el("mode-sentence").addEventListener("click", () => this.showLevelSelect());
    el("mode-free").addEventListener("click", () => this.start("word"));
    el("btn-back").addEventListener("click", () => this.showTitle());
    el("btn-pause").addEventListener("click", () => this.pauseGame());
    this.setupBackspace();
    el("btn-dot").addEventListener("click", () => this.typeFixed("ㆍ"));
    this.punctuationButton.addEventListener("click", () => this.typePunctuation());
    el("btn-space").addEventListener("click", () => this.typeFixed(" "));
    el("btn-submit").addEventListener("click", () => this.submitWord());
    el("btn-again").addEventListener("click", () => this.continueFromResult());
    el("btn-result-menu").addEventListener("click", () => this.showTitle());
    el("btn-title-tutorial").addEventListener("click", () => this.showTutorial());
    el("btn-title-settings").addEventListener("click", () => this.showSettings());
    el("btn-title-rules").addEventListener("click", () => this.showRules());
    el("btn-help-close").addEventListener("click", () => this.paused ? this.resumeGame() : this.closeHelp());
    el("btn-tutorial-prev").addEventListener("click", () => this.moveTutorial(-1));
    el("btn-tutorial-next").addEventListener("click", () => this.moveTutorial(1));
    document.addEventListener("pointerdown", () => { this.cheer.unlock(); feedback.unlock(); }, { capture: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && !this.game.classList.contains("hidden")) this.pauseGame();
    });
    this.applyPreferences();
    window.setTimeout(() => this.showTitle(), 900);
  }

  private showTitle(): void {
    window.clearTimeout(this.sentenceTimer);
    this.inputLocked = true; this.paused = false;
    this.stopClock(); this.cheer.stop();
    this.result.classList.add("hidden"); this.help.classList.add("hidden"); this.splash.classList.add("hidden"); this.game.classList.add("hidden"); this.title.classList.remove("hidden");
  }

  private start(mode: Mode): void {
    window.clearTimeout(this.sentenceTimer);
    this.cheer.stop();
    this.inputLocked = false; this.paused = false;
    this.game.classList.remove("is-input-locked");
    this.mode = mode;
    this.wordCount = 0;
    if (mode === "word") el("btn-again").textContent = "Play again";
    if (mode === "sentence") this.prompt = SENTENCE_LEVELS[this.sentenceLevel]!.prompts[this.sentenceIndex]!;
    else this.wordTarget = WORD_TARGETS[Math.floor(Math.random() * WORD_TARGETS.length)]!;
    this.input = []; this.used.clear();
    const requiredText = mode === "sentence" ? this.prompt.text : this.wordTarget.word;
    this.tiles = createLetterBoard(requiredText);
    this.targetLabel.textContent = mode === "sentence" ? `${SENTENCE_LEVELS[this.sentenceLevel]!.name} · ${this.sentenceIndex + 1}/5` : "TARGET";
    this.targetText.textContent = requiredText;
    this.targetHint.textContent = mode === "sentence" ? "Copy this sentence." : "Make the word and tap Submit.";
    this.typedText.dataset.empty = mode === "sentence" ? "Your sentence appears here." : "Your word appears here.";
    this.runMode.textContent = mode === "sentence" ? "Sentence Copy" : "Word Challenge";
    this.game.classList.toggle("is-word-mode", mode === "word");
    const needsPunctuation = mode === "sentence" && /[.,!?~]/.test(requiredText);
    this.punctuationButton.classList.toggle("hidden", !needsPunctuation);
    this.controls.classList.toggle("no-punctuation", !needsPunctuation && mode === "sentence");
    this.submitRow.classList.add("hidden");
    this.submitButton.classList.toggle("hidden", mode !== "word");
    this.result.classList.add("hidden"); this.title.classList.add("hidden"); this.splash.classList.add("hidden"); this.game.classList.remove("hidden");
    this.renderBoard(); this.renderInput(); this.startClock();
  }

  private renderBoard(): void {
    const fragment = document.createDocumentFragment();
    for (const tile of this.tiles) {
      const button = document.createElement("button");
      button.className = "letter-tile"; button.type = "button"; button.textContent = consonantKeyLabel(tile.symbol);
      button.classList.add(CONSONANTS.includes(tile.symbol as never) ? "letter-tile--consonant" : "letter-tile--vowel");
      button.dataset.tileId = String(tile.id); button.setAttribute("aria-label", consonantKeyLabel(tile.symbol));
      button.addEventListener("click", () => this.typeTile(tile.id, tile.symbol)); fragment.append(button);
    }
    this.board.replaceChildren(fragment);
  }

  private typeTile(tileId: number, value: BoardSymbol): void {
    if (this.inputLocked || this.paused) return;
    const last = this.input[this.input.length - 1];
    if (last?.tileId === tileId && last.base) {
      last.tapIndex = ((last.tapIndex ?? 0) + 1);
      last.value = cycleConsonant(last.base, last.tapIndex) ?? last.base;
      feedback.item(); this.renderInput(); return;
    }
    if (this.used.has(tileId)) return;
    this.finalizeActiveTile();
    feedback.pick(this.input.length + 1);
    this.used.add(tileId); this.input.push({ value, tileId, base: value, tapIndex: 0 });
    this.board.querySelector<HTMLButtonElement>(`[data-tile-id="${tileId}"]`)!.classList.add("is-active"); this.renderInput();
  }
  private finalizeActiveTile(): void {
    const active = this.input.at(-1);
    if (active?.tileId === undefined) return;
    const button = this.board.querySelector<HTMLButtonElement>(`[data-tile-id="${active.tileId}"]`);
    if (button) { button.classList.remove("is-active"); button.disabled = true; }
  }
  private typeFixed(value: string): void { if (this.inputLocked || this.paused) return; this.finalizeActiveTile(); feedback.tap(); this.input.push({ value }); this.renderInput(); }
  private typePunctuation(): void {
    if (this.inputLocked || this.paused) return;
    this.finalizeActiveTile();
    const last = this.input.at(-1);
    if (last?.punctuation) {
      const index = PUNCTUATION.indexOf(last.value as typeof PUNCTUATION[number]);
      last.value = PUNCTUATION[(index + 1) % PUNCTUATION.length]!;
    } else this.input.push({ value: PUNCTUATION[0], punctuation: true });
    feedback.tap(); this.renderInput();
  }
  private backspace(): void {
    if (this.inputLocked || this.paused) return;
    const removed = this.input.pop();
    if (removed?.tileId !== undefined) {
      this.used.delete(removed.tileId);
      const button = this.board.querySelector<HTMLButtonElement>(`[data-tile-id="${removed.tileId}"]`)!;
      button.disabled = false; button.classList.remove("is-active");
    }
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
      repeated = false;
      button.setPointerCapture?.(event.pointerId);
      delay = window.setTimeout(() => {
        repeated = true; this.backspace();
        repeat = window.setInterval(() => this.backspace(), 90);
      }, 420);
    });
    button.addEventListener("pointerup", stop);
    button.addEventListener("pointercancel", stop);
    button.addEventListener("lostpointercapture", stop);
    button.addEventListener("click", () => {
      if (repeated) { repeated = false; return; }
      this.backspace();
    });
  }

  private renderInput(): void {
    const text = composeTokens(this.input.map((token) => token.value));
    this.typedText.textContent = text; this.typedText.classList.toggle("is-empty", text.length === 0);
    const target = this.mode === "sentence" ? this.prompt.text : this.wordTarget.word;
    this.typedText.classList.toggle("is-correct", target.startsWith(text) && text.length > 0);
    this.typedText.classList.toggle("is-wrong", !target.startsWith(text));
    if (this.mode === "sentence" && text === this.prompt.text) this.finishSentence();
    if (this.mode === "word") this.clearWordFeedback();
  }

  private startClock(resume = false): void {
    this.stopClock();
    this.startedAt = resume ? performance.now() - this.elapsedMs : performance.now();
    const update = (): void => {
      this.elapsedMs = performance.now() - this.startedAt;
      if (this.mode === "word") {
        const remaining = Math.max(0, WORD_MODE_CONFIG.durationMs - this.elapsedMs); this.clock.textContent = formatTime(remaining);
        if (remaining === 0) { this.finishWordChallenge(); return; }
      } else this.clock.textContent = formatTime(this.elapsedMs);
      this.frame = requestAnimationFrame(update);
    };
    update();
  }
  private stopClock(): void { if (this.frame !== undefined) cancelAnimationFrame(this.frame); this.frame = undefined; }
  private finishSentence(): void {
    if (this.frame === undefined || this.inputLocked) return;
    this.inputLocked = true;
    this.game.classList.add("is-input-locked");
    this.stopClock();
    feedback.complete();
    const targetMs = 5_000 + targetToTokens(this.prompt.text).length * 800;
    const score = scoreFromTime(this.elapsedMs, targetMs);
    this.sentenceRunScore += score;
    const level = SENTENCE_LEVELS[this.sentenceLevel]!;
    const finalSentence = this.sentenceIndex === level.prompts.length - 1;
    if (finalSentence) {
      const previousBest = this.sentenceProgress.bestScores[level.id] ?? 0;
      this.sentenceProgress.bestScores[level.id] = Math.max(previousBest, this.sentenceRunScore);
      saveSentenceProgress(this.sentenceProgress);
      el("btn-again").textContent = "Choose level";
      this.showResult("Level complete!", `${this.sentenceRunScore.toLocaleString()} points · Best ${this.sentenceProgress.bestScores[level.id]!.toLocaleString()}`, this.sentenceRunScore, score);
    } else {
      this.sentenceTimer = window.setTimeout(() => {
        this.sentenceIndex += 1;
        this.start("sentence");
      }, 520);
    }
  }

  private continueFromResult(): void {
    this.result.classList.add("hidden");
    if (this.mode === "sentence") {
      this.showLevelSelect(); return;
    }
    this.start("word");
  }
  private clearWordFeedback(): void {
    this.writingFeedback.textContent = "";
    this.writingFeedback.classList.remove("needs-work");
    this.submitRow.classList.add("hidden");
  }
  private submitWord(): void {
    const text = composeTokens(this.input.map((token) => token.value));
    this.clearWordFeedback();
    if (!isWordMatch(text, this.wordTarget.word)) {
      feedback.reject();
      this.writingFeedback.textContent = "Check the word and try again.";
      this.writingFeedback.classList.add("needs-work");
      this.submitRow.classList.remove("hidden");
      return;
    }
    this.wordCount += 1;
    feedback.clear(this.input.length);
    this.startNextWord();
  }
  private startNextWord(): void {
    const choices = WORD_TARGETS.filter((target) => target.id !== this.wordTarget.id);
    this.wordTarget = choices[Math.floor(Math.random() * choices.length)] ?? WORD_TARGETS[0]!;
    this.input = []; this.used.clear();
    this.tiles = createLetterBoard(this.wordTarget.word);
    this.targetText.textContent = this.wordTarget.word;
    this.targetHint.textContent = `${wordCountLabel(this.wordCount)} complete · make the next word.`;
    this.renderBoard(); this.renderInput();
  }
  private finishWordChallenge(): void {
    this.stopClock();
    const label = wordCountLabel(this.wordCount);
    if (this.wordCount > 0) {
      feedback.complete();
      const tierScore = this.wordCount >= 10 ? 900 : this.wordCount >= 7 ? 650 : this.wordCount >= 4 ? 350 : 0;
      this.showResult("Time is up!", `${label} completed`, this.wordCount, tierScore);
    } else {
      feedback.fail();
      this.showResult("Time is up!", "0 words completed");
    }
  }
  private showResult(title: string, detail: string, score?: number, tierScore = score): void {
    const reveal = (): void => {
      this.resultTitle.textContent = title;
      this.resultDetail.textContent = detail;
      this.result.classList.remove("hidden");
    };
    if (score !== undefined && score > 0) this.cheer.play(title, score, cheerFor(tierScore ?? score), reveal, tierScore);
    else reveal();
  }

  private openHelp(title: string): void {
    feedback.tap();
    this.helpTitle.textContent = title;
    this.help.classList.remove("hidden");
  }

  private showLevelSelect(): void {
    this.stopClock(); this.cheer.stop();
    this.result.classList.add("hidden"); this.game.classList.add("hidden"); this.title.classList.remove("hidden");
    this.tutorialNav.classList.add("hidden");
    this.openHelp("Sentence Copy");
    this.helpBody.innerHTML = `<p class="level-intro">Complete five phrases. Your fastest run becomes the level high score.</p><div class="level-list" id="level-list"></div>`;
    const list = el("level-list");
    SENTENCE_LEVELS.forEach((level, index) => {
      const best = this.sentenceProgress.bestScores[level.id] ?? 0;
      const button = document.createElement("button");
      button.type = "button"; button.className = "level-btn";
      button.innerHTML = `<strong>${level.name}</strong><span>5 phrases</span><small>${best ? `BEST ${best.toLocaleString()}` : "NEW"}</small>`;
      button.addEventListener("click", () => this.startSentenceLevel(index));
      list.append(button);
    });
  }

  private startSentenceLevel(index: number): void {
    this.sentenceLevel = index; this.sentenceIndex = 0; this.sentenceRunScore = 0;
    this.help.classList.add("hidden");
    this.start("sentence");
  }

  private pauseGame(): void {
    if (this.inputLocked || this.paused || this.game.classList.contains("hidden")) return;
    this.paused = true; this.stopClock();
    this.tutorialNav.classList.add("hidden");
    this.openHelp("Paused");
    this.helpBody.innerHTML = `<div class="pause-card"><p>Take a break. The clock is stopped.</p><button class="wood-btn" id="btn-resume">Resume</button><button class="text-btn" id="btn-pause-menu">Main menu</button></div>`;
    el("btn-resume").addEventListener("click", () => this.resumeGame());
    el("btn-pause-menu").addEventListener("click", () => this.showTitle());
  }

  private resumeGame(): void {
    if (!this.paused) return;
    this.paused = false; this.help.classList.add("hidden");
    this.startClock(true);
    feedback.tap();
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
    this.helpBody.innerHTML = `<article class="tutorial-card"><p class="help-kicker">STEP ${this.tutorialStep + 1} / ${TUTORIAL_STEPS.length}</p><h3>${step.title}</h3><p>${step.body}</p><div class="tutorial-practice"><p class="tutorial-output is-empty" id="tutorial-output" aria-live="polite"></p><div class="tutorial-keys" id="tutorial-keys"></div></div></article>`;
    const keys = el("tutorial-keys");
    [...new Set(step.keys)].forEach((key) => {
      const button = document.createElement("button");
      button.type = "button";
      const category = key === ".,!?~" ? "feature" : key === "submit" ? "submit" : ["ㅣ", "ㅡ", "ㆍ"].includes(key) ? "vowel" : "consonant";
      button.className = `tutorial-key tutorial-key--${category}`;
      button.dataset.tutorialKey = key;
      button.textContent = key === "submit" ? "Submit" : key;
      button.addEventListener("click", () => this.playTutorialKey(key));
      keys.append(button);
    });
    this.updateTutorialKeys();
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
      el("tutorial-output").textContent = "Tap the glowing key.";
      return;
    }
    feedback.tap();
    this.tutorialProgress += 1;
    const entered = step.keys.slice(0, this.tutorialProgress);
    let output = entered.at(-1) ?? "";
    if (this.tutorialStep === 0) output = this.tutorialProgress === 2 ? "ㅋ" : "ㄱ";
    else if (this.tutorialStep === 1) output = this.tutorialProgress === 4 ? "친" : entered.join(" → ");
    else if (this.tutorialStep === 2) output = this.tutorialProgress === 2 ? "ㅏ" : "ㅣ";
    else if (this.tutorialStep === 3) output = PUNCTUATION[this.tutorialProgress - 1] ?? ".";
    else output = entered.filter((value) => value !== "submit").join("");
    if (this.tutorialProgress === step.keys.length) {
      this.tutorialSolved = true;
      output = step.result;
      feedback.complete();
      el<HTMLButtonElement>("btn-tutorial-next").disabled = false;
    }
    const outputEl = el("tutorial-output");
    outputEl.textContent = output;
    outputEl.classList.toggle("is-empty", !output);
    this.updateTutorialKeys();
  }

  private updateTutorialKeys(): void {
    const step = TUTORIAL_STEPS[this.tutorialStep]!;
    this.helpBody.querySelectorAll<HTMLButtonElement>("[data-tutorial-key]").forEach((button) => {
      const key = button.dataset.tutorialKey;
      const usedBefore = step.keys.slice(0, this.tutorialProgress).includes(key as never);
      const neededAgain = step.keys.slice(this.tutorialProgress).includes(key as never);
      const used = usedBefore && !neededAgain;
      button.disabled = used;
      button.classList.toggle("is-used", used);
      button.classList.toggle("is-next", !this.tutorialSolved && key === step.keys[this.tutorialProgress]);
    });
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
    this.helpBody.innerHTML = `<div class="rules-list"><p><b>Sentence Copy</b><span>Complete five phrases. Faster typing earns more points, and your best level score is saved.</span></p><p><b>Word Challenge</b><span>Make the target word and tap Submit. Complete as many words as you can in 60 seconds.</span></p><p><b>Galaxy Cheonjiin</b><span>Tap one consonant block again to cycle its letters, such as ㄱ → ㅋ → ㄲ.</span></p><p><b>Vowels</b><span>Use ㆍ, ㅡ, and ㅣ to build vowels.</span></p><p><b>Punctuation</b><span>Tap the .,! ?~ block repeatedly until the needed mark appears.</span></p><p><b>One block, one use</b><span>After moving to another block, a used block stays as a light mark.</span></p></div>`;
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
