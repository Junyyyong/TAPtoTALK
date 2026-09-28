import { el } from "./dom";

/** Matches TAPtoTEN: red −1 beside the clock, 500 ms fade/rise, restarted on each miss. */
export class TimePenalty {
  private readonly badge = el("time-penalty");
  private timer?: number;
  show(): void {
    this.clear();
    void this.badge.offsetWidth;
    this.badge.classList.add("is-visible");
    this.timer = window.setTimeout(() => this.clear(), 500);
  }
  clear(): void {
    window.clearTimeout(this.timer);
    this.timer = undefined;
    this.badge.classList.remove("is-visible");
  }
}
