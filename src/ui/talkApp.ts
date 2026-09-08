import { createLetterBoard, inputValueForTile, MIRROR_TRAP_TOKEN, type LetterTile } from "../core/hangul/board";
import { createAlphabetStageBoard, type AlphabetTile } from "../core/hangul/alphabetGame";
import { composeTokens } from "../core/hangul/compose";
import { CHEONJIIN_STROKES, CONSONANTS, type BoardSymbol } from "../core/hangul/keys";
import { isWordMatch, pickLessonTargets, wordCountLabel } from "../core/hangul/wordChallenge";
import { lessonCheerFor, lessonScoreFromTime } from "../core/hangul/writing";
import { materializeTargetTokens, targetCharacterProgress, targetToTokens } from "../core/hangul/target";
import { ALPHABET_ORDER, ALPHABET_STAGES, SENTENCE_LEVELS, SENTENCE_PROMPTS, SENTENCE_ROUND_SIZE, WORD_LEVELS, WORD_TARGETS, type SentencePrompt, type WordTarget } from "../content/prompts";
import { APP_CONFIG } from "../config/app";
import { el } from "./dom";
import { feedback } from "./feedback";
import { canAcceptInput } from "./inputCapacity";
import { Cheer } from "./screens/cheer";
import { loadSentenceProgress, saveSentenceProgress } from "./sentenceProgress";
import { loadTalkPreferences, saveTalkPreferences, type TalkPreferences } from "./talkPreferences";

type Mode = "alphabet" | "sentence" | "word";
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
  private readonly resultTitle = el("result-title");
  private readonly resultDetail = el("result-detail");
  private readonly submitRow = el("writing-submit-row");
  private readonly writingFeedback = el("writing-feedback");
  private readonly help = el("help-layer");
  private readonly helpTitle = el("help-title");
  private readonly helpBody = el("help-body");
  private preferences: TalkPreferences = loadTalkPreferences();
  private sentenceProgress = loadSentenceProgress();
  private mode: Mode = "sentence";
  private prompt: SentencePrompt = SENTENCE_PROMPTS[0]!;
  private wordTarget: WordTarget = WORD_TARGETS[0]!;
  private wordCount = 0;
  private wordLevel = 0;
  private wordTargetIndex = 0;
  private wordLessonTargets: readonly WordTarget[] = [];
  private sentenceLevel = 0;
  private sentenceIndex = 0;
  private sentenceLessonPrompts: readonly SentencePrompt[] = [];
  private alphabetStageIndex = 0;
  private alphabetTiles: AlphabetTile[] = [];
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
    el("mode-alphabet").addEventListener("click", () => this.showAlphabetIntro());
    el("btn-alphabet-intro-back").addEventListener("click", () => this.showTitle());
    el("btn-alphabet-start").addEventListener("click", () => this.startAlphabetJourney());
    el("mode-sentence").addEventListener("click", () => this.showLevelSelect());
    el("mode-free").addEventListener("click", () => this.showWordLevelSelect());
    el("btn-back").addEventListener("click", () => this.showTitle());
    el("btn-pause").addEventListener("click", () => this.pauseGame());
    this.setupBackspace();
    el("btn-space").addEventListener("click", () => this.typeFixed(" "));
    el("btn-again").addEventListener("click", () => this.continueFromResult());
    el("btn-result-menu").addEventListener("click", () => this.showTitle());
    el("btn-title-settings").addEventListener("click", () => this.showSettings());
    el("btn-title-rules").addEventListener("click", () => this.showRules());
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
    window.clearTimeout(this.sentenceTimer);
    this.inputLocked = true; this.paused = false;
    this.stopClock(); this.cheer.stop();
    this.result.classList.add("hidden"); this.help.classList.add("hidden"); this.studioSplash.classList.add("hidden"); this.splash.classList.add("hidden"); this.alphabetIntro.classList.add("hidden"); this.game.classList.add("hidden"); this.title.classList.remove("hidden");
  }

  private start(mode: Mode, keepLessonTime = false): void {
    window.clearTimeout(this.sentenceTimer);
    this.cheer.stop();
    this.inputLocked = false; this.paused = false;
    this.game.classList.remove("is-input-locked");
    this.targetPrompt.classList.remove("is-writing-complete");
    this.mode = mode;
    if (mode === "alphabet") { this.showAlphabetIntro(); return; }
    if (mode === "sentence") this.prompt = this.sentenceLessonPrompts[this.sentenceIndex] ?? SENTENCE_PROMPTS[0]!;
    else this.wordTarget = this.wordLessonTargets[this.wordTargetIndex] ?? WORD_TARGETS[0]!;
    this.input = []; this.used.clear();
    const requiredText = mode === "sentence" ? this.prompt.text : this.wordTarget.word;
    this.tiles = createLetterBoard(requiredText);
    this.targetLabel.textContent = mode === "sentence" ? `${SENTENCE_LEVELS[this.sentenceLevel]!.name} · ${this.sentenceIndex + 1}/${SENTENCE_ROUND_SIZE}` : `${WORD_LEVELS[this.wordLevel]!.name} · ${this.wordTargetIndex + 1}/3`;
    this.renderTranslatedTarget();
    this.typedText.dataset.empty = mode === "sentence" ? "Your sentence appears here." : "Your word appears here.";
    this.runMode.textContent = mode === "sentence" ? "Sentence" : "Word";
    this.game.classList.toggle("is-word-mode", mode === "word");
    this.game.classList.remove("is-alphabet-mode");
    this.submitRow.classList.add("hidden");
    this.result.classList.add("hidden"); this.title.classList.add("hidden"); this.splash.classList.add("hidden"); this.game.classList.remove("hidden");
    this.renderBoard(); this.renderInput(); this.startClock(mode === "sentence" && keepLessonTime);
  }

  private renderTranslatedTarget(): void {
    this.targetText.classList.remove("is-medium-sequence", "is-long-sequence");
    if (this.mode === "word") {
      const korean = document.createElement("span"); korean.className = "target-korean"; korean.textContent = this.wordTarget.word;
      const english = document.createElement("span"); english.className = "target-translation-inline"; english.textContent = this.wordTarget.translation;
      this.targetText.replaceChildren(korean, english);
      this.targetHint.textContent = "Complete the target word.";
      return;
    }
    this.targetText.textContent = this.prompt.text;
    this.targetHint.textContent = this.prompt.translation;
  }

  private showAlphabetIntro(): void {
    this.stopClock(); this.cheer.stop();
    this.result.classList.add("hidden"); this.help.classList.add("hidden"); this.game.classList.add("hidden"); this.title.classList.add("hidden");
    this.alphabetIntro.classList.remove("hidden");
  }

  private startAlphabetJourney(): void {
    window.clearTimeout(this.sentenceTimer);
    this.cheer.stop();
    this.mode = "alphabet";
    this.inputLocked = false; this.paused = false;
    this.game.classList.remove("is-input-locked");
    this.alphabetStageIndex = 0; this.elapsedMs = 0;
    el("btn-again").textContent = "Play again";
    this.result.classList.add("hidden"); this.title.classList.add("hidden"); this.alphabetIntro.classList.add("hidden"); this.splash.classList.add("hidden"); this.game.classList.remove("hidden");
    this.game.classList.remove("is-word-mode"); this.game.classList.add("is-alphabet-mode");
    this.submitRow.classList.add("hidden");
    this.loadAlphabetStage();
    this.startClock();
  }

  private loadAlphabetStage(): void {
    const stage = ALPHABET_STAGES[this.alphabetStageIndex]!;
    this.targetPrompt.classList.remove("is-alphabet-complete");
    this.used.clear();
    this.alphabetTiles = createAlphabetStageBoard(stage.target, ALPHABET_ORDER, stage.boardSide);
    this.runMode.textContent = "Alphabet";
    this.targetLabel.textContent = `STAGE ${stage.number} / ${ALPHABET_STAGES.length}`;
    this.renderAlphabetBoard();
    this.renderAlphabetTarget();
  }

  private renderAlphabetBoard(): void {
    const stage = ALPHABET_STAGES[this.alphabetStageIndex]!;
    this.board.dataset.gridSize = String(stage.boardSide);
    const fragment = document.createDocumentFragment();
    this.alphabetTiles.forEach((tile, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `letter-tile letter-tile--alphabet letter-tile--color-${boardColorAt(index)}`;
      if (tile.mirror) button.classList.add(`letter-tile--flip-${tile.mirror === "horizontal" ? "x" : "y"}`);
      button.dataset.tileId = String(tile.id);
      button.setAttribute(
        "aria-label",
        tile.mirror
          ? `Reversed ${tile.value} trap`
          : tile.value === "ㆍ"
            ? "Cheonjiin dot"
            : tile.value,
      );
      const glyph = document.createElement("span"); glyph.className = "letter-glyph"; glyph.textContent = tile.value === "ㆍ" || tile.value === "." ? "" : tile.value;
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
    const stage = ALPHABET_STAGES[this.alphabetStageIndex]!;
    if (tile.mirror || tile.value !== stage.target) {
      feedback.reject();
      button.classList.remove("is-wrong-pick"); void button.offsetWidth; button.classList.add("is-wrong-pick");
      window.setTimeout(() => button.classList.remove("is-wrong-pick"), 360);
      return;
    }
    feedback.pick(this.alphabetStageIndex + 1);
    this.used.add(tile.id); button.disabled = true;
    this.inputLocked = true;
    this.targetPrompt.classList.add("is-alphabet-complete");
    window.setTimeout(() => {
      this.targetPrompt.classList.remove("is-alphabet-complete");
      this.alphabetStageIndex += 1;
      if (this.alphabetStageIndex === ALPHABET_STAGES.length) this.completeAlphabetJourney();
      else { this.inputLocked = false; this.loadAlphabetStage(); }
    }, 360);
  }

  private renderAlphabetTarget(): void {
    const stage = ALPHABET_STAGES[this.alphabetStageIndex]!;
    const korean = document.createElement("span"); korean.className = "target-korean"; korean.textContent = stage.target;
    const note = document.createElement("span"); note.className = "alphabet-target-note"; note.textContent = stage.note;
    this.targetText.replaceChildren(korean, note);
    this.targetText.classList.remove("is-medium-sequence", "is-long-sequence");
    this.targetHint.textContent = `${stage.boardSide} × ${stage.boardSide}`;
    this.typedText.replaceChildren();
  }

  private completeAlphabetJourney(): void {
    this.inputLocked = true;
    this.stopClock();
    feedback.complete();
    const targetMs = 180_000;
    const score = lessonScoreFromTime(this.elapsedMs, targetMs);
    this.showResult("Alphabet complete!", `${ALPHABET_STAGES.length} stages · ${formatTime(this.elapsedMs)}`, score);
  }

  private renderBoard(): void {
    delete this.board.dataset.gridSize;
    const fragment = document.createDocumentFragment();
    this.tiles.forEach((tile, index) => {
      const button = document.createElement("button");
      const color = boardColorAt(index);
      button.className = `letter-tile letter-tile--color-${color}`; button.type = "button";
      const glyph = document.createElement("span");
      glyph.className = "letter-glyph";
      glyph.textContent = tile.symbol === "ㆍ" ? "━" : tile.symbol;
      button.append(glyph);
      if (CONSONANTS.includes(tile.symbol as never)) button.classList.add("letter-tile--consonant");
      else if (CHEONJIIN_STROKES.includes(tile.symbol as never)) button.classList.add("letter-tile--vowel");
      else button.classList.add("letter-tile--punctuation");
      if (tile.symbol === "ㆍ") button.classList.add("letter-tile--cheonjiin-dot");
      if (tile.symbol === ".") button.classList.add("letter-tile--period");
      if (tile.mirror) button.classList.add(`letter-tile--flip-${tile.mirror === "horizontal" ? "x" : "y"}`);
      button.dataset.tileId = String(tile.id); button.setAttribute("aria-label", tile.symbol === "ㆍ" ? "Cheonjiin dot" : tile.symbol);
      button.addEventListener("click", () => inputValueForTile(tile) === MIRROR_TRAP_TOKEN ? this.typeTrapTile(tile.id) : this.typeTile(tile.id, tile.symbol)); fragment.append(button);
    });
    this.board.replaceChildren(fragment);
  }

  private typeTile(tileId: number, value: BoardSymbol): void {
    if (this.inputLocked || this.paused) return;
    const target = this.mode === "sentence" ? this.prompt.text : this.wordTarget.word;
    if (!canAcceptInput(this.input.length, target)) return;
    if (this.used.has(tileId)) return;
    feedback.pick(this.input.length + 1);
    this.used.add(tileId); this.input.push({ value, tileId });
    this.board.querySelector<HTMLButtonElement>(`[data-tile-id="${tileId}"]`)!.disabled = true;
    this.renderInput();
  }
  private typeTrapTile(tileId: number): void {
    if (this.inputLocked || this.paused || this.used.has(tileId)) return;
    const target = this.mode === "sentence" ? this.prompt.text : this.wordTarget.word;
    if (!canAcceptInput(this.input.length, target)) return;
    feedback.reject();
    this.used.add(tileId); this.input.push({ value: MIRROR_TRAP_TOKEN, tileId });
    this.board.querySelector<HTMLButtonElement>(`[data-tile-id="${tileId}"]`)!.disabled = true;
    this.renderInput();
  }
  private typeFixed(value: string): void {
    if (this.inputLocked || this.paused) return;
    const target = this.mode === "sentence" ? this.prompt.text : this.wordTarget.word;
    if (!canAcceptInput(this.input.length, target)) return;
    feedback.tap(); this.input.push({ value }); this.renderInput();
  }
  private backspace(): void {
    if (this.inputLocked || this.paused) return;
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
    const text = composeTokens(this.input.map((token) => token.value));
    const target = this.mode === "sentence" ? this.prompt.text : this.wordTarget.word;
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
    } else this.targetText.replaceChildren(...targetNodes);
    const composed = document.createElement("span"); composed.className = `composed-input${text ? "" : " is-empty"}`; composed.textContent = text; composed.dataset.empty = this.typedText.dataset.empty;
    const count = document.createElement("small"); count.className = "writing-token-count"; count.textContent = `${Math.min(this.input.length, expected.length)} / ${expected.length}`;
    this.typedText.replaceChildren(composed, count);
    this.typedText.classList.toggle("is-empty", text.length === 0);
    this.typedText.classList.toggle("is-correct", this.input.length > 0 && wrongIndex < 0);
    this.typedText.classList.toggle("is-wrong", wrongIndex >= 0);
    if (this.mode === "sentence" && text === this.prompt.text) this.finishSentence();
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
      if (this.mode === "word") {
        const duration = WORD_LEVELS[this.wordLevel]!.durationMs;
        const remaining = Math.max(0, duration - this.elapsedMs); this.clock.textContent = formatTime(remaining);
        if (remaining === 0) {
          this.finishWordChallenge();
          return;
        }
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
    this.targetPrompt.classList.add("is-writing-complete");
    this.stopClock();
    feedback.complete();
    const level = SENTENCE_LEVELS[this.sentenceLevel]!;
    const finalSentence = this.sentenceIndex === this.sentenceLessonPrompts.length - 1;
    if (finalSentence) {
      const score = lessonScoreFromTime(this.elapsedMs, level.targetMs);
      const previousBest = this.sentenceProgress.bestScores[level.id] ?? 0;
      this.sentenceProgress.bestScores[level.id] = Math.max(previousBest, score);
      saveSentenceProgress(this.sentenceProgress);
      el("btn-again").textContent = "Choose level";
      this.showResult("Level complete!", `${score.toLocaleString()} / 1,500 · ${formatTime(this.elapsedMs)} · Best ${this.sentenceProgress.bestScores[level.id]!.toLocaleString()}`, score);
    } else {
      this.sentenceTimer = window.setTimeout(() => {
        this.targetPrompt.classList.remove("is-writing-complete");
        this.sentenceIndex += 1;
        this.start("sentence", true);
      }, 520);
    }
  }

  private continueFromResult(): void {
    this.result.classList.add("hidden");
    if (this.mode === "sentence") {
      this.showLevelSelect(); return;
    }
    if (this.mode === "alphabet") {
      this.startAlphabetJourney();
    }
    else this.showWordLevelSelect();
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
    window.setTimeout(() => {
      this.targetPrompt.classList.remove("is-writing-complete");
      this.wordCount += 1;
      if (this.wordCount === this.wordLessonTargets.length) {
        this.stopClock();
        const level = WORD_LEVELS[this.wordLevel]!;
        const score = lessonScoreFromTime(this.elapsedMs, level.durationMs);
        el("btn-again").textContent = "Choose level";
        this.showResult(`${level.name} complete!`, `3 / 3 words · ${formatTime(this.elapsedMs)}`, score);
        return;
      }
      this.inputLocked = false; this.startNextWord();
    }, 340);
  }
  private startNextWord(): void {
    this.wordTargetIndex += 1;
    this.wordTarget = this.wordLessonTargets[this.wordTargetIndex] ?? WORD_TARGETS[0]!;
    this.input = []; this.used.clear();
    this.tiles = createLetterBoard(this.wordTarget.word);
    this.targetLabel.textContent = `${WORD_LEVELS[this.wordLevel]!.name} · ${this.wordTargetIndex + 1}/3`;
    this.renderTranslatedTarget();
    this.targetHint.textContent = `${wordCountLabel(this.wordCount)} complete · ${3 - this.wordCount} left.`;
    this.renderBoard(); this.renderInput();
  }
  private finishWordChallenge(): void {
    this.stopClock(); this.inputLocked = true;
    el("btn-again").textContent = "Choose level";
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

  private showWordLevelSelect(): void {
    this.stopClock(); this.cheer.stop();
    this.result.classList.add("hidden"); this.game.classList.add("hidden"); this.title.classList.remove("hidden");
    this.openHelp("Word");
    this.helpBody.innerHTML = `<p class="level-intro">Choose a lesson and complete three Korean words.</p><div class="level-list" id="word-level-list"></div>`;
    const list = el("word-level-list");
    WORD_LEVELS.forEach((level, index) => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "level-btn";
      button.innerHTML = `<strong>${level.name}</strong><span>${level.description}</span><em>3 words · ${Math.round(level.durationMs / 1000)} seconds</em><small>START</small>`;
      button.addEventListener("click", () => this.startWordLevel(index));
      list.append(button);
    });
  }

  private startWordLevel(index: number): void {
    this.wordLevel = index; this.wordTargetIndex = 0; this.wordCount = 0; this.elapsedMs = 0;
    this.wordLessonTargets = pickLessonTargets(WORD_LEVELS[index]!.targets, 3);
    this.help.classList.add("hidden");
    el("btn-again").textContent = "Choose level";
    this.start("word");
  }
  private showResult(title: string, detail: string, score?: number, tierScore = score): void {
    const reveal = (): void => {
      this.resultTitle.textContent = title;
      this.resultDetail.textContent = detail;
      this.result.classList.remove("hidden");
    };
    if (score !== undefined) this.cheer.play(title, score, lessonCheerFor(tierScore ?? score), reveal, tierScore);
    else this.cheer.playFailure(title, "TRY AGAIN!", reveal);
  }

  private openHelp(title: string): void {
    feedback.tap();
    this.helpTitle.textContent = title;
    this.help.classList.remove("hidden");
  }

  private showLevelSelect(): void {
    this.stopClock(); this.cheer.stop();
    this.result.classList.add("hidden"); this.game.classList.add("hidden"); this.title.classList.remove("hidden");
    this.openHelp("Sentence");
    this.helpBody.innerHTML = `<p class="level-intro">Complete three phrases for up to 1,500 points. Your fastest run becomes the level high score.</p><div class="level-list" id="level-list"></div>`;
    const list = el("level-list");
    SENTENCE_LEVELS.forEach((level, index) => {
      const best = this.sentenceProgress.bestScores[level.id] ?? 0;
      const button = document.createElement("button");
      button.type = "button"; button.className = "level-btn";
      button.innerHTML = `<strong>${level.name}</strong><span>${level.description}</span><em>${SENTENCE_ROUND_SIZE} phrases · Top tier ${Math.round(level.targetMs / 1000)}s</em><small>${best ? `BEST ${best.toLocaleString()}` : "NEW"}</small>`;
      button.addEventListener("click", () => this.startSentenceLevel(index));
      list.append(button);
    });
  }

  private startSentenceLevel(index: number): void {
    this.sentenceLevel = index; this.sentenceIndex = 0; this.elapsedMs = 0;
    this.sentenceLessonPrompts = pickLessonTargets(SENTENCE_LEVELS[index]!.prompts, SENTENCE_ROUND_SIZE);
    this.help.classList.add("hidden");
    this.start("sentence");
  }

  private pauseGame(): void {
    if (this.inputLocked || this.paused || this.game.classList.contains("hidden")) return;
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
    feedback.tap();
  }

  private closeHelp(): void {
    feedback.tap();
    this.help.classList.add("hidden");
  }

  private showRules(): void {
    this.openHelp("Rules");
    this.helpBody.innerHTML = `<div class="rules-list"><p><b>Alphabet</b><span>Find each Korean jamo. The board grows from 2×2 to 4×4 and 6×6 as you learn.</span></p><p><b>Sound guide</b><span>Sounds used in different positions share one bracket, such as [k/g].</span></p><p><b>Reversed traps</b><span>Mirrored consonants are traps. They never count as the original consonant.</span></p><p><b>Sentence</b><span>Complete three phrases. The full run is worth up to 1,500 points and your best score is saved.</span></p><p><b>Word</b><span>Choose one of five lessons and complete three words before its timer ends.</span></p><p><b>Nine mixed colours</b><span>Colours do not belong to a particular letter. A used block turns grey.</span></p></div>`;
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
