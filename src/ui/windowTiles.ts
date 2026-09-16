import { windowMotion } from "../core/hangul/windowMotion";

/** Move existing tile nodes: input identities and used states travel with each tile. */
export class WindowTiles {
  private pair: HTMLButtonElement[] = [];
  private cycle = -1;
  private swapped = false;
  private version = 0;
  private pointerVersion = -1;
  busy = false;
  constructor(private board: HTMLElement) {
    board.addEventListener("pointerdown", () => { this.pointerVersion = this.version; }, true);
    board.addEventListener("click", event => {
      if (this.busy || (event.detail > 0 && this.pointerVersion !== this.version)) {
        event.preventDefault(); event.stopImmediatePropagation();
      }
    }, true);
  }
  reset(newRound = false): void {
    this.pair.forEach(button => { button.classList.remove("is-swap-door"); button.querySelectorAll(".swap-door").forEach(door => door.remove()); });
    this.pair = []; this.busy = false; this.version++;
    if (newRound) this.cycle = -1;
  }
  update(elapsed: number): void {
    const motion = windowMotion(elapsed);
    if (motion.phase !== "ready" && motion.cycle !== this.cycle) {
      this.reset(); this.cycle = motion.cycle; this.swapped = false;
      const available = [...this.board.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
      const first = available[Math.floor(Math.random() * available.length)];
      const others = available.filter(b => b !== first && b.getAttribute("aria-label") !== first?.getAttribute("aria-label"));
      const second = others[Math.floor(Math.random() * others.length)];
      if (first && second) this.pair = [first, second];
      this.pair.forEach(button => {
        for (const side of ["left", "right"]) {
          const door = document.createElement("span"); door.className = `swap-door swap-door--${side}`;
          door.setAttribute("aria-hidden", "true"); button.append(door);
        }
      });
    }
    if (this.pair.length && !this.swapped && (motion.phase === "closed" || motion.phase === "opening" || motion.phase === "ready")) {
      const nodes = [...this.board.children];
      const a = nodes.indexOf(this.pair[0]!), b = nodes.indexOf(this.pair[1]!);
      if (a >= 0 && b >= 0) { [nodes[a], nodes[b]] = [nodes[b]!, nodes[a]!]; this.board.append(...nodes); }
      this.swapped = true; this.version++;
    }
    this.busy = motion.phase !== "ready" && this.pair.length > 0;
    this.pair.forEach(button => {
      button.classList.toggle("is-swap-door", this.busy);
      button.style.setProperty("--door-close", String(motion.closure));
    });
    if (motion.phase === "ready" && this.pair.length) this.reset();
  }
}
