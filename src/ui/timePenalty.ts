import { el } from "./dom";

/** Matches TAPtoTEN: red −1 beside the clock, 500 ms fade/rise, restarted on each miss. */
export class TimePenalty {
  private readonly badge = el("time-penalty");
  private readonly game = el("screen-game");
  private timer?: number;
  private pulseTimer?: number;
  private nextPulseAt = 0;
  show(): void {
    this.clearBadge();
    void this.badge.offsetWidth;
    this.badge.classList.add("is-visible");
    this.timer = window.setTimeout(() => this.clearBadge(), 500);
    // The time penalty always applies. Rate-limit only the visual pulse to avoid
    // fast repeated flashes during button mashing (at most one per 700 ms).
    const now = performance.now();
    if (now >= this.nextPulseAt) {
      this.nextPulseAt = now + 700;
      this.game.classList.add("is-mistake-feedback");
      this.pulseTimer = window.setTimeout(() => this.game.classList.remove("is-mistake-feedback"), 280);
    }
  }
  private clearBadge(): void {
    window.clearTimeout(this.timer);
    this.timer = undefined;
    this.badge.classList.remove("is-visible");
  }
  clear(): void {
    this.clearBadge();
    window.clearTimeout(this.pulseTimer);
    this.pulseTimer = undefined;
    this.nextPulseAt = 0;
    this.game.classList.remove("is-mistake-feedback");
  }
}
