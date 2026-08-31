import { createLetterBoard, type LetterTile } from "../core/hangul/board";
import { composeTokens } from "../core/hangul/compose";
import type { BoardSymbol } from "../core/hangul/keys";
import { FREE_MODE_CONFIG, SENTENCE_PROMPTS, type SentencePrompt } from "../content/prompts";
import { el } from "./dom";

type Mode = "sentence" | "free";
interface TypedToken { value: string; tileId?: number }

const formatTime = (ms: number): string => {
  const tenths = Math.floor(ms / 100) % 10;
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60_000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
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
  private mode: Mode = "sentence";
  private prompt: SentencePrompt = SENTENCE_PROMPTS[0]!;
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
    document.querySelectorAll<HTMLButtonElement>(".punctuation").forEach((button) => button.addEventListener("click", () => this.typeFixed(button.dataset.value ?? "")));
    el("btn-space").addEventListener("click", () => this.typeFixed(" "));
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
    this.input = []; this.used.clear();
    this.tiles = createLetterBoard(mode === "sentence" ? this.prompt.text : "");
    this.targetText.textContent = mode === "sentence" ? this.prompt.text : "자유롭게 입력하세요";
    this.runMode.textContent = mode === "sentence" ? "문장 따라쓰기" : "자유 쓰기";
    this.result.classList.add("hidden"); this.title.classList.add("hidden"); this.splash.classList.add("hidden"); this.game.classList.remove("hidden");
    this.renderBoard(); this.renderInput(); this.startClock();
  }

  private renderBoard(): void {
    const fragment = document.createDocumentFragment();
    for (const tile of this.tiles) {
      const button = document.createElement("button");
      button.className = "letter-tile"; button.type = "button"; button.textContent = tile.symbol === "ㆍ" ? "·" : tile.symbol;
      button.dataset.tileId = String(tile.id); button.setAttribute("aria-label", tile.symbol);
      button.addEventListener("click", () => this.typeTile(tile.id, tile.symbol)); fragment.append(button);
    }
    this.board.replaceChildren(fragment);
  }

  private typeTile(tileId: number, value: BoardSymbol): void {
    if (this.used.has(tileId)) return;
    this.used.add(tileId); this.input.push({ value, tileId });
    this.board.querySelector<HTMLButtonElement>(`[data-tile-id="${tileId}"]`)!.disabled = true; this.renderInput();
  }
  private typeFixed(value: string): void { this.input.push({ value }); this.renderInput(); }
  private backspace(): void {
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
  }

  private startClock(): void {
    this.stopClock(); this.startedAt = performance.now();
    const update = (): void => {
      this.elapsedMs = performance.now() - this.startedAt;
      if (this.mode === "free") {
        const remaining = Math.max(0, FREE_MODE_CONFIG.durationMs - this.elapsedMs); this.clock.textContent = formatTime(remaining);
        if (remaining === 0) { this.finishFree(); return; }
      } else this.clock.textContent = formatTime(this.elapsedMs);
      this.frame = requestAnimationFrame(update);
    };
    update();
  }
  private stopClock(): void { if (this.frame !== undefined) cancelAnimationFrame(this.frame); this.frame = undefined; }
  private finishSentence(): void { this.stopClock(); this.showResult("문장 완성!", `${this.prompt.text} · ${formatTime(this.elapsedMs)}`); }
  private finishFree(): void {
    this.stopClock(); const text = composeTokens(this.input.map((token) => token.value)); this.showResult("시간 종료!", `${text.length}글자 · ${text || "입력 없음"}`);
  }
  private showResult(title: string, detail: string): void { this.resultTitle.textContent = title; this.resultDetail.textContent = detail; this.result.classList.remove("hidden"); }
}
