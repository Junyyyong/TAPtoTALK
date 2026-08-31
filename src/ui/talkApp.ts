import { createLetterBoard, type LetterTile } from "../core/hangul/board";
import { composeTokens } from "../core/hangul/compose";
import { CONSONANTS, transformedConsonant, type BoardSymbol } from "../core/hangul/keys";
import { evaluateWriting, type WritingEvaluation } from "../core/hangul/writing";
import { FREE_MODE_CONFIG, SENTENCE_PROMPTS, WRITING_TOPICS, type SentencePrompt, type WritingTopic } from "../content/prompts";
import { el } from "./dom";

type Mode = "sentence" | "free";
interface TypedToken { value: string; tileId?: number; base?: BoardSymbol; strokeSteps?: number }

const formatTime = (ms: number): string => {
  const tenths = Math.floor(ms / 100) % 10;
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60_000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
};

const objectParticle = (word: string): "을" | "를" => {
  const last = word.codePointAt(word.length - 1) ?? 0;
  return last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0 ? "을" : "를";
};

/** Thin UI coordinator. Hangul behavior stays in core/hangul. */
export class TalkApp {
  private readonly splash = el("screen-splash");
  private readonly title = el("screen-title");
  private readonly game = el("screen-game");
  private readonly board = el("letter-board");
  private readonly targetText = el("target-text");
  private readonly typedText = el("typed-text");
  private readonly clock = el("run-clock");
  private readonly runMode = el("run-mode");
  private readonly result = el("result-layer");
  private readonly resultTitle = el("result-title");
  private readonly resultDetail = el("result-detail");
  private readonly submitRow = el("writing-submit-row");
  private readonly writingFeedback = el("writing-feedback");
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
    el("btn-backspace").addEventListener("click", () => this.backspace());
    el("btn-dot").addEventListener("click", () => this.typeFixed("ㆍ"));
    el("btn-stroke").addEventListener("click", () => this.addStroke());
    document.querySelectorAll<HTMLButtonElement>(".punctuation").forEach((button) => button.addEventListener("click", () => this.typeFixed(button.dataset.value ?? "")));
    el("btn-space").addEventListener("click", () => this.typeFixed(" "));
    el("btn-submit").addEventListener("click", () => this.submitWriting());
    el("btn-again").addEventListener("click", () => this.start(this.mode));
    el("btn-result-menu").addEventListener("click", () => this.showTitle());
    window.setTimeout(() => this.showTitle(), 900);
  }

  private showTitle(): void {
    this.stopClock();
    this.result.classList.add("hidden"); this.splash.classList.add("hidden"); this.game.classList.add("hidden"); this.title.classList.remove("hidden");
  }

  private start(mode: Mode): void {
    this.mode = mode;
    if (mode === "sentence") this.prompt = SENTENCE_PROMPTS[Math.floor(Math.random() * SENTENCE_PROMPTS.length)]!;
    else this.topic = WRITING_TOPICS[Math.floor(Math.random() * WRITING_TOPICS.length)]!;
    this.input = []; this.used.clear();
    const requiredText = mode === "sentence" ? this.prompt.text : this.topic.keyword;
    this.tiles = createLetterBoard(requiredText);
    this.targetText.textContent = mode === "sentence"
      ? this.prompt.text
      : `“${this.topic.keyword}”${objectParticle(this.topic.keyword)} 포함한 문장을 만드세요`;
    this.runMode.textContent = mode === "sentence" ? "문장 따라쓰기" : "주제 글쓰기";
    this.submitRow.classList.toggle("hidden", mode !== "free");
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
    this.used.add(tileId); this.input.push({ value, tileId, base: value, strokeSteps: 0 });
    this.board.querySelector<HTMLButtonElement>(`[data-tile-id="${tileId}"]`)!.disabled = true; this.renderInput();
  }
  private typeFixed(value: string): void { this.input.push({ value }); this.renderInput(); }
  private addStroke(): void {
    const last = this.input[this.input.length - 1];
    if (!last?.base || !CONSONANTS.includes(last.value as never)) return;
    const nextSteps = (last.strokeSteps ?? 0) + 1;
    const transformed = transformedConsonant(last.base, nextSteps);
    if (!transformed) return;
    last.value = transformed; last.strokeSteps = nextSteps; this.renderInput();
  }
  private backspace(): void {
    const last = this.input[this.input.length - 1];
    if (last?.base && (last.strokeSteps ?? 0) > 0) {
      const previousSteps = (last.strokeSteps ?? 0) - 1;
      last.strokeSteps = previousSteps;
      last.value = transformedConsonant(last.base, previousSteps) ?? last.base;
      this.renderInput(); return;
    }
    const removed = this.input.pop();
    if (removed?.tileId !== undefined) { this.used.delete(removed.tileId); this.board.querySelector<HTMLButtonElement>(`[data-tile-id="${removed.tileId}"]`)!.disabled = false; }
    this.renderInput();
  }

  private renderInput(): void {
    const text = composeTokens(this.input.map((token) => token.value));
    this.typedText.textContent = text; this.typedText.classList.toggle("is-empty", text.length === 0);
    this.typedText.classList.toggle("is-correct", this.mode === "sentence" && this.prompt.text.startsWith(text) && text.length > 0);
    this.typedText.classList.toggle("is-wrong", this.mode === "sentence" && !this.prompt.text.startsWith(text));
    if (this.mode === "sentence" && text === this.prompt.text) this.finishSentence();
    if (this.mode === "free") this.renderWritingFeedback(this.writingEvaluation(text));
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
  private finishSentence(): void { this.stopClock(); this.showResult("문장 완성!", `${this.prompt.text} · ${formatTime(this.elapsedMs)}`); }
  private writingEvaluation(text = composeTokens(this.input.map((token) => token.value))): WritingEvaluation {
    const remainingMs = Math.max(0, FREE_MODE_CONFIG.durationMs - this.elapsedMs);
    return evaluateWriting(text, this.topic.keyword, remainingMs, FREE_MODE_CONFIG.durationMs, FREE_MODE_CONFIG);
  }
  private renderWritingFeedback(evaluation: WritingEvaluation): void {
    const checks = evaluation.checks;
    const mark = (ok: boolean) => ok ? "✓" : "○";
    this.writingFeedback.textContent = [
      `${mark(checks.keyword)} 제시어`, `${mark(checks.words)} ${FREE_MODE_CONFIG.minWords}어절`,
      `${mark(checks.syllables)} ${FREE_MODE_CONFIG.minSyllables}글자`, `${mark(checks.punctuation)} 문장부호`,
      `${mark(checks.composed)} 글자 완성`,
    ].join(" · ");
    this.writingFeedback.classList.remove("needs-work");
    this.writingFeedback.classList.toggle("is-ready", evaluation.complete);
  }
  private submitWriting(): void {
    const evaluation = this.writingEvaluation();
    this.renderWritingFeedback(evaluation);
    if (evaluation.complete) this.finishWriting(true);
    else this.writingFeedback.classList.add("needs-work");
  }
  private finishWriting(submitted: boolean): void {
    this.stopClock();
    const text = composeTokens(this.input.map((token) => token.value));
    const evaluation = this.writingEvaluation(text);
    if (!evaluation.complete) {
      this.showResult("아직 완성되지 않았어요", `조건을 확인해 다시 도전해 보세요 · ${text || "입력 없음"}`);
      return;
    }
    this.showResult(
      submitted ? "문장 제출 완료!" : "시간 종료!",
      `${evaluation.score}점 · ${evaluation.syllableCount}글자 · 서로 다른 음절 ${evaluation.uniqueSyllables}개`,
    );
  }
  private showResult(title: string, detail: string): void { this.resultTitle.textContent = title; this.resultDetail.textContent = detail; this.result.classList.remove("hidden"); }
}
