import { createWordBoard, WORD_BOARD_SIDE, inputValueForTile, MIRROR_TRAP_TOKEN, type LetterTile } from "../core/hangul/board";
import { createAlphabetStageBoard, createMixedLearningBoard, type AlphabetTile } from "../core/hangul/alphabetGame";
import { composeTokens } from "../core/hangul/compose";
import { CHEONJIIN_STROKES, CONSONANTS, type BoardSymbol } from "../core/hangul/keys";
import { isWordMatch } from "../core/hangul/wordChallenge";
import { composeTargetInput, materializeTargetTokens, targetCharacterProgress, targetToTokens } from "../core/hangul/target";
import { ALPHABET_ORDER, WORD_TARGETS, type AlphabetStage, type WordTarget } from "../content/prompts";
import { learningStageAt, LEARNING_TRAP_RATIO, LEARNING_TRANSITION_MS, type LearningMode } from "../content/learningJourney";
import { createWordJourney, isWordBonusStage } from "../content/wordJourney";
import { APP_CONFIG } from "../config/app";
import { INTRO_MARKS } from "../config/introMarks";
import { el } from "./dom";
import { createAlphabetGlyph } from "./alphabetGlyph";
import { createUploadedGlyph } from "./uploadedGlyph";
import { feedback } from "./feedback";
import { canAcceptInput } from "./inputCapacity";
import { Cheer } from "./screens/cheer";
import { loadTalkPreferences, saveTalkPreferences, type TalkPreferences } from "./talkPreferences";

type Mode = LearningMode | "word";
interface TypedToken { value: string; tileId?: number }

const formatTime = (ms: number): string => {
  const tenths = Math.floor(ms / 100) % 10;
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60_000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
};

/** Nine decorative colours repeat evenly across 81 positions, independently of jamo. */
const boardColorAt = (index: number): number => ((index * 5 + Math.floor(index / 9) * 2) % 9) + 1;

/** Thin UI coordinator. Hangul behavior stays in core/hangul. */
export class TalkApp {
  private readonly cheer = new Cheer();
  private readonly studioSplash = el("screen-studio-splash");
  private readonly splash = el("screen-splash");
  private readonly title = el("screen-title");
  private readonly alphabetIntro = el("screen-alphabet-intro");
  private readonly game = el("screen-game");
  private readonly board = el("letter-board");
  private readonly targetLabel = el("target-label");
  private readonly targetPrompt = document.querySelector<HTMLElement>(".target-prompt")!;
  private readonly targetText = el("target-text");
  private readonly targetHint = el("target-hint");
  private readonly typedText = el("typed-text");
  private readonly clock = el("run-clock");
  private readonly runMode = el("run-mode");
  private readonly result = el("result-layer");
  private readonly submitRow = el("writing-submit-row");
  private readonly writingFeedback = el("writing-feedback");
  private readonly help = el("help-layer");
  private readonly helpTitle = el("help-title");
  private readonly helpBody = el("help-body");
  private preferences: TalkPreferences = loadTalkPreferences();
  private mode: Mode = "alphabet";
  private introMode: Mode = "alphabet";
  private wordTarget: WordTarget = WORD_TARGETS[0]!;
  private wordTargetIndex = 0;
  private nextWordTarget = createWordJourney();
  private alphabetStageIndex = 0;
  private learningStage: AlphabetStage = learningStageAt("alphabet", 0);
  private alphabetPartIndex = 0;
  private alphabetTiles: AlphabetTile[] = [];
  private inputLocked = true;
  private paused = false;
  private stageTimer?: number;
  private stageTransitionPending = false;
  private tiles: LetterTile[] = [];
  private used = new Set<number>();
  private input: TypedToken[] = [];
  private startedAt = 0;
  private elapsedMs = 0;
  private frame?: number;

  constructor() {
    el("mode-alphabet").addEventListener("click", () => this.showAlphabetIntro("alphabet"));
    el("btn-alphabet-intro-back").addEventListener("click", () => this.showTitle());
    el("btn-alphabet-start").addEventListener("click", () => this.introMode === "word" ? this.startWordJourney() : this.startAlphabetJourney());
    el("mode-syllable").addEventListener("click", () => this.showAlphabetIntro("syllable"));
    el("mode-word").addEventListener("click", () => this.showAlphabetIntro("word"));
    el("btn-back").addEventListener("click", () => this.showTitle());
    el("btn-pause").addEventListener("click", () => this.pauseGame());
    this.setupBackspace();
    el("btn-space").addEventListener("click", () => this.typeFixed(" "));
    el("btn-again").addEventListener("click", () => this.continueFromResult());
    el("btn-result-menu").addEventListener("click", () => this.showTitle());
    el("btn-title-settings").addEventListener("click", () => this.showSettings());
    el("btn-help-close").addEventListener("click", () => this.paused ? this.resumeGame() : this.closeHelp());
    document.addEventListener("pointerdown", () => { this.cheer.unlock(); feedback.unlock(); }, { capture: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && !this.game.classList.contains("hidden")) this.pauseGame();
    });
    this.applyPreferences();
    window.setTimeout(() => this.showProductSplash(), APP_CONFIG.timing.studioSplashMs);
    window.setTimeout(() => this.showTitle(), APP_CONFIG.timing.studioSplashMs + APP_CONFIG.timing.productSplashMs);
  }

  private showProductSplash(): void {
    this.studioSplash.classList.add("hidden");
    this.splash.classList.remove("hidden");
  }

  private showTitle(): void {
    window.clearTimeout(this.stageTimer);
    this.stageTransitionPending = false;
    this.inputLocked = true; this.paused = false;
    this.stopClock(); this.cheer.stop();
    this.result.classList.add("hidden"); this.help.classList.add("hidden"); this.studioSplash.classList.add("hidden"); this.splash.classList.add("hidden"); this.alphabetIntro.classList.add("hidden"); this.game.classList.add("hidden"); this.title.classList.remove("hidden");
  }

  private startWord(): void {
    window.clearTimeout(this.stageTimer);
    this.stageTransitionPending = false;
    this.cheer.stop();
    this.inputLocked = false; this.paused = false;
    this.game.classList.remove("is-input-locked");
    this.targetPrompt.classList.remove("is-writing-complete");
    this.mode = "word";
    this.wordTarget = this.nextWordTarget();
    this.input = []; this.used.clear();
    const requiredText = this.wordTarget.word;
    this.tiles = createWordBoard(requiredText);
    this.targetLabel.textContent = `STAGE ${this.wordTargetIndex + 1}`;
    this.renderTranslatedTarget();
    this.typedText.dataset.empty = "Your word appears here.";
    this.runMode.textContent = "Word";
    this.game.classList.add("is-word-mode");
    this.game.classList.remove("is-alphabet-mode", "is-syllable-mode");
    this.targetPrompt.classList.remove("is-alphabet-complete");
    this.submitRow.classList.add("hidden");
    this.result.classList.add("hidden"); this.title.classList.add("hidden"); this.splash.classList.add("hidden"); this.game.classList.remove("hidden");
    this.renderBoard(); this.renderInput(); this.startClock();
  }

  private renderTranslatedTarget(): void {
    this.targetText.classList.remove("is-medium-sequence", "is-long-sequence");
      const korean = document.createElement("span"); korean.className = "target-korean"; korean.textContent = this.wordTarget.word;
      const english = document.createElement("span"); english.className = "target-translation-inline"; english.textContent = this.wordTarget.translation;
      this.targetText.replaceChildren(korean, english);
      this.targetHint.textContent = "Complete the target word.";
  }

  private showAlphabetIntro(mode: Mode): void {
    window.clearTimeout(this.stageTimer);
    this.stageTransitionPending = false;
    this.inputLocked = true; this.paused = false;
    this.introMode = mode;
    el("learning-intro-title").textContent = mode.toUpperCase();
    // Locally generated outlines, not user-provided markup or webfont text.
    el("learning-intro-mark").innerHTML = INTRO_MARKS[mode];
    el("learning-intro-mark").setAttribute("aria-label", mode === "alphabet" ? "ㄱ" : mode === "syllable" ? "가" : "안녕");
    el("learning-intro-mark").setAttribute("role", "img");
    el("learning-intro-mark").classList.toggle("is-word", mode === "word");
    el("learning-intro-description").textContent = mode === "word" ? "Build one word at a time." : "2×2 → 4×4 → 6×6 → 8×8";
    this.stopClock(); this.cheer.stop();
    this.result.classList.add("hidden"); this.help.classList.add("hidden"); this.game.classList.add("hidden"); this.title.classList.add("hidden");
    this.alphabetIntro.classList.remove("hidden");
  }

  private startAlphabetJourney(): void {
    window.clearTimeout(this.stageTimer);
    this.stageTransitionPending = false;
    this.cheer.stop();
    this.mode = this.introMode;
    this.inputLocked = false; this.paused = false;
    this.game.classList.remove("is-input-locked");
    this.alphabetStageIndex = 0; this.alphabetPartIndex = 0; this.elapsedMs = 0;
    el("btn-again").textContent = "Play again";
    this.result.classList.add("hidden"); this.title.classList.add("hidden"); this.alphabetIntro.classList.add("hidden"); this.splash.classList.add("hidden"); this.game.classList.remove("hidden");
    this.game.classList.remove("is-word-mode"); this.game.classList.add("is-alphabet-mode");
    this.game.classList.toggle("is-syllable-mode", this.mode === "syllable");
    this.targetPrompt.classList.remove("is-writing-complete");
    this.submitRow.classList.add("hidden");
    this.loadAlphabetStage();
    this.startClock();
  }

  private loadAlphabetStage(): void {
    if (this.mode === "word") return;
    const stage = learningStageAt(this.mode, this.alphabetStageIndex, this.learningStage.target);
    this.learningStage = stage;
    this.targetPrompt.classList.remove("is-alphabet-complete");
    this.used.clear();
    this.alphabetPartIndex = 0;
    this.alphabetTiles = stage.boardSide === 8 || (this.mode === "syllable" && stage.boardSide !== 2)
      ? createMixedLearningBoard(stage.sequence, ALPHABET_ORDER, stage.boardSide as 4 | 6 | 8, LEARNING_TRAP_RATIO)
      : createAlphabetStageBoard(stage.sequence, ALPHABET_ORDER, stage.boardSide);
    this.runMode.textContent = this.mode === "syllable" ? "Syllable" : "Alphabet";
    this.targetLabel.textContent = `STAGE ${stage.number}`;
    this.renderAlphabetBoard();
    this.renderAlphabetTarget();
  }

  private renderAlphabetBoard(): void {
    const stage = this.learningStage;
    this.board.dataset.gridSize = String(stage.boardSide);
    const fragment = document.createDocumentFragment();
    this.alphabetTiles.forEach((tile, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `letter-tile letter-tile--alphabet letter-tile--color-${boardColorAt(index)}`;
      if (tile.transform) button.classList.add(`letter-tile--${tile.transform}`);
      if (tile.shape) {
        button.classList.add("letter-tile--shape");
        const shapeClass = ({ "╱": "line-up", "╲": "line-down", "⟋": "line-shallow", "★": "star", "♥": "heart", ",": "comma" } as const)[tile.value as "╱" | "╲" | "⟋" | "★" | "♥" | ","];
        if (shapeClass) button.classList.add(`letter-tile--shape-${shapeClass}`);
      }
      if (tile.value === "ㅣ") button.classList.add("letter-tile--stroke-vertical");
      if (tile.value === "ㅡ") button.classList.add("letter-tile--stroke-horizontal");
      button.dataset.tileId = String(tile.id);
      button.setAttribute(
        "aria-label",
        tile.shape
          ? `${tile.value} shape trap`
          : tile.transform
          ? `${tile.transform.startsWith("stem") ? tile.transform : tile.transform.startsWith("rotate") ? "Rotated" : "Reversed"} ${tile.value} trap`
          : tile.value === "ㆍ"
            ? "Cheonjiin dot"
            : tile.value,
      );
      const glyph = document.createElement("span"); glyph.className = "letter-glyph"; glyph.textContent = tile.value === "ㆍ" || tile.value === "." || tile.value === "ㅣ" || tile.value === "ㅡ" ? "" : tile.value;
      const outline = createAlphabetGlyph(tile.value, tile.transform);
      if (outline) {
        glyph.replaceChildren(outline);
        if (outline.classList.contains("uploaded-glyph")) button.classList.add("has-uploaded-glyph");
      }
      button.append(glyph);
      if (tile.value === "ㆍ") button.classList.add("letter-tile--cheonjiin-dot");
      if (tile.value === ".") button.classList.add("letter-tile--period");
      button.addEventListener("click", () => this.tapAlphabetTile(tile, button));
      fragment.append(button);
    });
    this.board.replaceChildren(fragment);
  }

  private tapAlphabetTile(tile: AlphabetTile, button: HTMLButtonElement): void {
    if (this.inputLocked || this.paused || this.used.has(tile.id)) return;
    const stage = this.learningStage;
    if (tile.transform || tile.shape || tile.value !== stage.sequence[this.alphabetPartIndex]) {
      feedback.reject();
      button.classList.remove("is-wrong-pick"); void button.offsetWidth; button.classList.add("is-wrong-pick");
      window.setTimeout(() => button.classList.remove("is-wrong-pick"), 360);
      return;
    }
    feedback.pick(this.alphabetStageIndex + this.alphabetPartIndex + 1);
    this.used.add(tile.id); button.disabled = true;
    this.alphabetPartIndex += 1;
    this.renderAlphabetTarget();
    if (this.alphabetPartIndex < stage.sequence.length) return;
    this.inputLocked = true;
    this.targetPrompt.classList.add("is-alphabet-complete");
    this.stageTransitionPending = true;
    this.stageTimer = window.setTimeout(() => this.advanceLearningStage(), LEARNING_TRANSITION_MS);
  }

  private advanceLearningStage(): void {
    if (!this.stageTransitionPending || this.paused) return;
    this.stageTransitionPending = false;
    if (this.mode === "word") {
      if (isWordBonusStage(this.wordTargetIndex + 1)) {
        this.stopClock();
        this.game.classList.add("is-input-locked");
        this.cheer.playBonus(() => {
          this.targetPrompt.classList.remove("is-writing-complete");
          this.game.classList.remove("is-input-locked");
          this.inputLocked = false;
          this.startNextWord();
          this.startClock(true);
        });
        return;
      }
      this.targetPrompt.classList.remove("is-writing-complete");
      this.inputLocked = false;
      this.startNextWord();
      return;
    }
    this.alphabetStageIndex += 1;
    this.inputLocked = false;
    this.loadAlphabetStage();
  }

  private renderAlphabetTarget(): void {
    const stage = this.learningStage;
    if (this.mode === "syllable") { this.renderSyllableTarget(stage); return; }
    const korean = document.createElement("span"); korean.className = "target-korean";
    stage.sequence.forEach((value, index) => {
      const jamo = document.createElement("span");
      jamo.className = "alphabet-target-jamo";
      if (value === "ㆍ") jamo.classList.add("is-cheonjiin");
      if (index < this.alphabetPartIndex) jamo.classList.add("is-done");
      else if (index === this.alphabetPartIndex) jamo.classList.add("is-current");
      jamo.textContent = value === "ㆍ" ? "" : value;
      jamo.setAttribute("aria-label", value);
      korean.append(jamo);
    });
    const note = document.createElement("span"); note.className = "alphabet-target-note"; note.textContent = stage.note;
    this.targetText.replaceChildren(korean, note);
    this.targetText.classList.toggle("is-medium-sequence", stage.sequence.length === 3);
    this.targetText.classList.toggle("is-long-sequence", stage.sequence.length >= 5);
    this.targetHint.textContent = `${stage.boardSide} × ${stage.boardSide}`;
    this.typedText.replaceChildren();
  }

  private renderSyllableTarget(stage: AlphabetStage): void {
    this.targetText.classList.remove("is-medium-sequence", "is-long-sequence");
    this.targetText.textContent = stage.target;
    const progress = document.createElement("span"); progress.className = "syllable-taps";
    stage.sequence.forEach((value, index) => {
      if (index) progress.append(" → ");
      const token = document.createElement("span");
      token.className = index < this.alphabetPartIndex ? "is-done" : index === this.alphabetPartIndex ? "is-current" : "";
      token.textContent = value === "ㆍ" ? "■" : value;
      progress.append(token);
    });
    this.targetHint.replaceChildren(progress);
    const composed = composeTokens(stage.sequence.slice(0, this.alphabetPartIndex));
    this.typedText.textContent = composed || "\u00a0";
    this.typedText.classList.remove("is-empty", "is-wrong", "is-correct");
  }

  private renderBoard(): void {
    this.board.dataset.gridSize = String(WORD_BOARD_SIDE);
    const fragment = document.createDocumentFragment();
    this.tiles.forEach((tile, index) => {
      const button = document.createElement("button");
      const color = boardColorAt(index);
      button.className = `letter-tile letter-tile--color-${color}`; button.type = "button";
      const glyph = document.createElement("span");
      glyph.className = "letter-glyph";
      glyph.textContent = tile.symbol === "ㆍ" ? "━" : tile.symbol;
      const uploaded = createUploadedGlyph(tile.symbol, tile.transform);
      if (uploaded) { glyph.replaceChildren(uploaded); button.classList.add("has-uploaded-glyph"); }
      button.append(glyph);
      if (CONSONANTS.includes(tile.symbol as never)) button.classList.add("letter-tile--consonant");
      else if (CHEONJIIN_STROKES.includes(tile.symbol as never)) button.classList.add("letter-tile--vowel");
      else button.classList.add("letter-tile--punctuation");
      if (tile.symbol === "ㆍ") button.classList.add("letter-tile--cheonjiin-dot");
      if (tile.symbol === ".") button.classList.add("letter-tile--period");
      if (tile.transform) button.classList.add(`letter-tile--${tile.transform}`);
      button.dataset.tileId = String(tile.id); button.setAttribute("aria-label", tile.symbol === "ㆍ" ? "Cheonjiin dot" : tile.symbol);
      button.addEventListener("click", () => inputValueForTile(tile) === MIRROR_TRAP_TOKEN ? this.typeTrapTile(tile.id) : this.typeTile(tile.id, tile.symbol)); fragment.append(button);
    });
    this.board.replaceChildren(fragment);
  }

  private typeTile(tileId: number, value: BoardSymbol): void {
    if (this.inputLocked || this.paused) return;
    const target = this.wordTarget.word;
    if (!canAcceptInput(this.input.length, target)) return;
    if (this.used.has(tileId)) return;
    feedback.pick(this.input.length + 1);
    this.used.add(tileId); this.input.push({ value, tileId });
    this.board.querySelector<HTMLButtonElement>(`[data-tile-id="${tileId}"]`)!.disabled = true;
    this.renderInput();
  }
  private typeTrapTile(tileId: number): void {
    if (this.inputLocked || this.paused || this.used.has(tileId)) return;
    const target = this.wordTarget.word;
    if (!canAcceptInput(this.input.length, target)) return;
    feedback.reject();
    this.used.add(tileId); this.input.push({ value: MIRROR_TRAP_TOKEN, tileId });
    this.board.querySelector<HTMLButtonElement>(`[data-tile-id="${tileId}"]`)!.disabled = true;
    this.renderInput();
  }
  private typeFixed(value: string): void {
    if (this.inputLocked || this.paused || this.mode !== "word") return;
    const target = this.wordTarget.word;
    if (!canAcceptInput(this.input.length, target)) return;
    feedback.tap(); this.input.push({ value }); this.renderInput();
  }
  private backspace(): void {
    if (this.inputLocked || this.paused || this.mode !== "word") return;
    const removed = this.input.pop();
    if (removed?.tileId !== undefined) {
      this.used.delete(removed.tileId);
      const button = this.board.querySelector<HTMLButtonElement>(`[data-tile-id="${removed.tileId}"]`)!;
      button.disabled = false;
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
    const text = composeTargetInput(this.wordTarget.word, this.input.map((token) => token.value));
    const target = this.wordTarget.word;
    const expected = materializeTargetTokens(targetToTokens(target));
    const wrongIndex = this.input.findIndex((token, index) => token.value !== expected[index]);
    const targetNodes = targetCharacterProgress(target, this.input.map((token) => token.value)).map(({ character, state }) => {
      const glyph = document.createElement("span"); glyph.className = `target-character is-${state}`; glyph.textContent = character;
      return glyph;
    });
    if (this.mode === "word") {
      const korean = document.createElement("span"); korean.className = "target-korean"; korean.append(...targetNodes);
      const english = document.createElement("span"); english.className = "target-translation-inline"; english.textContent = this.wordTarget.translation;
      this.targetText.replaceChildren(korean, english);
    }
    const composed = document.createElement("span"); composed.className = `composed-input${text ? "" : " is-empty"}`; composed.textContent = text; composed.dataset.empty = this.typedText.dataset.empty;
    const count = document.createElement("small"); count.className = "writing-token-count"; count.textContent = `${Math.min(this.input.length, expected.length)} / ${expected.length}`;
    this.typedText.replaceChildren(composed, count);
    this.typedText.classList.toggle("is-empty", text.length === 0);
    this.typedText.classList.toggle("is-correct", this.input.length > 0 && wrongIndex < 0);
    this.typedText.classList.toggle("is-wrong", wrongIndex >= 0);
    if (this.mode === "word") {
      this.clearWordFeedback();
      if (isWordMatch(text, this.wordTarget.word)) this.completeWord();
    }
  }

  private startClock(resume = false): void {
    this.stopClock();
    this.startedAt = resume ? performance.now() - this.elapsedMs : performance.now();
    const update = (): void => {
      this.elapsedMs = performance.now() - this.startedAt;
      this.clock.textContent = formatTime(this.elapsedMs);
      this.frame = requestAnimationFrame(update);
    };
    update();
  }
  private stopClock(): void { if (this.frame !== undefined) cancelAnimationFrame(this.frame); this.frame = undefined; }
  private continueFromResult(): void {
    this.result.classList.add("hidden");
    if (this.mode !== "word") {
      this.startAlphabetJourney();
    }
    else this.showAlphabetIntro("word");
  }
  private clearWordFeedback(): void {
    this.writingFeedback.textContent = "";
    this.writingFeedback.classList.remove("needs-work");
    this.submitRow.classList.add("hidden");
  }
  private completeWord(): void {
    this.clearWordFeedback();
    this.inputLocked = true; this.targetPrompt.classList.add("is-writing-complete");
    feedback.clear(this.input.length);
    this.stageTransitionPending = true;
    this.stageTimer = window.setTimeout(() => this.advanceLearningStage(), LEARNING_TRANSITION_MS);
  }
  private startNextWord(): void {
    this.wordTargetIndex += 1;
    this.wordTarget = this.nextWordTarget();
    this.input = []; this.used.clear();
    this.tiles = createWordBoard(this.wordTarget.word);
    this.targetLabel.textContent = `STAGE ${this.wordTargetIndex + 1}`;
    this.renderTranslatedTarget();
    this.renderBoard(); this.renderInput();
  }
  private startWordJourney(): void {
    this.wordTargetIndex = 0; this.elapsedMs = 0;
    this.nextWordTarget = createWordJourney();
    this.help.classList.add("hidden");
    this.alphabetIntro.classList.add("hidden");
    el("btn-again").textContent = "Play again";
    this.startWord();
  }

  private openHelp(title: string): void {
    feedback.tap();
    this.helpTitle.textContent = title;
    this.help.classList.remove("hidden");
  }

  private pauseGame(): void {
    if ((this.inputLocked && !this.stageTransitionPending) || this.paused || this.game.classList.contains("hidden")) return;
    if (this.stageTransitionPending) window.clearTimeout(this.stageTimer);
    this.paused = true; this.stopClock();
    this.openHelp("Paused");
    this.helpBody.innerHTML = `<div class="pause-card"><p>Take a break. The clock is stopped.</p><button class="wood-btn" id="btn-resume">Resume</button><button class="text-btn" id="btn-pause-menu">Main menu</button></div>`;
    el("btn-resume").addEventListener("click", () => this.resumeGame());
    el("btn-pause-menu").addEventListener("click", () => this.showTitle());
  }

  private resumeGame(): void {
    if (!this.paused) return;
    this.paused = false; this.help.classList.add("hidden");
    this.startClock(true);
    if (this.stageTransitionPending) this.stageTimer = window.setTimeout(() => this.advanceLearningStage(), LEARNING_TRANSITION_MS);
    feedback.tap();
  }

  private closeHelp(): void {
    feedback.tap();
    this.help.classList.add("hidden");
  }

  private showSettings(): void {
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
